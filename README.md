# tana

## 기술 스택

- Vite
- React
- TypeScript
- Emotion
- Yarn (`node_modules`)
- OxLint
- Prettier

`package.json`에는 `@ui5/webcomponents`, `@ui5/webcomponents-react`, `zustand`도 있다. `src`에서는 아직 사용하지 않는다.

## 실행 방법

```bash
yarn install
yarn dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000) 이다.

```bash
yarn build
yarn preview
```

`build`는 타입 체크 후 정적 파일을 만든다. `preview`는 그 결과물을 로컬에서 확인한다.

## Scripts

| Script | 명령 | 설명 |
| --- | --- | --- |
| `dev` | `yarn dev` | Vite 개발 서버 |
| `build` | `yarn build` | `tsc -b` 후 `vite build` |
| `lint` | `yarn lint` | OxLint |
| `preview` | `yarn preview` | 빌드 결과 미리보기 |

포맷 전용 script는 없다.

## 폴더 구조

```text
src/
├─ app/
│  ├─ providers/emotion/EmotionProvider.tsx
│  └─ App.tsx
├─ pages/
├─ widgets/
├─ features/
├─ entities/
├─ shared/
│  ├─ config/
│  ├─ lib/
│  ├─ styles/
│  └─ ui/
└─ main.tsx
```

`pages`, `widgets`, `features`, `entities`와 `shared`의 `config`, `lib`, `ui`는 자리만 있다. 스타일 코드는 `shared/styles`에 있다. 현재 화면은 `App.tsx`에서 Emotion 테마를 적용한다. `EmotionProvider.tsx`는 같은 역할을 하는 컴포넌트지만 `main.tsx`에 연결되어 있지 않다.

`@/`는 `src/`를 가리킨다. Vite alias와 `tsconfig.app.json`의 `paths`가 같다.

## FSD 레이어

의존은 위 레이어에서 아래 레이어로만 둔다.

| 레이어 | 역할 |
| --- | --- |
| `app` | 앱 진입점, 전역 provider |
| `pages` | 라우트에 대응하는 페이지 |
| `widgets` | 페이지에 배치하는 독립된 UI 블록 |
| `features` | 사용자 행동 단위의 기능 |
| `entities` | 업무 개념과 그 표현 |
| `shared` | 업무 의미 없이 여러 레이어에서 쓰는 코드 |

각 레이어에 어떤 코드를 둘지의 판단 기준은 이 문서에 적지 않는다.

## 코드 품질

### OxLint

`yarn lint`로 실행한다. 설정은 `.oxlintrc.json`이다. `correctness` 규칙은 경고가 기본이고, 사용하지 않는 변수, 잘못된 import, 깨진 JSX, Hooks 호출 순서처럼 버그에 가까운 항목은 에러다.

### Prettier

설정은 `.prettierrc`다. `package.json`에는 script가 없으므로 CLI로 실행한다.

```bash
yarn prettier --check .
yarn prettier --write .
```

## 개발 규칙

- 패키지 설치와 스크립트 실행은 Yarn을 쓴다. PnP가 아니라 `node_modules`다.
- `src` 안 import는 `@/`를 쓴다.
- 화면과 기능 코드는 FSD 레이어에 둔다. 여러 레이어의 공통 코드만 `shared`에 둔다.
- `yarn build`는 TypeScript 오류가 있으면 멈춘다.

## 문서

규칙과 환경의 상세 설명은 아직 별도 문서가 없다. 설정 파일의 현재 값은 아래에서 본다.

- `vite.config.ts`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `.oxlintrc.json`
- `.prettierrc`
