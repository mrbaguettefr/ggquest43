// Builds public/assets/tileset.png (8x8 spritesheet) and public/assets/map.json
// Run once: node scripts/build-tilemap.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const TILE_SRC = path.join(
    process.env.HOME,
    'Downloads/05/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles'
);
const OUT_DIR = path.join(__dirname, '../public/assets');

const TILE_SIZE = 32;
const COLS_IN_SHEET = 8;
const TILE_COUNT = 64; // FieldsTile_01 .. FieldsTile_64
const SHEET_W = COLS_IN_SHEET * TILE_SIZE;      // 256
const SHEET_H = (TILE_COUNT / COLS_IN_SHEET) * TILE_SIZE; // 256

const MAP_COLS = 66;
const MAP_ROWS = 29;

// Seeded LCG so the map is deterministic
let seed = 42317;
function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
}
function pick(pool) {
    return pool[Math.floor(rand() * pool.length)];
}

// Tile GID pools per zone (1-indexed: GID 1 = FieldsTile_01.png)
// Observed gradient: 1-10 clean cobblestone, 11-20 mossy, 21-35 green/grassy,
// 36-48 heavy green→stone, 49-64 stone returning.
const POOLS = {
    hub:        [1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 7],
    hubToPlain: [8, 9, 10, 12, 14],
    plains:     [22, 23, 24, 25, 26, 27, 28, 29, 30],
    plainToMtn: [33, 35, 37, 38, 40],
    mountains:  [40, 41, 42, 43, 44, 46, 48],
    mtnToDng:   [48, 50, 51, 52, 53],
    dungeon:    [53, 54, 55, 56, 57, 58, 59, 60, 62, 64],
};

function poolForCol(col) {
    if (col < 23) return POOLS.hub;
    if (col < 26) return POOLS.hubToPlain;
    if (col < 36) return POOLS.plains;       // plains gate ~col 27
    if (col < 41) return POOLS.plainToMtn;
    if (col < 50) return POOLS.mountains;    // mountains gate ~col 43
    if (col < 54) return POOLS.mtnToDng;
    return POOLS.dungeon;                    // dungeon gate ~col 58
}

async function buildSpritesheet() {
    const canvas = createCanvas(SHEET_W, SHEET_H);
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < TILE_COUNT; i++) {
        const num = String(i + 1).padStart(2, '0');
        const file = path.join(TILE_SRC, `FieldsTile_${num}.png`);
        const img = await loadImage(file);
        const col = i % COLS_IN_SHEET;
        const row = Math.floor(i / COLS_IN_SHEET);
        ctx.drawImage(img, col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(OUT_DIR, 'tileset.png'), buf);
    console.log(`tileset.png written (${SHEET_W}x${SHEET_H})`);
}

function buildMapJSON() {
    const data = [];
    for (let row = 0; row < MAP_ROWS; row++) {
        for (let col = 0; col < MAP_COLS; col++) {
            data.push(pick(poolForCol(col)));
        }
    }

    const map = {
        compressionlevel: -1,
        height: MAP_ROWS,
        infinite: false,
        layers: [{
            data,
            height: MAP_ROWS,
            id: 1,
            name: 'Ground',
            opacity: 1,
            type: 'tilelayer',
            visible: true,
            width: MAP_COLS,
            x: 0,
            y: 0,
        }],
        nextlayerid: 2,
        nextobjectid: 1,
        orientation: 'orthogonal',
        renderorder: 'right-down',
        tiledversion: '1.10.0',
        tileheight: TILE_SIZE,
        tilesets: [{
            columns: COLS_IN_SHEET,
            firstgid: 1,
            image: 'tileset.png',
            imageheight: SHEET_H,
            imagewidth: SHEET_W,
            margin: 0,
            name: 'tileset',
            spacing: 0,
            tilecount: TILE_COUNT,
            tileheight: TILE_SIZE,
            tilewidth: TILE_SIZE,
        }],
        tilewidth: TILE_SIZE,
        type: 'map',
        version: '1.10',
    };

    fs.writeFileSync(path.join(OUT_DIR, 'map.json'), JSON.stringify(map));
    console.log(`map.json written (${MAP_COLS}x${MAP_ROWS} = ${data.length} tiles)`);
}

(async () => {
    await buildSpritesheet();
    buildMapJSON();
})();
