import { Math as PhaserMath, Scene } from "phaser";
import { AREAS } from "../encounters.ts";
import {
  CARD_LABELS,
  CARD_ORDER,
  INTERACT_DISTANCE,
  PLAYER_SPEED,
} from "../gameConstants.ts";
import type {
  Area,
  BattleResult,
  Encounter,
  GameSession,
  HeroKey,
} from "../gameTypes.ts";

export class Exploration extends Scene {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private player: Phaser.GameObjects.Sprite;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private infoText: Phaser.GameObjects.Text;
  private partyText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private interactionText: Phaser.GameObjects.Text;
  private promptText: Phaser.GameObjects.Text;
  private session: GameSession;
  private messageAfterClose: (() => void) | undefined;
  private inputLocked = false;

  private groundLayer: Phaser.Tilemaps.TilemapLayer;
  private blockingLayer: Phaser.Tilemaps.TilemapLayer;
  private walkableGid: number;
  private startPoint: { x: number; y: number };
  private wallInteractionPoint: { x: number; y: number };
  private areaPolygons: Array<{
    area: Area;
    vertices: Array<{ x: number; y: number }>;
  }>;
  private fogGraphics: Phaser.GameObjects.Graphics;
  private fogTileRevealRadius: number;
  private mapTileWidth: number;
  private mapTileHeight: number;

  constructor() {
    super("Exploration");
  }

