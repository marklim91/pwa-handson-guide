# 🚀 파코(파이썬 코치) PWA WebApp & PWA Step-by-Step Hands-on 가이드

본 저장소는 두 가지 실습 및 프로젝트를 함께 제공합니다:

1. **📘 [PWA Step-by-Step Hands-on 강의 가이드 (`PWA-HANDSON-GUIDE.md`)](./PWA-HANDSON-GUIDE.md)** 및 **독립 실습 샘플 (`public/pwa-sample/`)**
2. **🐍 파코(파이썬 코치) PWA WebApp (`public/`)** — Google Sites(`https://sites.google.com/dge.go.kr/pco`)의 모든 하위 페이지에서 맞춤 삽입 원본 HTML(`data-code`)을 추출하여 독립 실행 가능한 PWA 웹앱으로 복원한 프로젝트

---

## 🌐 배포 및 실행 방법

### 1. 온라인 배포 주소 (GitHub Pages)
- 이 저장소의 기본 Pages 주소는 `https://marklim91.github.io/paco-pythonCoach/`입니다. 실제 배포 URL은 Actions의 `github-pages` 환경 링크를 확인하세요.
- Pages 배포는 아래 **공개 정적 리포트 모드**를 사용합니다. Node 서버 모드의 로그인·실시간 API와는 다릅니다.

### 2. 로컬에서 실행하기

```bash
npm start
```

브라우저에서 아래 주소로 접속합니다:
- **파코(파이썬 코치) 메인 PWA**: `http://localhost:3000`
- **PWA Step-by-Step 핸즈온 실습 샘플**: `http://localhost:3000/pwa-sample/`

### 독립 학습 화면 (new.html)

- Node 서버가 아니라 **Vite 정적 개발 서버**로 실행합니다. 기존 화면·로그인·API는 변경하지 않습니다.

```bash
npm install
npm run dev:new      # http://127.0.0.1:5173/new.html
npm run build:new    # dist-new/ 에 정적 파일 생성
npm run preview:new  # 빌드 결과 확인: http://127.0.0.1:4173/new.html
```

- 구현은 [`public/new.html`](./public/new.html) 하나에 포함됩니다(설정: [`vite.config.js`](./vite.config.js)). React와 shadcn/ui의 Button·Tabs·Dialog 구성 방식을 인라인 CSS에 맞게 적용하며, 접근성 동작은 Radix UI를 사용합니다. 화면 라이브러리는 npm 의존성으로 설치됩니다.
- 입문·기초·도전 3개 트랙의 **샘플 문제 9개**를 제공합니다. 실제 제공 문제는 파일의 `curriculum` JSON에서 설명·입출력·시작 코드·정답·힌트·테스트 케이스를 교체합니다.
- **실행**은 직접 입력한 값으로 Python을 실행하고, **제출하기**는 해당 문제의 전체 테스트를 실행합니다. 모두 통과해야 해결 처리됩니다. 줄 끝 공백·마지막 개행만 무시하며 출력의 대소문자와 줄 내부 공백은 비교합니다.
- Python은 Pyodide Web Worker에서 실행됩니다. 각 실행·제출은 새 실행기를 사용하며 로딩 제한은 90초, 테스트별 실행 제한은 5초, 출력 스트림별 한도는 20,000자입니다. 중지 버튼으로 종료할 수 있습니다. 브라우저 안의 학습용 채점이므로 보안 격리 서버나 부정행위 방지용 채점기는 아닙니다.
- 코드·선택 문제·완료 기록·코치 주소는 전용 `localStorage` 키 `paco-studio-v1`에 저장됩니다. 다른 브라우저·기기로 동기화하지 않습니다. 저장소 접근·용량·데이터 오류는 화면에 경고하고 임시 모드로 전환합니다.
- 코치는 기존 메인 화면의 외부 iframe 주소를 사용하며 **코치 연결하기**를 눌러야 로드합니다. 설정에서 주소를 변경할 수 있습니다. 문제·코드는 자동 전송하지 않고 질문 버튼으로 복사하여 채팅에 직접 붙여넣습니다. 외부 서비스의 인증·iframe 허용 정책이 적용되며, 연결이 막히면 새 창 링크를 사용합니다.
- 별도 학습 API는 없습니다. 단, Python 런타임(Pyodide)은 jsDelivr에서 받으므로 **인터넷 연결이 필요**합니다. 첫 Python 실행은 다운로드로 시간이 걸릴 수 있습니다. 외부 코치 역시 인터넷이 필요하며 완전 오프라인 기능은 제공하지 않습니다.

---

## GitHub Actions → Pages 공개 정적 리포트

### 처음 설정하기

1. **학생 정보 공개에 대한 학교 정책·동의를 먼저 확인하세요.** 학생의 이름·학교·레벨·누적 점수·Dataverse 수정 시각을 누구나 다운로드 가능한 JSON으로 배포합니다. 로그인으로 보호되지 않으며 검색·복사·보관될 수 있습니다. 공개하면 안 되는 학생이 포함된다면 이 모드로 배포하지 마세요.
2. 저장소 **Settings → Secrets and variables → Actions → Secrets → New repository secret**에 다음 한 개를 등록합니다.
   - 이름: `POWER_AUTOMATE_DASHBOARD_URL`
   - 값: 기존 대시보드용 Power Automate 흐름의 **전체 HTTPS 서명 URL**. 로그인용 URL이 아니며 `sig` 등 쿼리도 포함합니다. 이 값을 소스·로그·배포 파일에 넣지 않습니다.
