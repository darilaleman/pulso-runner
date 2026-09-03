import Phaser from 'phaser';
import { GamePlatform, GameResult } from '../../cubaplay/GamePlatform';
import { GAME_INFO, PHYSICS_CONFIG } from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
  private fondo!: Phaser.GameObjects.TileSprite;
  private platform: GamePlatform;
  private player!: Phaser.Physics.Arcade.Sprite;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private scoreText!: Phaser.GameObjects.Text;

  private score = 0;
  private speed = PHYSICS_CONFIG.baseSpeed;
  private startTime = 0;
  private isGameOver = false;
  private distanceSinceObstacle = 0;
  private nextObstacleDistance = 420;

  constructor(platform: GamePlatform) {
    super('GameScene');
    this.platform = platform;
  }

  preload() {
    // Carga el spritesheet del robot (debe tener fotogramas de 58x58)
    this.load.spritesheet('player', '/assets/pulso-running-sheet.png', {
      frameWidth: 447,
      frameHeight: 500
    });

    // Carga la imagen de fondo
    this.load.image('fondo', '/assets/fondo.png');
     this.load.image('barrel', '/assets/barrel.png');
  }

  create() {
    // Fondo con TileSprite
    this.fondo = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'fondo');
    this.fondo.setOrigin(0, 0).setDepth(-1);
    this.fondo.tilePositionY = 510;

    // Si tu fondo cubre toda la pantalla, puedes eliminar la línea de color sólido
    // this.cameras.main.setBackgroundColor('#ffffff');

    this.startTime = performance.now();
    this.score = 0;
    this.speed = PHYSICS_CONFIG.baseSpeed;
    this.isGameOver = false;
    this.distanceSinceObstacle = 0;
    this.nextObstacleDistance = 420;

    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - PHYSICS_CONFIG.groundHeight;

    // Suelo
    const ground = this.add.rectangle(
      w / 2,
      groundY + PHYSICS_CONFIG.groundHeight / 2,
      w,
      PHYSICS_CONFIG.groundHeight,
      0xffffff
    );
    this.physics.add.existing(ground, true);

    this.add.rectangle(w / 2, groundY, w, 3, 0x333333);

    // Jugador con spritesheet
    this.player = this.physics.add.sprite(w * 0.12, groundY, 'player');
    this.player.setOrigin(0.5, 1);
    this.player.setDisplaySize(
      PHYSICS_CONFIG.playerWidth,
      PHYSICS_CONFIG.playerHeight
    );

    // Crear la animación de carrera (ajusta el número de fotogramas según tu spritesheet)
    // Si tienes 4 fotogramas: end: 3. Si tienes 2: end: 1.
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 1 }),
      frameRate: 10,   // Velocidad de la animación (ajústala a tu gusto)
      repeat: -1       // Repetir indefinidamente
    });

    // Reproducir la animación
    this.player.play('run');

    // Prevenir que el jugador se salga de los límites
    this.player.setCollideWorldBounds(false);

    // Ajustar hitbox
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const localWidth = this.player.width;
    const localHeight = this.player.height;

    body.setSize(
      localWidth * PHYSICS_CONFIG.hitboxWidthRatio,
      localHeight * PHYSICS_CONFIG.hitboxHeightRatio
    );
    body.setOffset(
      (localWidth - body.width) / 2,
      localHeight - body.height
    );

    this.physics.add.collider(this.player, ground);

    // Obstáculos
    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      () => this.gameOver()
    );

    // Puntuación
    this.scoreText = this.add.text(20, 16, '00000', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#333333',
      fontStyle: 'bold'
    });

    // Controles: espacio / flecha arriba / clic
    this.input.keyboard?.on('keydown-SPACE', this.jump);
    this.input.keyboard?.on('keydown-UP', this.jump);
    this.input.on('pointerdown', this.jump);
  }

  update(_time: number, delta: number) {
    if (this.isGameOver) return;

    const dt = Math.min(delta, 50) / 1000;
    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - PHYSICS_CONFIG.groundHeight;

    // Desplazamiento del fondo
    if (this.fondo) {
      const scrollSpeed = this.speed * 0.6;
      this.fondo.tilePositionX += scrollSpeed * dt;
    }

    // Spawn de obstáculos basado en distancia
    this.distanceSinceObstacle += this.speed * dt;

    if (this.distanceSinceObstacle >= this.nextObstacleDistance) {
      this.spawnObstacle(w, groundY);
      this.distanceSinceObstacle = 0;
      this.nextObstacleDistance = Phaser.Math.Between(
        PHYSICS_CONFIG.minObstacleGap,
        PHYSICS_CONFIG.maxObstacleGap
      );
    }

    // Mover obstáculos y actualizar puntuación
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
      }

      if (obs.x + obs.displayWidth < -30) {
        obs.destroy();
      }
    });
  }

  private jump = () => {
    if (this.isGameOver) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(PHYSICS_CONFIG.jumpPower);
    }
  };

private spawnObstacle(screenWidth: number, groundY: number) {
  // Tamaños base de la imagen (puedes usar el tamaño real o uno fijo)
  const baseWidth = 30;
  const baseHeight = 40;

  // Escala aleatoria entre 0.5 y 1.5 (o el rango que quieras)
  const scale = Phaser.Math.FloatBetween(1.4, 2.1);

  // Tamaño final
  const width = baseWidth * scale;
  const height = baseHeight * scale;

  // Crear el obstáculo
  const obs = this.obstacles.create(
    screenWidth + width / 2,
    groundY - height / 2,
    'barrel'
  ) as Phaser.Physics.Arcade.Sprite;

  // Escalar la imagen al tamaño deseado
  obs.setDisplaySize(width, height);
  obs.setOrigin(0.5, 0.5);

  // Ajustar hitbox proporcionalmente
  const body = obs.body as Phaser.Physics.Arcade.Body;
  body.setSize(width * 0.8, height * 0.8);
  body.setOffset((width - body.width) / 2, (height - body.height) / 2);

  obs.setData('passed', false);
}

  private gameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0x888888);
    this.player.anims.stop(); // Detiene la animación al morir

    const duration = performance.now() - this.startTime;

    const result: GameResult = {
      gameId: GAME_INFO.id,
      gameVersion: GAME_INFO.version,
      score: this.score,
      durationMs: Math.round(duration),
      statistics: {
        obstaclesPassed: Math.floor(this.score / 10)
      }
    };

    this.platform.submitResult(result);
  }
}