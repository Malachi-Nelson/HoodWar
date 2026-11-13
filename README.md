# HoodWar — Port Calder Open World

An open-world crew game that runs in the browser. One lake-port city, no rounds and no clock: take any car, take neighbourhoods for your crew and live off what they pay, hit the jobs that turn up around town, and stay ahead of the police and the other crews. Play alone or online with friends; bots are everyone else. Your cash, guns and turf are saved as you play.

## The city

- **Four crews, ten neighbourhoods.** Ember Row (west side), Tidewater (dock side), Northgate (north side) and Steelyard (south side) each have a yard, cars in their colour and two neighbourhoods to start with. Every street in the city belongs to one of the ten neighbourhoods (A to J along the top of the screen); the mall and the park belong to nobody at the start.
- **Holding turf.** Each neighbourhood has a hold meter. Hurting the crew that owns it wears its hold down: shooting its people, robbing its shops, wrecking its cars, taking out its lieutenants. The weaker the hold, the faster you take the neighbourhood by standing in its ring. A neighbourhood you have just taken starts at half hold and firms up while things are quiet. Every in-game hour (100 seconds) each of your crew's neighbourhoods pays out, and pays more the firmer your hold. Rival crews keep their own street crews on their corners, raid other crews' turf and start hood wars on yours.
- **Notoriety.** Hurt a crew and it marks you, one to five skulls beside your cash. From two skulls it sends cars of hitters after you. Stay out of its sight and it lets it go; dying clears it, along with police heat.
- **Jobs around town.** Two or three at a time, listed on screen with distance and time left: an armoured truck to shoot to a stop and empty, a hit on a rival lieutenant, a hood war to defend, a car to steal for the chop shop, a stash to carry back to your yard, and a street race.
- **People with somewhere to be.** Pedestrians walk between places and stop there: benches, shop windows, food carts, market stalls, ball courts, bus stops, a speaker someone has left playing. Vendors and clerks keep their stalls and counters, workers carry crates across the docks and the foundry yard, and officers walk a beat. Gunfire scatters them; a gun pointed at a clerk gets hands in the air.
- **The rest of it.** Day and night, fewer people about late at night, pigeons that take off when you run through them, gulls over the lake, steam from manholes, smoke from the foundry stack, ships and boats on the water, a plane overhead, the ball going up on the courts, short lines from the people you pass, crowd noise, birds by day and crickets at night.

**Play:** https://malachi-nelson.github.io/HoodWar/

Plays with a keyboard and mouse, or on a phone or tablet held sideways. The controls are listed on the menu.

## Touch screens

On a touch screen the game shows on-screen controls: a stick for the left thumb (push it all the way to sprint), drag anywhere on the right to look, and buttons that change between on foot and in a car. While you fire or aim, aim help eases the view toward a hostile near the crosshair. **Move buttons** (on the menu or the pause screen) lets you drag any button somewhere else and change its size and see-through level, separately for on foot and in a car. Look speed, aim help and a fixed or floating stick are on the same row. The layout is kept in the browser.

## Saving

Cash, guns, grenades, armour, your crew and your crew's turf are saved in the browser as you play. Your turf keeps paying while you are away: an hour of income for every real hour, for up to eight hours.

**Copy save code** on the menu gives you a code to paste into **Load save code** on another phone or computer. On the Claude page the save is also kept with your Claude account, so it is there wherever you open the page signed in.

## Online co-op

1. Everyone opens the page. The line under the lobby buttons should turn green and say "Online · public room".
2. Type a name. One player clicks **Open lobby**; everyone else clicks **Join lobby**, then **Ready up**.
3. The lobby leader clicks **Start session**. Anyone who turns up later clicks **Join session** and drops in where it stands.

Everyone on the plain link shares one public room. **Make a private room** gives you a link with a code for just your group.

Everyone in a session plays on the leader's crew, and players cannot hurt each other. The leader's browser runs the city (bots, traffic, turf, jobs, police), so the session starts from the leader's saved turf, and when the leader leaves, the session closes for everyone. Each player keeps their own cash and guns; turf income and job rewards are paid to everyone in the session.

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

If a change alters what players send each other, build with a new `PROTO` (the default is `v3`; for example `PROTO=v4 ./build.sh`) and change the room name in `NET.connect` (`src/110-net.js`), so that old tabs and new ones do not end up in the same room.
