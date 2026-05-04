// Extracts Cloud sprite rows from public/assets/cloud.png
// Row 1 (idle, 6 frames)  → public/assets/cloud-idle.png
// Row 2 (walk, 8 frames)  → public/assets/cloud-walk.png
// Run: node scripts/build-cloud-idle.js

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const ANIMS = [
    {
        out: 'cloud-idle.png',
        sy: 47, sh: 53, fw: 34,
        frames: [
            { sx: 67,   sw: 32 },
            { sx: 221,  sw: 33 },
            { sx: 374,  sw: 34 },
            { sx: 530,  sw: 34 },
            { sx: 685,  sw: 34 },
            { sx: 841,  sw: 33 },
        ],
    },
    {
        out: 'cloud-walk.png',
        sy: 201, sh: 53, fw: 44,
        frames: [
            { sx: 59,   sw: 39 },
            { sx: 207,  sw: 44 },
            { sx: 356,  sw: 44 },
            { sx: 505,  sw: 42 },
            { sx: 663,  sw: 43 },
            { sx: 824,  sw: 41 },
            { sx: 984,  sw: 41 },
            { sx: 1134, sw: 41 },
        ],
    },
];

function removeBackground(ctx, W, H) {
    const BLACK_THRESH = 20;
    const imgData = ctx.getImageData(0, 0, W, H);
    const d = imgData.data;
    const idx = (x, y) => (y * W + x) * 4;
    const isBlack = (x, y) => { const i = idx(x, y); return d[i] < BLACK_THRESH && d[i+1] < BLACK_THRESH && d[i+2] < BLACK_THRESH; };
    const visited = new Uint8Array(W * H);
    const queue = [];
    const enqueue = (x, y) => {
        if (x < 0 || x >= W || y < 0 || y >= H || visited[y*W+x] || !isBlack(x, y)) return;
        visited[y*W+x] = 1; queue.push(x, y);
    };
    for (let x = 0; x < W; x++) { enqueue(x, 0); enqueue(x, H-1); }
    for (let y = 0; y < H; y++) { enqueue(0, y); enqueue(W-1, y); }
    while (queue.length > 0) {
        const y = queue.pop(), x = queue.pop();
        d[idx(x, y) + 3] = 0;
        enqueue(x+1, y); enqueue(x-1, y); enqueue(x, y+1); enqueue(x, y-1);
    }
    ctx.putImageData(imgData, 0, 0);
}

(async () => {
    const src = await loadImage(path.join(__dirname, '../public/assets/cloud.png'));
    const srcCanvas = createCanvas(src.width, src.height);
    srcCanvas.getContext('2d').drawImage(src, 0, 0);

    for (const anim of ANIMS) {
        const { out: outFile, sy, sh, fw, frames } = anim;
        const out = createCanvas(fw * frames.length, sh);
        const ctx = out.getContext('2d');

        for (let i = 0; i < frames.length; i++) {
            const { sx, sw } = frames[i];
            const dx = i * fw + Math.round((fw - sw) / 2);
            ctx.drawImage(srcCanvas, sx, sy, sw, sh, dx, 0, sw, sh);
        }

        removeBackground(ctx, out.width, sh);

        const buf = out.toBuffer('image/png');
        fs.writeFileSync(path.join(__dirname, `../public/assets/${outFile}`), buf);
        console.log(`${outFile} written (${out.width}x${sh}, ${frames.length} frames of ${fw}x${sh}, background removed)`);
    }
})();
