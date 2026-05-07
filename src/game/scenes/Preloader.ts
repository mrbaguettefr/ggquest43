import { Scene } from "phaser";
import { getDebugSceneLaunch } from "../debugStart.ts";

const CLOUD_DIRECTIONS = ["down", "right", "up"] as const;
const CLOUD_ANIMATION_STATES = ["idle", "run"] as const;

type CloudDirection = (typeof CLOUD_DIRECTIONS)[number];
type CloudAnimationState = (typeof CLOUD_ANIMATION_STATES)[number];

type SpriteAtlasFrame = {
  x: number;
  y: number;
  w: number;
  h: number;
  duration?: number;
};

type SpriteAtlasData = {
  frames: Record<string, SpriteAtlasFrame>;
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
    this.load.tilemapTiledJSON(
      "worldmap",
      "Exploration/tileset/map-tiled.json",
    );
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
      "Exploration/world/characters/leon3-iso_idle_down-v1.png",
    );
    this.load.json(
      "leon-exploration-idle-down-json",
      "Exploration/world/characters/leon3-iso_idle_down-v1.json",
    );
    this.load.image(
      "mistress-exploration-idle-down-img",
      "Exploration/world/characters/mistress2-iso_idle_down-v1.png",
    );
    this.load.json(
      "mistress-exploration-idle-down-json",
      "Exploration/world/characters/mistress2-iso_idle_down-v1.json",
    );
    for (const state of CLOUD_ANIMATION_STATES) {
      for (const dir of CLOUD_DIRECTIONS) {
        this.load.image(
          this.getCloudAssetKey(state, dir, "img"),
          `Exploration/world/characters/cloud2-iso_${state}_${dir}-v1.png`,
        );
        this.load.json(
          this.getCloudAssetKey(state, dir, "json"),
          `Exploration/world/characters/cloud2-iso_${state}_${dir}-v1.json`,
        );
      }
    }
    this.load.spritesheet(
      "skeleton",
      "Exploration/world/monsters/skeleton.png",
      {
        frameWidth: 211,
        frameHeight: 225,
        spacing: 4,
      },
    );
    this.load.image(
      "king-slime-boss-exploration-idle-img",
      "Exploration/world/monsters/king-slime-boss-iso_idle_right-v1.png",
    );
    this.load.json(
      "king-slime-boss-exploration-idle-json",
      "Exploration/world/monsters/king-slime-boss-iso_idle_right-v1.json",
    );
    this.load.image(
      "battle-bg-plains",
      "Battle/background/battlefield-plains.png",
    );
    this.load.image(
      "battle-bg-dungeon",
      "Battle/background/battlefield-dungeon.png",
    );
    this.load.image(
      "battle-bg-lava-underground",
      "Battle/background/battlefield-lava-underground.png",
    );
    this.load.image(
      "cloud-battle-idle-img",
      "Battle/characters/cloud2-idle-v2.png",
    );
    this.load.json(
      "cloud-battle-idle-json",
      "Battle/characters/cloud2-idle-v2.json",
    );
    this.load.image(
      "enemy-battle-fallback-idle-img",
      "Battle/characters/cloud-idle-v1.png",
    );
    this.load.json(
      "enemy-battle-fallback-idle-json",
      "Battle/characters/cloud-idle-v1.json",
    );
    this.load.image(
      "leon-battle-idle-img",
      "Battle/characters/leon3-idle-v1.png",
    );
    this.load.json(
      "leon-battle-idle-json",
      "Battle/characters/leon3-idle-v1.json",
    );
    this.load.image(
      "mistress-battle-idle-img",
      "Battle/characters/mistress2-idle-v1.png",
    );
    this.load.json(
      "mistress-battle-idle-json",
      "Battle/characters/mistress2-idle-v1.json",
    );
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
      "mistress-exploration-idle-down",
      "mistress-exploration-idle-down-img",
      "mistress-exploration-idle-down-json",
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
    this.registerAtlas(
      "cloud-battle-idle",
      "cloud-battle-idle-img",
      "cloud-battle-idle-json",
    );
    this.registerAtlas(
      "enemy-battle-fallback-idle",
      "enemy-battle-fallback-idle-img",
      "enemy-battle-fallback-idle-json",
    );
    this.registerAtlas(
      "leon-battle-idle",
      "leon-battle-idle-img",
      "leon-battle-idle-json",
    );
    this.registerAtlas(
      "mistress-battle-idle",
      "mistress-battle-idle-img",
      "mistress-battle-idle-json",
    );

    this.createAtlasAnimation("battle-idle", "cloud-battle-idle", 8);
    this.createAtlasAnimation(
      "enemy-battle-fallback-idle",
      "enemy-battle-fallback-idle",
      8,
    );
    this.createAtlasAnimation("leon-battle-idle", "leon-battle-idle", 8);
    this.createAtlasAnimation(
      "mistress-battle-idle",
      "mistress-battle-idle",
      8,
    );
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
      "mistress-exploration-idle-down",
      "mistress-exploration-idle-down",
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
        ) as SpriteAtlasData | undefined;

        if (!atlas) {
          throw new Error(
            `Cloud ${state} atlas data is missing for ${direction}.`,
          );
        }

        this.textures.addAtlas(key, image, this.toPhaserAtlas(atlas));
      }
    }
  }

  private registerAtlas(key: string, imageKey: string, jsonKey: string) {
    if (this.textures.exists(key)) {
      return;
    }

    const image = this.textures
      .get(imageKey)
      .getSourceImage() as HTMLImageElement;
    const atlas = this.cache.json.get(jsonKey) as SpriteAtlasData | undefined;

    if (!atlas) {
      throw new Error(`${key} atlas data is missing.`);
    }

    this.textures.addAtlas(key, image, this.toPhaserAtlas(atlas));
  }

  private createAtlasAnimation(
    key: string,
    textureKey: string,
    frameRate: number,
  ) {
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

  private getCloudAtlasKey(
    state: CloudAnimationState,
    direction: CloudDirection,
  ) {
    return `cloud-${state}-${direction}`;
  }

  private toPhaserAtlas(atlas: SpriteAtlasData) {
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
