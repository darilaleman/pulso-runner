import Phaser from 'phaser';
import { GamePlatform, GameResult } from '../../cubaplay/GamePlatform';
import { GAME_INFO, PHYSICS_CONFIG } from '../config/GameConfig';

export class GameScene extends Phaser.Scene {
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
    // Keep the filename requested for the project.
    // Place the file at: public/assets/pulse-runner.png
    this.load.image('player', '/assets/pulso-running.png');
  }

  create() {
    this.startTime = performance.now();
    this.score = 0;
    this.speed = PHYSICS_CONFIG.baseSpeed;
    this.isGameOver = false;
    this.distanceSinceObstacle = 0;
    this.nextObstacleDistance = 420;

    const w = this.scale.width;
    const h = this.scale.height;
    const groundY = h - PHYSICS_CONFIG.groundHeight;

    // Background kept simple, like Chrome Dino.
    this.cameras.main.setBackgroundColor('#ffffff');

    // Ground.
    const ground = this.add.rectangle(
      w / 2,
      groundY + PHYSICS_CONFIG.groundHeight / 2,
      w,
      PHYSICS_CONFIG.groundHeight,
      0xffffff
    );
    this.physics.add.existing(ground, true);

    this.add.rectangle(w / 2, groundY, w, 3, 0x333333);

    // Player. The visual size is explicitly controlled, independent of
    // the source PNG's native resolution.
    let textureKey = 'player';

    if (!this.textures.exists('player')) {
      textureKey = 'playerPlaceholder';
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x222222);
      g.fillCircle(29, 29, 22);
      g.generateTexture(textureKey, 58, 58);
      g.destroy();
    }

    this.player = this.physics.add.sprite(w * 0.12, groundY, textureKey);
    this.player.setOrigin(0.5, 1);
    this.player.setDisplaySize(
      PHYSICS_CONFIG.playerWidth,
      PHYSICS_CONFIG.playerHeight
    );

    // Prevent the player from ever visually going below the ground.
    this.player.setCollideWorldBounds(false);

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

    // Obstacles.
    this.obstacles = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });

    this.physics.add.overlap(
      this.player,
      this.obstacles,
      () => this.gameOver()
    );

    // Score.
    this.scoreText = this.add.text(20, 16, '00000', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#333333',
      fontStyle: 'bold'
    });

    // Controls: space / arrows / tap.
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

    // Distance-based spawning gives the same feel regardless of FPS.
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
      }

      if (obs.x + obs.displayWidth < -30) {
        obs.destroy();
      }
    });
  }

  private jump = () => {
    if (this.isGameOver) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // Only jump when touching the ground, like Chrome Dino.
    if (body.blocked.down || body.touching.down) {
      body.setVelocityY(PHYSICS_CONFIG.jumpPower);
    }
  };

  private spawnObstacle(screenWidth: number, groundY: number) {
    const height = Phaser.Math.Between(32, 58);
    const width = Phaser.Math.Between(18, 30);

    const textureKey = `obstacle-${width}-${height}`;

    if (!this.textures.exists(textureKey)) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x333333);
      g.fillRect(0, 0, width, height);

      // Small side branch to make it feel less like a generic rectangle.
      if (height > 42) {
        g.fillRect(Math.floor(width * 0.55), Math.floor(height * 0.35), 12, 8);
        g.fillRect(Math.floor(width * 0.25), Math.floor(height * 0.55), 10, 8);
      }

      g.generateTexture(textureKey, width, height);
      g.destroy();
    }

    const obs = this.obstacles.create(
      screenWidth + width / 2,
      groundY - height / 2,
      textureKey
    ) as Phaser.Physics.Arcade.Sprite;

    obs.setOrigin(0.5, 0.5);

    const body = obs.body as Phaser.Physics.Arcade.Body;
    body.setSize(width * 0.78, height * 0.92);
    body.setOffset(
      (width - body.width) / 2,
      (height - body.height)
    );

    obs.setData('passed', false);
  }

  private gameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.physics.pause();
    this.player.setTint(0x888888);

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