3. 같은 화면의 **Variables → New repository variable**에서 `PAGES_PUBLISH_STUDENT_DATA`를 만들고, 공개 승인을 마친 경우에만 값 `true`를 입력합니다. 미설정/다른 값이면 데이터 조회와 배포를 실패 처리합니다.
4. **Settings → Pages → Build and deployment → Source → GitHub Actions**를 선택합니다.
5. 변경한 소스와 [`.github/workflows/pages.yml`](./.github/workflows/pages.yml)을 `main`에 push합니다. 비밀 URL을 등록한 파일, `.env`, `data/`, `_site/`는 커밋하지 않습니다.
6. **Actions → Test and deploy static report**에서 확인합니다. 수동으로는 **Run workflow → main**을 선택합니다. 배포의 `github-pages` 환경에 승인/브랜치 제한이 있다면 해당 정책에 따라 승인합니다.
7. 완료 후 환경 링크의 메인 화면과 `dashboard.html`을 엽니다. 로그인으로 이동하지 않고 **공개 정적 리포트 · 로그인 미지원** 및 **마지막 수집 시각**이 표시되어야 합니다.

### 자동화와 검증

- PR에서는 **외부 연결 없는 `npm test`만** 실행합니다. 비밀값을 주입하지 않습니다.
- `main` push·수동 실행·매시간 **UTC 기준 17분** 예약 실행 시 테스트 → 공개 승인 확인 → Dataverse 조회 → `_site/` 생성 → Pages 배포 순서로 진행합니다. 예약 실행은 기본 브랜치에서 동작하며 GitHub 사정으로 지연·누락되거나 비활성화될 수 있어 정확한 실시간 갱신을 보장하지 않습니다.
- [생성 스크립트](./scripts/build-pages.js)는 기존 서버와 같은 URL 허용 목록·15초 제한·32MiB 제한·필수 열·전체 페이지·최신 활성 기록 검증을 재사용합니다. 조회 실패/잘못된 데이터는 예시 데이터나 빈 성공으로 대체하지 않고 배포를 실패시킵니다. 이전에 성공한 사이트는 남아 있으므로 **화면의 수집 시각과 Actions 실패 알림을 확인**하세요.
- 배포 후 [확인 스크립트](./scripts/check-pages.js)가 실제 공개 주소의 HTML, 정적 모드 스크립트, 이번 빌드와 **동일한 수집 시각의 JSON**을 확인합니다. CDN 전파를 고려해 최대 5회 재시도합니다. 학생 이름이나 서명 URL을 로그에 출력하지 않습니다.
- 업로드 대상은 저장소 전체나 `public/` 원본이 아닌 **생성된 `_site/`만**입니다. 서버 코드·비밀키·학번·이메일·Dataverse GUID·로그인 세션은 포함하지 않습니다. API URL은 export 단계 환경변수로만 제공됩니다. 공개 데이터 artifact 보관 기간은 1일입니다.
- Actions가 실패하면 Secrets 이름·값, 공개 승인 Variable, Pages Source, 흐름의 필수 열과 전체 페이지 설정을 확인하세요. `PAGES_OUTPUT_ALREADY_EXISTS`는 이전 `_site/`가 있다는 의미입니다. 로컬 재생성 시 해당 생성 폴더임을 확인한 후 삭제하거나 [함수](./scripts/build-pages.js)의 다른 출력 경로를 사용하세요.

### 정적 모드의 차이

- 기존 페이지를 복사하면서 모든 HTML의 첫 스크립트로 생성 전용 `site-mode.js`를 주입합니다. 저장소 원본과 `npm start`의 서버 모드는 그대로 유지합니다.
- 로그인 화면은 공개 대시보드로 이동합니다. 학교·학번 쿠키가 있어도 인증으로 취급하지 않습니다. 로그인/로그아웃과 접속 집계는 서버가 필요해 숨깁니다.
- **내 학습**은 정적 모드에서 `reports/dashboard.json`과 `reports/learning-guides.json`(레벨별 공개 로드맵 가이드)을 읽어, 학교·이름을 **직접 선택**하면 순위(전체/학교)와 학습 가이드를 브라우저에서 계산해 보여줍니다. 본인 인증이 아니며 선택값은 브라우저 `localStorage`에만 저장됩니다. 이미 공개된 항목만 사용하고 학번은 내보내지 않습니다.
- 전체 학생 랭킹·학교/이름 검색·학생별 최신 점수는 사용할 수 있습니다. **과거 배포 간 성장 이력은 보관하지 않으며**, 매번 단일 관측값과 “관측 대기”를 표시합니다. 현재 서버 파일의 기존 관측 이력을 공개 artifact로 복사하지 않습니다.
- 화면의 다시 읽기는 **배포된 JSON을 다시 읽는 동작**이지 Power Automate 실행이 아닙니다. 조회 시각이 2시간 넘었으면 경고를 표시합니다. 공개 JSON은 서비스 워커의 오프라인 캐시로 대체하지 않으며 연결 실패를 명시합니다. Pages/CDN의 캐시 전파 지연은 있을 수 있습니다.
- 공개 학생 ID는 배포마다 무작위로 생성하여 같은 배포 안의 동명이인 선택에만 사용합니다. 학번·서버 비밀키에서 만든 가명을 정적 파일에 내보내지 않습니다.
- 외부 Copilot iframe은 그대로 유지합니다. 해당 Agent의 채널·인증 정책에 따라 동작하며, Pages가 학생 본인을 확인하거나 자동 로그인 문맥을 전달하는 기능은 없습니다.
- 공개 중단 시 Variable만 끄면 **앞으로의 배포만 중단**됩니다. 이미 배포한 사이트는 Settings → Pages에서 게시를 중단하고 공개 artifact도 확인하세요. 외부에 복사된 데이터까지 회수할 수는 없습니다.

