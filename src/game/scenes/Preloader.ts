import { Scene } from "phaser";
import { getDebugSceneLaunch } from "../debugStart.ts";

const CLOUD_DIRECTIONS = ["down", "right", "up"] as const;
const CLOUD_ANIMATION_STATES = ["idle", "walk"] as const;

type CloudDirection = (typeof CLOUD_DIRECTIONS)[number];
type CloudAnimationState = (typeof CLOUD_ANIMATION_STATES)[number];

type CloudAtlasFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  duration?: number;
};

type CloudAtlasData = {
  frames: Record<string, CloudAtlasFrame>;
  meta?: object;
};

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {
    this.add.image(512, 384, "background");

    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    this.load.on("progress", (progress: number) => {
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    this.load.setPath("assets");

    this.load.image("main-menu-logo", "MainMenu/main-menu-logo.png");
    this.load.image("wall-0", "Wall/wall-0.png");
    this.load.spritesheet("wall-inserted-cards", "Wall/inserted-cards.png", {
      frameWidth: 436,
      frameHeight: 459,
      spacing: 1,
    });
    this.load.image(
      "tileset-wall",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Wall.png",
    );
    this.load.image(
      "tileset-stone",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Stone Ground.png",
    );
    this.load.image(
      "tileset-grass",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Grass.png",
    );
    this.load.image(
      "tileset-props",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Props.png",
    );
    this.load.image(
      "tileset-plants",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Plant.png",
    );
    this.load.image(
      "tileset-lava-ground",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/lava-ground.png",
    );
    this.load.image(
      "tileset-lava-walls",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/lava-walls.png",
    );
    this.load.image(
      "tileset-structs",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Struct.png",
    );
    this.load.tilemapTiledJSON("worldmap", "Exploration/tileset/map-tiled.json");
    this.load.image(
      "baguettefr-idle-down-img",
      "Exploration/world/characters/baguettefr-iso_idle_down-v1.png",
    );
    this.load.json(
      "baguettefr-idle-down-json",
      "Exploration/world/characters/baguettefr-iso_idle_down-v1.json",
    );
    this.load.image(
      "leon-exploration-idle-down-img",
      "Exploration/world/characters/leon-iso_idle_down-v1.png",
    );
    this.load.json(
      "leon-exploration-idle-down-json",
      "Exploration/world/characters/leon-iso_idle_down-v1.json",
    );
    for (const state of CLOUD_ANIMATION_STATES) {
      for (const dir of CLOUD_DIRECTIONS) {
        this.load.image(
          this.getCloudAssetKey(state, dir, "img"),
          `Exploration/world/characters/cloud-iso_${state}_${dir}-v1.png`,
        );
        this.load.json(
          this.getCloudAssetKey(state, dir, "json"),
          `Exploration/world/characters/cloud-iso_${state}_${dir}-v1.json`,
        );
      }
    }
    this.load.spritesheet("skeleton", "Exploration/world/monsters/skeleton.png", {
      frameWidth: 211,
      frameHeight: 225,
      spacing: 4,
    });
    this.load.image(
      "king-slime-boss-exploration-idle-img",
      "Exploration/world/monsters/king-slime-boss-iso_idle_right-v1.png",
    );
    this.load.json(
      "king-slime-boss-exploration-idle-json",
      "Exploration/world/monsters/king-slime-boss-iso_idle_right-v1.json",
    );
    this.load.image("battle-bg-green", "Battle/background/battlefield-green.png");
    this.load.image("battle-bg-cave", "Battle/background/battlefield-cave.png");
    this.load.image("battle-bg-lava", "Battle/background/battlefield-lava.png");
    this.load.spritesheet("cloud-battle-idle", "Battle/characters/cloud-idle-v1.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.spritesheet("leon-battle-idle", "Battle/characters/leon-idle_with_pistol_in_hand-v1.png", {
      frameWidth: 256,
      frameHeight: 256,
    });
    this.load.image(
      "king-slime-boss-battle-idle-img",
      "Battle/monsters/king-slime-boss-idle-v1.png",
    );
    this.load.json(
      "king-slime-boss-battle-idle-json",
      "Battle/monsters/king-slime-boss-idle-v1.json",
    );
  }

  create() {
    this.registerCloudAtlases();
    this.registerAtlas(
      "baguettefr-idle-down",
      "baguettefr-idle-down-img",
      "baguettefr-idle-down-json",
    );
    this.registerAtlas(
      "leon-exploration-idle-down",
      "leon-exploration-idle-down-img",
      "leon-exploration-idle-down-json",
    );
    this.registerAtlas(
      "king-slime-boss-exploration-idle",
      "king-slime-boss-exploration-idle-img",
      "king-slime-boss-exploration-idle-json",
    );
    this.registerAtlas(
      "king-slime-boss-battle-idle",
      "king-slime-boss-battle-idle-img",
      "king-slime-boss-battle-idle-json",
    );

    if (!this.anims.exists("battle-idle")) {
      this.anims.create({
        key: "battle-idle",
        frames: this.anims.generateFrameNumbers("cloud-battle-idle", { start: 0, end: 24 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!this.anims.exists("leon-battle-idle")) {
      this.anims.create({
        key: "leon-battle-idle",
        frames: this.anims.generateFrameNumbers("leon-battle-idle", { start: 0, end: 24 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    this.createAtlasAnimation(
      "baguettefr-idle-down",
      "baguettefr-idle-down",
      8,
    );
    this.createAtlasAnimation(
      "leon-exploration-idle-down",
      "leon-exploration-idle-down",
      8,
    );
    this.createAtlasAnimation(
      "king-slime-boss-exploration-idle",
      "king-slime-boss-exploration-idle",
      6,
    );
    this.createAtlasAnimation(
      "king-slime-boss-battle-idle",
      "king-slime-boss-battle-idle",
      8,
    );

    const debugLaunch = getDebugSceneLaunch();

    if (debugLaunch) {
      this.scene.start(debugLaunch.scene, debugLaunch.data);
      return;
    }

    this.scene.start("Seed");
  }

  private registerCloudAtlases() {
    for (const state of CLOUD_ANIMATION_STATES) {
      for (const direction of CLOUD_DIRECTIONS) {
        const key = this.getCloudAtlasKey(state, direction);

        if (this.textures.exists(key)) {
          continue;
        }

        const image = this.textures
          .get(this.getCloudAssetKey(state, direction, "img"))
          .getSourceImage() as HTMLImageElement;
        const atlas = this.cache.json.get(
          this.getCloudAssetKey(state, direction, "json"),
        ) as CloudAtlasData | undefined;

        if (!atlas) {
          throw new Error(`Cloud ${state} atlas data is missing for ${direction}.`);
        }

        this.textures.addAtlas(key, image, this.toPhaserAtlas(atlas));
      }
    }
  }

  private registerAtlas(key: string, imageKey: string, jsonKey: string) {
    if (this.textures.exists(key)) {
      return;
    }

    const image = this.textures.get(imageKey).getSourceImage() as HTMLImageElement;
    const atlas = this.cache.json.get(jsonKey) as CloudAtlasData | undefined;

    if (!atlas) {
      throw new Error(`${key} atlas data is missing.`);
    }

    this.textures.addAtlas(key, image, this.toPhaserAtlas(atlas));
  }

  private createAtlasAnimation(key: string, textureKey: string, frameRate: number) {
    if (this.anims.exists(key)) {
      return;
    }

    this.anims.create({
      key,
      frames: this.anims.generateFrameNames(textureKey, {
        start: 0,
        end: 24,
      }),
      frameRate,
      repeat: -1,
    });
  }

  private getCloudAssetKey(
    state: CloudAnimationState,
    direction: CloudDirection,
    kind: "img" | "json",
  ) {
    return `cloud-${state}-${kind}-${direction}`;
  }

  private getCloudAtlasKey(state: CloudAnimationState, direction: CloudDirection) {
    return `cloud-${state}-${direction}`;
  }

  private toPhaserAtlas(atlas: CloudAtlasData) {
    const frames = Object.fromEntries(
      Object.entries(atlas.frames).map(([key, frame]) => [
        key,
        {
          frame: {
            x: frame.x,
            y: frame.y,
            w: frame.w,
            h: frame.h,
          },
          rotated: false,
          trimmed: false,
          spriteSourceSize: {
            x: 0,
            y: 0,
            w: frame.w,
            h: frame.h,
          },
          sourceSize: {
            w: frame.w,
            h: frame.h,
          },
          duration: frame.duration,
        },
      ]),
    );

    return {
      frames,
      meta: atlas.meta,
    };
  }
}
