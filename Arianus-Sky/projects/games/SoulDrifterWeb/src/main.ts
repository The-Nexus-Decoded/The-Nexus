import Phaser from "phaser";
import "./styles.css";
import { WorldScene } from "./game/WorldScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#091013",
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [WorldScene],
  render: {
    transparent: false,
    powerPreference: "high-performance",
  },
};

new Phaser.Game(config);
