import { createInitialHeroes } from './heroes.ts';
import type { GameSession } from './gameTypes.ts';

export const createGameSession = (): GameSession => {
    return {
        seedCode: '',
        playerName: '',
        secretGift: '',
        secretFragments: [],
        revealedCards: new Set(),
        pendingCards: new Set(),
        defeatedEncounters: new Set(),
        exploredTiles: new Set(),
        heroes: createInitialHeroes(),
        currentLocation: 'Center of the World'
    };
};
