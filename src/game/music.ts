import { Math as PhaserMath, Scene } from "phaser";
import type { AreaKey } from "./gameTypes.ts";

type MusicSound = Phaser.Sound.BaseSound & {
  volume: number;
  setVolume(value: number): MusicSound;
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
  if (currentMusicKey === key && currentMusic?.isPlaying) {
    return;
  }

  const previousMusic = currentMusic;
  currentMusicKey = key;
  currentMusic = scene.sound.add(key, {
    loop: true,
    volume: 0,
  }) as MusicSound;
  currentMusic.play();

  scene.tweens.add({
    targets: currentMusic,
    volume: MUSIC_VOLUME,
    duration: fadeDuration,
    onUpdate: () => currentMusic?.setVolume(currentMusic.volume),
  });

  if (!previousMusic) {
    return;
  }

  scene.tweens.add({
    targets: previousMusic,
    volume: 0,
    duration: fadeDuration,
    onUpdate: () => previousMusic.setVolume(previousMusic.volume),
    onComplete: () => {
      previousMusic.stop();
      previousMusic.destroy();
    },
  });
};
