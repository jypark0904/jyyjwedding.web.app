import './build.mjs';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The original build owns dist; this script owns only dist-bride and bride.html.
const root = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const source = path.resolve(root, 'dist');
const output = path.resolve(root, 'dist-bride');
const localPreview = path.resolve(root, 'bride.html');
const originalOrigin = 'https://jyyjwedding.web.app';
const brideOrigin = 'https://yjjywedding.web.app';
const originalHtml = await readFile(path.join(source, 'index.html'), 'utf8');
const settings = JSON.parse(await readFile(path.join(root, 'bride-accounts.json'), 'utf8'));
const expectedKeys = ['groomFather', 'groomMother', 'brideFather', 'brideMother'];
if (!Array.isArray(settings.parents) || settings.parents.length !== expectedKeys.length
    || settings.parents.some((account, index) => account.key !== expectedKeys[index]
      || account.side !== (index < 2 ? 'groom' : 'bride')
      || ['label', 'holder', 'bank', 'number'].some(field => typeof account[field] !== 'string'))) {
  throw new Error('Invalid bride parent account configuration.');
}
const escapeHtml = value => value.replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
function parentCard(account) {
  const {key, label, holder, bank, number} = Object.fromEntries(Object.entries(account).map(([field, value]) => [field, escapeHtml(value)]));
  const empty = !holder && !bank && !number;
  return `<div class="account-detail"><h3 class="account-heading"><span><small>${label}</small>${holder ? ` ${holder}` : ''}</span></h3><div class="account-body${empty ? ' is-empty' : ''}" data-account="${key}" data-holder="${holder}"><p class="account-bank"${empty ? ' aria-label="은행 미입력"' : ''}>${bank}</p><p class="account-number"${empty ? ' aria-label="계좌번호 미입력"' : ''}>${number}</p><div class="account-bottom"><span>${holder ? `예금주 ${holder}` : ''}</span><button type="button" class="copy-account" data-copy-account="${key}"${empty ? ' disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="13" rx="2"/><path d="M15 8V3H4v13h4"/></svg>복사</button></div></div></div>`;
}
const accountsPattern = /(<div class="accounts reveal">)([\s\S]*?)(\r?\n[ \t]*<\/div>\r?\n[ \t]*<\/section>)/;
const match = originalHtml.match(accountsPattern);
if (!match) throw new Error('The invitation account section was not found.');
const originalCards = match[2].split(/\r?\n/).map(line => line.trim()).filter(line => line.startsWith('<div class="account-detail">'));
if (originalCards.length !== 2 || !originalCards[0].includes('data-account="groom"') || !originalCards[1].includes('data-account="bride"')) {
  throw new Error('Expected the existing groom and bride account cards.');
}
const rows = ['groom', 'bride'].flatMap((side, index) => [
  originalCards[index], ...settings.parents.filter(account => account.side === side).map(parentCard)
]);
const brideHtml = originalHtml.replace(accountsPattern, (all, start, body, end) => `${start}\n${rows.map(row => `        ${row}`).join('\n')}${end}`)
  .replaceAll(originalOrigin, brideOrigin)
  .replace('<html lang="ko">', '<html lang="ko" data-invitation="bride">');

function samePath(left, right) {
  const normalize = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  return normalize(left) === normalize(right);
}
function isInside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}
if (!samePath(output, path.join(root, 'dist-bride')) || !samePath(path.dirname(output), root)
    || !samePath(source, path.join(root, 'dist')) || !samePath(await realpath(source), source)) {
  throw new Error('Invalid invitation build paths.');
}
const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    const absolute = path.join(directory, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink() || !isInside(source, await realpath(absolute))) throw new Error('Linked or external build input.');
    if (info.isDirectory()) await collect(absolute);
    else if (info.isFile()) files.push(path.relative(source, absolute));
    else throw new Error('Invalid build input.');
  }
}
await collect(source);
const fileSet = new Set(files.map(relative => relative.replaceAll(path.sep, '/')));
for (const reference of brideHtml.matchAll(/(?:src|href|data-cover-src|content)="([^"]*)"/g)) {
  const url = new URL(reference[1].replaceAll('&amp;', '&'), `${brideOrigin}/`);
  if (url.origin !== brideOrigin || !url.pathname.startsWith('/assets/')) continue;
  if (!fileSet.has(decodeURIComponent(url.pathname).slice(1))) throw new Error('Missing bride invitation asset.');
}
const originalApp = await readFile(path.join(source, 'app.js'), 'utf8');
for (const account of settings.parents.filter(account => account.number)) {
  if (originalHtml.includes(account.number) || originalApp.includes(account.number)) throw new Error('Parent account is present in the original invitation.');
}

// Check both exact targets before replacing any generated bride files.
try {
  const info = await lstat(localPreview);
  if (!info.isFile() || info.isSymbolicLink() || !samePath(await realpath(localPreview), localPreview)) throw new Error('Invalid bride preview target.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
try {
  const info = await lstat(output);
  if (!info.isDirectory() || info.isSymbolicLink() || !samePath(await realpath(output), output)) throw new Error('Invalid bride output target.');
  const allowed = new Set(['index.html', 'style.css', 'app.js', 'assets']);
  if ((await readdir(output)).some(name => !allowed.has(name))) throw new Error('Bride output contains unrelated files.');
  await rm(output, {recursive:true});
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(output);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
for (const relative of files) {
  const destination = path.resolve(output, relative);
  if (!isInside(output, destination)) throw new Error('Bride output path leaves its directory.');
  await mkdir(path.dirname(destination), {recursive:true});
  const expected = relative === 'index.html' ? Buffer.from(brideHtml) : await readFile(path.join(source, relative));
  if (relative === 'index.html') await writeFile(destination, expected);
  else await copyFile(path.join(source, relative), destination);
  if (sha256(expected) !== sha256(await readFile(destination))) throw new Error(`Bride copy verification failed: ${relative}`);
}
await writeFile(localPreview, brideHtml);
console.log(`Built ${files.length} files in dist-bride; all copied asset SHA-256 hashes match.`);
console.log(`Bride URL: ${brideOrigin}/; local preview: bride.html`);
