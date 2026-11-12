#!/bin/bash
# Build, then make sure every script in both pages at least parses.
cd "$(dirname "$0")"; ./build.sh >/dev/null || exit 1
python3 - <<'PY'
import re
for name in ('dist/claude.html', 'index.html'):
    s = open(name).read()
    for i, m in enumerate(re.finditer(r'<script>\n(.*?)</script>', s, re.S)):
        open('/tmp/chk-%s-%d.js' % (name.replace('/', '_'), i), 'w').write(m.group(1))
PY
ok=1; for f in /tmp/chk-*.js; do node --check "$f" || ok=0; done; rm -f /tmp/chk-*.js
[ $ok = 1 ] && echo SYNTAX_OK
