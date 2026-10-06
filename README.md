# 재용 · 유진의 모바일 청첩장

기존 주소: https://jyyjwedding.web.app

신부 전용 주소: https://yjjywedding.web.app

로컬 확인은 이 폴더의 `index.html`을 브라우저로 열면 됩니다.

신부 전용 버전은 아래 명령으로 생성한 `bride.html`을 엽니다. 기본 청첩장과 동일한 디자인·사진을 사용하며, 부모님 계좌만 추가합니다. 신랑 부모님 계좌는 빈칸으로 유지합니다.

```sh
node scripts/build-bride.mjs
```

시작할 때 초록 하트와 진행률을 표시합니다. 표지·갤러리 축소판과 확대 사진·하단 사진 및 글꼴을 모두 불러온 뒤 청첩장을 보여줍니다. 불러오지 못한 파일이 있으면 다시 시도할 수 있습니다.

배포 파일은 Node.js 20 또는 24에서 다음 명령으로 생성합니다. 외부 패키지 설치는 필요하지 않습니다.

```sh
node scripts/build.mjs
```

`dist/`는 기존 버전, `dist-bride/`는 신부 전용 버전입니다. 화면에서 사용하는 파일과 폰트 라이선스만 들어갑니다. 사진은 원본 파일의 바이트를 그대로 복사합니다. 신부 부모님 계좌는 `bride-accounts.json`에서 수정하며, 이 설정 파일은 배포하지 않습니다. 생성된 `bride.html`은 빌드할 때 덮어쓰므로 직접 편집하지 마세요.

`main` 브랜치에 푸시하면 GitHub Actions에서 두 버전을 빌드 후 각 Firebase Hosting 사이트에 배포합니다. 배포 인증은 기존 GitHub OIDC와 Workload Identity Federation을 사용합니다.

수동 배포는 먼저 빌드한 뒤 실행합니다.

```sh
npx firebase-tools@15.32.1 deploy --only hosting --project jyyjwedding
```

신부 전용 버전만 배포하려면 `--only hosting:bride`를 사용합니다. 각 사이트의 predeploy가 필요한 빌드를 실행합니다.

수정할 때는 `index.html`의 초대글·일시·장소·계좌 표시와 `app.js`의 `WEDDING` 설정을 확인하세요. 계좌를 바꾸면 `index.html`의 표시 값과 `app.js`의 `accounts` 복사 값을 함께 수정합니다. 디자인은 `style.css`에서 수정합니다.
