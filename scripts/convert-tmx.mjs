// Resolves external TSX references in map.tmj and writes an inline Phaser-ready
// JSON to map-tiled.json in the same tileset directory.
// Run: node scripts/convert-tmx.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TILESET_DIR = join(__dirname, '../public/assets/tileset');

function getAttr(str, name) {
    const m = str.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : '';
}

function numAttr(str, name) {
    return parseInt(getAttr(str, name), 10) || 0;
}

function parseTsx(filename) {
    const xml = readFileSync(join(TILESET_DIR, filename), 'utf-8');
    const tilesetTag = xml.match(/<tileset[^>]+>/)[0];
    const imageTag = xml.match(/<image[^>]+>/)?.[0] ?? '';

    // TSX source is "../Pixel Art .../TX ....png" relative to tileset dir.
    // Stripping "../" gives the correct path relative to the tileset dir
    // (where the output JSON lives).
    const image = getAttr(imageTag, 'source').replace(/^\.\.\//, '');
    const trans = getAttr(imageTag, 'trans');

    const result = {
        name: getAttr(tilesetTag, 'name'),
        tilewidth: numAttr(tilesetTag, 'tilewidth'),
        tileheight: numAttr(tilesetTag, 'tileheight'),
        tilecount: numAttr(tilesetTag, 'tilecount'),
        columns: numAttr(tilesetTag, 'columns'),
        image,
        imagewidth: numAttr(imageTag, 'width'),
        imageheight: numAttr(imageTag, 'height'),
        margin: 0,
        spacing: 0,
    };

    if (trans) {
        result.transparentcolor = '#' + trans;
    }

    return result;
}

const tmj = JSON.parse(readFileSync(join(TILESET_DIR, 'map.tmj'), 'utf-8'));

const tilesets = tmj.tilesets.map(({ firstgid, source }) => ({ firstgid, ...parseTsx(source) }));

const mapJson = { ...tmj, tilesets };

const outPath = join(TILESET_DIR, 'map-tiled.json');
writeFileSync(outPath, JSON.stringify(mapJson));
console.log(`Written: ${outPath}`);
console.log(`Map: ${tmj.width}x${tmj.height} tiles, ${tmj.layers.length} layers, ${tilesets.length} tilesets`);
tilesets.forEach(ts => console.log(`  tileset "${ts.name}" firstgid=${ts.firstgid} image=${ts.image}`));
