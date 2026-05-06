import { Scene } from "phaser";
import { CARD_ORDER } from "../gameConstants.ts";
import type { CardColor, GameSession } from "../gameTypes.ts";

const CANVAS_W = 1024;
const CANVAS_H = 768;
const INSERTED_CARD_SCALE = 0.34;
const FRAGMENT_TEXT_Y = 260;
const WALL_CARD_ORDER: CardColor[] = ["blue", "green", "red"];

const INSERTED_CARD_SLOTS: Record<
  CardColor,
  { frame: number; x: number; y: number }
> = {
  blue: { frame: 0, x: 319, y: 562 },
  green: { frame: 1, x: 512, y: 562 },
  red: { frame: 2, x: 705, y: 562 },
};

export class Wall extends Scene {
  private session: GameSession;
  private returnPosition: { x: number; y: number };
  private afterClose: (() => void) | undefined;
  private returning = false;

  constructor() {
    super("Wall");
  }

  create(data: {
    session: GameSession;
    returnPosition?: { x: number; y: number };
  }) {
    this.session = data.session;
    this.returnPosition = data.returnPosition ?? { x: 0, y: 0 };
    this.afterClose = undefined;
    this.returning = false;

    this.cameras.main.fadeIn(300);
    this.add
      .image(CANVAS_W / 2, CANVAS_H / 2, "wall-0")
      .setDisplaySize(CANVAS_W, CANVAS_H);

    const dialog = this.buildDialog();
    this.addInsertedCards();
    this.addFragmentText();

    if (dialog) {
      this.add
        .text(CANVAS_W / 2, CANVAS_H - 96, dialog, {
          fontFamily: "Arial Black",
          fontSize: 24,
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 6,
          align: "center",
          wordWrap: { width: 880 },
        })
        .setOrigin(0.5);
    }

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.input.keyboard.once("keydown", this.returnToExploration, this);
  }

  private addInsertedCards() {
    WALL_CARD_ORDER.forEach((card) => {
      if (!this.session.revealedCards.has(card)) {
        return;
      }

      const slot = INSERTED_CARD_SLOTS[card];
      this.add
        .sprite(slot.x, slot.y, "wall-inserted-cards", slot.frame)
        .setScale(INSERTED_CARD_SCALE)
        .setDepth(1);
    });
  }

  private addFragmentText() {
    this.add
      .text(CANVAS_W / 2, FRAGMENT_TEXT_Y, this.buildFragmentCode(), {
        fontFamily: "Courier New",
        fontSize: 32,
        color: "#d8f2ff",
        stroke: "#000000",
        strokeThickness: 5,
        align: "center",
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  private buildDialog() {
    const card = CARD_ORDER.find(
      (candidate) =>
        this.session.pendingCards.has(candidate) &&
        !this.session.revealedCards.has(candidate),
    );

    if (card) {
      this.insertCard(card);
      return "";
    }

    if (this.session.revealedCards.size === 0) {
      return "Cloud: There is an weird wall with 3 holes";
    }

    return "";
  }

  private insertCard(card: (typeof CARD_ORDER)[number]) {
    this.session.revealedCards.add(card);
    this.session.pendingCards.delete(card);
    this.restoreParty();

    if (card === "green") {
      this.session.heroes.leon.unlocked = true;
    } else if (card === "blue") {
      this.session.heroes.knight.unlocked = true;
    }

    if (this.session.revealedCards.size === CARD_ORDER.length) {
      this.afterClose = () => {
        this.scene.start("Credits");
      };
    }
  }

  private buildFragmentCode() {
    return WALL_CARD_ORDER.map((card) => {
      const fragmentIndex = CARD_ORDER.indexOf(card);
      return this.session.revealedCards.has(card)
        ? this.session.secretFragments[fragmentIndex]
        : "";
    }).join(" - ");
  }

  private restoreParty() {
    Object.values(this.session.heroes)
      .filter((hero) => hero.recruited)
      .forEach((hero) => {
        hero.hp = hero.maxHp;
      });
  }

  private returnToExploration() {
    if (this.returning) {
      return;
    }

    this.returning = true;

    if (this.afterClose) {
      this.afterClose();
      return;
    }

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("Exploration", {
        session: this.session,
        startPosition: this.returnPosition,
      });
    });
  }
}
