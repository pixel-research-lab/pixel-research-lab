"""Package the isolated, signed-in Slack playtest with the same game entry point."""
from pathlib import Path
import shutil
import sys
here=Path(__file__).resolve().parent
root=here.parent
out=here/'public'
out.mkdir(exist_ok=True)
for name in ['assets','src','dist']:
    shutil.copytree(root/name,out/name,dirs_exist_ok=True)
for name in ['app.webmanifest','sw.js']:
    shutil.copy2(root/name,out/name)
page=(root/'index.html').read_text().replace('<head>','<head><meta name="pixel-slack-api" content="/api/slack/"><meta name="pixel-local-preview" content="true">',1)
assert 'name="pixel-slack-api"' in page
(out/'index.html').write_text(page)
