import Phaser from 'phaser';
import { WebTestPlatform } from './cubaplay/WebTestPlatform';
import { GameScene } from './game/scenes/GameScene';

async function init() {
  const platform = new WebTestPlatform();
  await platform.initialize();
  await platform.startGame();

  // Fixed logical game size, then Phaser scales it to the available area.
  // This keeps character/obstacle physics consistent on different screens.
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 960,
    height: 360,
    backgroundColor: '#ffffff',
    parent: 'game-container',

    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },

    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 2400 },
        debug: false
      }
    },

    render: {
      antialias: true,
      roundPixels: true
    },

    scene: [new GameScene(platform)]
  };

  new Phaser.Game(config);
}

init();
