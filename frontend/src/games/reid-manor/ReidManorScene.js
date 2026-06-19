import Phaser from 'phaser';
import ChestSystem from './ChestSystem';
import ControlHelpSystem from './ControlHelpSystem';
import { createItemIconTextures, createPlayerTextures, drawFarmMap, getPlayerTextureKey } from './art';
import FarmingSystem from './FarmingSystem';
import InventorySystem from './InventorySystem';
import NpcSystem from './NpcSystem';
import PauseMenuSystem from './PauseMenuSystem';
import QuestSystem from './QuestSystem';
import SaveSystem from './SaveSystem';
import ShopSystem from './ShopSystem';
import TouchControlsSystem from './TouchControlsSystem';
import TimeSystem from './TimeSystem';
import { AUTO_SAVE_INTERVAL_MS, PLAYER_CONFIG } from './config';
import {
  COLLISION_RECTS,
  CRATE,
  INTERACTIVE_OBJECTS,
  NOTICE_BOARD,
  SHOP,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  toWorldRect
} from './map';

const PLAYER_SPEED = 132;
const PLAYER_BODY = { width: 18, height: 18, offsetX: 7, offsetY: 13 };
const INTERACTION_DISTANCE = 34;

export default class ReidManorScene extends Phaser.Scene {
  constructor() {
    super('ReidManorScene');
    this.direction = 'down';
    this.activeInteraction = null;
    this.messageTimer = null;
    this.autoSaveElapsed = 0;
    this.isSleeping = false;
    this.isDestroyed = false;
  }

