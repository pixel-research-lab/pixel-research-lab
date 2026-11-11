"""Refresh the service worker after changing public game assets."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
assets = ['index.html', 'app.webmanifest']
for folder in ('src', 'assets', 'dist'):
    assets.extend(sorted(path.relative_to(root).as_posix()
                         for path in (root / folder).rglob('*')
                         if path.is_file() and not path.name.startswith('.')))
template = (root / 'tools' / 'sw.template').read_text()
digest = hashlib.sha256(template.encode())
for name in assets:
    digest.update(name.encode())
    digest.update((root / name).read_bytes())
(root / 'sw.js').write_text(template.replace('BUILD_HASH',digest.hexdigest()[:16]).replace('ASSET_LIST',json.dumps(assets)))
