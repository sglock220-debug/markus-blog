import Phaser from 'phaser';
import { createDefaultFurniture, FURNITURE_DEFS, GRID_SIZE, makeFurniture } from './furniture';
import { ITEM_IDS, ITEMS } from './items';
import { VILLAGE_HOUSES, NPCS } from './map';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const ROOM = { x: 128, y: 48, width: 768, height: 464 };
const GRID = { x: 128, y: 112, columns: 24, rows: 12 };
const INNER = { x: GRID.x, y: GRID.y, right: GRID.x + GRID.columns * GRID_SIZE, bottom: GRID.y + GRID.rows * GRID_SIZE };
const DOOR = { x: GRID.x + 11 * GRID_SIZE, y: INNER.bottom - 32, width: 64, height: 32 };
const DEFAULT_PLAYER = { x: 520, y: 430, direction: 'up' };
const TABLE_ITEMS = new Set([ITEM_IDS.BREAD, ITEM_IDS.RADISH, ITEM_IDS.WATER, ITEM_IDS.WHEAT]);

export default class InteriorSystem {
  constructor(scene, savedInterior = {}) {
    this.scene = scene;
    this.inside = false;
    this.exteriorPosition = null;
    this.state = normalizeInterior(savedInterior);
    this.placement = null;
    this.lastFurnitureClick = { id: null, at: 0 };
    this.furnitureContainers = [];
    this.sittingFurnitureId = null;
    this.tradeQuantity = 0; // Initialize trade quantity
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(2);
    this.layer.setScrollFactor(0);
    this.pointerMoveHandler = (pointer) => this.handlePointerMove(pointer);
    scene.input.on('pointermove', this.pointerMoveHandler);
    this.drawRoom();
    this.layer.setVisible(false);
    this.calculatePower();
  }

  consumeFuel(amount = 1) {
    let changed = false;
    this.state.furniture.forEach((item) => {
      const def = FURNITURE_DEFS[item.type];
      if (def?.powerOutput && item.isGeneratorOn) {
        item.fuel = Math.max(0, (item.fuel || 0) - amount);
        if (item.fuel <= 0) {
          item.isGeneratorOn = false;
          this.scene.showMessage(`${item.label}燃油耗尽，已停止工作`);
        }
        changed = true;
      }
    });
    if (changed) {
      this.calculatePower();
      this.renderFurniture();
      // If generator UI is open, refresh it
      if (this.isOpen()) {
        const generators = this.state.furniture.filter(f => FURNITURE_DEFS[f.type]?.powerOutput);
        if (generators.length > 0) {
          // Refreshing might be complex if multiple generators are open (not possible now)
          // Just refresh the first one found for now, or the one being interacted with
          // Actually, calculatePower and renderFurniture already update the world state.
          // The UI refresh depends on which item was being viewed.
        }
      }
      this.scene.saveNow();
    }
  }

  updateGeneratorsForNewDay() {
    // Legacy daily check replaced by hourly check in consumeFuel
    this.setupElectricity();
  }

  setupElectricity() {
    this.calculatePower();
  }

  calculatePower() {
    let totalPower = 0;
    const generators = this.state.furniture.filter(f => FURNITURE_DEFS[f.type]?.powerOutput);
    
    generators.forEach(gen => {
      if (gen.isGeneratorOn && gen.fuel > 0) {
        totalPower += FURNITURE_DEFS[gen.type].powerOutput;
      }
    });

    const devices = this.state.furniture.filter(f => FURNITURE_DEFS[f.type]?.powered);
    // Sort devices by priority or placement order (already in array)
    let powerRemaining = totalPower;
    
    devices.forEach(dev => {
      const required = FURNITURE_DEFS[dev.type].powerRequired;
      if (dev.isOn && powerRemaining >= required) {
        dev.hasPower = true;
        powerRemaining -= required;
      } else {
        dev.hasPower = false;
      }
    });

    this.state.totalPower = totalPower;
    this.state.usedPower = totalPower - powerRemaining;
  }

