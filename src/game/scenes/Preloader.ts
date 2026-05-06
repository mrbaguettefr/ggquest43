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
    //  We loaded this image in our Boot Scene, so we can display it here
    this.add.image(512, 384, "background");

    //  A simple progress bar. This is the outline of the bar.
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

    //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

    //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
    this.load.on("progress", (progress: number) => {
      //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
      bar.width = 4 + 460 * progress;
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
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
      "tileset-props",
      "Exploration/tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Props.png",
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
    this.load.image("battle-bg", "Battle/background/battlefield-cave.png");
    this.load.spritesheet("cloud-battle-idle", "Battle/characters/cloud-idle-v1.png", {
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
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.
    this.registerCloudAtlases();
    this.registerAtlas(
      "baguettefr-idle-down",
      "baguettefr-idle-down-img",
      "baguettefr-idle-down-json",
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
    this.createAtlasAnimation(
      "baguettefr-idle-down",
      "baguettefr-idle-down",
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

    //  Move to Seed first so the game session is ready before MainMenu.
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