  create(data: { session: GameSession; battleResult?: BattleResult }) {
    this.session = data.session;
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x1c2740);
    this.camera.setZoom(1);

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.createWorld();
    this.createHud();
    this.registerInput();
    this.applyBattleResult(data.battleResult);
  }

  update(_time: number, delta: number) {
    if (this.inputLocked) {
      return;
    }

    const distance = PLAYER_SPEED * (delta / 1000);
    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left.isDown) {
      velocityX = -1;
    } else if (this.cursors.right.isDown) {
      velocityX = 1;
    }

    if (this.cursors.up.isDown) {
      velocityY = -1;
    } else if (this.cursors.down.isDown) {
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
      this.player.play("cloud-walk", true);

      if (velocityX !== 0) {
        this.player.setFlipX(velocityX < 0);
      }
    } else {
      this.player.play("cloud-idle", true);
    }

    this.updateExploreText();
    this.updateFog();
  }

  private createWorld() {
    const map = this.make.tilemap({ key: "worldmap" });
    const wallsTs = map.addTilesetImage("walls", "tileset-wall");
    const stoneTs = map.addTilesetImage("stone-ground", "tileset-stone");
    const propsTs = map.addTilesetImage("props", "tileset-props");
    const allTilesets = [wallsTs!, stoneTs!, propsTs!];

    this.walkableGid = stoneTs!.firstgid + 9;

    map.createLayer("prototype", allTilesets)?.setDepth(-2);
    this.groundLayer = map
      .createLayer("ground", allTilesets)!
      .setDepth(-1) as Phaser.Tilemaps.TilemapLayer;
    map.createLayer("deco-ground", allTilesets)?.setDepth(0);
    this.blockingLayer = map
      .createLayer("deco-1-blocking", allTilesets)!
      .setDepth(1) as Phaser.Tilemaps.TilemapLayer;

    this.camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.extractMapObjects(map);

    if (!this.anims.exists("cloud-idle")) {
      this.anims.create({
        key: "cloud-idle",
        frames: this.anims.generateFrameNumbers("cloud", { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }

    if (!this.anims.exists("cloud-walk")) {
      this.anims.create({
        key: "cloud-walk",
        frames: this.anims.generateFrameNumbers("cloud-walk", {
          start: 0,
          end: 7,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }

    this.player = this.add
      .sprite(this.startPoint.x, this.startPoint.y, "cloud")
      .play("cloud-idle");
    this.player.setScale(28 / this.player.width).setDepth(2);

    map.createLayer("deco-2", allTilesets)?.setDepth(3);

    this.createFog(map);
    this.camera.startFollow(this.player, true, 0.08, 0.08);
  }

  private createFog(map: Phaser.Tilemaps.Tilemap) {
    this.mapTileWidth = map.tileWidth;
    this.mapTileHeight = map.tileHeight;
    this.fogTileRevealRadius = Math.round(
      Math.min(this.scale.width, this.scale.height) /
        (2 * this.camera.zoom * map.tileWidth),
    );

    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(4);

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

    const cam = this.camera;
    const startTX = Math.floor(cam.scrollX / tw) - 1;
    const startTY = Math.floor(cam.scrollY / th) - 1;
    const endTX = Math.ceil((cam.scrollX + cam.width / cam.zoom) / tw) + 1;
    const endTY = Math.ceil((cam.scrollY + cam.height / cam.zoom) / th) + 1;

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
    const required = [
      "start",
      "wall-interaction",
      "area-1",
      "area-2",
      "area-3",
    ];
    const missing = required.filter((n) => !find(n));

    if (missing.length > 0) {
      throw new Error(`Map is missing required objects: ${missing.join(", ")}`);
    }

    const startObj = find("start")!;
    this.startPoint = { x: startObj.x!, y: startObj.y! };

    const wallObj = find("wall-interaction")!;
    this.wallInteractionPoint = { x: wallObj.x!, y: wallObj.y! };

    this.areaPolygons = ["area-1", "area-2", "area-3"].map((name, i) => {
      const obj = find(name)!;
      const vertices = (obj.polygon ?? []).map((v) => ({
        x: obj.x! + v.x,
        y: obj.y! + v.y,
      }));
      return { area: AREAS[i], vertices };
    });
  }

  private isWalkable(x: number, y: number): boolean {
    const ground = this.groundLayer.getTileAtWorldXY(x, y);
    if (!ground || ground.index !== this.walkableGid) return false;
    const blocking = this.blockingLayer.getTileAtWorldXY(x, y);
    return !blocking || blocking.index <= 0;
  }

  private canMoveTo(x: number, y: number): boolean {
    const r = 14;
    return (
      this.isWalkable(x - r, y - r) &&
      this.isWalkable(x + r, y - r) &&
      this.isWalkable(x - r, y + r) &&
      this.isWalkable(x + r, y + r)
    );
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

  private createHud() {
    this.infoText = this.add
      .text(16, 14, "", {
        fontFamily: "Arial",
        fontSize: 18,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.partyText = this.add
      .text(16, 84, "", {
        fontFamily: "Courier New",
        fontSize: 16,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.statusText = this.add
      .text(512, 712, "", {
        fontFamily: "Arial Black",
        fontSize: 20,
        color: "#fff6c4",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center",
        wordWrap: { width: 900 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40);

    this.interactionText = this.add
      .text(512, 650, "", {
        fontFamily: "Arial Black",
        fontSize: 20,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
        wordWrap: { width: 880 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20);

    this.promptText = this.add
      .text(512, 360, "", {
        fontFamily: "Arial Black",
        fontSize: 26,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 7,
        align: "center",
        wordWrap: { width: 820 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(40)
      .setVisible(false);
  }

  private registerInput() {
    this.input.keyboard?.on("keydown", this.handleKey, this);
    this.input.on("pointerdown", this.handlePointer, this);
    this.events.once("shutdown", () => {
      this.input.keyboard?.off("keydown", this.handleKey, this);
      this.input.off("pointerdown", this.handlePointer, this);
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

  private handlePointer() {
    if (this.inputLocked) {
      this.closeMessage();
    } else {
      this.interact();
    }
  }

  private applyBattleResult(battleResult: BattleResult | undefined) {
    if (!battleResult) {
      this.session.currentLocation = "Center of the World";
      this.statusText.setText(
        `Welcome, ${this.session.playerName}. Arrow keys move. Press E near gates, heroes, and the wall.`,
      );
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
      this.insertPendingCard();
      return;
    }

    const area = this.getNearbyArea();

    if (area) {
      this.enterArea(area);
    }
  }

  private enterArea(area: Area) {
    const encounter = area.encounters.find(
      (candidate) =>
        !this.session.defeatedEncounters.has(
          this.getEncounterId(area, candidate),
        ),
    );

    if (!encounter) {
      this.showMessage(
        area.name,
        "This area is cleared. baguettefr gives it a tiny, approving nod.",
      );
      return;
    }

    this.session.currentArea = area;
    this.session.currentEncounter = this.cloneEncounter(encounter);
    this.session.currentLocation = area.name;
    this.scene.start("Battle", { session: this.session });
  }

  private winBattle(battleResult: BattleResult) {
    const { area, encounter, log } = battleResult;
    this.session.defeatedEncounters.add(this.getEncounterId(area, encounter));

    if (encounter.card) {
      this.session.pendingCards.add(encounter.card);
    }

    if (encounter.unlockHero) {
      this.session.heroes[encounter.unlockHero].unlocked = true;
    }

    this.session.currentLocation = area.name;
    this.player.setPosition(this.startPoint.x, this.startPoint.y);
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
    this.player.setPosition(this.startPoint.x, this.startPoint.y);
    this.statusText.setText(
      `${reason}\nResurrected at the Card Reader wall with full HP.`,
    );
    this.updateHud();
  }

  private insertPendingCard() {
    const card = CARD_ORDER.find(
      (candidate) =>
        this.session.pendingCards.has(candidate) &&
        !this.session.revealedCards.has(candidate),
    );

    if (!card) {
      this.showMessage("Card Reader Wall", this.buildWallMessage());
      return;
    }

    const index = CARD_ORDER.indexOf(card);
    this.session.revealedCards.add(card);
    this.session.pendingCards.delete(card);
    this.restoreParty();

    const lines = [
      `${CARD_LABELS[card]} inserted.`,
      `Fragment ${index + 1}: ${this.session.secretFragments[index]}`,
    ];

    if (card === "green") {
      lines.push(
        "Leon appears near the wall, looking extremely serious about a silly problem.",
      );
    } else if (card === "blue") {
      lines.push(
        "Knight appears near the wall and immediately makes everyone uncomfortable.",
      );
    } else {
      lines.push(`Full secret_gift: ${this.session.secretGift}`);
    }

    this.showMessage("Card Reader Online", lines.join("\n"), () => {
      if (this.session.revealedCards.size === 3) {
        this.showMessage(
          "Quest Complete",
          `The full secret_gift is:\n${this.session.secretGift}\n\nbaguettefr pretends this was planned all along.\n\nThe credits are legally obligated to begin next.`,
          () => {
            this.scene.start("Credits");
          },
        );
      }
    });
  }

  private recruitHero(heroKey: HeroKey) {
    const hero = this.session.heroes[heroKey];
    hero.recruited = true;
    hero.hp = hero.maxHp;
    this.showMessage(
      `${hero.name} Recruited`,
      `${hero.name} joins the party.\nSpecial: ${hero.special}`,
    );
    this.updateHud();
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
      const area = this.getNearbyArea();

      if (recruitable) {
        interaction = `Press E: recruit ${this.session.heroes[recruitable].name}`;
      } else if (area) {
        interaction = `Press E: enter ${area.name}`;
      }
    }

    this.interactionText.setText(interaction);
    this.updateHud();
  }

  private updateHud() {
    this.infoText.setText(`Location: ${this.session.currentLocation}`);
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

  private getNearbyArea() {
    return this.areaPolygons.find(({ vertices }) =>
      this.pointInPolygon(this.player.x, this.player.y, vertices),
    )?.area;
  }

  private getNearbyRecruitableHero() {
    const leonNear =
      PhaserMath.Distance.Between(this.player.x, this.player.y, 355, 620) <=
      INTERACT_DISTANCE;
    const knightNear =
      PhaserMath.Distance.Between(this.player.x, this.player.y, 575, 620) <=
      INTERACT_DISTANCE;

    if (
      leonNear &&
      this.session.heroes.leon.unlocked &&
      !this.session.heroes.leon.recruited
    ) {
      return "leon";
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

  private buildWallMessage() {
    const fragments = CARD_ORDER.map((card, index) => {
      return this.session.revealedCards.has(card)
        ? `${CARD_LABELS[card]}: ${this.session.secretFragments[index]}`
        : `${CARD_LABELS[card]}: ?????`;
    });

    return fragments.join("\n");
  }

  private getParty() {
    return Object.values(this.session.heroes).filter((hero) => hero.recruited);
  }

  private restoreParty() {
    this.getParty().forEach((hero) => {
      hero.hp = hero.maxHp;
    });
  }

  private getEncounterId(area: Area, encounter: Encounter) {
    return `${area.key}:${encounter.name}`;
  }

  private cloneEncounter(encounter: Encounter): Encounter {
    return {
      ...encounter,
      enemies: encounter.enemies.map((enemy) => ({ ...enemy })),
    };
  }
}
