import { Input, Math as PhaserMath, Scene, WEBGL } from "phaser";
import {
  AREAS,
  KING_SLIME_BOSS_ENCOUNTER,
  resolveEncounter,
} from "../encounters.ts";
import {
  CARD_LABELS,
  INTERACT_DISTANCE,
  PLAYER_SPEED,
} from "../gameConstants.ts";
import { installDebugDialog } from "../debugDialog.ts";
import type {
  BattleResult,
  Encounter,
  GameSession,
  HeroKey,
  Area,
} from "../gameTypes.ts";

type MapEnemy = {
  objectId: number;
  encounter: Encounter;
  area?: Area;
  sprite: Phaser.GameObjects.Sprite;
};

type MapNpc = {
  name: "baguettefr";
  sprite: Phaser.GameObjects.Sprite;
};

type MapHeroSpawn = {
  heroKey: HeroKey;
  sprite: Phaser.GameObjects.Sprite;
};

type InteractionHighlightTarget =
  | { kind: "sprite"; sprite: Phaser.GameObjects.Sprite }
  | { kind: "point"; x: number; y: number; width: number; height: number };

type TiledObjectProperty = {
  name: string;
  value: unknown;
};

type PlayerDirection = "down" | "right" | "up";
type PlayerAnimationState = "idle" | "walk";

const PLAYER_ANIMATION_DIRECTIONS: PlayerDirection[] = ["down", "right", "up"];
const PLAYER_ANIMATION_STATES: PlayerAnimationState[] = ["idle", "walk"];
const CLOUD_FRAME_COUNT = 25;
const PLAYER_COLLISION_RADIUS = 14;
const MAP_CHARACTER_COLLISION_DISTANCE = INTERACT_DISTANCE - 2;
const OUTLINE_THICKNESS = 2;
const SPRITE_HIGHLIGHT_OUTER_STRENGTH = 10;
const SPRITE_HIGHLIGHT_INNER_STRENGTH = 0;
const SPRITE_HIGHLIGHT_QUALITY = 10;
const SPRITE_HIGHLIGHT_DISTANCE = 8;
const KNIGHT_RECRUIT_POINT = { x: 575, y: 620 };
const WALL_HIGHLIGHT_SIZE = { width: 52, height: 52 };
const POINT_HIGHLIGHT_SIZE = { width: 36, height: 36 };
const BAGUETTEFR_DIALOG_LINES = [
  "I have seen many walls with holes. Usually they want cards. Sometimes they want emotional support.",
  "One color is a whisper. Three colors become a secret. I recommend whispering back in the correct order.",
  "The gift is not in the monsters. The monsters are just aggressively holding the stationery.",
  "When the wall has all three cards, read what it shows exactly. The reward is hiding in plain sight.",
];
const REQUIRED_MAP_OBJECTS = ["start", "wall-interaction"];
const AREA_OBJECT_KEYS = ["area-1", "area-2", "area-3"] as const;
const TILED_GID_MASK = 0x1fffffff;
const MAP_OBJECT_DEPTH_BASE = 2;
const MAP_OBJECT_DEPTH_SCALE = 10000;

