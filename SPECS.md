# Mini Game Design: Birthday Steam Quest

## Concept

---

## Opening Sequence (Player Name Gag)

* At the very start, the game asks for a seed game code to initialize the game

* Seed game code behavior:

  * If no seed game code is present, the player is warned that a seed game code is required
  * If a seed game code is present, it is used to decrypt `secret_gift` from the shared config file
  * the decoded `secret_gift` value is stored in memory for the rest of the game
  * The full gift code is never shown immediately
  * The decoded gift code is later revealed in fragments through the Card Reader wall

* After the seed game code initializes the session, the game displays the Main Menu
* Choosing Start Game from the Main Menu asks: "Enter your name"

* Input field behavior:

  * The input box starts empty
  * When the player types any letter, the typed letter is ignored
  * Instead, the input box receives the next missing letter from "GGLeBoss"
  * Example: first key press adds "G", second key press adds "G", third key press adds "L", etc.
  * Once the input box contains "GGLeBoss", any further typing is ignored
  * Delete/backspace works like a normal input box and removes the previous letter
  * After deleting, typing again continues by adding the next required letter from "GGLeBoss"
  * Confirmation is accepted only when the input box contains exactly "GGLeBoss"
  * Trying to confirm before the input box says "GGLeBoss" keeps the player on the name screen and shows a reminder

* Purpose:

  * Immediate humor and personalization
  * Sets the tone (slightly absurd / meta)

---

A short, funny, geek-themed 2D game where the player explores a scrolling tilemap inspired by Heroes of Might and Magic III. The goal is to defeat bosses to unlock parts of a hidden `secret_gift`.

Tone: playful, slightly absurd, full of references.

---

## Duration & Pacing

* Target: ~5 minutes per area (total ~15 minutes)
* Each area:

  * 2–4 short fights
  * 1 boss fight
  * Walk back to the hub after the boss
  * Wall interaction ~20–30s

---

## Core Loop

* Explore map
* Fight enemies (turn-based)
* Defeat area boss
* Receive a Card
* Physically walk back to the starting area (central wall)
* Insert Card into the Card Reader to reveal part of the code
* Discover new hero near the wall (if applicable)
* Progress to next area

---

## World Structure

The map is divided into 3 areas with increasing difficulty:

### Area 1: The Forgotten Plains

* Weak enemies
* Tutorial zone
* Boss: Corrupted Slime King
* Reward:

  * Green Card
  * Unlock Hero: Leon (appears next to the wall in the hub)

### Area 2: Ashen Mountains

* Mid difficulty
* Enemies with abilities
* Boss: Fallen Archangel
* Reward:

  * Blue Card
  * Unlock Hero: Knight (appears next to the wall in the hub)

### Area 3: Dungeon Depths

* Hard difficulty
* Status effects
* Boss: Horned Reaper Lord
* Reward:

  * Red Card

---

## Hidden Objective

The shared config file contains the real gift value encrypted as `secret_gift`.

Technical constraint: the game will be publicly available, so source code, bundled assets and config files must be treated as visible to players. Security measures are required to avoid exposing the gift value directly, including storing `secret_gift` encrypted and only decrypting it in the browser after the seed game code is accepted.

At the start of the game, the player must provide a seed game code before reaching the Main Menu. If no seed is present, the UI warns the player that a seed game code is required. If a seed is present, it is used to decrypt `secret_gift` from the shared config file with simple browser-side decryption. The Main Menu is displayed immediately after the session initializes, and the game keeps the decoded gift value in memory for the rest of the session.

The player then sees a mysterious wall with 3 missing Card Reader slots in the style of Doom keycards: green, blue and red. The wall shows incomplete fragments of a code, but not enough to understand the full reward immediately.

Each boss grants a Card

After defeating a boss, the player must physically walk back from the area to the central wall. Returning to the starting area and inserting a Card into the Card Reader reveals one part of the decoded gift value.

The player gradually understands what the gift is through hints from NPC "baguettefr".

### Secret Gift Handling

