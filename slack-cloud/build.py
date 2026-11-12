"""Package the isolated, signed-in Slack playtest with the same game entry point."""
from pathlib import Path
import shutil
import re
here=Path(__file__).resolve().parent
root=here.parent
out=here/'public'
out.mkdir(exist_ok=True)
for name in ['assets','src','dist']:
    shutil.copytree(root/name,out/name,dirs_exist_ok=True)
for name in ['app.webmanifest','sw.js']:
    shutil.copy2(root/name,out/name)
page, count = re.subn(
    r'<meta name="pixel-slack-api"[^>]*>',
    '<meta name="pixel-slack-api" content="/api/slack/"><meta name="pixel-local-preview" content="true">',
    (root / 'index.html').read_text()
)
assert count == 1
(out/'index.html').write_text(page)
