export type CardColor = 'green' | 'blue' | 'red';
export type AreaKey = 'plains' | 'dungeon' | 'lava-underground';
export type HeroKey = 'cloud' | 'leon' | 'mistress';

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
    unitHp?: number;
    unitDamage?: number;
    count?: number;
    battlefieldPosition?: number;
    flying?: boolean;
    boss?: boolean;
    battleTexture?: string;
    battleAnimation?: string;
    battleAttackTexture?: string;
    battleAttackAnimation?: string;
    battleScale?: number;
    explorationTexture?: string;
    explorationAnimation?: string;
    explorationScale?: number;
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

export type GameSession = {
    seedCode: string;
    playerName: string;
    secretGift: string;
    secretFragments: string[];
    revealedCards: Set<CardColor>;
    pendingCards: Set<CardColor>;
    defeatedEncounters: Set<string>;
    exploredTiles: Set<string>;
    heroes: Record<HeroKey, Hero>;
    currentArea?: Area;
    currentEncounter?: Encounter;
    currentEnemyObjectId?: number;
    currentLocation: string;
    preBattlePosition?: { x: number; y: number };
};

export type BattleResult = {
    won: boolean;
    area?: Area;
    encounter: Encounter;
    log: string[];
};
