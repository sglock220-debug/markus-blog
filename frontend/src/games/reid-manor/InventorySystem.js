import { INITIAL_GOLD, INITIAL_HOTBAR, ITEM_IDS, ITEMS } from './items';

const SLOT_SIZE = 76;
const SLOT_GAP = 10;

export default class InventorySystem {
  constructor(scene, savedInventory = {}) {
    this.scene = scene;
    this.slots = this.normalizeSlots(savedInventory.slots);
    this.gold = this.normalizeGold(savedInventory);
    this.selectedIndex = Number.isFinite(savedInventory.selectedIndex)
      ? Math.max(0, Math.min(this.slots.length - 1, savedInventory.selectedIndex))
      : 0;
    this.graphics = scene.add.graphics();
    this.labels = [];
    this.nameText = scene.add.text(0, 0, '', this.textStyle(13, '#fff7df'));
    this.nameText.setOrigin(0.5, 0);
    this.goldText = scene.add.text(14, 14, '', this.textStyle(14, '#fff7df'));
    this.timeText = scene.add.text(0, 14, '', this.textStyle(14, '#fff7df'));
    this.timeText.setOrigin(1, 0);
    this.panelLayer = null;

    [this.graphics, this.nameText, this.goldText, this.timeText].forEach((item) => {
      item.setScrollFactor(0);
      item.setDepth(40);
    });

    this.render();
  }

  select(index) {
    if (index < 0 || index >= this.slots.length) return;
    this.selectedIndex = index;
    this.render();
  }

  getSelectedSlot() {
    return this.slots[this.selectedIndex];
  }

  getSelectedItem() {
    const slot = this.getSelectedSlot();
    return slot ? ITEMS[slot.itemId] : null;
  }

  hasItem(itemId, quantity = 1) {
    return this.getQuantity(itemId) >= quantity;
  }

  getQuantity(itemId) {
    if (itemId === ITEM_IDS.COIN) return this.gold;

    const slot = this.slots.find((entry) => entry.itemId === itemId);
    return slot?.quantity || 0;
  }

  addItem(itemId, quantity = 1) {
    if (itemId === ITEM_IDS.COIN) {
      this.gold += quantity;
      this.render();
      return true;
    }

    const slot = this.slots.find((entry) => entry.itemId === itemId);
    if (!slot) return false;

    slot.quantity += quantity;
    this.render();
    return true;
  }

  removeItem(itemId, quantity = 1) {
    if (itemId === ITEM_IDS.COIN) {
      if (this.gold < quantity) return false;
      this.gold -= quantity;
      this.render();
      return true;
    }

    const slot = this.slots.find((entry) => entry.itemId === itemId);
    if (!slot || slot.quantity < quantity) return false;

    slot.quantity -= quantity;
    this.render();
    return true;
  }

  updateTime(displayTime) {
    this.timeText.setText(displayTime);
    this.timeText.setPosition(this.scene.scale.width - 14, 14);
  }

  updateHud({ day, weekday, time, weather, gold }) {
    this.goldText.setText(`第 ${day} 天 · ${weekday} · ${time} · ${weather} · 金币 ${gold}`);
    this.timeText.setText('');
  }

  getSnapshot() {
    return {
      slots: this.slots.map((slot) => ({ ...slot })),
      gold: this.gold,
      selectedIndex: this.selectedIndex
    };
  }

  togglePanel() {
    if (this.panelLayer) {
      this.closePanel();
      return;
    }

    this.openPanel();
  }

