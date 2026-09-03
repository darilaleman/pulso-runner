import Phaser from 'phaser';
import { PLACES, loadProgress, isPlaceCompleted } from '../places';
import { WebTestPlatform } from '../../cubaplay/WebTestPlatform';

const COLORS = {
  bgTop: 0x1e3c72,
  bgBottom: 0x2a5298,
  panel: 0x0f2027,
  panelBorder: 0x00d4ff,
  cardBg: 0x16213e,
  cardBgCompleted: 0x16302a,
  cardBgLocked: 0x0d1321,
  cardBorderUnlocked: 0x3498db,
  cardBorderCompleted: 0x2ecc71,
  cardBorderLocked: 0x555568,
  gold: 0xf1c40f,
  textLight: '#ecf0f1',
  textLocked: '#5a6378',
};

type Place = (typeof PLACES)[number];
type Progress = ReturnType<typeof loadProgress>;

export class MenuScene extends Phaser.Scene {
  private platform!: WebTestPlatform;

  // Scroll state
  private listContainer!: Phaser.GameObjects.Container;
  private viewport = { x: 0, y: 0, width: 0, height: 0 };
  private listBaseY = 0;
  private scrollY = 0;
  private maxScrollY = 0;

  // Scrollbar
  private scrollThumb?: Phaser.GameObjects.Graphics;
  private scrollTrackX = 0;
  private scrollTrackY = 0;
  private scrollTrackWidth = 6;
  private scrollTrackHeight = 0;

  constructor() {
    super('MenuScene');
  }

  async init() {
    this.platform = new WebTestPlatform();
    await this.platform.initialize();
    await this.platform.startGame();
  }

  create() {
    const { width, height } = this.scale;
    const progress = loadProgress();

    this.drawBackground(width, height);
    this.drawTitle(width, height);
    this.drawProgressBar(width, height, progress);
    this.buildList(width, height, progress);
  }

  // ---------- Fondo y cabecera ----------

  private drawBackground(width: number, height: number) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    bg.fillRect(0, 0, width, height);

