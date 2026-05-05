import { AREAS } from "./encounters.ts";
import { createGameSession } from "./gameSession.ts";
import { splitSecret } from "./secret.ts";
import type { Area, Encounter, GameSession, HeroKey } from "./gameTypes.ts";

type DebugStartScene =
  | "MainMenu"
  | "Seed"
  | "PlayerName"
  | "Exploration"
  | "Battle"
  | "Credits"
  | "GameOver";

type DebugSceneLaunch = {
  scene: DebugStartScene;
  data?: object;
};

const DEBUG_SCENE_PARAM = "debugScene";
const DEBUG_AREA_PARAM = "area";
const DEBUG_ENCOUNTER_PARAM = "encounter";
const DEBUG_TILE_X_PARAM = "tileX";
const DEBUG_TILE_Y_PARAM = "tileY";

const STARTABLE_SCENES: DebugStartScene[] = [
  "MainMenu",
  "Seed",
  "PlayerName",
  "Exploration",
  "Battle",
  "Credits",
  "GameOver",
];

export const getDebugSceneLaunch = (): DebugSceneLaunch | undefined => {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  const params = new URLSearchParams(window.location.search);
  const requestedScene = params.get(DEBUG_SCENE_PARAM);

  if (!isDebugStartScene(requestedScene)) {
    return undefined;
  }

  if (requestedScene === "PlayerName") {
    return { scene: requestedScene, data: { session: createDebugSession() } };
  }

  if (requestedScene === "Exploration") {
    const tx = params.get(DEBUG_TILE_X_PARAM);
    const ty = params.get(DEBUG_TILE_Y_PARAM);
    const startTile =
      tx !== null && ty !== null
        ? { x: parseInt(tx, 10), y: parseInt(ty, 10) }
        : undefined;
    return {
      scene: requestedScene,
      data: { session: createDebugSession(), startTile },
    };
  }

  if (requestedScene === "Battle") {
    return {
      scene: "Battle",
      data: { session: createDebugBattleSession(params) },
    };
  }

  return { scene: requestedScene };
};

const isDebugStartScene = (scene: string | null): scene is DebugStartScene => {
  return STARTABLE_SCENES.includes(scene as DebugStartScene);
};

const createDebugBattleSession = (params: URLSearchParams): GameSession => {
  const session = createDebugSession();
  const area = getDebugArea(params);
  const encounter = getDebugEncounter(area, params);

  session.currentArea = area;
  session.currentEncounter = cloneEncounter(encounter);
  session.currentLocation = area.name;

  return session;
};

const createDebugSession = (): GameSession => {
  const secretGift = "DEBUG-SECRET-GIFT";
  const session = createGameSession();

  session.seedCode = "DEBUG-SEED";
  session.playerName = "GGLeBoss";
  session.welcomeMessage = "Debug welcome message";
  session.secretGift = secretGift;
  session.secretFragments = splitSecret(secretGift);

  recruitDebugHeroes(session, ["cloud", "leon", "knight"]);

  return session;
};

const recruitDebugHeroes = (session: GameSession, heroKeys: HeroKey[]) => {
  heroKeys.forEach((heroKey) => {
    const hero = session.heroes[heroKey];
    hero.unlocked = true;
    hero.recruited = true;
    hero.hp = hero.maxHp;
  });
};

const getDebugArea = (params: URLSearchParams): Area => {
  const requestedArea = params.get(DEBUG_AREA_PARAM);

  return (
    AREAS.find(
      (area) => area.key === requestedArea || area.name === requestedArea,
    ) ?? AREAS[0]
  );
};

const getDebugEncounter = (area: Area, params: URLSearchParams): Encounter => {
  const requestedEncounter = params.get(DEBUG_ENCOUNTER_PARAM);
  const requestedEncounterIndex = Number(requestedEncounter);

  if (Number.isInteger(requestedEncounterIndex)) {
    return area.encounters[requestedEncounterIndex] ?? area.encounters[0];
  }

  return (
    area.encounters.find(
      (encounter) => encounter.name === requestedEncounter,
    ) ?? area.encounters[0]
  );
};

const cloneEncounter = (encounter: Encounter): Encounter => {
  return {
    ...encounter,
    enemies: encounter.enemies.map((enemy) => ({ ...enemy })),
  };
};
