# Mini Game Design: Birthday Steam Quest

## Concept

---

## Opening Sequence (Player Name Gag)

* At the very start, the game asks for a seed game code to initialize the game

* Seed game code behavior:

  * The player is warned that the seed game code must be correct
  * The seed game code is used to decrypt an encrypted welcome message from the shared config file
  * welcome message is shown to the player so the player can confirm that the seed worked
  * The same seed game code is also used to decrypt `secret_gift` from the shared config file
  * the decoded `secret_gift` value is stored in memory for the rest of the game
  * The full gift code is never shown immediately
  * The decoded gift code is later revealed in fragments through the Card Reader wall

* After the decrypted welcome message is shown and the player confirms it, the game asks: "Enter your name"

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

The shared config file contains an encrypted welcome message and the real gift value encrypted as `secret_gift`.

Technical constraint: the game will be publicly available, so source code, bundled assets and config files must be treated as visible to players. Security measures are required to avoid exposing the gift value directly, including storing `secret_gift` encrypted and only decrypting it in the browser after the seed game code is accepted.

At the start of the game, the player must enter a seed game code. The UI must warn the player that the seed game code must be correct. This seed game code is used to decrypt a welcome message and `secret_gift` from the shared config file, using simple browser-side decryption. The decrypted welcome message is shown to the player for confirmation without additional validation. The game keeps the decoded gift value in memory for the rest of the session.

The player then sees a mysterious wall with 3 missing Card Reader slots in the style of Doom keycards: green, blue and red. The wall shows incomplete fragments of a code, but not enough to understand the full reward immediately.

Each boss grants a Card

After defeating a boss, the player must physically walk back from the area to the central wall. Returning to the starting area and inserting a Card into the Card Reader reveals one part of the decoded gift value.

The player gradually understands what the gift is through hints from NPC "baguettefr".

### Secret Gift Handling

* Source code and config names must never mention the real gift type directly; use `secret_gift` everywhere
* The game is public, so source code, assets and config files must not expose the plain gift value
* Shared config contains an encrypted welcome message used to confirm that the seed game code works
* Shared config contains the encrypted `secret_gift`
* Seed game code decrypts the welcome message and `secret_gift` with simple browser-side decryption
* The decrypted welcome message is shown immediately after a successful seed entry
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
  * `src/game/scenes/Preloader.ts` loads game assets and starts MainMenu
  * `src/game/scenes/MainMenu.ts` shows the opening menu and starts Seed
  * `src/game/scenes/Seed.ts` owns seed game code entry, welcome-message decryption, secret gift decryption, and initial session creation
  * `src/game/scenes/PlayerName.ts` owns the forced "GGLeBoss" name-entry gag
  * `src/game/scenes/Exploration.ts` owns world rendering, movement, map interactions, Card Reader wall interactions, hero recruitment, battle entry, resurrection handling, and post-battle rewards
  * `src/game/scenes/Battle.ts` owns fullscreen combat rendering, target selection, turn resolution, victory, defeat, and returning battle results to Exploration
  * `src/game/scenes/GameOver.ts` remains available as a standalone Game Over scene

* `src/game/gameSession.ts` creates the shared game session object passed between Seed, PlayerName, Exploration, and Battle
* `src/game/gameTypes.ts` contains shared gameplay types
* `src/game/gameConstants.ts` contains world, movement, name, and Card Reader constants
* `src/game/encounters.ts` contains area and enemy encounter data
* `src/game/heroes.ts` creates the initial hero roster
* `src/game/secret.ts` contains secret gift helpers
* `src/game/sharedConfig.ts` contains the encrypted welcome message and encrypted `secret_gift`

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