    // Círculos decorativos muy sutiles para dar profundidad
    const deco = this.add.graphics();
    deco.fillStyle(0xffffff, 0.03);
    deco.fillCircle(width * 0.1, height * 0.15, 80);
    deco.fillCircle(width * 0.9, height * 0.85, 120);
    deco.fillCircle(width * 0.85, height * 0.1, 60);
  }

  private drawTitle(width: number, height: number) {
    const titleY = height * 0.08;
    const title = this.add.text(width / 2, titleY, '🏃 PULSO RUNNER', {
      fontSize: Math.min(width * 0.045, 38) + 'px',
      fontFamily: 'Arial Black, Arial',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#0f2027',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: 'rgba(0,0,0,0.4)', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      y: titleY - 4,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawProgressBar(width: number, height: number, progress: Progress) {
    const totalMaps = PLACES.filter((p) => p.id !== 'infinito').length;
    const completedCount = progress.completed.length;
    const progressY = height * 0.08 + height * 0.07;

    this.add.text(width / 2, progressY, `⭐ Progreso: ${completedCount}/${totalMaps} mapas`, {
      fontSize: Math.min(width * 0.02, 16) + 'px',
      fontFamily: 'Arial',
      color: COLORS.textLight,
    }).setOrigin(0.5);

    const barWidth = Math.min(width * 0.3, 240);
    const barX = (width - barWidth) / 2;
    const barY = progressY + height * 0.035;
    const barHeight = 10;

    const track = this.add.graphics();
    track.fillStyle(0x0f2027, 1);
    track.fillRoundedRect(barX, barY, barWidth, barHeight, barHeight / 2);
    track.lineStyle(1, 0xffffff, 0.15);
    track.strokeRoundedRect(barX, barY, barWidth, barHeight, barHeight / 2);

    const fillWidth = Math.max(barHeight, Math.min((completedCount / totalMaps) * barWidth, barWidth));
    const fill = this.add.graphics();
    fill.fillGradientStyle(0x2ecc71, 0x2ecc71, 0x27ae60, 0x27ae60, 1);
    fill.fillRoundedRect(barX, barY, fillWidth, barHeight, barHeight / 2);
  }

  // ---------- Lista con scroll ----------

  private buildList(width: number, height: number, progress: Progress) {
    const VISIBLE_ITEMS = width < 500 ? 5 : 6;
    const cardHeight = Math.min(height * 0.075, 58);
    const gapY = cardHeight + Math.min(height * 0.015, 12);
    const cardWidth = Math.min(width * 0.78, 720);
    const cardX = (width - cardWidth) / 2;

    const listTop = height * 0.08 + height * 0.07 + height * 0.035 + 30;
    const viewportHeight = gapY * VISIBLE_ITEMS - (gapY - cardHeight);
    const viewportY = listTop;

    this.viewport = { x: cardX - 12, y: viewportY - 10, width: cardWidth + 24, height: viewportHeight + 20 };

    // Panel de fondo tipo "consola" detrás de la lista
    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panel, 0.55);
    panel.fillRoundedRect(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 16);
    panel.lineStyle(2, COLORS.panelBorder, 0.35);
    panel.strokeRoundedRect(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 16);

    // Máscara para recortar el contenido que se sale del viewport
    const maskShape = this.make.graphics({});
    maskShape.fillStyle(0xffffff);
    maskShape.fillRoundedRect(this.viewport.x, this.viewport.y, this.viewport.width, this.viewport.height, 16);
    const mask = maskShape.createGeometryMask();

    this.listBaseY = viewportY;
    this.listContainer = this.add.container(0, this.listBaseY);
    this.listContainer.setMask(mask);

    PLACES.forEach((place, index) => {
      const y = index * gapY + cardHeight / 2;
      const isUnlocked = progress.unlocked.includes(place.id);
      const isCompleted = isPlaceCompleted(progress, place.id);
      const card = this.buildCard(place, cardX, y, cardWidth, cardHeight, isUnlocked, isCompleted, width);
      this.listContainer.add(card);
    });

    const totalHeight = PLACES.length * gapY - (gapY - cardHeight);
    this.maxScrollY = Math.max(0, totalHeight - viewportHeight);

    if (this.maxScrollY > 0) {
      this.setupScrollbar(cardX, cardWidth, viewportY, viewportHeight);
      this.setupScrollInput();
    }
  }

  private buildCard(
    place: Place,
    cardX: number,
    y: number,
    cardWidth: number,
    cardHeight: number,
    isUnlocked: boolean,
    isCompleted: boolean,
    width: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(0, y);

    const bgColor = isCompleted ? COLORS.cardBgCompleted : isUnlocked ? COLORS.cardBg : COLORS.cardBgLocked;
    const strokeColor = isCompleted
      ? COLORS.cardBorderCompleted
      : isUnlocked
      ? COLORS.cardBorderUnlocked
      : COLORS.cardBorderLocked;

    const card = this.add.graphics();
    // sombra
    card.fillStyle(0x000000, 0.25);
    card.fillRoundedRect(cardX - cardHeight / 2 + 3, -cardHeight / 2 + 4, cardWidth, cardHeight, 12);
    // cuerpo
    card.fillStyle(bgColor, 1);
    card.fillRoundedRect(cardX - cardHeight / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
    card.lineStyle(2, strokeColor, isUnlocked ? 0.9 : 0.5);
    card.strokeRoundedRect(cardX - cardHeight / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
    container.add(card);

    // Insignia circular con el emoji del lugar
    const badgeR = cardHeight * 0.35;
    const badgeX = cardX - cardHeight / 2 + badgeR + 10;
    const badge = this.add.graphics();
    badge.fillStyle(isUnlocked ? 0x0f2027 : 0x1a1f2b, 1);
    badge.fillCircle(badgeX, 0, badgeR);
    badge.lineStyle(2, strokeColor, isUnlocked ? 0.9 : 0.4);
    badge.strokeCircle(badgeX, 0, badgeR);
    container.add(badge);

    container.add(
      this.add
        .text(badgeX, 0, isUnlocked ? place.emoji : '🔒', {
          fontSize: Math.min(badgeR * 1.1, 22) + 'px',
        })
        .setOrigin(0.5)
    );

    // Nombre del lugar
    const nameColor = isUnlocked ? COLORS.textLight : COLORS.textLocked;
    const fontSize = Math.min(width * 0.02, 18) + 'px';
    container.add(
      this.add
        .text(badgeX + badgeR + 14, 0, place.name, {
          fontSize,
          fontFamily: 'Arial',
          color: nameColor,
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
    );

    // Estado / puntaje requerido
    const statusX = cardX - cardHeight / 2 + cardWidth - (isUnlocked ? 62 : 130);
    if (place.id === 'infinito') {
      // sin texto de estado extra
    } else if (isCompleted) {
      container.add(
        this.add
          .text(statusX, 0, '', {
            fontSize: Math.min(width * 0.014, 13) + 'px',
            fontFamily: 'Arial',
            color: '#27ae60',
          })
          .setOrigin(0, 0.5)
      );
    } else if (!isUnlocked) {
      container.add(
        this.add
          .text(statusX, 0, `🔒 ${place.targetScore} pts`, {
            fontSize: Math.min(width * 0.015, 14) + 'px',
            fontFamily: 'Arial',
            color: '#f1c40f',
          })
          .setOrigin(0, 0.5)
      );
    }

    // Botón de jugar (circular, con estados hover)
    if (isUnlocked) {
      const btnSize = Math.min(cardHeight * 0.85, 44);
      const btnX = cardX - cardHeight / 2 + cardWidth - 30;

      const btnBg = this.add.graphics();
      const drawBtn = (color: number) => {
        btnBg.clear();
        btnBg.fillStyle(color, 1);
        btnBg.fillCircle(btnX, 0, btnSize / 2);
        btnBg.lineStyle(2, 0xffffff, 0.4);
        btnBg.strokeCircle(btnX, 0, btnSize / 2);
      };
      drawBtn(0x2ecc71);
      btnBg.setInteractive(new Phaser.Geom.Circle(btnX, 0, btnSize / 2), Phaser.Geom.Circle.Contains);

      btnBg.on('pointerdown', () => {
        this.scene.start('GameScene', { platform: this.platform, place });
      });
      btnBg.on('pointerover', () => drawBtn(0x27ae60));
      btnBg.on('pointerout', () => drawBtn(0x2ecc71));

      container.add(btnBg);
      container.add(
        this.add
          .text(btnX, 0, '▶', {
            fontSize: Math.min(width * 0.02, 18) + 'px',
            fontFamily: 'Arial',
            color: '#ffffff',
          })
          .setOrigin(0.5)
      );
    }

    return container;
  }

  // ---------- Scrollbar ----------

  private setupScrollbar(cardX: number, cardWidth: number, viewportY: number, viewportHeight: number) {
    this.scrollTrackX = cardX + cardWidth + 4;
    this.scrollTrackY = viewportY;
    this.scrollTrackHeight = viewportHeight;

    const track = this.add.graphics();
    track.fillStyle(0xffffff, 0.1);
    track.fillRoundedRect(this.scrollTrackX, this.scrollTrackY, this.scrollTrackWidth, this.scrollTrackHeight, 3);

    this.scrollThumb = this.add.graphics();
    this.drawScrollThumb();
  }

  private drawScrollThumb() {
    if (!this.scrollThumb) return;
    const ratio = this.scrollTrackHeight / (this.scrollTrackHeight + this.maxScrollY);
    const thumbHeight = Math.max(24, this.scrollTrackHeight * ratio);
    const progress = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0;
    const thumbY = this.scrollTrackY + progress * (this.scrollTrackHeight - thumbHeight);

    this.scrollThumb.clear();
    this.scrollThumb.fillStyle(0x00d4ff, 0.75);
    this.scrollThumb.fillRoundedRect(this.scrollTrackX, thumbY, this.scrollTrackWidth, thumbHeight, 3);
  }

  // ---------- Input de scroll (rueda del mouse + arrastre táctil) ----------

  private setupScrollInput() {
    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, deltaY: number) => {
        if (!this.isInsideViewport(pointer)) return;
        this.setScroll(this.scrollY + deltaY * 0.5);
      }
    );

    let dragging = false;
    let lastY = 0;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isInsideViewport(pointer)) return;
      dragging = true;
      lastY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!dragging) return;
      const delta = lastY - pointer.y;
      lastY = pointer.y;
      this.setScroll(this.scrollY + delta);
    });

    this.input.on('pointerup', () => (dragging = false));
    this.input.on('pointerupoutside', () => (dragging = false));
  }

  private isInsideViewport(pointer: Phaser.Input.Pointer) {
    return (
      pointer.y >= this.viewport.y &&
      pointer.y <= this.viewport.y + this.viewport.height &&
      pointer.x >= this.viewport.x &&
      pointer.x <= this.viewport.x + this.viewport.width
    );
  }

  private setScroll(value: number) {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScrollY);
    this.listContainer.y = this.listBaseY - this.scrollY;
    this.drawScrollThumb();
  }
}