  openPanel() {
    this.closePanel();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(85);
    layer.setScrollFactor(0);
    this.panelLayer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.38);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.closePanel());

    const width = 520;
    const height = 250;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.97);
    panel.fillRoundedRect(x, y, width, height, 10);
    panel.lineStyle(2, 0xeeeeee, 1);
    panel.strokeRoundedRect(x, y, width, height, 10);

    const title = this.scene.add.text(x + 24, y + 18, '背包与快捷栏', this.textStyle(21, '#333333'));
    const hint = this.scene.add.text(x + 24, y + height - 32, '点击物品格可选中，点击空白处或按 ESC 关闭', this.textStyle(13, '#4a90e2'));
    layer.add([overlay, panel, title, hint]);

    this.slots.forEach((slot, index) => {
      const item = ITEMS[slot.itemId];
      const slotX = x + 24 + index * 86;
      const slotY = y + 74;
      const selected = index === this.selectedIndex;
      const bg = this.scene.add.rectangle(slotX, slotY, 72, 76, selected ? 0xffe08a : 0xf7e6b9, 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(selected ? 4 : 2, selected ? 0x4a90e2 : 0x6c5b42, 1);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        this.select(index);
        this.scene.saveNow?.();
        this.closePanel();
      });
      const icon = this.makeIcon(item, slotX + 36, slotY + 25, 28);
      const qty = this.scene.add.text(slotX + 36, slotY + 44, item.type === 'tool' ? '∞' : `${slot.quantity}`, this.textStyle(13, '#2d281f'));
      qty.setOrigin(0.5, 0);
      const name = this.scene.add.text(slotX + 36, slotY + 92, item.name, this.textStyle(12, '#333333'));
      name.setOrigin(0.5, 0);
      layer.add([bg, icon, qty, name]);
    });
  }

  isPanelOpen() {
    return Boolean(this.panelLayer);
  }

  closePanel() {
    this.panelLayer?.destroy();
    this.panelLayer = null;
  }

  render() {
    this.graphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];

    const totalWidth = this.slots.length * SLOT_SIZE + (this.slots.length - 1) * SLOT_GAP;
    const startX = (this.scene.scale.width - totalWidth) / 2;
    const y = this.scene.scale.height - SLOT_SIZE - 34;

    this.graphics.fillStyle(0x2d281f, 0.74);
    this.graphics.fillRoundedRect(startX - 12, y - 10, totalWidth + 24, SLOT_SIZE + 44, 10);

    this.slots.forEach((slot, index) => {
      const x = startX + index * (SLOT_SIZE + SLOT_GAP);
      const item = ITEMS[slot.itemId];
      const isSelected = index === this.selectedIndex;

      this.graphics.fillStyle(isSelected ? 0xffe08a : 0xf7e6b9, isSelected ? 1 : 0.88);
      this.graphics.fillRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 8);
      this.graphics.lineStyle(isSelected ? 4 : 2, isSelected ? 0x4a90e2 : 0x6c5b42, 1);
      this.graphics.strokeRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 8);

      const numberLabel = this.makeLabel(`${index + 1}`, x + 6, y + 5, 11, '#2d281f');
      const iconLabel = this.makeIcon(item, x + SLOT_SIZE / 2, y + 25, 28);
      const nameLabel = this.makeLabel(item.name, x + SLOT_SIZE / 2, y + 50, 11, '#2d281f');
      nameLabel.setOrigin(0.5, 0);

      const quantityText = item.type === 'tool' || item.type === 'container' ? '∞' : `${slot.quantity}`;
      const quantityLabel = this.makeLabel(quantityText, x + SLOT_SIZE - 7, y + SLOT_SIZE - 18, 12, '#2d281f');
      quantityLabel.setOrigin(1, 0);

      this.labels.push(numberLabel, iconLabel, nameLabel, quantityLabel);
    });

    const selectedItem = this.getSelectedItem();
    this.nameText.setText(selectedItem ? selectedItem.name : '');
    this.nameText.setPosition(this.scene.scale.width / 2, y + SLOT_SIZE + 8);
    this.goldText.setText(`金币 ${this.getQuantity('coin')}`);
    this.timeText.setPosition(this.scene.scale.width - 14, 14);
  }

  destroy() {
    this.closePanel();
    this.graphics.destroy();
    this.labels.forEach((label) => label.destroy());
    this.nameText.destroy();
    this.goldText.destroy();
    this.timeText.destroy();
  }

  makeLabel(text, x, y, size, color) {
    const label = this.scene.add.text(x, y, text, this.textStyle(size, color));
    label.setDepth(41);
    label.setScrollFactor(0);
    return label;
  }

  makeIcon(item, x, y, size) {
    if (item.iconKey && this.scene.textures.exists(item.iconKey)) {
      const icon = this.scene.add.image(x, y, item.iconKey);
      icon.setDisplaySize(size, size);
      icon.setDepth(41);
      icon.setScrollFactor(0);
      return icon;
    }

    const label = this.makeLabel(item.name.slice(0, 1), x, y - size / 2, size * 0.7, '#2d281f');
    label.setOrigin(0.5, 0);
    return label;
  }

  textStyle(size, color) {
    return {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: `${size}px`,
      color,
      fontStyle: 'bold'
    };
  }

  normalizeSlots(savedSlots) {
    const defaults = INITIAL_HOTBAR.map((slot) => ({ ...slot }));
    if (!Array.isArray(savedSlots)) return defaults;

    return defaults.map((defaultSlot) => {
      const saved = savedSlots.find((slot) => slot?.itemId === defaultSlot.itemId);
      if (!saved || !Number.isFinite(saved.quantity)) {
        return defaultSlot;
      }

      return {
        itemId: saved.itemId,
        quantity: Math.max(0, saved.quantity)
      };
    });
  }

  normalizeGold(savedInventory) {
    if (Number.isFinite(savedInventory.gold)) {
      return Math.max(0, savedInventory.gold);
    }

    const oldCoinSlot = Array.isArray(savedInventory.slots)
      ? savedInventory.slots.find((slot) => slot?.itemId === ITEM_IDS.COIN)
      : null;
    return Number.isFinite(oldCoinSlot?.quantity) ? Math.max(0, oldCoinSlot.quantity) : INITIAL_GOLD;
  }
}
