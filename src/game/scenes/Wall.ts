import { Scene } from "phaser";
import { CARD_LABELS, CARD_ORDER } from "../gameConstants.ts";
import type { GameSession } from "../gameTypes.ts";

const CANVAS_W = 1024;
const CANVAS_H = 768;

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

    this.add
      .text(CANVAS_W / 2, CANVAS_H - 96, this.buildDialog(), {
        fontFamily: "Arial Black",
        fontSize: 24,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
        align: "center",
        wordWrap: { width: 880 },
      })
      .setOrigin(0.5);

    if (!this.input.keyboard) {
      throw new Error("Keyboard input is unavailable.");
    }

    this.input.keyboard.once("keydown", this.returnToExploration, this);
  }

  private buildDialog() {
    const card = CARD_ORDER.find(
      (candidate) =>
        this.session.pendingCards.has(candidate) &&
        !this.session.revealedCards.has(candidate),
    );

    if (card) {
      return this.insertCard(card);
    }

    if (this.session.revealedCards.size === 0) {
      return "Cloud: There is an weird wall with 3 holes";
    }

    return this.buildWallStatus();
  }

  private insertCard(card: (typeof CARD_ORDER)[number]) {
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

    if (this.session.revealedCards.size === CARD_ORDER.length) {
      this.afterClose = () => {
        this.scene.start("Credits");
      };
    }

    return lines.join("\n");
  }

  private buildWallStatus() {
    return CARD_ORDER.map((card, index) => {
      return this.session.revealedCards.has(card)
        ? `${CARD_LABELS[card]}: ${this.session.secretFragments[index]}`
        : `${CARD_LABELS[card]}: ?????`;
    }).join("\n");
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
