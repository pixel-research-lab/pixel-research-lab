"""Refresh the service worker after changing public game assets."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
assets = ['index.html','style.css','data.js','art.js','attendance.js','reviews.js','app.js','transfer.js','offline.js','app.webmanifest','type.woff2','icon-192.png','icon-512.png','OFL.txt','cloud-account.js','cloud-worker.js','visits.js']
template = (root / 'tools' / 'sw.template').read_text()
digest = hashlib.sha256(template.encode())
for name in assets:
    digest.update(name.encode())
    digest.update((root / name).read_bytes())
(root / 'sw.js').write_text(template.replace('BUILD_HASH',digest.hexdigest()[:16]).replace('ASSET_LIST',json.dumps(assets)))
