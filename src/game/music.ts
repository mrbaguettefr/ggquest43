import { Math as PhaserMath, Scene } from "phaser";
import type { AreaKey } from "./gameTypes.ts";

type MusicSound = Phaser.Sound.BaseSound & {
  volume: number;
};

const EXPLORATION_MUSIC_BY_AREA: Record<AreaKey, string> = {
  plains: "music-plains",
  dungeon: "music-dungeon",
  "lava-underground": "music-lava",
};

const COMBAT_MUSIC_KEYS = ["music-combat-1", "music-combat-2", "music-combat-3"];
const MUSIC_VOLUME = 0.72;

let currentMusic: MusicSound | undefined;
let currentMusicKey: string | undefined;

export const getExplorationMusicKey = (areaKey: AreaKey | undefined) =>
  areaKey ? EXPLORATION_MUSIC_BY_AREA[areaKey] : "music-center";

export const getRandomCombatMusicKey = (): string =>
  PhaserMath.RND.pick(COMBAT_MUSIC_KEYS);

export const playMusic = (
  scene: Scene,
  key: string,
  fadeDuration = 600,
) => {
  if (currentMusicKey === key && currentMusic) {
    return;
  }

  const previousMusic = currentMusic;
  const nextMusic = scene.sound.add(key) as MusicSound;
  nextMusic.volume = 0;
  nextMusic.play({
    loop: true,
    volume: 0,
  });

  currentMusicKey = key;
  currentMusic = nextMusic;

  if (fadeDuration <= 0) {
    nextMusic.volume = MUSIC_VOLUME;
  } else {
    scene.tweens.add({
      targets: nextMusic,
      volume: MUSIC_VOLUME,
      duration: fadeDuration,
    });
  }

  if (!previousMusic || previousMusic === nextMusic) {
    return;
  }

  scene.tweens.killTweensOf(previousMusic);

  if (fadeDuration <= 0) {
    previousMusic.stop();
    previousMusic.destroy();
  } else {
    scene.tweens.add({
      targets: previousMusic,
      volume: 0,
      duration: fadeDuration,
      onComplete: () => {
        previousMusic.stop();
        previousMusic.destroy();
      },
    });
  }
};

export const stopMusic = (scene: Scene, fadeDuration = 500) => {
  if (!currentMusic) {
    return;
  }

  const previousMusic = currentMusic;
  currentMusic = undefined;
  currentMusicKey = undefined;

  scene.tweens.add({
    targets: previousMusic,
    volume: 0,
    duration: fadeDuration,
    onComplete: () => {
      previousMusic.stop();
      previousMusic.destroy();
    },
  });
};
