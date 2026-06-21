import Phaser from 'phaser';
import { ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const TRASH_ROWS = 3;
const TRASH_COLS = 3;
const TRASH_SIZE = TRASH_ROWS * TRASH_COLS;

export default class TrashCanSystem {
  constructor(scene, savedTrash = {}) {
    this.scene = scene;
    this.state = this.normalizeTrash(savedTrash);
    this.layer = null;
    this.selectedIndex = -1;
    this.lastClickTime = 0;
    this.lastClickKey = '';
  }

  normalizeTrash(saved = {}) {
    const slots = Array.isArray(saved.slots) ? saved.slots : [];
    const normalizedSlots = Array.from({ length: TRASH_SIZE }, (_, i) => {
      const s = slots[i];
      return {
        itemId: typeof s?.itemId === 'string' ? s.itemId : ITEM_IDS.EMPTY,
        quantity: Number.isFinite(s?.quantity) ? Math.max(0, s.quantity) : 0
      };
    });

    const snapshot = Array.isArray(saved.recoverySnapshot) ? saved.recoverySnapshot : null;
    const normalizedSnapshot = snapshot ? snapshot.map(s => ({
      itemId: typeof s?.itemId === 'string' ? s.itemId : ITEM_IDS.EMPTY,
      quantity: Number.isFinite(s?.quantity) ? Math.max(0, s.quantity) : 0
    })) : null;

    return {
      slots: normalizedSlots,
      recoverySnapshot: normalizedSnapshot
    };
  }

  open() {
    this.renderPanel();
  }

  renderPanel() {
    this.close();
    const width = 680;
    const height = 540;
    const shell = createModalShell(this.scene, { 
      width, 
      height, 
      depth: 90, 
      onClose: () => this.close() 
    });
    const { layer, x, y } = shell;
    this.layer = layer;

    const title = this.scene.add.text(x + 24, y + 20, '垃圾箱', modalTextStyle(22, '#3b2a1d', true));
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, ...close]);

    // 1. Trash Can Slots (3x3)
    const trashLabel = this.scene.add.text(x + 24, y + 60, '垃圾桶库存 (3x3)', modalTextStyle(16, '#3b2a1d', true));
    layer.add(trashLabel);

    const trashBg = this.scene.add.rectangle(x + 24, y + 85, 180, 180, 0xfbe9bb, 1);
    trashBg.setOrigin(0, 0);
    trashBg.setStrokeStyle(2, 0x8a5a35, 1);
    layer.add(trashBg);

    this.state.slots.forEach((slot, index) => {
      const col = index % TRASH_COLS;
      const row = Math.floor(index / TRASH_COLS);
      const slotX = x + 34 + col * 58;
      const slotY = y + 95 + row * 58;
      this.renderSlot(layer, slotX, slotY, slot, 'trash', index);
    });

    // 2. Player Inventory (Lower part)
    const invLabel = this.scene.add.text(x + 24, y + 280, '个人背包', modalTextStyle(16, '#3b2a1d', true));
    layer.add(invLabel);

    const invBg = this.scene.add.rectangle(x + 24, y + 305, 590, 200, 0xfbe9bb, 1);
    invBg.setOrigin(0, 0);
    invBg.setStrokeStyle(2, 0x8a5a35, 1);
    layer.add(invBg);

    this.scene.inventory.slots.forEach((slot, index) => {
      const col = index % 10;
      const row = Math.floor(index / 10);
      const slotX = x + 34 + col * 58;
      const slotY = y + 315 + row * 62;
      this.renderSlot(layer, slotX, slotY, slot, 'inventory', index);
    });

    // 3. Right Buttons
    const recycleBtn = makeModalButton(this.scene, {
      x: x + 230, y: y + 95, width: 120, height: 42,
      label: '回收',
      onClick: () => this.handleRecycle(),
      color: 0x3f8c55
    });
    
    const retrieveBtn = makeModalButton(this.scene, {
      x: x + 230, y: y + 150, width: 120, height: 42,
      label: '找回',
      onClick: () => this.handleRetrieve(),
      color: 0x4a90e2
    });

    const hint = this.scene.add.text(x + 230, y + 205, '回收：把垃圾交给环卫工人\n找回：从环卫工人求回垃圾', modalTextStyle(12, '#6e4526'));
    layer.add([...recycleBtn, ...retrieveBtn, hint]);
  }

  renderSlot(layer, x, y, slot, source, index) {
    const item = ITEMS[slot.itemId];
    const isSelected = source === 'trash' && index === this.selectedIndex;
    
    const bg = this.scene.add.rectangle(x, y, 50, 54, isSelected ? 0xffdf83 : 0xf7e6b9, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(isSelected ? 3 : 1, isSelected ? 0x3f78bd : 0x8a5a35, 1);
    bg.setInteractive({ useHandCursor: true });

    // Double click to move
    bg.on('pointerdown', (_pointer, _lx, _ly, event) => {
      event?.stopPropagation?.();

      const now = performance.now();
      const clickKey = `${source}-${index}`;
      const isDoubleClick = 
        this.lastClickKey === clickKey && 
        now - this.lastClickTime <= 500;

      this.lastClickKey = clickKey;
      this.lastClickTime = now;

      if (!isDoubleClick) return;

      this.lastClickKey = '';
      this.lastClickTime = 0;
      this.handleSlotDoubleClick(source, index);
    });

    if (item && item.id !== ITEM_IDS.EMPTY) {
      const icon = this.makeIcon(item, x + 25, y + 25, 30);
      const qtyText = slot.quantity > 1 ? `${slot.quantity}` : '';
      const qty = this.scene.add.text(x + 46, y + 38, qtyText, modalTextStyle(10, '#3b2a1d', true));
      qty.setOrigin(1, 0);
      layer.add([bg, icon, qty]);
    } else {
      layer.add(bg);
    }
  }

  getSlotData(source, index) {
    return source === 'trash' ? this.state.slots[index] : this.scene.inventory.slots[index];
  }

  handleSlotDoubleClick(source, index) {
    const slot = this.getSlotData(source, index);
    if (!slot || slot.itemId === ITEM_IDS.EMPTY) return;

    if (source === 'inventory') {
      // Move from inventory to trash
      if (slot.quantity > 1) {
        this.scene.itemConfirm.openDiscardQuantityConfirm(slot, (qty) => {
          this.moveItems('inventory', index, 'trash', qty);
        });
      } else {
        this.moveItems('inventory', index, 'trash', 1);
      }
    } else if (source === 'trash') {
      // Move from trash to inventory
      this.returnTrashItemToInventory(index);
    }
  }

  returnTrashItemToInventory(trashSlotIndex) {
    const slot = this.state.slots[trashSlotIndex];
    if (!slot || slot.itemId === ITEM_IDS.EMPTY) return;
    
    // Always move the whole group as requested
    this.moveItems('trash', trashSlotIndex, 'inventory', slot.quantity);
  }

  moveItems(fromSource, fromIndex, toSource, quantity) {
    const fromSlot = this.getSlotData(fromSource, fromIndex);
    const itemToMove = fromSlot.itemId;
    
    // 1. Calculate target slot(s)
    const targetSlots = toSource === 'trash' ? this.state.slots : this.scene.inventory.slots;
    
    // Find stackable slot (must not be full, although maxStack is not yet enforced)
    let targetSlot = targetSlots.find(s => s.itemId === itemToMove);
    
    // If no stackable, find empty
    if (!targetSlot) {
      targetSlot = targetSlots.find(s => s.itemId === ITEM_IDS.EMPTY);
    }

    if (!targetSlot) {
      this.scene.showMessage(toSource === 'inventory' ? '背包空间不足' : '垃圾桶已满');
      return;
    }

    // 2. Perform Atomic Transfer
    targetSlot.itemId = itemToMove;
    targetSlot.quantity += quantity;
    
    fromSlot.quantity -= quantity;
    if (fromSlot.quantity <= 0) {
      fromSlot.itemId = ITEM_IDS.EMPTY;
      fromSlot.quantity = 0;
    }
    
    // 3. Sync and Refresh
    if (toSource === 'inventory' || fromSource === 'inventory') {
      this.scene.inventory.render(); // Force inventory HUD/UI to update
    }
    
    this.scene.saveNow();
    this.renderPanel();
  }

  handleRecycle() {
    if (this.state.slots.every(s => s.itemId === ITEM_IDS.EMPTY)) {
      this.scene.showMessage('垃圾桶是空的，无需回收');
      return;
    }

    const hasSnapshot = this.state.recoverySnapshot && this.state.recoverySnapshot.some(s => s.itemId !== ITEM_IDS.EMPTY);
    const message = hasSnapshot ? '确定回收吗？旧的找回快照将被覆盖。' : '确定回收当前垃圾桶内的所有物品吗？';

    this.scene.itemConfirm.openGenericConfirm('回收确认', message, () => {
      this.state.recoverySnapshot = this.state.slots.map(s => ({ ...s }));
      this.state.slots.forEach(s => {
        s.itemId = ITEM_IDS.EMPTY;
        s.quantity = 0;
      });
      this.scene.showMessage('已回收，可点击“找回”恢复最后一次回收的内容');
      this.scene.saveNow();
      this.renderPanel();
    });
  }

  handleRetrieve() {
    if (!this.state.recoverySnapshot || this.state.recoverySnapshot.every(s => s.itemId === ITEM_IDS.EMPTY)) {
      this.scene.showMessage('没有可找回的回收物品');
      return;
    }

    if (this.state.slots.some(s => s.itemId !== ITEM_IDS.EMPTY)) {
      this.scene.showMessage('请先清空垃圾桶后再找回');
      return;
    }

    this.state.slots = this.state.recoverySnapshot.map(s => ({ ...s }));
    this.state.recoverySnapshot = null;
    this.scene.showMessage('找回成功');
    this.scene.saveNow();
    this.renderPanel();
  }

  clearForNewDay() {
    this.state.slots.forEach(s => {
      s.itemId = ITEM_IDS.EMPTY;
      s.quantity = 0;
    });
    this.state.recoverySnapshot = null;
  }

  makeIcon(item, x, y, size) {
    if (item.iconKey && this.scene.textures.exists(item.iconKey)) {
      const icon = this.scene.add.image(x, y, item.iconKey);
      icon.setDisplaySize(size, size);
      return icon;
    }
    const fallback = this.scene.add.text(x, y, item.name.slice(0, 1), modalTextStyle(18, '#3b2a1d', true));
    fallback.setOrigin(0.5, 0.5);
    return fallback;
  }

  getSnapshot() {
    return {
      slots: this.state.slots.map(s => ({ ...s })),
      recoverySnapshot: this.state.recoverySnapshot ? this.state.recoverySnapshot.map(s => ({ ...s })) : null
    };
  }

  isOpen() { return !!this.layer; }
  close() { 
    this.layer?.destroy(); 
    this.layer = null; 
  }
}
