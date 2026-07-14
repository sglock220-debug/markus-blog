import Phaser from 'phaser';
import ChestSystem from './ChestSystem';
import ControlHelpSystem from './ControlHelpSystem';
import CraftingSystem from './CraftingSystem';
import { createItemIconTextures, createPlayerTextures, drawFarmMap, getPlayerTextureKey } from './art';
import FarmingSystem from './FarmingSystem';
import FurnitureCatalogSystem from './FurnitureCatalogSystem';
import InventorySystem from './InventorySystem';
import InteriorSystem from './InteriorSystem';
import ItemConfirmSystem from './ItemConfirmSystem';
import { ITEM_IDS } from './items';
import NpcSystem from './NpcSystem';
import PauseMenuSystem from './PauseMenuSystem';
import QuestSystem from './QuestSystem';
import TrashCanSystem from './TrashCanSystem';
import ResourceSystem from './ResourceSystem';
import SaveSystem from './SaveSystem';
import ShopSystem from './ShopSystem';
import StatusSystem from './StatusSystem';
import TouchControlsSystem from './TouchControlsSystem';
import TimeSystem from './TimeSystem';
import { AUTO_SAVE_INTERVAL_MS, PLAYER_CONFIG } from './config';
import {
  COLORS,
  COLLISION_RECTS,
  INTERACTIVE_OBJECTS,
  HOUSE_DOOR,
  MAP_COLUMNS,
  MAP_ROWS,
  MILL,
  NOTICE_BOARD,
  PHARMACY,
  POND_INTERACTION,
  SHOP,
  TILE_SIZE,
  TOWN_FLOWERS,
  TRASH_CAN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  WELL,
  VILLAGE_HOUSES,
  canPlaceChestOnTerrain,
  isGrassTile,
  isNearWater,
  isPointInWater,
  toWorldRect
} from './map';

const PLAYER_SPEED = 132;
const SWIM_SPEED_FACTOR = 0.8;
const RUN_SPEED_FACTOR = 1.5;
const PLAYER_BODY = { width: 18, height: 18, offsetX: 7, offsetY: 13 };
const INTERACTION_DISTANCE = 34;
const LAND_TOOL_ACTIONS = new Set(['axe', 'hoe', 'shovel', 'water', 'plantSapling']);

export default class ReidManorScene extends Phaser.Scene {
  constructor() {
    super('ReidManorScene');
    this.direction = 'down';
    this.activeInteraction = null;
    this.messageTimer = null;
    this.autoSaveElapsed = 0;
    this.isSleeping = false;
    this.isDestroyed = false;
    this.isSwimming = false;
    this.modalStack = [];
  }