* Source code and config names must never mention the real gift type directly; use `secret_gift` everywhere
* The game is public, so source code, assets and config files must not expose the plain gift value
* Shared config contains the encrypted `secret_gift`
* Seed game code decrypts `secret_gift` with simple browser-side decryption
* The Main Menu is shown immediately after a successful seed entry
* Decrypted value is kept only for the current game session
* Card Readers reveal fragments from the decrypted key
* The full gift code is only visible after all 3 Cards have been inserted

### Production Bundle Protection

* Production builds must use Vite minification and bundle obfuscation
* Production JavaScript uses Vite's default client build minifier, Oxc
* Production JavaScript is obfuscated with `vite-plugin-bundle-obfuscator`
* Obfuscation is a deterrent only; it does not replace encrypting `secret_gift`

### Implementation Organization

* Phaser scene flow is split by game phase:

  * `src/game/scenes/Boot.ts` loads the early background asset and starts Preloader
  * `src/game/scenes/Preloader.ts` loads game assets, checks for a dev-only debug start override, and otherwise starts Seed
  * `src/game/scenes/Seed.ts` owns seed game code entry, secret gift decryption, initial session creation, and then starts MainMenu immediately when a seed is present
  * `src/game/scenes/MainMenu.ts` shows a black-background opening menu with the `main-menu-logo` asset, a Start Game item that starts PlayerName with the decrypted session, and a Credits item that starts Credits
  * `src/game/scenes/PlayerName.ts` owns the forced "GGLeBoss" name-entry gag
  * `src/game/scenes/Exploration.ts` owns world rendering, movement, map interactions, routing into Card Reader wall interactions, hero recruitment, battle entry, resurrection handling, and post-battle rewards
  * `src/game/scenes/Wall.ts` shows the Card Reader wall close-up using `public/assets/Wall/wall-0.png`; when no card has been inserted, Cloud says "There is an weird wall with 3 holes", pending cards are inserted from this close-up view, inserted access cards are drawn over the wall from the three-frame row spritesheet `public/assets/Wall/inserted-cards.png`, and revealed fragment codes are written in the top panel in blue-green-red slot order with blank unrevealed fragments separated by dashes. Pressing any key returns to the same exploration map position unless the final card starts Credits.
  * `src/game/scenes/Battle.ts` owns fullscreen combat rendering, target selection, turn resolution, victory, defeat, and returning battle results to Exploration
  * `src/game/scenes/GameOver.ts` remains available as a standalone Game Over scene

* Cloud's exploration sprite uses the `public/assets/Exploration/world/characters/cloud-iso_{idle,walk}_{down,right,up}-v1.*` image and atlas JSON files. The custom atlas JSON is adapted into Phaser atlas textures during Preloader setup, then Exploration uses directional idle animations while standing and directional walk animations while moving. Left-facing movement reuses the right-facing walk/idle atlases and flips the player sprite horizontally with Phaser's flip API.
* The `baguettefr` NPC is placed from the exploration map object named `baguettefr`. Exploration renders the NPC with `public/assets/Exploration/world/characters/baguettefr-iso_idle_down-v1.*`, plays the idle-down animation, and lets the player press E nearby to open a dialog message. The NPC dialog uses the same centered Exploration message format as hero recruitment and changes hints based on Card Reader progress.
* Active map enemies block Cloud's exploration movement like obstacles while still allowing Cloud to stand within interaction range and press E to start the fight. Defeated enemies are removed from both the map and movement blocking.
* Exploration map objects named `boss` with a `king-slime` custom property start the King Slime boss encounter when the player stands nearby and presses E. The boss uses `public/assets/Exploration/world/monsters/king-slime-boss-iso_idle_right-v1.*` on the map, uses `public/assets/Battle/monsters/king-slime-boss-idle-v1.*` in battle, has high HP with weak attack damage, and awards the Blue Card when defeated.
* Scene-owned assets are grouped under `public/assets/<SceneName>/` when they are only used by that scene. `MainMenu` owns its logo, `Exploration` owns world characters, monsters, and tilemap assets, `Wall` owns the Card Reader wall background, and `Battle` owns combat background and battle character sprites. Shared assets, such as `public/assets/bg.png`, remain at the shared assets root.
* The editable Tiled exploration map is `public/assets/Exploration/tileset/map.tmj`, with external tilesets stored as `.tsj` files in the same folder. The Vite `tiledMapPlugin` inlines those tilesets into `public/assets/Exploration/tileset/map-tiled.json` before dev and production builds; Phaser loads the generated `map-tiled.json`.
* `src/game/gameSession.ts` creates the shared game session object passed between Seed, PlayerName, Exploration, and Battle
* `src/game/debugStart.ts` supports dev-only URL scene starts with dummy session data for testing scenes that normally require earlier flow
* `src/game/gameTypes.ts` contains shared gameplay types
* `src/game/gameConstants.ts` contains world, movement, name, and Card Reader constants
* `src/game/encounters.ts` contains area and enemy encounter data
* `src/game/heroes.ts` creates the initial hero roster
* `src/game/secret.ts` contains secret gift helpers
* `src/game/sharedConfig.ts` contains the encrypted `secret_gift`

