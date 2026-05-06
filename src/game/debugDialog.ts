import { GameObjects, Scene } from "phaser";
import type { GameSession, HeroKey } from "./gameTypes.ts";

const HERO_ORDER: HeroKey[] = ["cloud", "leon", "knight"];
const PANEL_DEPTH = 1000;

type DebugDialogOptions = {
  session?: GameSession;
  onSessionChanged?: () => void;
};

export const isDebugToggleKey = (event: KeyboardEvent) => {
  return event.key === "o" || event.key === "O";
};

export const installDebugDialog = (
  scene: Scene,
  options: DebugDialogOptions = {},
) => {
  let panel: Phaser.GameObjects.Container | undefined;

  const toggle = (event: KeyboardEvent) => {
    if (!isDebugToggleKey(event)) {
      return;
    }

    if (panel) {
      panel.destroy();
      panel = undefined;
      return;
    }

    panel = createDebugPanel(scene, options);
  };

  scene.input.keyboard?.on("keydown", toggle);
  scene.events.once("shutdown", () => {
    scene.input.keyboard?.off("keydown", toggle);
    panel?.destroy();
    panel = undefined;
  });
};

const createDebugPanel = (
  scene: Scene,
  options: DebugDialogOptions,
) => {
  const panel = scene.add.container(512, 384).setDepth(PANEL_DEPTH);
  const bg = scene.add
    .rectangle(0, 0, 440, 260, 0x111827, 0.94)
    .setStrokeStyle(3, 0xf5d56a, 1);
  const title = scene.add
    .text(0, -96, "DEBUG", {
      fontFamily: "Arial Black",
      fontSize: 26,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 5,
      align: "center",
    })
    .setOrigin(0.5);
  const hint = scene.add
    .text(0, 96, "Press O to close", {
      fontFamily: "Arial",
      fontSize: 15,
      color: "#d8f2ff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
    })
    .setOrigin(0.5);

  panel.add([bg, title, hint]);

  if (!options.session) {
    const noSession = scene.add
      .text(0, -12, "No game session available in this scene.", {
        fontFamily: "Arial Black",
        fontSize: 18,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4,
        align: "center",
        wordWrap: { width: 360 },
      })
      .setOrigin(0.5);
    panel.add(noSession);
    configureDebugPanelCamera(scene, panel);
    return panel;
  }

  const label = scene.add
    .text(0, -48, "Team size", {
      fontFamily: "Arial Black",
      fontSize: 20,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5);
  const status = scene.add
    .text(0, 48, "", {
      fontFamily: "Courier New",
      fontSize: 15,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
    })
    .setOrigin(0.5);

  panel.add([label, status]);

  [1, 2, 3].forEach((size, index) => {
    const button = createButton(scene, -116 + index * 116, 0, `${size}`, () => {
      setTeamSize(options.session!, size);
      refreshStatus(options.session!, status);
      options.onSessionChanged?.();
    });
    panel.add(button);
  });

  refreshStatus(options.session, status);
  configureDebugPanelCamera(scene, panel);

  return panel;
};

const createButton = (
  scene: Scene,
  x: number,
  y: number,
  label: string,
  onSelect: () => void,
) => {
  const button = scene.add.container(x, y);
  const bg = scene.add
    .rectangle(0, 0, 76, 44, 0x243b6b, 0.96)
    .setStrokeStyle(2, 0x6688ff, 1);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: "Arial Black",
      fontSize: 22,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5);

  button.add([bg, text]);
  button.setSize(76, 44);
  button.setInteractive({ useHandCursor: true });
  button.on("pointerover", () => {
    bg.setFillStyle(0x365aa0, 0.96);
  });
  button.on("pointerout", () => {
    bg.setFillStyle(0x243b6b, 0.96);
  });
  button.on("pointerdown", onSelect);

  return button;
};

const setTeamSize = (session: GameSession, size: number) => {
  HERO_ORDER.forEach((heroKey, index) => {
    const hero = session.heroes[heroKey];
    const inParty = index < size;

    hero.unlocked = inParty;
    hero.recruited = inParty;
    hero.hp = hero.maxHp;
  });
};

const refreshStatus = (
  session: GameSession,
  status: Phaser.GameObjects.Text,
) => {
  const party = HERO_ORDER
    .filter((heroKey) => session.heroes[heroKey].recruited)
    .map((heroKey) => session.heroes[heroKey].name)
    .join(", ");

  status.setText(`Current party: ${party}`);
};

const configureDebugPanelCamera = (
  scene: Scene,
  panel: Phaser.GameObjects.Container,
) => {
  if (scene.cameras.cameras.length <= 1) {
    return;
  }

  scene.cameras.main.ignore(collectPanelObjects(panel));
};

const collectPanelObjects = (
  object: Phaser.GameObjects.GameObject,
): Phaser.GameObjects.GameObject[] => {
  if (!(object instanceof GameObjects.Container)) {
    return [object];
  }

  return [
    object,
    ...object.getAll().flatMap((child) => collectPanelObjects(child)),
  ];
};
