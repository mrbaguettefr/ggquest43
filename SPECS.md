# Mini Game Design: Birthday Steam Quest

## Concept

---

## Opening Sequence (Player Name Gag)

* At the very start, the game asks for a password to access the game

* Password behavior:

  * The password is used to decrypt the Steam key from a shared config file
  * If the password is valid, the decoded Steam key is stored in memory for the rest of the game
  * The full key is never shown immediately
  * The decoded key is later revealed in fragments through the Card Reader wall

* After the password is accepted, the game asks: "Enter your name"

* Input field behavior:

  * The input box starts empty
  * When the player types any letter, the typed letter is ignored
  * Instead, the input box receives the next missing letter from "GGLeBoss"
  * Example: first key press adds "G", second key press adds "G", third key press adds "L", etc.
  * Once the input box contains "GGLeBoss", any further typing is ignored
  * Delete/backspace works like a normal input box and removes the previous letter
  * After deleting, typing again continues by adding the next required letter from "GGLeBoss"
  * The confirm button confirms the current input as usual

* Purpose:

  * Immediate humor and personalization
  * Sets the tone (slightly absurd / meta)

---

A short, funny, geek-themed 2D game where the player explores a scrolling tilemap inspired by Heroes of Might and Magic III. The goal is to defeat bosses to unlock parts of a hidden Steam key.

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

The real Steam key is stored encrypted in a shared config file.

At the start of the game, the player must enter a password. This password is used to decode the Steam key. Once decoded successfully, the game keeps the decoded key in memory for the rest of the session.

The player then sees a mysterious wall with 3 missing Card Reader slots in the style of Doom keycards: green, blue and red. The wall shows incomplete fragments of a code, but not enough to understand the full reward immediately.

Each boss grants a Card

After defeating a boss, the player must physically walk back from the area to the central wall. Returning to the starting area and inserting a Card into the Card Reader reveals one part of the decoded Steam key.

The player gradually understands it's a Steam key through  hints from NPC "baguettefr".

### Steam Key Handling

* Shared config contains the encrypted Steam key
* Startup password decrypts the Steam key
* Decrypted value is kept only for the current game session
* Card Readers reveal fragments from the decrypted key
* The full Steam key is only visible after all 3 Cards have been inserted

---

## Hub & Respawn

* The central wall is a real location in the map, not a menu or automatic transition
* After completing an area, the player must walk back to the central wall to use the Card Reader
* Death is the only exception: when the party loses a fight, the player resurrects at the central wall
* Resurrection restores all recruited heroes to full HP

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

* Area 1 → unlock Leon → required for Area 2
* Area 2 → unlock Knight → required for Area 3

This ensures new heroes feel necessary, not optional.

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

Goal:

* Keep it simple, readable, and nostalgic
* No need for complex pathfinding or movement—focus on clarity and speed

---
