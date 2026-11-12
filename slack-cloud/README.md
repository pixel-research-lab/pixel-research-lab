# Slack 알림 체험실

[체험실](https://slack-preview.pixel-research-lab-2e2guk.workers.dev/)에서 Google로 로그인하고 홈의 **Slack 알림 받기 → Slack 연결**을 누릅니다. 개인 DM까지 받으려면 승인하기 전에 체크합니다. 같은 픽셀 연구실 계정으로 다른 기기에 로그인하면 같은 알림과 읽음 상태를 확인할 수 있습니다. 모니터의 소통 창에서 연결을 해제할 수 있습니다.

이 배포는 Pixel Research Lab 테스트 워크스페이스의 지정된 공개 채널만 대상으로 합니다. 게임 세이브는 체험실 기기에 따로 보관합니다. Slack 알림은 서버가 수신하며 홈을 열거나 돌아오면 갱신됩니다. 알림으로 저장하는 내용은 채널 또는 발신자 표시 이름, 시각, Slack 링크와 읽음 상태입니다. 저장 기간은 30일이고 홈에는 최근 80개를 표시합니다.

GitHub Pages 운영판도 같은 Slack 서버와 계정별 알림을 사용합니다. 승인을 마치면 연결을 시작했던 연구실로 돌아갑니다. 운영판의 게임 세이브는 기존 Firebase 계정에 동기화됩니다.

## 배포

1. Cloudflare 계정에 전용 D1 데이터베이스를 만들고 `wrangler.jsonc`에 이름, 데이터베이스 ID, 체험실 주소, 테스트 워크스페이스 및 채널을 지정합니다. Firebase Authentication의 허용 도메인에 체험실 호스트를 추가합니다.
2. 저장소 루트에서 `python3 slack-cloud/build.py`를 실행합니다. Firebase 클라이언트 소스를 수정했다면 먼저 `cd cloud && npm ci && npm run build`를 실행한 뒤 루트에서 `python3 tools/update-cache.py`를 실행합니다.
3. `wrangler d1 execute pixel-lab-slack-preview --config slack-cloud/wrangler.jsonc --remote --file slack-cloud/schema.sql`, 이어서 `wrangler deploy --config slack-cloud/wrangler.jsonc`를 실행합니다.
4. 새 배포에서 처음 한 번만, 암호학적으로 무작위인 32바이트를 Base64로 인코딩해 Worker 보안 저장소의 `TOKEN_KEY`에 등록합니다. 기존 키를 덮어쓸 경우 저장된 Slack 승인을 열 수 없습니다.
5. `python3 slack-cloud/setup.py`를 실행합니다. 이 컴퓨터에서만 열리는 설정 화면이 새 Slack 앱 생성과 Cloudflare 보안 저장소 등록을 안내합니다. Wrangler 경로를 지정하려면 `WRANGLER` 환경 변수를 사용합니다. Slack 앱의 App Manifest를 `manifest.json`으로 갱신하고 Event Subscriptions에서 Request URL의 **Verified** 표시를 확인합니다.
6. 코드 수정 후 같은 Worker에 다시 배포합니다. Slack 앱 자격 증명이나 암호화 키를 다시 만들 필요는 없습니다.

서버는 Firebase ID 토큰으로 사용자를 확인하고, Slack 승인을 시작한 계정만 같은 승인을 마무리할 수 있게 합니다. Slack 요청의 서명과 타임스탬프를 확인한 뒤 본문을 제외한 이벤트 정보를 큐에 저장합니다. 채널 참여 여부와 개인 DM 상대를 Slack에 확인하고, 중복 이벤트는 알림 한 건으로 처리합니다. 승인한 사용자 토큰은 기밀 저장소의 키로 암호화해 보관합니다.
