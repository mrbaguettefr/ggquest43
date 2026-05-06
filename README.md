# Birthday Steam Quest

Birthday Steam Quest is a Phaser/Vite TypeScript game with scene-based assets and a Tiled exploration map pipeline.

## Requirements

- Node.js
- npm

Install dependencies before first run:

```bash
npm install
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server on `http://localhost:8080` |
| `npm run build` | Build the production bundle into `dist/` |

## Project Structure

| Path | Description |
|------|-------------|
| `src/main.ts` | Application bootstrap |
| `src/game/main.ts` | Phaser game configuration |
| `src/game/scenes/` | Phaser scenes |
| `src/game/gameSession.ts` | Shared game session state |
| `src/game/encounters.ts` | Area encounter definitions |
| `src/game/heroes.ts` | Initial hero roster |
| `src/game/secret.ts` | Secret gift helpers |
| `src/game/sharedConfig.ts` | Encrypted shared config |
| `public/style.css` | Global layout styles |
| `public/assets/` | Static runtime assets served by Vite |
| `vite/plugins/tiled-map.mjs` | Tiled map build plugin |

## Asset Layout

Scene-owned assets live under `public/assets/<SceneName>/`:

- `public/assets/MainMenu/` contains the main menu logo.
- `public/assets/Wall/` contains the Card Reader wall background and inserted card spritesheet.
- `public/assets/Battle/` contains battle backgrounds, character sprites, and monster sprites.
- `public/assets/Exploration/` contains world sprites and exploration tilemap assets.

The shared asset root is reserved for runtime assets used across scenes. Currently, `public/assets/bg.png` is the only shared root asset.

## Tiled Map Pipeline

The editable exploration map is `public/assets/Exploration/tileset/map.tmj`. External Tiled tilesets stay beside it as `.tsj` or `.tsx` files.

The Vite `tiledMapPlugin` inlines those tilesets into `public/assets/Exploration/tileset/map-tiled.json` during dev and production builds. Phaser loads the generated `map-tiled.json`, while Tiled users should edit `map.tmj` and the external tileset files.

The vendor tileset folder under `public/assets/Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/` is intentionally kept in place because the map, tilesets, and Phaser loader paths reference it.

## Development Notes

- Dev-only scene starts use `?debugScene=<SceneName>` after Preloader has loaded assets.
- `SPECS.md` is the behavior/source-of-truth document and must stay aligned with source code changes.
- No automated tests are currently configured. For gameplay changes, use a manual browser smoke check from `npm run dev`.

## Production Build

Run:

```bash
npm run build
```

The production build uses Vite, Oxc minification, the Tiled map plugin, and bundle obfuscation. The generated site is written to `dist/`.