  create() {
    this.cameras.main.setBackgroundColor('#6fb55a');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.saveSystem = new SaveSystem();
    this.saveData = this.saveSystem.load();
    this.isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    drawFarmMap(this);
    createItemIconTextures(this);
    createPlayerTextures(this, this.saveData.character);

    this.direction = this.saveData.player.direction || PLAYER_CONFIG.direction;
    this.player = this.add.sprite(
      this.saveData.player.x,
      this.saveData.player.y,
      this.getPlayerTexture(this.direction)
    );
    this.player.setDepth(10);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      one: Phaser.Input.Keyboard.KeyCodes.ONE,
      two: Phaser.Input.Keyboard.KeyCodes.TWO,
      three: Phaser.Input.Keyboard.KeyCodes.THREE,
      four: Phaser.Input.Keyboard.KeyCodes.FOUR,
      five: Phaser.Input.Keyboard.KeyCodes.FIVE,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC
    });

    this.gameTime = new TimeSystem(this.saveData.time);
    this.inventory = new InventorySystem(this, this.saveData.inventory);
    this.farming = new FarmingSystem(this, this.saveData.farm);
    this.shop = new ShopSystem(this);
    this.quest = new QuestSystem(this, this.saveData.quest);
    this.chest = new ChestSystem(this, this.saveData.chest);
    this.npcs = new NpcSystem(this);
    this.touchControls = new TouchControlsSystem(this, { enabled: this.isTouchDevice });
    this.controlHelp = new ControlHelpSystem(this, this.isTouchDevice);
    this.pauseMenu = new PauseMenuSystem(this);
    this.gameTime.onSleep(() => this.startNextDay());
    this.updateHud();

    this.promptText = this.add.text(16, WORLD_HEIGHT - 166, '', {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '16px',
      color: '#fff7df',
      backgroundColor: 'rgba(45, 40, 31, 0.72)',
      padding: { x: 12, y: 8 }
    });
    this.promptText.setDepth(20);
    this.promptText.setScrollFactor(0);
    this.promptText.setVisible(false);

    this.helpText = this.add.text(WORLD_WIDTH - 16, 16, this.getQuickHelpText(), {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '14px',
      color: '#2f2a20',
      backgroundColor: 'rgba(255, 247, 222, 0.78)',
      padding: { x: 10, y: 7 }
    });
    this.helpText.setOrigin(1, 0);
    this.helpText.setDepth(20);

    this.nightOverlay = this.add.graphics();
    this.nightOverlay.setDepth(30);
    this.nightOverlay.setScrollFactor(0);
    this.rainOverlay = this.add.graphics();
    this.rainOverlay.setDepth(31);
    this.rainOverlay.setScrollFactor(0);

    this.beforeUnloadHandler = () => this.saveNow();
    this.resetHandler = () => this.restartManor();
    this.resizeHandler = () => this.handleScaleRefresh();
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
    window.addEventListener('reid-manor-reset', this.resetHandler);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.saveNow();
    window.dispatchEvent(new CustomEvent('reid-manor-ready'));
  }

  update(_, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.pauseMenu?.isOpen()) {
        this.pauseMenu.close();
      } else if (this.hasOpenPanel()) {
        this.closeOpenPanel();
      } else {
        this.pauseMenu?.open();
      }
      return;
    }

    if (this.pauseMenu?.isOpen()) {
      return;
    }

    this.gameTime.update(delta);
    this.updateHud();
    this.handleHotbarInput();
    this.autoSaveElapsed += delta;
    this.npcs.update(delta);

    const input = this.getMovementInput();
    const distance = PLAYER_SPEED * (delta / 1000);

    if (!this.hasOpenPanel() && (input.x !== 0 || input.y !== 0)) {
      if (Math.abs(input.x) > Math.abs(input.y)) {
        this.direction = input.x > 0 ? 'right' : 'left';
      } else {
        this.direction = input.y > 0 ? 'down' : 'up';
      }

      this.player.setTexture(this.getPlayerTexture(this.direction));
      this.movePlayer(input.x * distance, input.y * distance);
    }

    this.updateInteraction();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e) && this.activeInteraction) {
      this.handleInteraction();
    }

    if (!this.hasOpenPanel() && Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.useSelectedItem();
    }

    this.farming.update(this.gameTime, this.gameTime.getWeather());
    this.updateAtmosphere();

    if (this.autoSaveElapsed >= AUTO_SAVE_INTERVAL_MS) {
      this.autoSaveElapsed = 0;
      this.saveNow();
    }
  }

  getMovementInput() {
    let x = 0;
    let y = 0;

    if (this.keys.left.isDown || this.keys.a.isDown) x -= 1;
    if (this.keys.right.isDown || this.keys.d.isDown) x += 1;
    if (this.keys.up.isDown || this.keys.w.isDown) y -= 1;
    if (this.keys.down.isDown || this.keys.s.isDown) y += 1;

    const touchVector = this.touchControls?.getVector() || { x: 0, y: 0 };
    x += touchVector.x;
    y += touchVector.y;

    if (x !== 0 && y !== 0) {
      const diagonal = Math.SQRT1_2;
      x *= diagonal;
      y *= diagonal;
    }

    return { x, y };
  }

  movePlayer(dx, dy) {
    if (dx !== 0) {
      const nextX = this.player.x + dx;
      if (!this.collidesAt(nextX, this.player.y)) {
        this.player.x = nextX;
      }
    }

    if (dy !== 0) {
      const nextY = this.player.y + dy;
      if (!this.collidesAt(this.player.x, nextY)) {
        this.player.y = nextY;
      }
    }
  }

  collidesAt(x, y) {
    const body = this.getPlayerRect(x, y);

    if (
      body.x < 0 ||
      body.y < 0 ||
      body.right > WORLD_WIDTH ||
      body.bottom > WORLD_HEIGHT
    ) {
      return true;
    }

    return COLLISION_RECTS.some((rect) => {
      const obstacle = new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height);
      return Phaser.Geom.Intersects.RectangleToRectangle(body, obstacle);
    });
  }

  getPlayerRect(x = this.player.x, y = this.player.y) {
    return new Phaser.Geom.Rectangle(
      x - 16 + PLAYER_BODY.offsetX,
      y - 16 + PLAYER_BODY.offsetY,
      PLAYER_BODY.width,
      PLAYER_BODY.height
    );
  }

  updateInteraction() {
    if (this.hasOpenPanel()) {
      this.activeInteraction = null;
      this.promptText.setVisible(false);
      return;
    }

    const npc = this.npcs.getNearby(this.player);
    if (npc) {
      this.activeInteraction = { type: 'npc', npc, label: npc.name };
      this.promptText.setText(`靠近${npc.name}：[E] 对话`);
      this.promptText.setVisible(true);
      return;
    }

    const nearest = INTERACTIVE_OBJECTS.find((object) => {
      const rect = toWorldRect(object);
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      return Phaser.Math.Distance.Between(this.player.x, this.player.y, centerX, centerY) <=
        Math.max(INTERACTION_DISTANCE, rect.width / 2 + INTERACTION_DISTANCE);
    });

    this.activeInteraction = nearest ? { type: 'object', object: nearest, label: nearest.label } : null;

    if (this.activeInteraction) {
      this.promptText.setText(this.getInteractionPrompt(this.activeInteraction));
      this.promptText.setVisible(true);
    } else if (!this.messageTimer) {
      this.promptText.setVisible(false);
    }
  }

  showMessage(message) {
    this.promptText.setText(message);
    this.promptText.setVisible(true);

    if (this.messageTimer) {
      this.messageTimer.remove(false);
    }

    this.messageTimer = this.time.delayedCall(2200, () => {
      this.messageTimer = null;
      this.updateInteraction();
    });
  }

  handleHotbarInput() {
    if (this.hasOpenPanel()) return;

    const numberKeys = [this.keys.one, this.keys.two, this.keys.three, this.keys.four, this.keys.five];
    numberKeys.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.inventory.select(index);
        this.saveNow();
      }
    });
  }

  useSelectedItem() {
    const targetTile = this.getFacingTile();
    const selectedItem = this.inventory.getSelectedItem();

    if (!selectedItem) {
      this.showMessage('没有选中物品');
      return;
    }

    if (selectedItem.action === 'openInventory') {
      this.inventory.togglePanel();
      return;
    }

    if (this.farming.canHarvestAt(targetTile, this.gameTime)) {
      const harvestResult = this.farming.harvestIfReadyAt(targetTile, this.inventory, this.gameTime);
      this.showMessage(harvestResult.message);
      if (harvestResult.ok) {
        this.quest.recordHarvest(harvestResult.harvestedItemId, harvestResult.harvestQuantity);
        this.saveNow();
      }
      return;
    }

    const result = this.farming.useSelectedItem({
      item: selectedItem,
      tile: targetTile,
      inventory: this.inventory,
      gameTime: this.gameTime
    });

    if (result.message) {
      this.showMessage(result.message);
    }

    if (result.ok) {
      this.saveNow();
    }
  }

  getFacingTile() {
    const footX = this.player.x;
    const footY = this.player.y + 10;
    let tileX = Math.floor(footX / TILE_SIZE);
    let tileY = Math.floor(footY / TILE_SIZE);

    if (this.direction === 'up') tileY -= 1;
    if (this.direction === 'down') tileY += 1;
    if (this.direction === 'left') tileX -= 1;
    if (this.direction === 'right') tileX += 1;

    return { x: tileX, y: tileY };
  }

  shutdown() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.saveNow();
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    window.removeEventListener('reid-manor-reset', this.resetHandler);
    this.scale?.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.nightOverlay?.destroy();
    this.rainOverlay?.destroy();
    this.inventory?.destroy();
    this.farming?.destroy();
    this.shop?.destroy();
    this.quest?.destroy();
    this.chest?.destroy();
    this.npcs?.destroy();
    this.touchControls?.destroy();
    this.controlHelp?.destroy();
    this.pauseMenu?.destroy();
  }

  startNextDay() {
    if (this.isSleeping) return;

    this.isSleeping = true;
    const day = this.gameTime.sleepToNextDay();
    this.farming.resetWateredStateForNewDay(day);
    this.quest.ensureForDay(day);
    this.player.setPosition(PLAYER_CONFIG.homeX, PLAYER_CONFIG.homeY);
    this.direction = PLAYER_CONFIG.direction;
    this.player.setTexture(this.getPlayerTexture(this.direction));
    this.farming.update(this.gameTime, this.gameTime.getWeather());
    this.showMessage(`睡了一觉，新的早晨开始了：${this.gameTime.getWeatherLabel()}`);
    this.updateHud();
    this.saveNow();
    this.time.delayedCall(500, () => {
      this.isSleeping = false;
    });
  }

  updateHud() {
    this.inventory.updateHud({
      day: this.gameTime.getDay(),
      weekday: this.gameTime.getWeekday(),
      time: this.gameTime.getDisplayTime(),
      weather: this.gameTime.getWeatherLabel(),
      gold: this.inventory.getQuantity('coin')
    });
  }

  updateAtmosphere() {
    const alpha = this.gameTime.getNightAlpha();
    this.nightOverlay.clear();
    if (alpha > 0) {
      this.nightOverlay.fillStyle(0x071022, alpha);
      this.nightOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    this.rainOverlay.clear();
    if (this.gameTime.getWeather() !== 'rainy') return;

    this.rainOverlay.lineStyle(1, 0xb9ddff, 0.42);
    const offset = Math.floor(this.gameTime.getTotalMinutes() % 18);
    for (let x = -40; x < this.scale.width + 40; x += 34) {
      for (let y = -20; y < this.scale.height + 20; y += 70) {
        this.rainOverlay.lineBetween(x + offset, y, x + offset - 10, y + 26);
      }
    }
  }

  getSnapshot() {
    return {
      player: {
        x: this.player.x,
        y: this.player.y,
        direction: this.direction
      },
      character: this.saveData.character,
      time: this.gameTime.getSnapshot(),
      inventory: this.inventory.getSnapshot(),
      farm: this.farming.getSnapshot(this.gameTime),
      quest: this.quest.getSnapshot(),
      chest: this.chest.getSnapshot()
    };
  }

  saveNow() {
    if (!this.saveSystem || !this.player || !this.inventory || !this.farming || !this.gameTime) {
      return false;
    }

    return this.saveSystem.save(this.getSnapshot());
  }

  restartManor() {
    const freshSave = this.saveSystem.reset();
    this.saveData = freshSave;
    this.gameTime = new TimeSystem(freshSave.time);
    this.inventory.destroy();
    this.farming.destroy();
    this.shop.destroy();
    this.quest.destroy();
    this.chest.destroy();
    this.npcs.destroy();
    this.touchControls.destroy();
    this.controlHelp.destroy();
    this.pauseMenu.destroy();
    this.inventory = new InventorySystem(this, freshSave.inventory);
    this.farming = new FarmingSystem(this, freshSave.farm);
    this.shop = new ShopSystem(this);
    this.quest = new QuestSystem(this, freshSave.quest);
    this.chest = new ChestSystem(this, freshSave.chest);
    this.npcs = new NpcSystem(this);
    this.touchControls = new TouchControlsSystem(this, { enabled: this.isTouchDevice });
    this.controlHelp = new ControlHelpSystem(this, this.isTouchDevice);
    this.pauseMenu = new PauseMenuSystem(this);
    this.gameTime.onSleep(() => this.startNextDay());
    this.direction = freshSave.player.direction;
    this.player.setPosition(freshSave.player.x, freshSave.player.y);
    createPlayerTextures(this, freshSave.character);
    this.player.setTexture(this.getPlayerTexture(this.direction));
    this.updateHud();
    this.showMessage('庄园已重新开始');
    this.saveNow();
  }

  handleInteraction() {
    if (!this.activeInteraction) return;

    if (this.activeInteraction.type === 'npc') {
      this.npcs.openDialog(this.activeInteraction.npc);
      return;
    }

    const object = this.activeInteraction.object;
    if (object.id === SHOP.id) {
      this.shop.open();
      return;
    }

    if (object.id === NOTICE_BOARD.id) {
      this.quest.open();
      return;
    }

    if (object.id === CRATE.id) {
      this.chest.open();
      return;
    }

    if (object.message) {
      this.showMessage(object.message);
    }
  }

  hasOpenPanel() {
    return this.shop?.isOpen() ||
      this.quest?.isOpen() ||
      this.chest?.isOpen() ||
      this.npcs?.isOpen() ||
      this.inventory?.isPanelOpen() ||
      this.controlHelp?.isOpen();
  }

  hasBlockingPanelForTouch() {
    return this.shop?.isOpen() || this.quest?.isOpen() || this.chest?.isOpen() || this.npcs?.isOpen() || this.controlHelp?.isOpen();
  }

  closeOpenPanel() {
    this.shop?.close();
    this.quest?.close();
    this.chest?.close();
    this.npcs?.closeDialog();
    this.inventory?.closePanel();
    this.controlHelp?.close();
  }

  handleScaleRefresh() {
    this.touchControls?.reposition();
    this.controlHelp?.reposition();
    if (this.pauseMenu?.isOpen()) {
      this.pauseMenu.open();
    }
  }

  getQuickHelpText() {
    if (this.isTouchDevice) {
      return '左侧摇杆移动  ·  E 互动  ·  工具使用  ·  背包';
    }

    return 'WASD / 方向键移动  ·  1-5 切换  ·  空格使用  ·  E 互动';
  }

  getInteractionPrompt(interaction) {
    if (interaction.type === 'npc') {
      return `靠近${interaction.label}：[E] 对话`;
    }

    if (interaction.object?.id === CRATE.id) {
      return '[E] 打开木箱';
    }

    return `靠近${interaction.label}：[E] 互动`;
  }

  getPlayerTexture(direction) {
    return getPlayerTextureKey(direction, this.saveData.character);
  }
}
