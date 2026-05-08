import type { Area, Enemy, Encounter, HeroKey } from "./gameTypes.ts";

type EnemyPreset = Omit<
  Enemy,
  "hp" | "maxHp" | "count" | "battlefieldPosition"
> & {
  hp: number;
  unlockHero?: HeroKey;
};

export type EncounterStack = {
  position: number;
  enemyKey: string;
  count: number;
};

const normalizeEnemyKey = (key: string) =>
  key.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");

const createEnemy = (
  name: string,
  hp: number,
  damage: number,
  flying = false,
  boss = false,
): Enemy => {
  return {
    name,
    hp,
    maxHp: hp,
    damage,
    flying,
    boss,
  };
};

const createPreset = (
  preset: EnemyPreset,
  count = 1,
  battlefieldPosition?: number,
): Enemy => {
  const safeCount = Math.max(1, Math.floor(count));
  return {
    ...preset,
    hp: preset.hp * safeCount,
    maxHp: preset.hp * safeCount,
    unitHp: preset.hp,
    damage: preset.damage * safeCount,
    unitDamage: preset.damage,
    count: safeCount,
    battlefieldPosition,
  };
};

const ENEMY_PRESETS = new Map<string, EnemyPreset>(
  [
    [
      "skeleton",
      {
        name: "Skeleton Warrior",
        hp: 40,
        damage: 8,
        battleTexture: "enemy-battle-fallback-idle",
        battleAnimation: "enemy-battle-fallback-idle",
        battleScale: 0.45,
        explorationTexture: "skeleton",
        explorationAnimation: "skeleton-walk",
        explorationScale: 32 / 225,
      },
    ],
    [
      "skeleton_archer",
      {
        name: "Skeleton Archer",
        hp: 34,
        damage: 9,
        flying: true,
        battleTexture: "skeleton-archer-battle-idle",
        battleAnimation: "skeleton-archer-battle-idle",
        battleAttackTexture: "skeleton-archer-battle-attack",
        battleAttackAnimation: "skeleton-archer-battle-attack",
        battleScale: 0.45,
        explorationTexture: "skeleton-archer-exploration-idle",
        explorationAnimation: "skeleton-archer-exploration-idle",
        explorationScale: 0.2,
      },
    ],
    [
      "slime",
      {
        name: "Slime",
        hp: 28,
        damage: 6,
        battleTexture: "slime-exploration-idle",
        battleAnimation: "slime-exploration-idle",
        battleScale: 0.35,
        explorationTexture: "slime-exploration-idle",
        explorationAnimation: "slime-exploration-idle",
        explorationScale: 0.22,
        //        explorationOrigin: { x: 0.5, y: 1 },
      },
    ],
    [
      "wolf_rider",
      {
        name: "Wolf Rider",
        hp: 46,
        damage: 10,
        battleTexture: "enemy-battle-fallback-idle",
        battleAnimation: "enemy-battle-fallback-idle",
        battleScale: 0.45,
        explorationTexture: "skeleton",
        explorationAnimation: "skeleton-walk",
        explorationScale: 32 / 225,
      },
    ],
    [
      "magma_golem",
      {
        name: "Magma Golem",
        hp: 72,
        damage: 12,
        battleTexture: "magma-golem-battle-idle",
        battleAnimation: "magma-golem-battle-idle",
        battleAttackTexture: "magma-golem-battle-attack",
        battleAttackAnimation: "magma-golem-battle-attack",
        battleScale: 0.5,
        explorationTexture: "magma-golem-exploration-idle",
        explorationAnimation: "magma-golem-exploration-idle",
        explorationScale: 0.22,
      },
    ],
    [
      "revenant",
      {
        name: "Revenant",
        hp: 64,
        damage: 13,
        battleTexture: "revenant-battle-idle",
        battleAnimation: "revenant-battle-idle",
        battleAttackTexture: "revenant-battle-attack",
        battleAttackAnimation: "revenant-battle-attack",
        battleScale: 0.48,
        explorationTexture: "revenant-exploration-idle",
        explorationAnimation: "revenant-exploration-idle",
        explorationScale: 0.22,
      },
    ],
    [
      "bile_demon",
      {
        name: "Bile Demon",
        hp: 150,
        damage: 15,
        boss: true,
        unlockHero: "mistress" as HeroKey,
        battleTexture: "bile-demon-battle-idle",
        battleAnimation: "bile-demon-battle-idle",
        battleAttackTexture: "bile-demon-battle-attack",
        battleAttackAnimation: "bile-demon-battle-attack",
        battleScale: 2.5,
        explorationTexture: "bile-demon-battle-idle",
        explorationAnimation: "bile-demon-battle-idle",
        explorationScale: 0.7,
        explorationOrigin: { x: 0.6, y: 0.65 },
      },
    ],
    [
      "cyberdemon",
      {
        name: "Cyber Demon",
        hp: 180,
        damage: 18,
        boss: true,
        battleTexture: "cyberdemon-battle-idle",
        battleAnimation: "cyberdemon-battle-idle",
        battleAttackTexture: "cyberdemon-battle-attack",
        battleAttackAnimation: "cyberdemon-battle-attack",
        battleScale: 0.58,
        explorationTexture: "cyberdemon-exploration-idle",
        explorationAnimation: "cyberdemon-exploration-idle",
        explorationScale: 0.24,
      },
    ],
    [
      "infernal_warlock",
      {
        name: "Infernal Warlock",
        hp: 90,
        damage: 14,
        battleTexture: "infernal-warlock-battle-idle",
        battleAnimation: "infernal-warlock-battle-idle",
        battleAttackTexture: "infernal-warlock-battle-attack",
        battleAttackAnimation: "infernal-warlock-battle-attack",
        battleScale: 0.48,
        explorationTexture: "infernal-warlock-exploration-idle",
        explorationAnimation: "infernal-warlock-exploration-idle",
        explorationScale: 0.22,
      },
    ],
  ].map(
    ([key, preset]) =>
      [normalizeEnemyKey(key as string), preset] as [string, EnemyPreset],
  ),
);

