# HoodWar — Port Calder Open World

An open-world crew game that runs in the browser. One lake-port city, no rounds and no clock: take any car, hold turf for your crew, rob a till, and stay ahead of the police. Play alone or online with friends; bots are everyone else.

**Play:** https://malachi-nelson.github.io/HoodWar/

Needs a keyboard and mouse. The controls are listed on the menu.

## Online co-op

1. Everyone opens the page. The line under the lobby buttons should turn green and say "Online · public room".
2. Type a name. One player clicks **Open lobby**; everyone else clicks **Join lobby**, then **Ready up**.
3. The lobby leader clicks **Start session**. Anyone who turns up later clicks **Join session** and drops in where it stands.

Everyone on the plain link shares one public room. **Make a private room** gives you a link with a code for just your group.

Everyone in a session plays on the leader's crew, and players cannot hurt each other. The leader's browser runs the city (bots, traffic, turf, police), so when the leader leaves, the session closes for everyone. Cash and guns are kept in each player's browser.

Each player's browser posts its state to a free public MQTT relay, which passes it to the others in the room. There is no game server and nothing connects browser to browser.

## What is in the repository

| Path | What it is |
| --- | --- |
| `index.html` | The whole game, built into one page. This is what GitHub Pages serves. |
| `src/` | The game in parts, joined in number order by `./build.sh`. Edit these, not `index.html`. |
| `relay/relay.html` | Online play for the public page: the relay connection and the room link under the lobby. |
| `mqtt.min.js` | MQTT.js 4.3.7 (MIT licence), used by the relay. |
| `build.sh`, `check.sh` | Build the page; build and syntax-check it. |
| `test/` | Headless browser checks. They need Playwright, Chrome and `npm install`. |

three.js r128 (MIT licence) is loaded from cdnjs.

`./build.sh` also writes `dist/claude.html`, the same game without the relay, for publishing as a Claude artifact, where multiplayer uses Claude's own shared room instead.

If a change alters what players send each other, build with a new `PROTO` (for example `PROTO=v2 ./build.sh`) so that old tabs and new ones do not end up in the same room.