  drawRoom() {
    const background = this.scene.add.graphics();
    background.fillStyle(0x18201a, 1);
    background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    background.fillStyle(0x6f4930, 1);
    background.fillRoundedRect(ROOM.x, ROOM.y, ROOM.width, ROOM.height, 12);
    const { wallpaperColor, floorColor } = this.state;
    background.fillStyle(wallpaperColor || 0xd9b56f, 1);
    background.fillRect(ROOM.x + 12, ROOM.y + 12, ROOM.width - 24, 54);
    background.fillStyle(floorColor || 0xa8653a, 1);
    background.fillRect(INNER.x, INNER.y, INNER.right - INNER.x, INNER.bottom - INNER.y);
    background.lineStyle(4, 0x000000, 0.2);
    background.strokeRect(INNER.x, INNER.y, INNER.right - INNER.x, INNER.bottom - INNER.y);
    background.lineStyle(1, 0xd19158, 0.72);
    for (let column = 0; column <= GRID.columns; column += 1) {
      const x = GRID.x + column * GRID_SIZE;
      background.lineBetween(x, GRID.y, x, INNER.bottom);
    }
    for (let row = 0; row <= GRID.rows; row += 1) {
      const y = GRID.y + row * GRID_SIZE;
      background.lineBetween(GRID.x, y, INNER.right, y);
    }
    background.fillStyle(0x4f92b8, 1);
    background.fillRect(ROOM.x + 352, ROOM.y + 22, 64, 34);
    background.lineStyle(3, 0xf5e7b8, 1);
    background.strokeRect(ROOM.x + 352, ROOM.y + 22, 64, 34);
    background.fillStyle(0x6b3f2a, 1);
    background.fillRect(DOOR.x, DOOR.y, DOOR.width, DOOR.height);

    const floorInput = this.scene.add.rectangle(INNER.x, INNER.y, INNER.right - INNER.x, INNER.bottom - INNER.y, 0xffffff, 0.001);
    floorInput.setOrigin(0, 0);
    floorInput.setInteractive();
    floorInput.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      if (this.placement) this.finishPlacement();
    });
    const roomTitle = this.scene.add.text(ROOM.x + 24, ROOM.y + 22, '锐德庄园 · 家', textStyle(16, '#4a321f', true));
    this.moveHint = this.scene.add.text(ROOM.x + ROOM.width - 24, ROOM.y + 24, '', textStyle(13, '#7a3d2a', true));
    this.moveHint.setOrigin(1, 0);
    this.layer.add([background, floorInput, roomTitle, this.moveHint]);
    
    // NPC in home at night
    if (this.currentNpcHome) {
      let house = null;
      if (typeof VILLAGE_HOUSES !== 'undefined') {
        house = VILLAGE_HOUSES.find(h => h.id === this.currentNpcHome);
      } else {
        console.warn('VILLAGE_HOUSES is not defined in InteriorSystem');
      }
      
      const hour = this.scene.gameTime.getHour();
      const isNight = hour >= 20 || hour < 6;
      if (house && isNight) {
        const npc = NPCS.find(n => n.id === house.ownerId);
        if (npc) {
          const x = INNER.x + 60;
          const y = INNER.y + 60;
          const body = this.scene.add.graphics();
          body.fillStyle(npc.color, 1);
          body.fillRoundedRect(x - 9, y - 13, 18, 24, 5);
          body.fillStyle(0xf0bd8b, 1);
          body.fillCircle(x, y - 18, 8);
          this.layer.add(body);
        }
      }
    }

    this.renderFurniture();
  }

  renderFurniture() {
    this.furnitureContainers.forEach((container) => container.destroy());
    this.furnitureContainers = this.state.furniture.map((item) => this.createFurniture(item));
    this.furnitureContainers.forEach((container) => this.layer.add(container));
    this.moveHint.setText(this.placement ? `放置：${this.placement.item.label}` : this.sittingFurnitureId ? '正在坐下' : '');
  }

  createFurniture(item) {
    Object.assign(item, furnitureSize(item));
    const x = GRID.x + item.gridX * GRID_SIZE;
    const y = GRID.y + item.gridY * GRID_SIZE;
    const container = this.scene.add.container(x, y);
    const graphics = this.scene.add.graphics();
    drawFurniture(graphics, item);
    
    // Power/Lamp effects
    if (item.hasPower && item.isOn) {
      if (item.type === 'wallLamp' || item.type === 'floorLamp') {
        const glow = this.scene.add.graphics();
        glow.fillStyle(0xffff00, 0.2);
        glow.fillCircle(item.width / 2, item.height / 2, 60);
        container.add(glow);
        container.sendToBack(glow);
      }
    }

    if (FURNITURE_DEFS[item.type]?.powered && !item.hasPower && item.isOn) {
      const alert = this.scene.add.text(item.width / 2, -10, '⚡!', textStyle(12, '#ff4d4f', true));
      alert.setOrigin(0.5, 0.5);
      container.add(alert);
    }

    if (this.placement?.item.id === item.id) {
      container.setAlpha(0.58);
      const isLegal = this.canPlace(item);
      const size = furnitureSize(item);
      graphics.lineStyle(4, isLegal ? 0x50c878 : 0xd9574f, 1);
      graphics.strokeRect(-2, -2, size.width + 4, size.height + 4);
    }
    if (item.surfaceItemId) {
      const surface = this.scene.add.text(item.width / 2, item.height / 2, ITEMS[item.surfaceItemId]?.name.slice(0, 1) || '物', textStyle(14, '#fff7df', true));
      surface.setOrigin(0.5, 0.5);
      container.add(surface);
    }
    const size = furnitureSize(item);
    const hitArea = this.scene.add.rectangle(0, 0, size.width, size.height, 0xffffff, 0.001);
    hitArea.setOrigin(0, 0);

    // Only non-placement items are interactive to avoid blocking the floor click
    if (this.placement?.item.id !== item.id) {
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        if (this.placement) {
          this.cancelPlacement('目标位置被家具占用');
        } else {
          this.handleFurnitureClick(item, localX, localY);
        }
      });
    }

    container.add([graphics, hitArea]);
    return container;
  }

  handleFurnitureClick(item, localX, localY) {
    const now = performance.now();
    const isDoubleClick = this.lastFurnitureClick.id === item.id && now - this.lastFurnitureClick.at <= 380;
    this.lastFurnitureClick = { id: item.id, at: now };
    if (!isDoubleClick) return;
    this.startMove(item, { x: localX, y: localY });
  }

  startMove(item, grabOffset = null) {
    if (this.sittingFurnitureId) this.standUp();
    const size = furnitureSize(item);
    this.placement = {
      item,
      original: { gridX: item.gridX, gridY: item.gridY },
      fromStorage: false,
      grabOffset: grabOffset || { x: size.width / 2, y: size.height / 2 }
    };
    this.renderFurniture();
    this.scene.showMessage(`移动${item.label}：单击合法网格放置，Esc 取消`);
  }

  startPlacementFromInventory(type) {
    if (this.sittingFurnitureId) this.standUp();
    const id = `${type}-${Date.now()}`;
    const item = makeFurniture(type, id, 10, 5);
    this.state.furniture.push(item);
    this.placement = {
      item,
      original: null,
      fromInventory: true,
      grabOffset: { x: item.width / 2, y: item.height / 2 }
    };
    this.renderFurniture();
    this.scene.showMessage(`放置${item.label}：移动鼠标后单击`);
  }

  startPlacementFromStorage(type) {
    // Keep for FurnitureCatalogSystem compatibility
    if (this.sittingFurnitureId) this.standUp();
    const id = `${type}-${Date.now()}`;
    const item = makeFurniture(type, id, 10, 5);
    this.state.furniture.push(item);
    this.placement = {
      item,
      original: null,
      fromStorage: true,
      grabOffset: { x: item.width / 2, y: item.height / 2 }
    };
    this.renderFurniture();
    this.scene.showMessage(`放置${item.label}：移动鼠标后单击`);
  }

  handlePointerMove(pointer) {
    if (!this.inside || !this.placement || this.scene.hasOpenPanel()) return;
    const item = this.placement.item;
    const grabOffset = this.placement.grabOffset || { x: item.width / 2, y: item.height / 2 };
    
    // Snap to grid
    const gridX = Math.floor((pointer.x - GRID.x) / GRID_SIZE);
    const gridY = Math.floor((pointer.y - GRID.y) / GRID_SIZE);
    
    if (gridX === item.gridX && gridY === item.gridY) return;
    item.gridX = gridX;
    item.gridY = gridY;
    this.renderFurniture();
  }

  finishPlacement() {
    if (!this.placement) return;
    const { item, fromInventory, fromStorage } = this.placement;
    
    if (!this.canPlace(item)) {
      this.cancelPlacement('无效位置，家具已回到原处');
      return;
    }
    
    if (fromInventory) {
      if (!this.scene.inventory.removeItem(item.type, 1)) {
        this.cancelPlacement('物品已不在背包中');
        return;
      }
    } else if (fromStorage) {
      this.removeStoredFurniture(item.type, 1);
    }
    
    const label = item.label;
    this.placement = null;
    this.calculatePower();
    this.renderFurniture();
    this.scene.saveNow();
    this.scene.showMessage(`${label}已放置`);
  }

  cancelPlacement(message = '已取消放置') {
    if (!this.placement) return false;
    const { item, original, fromInventory, fromStorage } = this.placement;
    if (fromInventory || fromStorage) {
      this.state.furniture = this.state.furniture.filter((entry) => entry.id !== item.id);
    } else if (original) {
      item.gridX = original.gridX;
      item.gridY = original.gridY;
    }
    this.placement = null;
    this.calculatePower();
    this.renderFurniture();
    this.scene.showMessage(message);
    return true;
  }

  canPlace(candidate) {
    const definition = FURNITURE_DEFS[candidate.type];
    if (!definition) return false;
    
    // 1. Grid bounds check
    if (candidate.gridX < 0 || candidate.gridY < 0 || 
        candidate.gridX + definition.gridWidth > GRID.columns || 
        candidate.gridY + definition.gridHeight > GRID.rows) {
      return false;
    }

    // 2. Pixel-based check for Door and Player
    const rect = furnitureRect(candidate);
    const doorRect = new Phaser.Geom.Rectangle(DOOR.x, DOOR.y, DOOR.width, DOOR.height);
    if (Phaser.Geom.Intersects.RectangleToRectangle(rect, doorRect)) return false;
    if (Phaser.Geom.Intersects.RectangleToRectangle(rect, this.scene.getPlayerRect())) return false;

    // 3. Furniture-to-furniture check (Strict Grid-based)
    return !this.state.furniture.some((item) => {
      if (item.id === candidate.id) return false;
      const itemDef = FURNITURE_DEFS[item.type];
      if (!itemDef) return false;
      
      // Check for grid overlap
      return !(
        candidate.gridX + definition.gridWidth <= item.gridX ||
        candidate.gridX >= item.gridX + itemDef.gridWidth ||
        candidate.gridY + definition.gridHeight <= item.gridY ||
        candidate.gridY >= item.gridY + itemDef.gridHeight
      );
    });
  }

  enter({ restore = false, config = null } = {}) {
    if (this.inside) return;
    if (config) this.state = { ...this.state, ...config };
    this.exteriorPosition = { x: this.scene.player.x, y: this.scene.player.y, direction: this.scene.direction };
    this.inside = true;
    this.scene.setExteriorVisible(false);
    this.layer.setVisible(true);
    this.scene.cameras.main.stopFollow();
    this.scene.cameras.main.setScroll(0, 0);
    const player = restore ? this.state.player : DEFAULT_PLAYER;
    this.scene.player.setPosition(player.x, player.y);
    this.scene.direction = player.direction || DEFAULT_PLAYER.direction;
    this.scene.player.setTexture(this.scene.getPlayerTexture(this.scene.direction));
    this.calculatePower();
    this.scene.saveNow();
  }

  exit() {
    if (!this.inside) return;
    this.cancelPlacement('已取消家具放置');
    this.standUp();
    this.capturePlayer();
    this.inside = false;
    this.currentNpcHome = null;
    this.layer.setVisible(false);
    this.scene.setExteriorVisible(true);
    const outside = this.exteriorPosition || this.scene.saveData.player;
    this.scene.player.setPosition(outside.x, outside.y + 18);
    this.scene.direction = 'down';
    this.scene.player.setTexture(this.scene.getPlayerTexture(this.scene.direction));
    this.scene.cameras.main.setBounds(0, 0, this.scene.physics.world.bounds.width, this.scene.physics.world.bounds.height);
    this.scene.cameras.main.startFollow(this.scene.player, true, 0.12, 0.12);
    this.scene.saveNow();
  }

  capturePlayer() {
    if (!this.inside) return;
    this.state.player = { x: this.scene.player.x, y: this.scene.player.y, direction: this.scene.direction };
  }

  wakeUp() {
    const bed = this.state.furniture.find((item) => item.type === 'singleBed' || item.type === 'doubleBed');
    const rect = bed ? furnitureRect(bed) : null;
    this.standUp();
    this.scene.player.setScale(1);
    this.scene.player.setPosition(rect ? rect.centerX : DEFAULT_PLAYER.x, rect ? rect.bottom + 18 : DEFAULT_PLAYER.y);
    this.scene.direction = 'down';
    this.scene.player.setTexture(this.scene.getPlayerTexture('down'));
    this.capturePlayer();
  }

  collidesAt(playerRect) {
    if (!this.inside) return false;
    if (playerRect.left < INNER.x || playerRect.top < INNER.y || playerRect.right > INNER.right || playerRect.bottom > INNER.bottom) return true;
    return this.state.furniture.some((item) => {
      if (FURNITURE_DEFS[item.type]?.walkable) return false;
      if (item.id === this.sittingFurnitureId) return false;
      return Phaser.Geom.Intersects.RectangleToRectangle(playerRect, furnitureRect(item));
    });
  }

  getNearbyInteraction(player) {
    if (!this.inside) return null;
    if (this.sittingFurnitureId) return { id: this.sittingFurnitureId, type: 'chair', label: '椅子' };
    const doorDistance = Phaser.Math.Distance.Between(player.x, player.y, DOOR.x + DOOR.width / 2, DOOR.y + DOOR.height / 2);
    if (doorDistance <= 54) return { id: 'interiorDoor', label: '家门' };
    return this.state.furniture.find((item) => {
      const rect = furnitureRect(item);
      const distance = Phaser.Math.Distance.Between(player.x, player.y, rect.centerX, rect.centerY);
      return distance <= Math.max(54, Math.max(item.width, item.height) / 2 + 28);
    }) || null;
  }

  openGeneratorUI(item) {
    this.closePanel();
    const width = 460;
    const height = 480; // Increased height for trading UI
    const shell = createModalShell(this.scene, { width, height, depth: 102, onClose: () => this.closePanel() });
    const { layer, x, y } = shell;
    this.panelLayer = layer;
    this.scene.pushModal({ id: 'interior', close: () => this.closePanel() });

    const title = this.scene.add.text(x + 24, y + 20, item.label, modalTextStyle(22, '#3b2a1d', true));
    const statusText = this.scene.add.text(x + 24, y + 65, `当前状态：${item.isGeneratorOn ? '运行中' : '已关闭'}`, modalTextStyle(16, item.isGeneratorOn ? '#3f8c55' : '#b7653c', true));
    const fuelText = this.scene.add.text(x + 24, y + 95, `当前燃油：${item.fuel || 0} / ${item.maxFuel || 20} 单位`, modalTextStyle(16, '#3b2a1d'));
    const consumptionText = this.scene.add.text(x + 24, y + 125, '燃油消耗：运行时每小时消耗 1 单位', modalTextStyle(12, '#6e4526'));
    
    const toggleBtn = makeModalButton(this.scene, {
      x: x + 24, y: y + 160, width: 120, height: 42,
      label: item.isGeneratorOn ? '关闭发电机' : '开启发电机',
      onClick: () => {
        if (!item.isGeneratorOn) {
          if ((item.fuel || 0) <= 0) {
            this.scene.showMessage('燃油不足，无法启动发电机');
            return;
          }
          item.isGeneratorOn = true;
          this.scene.showMessage(`${item.label}已启动`);
        } else {
          item.isGeneratorOn = false;
          this.scene.showMessage(`${item.label}已关闭`);
        }
        this.calculatePower();
        this.renderFurniture();
        this.scene.saveNow();
        this.openGeneratorUI(item);
      },
      color: item.isGeneratorOn ? 0xb7653c : 0x3f8c55
    });

    // 燃油总量汇总
    const fuelSummary = this.scene.inventory.getFuelSummary();
    const fuelStatusText = this.scene.add.text(x + 24, y + 220, fuelSummary.count > 0 ? `燃油桶总量：${fuelSummary.totalFuel}/${fuelSummary.totalCapacity}` : '燃油桶：无', modalTextStyle(14, fuelSummary.count > 0 ? '#3b2a1d' : '#b7653c', true));

    // 交易数量选择
    this.tradeQuantity = this.tradeQuantity || 0;
    const tradeText = this.scene.add.text(x + 24, y + 255, `选择数量：${this.tradeQuantity}`, modalTextStyle(16, '#3b2a1d', true));

    const btnConfig = [
      { label: '0', val: 0, reset: true },
      { label: '+1', val: 1 },
      { label: '+5', val: 5 },
      { label: '+10', val: 10 },
      { label: '全部', val: 'all' },
      { label: '-1', val: -1 },
      { label: '-5', val: -5 },
      { label: '-10', val: -10 }
    ];

    const quantityButtons = btnConfig.flatMap((cfg, idx) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      return makeModalButton(this.scene, {
        x: x + 24 + col * 105, y: y + 290 + row * 45, width: 95, height: 36,
        label: cfg.label,
        onClick: () => {
          if (cfg.reset) {
            this.tradeQuantity = 0;
          } else if (cfg.val === 'all') {
            const maxCanAdd = Math.min(fuelSummary.totalFuel, (item.maxFuel || 20) - (item.fuel || 0));
            this.tradeQuantity = Math.max(0, maxCanAdd);
          } else {
            this.tradeQuantity = Math.max(0, this.tradeQuantity + cfg.val);
          }
          tradeText.setText(`选择数量：${this.tradeQuantity}`);
        },
        color: 0x8a5a35,
        fontSize: 14
      });
    });

    // 执行按钮
    const actionButtons = [
      {
        label: '添加燃油',
        color: 0x3f8c55,
        onClick: () => {
          if (this.tradeQuantity <= 0) {
            this.scene.showMessage('请选择要添加的数量');
            return;
          }
          const maxCanAdd = (item.maxFuel || 20) - (item.fuel || 0);
          const toAdd = Math.min(this.tradeQuantity, fuelSummary.totalFuel, maxCanAdd);
          
          if (toAdd <= 0) {
            this.scene.showMessage(maxCanAdd <= 0 ? '发电机油箱已满' : '没有足够燃油');
            return;
          }

          const actualAdded = this.scene.inventory.consumeFuel(toAdd);
          item.fuel = (item.fuel || 0) + actualAdded;
          this.tradeQuantity = 0;
          this.scene.saveNow();
          this.openGeneratorUI(item);
        }
      },
      {
        label: '取出燃油',
        color: 0xb7653c,
        onClick: () => {
          if (this.tradeQuantity <= 0) {
            this.scene.showMessage('请选择要取出的数量');
            return;
          }
          const toTake = Math.min(this.tradeQuantity, item.fuel || 0);
          if (toTake <= 0) {
            this.scene.showMessage('发电机内没有燃油');
            return;
          }

          // 检查背包空间
          const neededSlots = Math.ceil(toTake / 20);
          const emptySlots = this.scene.inventory.slots.filter(s => s.itemId === ITEM_IDS.EMPTY).length;
          const existingCans = this.scene.inventory.slots.filter(s => s.itemId === ITEM_IDS.FUEL_CAN && (s.fuel || 0) < 20);
          
          // 粗略检查，addFuel 会处理细节
          const actualTaken = this.scene.inventory.addFuel(toTake);
          if (actualTaken < toTake) {
            this.scene.showMessage('背包空间不足');
            // 如果只存了一部分，也要扣除发电机油量
            item.fuel -= actualTaken;
          } else {
            item.fuel -= toTake;
          }
          
          this.tradeQuantity = 0;
          this.scene.saveNow();
          this.openGeneratorUI(item);
        }
      }
    ].flatMap((cfg, idx) => {
      return makeModalButton(this.scene, {
        x: x + 24 + idx * 210, y: y + 395, width: 200, height: 42,
        label: cfg.label,
        onClick: cfg.onClick,
        color: cfg.color
      });
    });

    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => {
      this.tradeQuantity = 0;
      this.closePanel();
    });

    layer.add([
      title,
      statusText,
      fuelText,
      consumptionText,
      ...toggleBtn,
      fuelStatusText,
      tradeText,
      ...quantityButtons,
      ...actionButtons,
      ...close
    ]);
  }

  isOpen() {
    return !!this.panelLayer;
  }

  closePanel() {
    this.scene.popModal('interior');
    if (this.panelLayer) {
      this.panelLayer.destroy();
      this.panelLayer = null;
    }
  }

  handleInteraction(interaction) {
    const interactionId = interaction?.id || interaction?.objectId;
    if (interactionId === 'interiorDoor') { this.exit(); return true; }
    
    const item = this.state.furniture.find((entry) => entry.id === interactionId);
    if (!item) return false;

    // Unified power check for powered devices (excluding generators and lamps which have their own logic)
    const def = FURNITURE_DEFS[item.type];
    const isPoweredDevice = def?.powered;
    const isGenerator = def?.powerOutput;
    const isLamp = item.type === 'wallLamp' || item.type === 'floorLamp';

    if (isPoweredDevice && !isGenerator && !isLamp) {
      if (!item.hasPower) {
        this.scene.showMessage(`${item.label}：当前没有电力供应`);
        return true;
      }
    }

    if (item.type === 'singleBed' || item.type === 'doubleBed') {
      this.scene.itemConfirm.openSleepConfirm();
    } else if (item.type === 'chair') {
      this.sittingFurnitureId === item.id ? this.standUp() : this.sitDown(item);
    } else if (item.type === 'wardrobe') {
      this.scene.inventory.openPanel();
    } else if (item.type === 'table') {
      this.useTable(item);
    } else if (item.type === 'stove') {
      if (!item.hasPower) {
        this.scene.showMessage('灶台：当前没有电力供应');
      } else {
        this.scene.crafting.open('stove');
      }
    } else if (isGenerator) {
      this.openGeneratorUI(item);
    } else if (isLamp) {
      this.toggleLamp(item);
    } else if (isPoweredDevice) {
      // General info for other powered devices like fridge or tv
      const status = item.hasPower ? '运行中' : '电力不足';
      this.scene.showMessage(`${item.label}：${status}`);
    }
    return true;
  }

  toggleLamp(lamp) {
    if (!lamp.hasPower && !lamp.isOn) {
      this.scene.showMessage('当前没有电力供应');
      return;
    }
    lamp.isOn = !lamp.isOn;
    this.calculatePower();
    this.renderFurniture();
    this.scene.saveNow();
  }

  sitDown(chair) {
    const rect = furnitureRect(chair);
    this.sittingFurnitureId = chair.id;
    this.scene.player.setPosition(rect.centerX, rect.centerY + 2);
    this.scene.player.setScale(0.82);
    this.scene.direction = 'down';
    this.scene.player.setTexture(this.scene.getPlayerTexture('down'));
    this.renderFurniture();
    this.scene.showMessage('坐在椅子上，再按 E 起身');
  }

  standUp() {
    if (!this.sittingFurnitureId) return;
    const chair = this.state.furniture.find((item) => item.id === this.sittingFurnitureId);
    this.sittingFurnitureId = null;
    this.scene.player.setScale(1);
    if (chair) {
      const rect = furnitureRect(chair);
      this.scene.player.setPosition(rect.centerX, rect.bottom + 18);
    }
    this.renderFurniture();
  }

  useTable(table) {
    if (table.surfaceItemId) {
      if (this.scene.inventory.addItem(table.surfaceItemId, 1)) {
        this.scene.showMessage(`从桌上取回${ITEMS[table.surfaceItemId].name}`);
        table.surfaceItemId = null;
      } else this.scene.showMessage('背包已满');
    } else {
      const selected = this.scene.inventory.getSelectedItem();
      if (!selected || !TABLE_ITEMS.has(selected.id) || !this.scene.inventory.removeItem(selected.id, 1)) {
        this.scene.showMessage('选中食物后可放到桌上');
        return;
      }
      table.surfaceItemId = selected.id;
      this.scene.showMessage(`把${selected.name}放到了桌上`);
    }
    this.renderFurniture();
    this.scene.saveNow();
  }

  isMovementLocked() { return Boolean(this.sittingFurnitureId || this.placement); }
  getStoredFurnitureCount(type) { return this.state.storage[type] || 0; }
  addStoredFurniture(type, quantity) { this.state.storage[type] = this.getStoredFurnitureCount(type) + quantity; }
  removeStoredFurniture(type, quantity) {
    if (this.getStoredFurnitureCount(type) < quantity) return false;
    this.state.storage[type] -= quantity;
    return true;
  }

  getSnapshot() {
    this.capturePlayer();
    return {
      player: { ...this.state.player },
      furniture: this.state.furniture.map((item) => ({ ...item, ...furnitureSize(item) })),
      storage: { ...this.state.storage },
      generator: {
        active: this.generator?.active || false,
        fuel: this.generator?.fuel || 0,
        lastUpdate: this.generator?.lastUpdate || 0
      }
    };
  }

  destroy() {
    this.scene.input.off('pointermove', this.pointerMoveHandler);
    this.furnitureContainers.forEach((container) => container.destroy());
    this.layer.destroy();
  }
}

