import Phaser from 'phaser';
import { ITEM_IDS, ITEMS } from './items';
import { COLORS, TILE_SIZE, isPointInWater } from './map';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const CHEST_ROWS = 2;
const CHEST_COLS = 10;
const CHEST_SIZE = CHEST_ROWS * CHEST_COLS;

export default class ChestSystem {
  constructor(scene, savedChest = {}) {
    this.scene = scene;
    this.state = normalizeChest(savedChest);
    this.layer = null;
    this.moving = null;
    this.lastClickAt = 0;
    this.selectedIndex = -1;
    this.worldContainer = null;
    this.pointerMoveHandler = (pointer) => this.handlePointerMove(pointer);
    this.pointerDownHandler = () => this.handleWorldPointerDown();
    scene.input.on('pointermove', this.pointerMoveHandler);
    scene.input.on('pointerdown', this.pointerDownHandler);
    this.renderWorldChest();
  }

  renderWorldChest() {
    this.worldContainer?.destroy();
    const { x, y } = this.state.position;
    const container = this.scene.add.container(x * TILE_SIZE, y * TILE_SIZE);
    container.setDepth(7);
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(COLORS.crate, 1);
    graphics.fillRect(3, 4, 26, 24);
    graphics.lineStyle(2, COLORS.crateDark, 1);
    graphics.lineBetween(5, 6, 27, 26);
    graphics.lineBetween(27, 6, 5, 26);
    if (this.moving) {
      container.setAlpha(0.58);
      graphics.lineStyle(3, this.canPlaceHere() ? 0x50c878 : 0xd9574f, 1);
      graphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    }
    const hit = this.scene.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0xffffff, 0.001);
    hit.setOrigin(0, 0);

