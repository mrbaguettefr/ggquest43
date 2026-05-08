#!/usr/bin/env node

import { access, constants } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const DEFAULT_WHITE_TOLERANCE = 8;
const DEFAULT_ALPHA_THRESHOLD = 0;
const DEFAULT_FLOOD_THRESHOLD = 18;

function printUsage() {
    console.log(`Usage: node scripts/crop-png.mjs <input.png> [options]

Options:
  --output <path>       Write the cropped PNG to a custom path
  --tolerance <0-255>   Treat near-white pixels as empty (default: ${DEFAULT_WHITE_TOLERANCE})
  --alpha <0-255>       Treat pixels at or below this alpha as transparent (default: ${DEFAULT_ALPHA_THRESHOLD})
  --flood-background    Make the connected background from the image edges transparent before cropping
  --flood-threshold <n> Maximum RGB neighbor distance for flood background removal (default: ${DEFAULT_FLOOD_THRESHOLD})
  --help                Show this help message`);
}

function parseByteOption(value, optionName) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
        throw new Error(`${optionName} must be an integer between 0 and 255.`);
    }

    return parsed;
}

function parseArgs(argv) {
    const options = {
        input: '',
        output: '',
        tolerance: DEFAULT_WHITE_TOLERANCE,
        alphaThreshold: DEFAULT_ALPHA_THRESHOLD,
        floodBackground: false,
        floodThreshold: DEFAULT_FLOOD_THRESHOLD,
        help: false
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];

        if (arg === '--help' || arg === '-h') {
            options.help = true;
        } else if (arg === '--output' || arg === '-o') {
            const value = argv[i + 1];

            if (!value) {
                throw new Error(`${arg} requires a path.`);
            }

            options.output = value;
            i += 1;
        } else if (arg === '--tolerance') {
            const value = argv[i + 1];

            if (!value) {
                throw new Error(`${arg} requires a value.`);
            }

            options.tolerance = parseByteOption(value, arg);
            i += 1;
        } else if (arg === '--alpha') {
            const value = argv[i + 1];

            if (!value) {
                throw new Error(`${arg} requires a value.`);
            }

            options.alphaThreshold = parseByteOption(value, arg);
            i += 1;
        } else if (arg === '--flood-background') {
            options.floodBackground = true;
        } else if (arg === '--flood-threshold') {
            const value = argv[i + 1];

            if (!value) {
                throw new Error(`${arg} requires a value.`);
            }

            options.floodThreshold = parseByteOption(value, arg);
            i += 1;
        } else if (arg.startsWith('-')) {
            throw new Error(`Unknown option: ${arg}`);
        } else if (!options.input) {
            options.input = arg;
        } else {
            throw new Error(`Unexpected argument: ${arg}`);
        }
    }

    return options;
}

function getDefaultOutputPath(inputPath) {
    const inputDir = dirname(inputPath);
    const inputExt = extname(inputPath);
    const inputBase = basename(inputPath, inputExt);

    return join(inputDir, `${inputBase}-cropped.png`);
}

function isEmptyBorderPixel(red, green, blue, alpha, tolerance, alphaThreshold) {
    if (alpha <= alphaThreshold) {
        return true;
    }

    return red >= 255 - tolerance && green >= 255 - tolerance && blue >= 255 - tolerance;
}

function findCropBounds(data, width, height, tolerance, alphaThreshold) {
    let left = width;
    let right = -1;
    let top = height;
    let bottom = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const index = (y * width + x) * 4;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const alpha = data[index + 3];

            if (!isEmptyBorderPixel(red, green, blue, alpha, tolerance, alphaThreshold)) {
                left = Math.min(left, x);
                right = Math.max(right, x);
                top = Math.min(top, y);
                bottom = Math.max(bottom, y);
            }
        }
    }

    if (right < left || bottom < top) {
        return null;
    }

    return {
        left,
        top,
        width: right - left + 1,
        height: bottom - top + 1
    };
}

function colorDistance(data, indexA, indexB) {
    const red = data[indexA] - data[indexB];
    const green = data[indexA + 1] - data[indexB + 1];
    const blue = data[indexA + 2] - data[indexB + 2];

    return Math.sqrt(red * red + green * green + blue * blue);
}

function removeFloodBackground(data, width, height, threshold, alphaThreshold) {
    const visited = new Uint8Array(width * height);
    const queue = [];
    let removed = 0;

    const enqueue = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;

        const pixelIndex = y * width + x;
        if (visited[pixelIndex]) return;

        visited[pixelIndex] = 1;
        queue.push(pixelIndex);
    };

    for (let x = 0; x < width; x += 1) {
        enqueue(x, 0);
        enqueue(x, height - 1);
    }

    for (let y = 1; y < height - 1; y += 1) {
        enqueue(0, y);
        enqueue(width - 1, y);
    }

    for (let index = 0; index < queue.length; index += 1) {
        const pixelIndex = queue[index];
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        const dataIndex = pixelIndex * 4;

        data[dataIndex + 3] = 0;
        removed += 1;

        const neighbors = [
            pixelIndex - 1,
            pixelIndex + 1,
            pixelIndex - width,
            pixelIndex + width
        ];

        for (const neighborIndex of neighbors) {
            if (neighborIndex < 0 || neighborIndex >= width * height) continue;

            const neighborX = neighborIndex % width;
            const neighborY = Math.floor(neighborIndex / width);
            if (Math.abs(neighborX - x) + Math.abs(neighborY - y) !== 1) continue;
            if (visited[neighborIndex]) continue;

            const neighborDataIndex = neighborIndex * 4;
            const neighborAlpha = data[neighborDataIndex + 3];
            if (neighborAlpha <= alphaThreshold || colorDistance(data, dataIndex, neighborDataIndex) <= threshold) {
                visited[neighborIndex] = 1;
                queue.push(neighborIndex);
            }
        }
    }

    return removed;
}

async function cropPng(options) {
    const inputPath = resolve(options.input);

    if (extname(inputPath).toLowerCase() !== '.png') {
        throw new Error('Input file must be a PNG.');
    }

    try {
        await access(inputPath, constants.R_OK);
    } catch {
        throw new Error(`Input file does not exist or is not readable: ${inputPath}`);
    }

    const outputPath = resolve(options.output || getDefaultOutputPath(inputPath));
    const source = sharp(inputPath).ensureAlpha();
    const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });

    if (options.floodBackground) {
        const removed = removeFloodBackground(
            data,
            info.width,
            info.height,
            options.floodThreshold,
            options.alphaThreshold
        );

        console.log(`Flood background pixels made transparent: ${removed}`);
    }

    const bounds = findCropBounds(
        data,
        info.width,
        info.height,
        options.tolerance,
        options.alphaThreshold
    );

    if (!bounds) {
        throw new Error('Image contains only transparent or white pixels; nothing to crop.');
    }

    await sharp(data, {
        raw: {
            width: info.width,
            height: info.height,
            channels: 4
        }
    })
        .extract(bounds)
        .png()
        .toFile(outputPath);

    console.log(`Written: ${outputPath}`);
    console.log(`Crop: ${info.width}x${info.height} -> ${bounds.width}x${bounds.height}`);
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help) {
        printUsage();
        return;
    }

    if (!options.input) {
        throw new Error('Missing input PNG path.');
    }

    await cropPng(options);
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
    console.error('Run with --help for usage.');
    process.exitCode = 1;
});
