"""Once per deployment. Enter the preview Slack app credentials on loopback; send only to Wrangler via stdin."""
import html
import json
import os
import re
import secrets
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlsplit

here = Path(__file__).resolve().parent
manifest = json.loads((here / "manifest.json").read_text())
initial = json.loads(json.dumps(manifest))
del initial["settings"]["event_subscriptions"]
create_url = "https://api.slack.com/apps?new_app=1&manifest_json=" + quote(json.dumps(initial))
key = secrets.token_urlsafe(32)
class Setup(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def send(self, status, body):
        self.send_response(status)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(('<meta charset=utf-8><title>픽셀 연구실 Slack 서버 설정</title><style>body{max-width:640px;margin:5% auto;font:16px/1.6 system-ui}input{width:100%;padding:7px}label{display:block;margin:.6em 0}button{padding:8px}</style>'+body).encode())
    def valid(self):
        return self.headers.get("Host")==address and self.path=="/"+key
    def do_GET(self):
        if not self.valid(): return self.send(404,"")
        fields=[("SLACK_APP_ID","App ID"),("SLACK_CLIENT_ID","Client ID"),("CLIENT_SECRET","Client Secret"),("SIGNING_SECRET","Signing Secret")]
        body='<h1>체험실 Slack 앱 연결</h1><p><a target="_blank" rel="noreferrer" href="'+html.escape(create_url)+'">Slack에서 체험실 앱 만들기 ↗</a>를 눌러 Pixel Research Lab 테스트 워크스페이스를 선택하세요.</p><p>새 앱의 Basic Information에서 네 값을 복사해 넣으세요. 이 컴퓨터에서 체험실의 Cloudflare 보안 저장소로 전송합니다.</p><form method="post" autocomplete="off">'
        for name,label in fields:
            typ='password' if 'SECRET' in name else 'text'
            body+=f'<label>{label}<input required type="{typ}" name="{name}" autocomplete="off"></label>'
        self.send(200,body+'<button>체험실 서버에 연결</button></form>')
    def do_POST(self):
        if not self.valid() or not (self.headers.get('Origin')=='http://'+address or (self.headers.get('Origin')=='null' and self.headers.get('Sec-Fetch-Site')=='same-origin')):return self.send(403,'')
        size=int(self.headers.get('Content-Length','0'))
        if not 0<size<=2048:return self.send(400,'입력값을 확인하세요.')
        values={k:v[0].strip() for k,v in parse_qs(self.rfile.read(size).decode()).items()}
        expected={'SLACK_APP_ID':r'A[A-Z0-9]+','SLACK_CLIENT_ID':r'\d+\.\d+','SIGNING_SECRET':r'[0-9a-fA-F]{32,128}','CLIENT_SECRET':r'[0-9a-fA-F]{32,128}'}
        if set(values)!=set(expected) or not all(re.fullmatch(p,values[k]) for k,p in expected.items()):return self.send(400,'값을 확인한 뒤 뒤로 가기를 누르세요.')
        cmd=[os.environ.get('WRANGLER','wrangler'),'secret','bulk','--config',str(here/'wrangler.jsonc')]
        result=subprocess.run(cmd,input=json.dumps(values),text=True,capture_output=True)
        if result.returncode:return self.send(503,'Cloudflare 업로드를 완료하지 못했어요. 배포 상태를 확인하고 다시 시도하세요.')
        app=values['SLACK_APP_ID']
        self.send(200,'<h1>서버 자격 증명 저장 완료</h1><p>아래 <a href="https://app.slack.com/app-settings/T0CGYVDNL2J/'+app+'/general" target="_blank" rel="noreferrer">Slack 앱 설정 ↗</a>의 App Manifest 메뉴에서 JSON 형식을 선택하고 다음 설정을 붙여 넣어 저장하세요.</p><textarea readonly rows="18" style="width:100%">'+html.escape(json.dumps(manifest,indent=2))+'</textarea><p>저장한 후 체험실 홈의 Slack 연결을 누르세요.</p>')
        self.server.done=True
server=HTTPServer(('127.0.0.1',0),Setup)
address='127.0.0.1:'+str(server.server_port)
url='http://'+address+'/'+key
if '--print-url' in sys.argv:print(url,flush=True)
else:webbrowser.open(url)
while not getattr(server,'done',False):server.handle_request()
server.server_close()