export class Exploration extends Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
  private player: Phaser.GameObjects.Sprite;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private uiCamera: Phaser.Cameras.Scene2D.Camera;
  private infoText: Phaser.GameObjects.Text;
  private partyText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private interactionText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private interactionHighlight: Phaser.GameObjects.Graphics;
  private highlightedSprite: Phaser.GameObjects.Sprite | undefined;
  private highlightedSpriteGlow: Phaser.Filters.Glow | undefined;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private hudObjects: Phaser.GameObjects.GameObject[] = [];
  private session: GameSession;
  private messageAfterClose: (() => void) | undefined;
  private inputLocked = false;

  private groundLayer: Phaser.Tilemaps.TilemapLayer;
  private blockingLayer: Phaser.Tilemaps.TilemapLayer;
  private startPoint: { x: number; y: number };
  private wallInteractionPoint: { x: number; y: number };
  private mapEnemies: MapEnemy[];
  private mapNpcs: MapNpc[];
  private mapHeroSpawns: MapHeroSpawn[];
  private mapHeroSpawnPoints: Partial<
    Record<HeroKey, { x: number; y: number }>
  >;
  private areaPolygons: Array<{
    area: Area;
    vertices: Array<{ x: number; y: number }>;
  }>;
  private fogGraphics: Phaser.GameObjects.Graphics;
  private fogTileRevealRadius: number;
  private mapTileWidth: number;
  private mapTileHeight: number;
  private playerDirection: PlayerDirection = "down";
  private playerFacingLeft = false;

  constructor() {
    super("Exploration");
  }

  create(data: {
    session: GameSession;
    battleResult?: BattleResult;
    startTile?: { x: number; y: number };
    startPosition?: { x: number; y: number };
  }) {
    this.session = data.session;
    this.inputLocked = false;
    this.messageAfterClose = undefined;
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x1c2740);
    this.camera.setZoom(2);

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({
      w: Input.Keyboard.KeyCodes.W,
      a: Input.Keyboard.KeyCodes.A,
      s: Input.Keyboard.KeyCodes.S,
      d: Input.Keyboard.KeyCodes.D,
    }) as Record<"w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;
    this.createWorld(data.startTile, data.startPosition);
    this.createHud();
    this.setupUiCamera();
    installDebugDialog(this, {
      session: this.session,
      onSessionChanged: () => {
        this.refreshMapHeroSpawns();
        this.updateHud();
      },
    });
    this.registerInput();
    this.applyBattleResult(data.battleResult);
    this.camera.centerOn(this.player.x, this.player.y);
    this.updateFog();
  }

  update(_time: number, delta: number) {
    if (this.inputLocked) {
      return;
    }

    const distance = PLAYER_SPEED * (delta / 1000);
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown || this.wasdKeys.a.isDown) {
      velocityX = -1;
    } else if (this.cursors.right.isDown || this.wasdKeys.d.isDown) {
      velocityX = 1;
    }

    if (this.cursors.up.isDown || this.wasdKeys.w.isDown) {
      velocityY = -1;
    } else if (this.cursors.down.isDown || this.wasdKeys.s.isDown) {
      velocityY = 1;
    }

    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.7;
      velocityY *= 0.7;
    }

    if (velocityX !== 0 || velocityY !== 0) {
      const newX = this.player.x + velocityX * distance;
      const newY = this.player.y + velocityY * distance;

      if (this.canMoveTo(newX, newY)) {
        this.player.x = newX;
        this.player.y = newY;
      } else if (this.canMoveTo(newX, this.player.y)) {
        this.player.x = newX;
      } else if (this.canMoveTo(this.player.x, newY)) {
        this.player.y = newY;
      }
    }

    const moving = velocityX !== 0 || velocityY !== 0;

    if (moving) {
      this.playerDirection = this.getPlayerDirection(velocityX, velocityY);

      if (this.playerDirection === "right" && velocityX !== 0) {
        this.playerFacingLeft = velocityX < 0;
      } else {
        this.playerFacingLeft = false;
      }
    }

    this.player.setFlipX(
      this.playerDirection === "right" && this.playerFacingLeft,
    );
    this.player.play(
      this.getPlayerAnimationKey(
        moving ? "walk" : "idle",
        this.playerDirection,
      ),
      true,
    );
    this.player.setDepth(this.getMapObjectDepth(this.player.y));

    this.updateInteractionState();
    this.updateFog();
  }

  private createWorld(
    startTile?: { x: number; y: number },
    startPosition?: { x: number; y: number },
  ) {
    const map = this.make.tilemap({ key: "worldmap" });
    const wallsTs = map.addTilesetImage("walls", "tileset-wall");
    const stoneTs = map.addTilesetImage("stone-ground", "tileset-stone");
    const propsTs = map.addTilesetImage("props", "tileset-props");
    const skeletonTs = map.addTilesetImage("skeleton", "skeleton");
    const grassTs = map.addTilesetImage("grass-ground", "tileset-grass");
    const plantsTs = map.addTilesetImage("TX Plant", "tileset-plants");
    const lavaGroundTs = map.addTilesetImage(
      "lava-ground",
      "tileset-lava-ground",
    );
    const lavaWallsTs = map.addTilesetImage(
      "lava-walls",
      "tileset-lava-walls",
    );
    const structsTs = map.addTilesetImage("structs", "tileset-structs");
    const allTilesets = [
      wallsTs!,
      stoneTs!,
      propsTs!,
      skeletonTs!,
      grassTs!,
      plantsTs!,
      lavaGroundTs!,
      lavaWallsTs!,
      structsTs!,
    ];

    const prototypeLayer = map
      .createLayer("p-ground-1", allTilesets)
      ?.setDepth(-2);
    this.trackWorldObject(prototypeLayer);
    this.groundLayer = map
      .createLayer("ground-1", allTilesets)!
      .setDepth(-1) as Phaser.Tilemaps.TilemapLayer;
    this.trackWorldObject(this.groundLayer);
    const wallsLayer = map
      .createLayer("walls-1", allTilesets)!
      .setDepth(0) as Phaser.Tilemaps.TilemapLayer;
    this.trackWorldObject(wallsLayer);
    const decoGroundLayer = map
      .createLayer("ground-1-deco", allTilesets)
      ?.setDepth(1);
    this.trackWorldObject(decoGroundLayer);
    this.blockingLayer = map
      .createLayer("ground-1-deco-blocking", allTilesets)!
      .setDepth(1) as Phaser.Tilemaps.TilemapLayer;
    this.trackWorldObject(this.blockingLayer);

    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.extractMapObjects(map);

    if (startTile) {
      this.startPoint = {
        x: startTile.x * map.tileWidth + map.tileWidth / 2,
        y: startTile.y * map.tileHeight + map.tileHeight / 2,
      };
    } else if (startPosition) {
      this.startPoint = startPosition;
    }

    this.createPlayerAnimations();

    this.player = this.add
      .sprite(this.startPoint.x, this.startPoint.y, "cloud-idle-down", "0")
      .play(this.getPlayerAnimationKey("idle", this.playerDirection));
    this.player
      .setOrigin(0.5, 0.7)
      .setScale(64 / this.player.width)
      .setDepth(this.getMapObjectDepth(this.player.y));
    this.trackWorldObject(this.player);
    this.createMapPlantObjects(map, plantsTs!);

    this.interactionHighlight = this.add.graphics().setDepth(3.5);
    this.trackWorldObject(this.interactionHighlight);

    const decoTopLayer = map.createLayer("ground-1-deco-2", allTilesets)?.setDepth(3);
    this.trackWorldObject(decoTopLayer);

    this.createFog(map);
    this.camera.startFollow(this.player, true, 0.08, 0.08);
  }

  private createPlayerAnimations() {
    for (const state of PLAYER_ANIMATION_STATES) {
      for (const direction of PLAYER_ANIMATION_DIRECTIONS) {
        const key = this.getPlayerAnimationKey(state, direction);

        if (this.anims.exists(key)) {
          continue;
        }

        this.anims.create({
          key,
          frames: this.anims.generateFrameNames(`cloud-${state}-${direction}`, {
            start: 0,
            end: CLOUD_FRAME_COUNT - 1,
          }),
          frameRate: state === "walk" ? 16 : 8,
          repeat: -1,
        });
      }
    }
  }

  private getPlayerDirection(
    velocityX: number,
    velocityY: number,
  ): PlayerDirection {
    if (Math.abs(velocityY) > Math.abs(velocityX)) {
      return velocityY < 0 ? "up" : "down";
    }

    return "right";
  }

  private getPlayerAnimationKey(
    state: PlayerAnimationState,
    direction: PlayerDirection,
  ) {
    return `cloud-${state}-${direction}`;
  }

  private createFog(map: Phaser.Tilemaps.Tilemap) {
    this.mapTileWidth = map.tileWidth;
    this.mapTileHeight = map.tileHeight;
    this.fogTileRevealRadius = Math.round(
      Math.min(this.scale.width, this.scale.height) /
        (4 * this.camera.zoom * map.tileWidth),
    );

    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(4);
    this.trackWorldObject(this.fogGraphics);

    this.updateFog();
  }

  private updateFog() {
    const tw = this.mapTileWidth;
    const th = this.mapTileHeight;
    const r = this.fogTileRevealRadius;
    const tileX = Math.floor(this.player.x / tw);
    const tileY = Math.floor(this.player.y / th);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        this.session.exploredTiles.add(`${tileX + dx},${tileY + dy}`);
      }
    }

    const view = this.camera.worldView;
    const startTX = Math.floor(view.left / tw) - 1;
    const startTY = Math.floor(view.top / th) - 1;
    const endTX = Math.ceil(view.right / tw) + 1;
    const endTY = Math.ceil(view.bottom / th) + 1;

    this.fogGraphics.clear();
    this.fogGraphics.fillStyle(0x000000, 1);

    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        if (!this.session.exploredTiles.has(`${tx},${ty}`)) {
          this.fogGraphics.fillRect(tx * tw, ty * th, tw, th);
        }
      }
    }
  }

  private extractMapObjects(map: Phaser.Tilemaps.Tilemap) {
    const layer = map.getObjectLayer("objects");
    if (!layer) {
      throw new Error('Map is missing required object layer "objects"');
    }

    const find = (name: string) => layer.objects.find((o) => o.name === name);

    const missing = REQUIRED_MAP_OBJECTS.filter((name) => !find(name));
    if (missing.length > 0) {
      throw new Error(`Map is missing required objects: ${missing.join(", ")}`);
    }

    const startObj = find("start")!;
    this.startPoint = { x: startObj.x!, y: startObj.y! };

    const wallObj = find("wall-interaction")!;
    this.wallInteractionPoint = { x: wallObj.x!, y: wallObj.y! };
    const leonObj = find("leon");
    this.mapHeroSpawnPoints = {
      ...(leonObj ? { leon: { x: leonObj.x!, y: leonObj.y! } } : {}),
    };

    this.areaPolygons = AREA_OBJECT_KEYS.flatMap((key, i) => {
      const object = find(key);

      if (!object) {
        return [];
      }

      return [
        {
          area: AREAS[i],
          vertices: (object.polygon ?? []).map((vertex) => ({
            x: object.x! + vertex.x,
            y: object.y! + vertex.y,
          })),
        },
      ];
    });

    if (!this.anims.exists("skeleton-walk")) {
      this.anims.create({
        key: "skeleton-walk",
        frames: this.anims.generateFrameNumbers("skeleton", {
          start: 0,
          end: 7,
        }),
        frameRate: 4,
        repeat: -1,
      });
    }

    this.mapEnemies = layer.objects
      .filter((object) => this.isMapEnemyObject(object))
      .flatMap((object) => {
        const objectId = object.id!;

        if (this.session.defeatedEncounters.has(`enemy:${objectId}`)) {
          return [];
        }

        const encounter = this.getMapEncounter(object);
        const area = this.getAreaAtPosition(object.x!, object.y!);
        const sprite = this.createMapEnemySprite(object, encounter);
        this.trackWorldObject(sprite);
        return [{ objectId, encounter, area, sprite }];
      });

    this.mapNpcs = layer.objects
      .filter((object) => object.name === "baguettefr")
      .map((object) => {
        const sprite = this.add
          .sprite(object.x!, object.y!, "baguettefr-idle-down", "0")
          .play("baguettefr-idle-down")
          .setOrigin(0.5, 0.75)
          .setDepth(this.getMapObjectDepth(object.y!))
          .setScale(64 / 256);
        this.trackWorldObject(sprite);
        return { name: "baguettefr", sprite };
      });

    this.mapHeroSpawns = [];
    this.refreshMapHeroSpawns();
  }

  private createMapPlantObjects(
    map: Phaser.Tilemaps.Tilemap,
    tileset: Phaser.Tilemaps.Tileset,
  ) {
    const layer = map.getObjectLayer("objects");
    if (!layer) return;

    layer.objects
      .filter((object) => object.name === "plant" && object.visible !== false)
      .forEach((object) => {
        const gid = (object.gid ?? 0) & TILED_GID_MASK;
        const tileIndex = gid - tileset.firstgid;
        if (tileIndex < 0) return;

        const frameName = `plant-object-${tileIndex}`;
        if (!this.textures.get("tileset-plants").has(frameName)) {
          const column = tileIndex % tileset.columns;
          const row = Math.floor(tileIndex / tileset.columns);
          this.textures.get("tileset-plants").add(
            frameName,
            0,
            column * tileset.tileWidth,
            row * tileset.tileHeight,
            tileset.tileWidth,
            tileset.tileHeight,
          );
        }

        const plant = this.add
          .image(object.x!, object.y!, "tileset-plants", frameName)
          .setOrigin(0, 1)
          .setDepth(this.getMapObjectDepth(object.y!));
        this.trackWorldObject(plant);
      });
  }

  private getMapObjectDepth(y: number) {
    return MAP_OBJECT_DEPTH_BASE + y / MAP_OBJECT_DEPTH_SCALE;
  }

  private refreshMapHeroSpawns() {
    this.mapHeroSpawns.forEach((spawn) => {
      spawn.sprite.destroy();
    });
    this.mapHeroSpawns = [];
    this.addMapHeroSpawn("leon", "leon-exploration-idle-down");
  }

  private addMapHeroSpawn(heroKey: HeroKey, textureKey: string) {
    const point = this.mapHeroSpawnPoints[heroKey];
    const hero = this.session.heroes[heroKey];
    const existing = this.mapHeroSpawns.some(
      (spawn) => spawn.heroKey === heroKey,
    );

    if (!point || existing || !hero.unlocked || hero.recruited) {
      return;
    }

    const sprite = this.add
      .sprite(point.x, point.y, textureKey, "0")
      .play(textureKey)
      .setOrigin(0.5, 0.75)
      .setDepth(this.getMapObjectDepth(point.y))
      .setScale(64 / 256);
    this.trackWorldObject(sprite);
    this.mapHeroSpawns.push({ heroKey, sprite });
  }

  private isMapEnemyObject(object: Phaser.Types.Tilemaps.TiledObject) {
    return (
      object.name === "enemy" ||
      object.type === "enemy" ||
      object.name === "boss" ||
      this.hasObjectProperty(object, "king-slime")
    );
  }

  private getMapEncounter(object: Phaser.Types.Tilemaps.TiledObject) {
    return resolveEncounter({
      encounterName: object.name ?? undefined,
      skeletonCount: this.getNumberObjectProperty(object, "skeleton"),
      isKingSlimeBoss: this.hasObjectProperty(object, "king-slime"),
    });
  }

  private createMapEnemySprite(
    object: Phaser.Types.Tilemaps.TiledObject,
    encounter: Encounter,
  ) {
    if (encounter === KING_SLIME_BOSS_ENCOUNTER) {
      return this.add
        .sprite(object.x!, object.y!, "king-slime-boss-exploration-idle")
        .play("king-slime-boss-exploration-idle")
        .setDepth(this.getMapObjectDepth(object.y!))
        .setScale(0.28);
    }

    return this.add
      .sprite(object.x!, object.y!, "skeleton")
      .play("skeleton-walk")
      .setDepth(this.getMapObjectDepth(object.y!))
      .setScale(32 / 225);
  }

  private getNumberObjectProperty(
    object: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ) {
    const value = this.getObjectProperty(object, name);
    return typeof value === "number" ? value : undefined;
  }

  private hasObjectProperty(
    object: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ) {
    return this.getObjectProperty(object, name) !== undefined;
  }

  private getObjectProperty(
    object: Phaser.Types.Tilemaps.TiledObject,
    name: string,
  ) {
    const properties = object.properties as
      | TiledObjectProperty[]
      | Record<string, unknown>
      | undefined;

    if (Array.isArray(properties)) {
      return properties.find((property) => property.name === name)?.value;
    }

    return properties?.[name];
  }

  private isWalkable(x: number, y: number): boolean {
    const ground = this.groundLayer.getTileAtWorldXY(x, y);
    if (!ground || ground.index <= 0) return false;
    const blocking = this.blockingLayer.getTileAtWorldXY(x, y);
    return !blocking || blocking.index <= 0;
  }

  private canMoveTo(x: number, y: number): boolean {
    return (
      this.isWalkable(
        x - PLAYER_COLLISION_RADIUS,
        y - PLAYER_COLLISION_RADIUS,
      ) &&
      this.isWalkable(
        x + PLAYER_COLLISION_RADIUS,
        y - PLAYER_COLLISION_RADIUS,
      ) &&
      this.isWalkable(
        x - PLAYER_COLLISION_RADIUS,
        y + PLAYER_COLLISION_RADIUS,
      ) &&
      this.isWalkable(
        x + PLAYER_COLLISION_RADIUS,
        y + PLAYER_COLLISION_RADIUS,
      ) &&
      !this.isBlockedByMapCharacter(x, y)
    );
  }

  private isBlockedByMapCharacter(x: number, y: number): boolean {
    return this.getBlockingMapCharacters().some(
      (sprite) =>
        PhaserMath.Distance.Between(x, y, sprite.x, sprite.y) <
        MAP_CHARACTER_COLLISION_DISTANCE,
    );
  }

  private getBlockingMapCharacters(): Phaser.GameObjects.Sprite[] {
    return [
      ...this.mapEnemies.map((enemy) => enemy.sprite),
      ...this.mapNpcs.map((npc) => npc.sprite),
      ...this.mapHeroSpawns.map((spawn) => spawn.sprite),
    ];
  }

  private createHud() {
    this.infoText = this.add
      .text(16, 14, "", {
        fontFamily: "Arial",
        fontSize: 14,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(20);

    this.partyText = this.add
      .text(16, 40, "", {
        fontFamily: "Courier New",
        fontSize: 13,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setDepth(20);

    this.statusText = this.add
      .text(512, 712, "", {
        fontFamily: "Arial Black",
        fontSize: 16,
        color: "#fff6c4",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5)
      .setDepth(40);

    this.interactionText = this.add
      .text(512, 650, "", {
        fontFamily: "Arial Black",
        fontSize: 15,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: 880 },
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.promptText = this.add
      .text(512, 360, "", {
        fontFamily: "Arial Black",
        fontSize: 20,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center",
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setVisible(false);

    this.hudObjects = [
      this.infoText,
      this.partyText,
      this.statusText,
      this.interactionText,
      this.promptText,
    ];
  }

  private setupUiCamera() {
    this.camera.ignore(this.hudObjects);

    this.uiCamera = this.cameras
      .add(0, 0, this.scale.width, this.scale.height)
      .setScroll(0, 0)
      .setZoom(1);
    this.uiCamera.ignore(this.worldObjects);
  }

  private trackWorldObject(object: Phaser.GameObjects.GameObject | undefined) {
    if (!object) {
      return;
    }

    this.worldObjects.push(object);
    this.uiCamera?.ignore(object);
  }

  private registerInput() {
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown", this.handleKey, this);
    });
  }

  private handleKey(event: KeyboardEvent) {
    if (this.inputLocked && (event.key === "Enter" || event.key === " ")) {
      this.closeMessage();
      return;
    }

    if (
      !this.inputLocked &&
      (event.key === "e" || event.key === "E" || event.key === " ")
    ) {
      this.interact();
    }
  }

  private applyBattleResult(battleResult: BattleResult | undefined) {
    if (!battleResult) {
      this.session.currentLocation = "Center of the World";
      this.updateHud();
      return;
    }

    this.session.currentEncounter = undefined;

    if (battleResult.won) {
      this.winBattle(battleResult);
    } else {
      this.loseBattle(battleResult.log.join("\n"));
    }
  }

  private interact() {
    const recruitableHero = this.getNearbyRecruitableHero();

    if (recruitableHero) {
      this.recruitHero(recruitableHero);
      return;
    }

    if (this.isNearHubWall()) {
      this.openWallScene();
      return;
    }

    const enemy = this.getNearbyMapEnemy();
    if (enemy) {
      this.startEnemyBattle(enemy);
      return;
    }

    const npc = this.getNearbyNpc();
    if (npc) {
      this.showNpcDialog(npc);
    }
  }

  private getNearbyMapEnemy(): MapEnemy | undefined {
    return this.mapEnemies.find(
      (e) =>
        PhaserMath.Distance.Between(
          this.player.x,
          this.player.y,
          e.sprite.x,
          e.sprite.y,
        ) <= INTERACT_DISTANCE,
    );
  }

  private startEnemyBattle(enemy: MapEnemy) {
    this.syncCurrentAreaFromPlayer();
    this.session.currentEncounter = this.cloneEncounter(enemy.encounter);
    this.session.currentEnemyObjectId = enemy.objectId;
    this.session.currentArea =
      enemy.area ?? this.getAreaAtPosition(enemy.sprite.x, enemy.sprite.y) ?? this.session.currentArea;
    this.session.currentLocation = enemy.encounter.name;
    this.session.preBattlePosition = { x: this.player.x, y: this.player.y };
    this.inputLocked = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Battle", { session: this.session });
    });
  }

  private openWallScene() {
    this.inputLocked = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Wall", {
        session: this.session,
        returnPosition: { x: this.player.x, y: this.player.y },
      });
    });
  }

  private winBattle(battleResult: BattleResult) {
    const { encounter, log } = battleResult;
    const objectId = this.session.currentEnemyObjectId;

    if (objectId !== undefined) {
      this.session.defeatedEncounters.add(`enemy:${objectId}`);
      const idx = this.mapEnemies.findIndex((e) => e.objectId === objectId);
      if (idx >= 0) {
        this.mapEnemies[idx].sprite.destroy();
        this.mapEnemies.splice(idx, 1);
      }
    }

    if (encounter.card) {
      this.session.pendingCards.add(encounter.card);
    }

    if (encounter.unlockHero) {
      this.session.heroes[encounter.unlockHero].unlocked = true;
      this.refreshMapHeroSpawns();
    }

    const returnPos = this.session.preBattlePosition ?? this.startPoint;
    this.session.preBattlePosition = undefined;
    this.player.setPosition(returnPos.x, returnPos.y);
    this.statusText.setText(
      log
        .concat([
          `${encounter.name} defeated.`,
          encounter.card
            ? `${CARD_LABELS[encounter.card]} acquired. Walk back to the wall and press E.`
            : "The road ahead opens.",
        ])
        .join("\n"),
    );
    this.updateHud();
  }

  private loseBattle(reason: string) {
    this.restoreParty();
    this.session.currentLocation = "Center of the World";
    this.session.preBattlePosition = undefined;
    this.player.setPosition(this.startPoint.x, this.startPoint.y);
    this.statusText.setText(
      `${reason}\nResurrected at the Card Reader wall with full HP.`,
    );
    this.updateHud();
  }

  private recruitHero(heroKey: HeroKey) {
    const hero = this.session.heroes[heroKey];
    hero.recruited = true;
    hero.hp = hero.maxHp;
    const spawn = this.mapHeroSpawns.find(
      (candidate) => candidate.heroKey === heroKey,
    );
    spawn?.sprite.destroy();
    this.mapHeroSpawns = this.mapHeroSpawns.filter(
      (candidate) => candidate.heroKey !== heroKey,
    );
    this.showMessage(
      `${hero.name} Recruited`,
      `${hero.name} joins the party.\nSpecial: ${hero.special}`,
    );
    this.updateHud();
  }

  private showNpcDialog(npc: MapNpc) {
    this.showMessage(npc.name, this.getBaguettefrDialog());
  }

  private getBaguettefrDialog() {
    const progress = Math.min(
      this.session.revealedCards.size + this.session.pendingCards.size,
      BAGUETTEFR_DIALOG_LINES.length - 1,
    );
    return BAGUETTEFR_DIALOG_LINES[progress];
  }

  private showMessage(title: string, body: string, afterClose?: () => void) {
    this.inputLocked = true;
    this.messageAfterClose = afterClose;
    this.promptText.setVisible(true);
    this.promptText.setText(`${title}\n\n${body}\n\nClick or press Enter.`);
  }

  private closeMessage() {
    this.promptText.setVisible(false);
    this.inputLocked = false;
    const afterClose = this.messageAfterClose;
    this.messageAfterClose = undefined;

    if (afterClose) {
      afterClose();
    }
  }

  private updateInteractionState() {
    const { text, target } = this.getInteractionPrompt();
    this.interactionText.setText(text);
    this.drawInteractionHighlight(target);
    this.updateHud();
  }

  private getInteractionPrompt(): {
    text: string;
    target?: InteractionHighlightTarget;
  } {
    const recruitable = this.getNearbyRecruitableHero();
    if (recruitable) {
      return {
        text: `Press E: recruit ${this.session.heroes[recruitable].name}`,
        target: this.getRecruitableHeroHighlightTarget(recruitable),
      };
    }

    if (this.isNearHubWall()) {
      return {
        text: "Press E: insert Card / inspect Card Reader wall",
        target: {
          kind: "point",
          x: this.wallInteractionPoint.x,
          y: this.wallInteractionPoint.y,
          width: WALL_HIGHLIGHT_SIZE.width,
          height: WALL_HIGHLIGHT_SIZE.height,
        },
      };
    }

    const enemy = this.getNearbyMapEnemy();
    if (enemy) {
      return {
        text: `Press E: fight ${enemy.encounter.name}`,
        target: { kind: "sprite", sprite: enemy.sprite },
      };
    }

    const npc = this.getNearbyNpc();
    if (npc) {
      return {
        text: `Press E: talk to ${npc.name}`,
        target: { kind: "sprite", sprite: npc.sprite },
      };
    }

    return { text: "" };
  }

  private getRecruitableHeroHighlightTarget(
    heroKey: HeroKey,
  ): InteractionHighlightTarget | undefined {
    if (heroKey === "knight") {
      return {
        kind: "point",
        x: KNIGHT_RECRUIT_POINT.x,
        y: KNIGHT_RECRUIT_POINT.y,
        width: POINT_HIGHLIGHT_SIZE.width,
        height: POINT_HIGHLIGHT_SIZE.height,
      };
    }

    const spawn = this.mapHeroSpawns.find(
      (candidate) => candidate.heroKey === heroKey,
    );
    if (!spawn) {
      return undefined;
    }

    return { kind: "sprite", sprite: spawn.sprite };
  }

  private drawInteractionHighlight(target?: InteractionHighlightTarget) {
    this.interactionHighlight.clear();
    this.clearHighlightedSprite();

    if (!target) {
      return;
    }

    if (target.kind === "sprite") {
      this.highlightSprite(target.sprite);
      return;
    }

    this.interactionHighlight.lineStyle(OUTLINE_THICKNESS, 0xffffff, 1);
    this.interactionHighlight.strokeRoundedRect(
      target.x - target.width / 2,
      target.y - target.height / 2,
      target.width,
      target.height,
      8,
    );
  }

  private highlightSprite(sprite: Phaser.GameObjects.Sprite) {
    if (this.game.renderer.type !== WEBGL) {
      this.drawSpriteBoundsHighlight(sprite);
      return;
    }

    sprite.enableFilters();
    const filterList = sprite.filters?.external;

    if (!filterList) {
      this.drawSpriteBoundsHighlight(sprite);
      return;
    }

    this.highlightedSprite = sprite;
    this.highlightedSpriteGlow = filterList.addGlow(
      0xffffff,
      SPRITE_HIGHLIGHT_OUTER_STRENGTH,
      SPRITE_HIGHLIGHT_INNER_STRENGTH,
      1,
      false,
      SPRITE_HIGHLIGHT_QUALITY,
      SPRITE_HIGHLIGHT_DISTANCE,
    );
  }

  private drawSpriteBoundsHighlight(sprite: Phaser.GameObjects.Sprite) {
    const bounds = sprite.getBounds();
    this.interactionHighlight.lineStyle(OUTLINE_THICKNESS, 0xffffff, 1);
    this.interactionHighlight.strokeRoundedRect(
      bounds.x - 6,
      bounds.y - 6,
      bounds.width + 12,
      bounds.height + 12,
      8,
    );
  }

  private clearHighlightedSprite() {
    if (!this.highlightedSprite || !this.highlightedSpriteGlow) {
      this.highlightedSprite = undefined;
      this.highlightedSpriteGlow = undefined;
      return;
    }

    this.highlightedSprite.filters?.external?.remove(
      this.highlightedSpriteGlow,
    );
    this.highlightedSpriteGlow = undefined;
    this.highlightedSprite = undefined;
  }

  private getCurrentArea(): Area | undefined {
    return this.getAreaAtPosition(this.player.x, this.player.y);
  }

  private getAreaAtPosition(x: number, y: number): Area | undefined {
    return this.areaPolygons.find(({ vertices }) =>
      this.pointInPolygon(x, y, vertices),
    )?.area;
  }

  private syncCurrentAreaFromPlayer() {
    const currentArea = this.getCurrentArea();

    if (currentArea) {
      this.session.currentArea = currentArea;
      this.session.currentLocation = currentArea.name;
      return;
    }

    this.session.currentArea = undefined;
    this.session.currentLocation = "Center of the World";
  }

  private getCurrentAreaName(): string | undefined {
    return this.areaPolygons.find(({ vertices }) =>
      this.pointInPolygon(this.player.x, this.player.y, vertices),
    )?.area.name;
  }

  private pointInPolygon(
    px: number,
    py: number,
    vertices: Array<{ x: number; y: number }>,
  ): boolean {
    let inside = false;
    const n = vertices.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const { x: xi, y: yi } = vertices[i];
      const { x: xj, y: yj } = vertices[j];
      if (
        yi > py !== yj > py &&
        px < ((xj - xi) * (py - yi)) / (yj - yi) + xi
      ) {
        inside = !inside;
      }
    }
    return inside;
  }

  private updateHud() {
    this.syncCurrentAreaFromPlayer();
    const location = this.getCurrentAreaName() ?? this.session.currentLocation;
    this.infoText.setText(`Location: ${location}`);
    this.partyText.setText(
      [
        "Party:",
        ...this.getParty().map(
          (hero) =>
            `${hero.name.padEnd(7)} HP ${String(hero.hp).padStart(3)} / ${hero.maxHp}`,
        ),
      ].join("\n"),
    );
  }

  private getNearbyRecruitableHero() {
    const knightNear = this.isWithinInteractionDistance(
      KNIGHT_RECRUIT_POINT.x,
      KNIGHT_RECRUIT_POINT.y,
    );
    const heroSpawn = this.mapHeroSpawns.find(
      (spawn) =>
        this.isWithinInteractionDistance(spawn.sprite.x, spawn.sprite.y),
    );

    if (
      heroSpawn &&
      this.session.heroes[heroSpawn.heroKey].unlocked &&
      !this.session.heroes[heroSpawn.heroKey].recruited
    ) {
      return heroSpawn.heroKey;
    }

    if (
      knightNear &&
      this.session.heroes.knight.unlocked &&
      !this.session.heroes.knight.recruited
    ) {
      return "knight";
    }

    return undefined;
  }

  private getNearbyNpc(): MapNpc | undefined {
    return this.mapNpcs.find(
      (npc) => this.isWithinInteractionDistance(npc.sprite.x, npc.sprite.y),
    );
  }

  private isNearHubWall() {
    return this.isWithinInteractionDistance(
      this.wallInteractionPoint.x,
      this.wallInteractionPoint.y,
    );
  }

  private isWithinInteractionDistance(x: number, y: number) {
    return (
      PhaserMath.Distance.Between(this.player.x, this.player.y, x, y) <=
      INTERACT_DISTANCE
    );
  }

  private getParty() {
    return Object.values(this.session.heroes).filter((hero) => hero.recruited);
  }

  private restoreParty() {
    this.getParty().forEach((hero) => {
      hero.hp = hero.maxHp;
    });
  }

  private cloneEncounter(encounter: Encounter): Encounter {
    return {
      ...encounter,
      enemies: encounter.enemies.map((enemy) => ({ ...enemy })),
    };
  }
}