## Node 없이 정적 페이지로 실행 (로컬 정적 모드)

Node.js 서버(`server.js`) 대신 `public/` 폴더를 **아무 정적 서버**로 서빙하면 됩니다. 기존 `/api/*` 호출(`login/verify`, `session`, `presence`, `dashboard`, `me/learning`)은 브라우저의 `fetch`를 가로채는 [`public/local-api.js`](./public/local-api.js)가 처리합니다. 서버 코드 없이 브라우저 JS만으로 동작하므로 이후 인터넷 정적 호스팅에도 그대로 쓸 수 있습니다.

```powershell
python -m http.server 8080 --bind 127.0.0.1 --directory public   # 또는 VS Code Live Server 등
```

1. `http://127.0.0.1:8080/local-setup.html`을 엽니다.
2. 데이터 소스를 정합니다. **Power Automate 조회 흐름 URL** 입력(흐름의 Response에 `Access-Control-Allow-Origin` 헤더 필요) 또는 흐름 결과 **JSON 파일 가져오기**.
3. “로컬로 처리”를 켜고 저장한 뒤 로그인 화면으로 이동합니다.

- 설정·세션·성장 기록은 해당 브라우저의 `localStorage`에만 저장됩니다. **목적지를 모든 브라우저에 고정**하려면 [`public/local-api.js`](./public/local-api.js) 상단 `DEFAULTS`의 `flowUrl`(조회 흐름)·`loginUrl`(로그인 검증 흐름)에 URL을 적으세요. 적으면 로컬 모드가 자동으로 켜집니다. 브라우저에서 직접 호출하므로 이 URL은 사용자에게 노출되며, 공개 저장소에 올리면 누구나 볼 수 있습니다.
- `loginUrl`을 적으면 로그인은 `POST { school, studentId, studentName }` → `{ verified: true|false }` 흐름으로 확인합니다(기존 서버 방식과 동일). 비워 두면 조회 데이터의 학교·학번·이름 일치 여부로 확인합니다. 두 방식 모두 브라우저 안의 확인이라 보안 경계는 아닙니다. 접속 현황·성장 이력은 그 브라우저 한 곳만 집계합니다.
- 공개 인터넷에 올릴 때는 흐름 Response의 CORS 설정이 필요합니다. 기본 요청은 사전 요청이 없는 `text/plain`이므로, 로그인 흐름에서는 본문을 `json(triggerBody())`로 읽어야 합니다(`contentType: "json"`은 흐름이 OPTIONS 사전 요청을 처리할 때만). 서명 URL을 숨기려면 서버리스 API(예: Azure Functions)가 필요하며, 이 경우 로컬 모드를 끄면 기존 `/api/*` 호출이 그대로 실제 API를 향합니다.

## 로그인 (Node 서버 모드)

- 첫 접속 시 학교·학번 쿠키가 없거나 유효하지 않으면 `login.html`로 이동합니다. 기존 쿠키가 있으면 메인 화면을 유지합니다.
- 학교(현풍중학교, 경북여자고등학교, 함양여자중학교, 도원중학교), 학번(숫자만), 이름(문자만)은 모두 필수입니다.
- `POST /api/login/verify`에서 Power Automate를 통해 Dataverse를 조회하고, 학교·학번·이름이 모두 일치하며 `Is Active`가 예인 학생이 있을 때만 쿠키를 저장하고 `index.html`로 이동합니다. 학번은 앞자리 0을 유지합니다.
- 학교(`school`)와 학번(`studentId`)만 세션 쿠키로 저장하며 쿠키에는 이름을 저장하지 않습니다. 대시보드 최근 로그인 표시용 이름은 서버에 저장합니다. 브라우저의 세션 복원 설정에 따라 쿠키가 복원될 수 있습니다.
- 학생 정보 일치 여부만 검증합니다. 학교·학번 쿠키는 브라우저에서 수정할 수 있으며, 기존 쿠키로 진입할 때 재조회하지 않습니다. 신원 증명이나 보호된 API의 접근 제어가 필요하면 별도의 서버 세션·인증이 필요합니다.
- 검증 실패·미설정·시간 초과·잘못된 흐름 응답은 로그인을 허용하지 않습니다. 신규 로그인은 네트워크 연결이 필요합니다.
- 회귀 테스트는 `npm test`로 실행합니다.
- 검증 성공 시 별도의 `pco_session` HttpOnly 세션 쿠키를 발급합니다. 접속 집계와 현재 학생의 학습 현황 선택에 사용합니다. 현재 로그인은 학교·학번·이름 일치 확인이며 강한 본인 인증이 아닙니다. 기존 학교·학번 표시 쿠키나 이 세션을 민감한 비공개 기록·관리자 기능의 접근 권한으로 확대 사용하지 마세요.

