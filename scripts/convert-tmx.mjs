// Resolves external tileset references (TSJ/TSX) in map.tmj and writes an
// inline Phaser-ready JSON to map-tiled.json in the same tileset directory.
// Run: node scripts/convert-tmx.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TILESET_DIR = join(__dirname, '../public/assets/Exploration/tileset');

function parseTsxAttr(str, name) {
    const m = str.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : '';
}

function parseTileset(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const content = readFileSync(join(TILESET_DIR, filename), 'utf-8');

    if (ext === 'tsj') {
        const ts = JSON.parse(content);
        return {
            name: ts.name,
            tilewidth: ts.tilewidth,
            tileheight: ts.tileheight,
            tilecount: ts.tilecount,
            columns: ts.columns,
            image: ts.image,
            imagewidth: ts.imagewidth,
            imageheight: ts.imageheight,
            margin: ts.margin ?? 0,
            spacing: ts.spacing ?? 0,
            ...(ts.transparentcolor ? { transparentcolor: ts.transparentcolor } : {}),
        };
    }

    // TSX (XML fallback)
    const tilesetTag = content.match(/<tileset[^>]+>/)[0];
    const imageTag = content.match(/<image[^>]+>/)?.[0] ?? '';
    const image = parseTsxAttr(imageTag, 'source').replace(/^\.\.\//, '');
    const trans = parseTsxAttr(imageTag, 'trans');
    return {
        name: parseTsxAttr(tilesetTag, 'name'),
        tilewidth: parseInt(parseTsxAttr(tilesetTag, 'tilewidth'), 10),
        tileheight: parseInt(parseTsxAttr(tilesetTag, 'tileheight'), 10),
        tilecount: parseInt(parseTsxAttr(tilesetTag, 'tilecount'), 10),
        columns: parseInt(parseTsxAttr(tilesetTag, 'columns'), 10),
        image,
        imagewidth: parseInt(parseTsxAttr(imageTag, 'width'), 10),
        imageheight: parseInt(parseTsxAttr(imageTag, 'height'), 10),
        margin: 0,
        spacing: 0,
        ...(trans ? { transparentcolor: '#' + trans } : {}),
    };
}

const tmj = JSON.parse(readFileSync(join(TILESET_DIR, 'map.tmj'), 'utf-8'));

const tilesets = tmj.tilesets.map(({ firstgid, source }) => ({ firstgid, ...parseTileset(source) }));

const mapJson = { ...tmj, tilesets };

const outPath = join(TILESET_DIR, 'map-tiled.json');
writeFileSync(outPath, JSON.stringify(mapJson));
console.log(`Written: ${outPath}`);
console.log(`Map: ${tmj.width}x${tmj.height} tiles, ${tmj.layers.length} layers, ${tilesets.length} tilesets`);
tilesets.forEach(ts => console.log(`  tileset "${ts.name}" firstgid=${ts.firstgid} image=${ts.image}`));
