import { Input, Math as PhaserMath, Scene } from "phaser";
import {
  AREAS,
  buildSkeletonEncounter,
  DEFAULT_SKELETON_ENCOUNTER,
  ENCOUNTER_BY_NAME,
  KING_SLIME_BOSS_ENCOUNTER,
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
} from "../gameTypes.ts";

type MapEnemy = {
  objectId: number;
  encounter: Encounter;
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
const MAP_ENEMY_COLLISION_DISTANCE = INTERACT_DISTANCE - 2;
const BAGUETTEFR_DIALOG_LINES = [
  "I have seen many walls with holes. Usually they want cards. Sometimes they want emotional support.",
  "One color is a whisper. Three colors become a secret. I recommend whispering back in the correct order.",
  "The gift is not in the monsters. The monsters are just aggressively holding the stationery.",
  "When the wall has all three cards, read what it shows exactly. The reward is hiding in plain sight.",
];

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
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private hudObjects: Phaser.GameObjects.GameObject[] = [];
  private session: GameSession;
  private messageAfterClose: (() => void) | undefined;
  private inputLocked = false;

  private groundLayer: Phaser.Tilemaps.TilemapLayer;
  private blockingLayer: Phaser.Tilemaps.TilemapLayer;
  private walkableGid: number;
  private startPoint: { x: number; y: number };
  private wallInteractionPoint: { x: number; y: number };
  private mapEnemies: MapEnemy[];
  private mapNpcs: MapNpc[];
  private mapHeroSpawns: MapHeroSpawn[];
  private mapHeroSpawnPoints: Partial<Record<HeroKey, { x: number; y: number }>>;
  private areaPolygons: Array<{
    name: string;
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

    this.updateExploreText();
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
    const allTilesets = [wallsTs!, stoneTs!, propsTs!];

    this.walkableGid = stoneTs!.firstgid + 9;

    const prototypeLayer = map.createLayer("prototype", allTilesets)?.setDepth(-2);
    this.trackWorldObject(prototypeLayer);
    this.groundLayer = map
      .createLayer("ground", allTilesets)!
      .setDepth(-1) as Phaser.Tilemaps.TilemapLayer;
    this.trackWorldObject(this.groundLayer);
    const decoGroundLayer = map
      .createLayer("deco-ground", allTilesets)
      ?.setDepth(0);
    this.trackWorldObject(decoGroundLayer);
    this.blockingLayer = map
      .createLayer("deco-1-blocking", allTilesets)!
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
      .setDepth(2);
    this.trackWorldObject(this.player);

    const decoTopLayer = map.createLayer("deco-2", allTilesets)?.setDepth(3);
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
    const missing = ["start", "wall-interaction"].filter((n) => !find(n));
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

    this.areaPolygons = ["area-1", "area-2", "area-3"].flatMap((key, i) => {
      const obj = find(key);
      if (!obj) return [];
      const vertices = (obj.polygon ?? []).map((v) => ({
        x: obj.x! + v.x,
        y: obj.y! + v.y,
      }));
      return [{ name: AREAS[i].name, vertices }];
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
      .filter((o) => this.isMapEnemyObject(o))
      .flatMap((o) => {
        const objectId = o.id!;
        if (this.session.defeatedEncounters.has(`enemy:${objectId}`)) return [];
        const skeletonCount =
          this.getNumberObjectProperty(o, "skeleton") ?? undefined;
        const encounter = this.hasObjectProperty(o, "king-slime")
          ? KING_SLIME_BOSS_ENCOUNTER
          : skeletonCount
          ? buildSkeletonEncounter(skeletonCount)
          : (ENCOUNTER_BY_NAME.get(o.name ?? "") ?? DEFAULT_SKELETON_ENCOUNTER);
        const sprite = this.createMapEnemySprite(o, encounter);
        this.trackWorldObject(sprite);
        return [{ objectId, encounter, sprite }];
      });

    this.mapNpcs = layer.objects
      .filter((o) => o.name === "baguettefr")
      .map((o) => {
        const sprite = this.add
          .sprite(o.x!, o.y!, "baguettefr-idle-down", "0")
          .play("baguettefr-idle-down")
          .setOrigin(0.5, 0.75)
          .setDepth(2)
          .setScale(64 / 256);
        this.trackWorldObject(sprite);
        return { name: "baguettefr", sprite };
      });

    this.mapHeroSpawns = [];
    this.refreshMapHeroSpawns();
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
    const existing = this.mapHeroSpawns.some((spawn) => spawn.heroKey === heroKey);

    if (!point || existing || !hero.unlocked || hero.recruited) {
      return;
    }

    const sprite = this.add
      .sprite(point.x, point.y, textureKey, "0")
      .play(textureKey)
      .setOrigin(0.5, 0.75)
      .setDepth(2)
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

  private createMapEnemySprite(
    object: Phaser.Types.Tilemaps.TiledObject,
    encounter: Encounter,
  ) {
    if (encounter === KING_SLIME_BOSS_ENCOUNTER) {
      return this.add
        .sprite(object.x!, object.y!, "king-slime-boss-exploration-idle")
        .play("king-slime-boss-exploration-idle")
        .setDepth(2)
        .setScale(0.28);
    }

    return this.add
      .sprite(object.x!, object.y!, "skeleton")
      .play("skeleton-walk")
      .setDepth(2)
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
    if (!ground || ground.index !== this.walkableGid) return false;
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
      !this.isBlockedByMapEnemy(x, y)
    );
  }

  private isBlockedByMapEnemy(x: number, y: number): boolean {
    return this.mapEnemies.some(
      (enemy) =>
        PhaserMath.Distance.Between(x, y, enemy.sprite.x, enemy.sprite.y) <
        MAP_ENEMY_COLLISION_DISTANCE,
    );
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

  private trackWorldObject(
    object: Phaser.GameObjects.GameObject | undefined,
  ) {
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
    this.session.currentEncounter = this.cloneEncounter(enemy.encounter);
    this.session.currentEnemyObjectId = enemy.objectId;
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
    const spawn = this.mapHeroSpawns.find((candidate) => candidate.heroKey === heroKey);
    spawn?.sprite.destroy();
    this.mapHeroSpawns = this.mapHeroSpawns.filter((candidate) => candidate.heroKey !== heroKey);
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

  private updateExploreText() {
    let interaction = "";

    if (this.isNearHubWall()) {
      interaction = "Press E: insert Card / inspect Card Reader wall";
    } else {
      const recruitable = this.getNearbyRecruitableHero();
      const enemy = this.getNearbyMapEnemy();
      const npc = this.getNearbyNpc();

      if (recruitable) {
        interaction = `Press E: recruit ${this.session.heroes[recruitable].name}`;
      } else if (enemy) {
        interaction = `Press E: fight ${enemy.encounter.name}`;
      } else if (npc) {
        interaction = `Press E: talk to ${npc.name}`;
      }
    }

    this.interactionText.setText(interaction);
    this.updateHud();
  }

  private getCurrentAreaName(): string | undefined {
    return this.areaPolygons.find(({ vertices }) =>
      this.pointInPolygon(this.player.x, this.player.y, vertices),
    )?.name;
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
    const knightNear =
      PhaserMath.Distance.Between(this.player.x, this.player.y, 575, 620) <=
      INTERACT_DISTANCE;
    const heroSpawn = this.mapHeroSpawns.find(
      (spawn) =>
        PhaserMath.Distance.Between(
          this.player.x,
          this.player.y,
          spawn.sprite.x,
          spawn.sprite.y,
        ) <= INTERACT_DISTANCE,
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
      (npc) =>
        PhaserMath.Distance.Between(
          this.player.x,
          this.player.y,
          npc.sprite.x,
          npc.sprite.y,
        ) <= INTERACT_DISTANCE,
    );
  }

  private isNearHubWall() {
    return (
      PhaserMath.Distance.Between(
        this.player.x,
        this.player.y,
        this.wallInteractionPoint.x,
        this.wallInteractionPoint.y,
      ) <= INTERACT_DISTANCE
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