## 학생 성장 · 랭킹 대시보드

- 주소: `http://localhost:3000/dashboard.html` (기존 `/dashboard`, `/대시보드` 별칭 유지).
- 변경 전 화면은 [`original/dashboard-before-live.html`](./original/dashboard-before-live.html)에 원본 그대로 보존했습니다. 백업은 웹 서버에서 제공하지 않습니다.
- 학생 전체 공개용이며 사용자 선택에 따라 **실명·학교·점수·레벨·접속 현황을 공개**합니다. 학교의 공개·동의 정책을 확인하세요. 원본 학번·이메일·Dataverse GUID는 반환하지 않습니다. 이름 아래에는 학교만 표시하며 `학습자-…` 가명은 랭킹·리포트·접속 현황·내 학습 화면 및 접근성 라벨에서 표시하지 않습니다. 검색은 이름과 학교를 지원합니다. API의 학생 ID·가명 필드는 호환성을 위해 유지하지만 화면에 노출하지 않으며, 동명이인도 내부 학생 ID로 구분하여 리포트를 선택합니다.
- 랭킹은 학교+학번별 `modifiedon`이 가장 최신인 기록의 **누적** `learningpoints` 기준입니다. 세션별 점수를 합산하지 않습니다. 동점은 `1, 1, 3` 방식의 공동 순위이며 학교 필터에서는 해당 학교 기준으로 다시 매깁니다.
- 최신 기록의 실제 `crbf2_isactive`가 Boolean `true`인 학생만 포함합니다. 화면의 True/False 라벨이 아닌 실제 값을 사용합니다. 최신 비활성 기록을 과거 활성 기록으로 대체하지 않습니다.
- 학생별 관측 리포트는 **전체 대시보드·내 학습 현황 조회 때 실제 수집한** 첫 점수와 일별 최초·최종 관측값을 최대 90일 보관합니다. 데이터가 없는 과거 성장·퀴즈 점수·학습 횟수는 생성하지 않습니다. 최초 관측 한 번이면 성장은 “관측 대기”입니다. 화면을 아무도 조회하지 않는 동안에는 수집하지 않습니다.
- 이 집계는 `learningpoints`가 누적 점수라는 전제입니다. 테이블이 세션별 증분 점수나 여러 과정의 병렬 기록이라면 사용 전에 집계 계약을 변경해야 합니다. 동일 학생·동일 최신 수정 시각의 값이 충돌하면 오류로 표시합니다.
- 최근 로그인은 검증 성공 이후의 학생별 마지막 로그인 시각이며 최대 30일 보관하고 최근 20명을 표시합니다. 기존 Dataverse `Last Login At`이나 과거 접속 기록을 소급 생성하지 않습니다.
- 새 로그인에는 검증된 입력 이름을 저장합니다. 기존 로그인 기록의 이름은 성공한 Dataverse 조회로 보완합니다. 보완 전에는 “이름 미등록”과 안내를 표시하며 임의의 이름을 생성하지 않습니다.
- 현재 활동 수는 서버 세션을 발급받고 최근 5분 내 활동 신호를 보낸 학생의 고유 수입니다. 열린 화면은 1분마다 신호를 보내며 숨겨진 탭은 보내지 않습니다. 여러 기기는 한 명으로 합산하며 화면을 닫아도 최대 5분간 포함될 수 있습니다.
- 상단 **로그인 / 재검증**으로 기존 표시 쿠키가 있어도 서버 세션을 새로 발급받을 수 있습니다. **로그아웃**하면 해당 브라우저 세션을 폐기합니다. 세션 유효기간은 12시간이며 활동 신호만으로 연장하지 않습니다.
- 상단 로그인 상태는 **학교 / 이름 학생**으로 표시하며, 쿠키로 연결된 검증된 서버 세션의 학교·이름을 사용합니다. 편집 가능한 학교·학번 표시 쿠키를 인증 정보로 사용하거나 이름 쿠키를 추가하지 않습니다. 기존 기록에 이름이 없으면 “이름 미등록”으로 명시하고, 활동 신호 이후에도 학생 표시를 유지합니다.
- 대시보드 API는 최대 60초간 서버에서 공유 캐시하여 흐름 호출을 줄입니다. 접속 목록은 15초마다 새로고침합니다. API 응답은 브라우저·서비스 워커에 저장하지 않으며 실패를 빈 학생 목록이나 예시 데이터로 대체하지 않습니다.

### 내 학습 현황