    // Only set interactive if not moving, to avoid blocking placement clicks on the ghost
    if (!this.moving) {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        const now = performance.now();
        if (now - this.lastClickAt <= 380) this.startMoving();
        this.lastClickAt = now;
      });
    }

    container.add([graphics, hit]);
    this.worldContainer = container;
  }

  startMoving() {
    this.moving = { original: { ...this.state.position }, startedAt: performance.now() };
    this.renderWorldChest();
    this.scene.showMessage('移动个人木箱：单击合法位置放置，Esc 取消');
  }

  handlePointerMove(pointer) {
    if (!this.moving || this.scene.interior.inside || this.scene.hasOpenPanel()) return;
    
    // Always use world coordinates for placement
    const worldX = pointer.worldX ?? pointer.x;
    const worldY = pointer.worldY ?? pointer.y;
    
    const x = Phaser.Math.Clamp(Math.floor(worldX / TILE_SIZE), 0, (this.scene.physics.world.bounds.width / TILE_SIZE) - 1);
    const y = Phaser.Math.Clamp(Math.floor(worldY / TILE_SIZE), 0, (this.scene.physics.world.bounds.height / TILE_SIZE) - 1);
    
    if (x === this.state.position.x && y === this.state.position.y) return;
    this.state.position = { x, y };
    this.renderWorldChest();
  }

  handleWorldPointerDown() {
    if (!this.moving || this.scene.hasOpenPanel()) return;
    
    // Safety delay to prevent immediate placement on pickup click
    if (performance.now() - this.moving.startedAt < 150) return;

    if (!this.canPlaceHere()) {
      // Logic for why it failed
      const rect = new Phaser.Geom.Rectangle(this.state.position.x * TILE_SIZE, this.state.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      
      // Determine failure reason
      if (isPointInWater(rect.centerX, rect.centerY)) {
        this.scene.showMessage('不能把木箱放在水里');
      } else if (this.scene.isTileOccupied?.(this.state.position.x, this.state.position.y)) {
        this.scene.showMessage('目标位置被占用');
      } else {
        this.scene.showMessage('无效位置');
      }
      return;
    }
    
    this.moving = null;
    this.renderWorldChest();
    this.scene.showMessage('个人木箱已放置');
    this.scene.saveNow();
  }

  cancelMoving(message = '已取消移动木箱') {
    if (!this.moving) return false;
    this.state.position = { ...this.moving.original };
    this.moving = null;
    this.renderWorldChest();
    this.scene.showMessage(message);
    return true;
  }

  canPlaceHere() {
    const rect = new Phaser.Geom.Rectangle(this.state.position.x * TILE_SIZE, this.state.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    return this.scene.canPlacePersonalChest(rect);
  }

  ensureValidPosition() {
    if (this.canPlaceHere()) return false;
    const original = { ...this.state.position };
    for (let y = 0; y < this.scene.physics.world.bounds.height / TILE_SIZE; y += 1) {
      for (let x = 0; x < this.scene.physics.world.bounds.width / TILE_SIZE; x += 1) {
        this.state.position = { x, y };
        if (this.canPlaceHere()) {
          this.renderWorldChest();
          return true;
        }
      }
    }
    this.state.position = original;
    return false;
  }

  getNearby(player) {
    const centerX = this.state.position.x * TILE_SIZE + TILE_SIZE / 2;
    const centerY = this.state.position.y * TILE_SIZE + TILE_SIZE / 2;
    return Phaser.Math.Distance.Between(player.x, player.y, centerX, centerY) <= 48;
  }

  collidesAt(body) {
    const rect = new Phaser.Geom.Rectangle(this.state.position.x * TILE_SIZE, this.state.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    return Phaser.Geom.Intersects.RectangleToRectangle(body, rect);
  }

  open() {
    this.state.opened = true;
    this.renderPanel();
    this.scene.saveNow();
  }

  renderPanel() {
    this.close();
    const width = 640;
    const height = 360;
    const shell = createModalShell(this.scene, { width, height, depth: 84, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    
    const title = this.scene.add.text(x + 24, y + 18, '个人木箱', modalTextStyle(22, '#3b2a1d', true));
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, ...close]);

    const gridBg = this.scene.add.rectangle(x + 24, y + 64, 592, 140, 0xfbe9bb, 1);
    gridBg.setOrigin(0, 0);
    gridBg.setStrokeStyle(2, 0x8a5a35, 1);
    layer.add(gridBg);

    // Render 10x2 Grid
    this.state.slots.forEach((slot, index) => {
      const col = index % CHEST_COLS;
      const row = Math.floor(index / CHEST_COLS);
      const slotX = x + 38 + col * 58;
      const slotY = y + 78 + row * 64;
      const isSelected = index === this.selectedIndex;
      
      const bg = this.scene.add.rectangle(slotX, slotY, 50, 54, isSelected ? 0xffdf83 : 0xf7e6b9, 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0x3f78bd : 0x8a5a35, 1);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (pointer, lx, ly, event) => {
        event.stopPropagation();
        this.handleSlotClick(index);
      });

      const item = ITEMS[slot.itemId];
      let icon = null;
      if (item && item.id !== ITEM_IDS.EMPTY) {
        if (item.iconKey && this.scene.textures.exists(item.iconKey)) {
          icon = this.scene.add.image(slotX + 25, slotY + 25, item.iconKey);
          icon.setDisplaySize(28, 28);
        } else {
          icon = this.scene.add.text(slotX + 25, slotY + 25, item.name.slice(0, 1), modalTextStyle(14, '#3b2a1d', true));
          icon.setOrigin(0.5, 0.5);
        }
        
        const qty = this.scene.add.text(slotX + 46, slotY + 38, `${slot.quantity}`, modalTextStyle(10, '#3b2a1d', true));
        qty.setOrigin(1, 0);
        layer.add([bg, icon, qty]);
      } else {
        layer.add(bg);
      }
    });

    // Action Buttons
    const selectedSlot = this.state.slots[this.selectedIndex];
    const selectedItem = selectedSlot ? ITEMS[selectedSlot.itemId] : null;
    
    const infoText = selectedItem && selectedItem.id !== ITEM_IDS.EMPTY 
      ? `选中：${selectedItem.name} × ${selectedSlot.quantity}` 
      : '选择物品进行存取';
    const info = this.scene.add.text(x + 24, y + 220, infoText, modalTextStyle(15, '#3b2a1d', true));
    
    const takeOut = makeModalButton(this.scene, {
      x: x + 24, y: y + 260, width: 140, height: 40, label: '取出到背包',
      onClick: () => this.takeOut(this.selectedIndex)
    });
    
    const putIn = makeModalButton(this.scene, {
      x: x + 180, y: y + 260, width: 140, height: 40, label: '存入背包物品',
      onClick: () => this.putIn()
    });

    const transferAll = makeModalButton(this.scene, {
      x: x + 336, y: y + 260, width: 140, height: 40, label: '全部取出',
      onClick: () => this.transferAll()
    });

    layer.add([info, ...takeOut, ...putIn, ...transferAll]);
  }

  handleSlotClick(index) {
    this.selectedIndex = index;
    this.renderPanel();
  }

  takeOut(index) {
    if (index < 0 || index >= CHEST_SIZE) return;
    const slot = this.state.slots[index];
    if (!slot || slot.itemId === ITEM_IDS.EMPTY) return;
    
    if (this.scene.inventory.addItem(slot.itemId, slot.quantity)) {
      this.scene.showMessage(`取出了 ${slot.quantity} 个 ${ITEMS[slot.itemId].name}`);
      slot.itemId = ITEM_IDS.EMPTY;
      slot.quantity = 0;
      this.scene.saveNow();
      this.renderPanel();
    } else {
      this.scene.showMessage('背包已满');
    }
  }

  putIn() {
    const selected = this.scene.inventory.getSelectedItem();
    if (!selected || selected.id === ITEM_IDS.EMPTY) {
      this.scene.showMessage('请先在快捷栏选中要存入的物品');
      return;
    }
    
    const slot = this.scene.inventory.getSelectedSlot();
    const amount = slot.quantity;
    
    if (this.addItem(selected.id, amount)) {
      this.scene.inventory.removeItem(selected.id, amount);
      this.scene.showMessage(`存入了 ${amount} 个 ${selected.name}`);
      this.scene.saveNow();
      this.renderPanel();
    } else {
      this.scene.showMessage('木箱已满');
    }
  }

  addItem(itemId, quantity) {
    // Try to stack
    let slot = this.state.slots.find(s => s.itemId === itemId);
    if (!slot) {
      slot = this.state.slots.find(s => s.itemId === ITEM_IDS.EMPTY);
    }
    
    if (!slot) return false;
    
    slot.itemId = itemId;
    slot.quantity = (slot.quantity || 0) + quantity;
    return true;
  }

  transferAll() {
    let successCount = 0;
    this.state.slots.forEach((slot, index) => {
      if (slot.itemId !== ITEM_IDS.EMPTY) {
        if (this.scene.inventory.addItem(slot.itemId, slot.quantity)) {
          slot.itemId = ITEM_IDS.EMPTY;
          slot.quantity = 0;
          successCount++;
        }
      }
    });
    if (successCount > 0) {
      this.scene.showMessage('已取出木箱内所有可存放物品');
      this.scene.saveNow();
      this.renderPanel();
    } else {
      this.scene.showMessage('木箱是空的或背包已满');
    }
  }

  getSnapshot() { return { ...this.state, position: { ...this.state.position } }; }
  isOpen() { return Boolean(this.layer); }
  close() { this.layer?.destroy(); this.layer = null; }
  setVisible(visible) { this.worldContainer?.setVisible(visible); }
  destroy() {
    this.close();
    this.scene.input.off('pointermove', this.pointerMoveHandler);
    this.scene.input.off('pointerdown', this.pointerDownHandler);
    this.worldContainer?.destroy();
  }
}

export function createDefaultChest() {
  const slots = Array(CHEST_SIZE).fill(null).map(() => ({ itemId: ITEM_IDS.EMPTY, quantity: 0 }));
  // Initial items: 10 radish seeds in first slot
  slots[0] = { itemId: ITEM_IDS.RADISH_SEED, quantity: 10 };
  
  return {
    opened: false,
    slots: slots,
    position: { x: 7, y: 11 }
  };
}

function normalizeChest(savedChest) {
  const fallback = createDefaultChest();
  const opened = Boolean(savedChest?.opened);
  const position = {
    x: Number.isFinite(savedChest?.position?.x) ? Math.floor(savedChest.position.x) : fallback.position.x,
    y: Number.isFinite(savedChest?.position?.y) ? Math.floor(savedChest.position.y) : fallback.position.y
  };

  let slots = savedChest?.slots;
  if (!Array.isArray(slots)) {
    // Migration: If old save format exists, convert it
    slots = fallback.slots;
    if (Number.isFinite(savedChest?.radishSeeds) && savedChest.radishSeeds > 0) {
      slots[0] = { itemId: ITEM_IDS.RADISH_SEED, quantity: savedChest.radishSeeds };
    }
  } else {
    // Ensure correct length and format
    slots = Array(CHEST_SIZE).fill(null).map((_, i) => {
      const s = slots[i];
      return {
        itemId: typeof s?.itemId === 'string' ? s.itemId : ITEM_IDS.EMPTY,
        quantity: Number.isFinite(s?.quantity) ? Math.max(0, s.quantity) : 0
      };
    });
  }

  return { opened, slots, position };
}
