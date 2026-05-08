---
name: auto-character
description: Create AutoSprite characters and spritesheets from local input images for this project. Use when Codex needs to crop character source art, upload it to AutoSprite, ask whether the character is humanoid, generate requested animations such as isometric idle or battle side-scrolling idle/attack/die, and download sheet/atlas assets into public/assets.
---

# Auto Character

## Workflow

Use this workflow for local character images that should become AutoSprite spritesheet assets.

1. Confirm the input image path exists.
2. Ask the user exactly: `is humanoid: yes/no`.
3. Choose output paths from the request. For ggquest43 monsters, default to `public/assets/characters/monsters/<slug>/`.
4. Crop the input before upload:
   - If `scripts/crop-png.mjs` exists, run `node scripts/crop-png.mjs <input> --flood-background --output <output>/source/<slug>-cropped-v1.png`.
   - If the source has a transparent or plain border instead of an edge-connected generated background, omit `--flood-background`.
   - Inspect the cropped PNG visually before uploading when an image viewer/tool is available.
5. Upload the cropped PNG to AutoSprite:
   - Call `request_upload_url` with `fileName` and `contentType: "image/png"`.
   - Upload the file with `curl -X PUT -H "Content-Type: image/png" --data-binary @<cropped.png> "<uploadUrl>"`.
   - Call `upload_character` with the requested character name, returned `uploadKey`, and `isHumanoid` from the user's yes/no answer.
6. Generate only the animations requested by the user with `generate_spritesheet`.
   - Do not enable `withSound` unless the user explicitly asks for sound.
   - Poll `get_job_status` at least 30 seconds apart.
7. Download each resulting `sheetUrl` and `atlasUrl` into the output directory using lowercase slug filenames.
8. Run lightweight validation with `file` on downloaded PNG/JSON files and visually inspect the final sheets when possible.

## AutoSprite Defaults

Use these defaults unless the user asks otherwise:

```json
{
  "quality": "standard",
  "removeBg": "default",
  "spritesheet": {
    "frameSize": 256,
    "frameCount": 25
  },
  "withSound": false
}
```

## Animation Mapping

Use AutoSprite built-in kinds where they match. Use `custom` when a requested animation has no exact built-in kind or needs behavior that the built-in kind cannot express.

- Battle side-scrolling idle: `kind: "idle"`, `name: "Battle Idle"`, `prompt: "side-scrolling battle idle stance, profile view, subtle breathing loop"`, `loop: true`.
- Battle side-scrolling attack: `kind: "attack"`, `name: "Battle Attack"`, `prompt: "side-scrolling battle attack animation, profile view"`.
- Battle side-scrolling die: `kind: "custom"`, `name: "Battle Die"`, `prompt: "side-scrolling battle death animation, profile view, collapse and become still"`, `loop: false`.

## Naming

Slug character names with lowercase hyphenated filenames. For `wolf rider`, use `wolf-rider`.

Recommended ggquest43 paths:

- Cropped source: `public/assets/characters/monsters/<slug>/source/<slug>-cropped-v1.png`
- Isometric idle: `public/assets/characters/monsters/<slug>/exploration/<slug>-iso_idle_down-v1.png`
- Battle side-scrolling idle: `public/assets/characters/monsters/<slug>/battle/<slug>-idle-v1.png`
- Battle side-scrolling attack: `public/assets/characters/monsters/<slug>/battle/<slug>-attack-v1.png`
- Battle side-scrolling die: `public/assets/characters/monsters/<slug>/battle/<slug>-die-v1.png`

Save matching AutoSprite atlas JSON beside each PNG with the same basename.

## Project Notes

For ggquest43, follow `AGENTS.md`: keep raw/source art outside served assets unless the file is an intentional generated/cropped served asset, crop new PNGs before adding them to `public/assets`, and do not add automated tests. Update `SPECS.md` only when behavior, naming exposed in game flow, or configuration changes.
