import fs from "node:fs";
import path from "node:path";

const MAP_SOURCE = "public/assets/Exploration/tileset/map.tmj";
const MAP_OUTPUT = "public/assets/Exploration/tileset/map-tiled.json";

function toPosixPath(filePath) {
    return filePath.split(path.sep).join(path.posix.sep);
}

function toOutputRelativePath(sourceFile, referencedFile, outputFile) {
    if (path.isAbsolute(referencedFile)) {
        return referencedFile;
    }

    const absoluteReferencedFile = path.resolve(path.dirname(sourceFile), referencedFile);
    const relativePath = path.relative(path.dirname(outputFile), absoluteReferencedFile);

    return toPosixPath(relativePath);
}

function readJSON(filePath) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeIfChanged(filePath, content) {
    if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
        return false;
    }

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);

    return true;
}

function stringifyTiledJSON(value, depth = 0) {
    const indent = "  ".repeat(depth);
    const childIndent = "  ".repeat(depth + 1);

    if (Array.isArray(value)) {
        if (value.every((item) => typeof item === "number")) {
            const lines = [];

            for (let i = 0; i < value.length; i += 24) {
                lines.push(`${childIndent}${value.slice(i, i + 24).join(", ")}`);
            }

            return `[\n${lines.join(",\n")}\n${indent}]`;
        }

        if (value.length === 0) {
            return "[]";
        }

        return `[\n${value
            .map((item) => `${childIndent}${stringifyTiledJSON(item, depth + 1)}`)
            .join(",\n")}\n${indent}]`;
    }

    if (value && typeof value === "object") {
        const entries = Object.entries(value);

        if (entries.length === 0) {
            return "{}";
        }

        return `{\n${entries
            .map(([key, item]) => {
                return `${childIndent}${JSON.stringify(key)}: ${stringifyTiledJSON(
                    item,
                    depth + 1
                )}`;
            })
            .join(",\n")}\n${indent}}`;
    }

    return JSON.stringify(value);
}

function buildTiledMap(root) {
    const sourcePath = path.resolve(root, MAP_SOURCE);
    const outputPath = path.resolve(root, MAP_OUTPUT);
    const map = readJSON(sourcePath);
    const watchedFiles = new Set([sourcePath]);

    map.tilesets = map.tilesets.map((tileset) => {
        if (!tileset.source) {
            return tileset;
        }

        const tilesetPath = path.resolve(path.dirname(sourcePath), tileset.source);
        watchedFiles.add(tilesetPath);

        const embeddedTileset = readJSON(tilesetPath);
        const adjustedTileset = { ...embeddedTileset };

        if (typeof adjustedTileset.image === "string") {
            adjustedTileset.image = toOutputRelativePath(
                tilesetPath,
                adjustedTileset.image,
                outputPath
            );
        }

        return {
            firstgid: tileset.firstgid,
            ...adjustedTileset
        };
    });

    const didWrite = writeIfChanged(outputPath, `${stringifyTiledJSON(map)}\n`);

    return {
        didWrite,
        outputPath,
        watchedFiles: [...watchedFiles]
    };
}

export function tiledMapPlugin() {
    let root = process.cwd();
    let watchedFiles = [];

    return {
        name: "ggquest43-tiled-map",
        configResolved(config) {
            root = config.root;
        },
        buildStart() {
            const result = buildTiledMap(root);
            watchedFiles = result.watchedFiles;

            for (const file of watchedFiles) {
                this.addWatchFile(file);
            }
        },
        configureServer(server) {
            const rebuild = () => {
                const result = buildTiledMap(root);
                watchedFiles = result.watchedFiles;
                server.watcher.add(watchedFiles);

                if (result.didWrite) {
                    server.ws.send({
                        type: "full-reload",
                        path: `/${toPosixPath(path.relative(root, result.outputPath))}`
                    });
                }
            };

            rebuild();
            server.watcher.add(watchedFiles);
            server.watcher.on("change", (file) => {
                if (watchedFiles.includes(file)) {
                    rebuild();
                }
            });
        }
    };
}