- 주소: `http://localhost:3000/my-learning.html` (`/my-learning`, `/내학습`도 지원). 공통 상단 메뉴의 **내 학습**에서 이동합니다. 기존 전체 학생 대시보드와 학습 시작 버튼·Copilot 연동은 변경하지 않습니다.
- `GET /api/me/learning`은 검증된 서버 세션에 해당하는 **한 학생만** 반환합니다. 편집 가능한 학교·학번 쿠키로 학생을 선택하지 않으며, 학생 선택용 쿼리 매개변수도 받지 않습니다. 학교가 다르면 같은 학번도 다른 학생으로 구분합니다.
- 기존 `POWER_AUTOMATE_DASHBOARD_URL`과 최대 60초 공유 캐시를 재사용하므로 **새 Power Automate 흐름이나 Dataverse 열을 추가할 필요가 없습니다.** 기존 필수 열(실명 포함)은 모두 필요합니다. 화면은 보이는 동안 1분마다 새로 조회하고 수동 새로고침도 지원합니다.
- 실제 현재 레벨·누적 점수·전체/학교 공동 순위·수집 이후 점수 변화·최근 관측 최대 7건을 표시합니다. 원본 학번·Dataverse GUID나 다른 학생의 프로필은 이 API로 반환하지 않습니다.
- [`learning-guide.js`](./learning-guide.js)의 안내는 기존 **15단계 로드맵**에 맞춘 현재 단계 복습, 다음 단계 목표, 연습 과제·자기 점검 질문 및 Python 공식 문서 링크입니다. 레벨에 따른 권장 가이드이지 개인 오답·취약점·학습 완료를 분석한 결과가 아닙니다.
- 현재 데이터에는 **승급 점수·평가 규칙이 없으므로** 남은 XP, 승급 진행률, 확정 승급 조건을 생성하지 않습니다. 과제 답변·완료 여부도 저장하거나 점수·레벨에 반영하지 않습니다. 실제 승급 정책을 연결하기 전까지 안내와 실제 기록을 구분합니다.
- Lv.15에는 프로젝트 개선 과제를 제안하고 Lv.16을 임의로 만들지 않습니다. 레벨이 1~15 밖이면 원래 기록은 표시하되 단계별 추천은 중단하고 기준 확인을 안내합니다.
- 서버 세션이 없거나 12시간이 지나면 `401`과 로그인/재검증 안내, 최신 활성 학생 기록이 없으면 `404`와 확인 안내를 표시합니다. 흐름 오류는 그대로 알리며 이전 개인 기록이나 예시 학생으로 대체하지 않습니다. 화면을 숨기거나 떠날 때 개인 기록 DOM을 비우고 복귀 시 다시 확인합니다.
- 개인 API도 `no-store`이며 서비스 워커·로컬 저장소에 개인 응답을 저장하지 않습니다. 공개 대시보드와 같은 데이터를 학생별로 선택하는 기능으로, 새 민감 정보에 대한 접근 제어를 제공하는 기능은 아닙니다.

### 대시보드용 Power Automate 조회 흐름 만들기

로그인 흐름은 그대로 두고 **별도 읽기 전용 흐름**을 만드세요. 이 흐름은 MCP/에이전트와 무관하게 웹 서버가 호출합니다.

1. HTTP 요청 트리거를 추가합니다. POST 본문 스키마는 `{"type":"object","properties":{},"additionalProperties":false}`입니다.
2. 현재 서버 구현은 서명 URL 방식입니다. 조직 정책이 허용할 때만 트리거의 호출 대상을 **Anyone**으로 설정합니다. 금지되어 있다면 Entra ID 인증 구현을 먼저 추가해야 하며 정책을 우회하지 않습니다.
3. Dataverse **행 나열(List rows)** 작업을 추가하고 이름을 `List_learning_records`로 지정합니다. 로그인 흐름과 같은 환경의 `StudentLearningRecord` 테이블을 선택하고 읽기 전용 최소 권한 연결을 사용합니다.
4. **열 선택**에 다음 논리 이름을 입력합니다. 환경에서 실제 논리 이름을 확인하세요. 실명 표시를 위해 `crbf2_studentname`이 필수이며 이메일은 선택하지 않습니다.

   ```text
   crbf2_studentlearningrecordid,crbf2_schoolname,crbf2_studentnumber,crbf2_studentname,crbf2_currentlevel,crbf2_learningpoints,crbf2_isactive,modifiedon
   ```

5. **행 필터**와 **행 수**는 비웁니다. 서버가 최신 기록을 먼저 선택한 뒤 활성 여부를 판단하므로 흐름에서 과거 활성 기록만 미리 골라내지 않습니다. **정렬 기준**은 `modifiedon desc`로 설정합니다.
6. 작업 설정의 **페이지 매김**을 켜고 임계값을 `100000`으로 설정합니다. 서버는 `@odata.nextLink`, 건수 초과 표시, 100000행 이상 응답을 부분 집계 위험으로 판단하여 거부합니다. 이 한도에 도달하면 서버에서 전체 페이지를 처리하는 방식으로 확장해야 합니다.
7. 마지막에 HTTP **응답(Response)** 작업을 추가합니다. 상태 `200`, 헤더 `Content-Type: application/json`, **본문은 식(Expression) 탭에서** 아래 식으로 등록합니다. 식 자체를 문자열로 붙이지 않습니다.

   ```text
   body('List_learning_records')
   ```

