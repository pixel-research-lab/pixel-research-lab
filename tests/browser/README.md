# 브라우저 검증

Playwright를 설치한 Node 환경에서 저장소 루트의 HTTP 서버를 실행합니다.

```sh
npx playwright install chromium --only-shell
python3 -m http.server 8000 --bind 127.0.0.1
# 별도 터미널
node tests/browser/attendance-power.cjs http://127.0.0.1:8000/
```

출퇴근 테스트는 새로운 게스트 브라우저 컨텍스트에서 출근·휴식·퇴근, 재시작, 낮/밤 경계, 꾸미기/배치 미리보기, 모든 방/모니터 외형, 추가 화면, 기록 수정, 오프라인 저장을 확인합니다. `POWER_ARTIFACTS`에 디렉터리를 지정하면 낮 출근·밤 출근·밤 퇴근의 스크린샷도 저장합니다. 운영 사이트를 대상으로 해도 개인 Chrome 프로필이나 로그인 세이브를 사용하지 않습니다.

나머지 브라우저 테스트는 `tools/studio-preview.py`로 만든 게스트 체험 HTML을 HTTP로 제공한 URL을 인자로 받습니다. `image-corners.cjs`의 선택적 세 번째 인자는 `webkit`입니다. WebKit 검증은 `npx playwright install webkit`이 추가로 필요합니다. `slack-cloud.cjs`는 실제 계정 승인 대신 API 응답을 모의합니다.

Chromium 테스트는 Playwright 기본 **chromium headless shell**을 사용합니다. `CHROME_BIN`으로 사용자의 `/Applications/Google Chrome.app/...`을 지정하는 방식은 제거했습니다. headless shell은 일반 Chrome 앱과 별도 실행 파일이며 개인 브라우저와 테스트 프로세스를 분리합니다. 모든 테스트는 `finally`에서 브라우저를 닫습니다. 설치된 Chrome을 실행하는 `executablePath` 또는 `channel: 'chrome'` 옵션을 다시 추가하지 마세요.

공식 설명: https://playwright.dev/docs/browsers#chromium

`node tests/browser/loot-collection.cjs http://127.0.0.1:8000/`는 정식 앱 구조의 새 게스트 컨텍스트에서 50종 이미지, 분류/보유 필터, 퀘스트 보상, 배치, 오프라인 로드, 390px 화면, 전체 도감의 세이브 가져오기를 확인합니다. `LOOT_ARTIFACTS`에 경로를 지정하면 전체 도감과 배치·모바일 화면도 저장합니다. 실제 사용자 계정에 아이템을 지급하지 않습니다.
