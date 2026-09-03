// src/game/scenes/GameScene.ts

import Phaser from 'phaser';
import { GamePlatform, GameResult } from '../../cubaplay/GamePlatform';
import { GAME_INFO, PHYSICS_CONFIG } from '../config/GameConfig';
import { Place, loadProgress, updatePlaceScore, getNextPlace, PLACES } from '../places';

export class GameScene extends Phaser.Scene {
  private platform!: GamePlatform;
  private place!: Place;
  private fondo!: Phaser.GameObjects.TileSprite;
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;

  private score = 0;
  private speed = PHYSICS_CONFIG.baseSpeed;
  private startTime = 0;
  private isGameOver = false;
  private isVictory = false;
  private distanceSinceObstacle = 0;
  private nextObstacleDistance = 420;

  constructor() {
    super('GameScene');
  }

  init(data: { platform: GamePlatform; place: Place }) {
    this.platform = data.platform;
    this.place = data.place;
  }

  preload() {
    this.load.spritesheet('player', '/assets/pulso-running-sheet.png', {
      frameWidth: 447,
      frameHeight: 500
    });
    this.load.image('fondo', '/assets/fondo.png');
    this.load.image('cav-bg', '/assets/fondo.png');
    this.load.image('desert-bg', '/assets/desert-bg.png');
    this.load.image('city-bg', '/assets/city-bg.png');
    this.load.image('volcano-bg', '/assets/volcano-bg.png');
    this.load.image('barrel', '/assets/barrel.png');
  }

  create() {
    this.fondo = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, this.place.backgroundKey);
    this.fondo.setOrigin(0, 0).setDepth(-1);
    this.fondo.tilePositionY = 510;

    this.startTime = performance.now();
    this.score = 0;
    this.speed = PHYSICS_CONFIG.baseSpeed;
    this.isGameOver = false;
    this.isVictory = false;
    this.distanceSinceObstacle = 0;
    this.nextObstacleDistance = 420;

    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - PHYSICS_CONFIG.groundHeight;

    const ground = this.add.rectangle(
      w / 2,
      groundY + PHYSICS_CONFIG.groundHeight / 2,
      w,
      PHYSICS_CONFIG.groundHeight,
      0xffffff
    );
    this.physics.add.existing(ground, true);
    this.add.rectangle(w / 2, groundY, w, 3, 0x333333);

