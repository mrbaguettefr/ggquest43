import type { Area, Enemy, Encounter } from './gameTypes.ts';

const createEnemy = (name: string, hp: number, damage: number, flying = false, boss = false): Enemy => {
    return {
        name,
        hp,
        maxHp: hp,
        damage,
        flying,
        boss
    };
};

export const AREAS: Area[] = [
    {
        key: 'plains',
        name: 'The Forgotten Plains',
        gateX: 860,
        gateY: 355,
        color: 0x68b36d,
        card: 'green',
        encounters: [
            {
                name: 'Confused Slimes',
                enemies: [
                    createEnemy('Wobbly Slime', 28, 6),
                    createEnemy('Suspicious Mushroom', 24, 5)
                ]
            },
            {
                name: 'Corrupted Slime King',
                card: 'green',
                unlockHero: 'leon',
                enemies: [
                    createEnemy('Corrupted Slime King', 70, 9, false, true)
                ]
            }
        ]
    },
    {
        key: 'mountains',
        name: 'Ashen Mountains',
        gateX: 1360,
        gateY: 355,
        color: 0xb86a44,
        card: 'blue',
        encounters: [
            {
                name: 'Flying Ash Imps',
                enemies: [
                    createEnemy('Flying Ash Imp', 34, 8, true),
                    createEnemy('Sulfur Bat', 30, 7, true)
                ]
            },
            {
                name: 'Fallen Archangel',
                card: 'blue',
                unlockHero: 'knight',
                enemies: [
                    createEnemy('Fallen Archangel', 96, 12, true, true)
                ]
            }
        ]
    },
    {
        key: 'dungeon',
        name: 'Dungeon Depths',
        gateX: 1840,
        gateY: 355,
        color: 0x65507a,
        card: 'red',
        encounters: [
            {
                name: 'Creepy Corridor',
                enemies: [
                    createEnemy('Fear Acolyte', 48, 10),
                    createEnemy('Bad Vibes', 44, 9)
                ]
            },
            {
                name: 'Horned Reaper Lord',
                card: 'red',
                enemies: [
                    createEnemy('Horned Reaper Lord', 130, 15, false, true)
                ]
            }
        ]
    }
];

export const ENCOUNTER_BY_NAME = new Map<string, Encounter>(
    AREAS.flatMap(a => a.encounters.map(e => [e.name, e] as [string, Encounter]))
);

export const buildSkeletonEncounter = (count: number): Encounter => ({
    name: count === 1 ? 'Skeleton' : `Skeleton ×${count}`,
    enemies: Array.from({ length: count }, () => createEnemy('Skeleton Warrior', 40, 8))
});

export const DEFAULT_SKELETON_ENCOUNTER = buildSkeletonEncounter(1);
