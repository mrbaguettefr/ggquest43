import { Scene } from "phaser";
import { getDebugSceneLaunch } from "../debugStart.ts";

const CLOUD_DIRECTIONS = ["down", "right", "up"] as const;

type CloudDirection = (typeof CLOUD_DIRECTIONS)[number];

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

    this.load.image("logo", "logo.png");
    this.load.image(
      "tileset-wall",
      "tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Wall.png",
    );
    this.load.image(
      "tileset-stone",
      "tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Tileset Stone Ground.png",
    );
    this.load.image(
      "tileset-props",
      "tileset/Pixel Art Top Down - Basic v1.2.3/Texture/TX Props.png",
    );
    this.load.tilemapTiledJSON("worldmap", "tileset/map-tiled.json");
    for (const dir of CLOUD_DIRECTIONS) {
      this.load.image(`cloud-img-${dir}`, `world/characters/cloud-iso_idle_${dir}-v1.png`);
      this.load.json(`cloud-json-${dir}`, `world/characters/cloud-iso_idle_${dir}-v1.json`);
    }
    this.load.spritesheet("skeleton", "world/monsters/skeleton.png", {
      frameWidth: 211,
      frameHeight: 225,
      spacing: 4,
    });
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.
    this.registerCloudAtlases();

    const debugLaunch = getDebugSceneLaunch();

    if (debugLaunch) {
      this.scene.start(debugLaunch.scene, debugLaunch.data);
      return;
    }

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start("MainMenu");
  }

  private registerCloudAtlases() {
    for (const direction of CLOUD_DIRECTIONS) {
      const key = this.getCloudAtlasKey(direction);

      if (this.textures.exists(key)) {
        continue;
      }

      const image = this.textures
        .get(`cloud-img-${direction}`)
        .getSourceImage() as HTMLImageElement;
      const atlas = this.cache.json.get(`cloud-json-${direction}`) as CloudAtlasData | undefined;

      if (!atlas) {
        throw new Error(`Cloud atlas data is missing for ${direction}.`);
      }

      this.textures.addAtlas(key, image, this.toPhaserAtlas(atlas));
    }
  }

  private getCloudAtlasKey(direction: CloudDirection) {
    return `cloud-${direction}`;
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
