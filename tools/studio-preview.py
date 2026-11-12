"""Build an offline, guest-only copy of the workshop for playtesting."""
import argparse
import base64
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path)
args = parser.parse_args()

def data_url(path, mime):
    return "data:" + mime + ";base64," + base64.b64encode(path.read_bytes()).decode("ascii")

images = {p.relative_to(root).as_posix(): data_url(p, "image/png")
          for p in (root / "assets/images").rglob("*.png")}
page = (root / "index.html").read_text()
def css(match):
    style = (root / match[1]).read_text().replace("../fonts/type.woff2",
        data_url(root / "assets/fonts/type.woff2", "font/woff2"))
    return "<style>" + style + "</style>"

def script(match):
    path = match[1]
    if path in ("src/visits.js", "src/offline.js"):
        return ""
    if path == "dist/cloud-account.js":
        return "<script>"+(root/"tools/companion-sample.js").read_text()+"\nwindow.pixelAccount={uid:null,init:startPlaytest};</script>"
    source = (root / path).read_text()
    if path == "src/studio.js":
        assert "const previewCredit = 0;" in source
        source = source.replace("const previewCredit = 0;", "const previewCredit = 2000;")
    if path == "src/app.js":
        source = source.replace("pixel-vla-lab.v1", "pixel-workspace-preview.v1")
        source = source.replace("src=\"./assets/images/'+group+'/'+id+'.png", "src=\"'+previewImages['assets/images/'+group+'/'+id+'.png']+'")
    if path == "src/art.js":
        source = source.replace("'./assets/images/items/' + id + '.png'", "previewImages['assets/images/items/'+id+'.png']")
    return "<script>" + source.replace("</script>", "<\\/script>") + "</script>"

page = re.sub(r'<link rel="stylesheet" href="\./([^"]+)">', css, page)
page = re.sub(r'<link rel="manifest"[^>]+>', "", page)
page = re.sub(r'(?:src|href)="\./(assets/images/[^"]+)"', lambda m: m[0].split("=")[0]+'="'+images[m[1]]+'"', page)
page = page.replace('<body>', '<body><script>const previewImages='+json.dumps(images)+'</script>')
page = page.replace('id="account-open" class="account-open" data-do="account">로그인', 'id="account-open" class="account-open" disabled>게스트 체험')
page = re.sub(r'<script src="\./([^"]+)"></script>', script, page)
page = page.replace("<title>픽셀 연구실 · 나의 연구실</title>","<title>픽셀 연구실 · 가구 배치 체험실</title>")
args.output.write_text(page)
