# 재용 · 유진의 모바일 청첩장

공개 주소: https://jyyjwedding.web.app

로컬 확인은 이 폴더의 `index.html`을 브라우저로 열면 됩니다.

시작할 때 초록 하트와 진행률을 표시합니다. 표지·갤러리 축소판과 확대 사진·하단 사진 및 글꼴을 모두 불러온 뒤 청첩장을 보여줍니다. 불러오지 못한 파일이 있으면 다시 시도할 수 있습니다.

배포 파일은 Node.js 20 또는 24에서 다음 명령으로 생성합니다. 외부 패키지 설치는 필요하지 않습니다.

```sh
node scripts/build.mjs
```

`dist/`에는 화면에서 사용하는 파일과 폰트 라이선스만 들어갑니다. 사진은 원본 파일의 바이트를 그대로 복사합니다.

`main` 브랜치에 푸시하면 GitHub Actions에서 빌드 후 Firebase Hosting으로 배포합니다. 배포 인증은 GitHub OIDC와 Workload Identity Federation으로 구성합니다.

수동 배포는 먼저 빌드한 뒤 실행합니다.

```sh
npx firebase-tools@15.32.1 deploy --only hosting --project jyyjwedding
```

수정할 때는 `index.html`의 초대글·일시·장소·계좌 표시와 `app.js`의 `WEDDING` 설정을 확인하세요. 계좌를 바꾸면 `index.html`의 표시 값과 `app.js`의 `accounts` 복사 값을 함께 수정합니다. 디자인은 `style.css`에서 수정합니다.
