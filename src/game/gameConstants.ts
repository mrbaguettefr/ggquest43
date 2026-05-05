import type { CardColor } from "./gameTypes.ts";

export const WORLD_WIDTH = 2100;
export const WORLD_HEIGHT = 920;
export const PLAYER_SPEED = 200;
export const INTERACT_DISTANCE = 120;
export const FORCED_NAME = "GGLeBoss";
export const INITIAL_SEED_TEXT = "";
export const CARD_ORDER: CardColor[] = ["green", "blue", "red"];

export const CARD_LABELS: Record<CardColor, string> = {
  green: "Green Card",
  blue: "Blue Card",
  red: "Red Card",
};

export const CARD_COLORS: Record<CardColor, number> = {
  green: 0x3ab765,
  blue: 0x3d7df2,
  red: 0xd94848,
};