### Dev Scene Start Overrides

* In Vite dev mode only, adding `?debugScene=<SceneName>` to the URL starts that scene after Preloader finishes loading assets
* Supported debug scenes are `MainMenu`, `Seed`, `PlayerName`, `Exploration`, `Wall`, `Battle`, `Credits`, and `GameOver`
* `PlayerName`, `Exploration`, `Wall`, and `Battle` receive a dummy `GameSession` that simulates accepted seed entry, completed player naming, decoded secret fragments, and recruited heroes
* Wall debug starts can set inserted cards with `cards=<mask>`, where the three mask positions are blue, green, and red. `000` means no cards, `X00` means blue, `0X0` means green, `00X` means red, and `XX0` means blue and green.
* `Battle` also receives `currentArea` and `currentEncounter`; by default this starts `The Forgotten Plains` encounter `0`
* Battle debug starts can select another fight with `debugArea` and `debugEncounter`, for example `?debugScene=Battle&debugArea=mountains&debugEncounter=1`

---

## Hub & Respawn

* The central wall is a real location in the map, not a menu or automatic transition
* After completing an area, the player must walk back to the central wall to use the Card Reader
* Death is the only exception: when the party loses a fight, the player resurrects at the central wall
* Resurrection restores all recruited heroes to full HP
* The starting hub area is visually enclosed by room walls (left, top, bottom, and upper-right side); the right side has a doorway opening at the lower half (y: 450–705) leading toward the area gates

---

## Heroes

### Starting Hero

Cloud (parody of Cloud from FF7)

* 40 years old
* Alcoholic
* Basic sword attack
* Special: "Hangover Slash" (high damage, chance to miss)

---

### Unlockable Heroes

#### Leon

Inspired by Resident Evil

* Uses pistol
* High precision
* Skill: "Headshot" (critical chance)
* Funny trait: overly serious in ridiculous situations

#### Knight

From Dungeon Keeper 2

* High damage
* Skill: "Brutal Strike" (heavy damage, small recoil)
* Funny trait: always inappropriate / pervy comments

---

### Hero Unlock System

* After defeating a boss, the new hero appears next to the wall in the central hub
* Player can interact with them to recruit
* This creates a visual reward loop: return → insert key → meet new hero

---

## Team Composition & Progression Constraints

### Area 1 Mechanics (Melee Focus)

* All enemies can be defeated with melee attacks
* Designed to validate basic combat (Cloud only)

---

### Area 2 Mechanics (Ranged Requirement)

* Introduction of flying enemies
* Flying enemies cannot be hit with melee attacks
* Only ranged attacks (Leon) can damage them

Consequence:

* Without Leon in the team, some enemies are literally impossible to kill
* Area cannot be completed without recruiting Leon

---

### Area 3 Mechanics (Fear Mechanic)

* At the beginning of each enemy turn:

  * If the Knight is NOT in the player's team
    → Enemies cast "Fear"
    → Player's entire team immediately flees combat

Consequence:

* Player cannot win any fight without the Knight
* Area cannot be completed without recruiting the Knight

---