function normalizeInterior(saved = {}) {
  const savedFurniture = Array.isArray(saved.furniture) ? saved.furniture : null;
  const normalizedFurniture = savedFurniture ? savedFurniture.map((savedItem) => normalizeFurniture(savedItem)).filter(Boolean) : null;
  const furniture = normalizedFurniture !== null ? normalizedFurniture : createDefaultFurniture();
  return {
    player: {
      x: Number.isFinite(saved.player?.x) ? saved.player.x : DEFAULT_PLAYER.x,
      y: Number.isFinite(saved.player?.y) ? saved.player.y : DEFAULT_PLAYER.y,
      direction: ['up', 'down', 'left', 'right'].includes(saved.player?.direction) ? saved.player.direction : DEFAULT_PLAYER.direction
    },
    furniture,
    storage: Object.fromEntries(Object.keys(FURNITURE_DEFS).map((type) => [type, Math.max(0, saved.storage?.[type] || 0)])),
    generator: {
      active: saved.generator?.active || false,
      fuel: Math.max(0, saved.generator?.fuel || 0),
      lastUpdate: saved.generator?.lastUpdate || 0
    }
  };
}

function normalizeFurniture(item) {
  let type = item?.type;
  if (!type && item?.id === 'bed') type = 'singleBed';
  if (!type && item?.id === 'table') type = 'table';
  if (!type && item?.id === 'chair') type = 'chair';
  if (!type && item?.id === 'cabinet') type = 'wardrobe';
  if (type === 'bed') type = 'singleBed';
  if (type === 'cabinet') type = 'wardrobe';
  const definition = FURNITURE_DEFS[type];
  if (!definition) return null;

  // 特殊逻辑：如果是发电机且初始燃油为0，默认关闭
  let isGeneratorOn = item.isGeneratorOn;
  if (definition.powerOutput && (item.fuel || 0) <= 0) {
    isGeneratorOn = false;
  }

  const legacyGridX = Number.isFinite(item.gridX) ? Math.round(item.gridX) : Math.round(((item.x || GRID.x) - GRID.x) / GRID_SIZE);
  const legacyGridY = Number.isFinite(item.gridY) ? Math.round(item.gridY) : Math.round(((item.y || GRID.y) - GRID.y) / GRID_SIZE);
  const gridX = Phaser.Math.Clamp(legacyGridX, 0, GRID.columns - definition.gridWidth);
  const gridY = Phaser.Math.Clamp(legacyGridY, 0, GRID.rows - definition.gridHeight);
  const extra = { surfaceItemId: item.surfaceItemId || null };
  ['isOn', 'hasPower', 'fuel', 'maxFuel', 'isGeneratorOn'].forEach((key) => {
    if (item[key] !== undefined) extra[key] = item[key];
  });
  // 覆盖默认值
  if (isGeneratorOn !== undefined) extra.isGeneratorOn = isGeneratorOn;
  return makeFurniture(type, item.id || `${type}-${Date.now()}`, gridX, gridY, extra);
}

