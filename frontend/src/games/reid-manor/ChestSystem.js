import Phaser from 'phaser';
import { ITEM_IDS, ITEMS } from './items';
import { TILE_SIZE } from './map';
import { openContainerModal } from './ContainerUi';

const CHEST_ROWS = 2;
const CHEST_COLS = 10;
const CHEST_SIZE = CHEST_ROWS * CHEST_COLS;

export default class ChestSystem {
  constructor(scene, savedChest = {}) {
    this.scene = scene;
    this.state = normalizeChest(savedChest);
    this.ui = null;
    this.moving = null;
    this.worldContainer = null;
    this.pointerMoveHandler = (pointer) => this.handlePointerMove(pointer);
    this.pointerDownHandler = () => this.handleWorldPointerDown();
    scene.input.on('pointermove', this.pointerMoveHandler);
    scene.input.on('pointerdown', this.pointerDownHandler);
    this.renderWorldChest();
  }

  open() {
    if (this.ui) return;

    this.ui = openContainerModal(this.scene, {
      title: '个人木箱',
      containerType: 'chest',
      containerSlots: this.state.slots,
      containerCols: CHEST_COLS,
      containerRows: CHEST_ROWS,
      onUpdate: () => {
        this.scene.saveNow();
      },
      onClose: () => {
        this.ui = null;
      },
      extraButtons: [
        {
          label: '全部放入',
          color: 0x3f8c55,
          onClick: () => this.transferToChest()
        },
        {
          label: '全部取出',
          onClick: () => this.transferAll()
        }
      ]
    });
  }

  close() {
    if (this.ui) {
      this.ui.close();
      this.ui = null;
    }
  }

  transferToChest() {
    const backpackSlots = this.scene.inventory.slots;
    const chestSlots = this.state.slots;
    let movedAny = false;

    // 1. 先尝试合并到已有堆叠
    backpackSlots.forEach(invSlot => {
      if (invSlot.itemId === ITEM_IDS.EMPTY) return;
      
      const itemDef = ITEMS[invSlot.itemId];
      const maxStack = itemDef?.maxStack || 99;

      chestSlots.forEach(chestSlot => {
        if (chestSlot.itemId === invSlot.itemId && chestSlot.quantity < maxStack) {
          const space = maxStack - chestSlot.quantity;
          const toMove = Math.min(invSlot.quantity, space);
          chestSlot.quantity += toMove;
          invSlot.quantity -= toMove;
          if (invSlot.quantity <= 0) {
            invSlot.itemId = ITEM_IDS.EMPTY;
            invSlot.quantity = 0;
          }
          movedAny = true;
        }
      });
    });

    // 2. 再尝试放入空格
    backpackSlots.forEach(invSlot => {
      if (invSlot.itemId === ITEM_IDS.EMPTY) return;

      const emptyChestSlot = chestSlots.find(s => s.itemId === ITEM_IDS.EMPTY);
      if (emptyChestSlot) {
        emptyChestSlot.itemId = invSlot.itemId;
        emptyChestSlot.quantity = invSlot.quantity;
        invSlot.itemId = ITEM_IDS.EMPTY;
        invSlot.quantity = 0;
        movedAny = true;
      }
    });

    if (movedAny) {
      this.scene.inventory.render();
      this.scene.saveNow();
      if (this.ui) this.ui.render(); // 刷新 UI 而不是重新打开
    } else {
      const hasBackpackItems = backpackSlots.some(s => s.itemId !== ITEM_IDS.EMPTY);
      if (!hasBackpackItems) {
        this.scene.showMessage('背包中没有可放入的物品');
      } else {
        this.scene.showMessage('木箱空间已满');
      }
    }
  }

  transferAll() {
    const backpackSlots = this.scene.inventory.slots;
    const chestSlots = this.state.slots;
    let movedAny = false;

    // 1. 先尝试合并到背包已有堆叠
    chestSlots.forEach(chestSlot => {
      if (chestSlot.itemId === ITEM_IDS.EMPTY) return;
      
      const itemDef = ITEMS[chestSlot.itemId];
      const maxStack = itemDef?.maxStack || 99;

      backpackSlots.forEach(invSlot => {
        if (invSlot.itemId === chestSlot.itemId && invSlot.quantity < maxStack) {
          const space = maxStack - invSlot.quantity;
          const toMove = Math.min(chestSlot.quantity, space);
          invSlot.quantity += toMove;
          chestSlot.quantity -= toMove;
          if (chestSlot.quantity <= 0) {
            chestSlot.itemId = ITEM_IDS.EMPTY;
            chestSlot.quantity = 0;
          }
          movedAny = true;
        }
      });
    });

    // 2. 再尝试放入背包空格
    chestSlots.forEach(chestSlot => {
      if (chestSlot.itemId === ITEM_IDS.EMPTY) return;

      const emptyInvSlot = backpackSlots.find(s => s.itemId === ITEM_IDS.EMPTY);
      if (emptyInvSlot) {
        emptyInvSlot.itemId = chestSlot.itemId;
        emptyInvSlot.quantity = chestSlot.quantity;
        chestSlot.itemId = ITEM_IDS.EMPTY;
        chestSlot.quantity = 0;
        movedAny = true;
      }
    });

    if (movedAny) {
      this.scene.inventory.render();
      this.scene.saveNow();
      if (this.ui) this.ui.render(); // 刷新 UI 而不是重新打开
    } else {
      const hasChestItems = chestSlots.some(s => s.itemId !== ITEM_IDS.EMPTY);
      if (!hasChestItems) {
        this.scene.showMessage('木箱中没有物品');
      } else {
        this.scene.showMessage('背包空间不足');
      }
    }
  }