  create() {
    this.cameras.main.setBackgroundColor('#6fb55a');
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.saveSystem = new SaveSystem();
    this.saveData = this.saveSystem.load();
    this.isTouchDevice = window.matchMedia?.('(pointer: coarse)').matches || this.sys.game.device.os.android || this.sys.game.device.os.iOS;

    this.mapGraphics = this.add.graphics();
    this.mapGraphics.setDepth(1); // Ground layer
    
    createItemIconTextures(this);
    createPlayerTextures(this, this.saveData.character);

    this.direction = this.saveData.player.direction || PLAYER_CONFIG.direction;
    this.player = this.add.sprite(
      this.saveData.player.x,
      this.saveData.player.y,
      this.getPlayerTexture(this.direction)
    );
    this.swimEffects = this.add.graphics();
    this.updatePlayerWorldDepth();

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
      six: Phaser.Input.Keyboard.KeyCodes.SIX,
      seven: Phaser.Input.Keyboard.KeyCodes.SEVEN,
      eight: Phaser.Input.Keyboard.KeyCodes.EIGHT,
      nine: Phaser.Input.Keyboard.KeyCodes.NINE,
      zero: Phaser.Input.Keyboard.KeyCodes.ZERO,
      b: Phaser.Input.Keyboard.KeyCodes.B,
      i: Phaser.Input.Keyboard.KeyCodes.I,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });

    this.gameTime = new TimeSystem(this.saveData.time);
    this.inventory = new InventorySystem(this, this.saveData.inventory);
    this.status = new StatusSystem(this, this.saveData.status);
    this.farming = new FarmingSystem(this, this.saveData.farm);
    this.resources = new ResourceSystem(this, this.saveData.resources);
    this.treePlots = new Map(
      Array.isArray(this.saveData.treePlots) ? this.saveData.treePlots.map(p => [`${p.x},${p.y}`, p]) : []
    );
    this.treePlotGraphics = this.add.graphics();
    this.treePlotGraphics.setDepth(4); // Same as farming
    this.shop = new ShopSystem(this);
    this.trash = new TrashCanSystem(this, this.saveData.trash);
    this.quest = new QuestSystem(this, this.saveData.quest);
    this.chest = new ChestSystem(this, this.saveData.chest);
    this.npcs = new NpcSystem(this);
    this.chest.ensureValidPosition();
    this.touchControls = new TouchControlsSystem(this, { enabled: this.isTouchDevice });
    this.controlHelp = new ControlHelpSystem(this, this.isTouchDevice);
    this.pauseMenu = new PauseMenuSystem(this);
    this.itemConfirm = new ItemConfirmSystem(this);
    this.interior = new InteriorSystem(this, this.saveData.interior);
    this.crafting = new CraftingSystem(this);
    this.furnitureCatalog = new FurnitureCatalogSystem(this, this.interior);
    this.gameTime.onDayChange((day) => this.startNextDay(day));

    // 建筑层使用 Map 存储每栋建筑独立的 Graphics
    this.buildingGraphics = new Map();
    drawFarmMap(this);
    this.children.depthSort();

    this.updateHud();

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      if (this.hasOpenPanel()) return;
      if (deltaY > 0) {
        this.inventory.select((this.inventory.selectedIndex + 1) % 10);
      } else if (deltaY < 0) {
        this.inventory.select((this.inventory.selectedIndex + 9) % 10);
      }
      this.saveNow();
    });

    this.promptText = this.add.text(16, 82, '', {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '16px',
      color: '#fff7df',
      backgroundColor: 'rgba(45, 40, 31, 0.72)',
      padding: { x: 12, y: 8 }
    });
    this.promptText.setDepth(20);
    this.promptText.setScrollFactor(0);
    this.promptText.setVisible(false);

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
    if (this.saveData.location === 'interior') {
      this.time.delayedCall(0, () => this.interior.enter({ restore: true }));
    }
    this.saveNow();
    window.dispatchEvent(new CustomEvent('reid-manor-ready'));
  }

  update(_, delta) {
    const prevMinutes = this.gameTime.getTotalMinutes();
    this.gameTime.update(delta);
    const currentMinutes = this.gameTime.getTotalMinutes();

    // Fuel consumption check (hourly)
    const prevHour = Math.floor(prevMinutes / 60);
    const currHour = Math.floor(currentMinutes / 60);
    if (currHour > prevHour) {
      this.interior.consumeFuel(currHour - prevHour);
    }

    if (this.itemConfirm?.isOpen() && Phaser.Input.Keyboard.JustDown(this.keys.enter)) {
      this.itemConfirm.confirm();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      if (this.interior?.cancelPlacement()) {
        return;
      }
      if (this.chest?.cancelMoving()) {
        return;
      }
      
      // 优先处理统一 Modal 栈
      if (this.closeTopModal()) {
        return;
      }

      // 备选逻辑：处理旧的面板或打开菜单
      if (this.hasOpenPanel()) {
        this.closeOpenPanel();
      } else if (this.pauseMenu?.isOpen()) {
        this.pauseMenu.close();
      } else {
        this.pauseMenu?.open();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.i)) {
      if (this.inventory?.isPanelOpen()) {
        this.inventory.closePanel();
      } else if (!this.hasOpenPanel()) {
        this.inventory?.openPanel();
      }
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.b)) {
      if (this.furnitureCatalog?.isOpen()) {
        this.furnitureCatalog.close();
      } else if (this.interior?.inside && !this.hasOpenPanel()) {
        this.furnitureCatalog?.open();
      } else if (!this.interior?.inside) {
        this.showMessage('只能在家中打开家具建造');
      }
      return;
    }

    if (this.pauseMenu?.isOpen() || this.hasOpenPanel()) {
      if (this.player?.body) {
        this.player.body.setVelocity(0, 0);
      }
      return;
    }

    this.status.update(delta);
    this.updateHud();
    this.handleHotbarInput();
    this.autoSaveElapsed += delta;
    if (!this.interior.inside) this.npcs.update(delta);

    const input = this.getMovementInput();
    this.updateSwimmingState();
    const runningFactor = this.keys.shift.isDown ? RUN_SPEED_FACTOR : 1;
    const terrainFactor = this.isSwimming ? SWIM_SPEED_FACTOR : 1;
    const distance = PLAYER_SPEED * runningFactor * terrainFactor * (delta / 1000);
    const isMoving = input.x !== 0 || input.y !== 0;

    if (!this.hasOpenPanel() && !this.interior?.isMovementLocked() && isMoving) {
      if (Math.abs(input.x) > Math.abs(input.y)) {
        this.direction = input.x > 0 ? 'right' : 'left';
      } else {
        this.direction = input.y > 0 ? 'down' : 'up';
      }

      this.player.setTexture(this.getPlayerTexture(this.direction));
      this.movePlayer(input.x * distance, input.y * distance);
    }
    this.updateSwimmingState(isMoving);
    this.updatePlayerWorldDepth();

    this.updateInteraction();

    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.handleInteractInput();
    }

    if (!this.hasOpenPanel() && Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.useSelectedItem();
    }

    this.farming.update(this.gameTime, this.gameTime.getWeather());
    this.renderTreePlots();
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

  updateSwimmingState(isMoving = false) {
    const swimming = !this.interior?.inside && isPointInWater(this.player.x, this.player.y);
    this.isSwimming = swimming;
    this.swimEffects.clear();

    if (!swimming) {
      this.player.setOrigin(0.5, 0.5);
      this.player.setAlpha(1);
      return;
    }

    const bob = Math.sin(this.time.now / 260) * 1.5;
    const pulse = (Math.sin(this.time.now / 180) + 1) * 2;
    this.player.setOrigin(0.5, 0.5 + bob / 32);
    this.player.setAlpha(0.9);

    this.swimEffects.lineStyle(2, COLORS.waterDark, 0.62);
    this.swimEffects.strokeEllipse(this.player.x, this.player.y + 8, 28 + pulse, 9 + pulse * 0.35);
    if (isMoving) {
      this.swimEffects.lineStyle(1, 0xb7e4f7, 0.58);
      this.swimEffects.strokeEllipse(this.player.x, this.player.y + 10, 40 + pulse * 2, 13 + pulse);
    }
    this.swimEffects.fillStyle(COLORS.water, 0.86);
    this.swimEffects.fillRect(this.player.x - 12, this.player.y + 2 + bob, 24, 13);
    this.swimEffects.lineStyle(1, 0xc8efff, 0.7);
    this.swimEffects.lineBetween(this.player.x - 11, this.player.y + 3 + bob, this.player.x + 11, this.player.y + 3 + bob);
  }

  getWorldDepth(footY, bias = 0) {
    const clampedY = Phaser.Math.Clamp(footY, 0, WORLD_HEIGHT);
    return 3 + (clampedY / WORLD_HEIGHT) * 15 + bias;
  }

  updatePlayerWorldDepth() {
    const playerFootY = this.player.y + 15;
    const depth = this.getWorldDepth(playerFootY, 0.001);
    this.player.setDepth(depth);
    this.swimEffects.setDepth(depth + 0.0001);
  }

  collidesAt(x, y) {
    const body = this.getPlayerRect(x, y);

    if (this.interior?.inside) {
      return this.interior.collidesAt(body);
    }

    if (
      body.x < 0 ||
      body.y < 0 ||
      body.right > WORLD_WIDTH ||
      body.bottom > WORLD_HEIGHT
    ) {
      return true;
    }

    if (this.resources?.collidesAt(body) || this.chest?.collidesAt(body)) {
      return true;
    }

    if (Array.from(this.treePlots?.values() || []).some((plot) => {
      if (plot.type !== 'sapling') return false;
      const saplingRect = new Phaser.Geom.Rectangle(plot.x * TILE_SIZE, plot.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      return Phaser.Geom.Intersects.RectangleToRectangle(body, saplingRect);
    })) return true;

    return COLLISION_RECTS.some((rect) => {
      const obstacle = new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height);
      return Phaser.Geom.Intersects.RectangleToRectangle(body, obstacle);
    });
  }

  hasBlockingObjectAt(tileX, tileY, { ignoreChest = false, includePlayer = true } = {}) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_COLUMNS || tileY >= MAP_ROWS) return true;
    const x = tileX * TILE_SIZE;
    const y = tileY * TILE_SIZE;
    const rect = new Phaser.Geom.Rectangle(x, y, TILE_SIZE, TILE_SIZE);
    if (COLLISION_RECTS.some((obstacle) => Phaser.Geom.Intersects.RectangleToRectangle(
      rect,
      new Phaser.Geom.Rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
    ))) return true;
    if (this.resources?.isTreeAt(tileX, tileY)) return true;
    if (!ignoreChest && this.chest?.state.position.x === tileX && this.chest?.state.position.y === tileY) return true;
    if (this.treePlots?.has(`${tileX},${tileY}`)) return true;
    if (TOWN_FLOWERS.some((flower) => flower.x === tileX && flower.y === tileY)) return true;
    if (includePlayer && Phaser.Geom.Intersects.RectangleToRectangle(rect, this.getPlayerRect())) return true;
    return Boolean(this.npcs?.npcs.some((npc) =>
      Phaser.Geom.Intersects.RectangleToRectangle(rect, this.getPlayerRect(npc.sprite.x, npc.sprite.y))
    ));
  }

  resetPlayerPosition() {
    const startX = Math.floor(this.player.x / TILE_SIZE);
    const startY = Math.floor(this.player.y / TILE_SIZE);

    // Search up to 10 tiles away
    for (let d = 0; d <= 10; d++) {
      const candidates = [];
      
      if (d === 0) {
        candidates.push({ tx: startX, ty: startY });
      } else {
        // Collect all tiles at Manhattan distance d
        for (let dx = -d; dx <= d; dx++) {
          const dy = d - Math.abs(dx);
          candidates.push({ tx: startX + dx, ty: startY - dy });
          if (dy !== 0) {
            candidates.push({ tx: startX + dx, ty: startY + dy });
          }
        }
      }

      // Priority: Up, Right, Down, Left (Clockwise order for stability)
      candidates.sort((a, b) => {
        const getAngle = (c) => {
          const dx = c.tx - startX;
          const dy = c.ty - startY;
          // Clockwise from top: Up (0, -1) -> Right (1, 0) -> Down (0, 1) -> Left (-1, 0)
          // atan2(dy, dx) returns angle in radians
          // Up: -PI/2, Right: 0, Down: PI/2, Left: PI
          const angle = Math.atan2(dy, dx);
          // Map to [0, 2PI) where -PI/2 is 0
          return (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI);
        };
        return getAngle(a) - getAngle(b);
      });

      for (const { tx, ty } of candidates) {
        if (!this.isTileOccupiedForReset(tx, ty)) {
          this.player.setPosition(tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2);
          if (this.player.body) this.player.body.setVelocity(0, 0);
          this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
          this.saveNow();
          this.showMessage('位置已重置');
          return;
        }
      }
    }

    this.showMessage('附近没有可重置的位置');
  }

  isTileOccupiedForReset(tileX, tileY) {
    // 1. Must be grass (excludes water and roads)
    if (!isGrassTile(tileX, tileY)) return true;
    
    // 2. Must not be tilled or have crops
    if (this.farming?.hasActiveStateAt(tileX, tileY)) return true;
    
    // 3. Must not have trees, stones, chests, buildings, or NPCs
    if (this.hasBlockingObjectAt(tileX, tileY, { includePlayer: false })) return true;

    return false;
  }

  isTileOccupied(tileX, tileY) {
    return !isGrassTile(tileX, tileY) ||
      this.farming?.hasActiveStateAt(tileX, tileY) ||
      this.hasBlockingObjectAt(tileX, tileY);
  }

  canUseGrassToolAt(tileX, tileY) {
    return isGrassTile(tileX, tileY) &&
      !this.farming?.hasActiveStateAt(tileX, tileY) &&
      !this.hasBlockingObjectAt(tileX, tileY);
  }

  isTreeHoleAt(x, y) {
    const key = `${x},${y}`;
    const plot = this.treePlots.get(key);
    return plot && plot.type === 'hole';
  }

  restoreTreeHoleAt(x, y) {
    const key = `${x},${y}`;
    if (this.treePlots.get(key)?.type === 'hole') {
      this.treePlots.delete(key);
      this.renderTreePlots();
      this.saveNow();
      return { ok: true, message: '树坑已填平' };
    }
    return { ok: false, message: '这里没有树坑' };
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

    if (this.interior?.inside) {
      const interaction = this.interior.getNearbyInteraction(this.player);
      this.activeInteraction = interaction ? { type: 'interior', object: interaction, label: interaction.label } : null;
      if (this.activeInteraction) {
        const actionLabels = {
          interiorDoor: '离开房屋',
          singleBed: '睡觉',
          doubleBed: '睡觉',
          chair: this.interior.sittingFurnitureId ? '起身' : '坐下',
          wardrobe: '打开衣柜',
          table: '使用餐桌',
          stove: '使用灶台'
        };
        this.promptText.setText(`[E] ${actionLabels[interaction.type] || actionLabels[interaction.id] || `使用${interaction.label}`}`);
        this.promptText.setVisible(true);
      } else if (!this.messageTimer) {
        this.promptText.setVisible(false);
      }
      return;
    }

    const chest = this.chest?.getNearby(this.player);
    if (chest) {
      this.activeInteraction = { type: 'chest', object: chest, label: '个人木箱' };
      this.promptText.setText('[E] 打开个人木箱');
      this.promptText.setVisible(true);
      return;
    }

    const npc = this.npcs.getNearby(this.player);
    if (npc) {
      this.activeInteraction = { type: 'npc', npc, label: npc.name };
      this.promptText.setText(`靠近${npc.name}：[E] 对话`);
      this.promptText.setVisible(true);
      return;
    }

    if (isNearWater(this.player.x, this.player.y, TILE_SIZE / 2)) {
      this.activeInteraction = { type: 'water', label: '水域' };
      this.promptText.setText('[E] 补满水壶');
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

    const numberKeys = [
      this.keys.one,
      this.keys.two,
      this.keys.three,
      this.keys.four,
      this.keys.five,
      this.keys.six,
      this.keys.seven,
      this.keys.eight,
      this.keys.nine,
      this.keys.zero
    ];
    numberKeys.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) {
        this.inventory.select(index);
        this.saveNow();
      }
    });
  }

  useSelectedItem() {
    const targetTile = this.getFacingTile();

    // 1. 优先检查采摘（即使空手也允许）
    if (this.farming.canHarvestAt(targetTile, this.gameTime)) {
      const harvestResult = this.farming.harvestIfReadyAt(targetTile, this.inventory, this.gameTime);
      this.showMessage(harvestResult.message);
      if (harvestResult.ok) {
        this.quest.recordHarvest(harvestResult.harvestedItemId, harvestResult.harvestQuantity);
        this.saveNow();
      }
      return;
    }

    const selectedItem = this.inventory.getSelectedItem();

    if (!selectedItem) {
      this.showMessage('没有选中物品');
      return;
    }

    if (this.isSwimming && (selectedItem.type === 'tool' || selectedItem.type === 'seed' || LAND_TOOL_ACTIONS.has(selectedItem.action))) {
      this.showMessage('游泳时不能使用陆地工具或种植');
      return;
    }

    if (selectedItem.type === 'empty') {
      this.showMessage('这个快捷栏还是空的');
      return;
    }

    if (selectedItem.action === 'eatRadish') {
      this.itemConfirm.openRadishConfirm();
      return;
    }

    if (selectedItem.action === 'eat' || selectedItem.action === 'drink') {
      if (!this.inventory.hasItem(selectedItem.id, 1)) {
        this.showMessage(`${selectedItem.name}已经用完了`);
        return;
      }
      const result = this.status.consume(selectedItem.action);
      if (result.ok) {
        this.inventory.removeItem(selectedItem.id, 1);
        if (selectedItem.returnsItemId) {
          this.inventory.addItem(selectedItem.returnsItemId, 1);
        }
        this.saveNow();
      }
      this.showMessage(result.message);
      return;
    }

    if (selectedItem.action === 'axe') {
      const result = this.resources.chop(this.player, this.direction);
      this.showMessage(result.message);
      if (result.ok) this.saveNow();
      return;
    }

    if (selectedItem.action === 'heal') {
      if (!this.inventory.hasItem(selectedItem.id, 1)) {
        this.showMessage(`没有${selectedItem.name}`);
        return;
      }
      const result = this.status.heal(selectedItem.healAmount || 0, selectedItem.name);
      if (result.ok) this.inventory.removeItem(selectedItem.id, 1);
      this.showMessage(result.message);
      if (result.ok) this.saveNow();
      return;
    }

    if (selectedItem.action === 'water') {
      const water = this.inventory.getWateringCanState();
      if (water.currentWater <= 0) {
        this.showMessage('水壶已空');
        return;
      }
      this.inventory.consumeWater(1);
      if (this.interior.inside) {
        this.showMessage('水洒在了屋内地板上');
        this.saveNow();
        return;
      }
      const result = this.farming.useSelectedItem({
        item: selectedItem,
        tile: targetTile,
        inventory: this.inventory,
        gameTime: this.gameTime
      });
      this.showMessage(result.message || '水洒在了地上');
      this.saveNow();
      return;
    }

    if (selectedItem.action === 'openInventory') {
      this.inventory.togglePanel();
      return;
    }

    if (selectedItem.action === 'placeFurniture') {
      if (this.interior.inside) {
        this.inventory.closePanel();
        this.interior.startPlacementFromInventory(selectedItem.id);
      } else {
        this.showMessage('只能在室内布置家具');
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

  digTreeHoleAt(x, y) {
    const key = `${x},${y}`;
    if (this.treePlots.has(key)) return { ok: false, message: '这里已经有一个树坑了' };
    if (this.farming.isFarmTile(x, y)) return { ok: false, message: '这里是耕地，不能挖树坑' };
    
    if (!this.canUseGrassToolAt(x, y)) {
      return { ok: false, message: '这里有障碍物，不能挖树坑' };
    }

    this.treePlots.set(key, { x, y, type: 'hole', day: this.gameTime.getDay() });
    this.renderTreePlots();
    this.saveNow();
    return { ok: true, message: '挖好了一个树坑' };
  }

  plantSaplingAt(x, y, inventory) {
    const key = `${x},${y}`;
    const plot = this.treePlots.get(key);
    if (!plot || plot.type !== 'hole') return { ok: false, message: '这里没有树坑' };
    
    if (!inventory.removeItem(ITEM_IDS.SAPLING, 1)) {
      return { ok: false, message: '手中没有树苗' };
    }

    plot.type = 'sapling';
    plot.day = this.gameTime.getDay();
    this.renderTreePlots();
    this.saveNow();
    return { ok: true, message: '种下了树苗，明天就会长成大树' };
  }

  enterNpcHome(house) {
    const styles = {
      female: { wallpaperColor: 0xfff0f5, floorColor: 0xeed5d2, furniture: ['doubleBed', 'table', 'chair', 'pottedPlant', 'wallLamp'] },
      male: { wallpaperColor: 0xd7ccc8, floorColor: 0x5d4037, furniture: ['singleBed', 'bookcase', 'chair', 'floorLamp'] },
      artisan: { wallpaperColor: 0xefebe9, floorColor: 0x4e342e, furniture: ['singleBed', 'workbench', 'box', 'stove'] }
    };
    const style = styles[house.style] || styles.male;
    const furniture = style.furniture.map((type, i) => ({
      id: `npc-furn-${house.id}-${i}`,
      type,
      label: FURNITURE_DEFS[type].label,
      gridX: 1 + i * 2,
      gridY: 2,
      width: FURNITURE_DEFS[type].gridWidth * TILE_SIZE,
      height: FURNITURE_DEFS[type].gridHeight * TILE_SIZE,
      isOn: true,
      hasPower: true
    }));
    this.interior.enter({ config: { ...style, furniture } });
    this.interior.currentNpcHome = house.id;
  }

  canPlacePersonalChest(rect) {
    const tileX = Math.floor(rect.x / TILE_SIZE);
    const tileY = Math.floor(rect.y / TILE_SIZE);
    if (!canPlaceChestOnTerrain(tileX, tileY)) return false;
    if (this.farming?.hasActiveStateAt(tileX, tileY)) return false;
    return !this.hasBlockingObjectAt(tileX, tileY, { ignoreChest: true, includePlayer: true });
  }

  sleepNow() {
    this.startNextDay();
  }

  shutdown() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    if (!this.skipShutdownSave) {
      this.saveNow();
    }
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    window.removeEventListener('reid-manor-reset', this.resetHandler);
    this.scale?.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.nightOverlay?.destroy();
    this.rainOverlay?.destroy();
    this.swimEffects?.destroy();
    this.inventory?.destroy();
    this.status?.destroy();
    this.farming?.destroy();
    this.resources?.destroy();
    this.shop?.destroy();
    this.quest?.destroy();
    this.chest?.destroy();
    this.npcs?.destroy();
    this.touchControls?.destroy();
    this.controlHelp?.destroy();
    this.pauseMenu?.destroy();
    this.itemConfirm?.destroy();
    this.interior?.destroy();
    this.crafting?.destroy();
    this.furnitureCatalog?.destroy();
  }

  startNextDay(day = null) {
    if (this.isSleeping) return;

    this.isSleeping = true;
    const nextDay = Number.isFinite(day) ? day : this.gameTime.sleepToNextDay();
    this.status.refillAfterSleep();
    this.farming.resetWateredStateForNewDay(nextDay);
    
    // Process tree plots and power status for new day
    this.processTreePlotsForNewDay(nextDay);
    this.resources.resetDailyProgress();
    this.interior.updateGeneratorsForNewDay();
    this.trash.clearForNewDay();

    this.quest.ensureForDay(nextDay);
    if (this.interior.inside) {
      this.interior.wakeUp();
    }
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
      year: this.gameTime.getYear(),
      season: this.gameTime.getSeason(),
      seasonDay: this.gameTime.getSeasonDay(),
      weekday: this.gameTime.getWeekday(),
      time: this.gameTime.getDisplayTime(),
      weather: this.gameTime.getWeatherLabel(),
      weatherKey: this.gameTime.getWeather(),
      gold: this.inventory.getQuantity('coin')
    });
  }

  updateAtmosphere() {
    this.nightOverlay.clear();
    this.rainOverlay.clear();
    if (this.interior?.inside) return;

    const alpha = this.gameTime.getNightAlpha();
    if (alpha > 0) {
      this.nightOverlay.fillStyle(0x071022, alpha);
      this.nightOverlay.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    if (this.gameTime.getWeather() !== 'rainy') return;

    this.rainOverlay.lineStyle(1, 0xb9ddff, 0.42);
    const offset = Math.floor(this.gameTime.getTotalMinutes() % 18);
    for (let x = -40; x < this.scale.width + 40; x += 34) {
      for (let y = -20; y < this.scale.height + 20; y += 70) {
        this.rainOverlay.lineBetween(x + offset, y, x + offset - 10, y + 26);
      }
    }
  }

  processTreePlotsForNewDay(nextDay) {
    for (const [key, plot] of this.treePlots.entries()) {
      if (plot.type === 'sapling') {
        // Grow to tree
        this.resources.addTree(plot.x, plot.y);
        this.treePlots.delete(key);
      }
    }
    this.renderTreePlots();
  }

  renderTreePlots() {
    this.treePlotGraphics.clear();
    if (this.interior.inside) return;

    for (const plot of this.treePlots.values()) {
      const x = plot.x * TILE_SIZE;
      const y = plot.y * TILE_SIZE;

      if (plot.type === 'hole') {
        this.treePlotGraphics.fillStyle(0x5a3c27, 0.8);
        this.treePlotGraphics.fillEllipse(x + 16, y + 24, 24, 16);
        this.treePlotGraphics.lineStyle(2, 0x3b2a1d, 1);
        this.treePlotGraphics.strokeEllipse(x + 16, y + 24, 24, 16);
      } else if (plot.type === 'sapling') {
        // Hole background
        this.treePlotGraphics.fillStyle(0x5a3c27, 0.6);
        this.treePlotGraphics.fillEllipse(x + 16, y + 24, 20, 12);
        
        // Stem
        this.treePlotGraphics.lineStyle(3, 0x7d4d2f, 1);
        this.treePlotGraphics.lineBetween(x + 16, y + 24, x + 16, y + 10);
        
        // Small leaves
        this.treePlotGraphics.fillStyle(0x48a64f, 1);
        this.treePlotGraphics.fillCircle(x + 13, y + 10, 6);
        this.treePlotGraphics.fillCircle(x + 19, y + 10, 6);
      }
    }
  }

  getSnapshot() {
    const exteriorPlayer = this.interior?.inside && this.interior.exteriorPosition
      ? this.interior.exteriorPosition
      : { x: this.player.x, y: this.player.y, direction: this.direction };
    return {
      player: {
        x: exteriorPlayer.x,
        y: exteriorPlayer.y,
        direction: exteriorPlayer.direction
      },
      location: this.interior?.inside ? 'interior' : 'farm',
      interior: this.interior?.getSnapshot(),
      character: this.saveData.character,
      time: this.gameTime.getSnapshot(),
      inventory: this.inventory.getSnapshot(),
      status: this.status.getSnapshot(),
      farm: this.farming.getSnapshot(this.gameTime),
      quest: this.quest.getSnapshot(),
      trash: this.trash.getSnapshot(),
      chest: this.chest.getSnapshot(),
      resources: this.resources.getSnapshot(),
      treePlots: Array.from(this.treePlots.values())
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
    this.status.destroy();
    this.farming.destroy();
    this.resources.destroy();
    this.shop.destroy();
    this.trash.destroy();
    this.quest.destroy();
    this.chest.destroy();
    this.npcs.destroy();
    this.touchControls.destroy();
    this.controlHelp.destroy();
    this.pauseMenu.destroy();
    this.itemConfirm.destroy();
    this.interior.destroy();
    this.crafting.destroy();
    this.furnitureCatalog.destroy();
    this.inventory = new InventorySystem(this, freshSave.inventory);
    this.status = new StatusSystem(this, freshSave.status);
    this.farming = new FarmingSystem(this, freshSave.farm);
    this.resources = new ResourceSystem(this, freshSave.resources);
    this.treePlots = new Map();
    this.renderTreePlots();
    this.shop = new ShopSystem(this);
    this.trash = new TrashCanSystem(this, freshSave.trash);
    this.quest = new QuestSystem(this, freshSave.quest);
    this.chest = new ChestSystem(this, freshSave.chest);
    this.npcs = new NpcSystem(this);
    this.chest.ensureValidPosition();
    this.touchControls = new TouchControlsSystem(this, { enabled: this.isTouchDevice });
    this.controlHelp = new ControlHelpSystem(this, this.isTouchDevice);
    this.pauseMenu = new PauseMenuSystem(this);
    this.itemConfirm = new ItemConfirmSystem(this);
    this.interior = new InteriorSystem(this, freshSave.interior);
    this.crafting = new CraftingSystem(this);
    this.furnitureCatalog = new FurnitureCatalogSystem(this, this.interior);
    this.gameTime.onDayChange((day) => this.startNextDay(day));
    this.direction = freshSave.player.direction;
    this.player.setPosition(freshSave.player.x, freshSave.player.y);
    createPlayerTextures(this, freshSave.character);
    this.player.setTexture(this.getPlayerTexture(this.direction));
    this.setExteriorVisible(true);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.updateHud();
    this.showMessage('庄园已重新开始');
    this.saveNow();
  }

  handleInteractInput() {
    if (this.activeInteraction) {
      this.handleInteraction();
      return;
    }
    if (this.inventory.getSelectedItem()?.action === 'eatRadish') {
      this.itemConfirm.openRadishConfirm();
    }
  }

  handleInteraction() {
    if (!this.activeInteraction) return;

    if (this.activeInteraction.type === 'chest') {
      this.chest.open();
      return;
    }

    if (this.activeInteraction.type === 'interior') {
      this.interior.handleInteraction(this.activeInteraction.object);
      return;
    }

    if (this.activeInteraction.type === 'npc') {
      this.npcs.openDialog(this.activeInteraction.npc);
      return;
    }

    if (this.activeInteraction.type === 'water') {
      const changed = this.inventory.refillWateringCan();
      this.showMessage(changed ? '水壶已经装满' : '水壶本来就是满的');
      if (changed) this.saveNow();
      return;
    }

    const object = this.activeInteraction.object;
    if (object.id === HOUSE_DOOR.id) {
      this.interior.enter();
      return;
    }

    if (!VILLAGE_HOUSES) {
      console.warn('VILLAGE_HOUSES is not defined');
      return;
    }
    const npcHome = VILLAGE_HOUSES.find(h => h.id === object.id);
    if (npcHome) {
      this.enterNpcHome(npcHome);
      return;
    }

    if (object.id === WELL.id || object.id === POND_INTERACTION.id) {
      const changed = this.inventory.refillWateringCan();
      this.showMessage(changed ? '水壶已经装满' : '水壶本来就是满的');
      if (changed) this.saveNow();
      return;
    }
    if (object.id === SHOP.id) {
      this.shop.open('general');
      return;
    }
    if (object.id === PHARMACY.id) {
      this.shop.open('pharmacy');
      return;
    }
    if (object.id === 'clothingShop') {
      this.shop.open('clothing');
      return;
    }
    if (object.id === MILL.id) {
      this.crafting.open('mill');
      return;
    }
    if (object.id === TRASH_CAN.id) {
      this.trash.open();
      return;
    }
    if (object.id === 'oldTrashCan') {
      this.itemConfirm.openDiscardConfirm(this.inventory.getSelectedItem());
      return;
    }

    if (object.id === NOTICE_BOARD.id) {
      this.quest.open();
      return;
    }

    if (object.message) {
      this.showMessage(object.message);
    }
  }

  hasOpenPanel() {
    if (this.modalStack.length > 0) return true;
    return Boolean(
      this.pauseMenu?.isOpen() ||
      this.inventory?.isPanelOpen() ||
      this.shop?.isOpen() ||
      this.crafting?.isOpen() ||
      this.itemConfirm?.isOpen() ||
      this.furnitureCatalog?.isOpen() ||
      this.interior?.isOpen() ||
      this.quest?.isOpen() ||
      this.trash?.isOpen() ||
      this.chest?.isOpen() ||
      this.npcs?.isOpen() ||
      this.controlHelp?.isOpen()
    );
  }

  hasBlockingPanelForTouch() {
    return this.shop?.isOpen() || this.quest?.isOpen() || this.trash?.isOpen() || this.chest?.isOpen() || this.npcs?.isOpen() || this.controlHelp?.isOpen() || this.itemConfirm?.isOpen() || this.crafting?.isOpen() || this.furnitureCatalog?.isOpen();
  }

  closeOpenPanel() {
    if (this.closeTopModal()) return;

    // 备选回退：关闭可能未通过 pushModal 注册的旧系统弹窗
    if (this.pauseMenu?.isOpen()) this.pauseMenu.close();
    if (this.inventory?.isPanelOpen()) this.inventory.closePanel();
    if (this.shop?.isOpen()) this.shop.close();
    if (this.crafting?.isOpen()) this.crafting.close();
    if (this.itemConfirm?.isOpen()) this.itemConfirm.close();
    if (this.furnitureCatalog?.isOpen()) this.furnitureCatalog.close();
    if (this.interior?.isOpen?.()) this.interior.closePanel();
    if (this.quest?.isOpen()) this.quest.close();
    if (this.trash?.isOpen()) this.trash.close();
    if (this.chest?.isOpen()) this.chest.close();
    if (this.npcs?.isOpen()) this.npcs.closeDialog();
    if (this.controlHelp?.isOpen()) this.controlHelp.close();
  }

  pushModal(modal) {
    // modal: { id, close: Function }
    if (!modal || !modal.id || typeof modal.close !== 'function') return;
    // 避免重复注册同一个 ID
    this.modalStack = this.modalStack.filter(m => m.id !== modal.id);
    this.modalStack.push(modal);
  }

  popModal(id) {
    this.modalStack = this.modalStack.filter(m => m.id !== id);
  }

  closeTopModal() {
    const topModal = this.modalStack.at(-1);
    if (topModal) {
      topModal.close();
      return true;
    }
    return false;
  }

  handleScaleRefresh() {
    this.touchControls?.reposition();
    this.controlHelp?.reposition();
    this.inventory?.render();
    this.status?.render();
    if (this.pauseMenu?.isOpen()) {
      this.pauseMenu.open();
    }
  }

  setExteriorVisible(visible) {
    this.mapGraphics?.setVisible(visible);
    this.buildingGraphics?.forEach((graphic) => graphic.setVisible(visible));
    this.farming?.graphics?.setVisible(visible);
    this.npcs?.setVisible(visible);
    this.resources?.setVisible(visible);
    this.treePlotGraphics?.setVisible(visible);
    this.swimEffects?.setVisible(visible);
  }

  getInteractionPrompt(interaction) {
    if (interaction.type === 'npc') {
      return `靠近${interaction.label}：[E] 对话`;
    }

    if (interaction.type === 'chest') {
      return '[E] 打开木箱';
    }

    if (interaction.type === 'water') {
      return '[E] 补满水壶';
    }

    if (interaction.object?.id === TRASH_CAN.id) {
      return '靠近垃圾箱：[E] 互动';
    }

    if (interaction.object?.id === WELL.id || interaction.object?.id === POND_INTERACTION.id) {
      return `[E] 在${interaction.label}补满水壶`;
    }

    if (interaction.object?.id === HOUSE_DOOR.id) {
      return '[E] 进入房屋';
    }

    return `靠近${interaction.label}：[E] 互动`;
  }

  getPlayerTexture(direction) {
    return getPlayerTextureKey(direction, this.saveData.character);
  }
}
