import Phaser from 'phaser';
import { ITEM_IDS, ITEMS } from './items';
import { openContainerModal } from './ContainerUi';

const TRASH_ROWS = 3;
const TRASH_COLS = 3;
const TRASH_SIZE = TRASH_ROWS * TRASH_COLS;

export default class TrashCanSystem {
  constructor(scene, savedTrash = {}) {
    this.scene = scene;
    this.state = this.normalizeTrash(savedTrash);
    this.ui = null;
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
    if (this.ui) return;

    this.ui = openContainerModal(this.scene, {
      title: '垃圾箱',
      containerType: 'trash',
      containerSlots: this.state.slots,
      containerCols: TRASH_COLS,
      containerRows: TRASH_ROWS,
      onUpdate: () => {
        this.scene.saveNow();
      },
      onClose: () => {
        this.ui = null;
      },
      extraButtons: [
        {
          label: '回收',
          color: 0x3f8c55,
          onClick: () => this.handleRecycle()
        },
        {
          label: '找回',
          color: 0x4a90e2,
          onClick: () => this.handleRetrieve()
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

  handleRecycle() {
    const hasItems = this.state.slots.some(s => s.itemId !== ITEM_IDS.EMPTY);
    if (!hasItems) {
      this.scene.showMessage('垃圾桶是空的');
      return;
    }

    // Snapshot for potential retrieval
    this.state.recoverySnapshot = this.state.slots.map(s => ({ ...s }));
    
    // Clear slots
    this.state.slots.forEach(s => {
      s.itemId = ITEM_IDS.EMPTY;
      s.quantity = 0;
    });

    this.scene.showMessage('垃圾已回收');
    this.scene.saveNow();
    if (this.ui) this.ui.render(); // 刷新 UI
  }

  handleRetrieve() {
    if (!this.state.recoverySnapshot) {
      this.scene.showMessage('没有可找回的垃圾');
      return;
    }

    // Merge snapshot back to slots or inventory
    // Simple implementation: try to put back into trash slots
    let recoveredCount = 0;
    this.state.recoverySnapshot.forEach(savedSlot => {
      if (savedSlot.itemId === ITEM_IDS.EMPTY) return;
      
      // Try to find empty slot in current trash
      const emptySlot = this.state.slots.find(s => s.itemId === ITEM_IDS.EMPTY);
      if (emptySlot) {
        emptySlot.itemId = savedSlot.itemId;
        emptySlot.quantity = savedSlot.quantity;
        recoveredCount++;
      }
    });

    if (recoveredCount > 0) {
      this.state.recoverySnapshot = null;
      this.scene.showMessage('已找回部分垃圾');
      this.scene.saveNow();
      if (this.ui) this.ui.render(); // 刷新 UI
    } else {
      this.scene.showMessage('垃圾桶已满，无法找回');
    }
  }

  clearForNewDay() {
    // Each day, the recovery snapshot is gone (worker took it away)
    this.state.recoverySnapshot = null;
  }

  getSnapshot() {
    return {
      slots: this.state.slots,
      recoverySnapshot: this.state.recoverySnapshot
    };
  }

  isOpen() { return !!this.ui; }
}