    this.player = this.physics.add.sprite(w * 0.12, groundY, 'player');
    this.player.setOrigin(0.5, 1);
    this.player.setDisplaySize(PHYSICS_CONFIG.playerWidth, PHYSICS_CONFIG.playerHeight);

    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
      frameRate: 10,
      repeat: -1
    });
    this.player.play('run');
    this.player.setCollideWorldBounds(false);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const localWidth = this.player.width;
    const localHeight = this.player.height;
    body.setSize(
      localWidth * PHYSICS_CONFIG.hitboxWidthRatio,
      localHeight * PHYSICS_CONFIG.hitboxHeightRatio
    );
    body.setOffset((localWidth - body.width) / 2, localHeight - body.height);

    this.physics.add.collider(this.player, ground);

    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.physics.add.overlap(this.player, this.obstacles, () => this.gameOver());

    this.scoreText = this.add.text(20, 16, '00000', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#333333',
      fontStyle: 'bold'
    });

    if (this.place.id !== 'infinito') {
      this.add.text(w - 20, 16, `🎯 ${this.place.targetScore}`, {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#e67e22',
        fontStyle: 'bold'
      }).setOrigin(1, 0);
    }

    this.input.keyboard?.on('keydown-SPACE', this.jump);
    this.input.keyboard?.on('keydown-UP', this.jump);
    this.input.on('pointerdown', this.jump);
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isVictory) return;

    const dt = Math.min(delta, 50) / 1000;
    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - PHYSICS_CONFIG.groundHeight;

    if (this.fondo) {
      this.fondo.tilePositionX += this.speed * 0.6 * dt;
    }

    this.distanceSinceObstacle += this.speed * dt;
    if (this.distanceSinceObstacle >= this.nextObstacleDistance) {
      this.spawnObstacle(w, groundY);
      this.distanceSinceObstacle = 0;
      this.nextObstacleDistance = Phaser.Math.Between(
        PHYSICS_CONFIG.minObstacleGap,
        PHYSICS_CONFIG.maxObstacleGap
      );
    }

    this.obstacles.children.each((child: Phaser.GameObjects.GameObject) => {
      const obs = child as Phaser.Physics.Arcade.Sprite;
      obs.x -= this.speed * dt;

      if (!obs.getData('passed') && obs.x + obs.displayWidth < this.player.x) {
        obs.setData('passed', true);
        this.score += 10;
        this.scoreText.setText(String(this.score).padStart(5, '0'));

        if (this.score % PHYSICS_CONFIG.speedEveryPoints === 0) {
          this.speed += PHYSICS_CONFIG.speedIncrement;
        }

        if (this.place.id !== 'infinito' && this.score >= this.place.targetScore) {
          this.victory();
          return false;
        }
      }

      if (obs.x + obs.displayWidth < -30) {
        obs.destroy();
      }
      return true;
    });
  }

  private jump = () => {
    if (this.isGameOver || this.isVictory) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(PHYSICS_CONFIG.jumpPower);
    }
  };

  private spawnObstacle(screenWidth: number, groundY: number) {
    const baseWidth = 30;
    const baseHeight = 40;
    const scale = Phaser.Math.FloatBetween(1.4, 2.1);
    const width = baseWidth * scale;
    const height = baseHeight * scale;

    const obs = this.obstacles.create(
      screenWidth + width / 2,
      groundY - height / 2,
      'barrel'
    ) as Phaser.Physics.Arcade.Sprite;

    obs.setDisplaySize(width, height);
    obs.setOrigin(0.5, 0.5);

    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setSize(width * 0.8, height * 0.8);
    body.setOffset((width - body.width) / 2, (height - body.height) / 2);
    obs.setData('passed', false);
  }

  private gameOver() {
    if (this.isGameOver || this.isVictory) return;
    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0x888888);
    this.player.anims.stop();

    const duration = performance.now() - this.startTime;
    const result: GameResult = {
      gameId: GAME_INFO.id,
      gameVersion: GAME_INFO.version,
      score: this.score,
      durationMs: Math.round(duration),
      statistics: { obstaclesPassed: Math.floor(this.score / 10) }
    };
    this.platform.submitResult(result);

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 20, '💀 GAME OVER', {
      fontSize: '42px',
      fontFamily: 'Arial',
      color: '#cc0000',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const retryBtn = this.add.text(width / 2, height / 2 + 40, '🔄 Reintentar', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#3498db',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.scene.restart({ platform: this.platform, place: this.place });
    });

    const menuBtn = this.add.text(width / 2, height / 2 + 100, '🏠 Menú', {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#ffffff',
      backgroundColor: '#95a5a6',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }

  private victory() {
    if (this.isVictory) return;
    this.isVictory = true;
    this.physics.pause();
    this.player.anims.stop();

    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 60, '🎉 ¡VICTORIA!', {
      fontSize: '56px',
      fontFamily: 'Arial',
      color: '#27ae60',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2, `Puntuación: ${this.score} / ${this.place.targetScore}`, {
      fontSize: '28px',
      fontFamily: 'Arial',
      color: '#2c3e50'
    }).setOrigin(0.5);

    const progress = loadProgress();
    const updated = updatePlaceScore(this.place.id, this.score, progress);
    const nextPlace = getNextPlace(updated);

    if (nextPlace) {
      // Solo se muestra si realmente se desbloqueó un nuevo lugar
      this.add.text(width / 2, height / 2 + 40, `🔓 ¡Nuevo mapa desbloqueado: ${nextPlace.name}!`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#e67e22'
      }).setOrigin(0.5);

      const yesBtn = this.add.text(width / 2 - 100, height / 2 + 90, '▶ Siguiente', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#2ecc71',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      yesBtn.on('pointerdown', () => {
        this.scene.start('GameScene', { platform: this.platform, place: nextPlace });
      });

      const noBtn = this.add.text(width / 2 + 100, height / 2 + 90, '🏠 Menú', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#95a5a6',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      noBtn.on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
    } else {
      // No hay más mapas o el actual ya estaba completado
      const allCompleted = updated.completed.length >= PLACES.filter(p => p.id !== 'infinito').length;
      if (allCompleted) {
        this.add.text(width / 2, height / 2 + 40, '🏁 ¡Has completado todos los mapas!', {
          fontSize: '26px',
          fontFamily: 'Arial',
          color: '#2c3e50'
        }).setOrigin(0.5);
      } else {
        this.add.text(width / 2, height / 2 + 40, '✅ Mapa ya completado', {
          fontSize: '24px',
          fontFamily: 'Arial',
          color: '#27ae60'
        }).setOrigin(0.5);
      }

      const menuBtn = this.add.text(width / 2, height / 2 + 90, '🏠 Menú', {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff',
        backgroundColor: '#3498db',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      menuBtn.on('pointerdown', () => {
        this.scene.start('MenuScene');
      });
    }

    const result: GameResult = {
      gameId: GAME_INFO.id,
      gameVersion: GAME_INFO.version,
      score: this.score,
      durationMs: Math.round(performance.now() - this.startTime),
      statistics: {
        obstaclesPassed: Math.floor(this.score / 10),
        victory: true
      }
    };
    this.platform.submitResult(result);
  }
}