8. 최종 HTTP 응답은 `{"value":[...]}` 형태여야 합니다. `statusCode/headers/body` 전체를 한 번 더 감싸거나 `verified`만 반환하면 안 됩니다. 각 행에는 위 필수 열이 필요하며 이름은 비어 있지 않은 최대 100자 문자열, 점수·레벨은 음수가 아닌 정수, 학번은 문자열, 활성 여부는 Boolean, `modifiedon`은 시간대가 있는 날짜 문자열이어야 합니다. 이름 열 누락은 `STUDENT_NAME_REQUIRED` 오류로 알립니다. 빈 필드는 임의로 0으로 채우지 말고 데이터 품질을 확인하세요.
9. 지원되는 **Secure inputs / Secure outputs** 설정과 실행 기록 권한 제한을 적용하고 저장합니다. Dataverse 조회 실패를 빈 `value` 배열로 바꾸지 마세요. 실패 상태를 유지하거나 HTTP 오류를 반환합니다.

### 서버 설정과 영속 저장소

PowerShell의 같은 터미널에서 환경변수를 설정하고 서버를 재시작합니다. `.env`는 자동으로 읽지 않습니다.

```powershell
$env:POWER_AUTOMATE_LOGIN_URL = '<기존 로그인 흐름의 전체 HTTPS URL>'
$env:POWER_AUTOMATE_DASHBOARD_URL = '<새 대시보드 흐름의 전체 HTTPS URL>'
npm start
```

서명 URL은 Git·브라우저 JavaScript·채팅에 넣지 않습니다. 새 조회 흐름 미설정 시 화면은 설정 필요 오류를 표시하며 로그인 현황 API는 독립적으로 동작합니다. Node.js 서버가 필요하므로 GitHub Pages 단독으로는 동작하지 않습니다.

- 기본 저장 위치는 `data/dashboard.json`이며 Git에서 제외됩니다. 서버 세션 토큰의 해시, 가명 생성 비밀키, 로그인 이름·시각과 점수 관측값을 보관합니다. 원본 학번·원본 세션 토큰은 저장하지 않습니다. 로그인 이름은 최근 로그인 기록과 함께 최대 30일 보관합니다.
- 운영에서는 `DASHBOARD_DATA_FILE`에 영속 디스크의 절대 파일 경로를 지정하고 해당 파일의 읽기 권한을 서버 계정으로 제한하세요. 파일과 비밀키는 백업 대상이며 공개 다운로드 경로에 두면 안 됩니다. 파일이 사라지면 기록·가명 ID·세션이 초기화됩니다.
- HTTPS 프록시 뒤에서는 `SESSION_COOKIE_SECURE=true`로 설정하여 Secure 쿠키를 발급합니다. 직접 TLS 연결에서는 자동 적용됩니다.
- 파일 저장은 단일 Node.js 프로세스용입니다. 여러 서버·워커에서 같은 파일을 공유하면 안 됩니다. 다중 인스턴스 운영에는 공유 데이터베이스·세션 저장소로 전환해야 합니다.
- API: `GET /api/dashboard`, `GET /api/dashboard?school=...`, `GET /api/presence`, `GET /api/session`, `POST /api/session/heartbeat`, `POST /api/session/logout`.
- 이 세션은 기존 로그인 흐름의 학생 정보 일치 확인을 기록할 뿐 신원 증명으로 강화하지 않습니다. 관리자 화면이나 개인별 비공개 데이터 조회에는 별도 인증·권한 체계가 필요합니다.

검증: `npm test`. 실제 연동 후 점수 변경·동점 순위·학교 필터·잘못된 흐름 응답·다중 기기 접속·로그아웃·서버 재시작 후 기록 유지를 확인하세요. 로컬 모의 테스트 성공만으로 실제 Dataverse 연결 성공을 의미하지는 않습니다.

## 로그인용 Power Automate / Dataverse 설정

흐름은 Power Automate에서 직접 만들어야 합니다. 코드만 실행해도 흐름이 자동 생성되지는 않습니다.

```text
로그인 화면 → Node.js POST /api/login/verify
           → Power Automate HTTP 트리거
           → Dataverse StudentLearningRecord 조회
           → { "verified": true 또는 false }
```

#### 1. 환경과 열 확인