export const KING_SLIME_BOSS_ENCOUNTER: Encounter = {
  name: "King Slime",
  card: "blue",
  unlockHero: "leon",
  enemies: [
    {
      ...createEnemy("King Slime Boss", 220, 3, false, true),
      battleTexture: "king-slime-boss-battle-idle",
      battleAnimation: "king-slime-boss-battle-idle",
      battleScale: 0.58,
      explorationTexture: "king-slime-boss-exploration-idle",
      explorationAnimation: "king-slime-boss-exploration-idle",
      explorationScale: 0.28,
    },
  ],
};

export const AREAS: Area[] = [
  {
    key: "plains",
    name: "The Verdant Plains",
    gateX: 860,
    gateY: 355,
    color: 0x68b36d,
    card: "green",
    encounters: [
      {
        name: "Confused Slimes",
        enemies: [
          createEnemy("Wobbly Slime", 28, 6),
          createEnemy("Suspicious Mushroom", 24, 5),
        ],
      },
      {
        name: "Corrupted Slime King",
        card: "green",
        unlockHero: "leon",
        enemies: [createEnemy("Corrupted Slime King", 70, 9, false, true)],
      },
    ],
  },
  {
    key: "dungeon",
    name: "The Hollow Dungeon",
    gateX: 1360,
    gateY: 355,
    color: 0xb86a44,
    card: "blue",
    encounters: [
      {
        name: "Flying Ash Imps",
        enemies: [
          createEnemy("Flying Ash Imp", 34, 8, true),
          createEnemy("Sulfur Bat", 30, 7, true),
        ],
      },
      {
        name: "Fallen Archangel",
        card: "blue",
        unlockHero: "mistress",
        enemies: [createEnemy("Fallen Archangel", 96, 12, true, true)],
      },
    ],
  },
  {
    key: "lava-underground",
    name: "The Molten Underdeep",
    gateX: 1840,
    gateY: 355,
    color: 0x65507a,
    card: "red",
    encounters: [
      {
        name: "Creepy Corridor",
        enemies: [
          createEnemy("Fear Acolyte", 48, 10),
          createEnemy("Bad Vibes", 44, 9),
        ],
      },
      {
        name: "Horned Reaper Lord",
        card: "red",
        enemies: [createEnemy("Horned Reaper Lord", 130, 15, false, true)],
      },
    ],
  },
];

export const ENCOUNTER_BY_NAME = new Map<string, Encounter>([
  ...AREAS.flatMap((a) =>
    a.encounters.map((e) => [e.name, e] as [string, Encounter]),
  ),
  [KING_SLIME_BOSS_ENCOUNTER.name, KING_SLIME_BOSS_ENCOUNTER],
]);

export const buildSkeletonEncounter = (count: number): Encounter => ({
  name: count === 1 ? "Skeleton" : `Skeleton ×${count}`,
  enemies: [createPreset(ENEMY_PRESETS.get("skeleton")!, count, 1)],
});

export const DEFAULT_SKELETON_ENCOUNTER = buildSkeletonEncounter(1);

export const buildStackEncounter = (stacks: EncounterStack[]): Encounter => {
  const validStacks = stacks
    .filter(
      (stack) => stack.position >= 1 && stack.position <= 5 && stack.count > 0,
    )
    .sort((a, b) => a.position - b.position)
    .slice(0, 5);

  const enemies = validStacks.map((stack) => {
    const key = normalizeEnemyKey(stack.enemyKey);
    const preset = ENEMY_PRESETS.get(key) ?? ENEMY_PRESETS.get("skeleton")!;
    return createPreset(preset, stack.count, stack.position);
  });

  if (enemies.length === 0) {
    return DEFAULT_SKELETON_ENCOUNTER;
  }

  const unlockHero = validStacks
    .map(
      (stack) =>
        ENEMY_PRESETS.get(normalizeEnemyKey(stack.enemyKey))?.unlockHero,
    )
    .find((h): h is HeroKey => h !== undefined);

  return {
    name: enemies
      .map((enemy) => `${enemy.name} ×${enemy.count ?? 1}`)
      .join(", "),
    enemies,
    ...(unlockHero ? { unlockHero } : {}),
  };
};

export const resolveEncounter = ({
  encounterName,
  skeletonCount,
  isKingSlimeBoss,
  stacks,
  bossKey,
}: {
  encounterName?: string;
  skeletonCount?: number;
  isKingSlimeBoss?: boolean;
  stacks?: EncounterStack[];
  bossKey?: string;
}): Encounter => {
  if (isKingSlimeBoss) {
    return KING_SLIME_BOSS_ENCOUNTER;
  }

  if (bossKey) {
    return buildStackEncounter([{ position: 3, enemyKey: bossKey, count: 1 }]);
  }

  if (stacks && stacks.length > 0) {
    return buildStackEncounter(stacks);
  }

  if (skeletonCount !== undefined) {
    return buildSkeletonEncounter(skeletonCount);
  }

  if (encounterName) {
    return ENCOUNTER_BY_NAME.get(encounterName) ?? DEFAULT_SKELETON_ENCOUNTER;
  }

  return DEFAULT_SKELETON_ENCOUNTER;
};