function furnitureRect(item) {
  const size = furnitureSize(item);
  return new Phaser.Geom.Rectangle(
    GRID.x + item.gridX * GRID_SIZE,
    GRID.y + item.gridY * GRID_SIZE,
    size.width,
    size.height
  );
}

function furnitureSize(item) {
  const definition = FURNITURE_DEFS[item.type];
  return {
    width: (definition?.gridWidth || 1) * GRID_SIZE,
    height: (definition?.gridHeight || 1) * GRID_SIZE
  };
}

function drawFurniture(graphics, item) {
  if (item.type === 'singleBed' || item.type === 'doubleBed') {
    graphics.fillStyle(0x5f3c2c, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 5);
    graphics.fillStyle(0xe6d7b0, 1); graphics.fillRoundedRect(4, 4, item.width - 8, item.height - 8, 3);
    graphics.fillStyle(0x4f86a8, 1); graphics.fillRect(4, Math.min(18, item.height / 2), item.width - 8, item.height - Math.min(22, item.height / 2));
    graphics.fillStyle(0xfff5d8, 1); graphics.fillRoundedRect(6, 5, 22, 10, 3);
  } else if (item.type === 'table') {
    graphics.fillStyle(0x6b4025, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 5);
    graphics.fillStyle(0xa86b39, 1); graphics.fillRoundedRect(4, 4, item.width - 8, item.height - 12, 3);
  } else if (item.type === 'chair') {
    graphics.fillStyle(0x704526, 1); graphics.fillRoundedRect(4, 2, item.width - 8, 14, 3); graphics.fillRect(7, 15, item.width - 14, 13);
  } else if (item.type === 'wardrobe' || item.type === 'locker' || item.type === 'bookcase') {
    graphics.fillStyle(0x704526, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 4);
    graphics.fillStyle(item.type === 'bookcase' ? 0x5a3c27 : 0xaa7142, 1); graphics.fillRect(4, 5, item.width - 8, item.height - 10);
    if (item.type === 'bookcase') {
      graphics.fillStyle(0xd1a46d, 1); graphics.fillRect(6, 10, 20, 4); graphics.fillRect(6, 25, 20, 4);
    } else {
      graphics.fillStyle(0xf2c14f, 1); graphics.fillCircle(item.width / 2, item.height / 2, 2);
    }
  } else if (item.type === 'stove') {
    graphics.fillStyle(0x596168, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 4);
    graphics.fillStyle(0x20252a, 1); graphics.fillCircle(16, 14, 8); graphics.fillCircle(46, 14, 8);
  } else if (item.type === 'fridge') {
    graphics.fillStyle(0xd1d5db, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 4);
    graphics.fillStyle(0x9ca3af, 1); graphics.fillRect(4, item.height * 0.4, item.width - 8, 2);
  } else if (item.type === 'sofa') {
    graphics.fillStyle(0x4a5568, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 8);
    graphics.fillStyle(0x718096, 1); graphics.fillRoundedRect(4, 4, item.width - 8, item.height - 8, 4);
  } else if (item.type === 'tv') {
    graphics.fillStyle(0x2d3748, 1); graphics.fillRect(0, 0, item.width, item.height);
    graphics.fillStyle(item.hasPower && item.isOn ? 0x4299e1 : 0x1a202c, 1); graphics.fillRect(4, 4, item.width - 8, item.height - 8);
  } else if (item.type === 'box') {
    graphics.fillStyle(0x8b4513, 1); graphics.fillRect(0, 0, item.width, item.height);
    graphics.lineStyle(2, 0x5f370e, 1); graphics.strokeRect(4, 4, item.width - 8, item.height - 8);
  } else if (item.type === 'wallLamp' || item.type === 'floorLamp') {
    graphics.fillStyle(0x718096, 1);
    if (item.type === 'wallLamp') graphics.fillCircle(item.width / 2, item.height / 2, 8);
    else graphics.fillRect(item.width / 2 - 2, 10, 4, item.height - 10);
    graphics.fillStyle(item.hasPower && item.isOn ? 0xffff00 : 0x4a5568, 1);
    graphics.fillCircle(item.width / 2, item.type === 'wallLamp' ? item.height / 2 : 5, 6);
  } else if (item.type.includes('Generator')) {
    graphics.fillStyle(0x4a5568, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 4);
    graphics.fillStyle(item.fuel > 0 && item.isGeneratorOn ? 0x48bb78 : 0xf56565, 1); graphics.fillCircle(item.width / 2, item.height / 2, 6);
  } else if (item.type === 'carpet') {
    graphics.fillStyle(0x9b2c2c, 1); graphics.fillRoundedRect(0, 0, item.width, item.height, 4);
    graphics.lineStyle(2, 0x822727, 1); graphics.strokeRect(4, 4, item.width - 8, item.height - 8);
  } else if (item.type === 'pottedPlant') {
    graphics.fillStyle(0x718096, 1); graphics.fillRect(8, 20, 16, 12);
    graphics.fillStyle(0x48bb78, 1); graphics.fillCircle(16, 12, 10);
  } else if (item.type === 'windowDecor') {
    graphics.fillStyle(0xa0aec0, 1); graphics.fillRect(0, 0, item.width, item.height);
    graphics.lineStyle(2, 0x4a5568, 1); graphics.strokeRect(0, 0, item.width, item.height);
  } else if (item.type === 'workbench') {
    graphics.fillStyle(0x744210, 1); graphics.fillRect(0, 10, item.width, 22);
    graphics.fillStyle(0x5f370e, 1); graphics.fillRect(4, 0, 10, 10);
  }
}

function textStyle(size, color, bold = false) {
  return { fontFamily: 'system-ui, "Segoe UI", sans-serif', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' };
}