  startMoving() {
    this.moving = { original: { ...this.state.position }, startedAt: performance.now() };
    this.renderWorldChest();
    this.scene.showMessage('移动个人木箱：单击合法位置放置，Esc 取消');
  }

  handlePointerMove(pointer) {
    if (!this.moving || this.scene.interior?.inside || this.scene.hasOpenPanel()) return;
    
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
    if (!this.moving || performance.now() - this.moving.startedAt < 100) return;
    
    const rect = { x: this.state.position.x * TILE_SIZE, y: this.state.position.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
    if (this.scene.canPlacePersonalChest(rect)) {
      this.moving = null;
      this.renderWorldChest();
      this.scene.saveNow();
      this.scene.showMessage('木箱位置已更新');
    } else {
      this.scene.showMessage('这里不能放置木箱');
    }
  }

  cancelMoving() {
    if (this.moving) {
      this.state.position = this.moving.original;
      this.moving = null;
      this.renderWorldChest();
      return true;
    }
    return false;
  }

  renderWorldChest() {
    if (this.worldContainer) {
      this.worldContainer.destroy();
      this.worldContainer = null;
    }
    if (this.scene.interior?.inside) return;

    const { x, y } = this.state.position;
    const worldX = x * TILE_SIZE;
    const worldY = y * TILE_SIZE;

    this.worldContainer = this.scene.add.container(worldX, worldY);
    const g = this.scene.add.graphics();
    
    if (this.moving) {
      const rect = { x: worldX, y: worldY, width: TILE_SIZE, height: TILE_SIZE };
      const canPlace = this.scene.canPlacePersonalChest(rect);
      g.fillStyle(canPlace ? 0x00ff00 : 0xff0000, 0.3);
      g.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    }

    g.fillStyle(0x8b4513, 1);
    g.fillRoundedRect(4, 8, 24, 20, 4);
    g.fillStyle(0x5d4037, 1);
    g.fillRect(4, 14, 24, 4);
    g.fillStyle(0xffd700, 1);
    g.fillRect(14, 14, 4, 6);
    
    this.worldContainer.add(g);
    this.worldContainer.setDepth(this.scene.getWorldDepth(worldY + 28));
  }

  getNearby(player) {
    if (this.moving || this.scene.interior?.inside) return null;
    const dist = Phaser.Math.Distance.Between(
      player.x, player.y,
      this.state.position.x * TILE_SIZE + 16,
      this.state.position.y * TILE_SIZE + 16
    );
    return dist < 48 ? this.state : null;
  }

  collidesAt(rect) {
    if (this.moving || this.scene.interior?.inside) return false;
    const chestRect = new Phaser.Geom.Rectangle(this.state.position.x * TILE_SIZE, this.state.position.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    return Phaser.Geom.Intersects.RectangleToRectangle(rect, chestRect);
  }

  ensureValidPosition() {
    const { x, y } = this.state.position;
    const rect = { x: x * TILE_SIZE, y: y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
    if (!this.scene.canPlacePersonalChest(rect)) {
      // Find nearest valid
      for (let r = 1; r < 10; r++) {
        for (let dx = -r; dx <= r; dx++) {
          for (let dy = -r; dy <= r; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            const nRect = { x: nx * TILE_SIZE, y: ny * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
            if (this.scene.canPlacePersonalChest(nRect)) {
              this.state.position = { x: nx, y: ny };
              return;
            }
          }
        }
      }
    }
  }

  getSnapshot() {
    return this.state;
  }

  isOpen() { return !!this.ui; }

  destroy() {
    this.scene.input.off('pointermove', this.pointerMoveHandler);
    this.scene.input.off('pointerdown', this.pointerDownHandler);
    if (this.worldContainer) this.worldContainer.destroy();
  }
}

export function createDefaultChest() {
  return {
    slots: Array.from({ length: CHEST_SIZE }, () => ({
      itemId: ITEM_IDS.EMPTY,
      quantity: 0
    })),
    position: { x: 8, y: 7 }
  };
}

function normalizeChest(saved = {}) {
  const slots = Array.isArray(saved.slots) ? saved.slots : [];
  const normalizedSlots = Array.from({ length: CHEST_SIZE }, (_, i) => {
    const s = slots[i];
    return {
      itemId: typeof s?.itemId === 'string' ? s.itemId : ITEM_IDS.EMPTY,
      quantity: Number.isFinite(s?.quantity) ? Math.max(0, s.quantity) : 0
    };
  });

  return {
    slots: normalizedSlots,
    position: (saved.position && Number.isFinite(saved.position.x)) ? saved.position : { x: 8, y: 7 }
  };
}
