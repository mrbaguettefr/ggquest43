import { Boot } from "./scenes/Boot";
import { Battle } from "./scenes/Battle";
import { Credits } from "./scenes/Credits";
import { Exploration } from "./scenes/Exploration";
import { GameOver } from "./scenes/GameOver";
import { MainMenu } from "./scenes/MainMenu";
import { AUTO, CANVAS, Game } from "phaser";
import { PlayerName } from "./scenes/PlayerName";
import { Preloader } from "./scenes/Preloader";
import { Seed } from "./scenes/Seed";

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
  type: CANVAS,
  width: 1024,
  height: 768,
  parent: "game-container",
  backgroundColor: "#028af8",
  scene: [
    Boot,
    Preloader,
    MainMenu,
    Seed,
    PlayerName,
    Exploration,
    Battle,
    Credits,
    GameOver,
  ],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
