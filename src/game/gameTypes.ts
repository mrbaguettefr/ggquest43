export type CardColor = 'green' | 'blue' | 'red';
export type GamePhase = 'seed' | 'welcome' | 'name' | 'explore' | 'battle' | 'message' | 'complete';
export type AreaKey = 'plains' | 'mountains' | 'dungeon';
export type HeroKey = 'cloud' | 'leon' | 'knight';

export type Hero = {
    key: HeroKey;
    name: string;
    maxHp: number;
    hp: number;
    damage: number;
    range: 'melee' | 'ranged';
    special: string;
    recruited: boolean;
    unlocked: boolean;
};

export type Enemy = {
    name: string;
    hp: number;
    maxHp: number;
    damage: number;
    flying?: boolean;
    boss?: boolean;
};

export type Encounter = {
    name: string;
    enemies: Enemy[];
    card?: CardColor;
    unlockHero?: HeroKey;
};

export type Area = {
    key: AreaKey;
    name: string;
    gateX: number;
    gateY: number;
    color: number;
    card: CardColor;
    encounters: Encounter[];
};
