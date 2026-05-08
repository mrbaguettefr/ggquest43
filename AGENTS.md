# Project Instructions

- When behavior, naming, game flow and configuration, update `SPECS.md` in the same change.

# Repository Guidelines

## Project Structure & Module Organization

- Source lives in `src/`; `src/main.ts` wires the Phaser game into the DOM and defers to `src/game/main.ts`.
- Gameplay logic is under `src/game/`, with scenes in `src/game/scenes/` (Boot, Preloader, MainMenu, Game, GameOver), shared values in `src/game/constants.ts`, and a legacy helper in `src/game/genetics.js`.
- Static assets and styles are in `public/` (images under `public/assets/`, base CSS in `public/style.css`). Vite configs live in `vite/config.dev.mjs` and `vite/config.prod.mjs`.
- Type declarations are surfaced via `types.d.ts` and `src/vite-env.d.ts`; add new globals there.

## Asset Intake & Cropping

- Keep raw/source art that is not meant to be served by Vite outside `public/`, usually under `asset_sources/`.
- Before adding a new PNG from outside `public/` into `public/assets/`, crop it with the project script instead of copying it directly.
- Use `node scripts/crop-png.mjs <input.png> --output public/assets/<feature>/<asset-name>.png` for images with transparent, white, or near-white borders.
- For generated images with a solid or gradient background connected to the image edges, use `--flood-background` so the connected edge background is made transparent before cropping. Adjust with `--flood-threshold <0-255>` when needed, for example:
  `node scripts/crop-png.mjs "asset_sources/source.png" --flood-background --flood-threshold 50 --output public/assets/battle/finger.png`.
- After cropping, inspect the generated PNG visually and verify transparent edges before wiring it into Phaser loaders or scenes.
- Use lowercase, descriptive asset names in `public/assets/` that match Phaser loader keys and existing folder conventions.

## Build, Test, and Development Commands

- `npm install` — install deps (Phaser + Synaptic) before first run.
- `npm run dev` — start Vite with `vite/config.dev.mjs`; serves the game at `localhost:5173` by default.
- `npm run build` — production bundle using `vite/config.prod.mjs`; outputs to `dist/`.
- During dev, use browser devtools + Phaser inspector extensions for quick iteration on scenes and assets.

## Coding Style & Naming Conventions

- Language: TypeScript with ES modules; one legacy JS file retained as-is. Keep imports explicit (note the `.ts` suffix used in existing scene imports).
- Formatting: 4-space indents, semicolons required, and trailing commas avoided. Prefer `const` and narrow types; `tsconfig` runs in strict mode with unused checks on.
- Naming: Classes and scenes are `PascalCase`, functions and variables `camelCase`, constants `UPPER_SNAKE_CASE`. Asset filenames stay lowercase with underscores to match Phaser loader calls.
- Organize scene-specific helpers next to their scene files; cross-scene utilities belong under `src/game/`.

## Testing Guidelines

- No automated test. Do not add any tests.
- Optionally perform a manual playthrough after changes using the playwright tool: load game, start from MainMenu, verify collisions, scoring, and GameOver flow. Capture console output to ensure no runtime warnings.
- When checking a specific scene with playwright, navigate through the debugScene shortcut `http://localhost:8080/?debugScene=<scene name>` to start directly at that scene instead of going through the full game flow.

## Commit & Pull Request Guidelines

- Commits in history are short and imperative; continue with concise, present-tense messages that describe the behavior change (e.g., `Add water animation timing`).
- Pull requests should include: what changed, why, how to test (commands + steps), and any follow-up TODOs. Attach screenshots or short clips for gameplay or UI adjustments.
- Reference related issues when applicable and call out any asset additions (`public/assets/`) or config changes (`vite/`) in the PR summary for easier review.
