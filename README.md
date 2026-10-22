# Shantiban City – 3D Walkthrough

A realistic, browser-based 3D walkthrough of **Shantiban City**, a residential plot development by
MRITYIKA REALTERS OPC PRIVATE LIMITED in Tapna, Baruipur (South 24 Parganas, West Bengal).
It runs in any modern browser on desktop and phone, with no app or plugin to install.

**Live site:** https://shantiban-city-3d.edgeone.cool

Built with [three.js](https://threejs.org/) r160 and bundled by esbuild into a single static site.
It's hosted on [EdgeOne Makers](https://edgeone.ai/).

---

## What's in it

**The site**
- **220 plots**, numbered 1–220 in five blocks of 44: A 1–44, B 45–88, C 89–132, D 133–176, E 177–220.
  Each plot is 36′ × 40′ (about 2 katha) and carries its number painted on the ground, a signboard
  and corner pillars. The build fails if the numbering isn't exactly 1–220 with no gaps or repeats.
- **Inside the gate:** a gated entrance with security cabins, a boom barrier and the logo on the
  gate sign; a 30 ft central boulevard; 20–25 ft internal roads with covered concrete drains,
  street lights and electric lines; a park with a walking track, gazebo and children's corner; a
  community hall, six shops and an electricity transformer.
- **Nearby places** at the approximate distances given in the project information: market (about
  500 m), school and bus terminus (about 1.5 km each), hospital (about 2 km) and Koyal More (about
  1.5 km). Farther places (Baruipur, Garia and Joka Metro, Kolkata and others) are listed on a
  distances board by the gate.
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
- **Quality tiers:** Phone, Light, Balanced and High. Phones are detected automatically and
  download about 3 MB; desktops download about 7.7 MB. Drawing is capped at 30 fps by default and
  pauses in background tabs.
- **Safe mode:** if the browser is drawing without the graphics card, the page pauses with
  instructions instead of freezing the computer.

> The plot layout is illustrative. Please confirm the final plot sizes and positions with the
> project office. Buildings outside the boundary are illustrative, and all distances are approximate.

---

## Project structure

```
src/
  template.html       page shell, HUD, styles
  00_core.js          renderer, quality tiers, asset loading, materials, sign drawing
  01_sky.js           atmosphere, volumetric clouds, sun position, time of day
  02_layout.js        the 220-plot layout and the procedural town
  03_ground.js        land-use ground shader, roads, drains, street lights, lamp light map
  04_site.js          plots, numbers, boundary wall, gate, park, hall, shops, transformer
  05_vegetation.js    trees, palms, banana plants, hay, wind-blown grass
  06_town.js          town buildings, ponds, market, school, hospital, bus terminus, Koyal More
  07_life.js          cattle, dogs and birds
  08_villa.js         the sample rooftop-terrace home that can be placed on any plot
  09_ui.js            player and camera modes, plot cards, map, input, render loop
assets/               optimised models (.glb), textures (.webp) and the logo
build.mjs             bundles src/ and writes both outputs to dist/
serve.mjs             minimal static server for testing the web build locally
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
| `dist/web/` | The site for static hosting: a small `index.html`, one hashed and minified script, hashed assets and `edgeone.json` cache headers. Phones load half-size textures. |
| `dist/shantiban-city-3d.html` | One self-contained file, about 10 MB, with every asset embedded. Opens by double-clicking, with no server needed. |

`dist/web/` must be served over HTTP; opening its `index.html` straight from disk won't load the
assets. To write the outputs somewhere other than `dist/`, set `SB_OUT=<folder>` before building.

---

## Deploy

The live site is the EdgeOne Makers project `shantiban-city-3d`. With the
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
| Anek Bangla font | [Google Fonts](https://fonts.google.com/specimen/Anek+Bangla) | SIL Open Font License |

The Shantiban City name and logo belong to MRITYIKA REALTERS OPC PRIVATE LIMITED and aren't
covered by any open licence. No licence has been chosen yet for the code in this repository.
