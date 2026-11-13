#!/bin/bash
# Builds the game from the parts in src/ (joined in number order into one page).
#   index.html        the public page for GitHub Pages: the game plus relay/relay.html, which carries multiplayer outside Claude
#   dist/claude.html  the same game without the relay, for publishing as a Claude artifact (multiplayer there is Claude's own shared room)
# PROTO names the multiplayer wire format: change it whenever what players send each other changes, so old tabs and new ones never mix.
cd "$(dirname "$0")"
PROTO=${PROTO:-v7}
BUILD=${BUILD:-"build $(date -u '+%d %b %H:%M') UTC"}
mkdir -p dist
{ cat src/00-head.html; for f in $(ls src/*.js | sort -V); do cat "$f"; echo; done; cat src/99-tail.html; } > dist/claude.html
PROTO="$PROTO" BUILD="$BUILD" python3 - <<'PY'
import os
page = open('dist/claude.html').read()
relay = open('relay/relay.html').read().replace('@PROTO@', os.environ['PROTO']).replace('@BUILD@', os.environ['BUILD'])
three = '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n'
assert page.count(three) == 1
page = page.replace(three, three + relay)
claude_note = 'On Claude, multiplayer reaches signed-in people this page has been shared with.'
assert page.count(claude_note) == 1
page = page.replace(claude_note, 'Multiplayer runs through a free public relay: everyone on the plain link shares one public room, and Make a private room gives you a link for just your group.')
open('index.html', 'w').write(page)
PY
wc -c index.html dist/claude.html
