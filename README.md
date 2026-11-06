# Shantiban City – 3D Walkthrough

A realistic, browser-based 3D walkthrough of **Shantiban City**, a residential plot development by
MRITYIKA REALTERS OPC PRIVATE LIMITED in Tapna, Baruipur (South 24 Parganas, West Bengal).
It runs in any modern browser on desktop and phone, with no app or plugin to install.

**Live site:** https://walkthrough.mrityikaestates.com (Hostinger), mirrored at
https://shantiban-city-3d.edgeone.cool (EdgeOne Makers).

Built with [three.js](https://threejs.org/) r160 and bundled by esbuild into a single static site.

---

## What's in it

**The site**
- **The real site outline:** the boundary is traced from the master plan
  (`reference/master-plan.png`) and keeps its irregular shape. The plan is scaled so that it holds
  exactly 220 plots; preview the layout with `node tools/plan-preview.mjs`.
- **220 plots of 2.5 katha** (36′ × 50′, 1,800 sq ft), numbered 1–220 across Blocks A–E. Each plot
  carries its number painted on the ground, a signboard and corner pillars. The build fails if the
  numbering isn't exactly 1–220 with no gaps or repeats.
- **Roads:** 23 ft main roads and 13 ft bylanes, with street lights.
- **Gates:** the main gate on the Baruipur–Amtala road and an east gate, each with a security cabin,
  boom barrier and the logo on the gate sign; small exit gates where other main roads meet the wall.
- **Inside the gate:** a community hall, a gym, shops for daily needs, a park with a cricket ground,
  a children's garden with a walking track, gazebo and play corner, and a garden with the
  electricity transformer.
- **Nearby places** at the approximate distances given in the project information: market (about
  500 m), school and bus terminus (about 1.5 km each), hospital (about 2 km) and Koyal More (about
  1.5 km). Farther places (Baruipur, Garia and Joka Metro, Kolkata and others) are listed on a
  distances board by the gate.
- **West Bengal-style buildings for those places:** a blue-and-white government district hospital,
  a three-storey school around a courtyard, and a bazaar with a row of old shopfronts and
  tin-roofed vegetable sheds. Their walls are photorealistic facade images generated for this
  project on Google Flow (prompts in `reference/amenity-prompts.md`, generated with no lettering so no
  real names appear), wrapped onto 3D masses with roofs, parapets, porches and rooftop water tanks.
- **Surroundings:** a dense procedural town of thousands of homes, with paddy fields, ponds,
  coconut, areca, banana and mango trees, cattle, stray dogs and birds.

**Realism**
- **Sky:** a physically based atmosphere with raymarched, drifting volumetric clouds, and a sun
  placed for Tapna's real latitude, longitude and date.
- **Lighting:** dawn-to-night lighting with lit windows. Street-lamp light comes from a
  pre-painted light map, so the street lamps cost almost nothing to draw.
- **Wind:** grass blades, leaves and palm fronds sway in shared gusts, and their shadows move with them.
- **Materials:** photo-scanned CC0 textures for roads, brick, plaster, concrete and soil.

**Using it**
- **Modes:** Walk, Fly, Plan (top-down), Guided walk and an 86-second captioned Drone film.
- **Plot details:** tap a plot on a phone, or hover and click with a mouse, to see its number,
  size, block and facing. From the same card you can preview a sample home fitted to that plot.
- **Map:** a two-view map (Site and Area) with your position and the nearby places; click a place
  to go there. The map can be minimised.
- **Smooth playback:** every shader is built during loading (a hidden warm-up render beside each
  nearby place), so flying around never stalls on a first view.
- **Quality tiers:** Phone, Light, Balanced and High. Phones are detected automatically and
  download about 3 MB; desktops download about 7.7 MB. Drawing is capped at 30 fps by default and
  pauses in background tabs.
- **Safe mode:** if the browser is drawing without the graphics card, the page pauses with
  instructions instead of freezing the computer.

**Park cricket**
- A two-over, three-wicket street-cricket game on the park lawn. Open it
  with **Play cricket in the park** (on the start screen, in the Nearby panel, or as a button when
  you walk into the park).
- Modes: bat against Bablu, bowl at Bablu, or two players on one keyboard or phone.
- Batting: timing decides the shot (early goes leg side, late goes off side; perfect, early, late,
  edged), with aim and loft, running between the wickets, and run-outs.
- Bowling: aim the target, choose pace, medium, slower ball, off spin or leg spin, then lock the
  run-up meter in the green. The AI batter reads line, length, speed and spin.
- Fielders work out where they can intercept the ball, take catches (and sometimes drop them),
  misfield, and throw to the right end.
- Park rules: past the rope is 4 along the grass or 6 in the air; over the hedge on the full is out;
  a catch off a tree is still out. Trees and benches are solid, so the ball bounces off them.
- Three camera views, time of day, floodlights at night, sound, pixel mode, pause, and a
  win/loss record saved in the browser. Phones get a thumb stick and a big action button in landscape.
- The game logic (`src/10_cricket.js`) follows
  [MuhammadaliMS/galli-cricket](https://github.com/MuhammadaliMS/galli-cricket): the delivery
  and shot maths, AI batter, fielding and match flow, adapted to the park ground.

> The plot layout is illustrative. Please confirm the final plot sizes and positions with the
> project office. Buildings outside the boundary are illustrative, and all distances are approximate.

---

## Project structure

```
src/
  template.html       page shell, HUD, styles
  00_core.js          renderer, quality tiers, asset loading, materials, sign drawing
  01_sky.js           atmosphere, volumetric clouds, sun position, time of day
  02_siteplan.js      the site outline, roads and 220-plot layout fitted to the master plan
  02_layout.js        facilities, gates, outer roads, nearby places and the procedural town
  03_ground.js        land-use ground shader, roads, drains, street lights, lamp light map
  04_site.js          plots, numbers, boundary wall, gates, park, hall, gym, shops, transformer
  05_vegetation.js    trees, palms, banana plants, hay, wind-blown grass
  06_town.js          town buildings, ponds, market, school, hospital, bus terminus, Koyal More
  07_life.js          cattle, dogs and birds
  08_villa.js         the sample rooftop-terrace home that can be placed on any plot
  09_ui.js            player and camera modes, plot cards, map, input, render loop
  10_cricket.js       the park cricket game (field, players, physics, AI, fielding, HUD)
assets/               optimised models (.glb), textures (.webp) and the logo
build.mjs             bundles src/ and writes both outputs to dist/
serve.mjs             minimal static server for testing the web build locally
tools/plan-preview.mjs  draws the computed site plan to reference/plan-preview.png
reference/            the master plan the layout is traced from
```

The numbered files in `src/` are joined in order into one ES module and then bundled with three.js.

---

## Build and run

Requires **Node.js 18 or newer**.

```bash
npm install
npm run build      # writes dist/web/ and dist/shantiban-city-3d.html
npm run serve      # serves dist/web at http://localhost:8091/
```

`npm run build` produces two outputs:

| Output | Use |
|---|---|
| `dist/web/` | The site for static hosting: a small `index.html`, one hashed and minified script, hashed assets, plus cache headers for EdgeOne (`edgeone.json`) and Apache/LiteSpeed hosts such as Hostinger (`.htaccess`). Phones load half-size textures. |
| `dist/shantiban-city-3d.html` | One self-contained file, about 10 MB, with every asset embedded. Opens by double-clicking, with no server needed. |

`dist/web/` must be served over HTTP; opening its `index.html` straight from disk won't load the
assets. To write the outputs somewhere other than `dist/`, set `SB_OUT=<folder>` before building.

---

## Deploy

**Hostinger** (walkthrough.mrityikaestates.com): it's a plain PHP/HTML website. Run `npm run build`,
then upload the contents of `dist/web/` (including `.htaccess`) into the site's `public_html`.

**EdgeOne Makers** (project `shantiban-city-3d`), with the
[edgeone CLI](https://www.npmjs.com/package/edgeone) installed and signed in:

```bash
npm run build
npm run deploy     # runs: cd dist/web && edgeone makers deploy -n shantiban-city-3d
```

Any other static host works too: upload the contents of `dist/web/`.

---

## Credits and licences

| Asset | Source | Licence |
|---|---|---|
| Ground, road, brick, plaster, concrete, paver, bark and mud textures | [Poly Haven](https://polyhaven.com/) | CC0 |
| Cow, bull and dog models | Quaternius animal pack, via [benjaminpjones/catch-the-animal](https://github.com/benjaminpjones/catch-the-animal) | CC0 (Quaternius) |
| Stork and parrot models | [three.js examples](https://github.com/mrdoob/three.js/tree/r160/examples/models/gltf) | from the MIT-licensed three.js repository |
| three.js | [mrdoob/three.js](https://github.com/mrdoob/three.js) | MIT |
| Park cricket game logic | adapted from [MuhammadaliMS/galli-cricket](https://github.com/MuhammadaliMS/galli-cricket) | no licence published in that repository |
| Hospital, school and market facade images | generated for this project with Google Flow (Nano Banana Pro) | AI-generated imagery |
| Anek Bangla font | [Google Fonts](https://fonts.google.com/specimen/Anek+Bangla) | SIL Open Font License |

The Shantiban City name and logo belong to MRITYIKA REALTERS OPC PRIVATE LIMITED and aren't
covered by any open licence. No licence has been chosen yet for the code in this repository.
