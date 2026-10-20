"""Build only the public app assets; inject a website-restricted browser key."""
import os
from pathlib import Path
import re
import shutil

root = Path(__file__).resolve().parent.parent
output = root / '_site'
if output.exists():
    shutil.rmtree(output)
output.mkdir()
for name in ['index.html', 'sw.js', 'manifest.webmanifest', 'icon.svg']:
    shutil.copy2(root / name, output / name)
(output / '.nojekyll').touch()
key = os.environ.get('GOOGLE_MAPS_API_KEY', '').strip()
if key:
    if not re.fullmatch(r'AIza[\w-]{35}', key):
        raise SystemExit('Invalid Google Maps browser key format')
    (output / 'goog-map-api-key').write_text(key + '\n')
print('Public site built' + (' with browser map configuration' if key else ' without map configuration'))
