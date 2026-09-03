import Phaser from 'phaser';
import { MenuScene } from './game/scenes/MenuScene';
import { GameScene } from './game/scenes/GameScene';

// Aplicar estilos al contenedor para ocupar toda la pantalla
const container = document.getElementById('game-container');
if (container) {
  container.style.width = '100vw';
  container.style.height = '100vh';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.overflow = 'hidden';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.backgroundColor = '#000';
}

// Crear overlay de orientación
const orientationOverlay = document.createElement('div');
orientationOverlay.id = 'orientation-overlay';
orientationOverlay.style.position = 'fixed';
orientationOverlay.style.top = '0';
orientationOverlay.style.left = '0';
orientationOverlay.style.width = '100%';
orientationOverlay.style.height = '100%';
orientationOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
orientationOverlay.style.color = 'white';
orientationOverlay.style.display = 'none';
orientationOverlay.style.justifyContent = 'center';
orientationOverlay.style.alignItems = 'center';
orientationOverlay.style.flexDirection = 'column';
orientationOverlay.style.fontFamily = 'Arial, sans-serif';
orientationOverlay.style.fontSize = '24px';
orientationOverlay.style.zIndex = '1000';
orientationOverlay.innerHTML = `
  <div style="text-align:center; padding: 20px;">
    <div style="font-size:64px;">📱</div>
    <div style="margin-top:20px;">Por favor, gira tu dispositivo</div>
    <div style="font-size:18px; margin-top:10px;">para jugar en horizontal</div>
  </div>
`;
document.body.appendChild(orientationOverlay);

function checkOrientation() {
  const isLandscape = window.innerWidth > window.innerHeight;
  orientationOverlay.style.display = isLandscape ? 'none' : 'flex';
}

// Escuchar cambios de orientación
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => {
  setTimeout(checkOrientation, 300);
});
checkOrientation();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 360,
  backgroundColor: '#f0f2f5',
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 360
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        y: 2400,
        x: 0
      },
      debug: false
    }
  },
  scene: [MenuScene, GameScene]
};

new Phaser.Game(config);