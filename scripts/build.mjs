import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This script owns only the dist directory beside index.html.
const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const dist = path.resolve(root, 'dist');
const publicOrigin = 'https://jyyjwedding.web.app';
const files = new Set(['index.html', 'style.css', 'app.js']);
const assetExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp', '.woff', '.woff2']);

function samePath(left, right) {
  return process.platform === 'win32'
    ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
    : path.resolve(left) === path.resolve(right);
}

function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function addAsset(reference) {
  const value = reference.trim().replaceAll('&amp;', '&');
  if (!value || value.startsWith('#') || value.startsWith('data:')) return;
  let url;
  try {
    url = new URL(value, `${publicOrigin}/`);
  } catch {
    return;
  }
  if (url.origin !== publicOrigin) return;
  const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!relative.startsWith('assets/')) return;
  const absolute = path.resolve(root, relative);
  if (!isInside(path.resolve(root, 'assets'), absolute)) {
    throw new Error(`Asset path leaves assets: ${relative}`);
  }
  if (!assetExtensions.has(path.extname(relative).toLowerCase())) {
    throw new Error(`Unsupported public asset: ${relative}`);
  }
  files.add(relative);
}

const [html, css] = await Promise.all([
  readFile(path.join(root, 'index.html'), 'utf8'),
  readFile(path.join(root, 'style.css'), 'utf8'),
]);

for (const match of html.matchAll(/(?:^|\s)(?:src|href|data-cover-src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gim)) {
  addAsset(match[1] ?? match[2] ?? match[3]);
}
for (const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";]+))\s*\)/gi)) {
  addAsset(match[1] ?? match[2] ?? match[3]);
}
// Share previews may use an absolute URL rather than an img src attribute.
for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
  const attributes = new Map();
  for (const attribute of match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attributes.set(attribute[1].toLowerCase(), attribute[2] ?? attribute[3]);
  }
  const kind = attributes.get('property') ?? attributes.get('name');
  if (['og:image', 'og:image:secure_url', 'twitter:image'].includes(kind?.toLowerCase())) {
    addAsset(attributes.get('content') ?? '');
  }
}

// app.js creates these gallery URLs at runtime.
for (let number = 1; number <= 15; number++) {
  const name = String(number).padStart(2, '0');
  files.add(`assets/photos/full-${name}.webp`);
  files.add(`assets/photos/thumb-${name}.webp`);
}
for (const name of await readdir(path.join(root, 'assets', 'fonts'))) {
  if (/^OFL(?:[-_.]|$).*\.txt$/i.test(name)) files.add(`assets/fonts/${name}`);
}

// Validate all inputs before touching the previous generated output.
for (const relative of files) {
  const source = path.resolve(root, relative);
  const resolved = await realpath(source);
  if (!isInside(root, resolved) || !(await lstat(resolved)).isFile()) {
    throw new Error(`Invalid build input: ${relative}`);
  }
}

// Resolve and verify the exact deletion target. Reject links and unrelated layouts.
if (!samePath(dist, path.join(root, 'dist')) || !samePath(path.dirname(dist), root)) {
  throw new Error('Refusing to remove a directory outside the project dist.');
}
try {
  const info = await lstat(dist);
  if (!info.isDirectory() || info.isSymbolicLink() || !samePath(await realpath(dist), dist)) {
    throw new Error('Refusing to replace a linked or non-directory dist.');
  }
  const entries = await readdir(dist);
  const allowed = new Set(['index.html', 'style.css', 'app.js', 'assets']);
  if (entries.some(name => !allowed.has(name))) {
    throw new Error('dist contains unrelated files; move them before building.');
  }
  await rm(dist, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await mkdir(dist);

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
let totalBytes = 0;
const output = [...files].sort();
for (const relative of output) {
  const source = path.resolve(root, relative);
  const destination = path.resolve(dist, relative);
  if (!isInside(dist, destination)) throw new Error(`Output path leaves dist: ${relative}`);
  const before = sha256(await readFile(source));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
  const [sourceAfter, copied] = await Promise.all([readFile(source), readFile(destination)]);
  if (before !== sha256(sourceAfter) || before !== sha256(copied)) {
    throw new Error(`Source changed or copy verification failed: ${relative}`);
  }
  totalBytes += copied.length;
}

console.log(`Built ${output.length} files in dist (${(totalBytes / 1024 / 1024).toFixed(2)} MiB).`);
console.log('All source and copied SHA-256 hashes match.');
console.log(output.join('\n'));
