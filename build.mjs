// Builds two outputs from src/:
//  1. a single self-contained HTML file (assets embedded) that opens by double-click, and
//  2. a web folder for static hosting (EdgeOne Pages): small index.html, one hashed minified script,
//     separate cacheable assets, with half-size textures that phones load instead of the full ones.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(ROOT, 'assets_raw', 'tex');
const OUT_TEX = path.join(ROOT, 'assets', 'tex');
// outputs go to dist/ by default; set SB_OUT to write them somewhere else
const OUTDIR = process.env.SB_OUT || path.join(ROOT, 'dist');
fs.mkdirSync(OUTDIR, { recursive: true });
const SINGLE = path.join(OUTDIR, 'shantiban-city-3d.html');
const WEB = path.join(OUTDIR, 'web');
fs.mkdirSync(OUT_TEX, { recursive: true });

const TEX = ['leafy_grass', 'asphalt_02', 'red_laterite_soil_stones', 'red_brick_03', 'painted_plaster_wall',
  'concrete_floor_02', 'concrete_pavers', 'bark_brown_02', 'brown_mud_02', 'plastered_wall_02'];
const MODELS = ['Cow', 'Bull', 'ShibaInu', 'Stork', 'Parrot'];

/* textures: full (1024) and small (512, used by phones and the Light tier) */
const assets = []; // [id, file path, published name]
for (const t of TEX) {
  for (const [suffix, src, q] of [['d', `${t}_diff_1k.jpg`, 82], ['n', `${t}_nor_gl_1k.jpg`, 86]]) {
    for (const [size, tag] of [[1024, ''], [512, '_s']]) {
      const out = path.join(OUT_TEX, `${t}_${suffix}${tag}.webp`);
      if (!fs.existsSync(out)) await sharp(path.join(RAW, src)).resize(size, size).webp({ quality: tag ? q - 4 : q }).toFile(out);
      assets.push([`tex_${t}_${suffix}${tag}`, out, `tex/${t}_${suffix}${tag}.webp`]);
    }
  }
}
for (const m of MODELS) assets.push([`mdl_${m}`, path.join(ROOT, 'assets', `${m}.glb`), `${m}.glb`]);
assets.push(['img_logo', path.join(ROOT, 'assets', 'logo.webp'), 'logo.webp']);

/* one bundled, minified script (three.js included, no CDN needed) */
const parts = fs.readdirSync(path.join(ROOT, 'src')).filter(f => /^\d\d_.*\.js$/.test(f)).sort();
fs.mkdirSync(path.join(ROOT, '.build'), { recursive: true });
const entry = path.join(ROOT, '.build', 'entry.js');
fs.writeFileSync(entry, parts.map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n'));
const res = await esbuild.build({
  entryPoints: [entry], bundle: true, minify: true, format: 'esm', target: 'es2022', write: false,
  absWorkingDir: ROOT, nodePaths: [path.join(ROOT, 'node_modules')], legalComments: 'none'
});
const js = res.outputFiles[0].text;
const tpl = fs.readFileSync(path.join(ROOT, 'src', 'template.html'), 'utf8');
const mb = n => (n / 1024 / 1024).toFixed(2) + ' MB';

/* 1. single file: embed the full-size textures and models */
const embed = assets.filter(([id]) => !id.endsWith('_s'));
const tags = embed.map(([id, file]) => `<script type="application/octet-stream" id="a-${id}">${fs.readFileSync(file).toString('base64')}</script>`).join('\n');
const inlineJs = js.replace(/<\/script/gi, '<\\/script');
const single = tpl.replace('{{ASSETS}}', () => tags).replace('{{SCRIPT}}', () => `<script type="module">\n${inlineJs}\n</script>`);
fs.writeFileSync(SINGLE, single);
console.log('single file', mb(single.length), SINGLE);

/* 2. web folder */
fs.rmSync(WEB, { recursive: true, force: true });
fs.mkdirSync(path.join(WEB, 'assets', 'tex'), { recursive: true });
const urls = {};
let total = 0;
for (const [id, file, name] of assets) {
  const buf = fs.readFileSync(file), h = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 8);
  const pub = name.replace(/(\.\w+)$/, `.${h}$1`);
  fs.writeFileSync(path.join(WEB, 'assets', pub), buf);
  urls[id] = `assets/${pub}`;total += buf.length;
}
const jh = crypto.createHash('sha1').update(js).digest('hex').slice(0, 8);
fs.writeFileSync(path.join(WEB, `app.${jh}.js`), js);
const web = tpl.replace('{{ASSETS}}', () => `<script>window.__ASSET_URLS=${JSON.stringify(urls)};</script>`)
  .replace('{{SCRIPT}}', () => `<link rel="modulepreload" href="app.${jh}.js"><script type="module" src="app.${jh}.js"></script>`);
fs.writeFileSync(path.join(WEB, 'index.html'), web);
fs.writeFileSync(path.join(WEB, 'edgeone.json'), JSON.stringify({
  headers: [
    { source: '/assets/*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/app.*.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/index.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }
  ]
}, null, 2));
const small = assets.filter(([id]) => id.endsWith('_s') || id.startsWith('mdl_')).reduce((s, [, f]) => s + fs.statSync(f).size, 0);
const big = assets.filter(([id]) => !id.endsWith('_s')).reduce((s, [, f]) => s + fs.statSync(f).size, 0);
console.log('web folder', WEB, '| script', mb(js.length), '| phone download', mb(small + js.length), '| desktop download', mb(big + js.length));