1. [Power Automate](https://make.powerautomate.com/)에서 환경 **한국과학창의재단** (`9324e73a-cd4e-e049-b7ba-177af6165e9c`)을 선택합니다.
2. Dataverse 환경 주소는 `https://org3d4c9970.crm5.dynamics.com`입니다.
3. 테이블의 **논리 이름**은 `crbf2_studentlearningrecord`, 표시 이름은 `StudentLearningRecord`입니다.
4. Power Apps에서 **School Name**, **Student Number**, **Student Name**, **Is Active** 열을 각각 열고 고급 옵션의 **논리 이름**을 확인합니다. 화면의 스키마 이름과 논리 이름을 혼동하지 마세요. 제공된 이미지에는 일부 이름이 잘려 있어 아직 확정하지 않았습니다.
5. 필요하면 해당 환경에 로그인한 브라우저에서 아래 메타데이터 URL로 열의 논리 이름을 확인합니다. 학생 데이터가 아닌 열 정의를 조회합니다.

```text
https://org3d4c9970.crm5.dynamics.com/api/data/v9.2/EntityDefinitions(LogicalName='crbf2_studentlearningrecord')/Attributes?$select=LogicalName,SchemaName,AttributeType
```

#### 2. HTTP 트리거 만들기

1. HTTP 요청 트리거를 사용하는 클라우드 흐름을 만들고 **When an HTTP request is received / HTTP 요청을 받은 경우**를 추가합니다. 필요한 Power Automate/Dataverse 라이선스와 환경 권한을 확인합니다.
2. **Who can trigger the flow?**를 **Anyone / 누구나**로 설정합니다. 새 흐름의 기본값인 테넌트 사용자 인증은 이 서버 구현과 다릅니다.
3. **중요:** 조직 정책상 `Anyone`을 허용하는 경우에만 사용합니다. 이 방식은 URL을 아는 사람이 호출할 수 있으므로, 서명이 포함된 전체 URL을 비밀로 관리해야 합니다. 조직 정책이 이를 금지하면 설정을 우회하지 말고 Entra ID 인증 구현을 추가해야 합니다.
4. 요청 메서드 옵션이 있으면 **POST**를 선택하고 요청 본문 JSON 스키마를 입력합니다.

```json
{
  "type": "object",
  "properties": {
    "school": {
      "type": "string",
      "enum": ["현풍중학교", "경북여자고등학교", "함양여자중학교", "도원중학교"]
    },
    "studentId": { "type": "string", "minLength": 1, "maxLength": 32 },
    "studentName": { "type": "string", "minLength": 1, "maxLength": 100 }
  },
  "required": ["school", "studentId", "studentName"],
  "additionalProperties": false
}
```

#### 3. Dataverse에서 활성 학생 조회

1. **Microsoft Dataverse → List rows / 행 나열** 작업을 추가하고 작업 이름을 `Find_student`로 바꿉니다.
2. 올바른 환경의 Dataverse 연결을 선택하고 테이블은 **StudentLearningRecord**로 선택합니다. 연결 계정에는 대상 레코드를 읽을 수 있는 최소 권한을 부여합니다.
3. **Row count / 행 수**를 `1`로 설정합니다. 페이지 매김은 켤 필요가 없습니다.
4. **Select columns / 열 선택**에는 확인한 학교 열의 논리 이름만 입력합니다. 학생 전체 레코드를 반환할 필요가 없습니다.
5. **Filter rows / 행 필터링**에 아래 값을 입력합니다. `<...>` 네 곳을 실제 열의 논리 이름으로 교체하세요. `$filter=`는 붙이지 않습니다. 학번은 텍스트이므로 따옴표로 감싸며, `Is Active`는 Yes/No이므로 `true`를 사용합니다.

```text
<SCHOOL_LOGICAL_NAME> eq '@{replace(triggerBody()?['school'],decodeUriComponent('%27'),decodeUriComponent('%27%27'))}' and <STUDENT_NUMBER_LOGICAL_NAME> eq '@{replace(triggerBody()?['studentId'],decodeUriComponent('%27'),decodeUriComponent('%27%27'))}' and <STUDENT_NAME_LOGICAL_NAME> eq '@{replace(triggerBody()?['studentName'],decodeUriComponent('%27'),decodeUriComponent('%27%27'))}' and <IS_ACTIVE_LOGICAL_NAME> eq true
```

`@{...}`는 Power Automate 동적 식입니다. 작은따옴표를 이스케이프하여 OData 문자열에 안전하게 넣습니다. 조건에 맞는 활성 레코드가 하나라도 있으면 성공하며 데이터를 생성·변경하지 않습니다.

#### 4. 검증 결과 응답

1. **Response / 응답** 작업을 추가합니다.
2. 상태 코드는 `200`, 헤더는 `Content-Type: application/json`으로 설정합니다.
3. 본문에 **Expression / 식** 탭으로 아래 식을 입력합니다. 결과는 객체이며 `verified`는 문자열이 아닌 **Boolean**이어야 합니다.

```text
setProperty(json('{}'), 'verified', not(empty(body('Find_student')?['value'])))
```

- 성공: `{"verified":true}`
- 불일치 또는 비활성: `{"verified":false}`
- Dataverse 조회 실패를 `verified:true`로 처리하면 안 됩니다. 별도 오류 응답 작업을 추가한다면 `Find_student`의 실패·시간 초과 시에만 실행되게 구성하고 HTTP `502`, 본문 `{"error":"verification_failed"}`를 반환합니다. 실행 자체가 실패해도 서버는 로그인에 실패하도록 처리합니다.
- 트리거·조회 작업·응답 작업에서 지원하는 **Secure inputs / Secure outputs** 설정을 켜 학생 정보가 실행 기록에 노출되는 범위를 줄이고, 흐름 소유자·실행 기록 접근 권한을 제한합니다.

#### 5. 서버에 흐름 URL 설정

흐름을 저장한 뒤 HTTP 트리거의 전체 URL을 복사합니다. 서명과 쿼리 문자열을 생략하지 마세요. URL을 채팅·Git·브라우저 JavaScript에 넣지 않습니다.

PowerShell에서 Node.js 22 이상을 사용하여 실행합니다.

```powershell
$env:POWER_AUTOMATE_LOGIN_URL = '<저장 후 발급된 전체 HTTPS 트리거 URL>'
npm start
```

이 환경 변수는 같은 터미널에서 시작한 서버에 적용됩니다. `.env` 파일은 자동으로 읽지 않습니다. 운영 환경에서는 서버의 보안 환경 변수/비밀 관리 기능을 사용하고 URL 노출 시 서명 키를 재발급합니다. 서버는 Microsoft의 `*.logic.azure.com` 및 `*.api.powerplatform.com` HTTPS 트리거만 호출하고 리디렉션을 따르지 않습니다.

로그인 화면은 이 Node.js 서버와 같은 출처에서 제공해야 합니다. **GitHub Pages 단독 배포는 검증 API를 실행할 수 없습니다.** 별도 API 호스팅을 사용할 경우 주소·출처 정책 등을 추가로 구성해야 합니다.

#### 6. 동작 확인 및 오류

- 테스트용 활성 학생으로 학교·학번·이름이 모두 일치하면 메인 화면으로 이동하는지 확인합니다.
- 이름이나 학번이 다르거나 `Is Active`가 아니오이면 로그인이 거부되어야 합니다.
- 기존 로그인 쿠키가 있으면 로그인 화면을 건너뛰므로, 재검증할 때는 사이트의 `school`, `studentId` 쿠키를 삭제하거나 새 브라우저 프로필을 사용합니다.
- `400`: 입력 형식 오류, `401`: 일치하는 활성 학생 없음, `413`: 요청 크기 초과, `415`: JSON 요청 아님.
- `503`: 서버 URL 미설정/잘못된 설정, `502`: 흐름 호출 실패/잘못된 응답, `504`: 흐름 호출 제한 시간(15초) 초과.
- `502`이면 흐름 URL·인증 모드·연결 계정 권한·열 논리 이름·응답의 Boolean 형식을 확인합니다. 서버 로그에는 오류 코드만 기록하고 URL이나 학생 정보를 기록하지 않습니다.
- 자동 테스트는 외부 서비스를 모의 처리합니다. 실제 Dataverse 연결 확인은 위 흐름과 환경 변수를 설정한 후 별도로 진행해야 합니다.

공식 문서: [HTTP 트리거 인증](https://learn.microsoft.com/en-us/power-automate/oauth-authentication), [Dataverse 행 나열](https://learn.microsoft.com/en-us/power-automate/dataverse/list-rows).

---

## 📂 디렉터리 및 페이지 구조

- **[`PWA-HANDSON-GUIDE.md`](./PWA-HANDSON-GUIDE.md)** — **PWA 강의용 6단계 Step-by-Step Hands-on 가이드**
  - Step 1: 기본 웹앱 및 HTTPS/`localhost` 환경 구성
  - Step 2: `manifest.json` 작성 및 고유 식별자(`id`) 속성 활용 ([web.dev Manifest](https://web.dev/articles/add-manifest#id))
  - Step 3: 적응형 아이콘 안전 영역 검증 ([Maskable.app](https://maskable.app/))
  - Step 4: Service Worker 수동 구현 vs 자동 생성 ([Google Workbox](https://developer.chrome.com/docs/workbox?hl=ko))
  - Step 5: Chrome/Edge DevTools(`Application` 탭) 설치 및 오프라인 디버깅
  - Step 6: 크로스 브라우징([CanIUse](https://caniuse.com/), [BrowserStack](https://www.browserstack.com/)) 및 스토어 패키징([PWA Builder](https://www.pwabuilder.com/))
- `public/` — 정적 배포(GitHub Pages) 및 로컬 실행 가능한 PWA 리소스
  - `/index.html` (`/파코v3`): 파코 v3 통합 메인 페이지 (홈 + AI 코치 + 레벨 로드맵)
  - `/dashboard.html` (`/대시보드`): Dataverse 전체 학생 성장·랭킹·접속 현황
  - `/my-learning.html` (`/내학습`): 로그인 학생의 실제 레벨·점수와 로드맵 기반 학습 가이드
  - `/v3_4/index.html` (`/파코v3_4`): 파코 v3.4 분리형 홈
  - `/v3_4/coach.html` (`/파코v3_4/ai코치`): 파코 v3.4 AI 코치 전용 채팅 페이지
  - `/v3_4/roadmap.html` (`/파코v3_4/레벨-로드맵`): 파코 v3.4 레벨 로드맵 페이지
  - `/v2.html` (`/파코v2`): 파코 v2 구버전 페이지
  - `/pwa-sample/` — **강의 실습용 최소 기능 PWA 샘플** (`index.html`, `manifest.json`, `sw.js`, `workbox-config.js`, Maskable 아이콘)
- `original/` — Google Sites에서 추출한 무수정 원본 HTML 6종 보관

---

## 🤖 AI 에이전트 연동 구조 (파코 WebApp)

```text
웹앱 내 AI 코치 페이지
  → Copilot Studio WebChat iframe 삽입
  → Power Platform Direct Line 토큰 발급
  → Direct Line 대화 생성 및 activities 교환
  → 봇 응답을 실시간 채팅 화면에 표시
```

- **v3 / v3.4 에이전트**: `https://copilotstudio.microsoft.com/environments/9324e73a-cd4e-e049-b7ba-177af6165e9c/bots/crbf2_newcoachv3_YEkNfz/webchat?__version__=2&enableFileAttachment=false&cliAgent=true`
- **v2 에이전트**: `https://copilotstudio.microsoft.com/environments/9324e73a-cd4e-e049-b7ba-177af6165e9c/bots/crbf2_newcoach_s_FJsw/webchat?__version__=2&enableFileAttachment=false&cliAgent=true`
