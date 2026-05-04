import type { Hero, HeroKey } from './gameTypes.ts';

export const createInitialHeroes = (): Record<HeroKey, Hero> => {
    return {
        cloud: {
            key: 'cloud',
            name: 'Cloud',
            maxHp: 120,
            hp: 120,
            damage: 22,
            range: 'melee',
            special: 'Hangover Slash',
            recruited: true,
            unlocked: true
        },
        leon: {
            key: 'leon',
            name: 'Leon',
            maxHp: 100,
            hp: 100,
            damage: 20,
            range: 'ranged',
            special: 'Headshot',
            recruited: false,
            unlocked: false
        },
        knight: {
            key: 'knight',
            name: 'Knight',
            maxHp: 150,
            hp: 150,
            damage: 28,
            range: 'melee',
            special: 'Brutal Strike',
            recruited: false,
            unlocked: false
        }
    };
};