### Progression Flow

* Area 1 → unlock Leon → strongly recommended for Area 2
* Area 2 → unlock Knight → strongly recommended for Area 3

Entering a new area is never blocked by hero requirements. The area data does not use a `requiredHero` field. Instead of blocking messages, heroes give short battle-start hints when the team lacks what is needed. The hints describe the immediate threat without naming the missing hero, so the solution remains a surprise. For example in Area 2, Cloud comments that flying enemies are out of his reach.

---

## UI

For now, the UI stays simple and readable.

### Exploration UI

Always visible while exploring:

* Exploration renders HUD text through a fixed UI camera. The main camera ignores HUD objects, and the UI camera ignores world objects, so UI text stays stable while the world camera follows and zooms on the player
* The game canvas is constrained to the browser viewport, preventing the fixed HUD from being clipped on shorter screens
* The player can move with either Arrow keys or WASD

* Current location label

  * Examples:

    * "Center of the World"
    * "The Forgotten Plains"
    * "Ashen Mountains"
    * "Dungeon Depths"

* Party status panel

  * Shows all recruited heroes
  * For each hero:

    * Hero name
    * Current HP / Max HP

Example:

```txt
Location: Center of the World

Party:
Cloud   HP 120 / 120
Leon    HP 100 / 100
Knight  HP 150 / 150
```

### Battle UI

During combat, reuse the same party status panel so the player always understands team health.

Enemy targeting uses the keyboard instead of number shortcuts:

* Up / Down moves the selected target between living enemies
* Enter / Space confirms the attack
* A pixel-style pointing hand appears beside the selected enemy, in the spirit of Final Fantasy VII target selection
* Clicking an enemy still selects and attacks it as a convenience

---

## Combat System

Turn-based combat inspired by Final Fantasy VII:

Each turn:

* Attack

* Special ability (if available, may have cooldown)

Basic stats:

* Heroes HP range: 100–150
* Damage range: 10–25 depending on hero

Turn order:

* Fixed order (player team first, then enemies)

Enemies:

* Basic melee: simple attack
* Ranged: lower HP, attacks from distance

## Battle Scene (Heroes III Style)

* Entering a fight transitions to a dedicated fullscreen scene
* Visual inspiration: Heroes of Might and Magic III battlefield

### Layout

* Fixed camera (no scrolling during battle)

* Background: themed per area (plains, mountains, dungeon)

* Grid-based battlefield (implicit or visible hex/square grid)

* Left side: player heroes

* Right side: enemies

### Units Representation

* Each hero is a unit on the battlefield
* Enemies occupy positions on the opposite side
* Simple idle/attack animations (2–3 frames is enough)

### Turn Flow (visualized)

1. Player turn begins

2. Highlight active hero

3. Target selection (enemy highlights)

   * Up / Down changes the selected enemy
   * A pointing hand appears next to the currently selected enemy

4. Action resolves (damage + small animation)

5. Enemy turn begins

6. Enemy attacks automatically

---

### Simplification Rules

* No movement on the battlefield

* No positioning mechanics

* No pathfinding

* Heroes and enemies stay fixed on their side

* Focus only on attack → resolve → next turn

* Special abilities are optional but should remain simple and fast

Goal:

* Ultra-fast battles (5–10 seconds per fight)
* Zero cognitive load, immediate action
* Keep the focus on progression and humor, not tactics

### Feedback

* Damage numbers briefly appear above units
* Miss / special effects clearly shown
* Status (like Fear) displayed as text + simple effect

### Transitions

* Enter battle: quick fade or zoom-in
* Exit battle: fade back to exploration map
* Quest completion: after all three Card Reader fragments reveal the full `secret_gift`, closing the final completion message starts a very long `Credits` scene
* Credits scene: a long upward-scrolling credit roll with many production, art, design, programming, audio, QA, executive, and special thanks roles; every credited role uses the same name, `baguettefr`
* Credits input: clicking or pressing Enter returns to the Main Menu

Goal:

* Keep it simple, readable, and nostalgic
* No need for complex pathfinding or movement—focus on clarity and speed

---
