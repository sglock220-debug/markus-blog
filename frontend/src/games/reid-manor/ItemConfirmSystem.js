import { ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

export default class ItemConfirmSystem {
  constructor(scene) {
    this.scene = scene;
    this.layer = null;
    this.action = null;
    this.pendingItem = null;
  }

  openRadishConfirm() {
    if (!this.scene.inventory.hasItem(ITEM_IDS.RADISH, 1)) {
      this.scene.showMessage('没有萝卜');
      return;
    }

    this.close();
    this.action = 'eatRadish';
    const width = 390;
    const height = 190;
    const shell = createModalShell(this.scene, {
      width,
      height,
      depth: 108,
      onClose: () => this.close()
    });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'itemConfirm', close: () => this.close() });

    const title = this.scene.add.text(x + 24, y + 22, '食用萝卜', modalTextStyle(21, '#2d281f', true));
    const message = this.scene.add.text(x + 24, y + 67, '是否食用 1 个萝卜？', modalTextStyle(15, '#5d4b35'));
    const cancel = makeModalButton(this.scene, {
      x: x + 178,
      y: y + 128,
      width: 86,
      label: '取消',
      onClick: () => this.close(),
      color: 0x8a7d6a
    });
    const confirm = makeModalButton(this.scene, {
      x: x + 276,
      y: y + 128,
      width: 86,
      label: '确认',
      onClick: () => this.confirm(),
      color: 0x3f8c55
    });
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, message, ...cancel, ...confirm, ...close]);
  }

  openSleepConfirm() {
    this.close();
    this.action = 'sleep';
    const width = 390;
    const height = 190;
    const shell = createModalShell(this.scene, { width, height, depth: 108, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'itemConfirm', close: () => this.close() });
    const title = this.scene.add.text(x + 24, y + 22, '休息到明天', modalTextStyle(21, '#2d281f', true));
    const message = this.scene.add.text(x + 24, y + 67, '是否睡觉并进入下一天早上 06:00？', modalTextStyle(15, '#5d4b35'));
    const cancel = makeModalButton(this.scene, { x: x + 178, y: y + 128, width: 86, label: '取消', onClick: () => this.close(), color: 0x8a7d6a });
    const confirm = makeModalButton(this.scene, { x: x + 276, y: y + 128, width: 86, label: '睡觉', onClick: () => this.confirm(), color: 0x3f8c55 });
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, message, ...cancel, ...confirm, ...close]);
  }

  openDiscardConfirm(item) {
    if (!item || item.type === 'empty' || item.type === 'tool' || !this.scene.inventory.hasItem(item.id, 1)) {
      this.scene.showMessage('当前物品不能丢弃');
      return;
    }
    this.close();
    this.action = 'discard';
    this.pendingItem = item;
    const width = 420;
    const height = 190;
    const shell = createModalShell(this.scene, { width, height, depth: 108, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'itemConfirm', close: () => this.close() });
    const title = this.scene.add.text(x + 24, y + 22, '丢弃物品', modalTextStyle(21, '#2d281f', true));
    const message = this.scene.add.text(x + 24, y + 67, `是否丢弃 1 个${item.name}？`, modalTextStyle(15, '#5d4b35'));
    const cancel = makeModalButton(this.scene, { x: x + 208, y: y + 128, width: 86, label: '取消', onClick: () => this.close(), color: 0x8a7d6a });
    const confirm = makeModalButton(this.scene, { x: x + 306, y: y + 128, width: 86, label: '丢弃', onClick: () => this.confirm(), color: 0xc64e43 });
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, message, ...cancel, ...confirm, ...close]);
  }

  openDiscardQuantityConfirm(slot, onConfirm) {
    const item = ITEMS[slot.itemId];
    if (!item) return;

    this.close();
    this.action = 'discardQuantity';
    this.pendingItem = item;
    this.pendingQuantity = 1;
    this.maxQuantity = slot.quantity;
    this.onConfirmCallback = onConfirm;

    const width = 420;
    const height = 240;
    const shell = createModalShell(this.scene, { width, height, depth: 108, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'itemConfirm', close: () => this.close() });

    const title = this.scene.add.text(x + 24, y + 22, '丢弃数量', modalTextStyle(21, '#2d281f', true));
    const message = this.scene.add.text(x + 24, y + 67, `丢弃多少个${item.name}？`, modalTextStyle(15, '#5d4b35'));
    
    const qtyText = this.scene.add.text(x + width / 2, y + 110, `数量：${this.pendingQuantity}`, modalTextStyle(18, '#3b2a1d', true));
    qtyText.setOrigin(0.5, 0.5);

    const btnStyle = { width: 40, height: 32, fontSize: 14, color: 0x8a5a35 };
    const minus10 = makeModalButton(this.scene, { x: x + 60, y: y + 135, ...btnStyle, label: '-10', onClick: () => this.adjustQty(-10, qtyText) });
    const minus1 = makeModalButton(this.scene, { x: x + 110, y: y + 135, ...btnStyle, label: '-1', onClick: () => this.adjustQty(-1, qtyText) });
    const plus1 = makeModalButton(this.scene, { x: x + 270, y: y + 135, ...btnStyle, label: '+1', onClick: () => this.adjustQty(1, qtyText) });
    const plus10 = makeModalButton(this.scene, { x: x + 320, y: y + 135, ...btnStyle, label: '+10', onClick: () => this.adjustQty(10, qtyText) });
    const all = makeModalButton(this.scene, { x: x + 190, y: y + 135, width: 60, height: 32, label: '全部', onClick: () => { this.pendingQuantity = this.maxQuantity; qtyText.setText(`数量：${this.pendingQuantity}`); }, color: 0x8a5a35 });

    const cancel = makeModalButton(this.scene, { x: x + 208, y: y + 185, width: 86, label: '取消', onClick: () => this.close(), color: 0x8a7d6a });
    const confirm = makeModalButton(this.scene, { x: x + 306, y: y + 185, width: 86, label: '确认', onClick: () => this.confirm(), color: 0xc64e43 });
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    
    layer.add([title, message, qtyText, ...minus10, ...minus1, ...plus1, ...plus10, ...all, ...cancel, ...confirm, ...close]);
  }

  adjustQty(delta, textObj) {
    this.pendingQuantity = Math.max(1, Math.min(this.maxQuantity, this.pendingQuantity + delta));
    textObj.setText(`数量：${this.pendingQuantity}`);
  }

  openGenericConfirm(titleStr, messageStr, onConfirm) {
    this.close();
    this.action = 'generic';
    this.onConfirmCallback = onConfirm;
    const width = 420;
    const height = 190;
    const shell = createModalShell(this.scene, { width, height, depth: 108, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'itemConfirm', close: () => this.close() });
    const title = this.scene.add.text(x + 24, y + 22, titleStr, modalTextStyle(21, '#2d281f', true));
    const message = this.scene.add.text(x + 24, y + 67, messageStr, { ...modalTextStyle(15, '#5d4b35'), wordWrap: { width: width - 48 } });
    const cancel = makeModalButton(this.scene, { x: x + 208, y: y + 128, width: 86, label: '取消', onClick: () => this.close(), color: 0x8a7d6a });
    const confirm = makeModalButton(this.scene, { x: x + 306, y: y + 128, width: 86, label: '确认', onClick: () => this.confirm(), color: 0x3f8c55 });
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, message, ...cancel, ...confirm, ...close]);
  }

  confirm() {
    if (this.action === 'generic') {
      const callback = this.onConfirmCallback;
      this.close();
      callback?.();
      return;
    }
    if (this.action === 'discardQuantity') {
      const qty = this.pendingQuantity;
      const callback = this.onConfirmCallback;
      this.close();
      callback?.(qty);
      return;
    }
    if (this.action === 'sleep') {
      this.close();
      this.scene.sleepNow();
      return;
    }
    if (this.action === 'discard') {
      const item = this.pendingItem;
      const removed = item && this.scene.inventory.removeItem(item.id, 1);
      this.close();
      this.scene.showMessage(removed ? `已丢弃 1 个${item.name}` : '物品已不存在');
      if (removed) this.scene.saveNow();
      return;
    }
    if (this.action !== 'eatRadish') return;
    if (!this.scene.inventory.removeItem(ITEM_IDS.RADISH, 1)) {
      this.scene.showMessage('没有萝卜');
      this.close();
      return;
    }
    const result = this.scene.status.consume('eatRadish');
    this.close();
    this.scene.showMessage(result.message);
    this.scene.saveNow();
  }

  isOpen() {
    return Boolean(this.layer);
  }

  close() {
    this.scene.popModal('itemConfirm');
    this.layer?.destroy();
    this.layer = null;
    this.action = null;
    this.pendingItem = null;
  }

  destroy() {
    this.close();
  }
}
