#!/usr/bin/env node

import { access, constants } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const DEFAULT_WHITE_TOLERANCE = 8;
const DEFAULT_ALPHA_THRESHOLD = 0;

function printUsage() {
    console.log(`Usage: node scripts/crop-png.mjs <input.png> [options]

Options:
  --output <path>       Write the cropped PNG to a custom path
  --tolerance <0-255>   Treat near-white pixels as empty (default: ${DEFAULT_WHITE_TOLERANCE})
  --alpha <0-255>       Treat pixels at or below this alpha as transparent (default: ${DEFAULT_ALPHA_THRESHOLD})
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

    await sharp(inputPath)
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
