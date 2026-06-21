import { INITIAL_GOLD, INITIAL_HOTBAR, ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton } from './ModalUi';
import { handleRightClickSplit } from './ContainerUi';

const SLOT_SIZE = 58;
const SLOT_GAP = 4;
const HOTBAR_SIZE = 10;
const INVENTORY_SIZE = 30;
const CORE_SLOT_IDS = new Set(INITIAL_HOTBAR.map((slot) => slot.itemId));

export default class InventorySystem {
  constructor(scene, savedInventory = {}) {
    this.scene = scene;
    this.slots = this.normalizeSlots(savedInventory.slots);
    this.gold = this.normalizeGold(savedInventory);
    this.toolState = this.normalizeToolState(savedInventory.toolState);
    this.selectedIndex = Number.isFinite(savedInventory.selectedIndex)
      ? Math.max(0, Math.min(HOTBAR_SIZE - 1, savedInventory.selectedIndex))
      : 0;
    this.panelSelectedIndex = this.selectedIndex;
    this.lastPanelClick = { index: -1, at: 0 };
    this.draggingSlotIndex = -1;
    this.draggingIcon = null;
    this.pickedItem = null; // New: picked item for double-click move
    this.equipment = this.normalizeEquipment(savedInventory.equipment);
    
    // Drag state
    this.dragCandidateIndex = -1;
    this.dragStartPos = { x: 0, y: 0 };
    this.isDragging = false;
    this.draggingIcon = null;
    this.pointerMoveHandler = null;
    this.pointerUpHandler = null;

    this.graphics = scene.add.graphics();
    this.labels = [];
    this.hitAreas = [];
    this.nameText = scene.add.text(0, 0, '', this.textStyle(13, '#fff7df'));
    this.nameText.setOrigin(0.5, 1);
    this.goldText = scene.add.text(18, 17, '', this.textStyle(15, '#fff7df'));
    this.timeText = scene.add.text(48, 43, '', this.textStyle(13, '#fff7df'));
    this.coinText = scene.add.text(132, 43, '', this.textStyle(13, '#fff7df'));
    this.hudState = null;
    this.panelLayer = null;

    [this.graphics, this.nameText, this.goldText, this.timeText, this.coinText].forEach((item) => {
      item.setScrollFactor(0);
      item.setDepth(40);
    });

    this.render();
  }

  normalizeSlot(slot) {
    if (!slot) return { itemId: ITEM_IDS.EMPTY, quantity: 0 };
    if (!Number.isFinite(slot.quantity) || slot.quantity <= 0 || slot.itemId === ITEM_IDS.EMPTY) {
      slot.itemId = ITEM_IDS.EMPTY;
      slot.quantity = 0;
      if (slot.fuel !== undefined) slot.fuel = 0;
    }
    return slot;
  }

  normalizeAllSlots() {
    this.slots.forEach((slot) => this.normalizeSlot(slot));
  }

  select(index) {
    if (index < 0 || index >= HOTBAR_SIZE) return;
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
    return this.slots
      .filter((entry) => entry.itemId === itemId)
      .reduce((total, entry) => total + (entry.quantity || 0), 0);
  }

  addItem(itemId, quantity = 1) {
    if (itemId === ITEM_IDS.COIN) {
      this.gold += quantity;
      this.render();
      return true;
    }

    // 燃油桶逻辑：每个桶是独立的容器
    if (itemId === ITEM_IDS.FUEL_CAN) {
      for (let i = 0; i < quantity; i++) {
        const slot = this.slots.find((entry) => entry.itemId === ITEM_IDS.EMPTY);
        if (!slot) return i > 0; // 如果中途满了，返回是否成功添加了至少一个
        slot.itemId = ITEM_IDS.FUEL_CAN;
        slot.quantity = 1;
        slot.fuel = 20; // 满油状态
      }
      this.render();
      return true;
    }

    let slot = this.slots.find((entry) => entry.itemId === itemId);
    if (!slot) {
      slot = this.slots.find((entry) => entry.itemId === ITEM_IDS.EMPTY);
      if (!slot) return false;
      slot.itemId = itemId;
      slot.quantity = 0;
    }

    slot.quantity += quantity;
    this.normalizeAllSlots();
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

    if (this.getQuantity(itemId) < quantity) return false;
    let remaining = quantity;
    this.slots.forEach((slot, index) => {
      if (remaining <= 0 || slot.itemId !== itemId) return;
      const removed = Math.min(slot.quantity, remaining);
      slot.quantity -= removed;
      remaining -= removed;
      this.normalizeSlot(slot);
    });
    this.normalizeAllSlots();
    this.render();
    return true;
  }

  updateTime(displayTime) {
    this.timeText.setText(displayTime);
  }

  updateHud(hudState) {
    const nextKey = JSON.stringify(hudState);
    if (nextKey === this.hudRenderKey) return;
    this.hudRenderKey = nextKey;
    this.hudState = hudState;
    const { year, season, seasonDay, weekday, time, weather, gold } = hudState;
    this.goldText.setText(`第 ${year} 年 · ${season} · 第 ${seasonDay} 日 · ${weekday} · ${time}`);
    this.timeText.setText(weather);
    this.coinText.setText(`${gold}`);
    this.render();
  }

  getSnapshot() {
    return {
      slots: this.slots.map((slot) => ({ ...slot })),
      gold: this.gold,
      selectedIndex: this.selectedIndex,
      equipment: { ...this.equipment },
      toolState: {
        wateringCan: { ...this.toolState.wateringCan }
      }
    };
  }

  getWateringCanState() {
    return { ...this.toolState.wateringCan };
  }

  consumeWater(amount = 1) {
    const state = this.toolState.wateringCan;
    if (state.currentWater < amount) return false;
    state.currentWater -= amount;
    this.render();
    return true;
  }

  refillWateringCan() {
    const state = this.toolState.wateringCan;
    const changed = state.currentWater !== state.maxWater;
    state.currentWater = state.maxWater;
    this.render();
    return changed;
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
    const width = 840;
    const height = 460;
    const shell = createModalShell(this.scene, {
      width,
      height,
      depth: 85,
      panelColor: 0xf4d89b,
      borderColor: 0x6e4526,
      onClose: () => this.closePanel()
    });
    const { layer, x, y } = shell;
    this.panelLayer = layer;
    this.scene.pushModal({ id: 'inventory', close: () => this.closePanel() });

    this.scene.input.mouse.disableContextMenu();

    const header = this.scene.add.rectangle(x + 16, y + 14, width - 32, 48, 0x9b6033, 1);
    header.setOrigin(0, 0);
    header.setScrollFactor(0);
    const title = this.scene.add.text(x + 32, y + 25, '庄园背包', this.textStyle(22, '#fff7df'));
    title.setScrollFactor(0);
    const tabs = ['物品', '技能', '关系', '地图'];
    const tabObjects = [];
    tabs.forEach((tab, index) => {
      const tabX = x + 178 + index * 82;
      const bg = this.scene.add.rectangle(tabX, y + 22, 72, 32, index === 0 ? 0xffe08a : 0xc98c55, 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(2, 0x6e4526, 1);
      bg.setScrollFactor(0);
      const text = this.scene.add.text(tabX + 36, y + 38, tab, this.textStyle(13, '#3b2a1d'));
      text.setOrigin(0.5, 0.5);
      text.setScrollFactor(0);
      tabObjects.push(bg, text);
    });

    const gridBg = this.scene.add.rectangle(x + 22, y + 78, 590, 214, 0xfbe9bb, 1);
    gridBg.setOrigin(0, 0);
    gridBg.setStrokeStyle(2, 0x8a5a35, 1);
    gridBg.setScrollFactor(0);
    const detailBg = this.scene.add.rectangle(x + 22, y + 304, 590, 132, 0xe8bd78, 1);
    detailBg.setOrigin(0, 0);
    detailBg.setStrokeStyle(2, 0x8a5a35, 1);
    detailBg.setScrollFactor(0);
    const infoBg = this.scene.add.rectangle(x + 626, y + 78, 192, 358, 0xe8bd78, 1);
    infoBg.setOrigin(0, 0);
    infoBg.setStrokeStyle(2, 0x8a5a35, 1);
    infoBg.setScrollFactor(0);
    const close = makeCloseButton(this.scene, x + width - 52, y + 22, () => this.closePanel());
    close.forEach(obj => obj.setScrollFactor(0));
    layer.add([header, title, ...tabObjects, gridBg, detailBg, infoBg, ...close]);

    // Setup global drag listeners once per panel open
    this.setupPanelDragListeners(x, y);

    this.normalizeAllSlots();

    this.slots.forEach((slot, index) => {
      const isEmpty = slot.itemId === ITEM_IDS.EMPTY || slot.quantity <= 0;
      const column = index % 10;
      const row = Math.floor(index / 10);
      const slotX = x + 34 + column * 57;
      const slotY = y + 92 + row * 64;
      const isSelected = index === this.panelSelectedIndex;
      const isPicked = index === this.pickedItem;
      const bg = this.scene.add.rectangle(slotX, slotY, 50, 54, isSelected ? 0xffdf83 : (isPicked ? 0x90ee90 : 0xf7e6b9), 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(isSelected || isPicked ? 4 : 2, isSelected ? 0x3f78bd : (isPicked ? 0x2d5a27 : 0x6c5b42), 1);
      bg.setInteractive({ useHandCursor: true });
      bg.setScrollFactor(0);

      bg.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        
        // Right click split
        if (pointer.rightButtonDown() && !isEmpty) {
          handleRightClickSplit(this.scene, 'backpack', index, slot, this.slots, () => this.openPanel());
          return;
        }

        // Start drag detection
        if (!isEmpty) {
          this.dragCandidateIndex = index;
          this.dragStartPos = { x: pointer.x, y: pointer.y };
          this.isDragging = false;
        }
      });

      layer.add(bg);

      if (!isEmpty) {
        const item = ITEMS[slot.itemId];
        const icon = this.makeIcon(item, slotX + 25, slotY + 25, 25);
        const quantityText = this.getSlotQuantityText(slot, item);
        const qty = this.scene.add.text(slotX + 46, slotY + 37, quantityText, this.textStyle(10, '#2d281f'));
        qty.setOrigin(1, 0);
        qty.setScrollFactor(0);
        layer.add([icon, qty]);
      }

      const numberText = index < HOTBAR_SIZE ? (index === 9 ? '0' : `${index + 1}`) : '';
      const number = this.scene.add.text(slotX + 4, slotY + 3, numberText, this.textStyle(9, '#6c5b42'));
      number.setScrollFactor(0);
      layer.add(number);
    });

    const characterFrame = this.scene.add.graphics();
    characterFrame.fillStyle(0x75b5d8, 1);
    characterFrame.fillRoundedRect(x + 650, y + 96, 144, 104, 6);
    characterFrame.fillStyle(0x7fbd61, 1);
    characterFrame.fillRect(x + 650, y + 170, 144, 30);
    characterFrame.fillStyle(0x2d281f, 1);
    characterFrame.fillRect(x + 710, y + 124, 24, 44);
    characterFrame.fillStyle(0xf0bd8b, 1);
    characterFrame.fillCircle(x + 722, y + 116, 12);

    const characterName = this.scene.add.text(x + 722, y + 208, this.scene.saveData.character?.name || '旅行者', this.textStyle(15, '#3b2a1d'));
    characterName.setOrigin(0.5, 0);
    characterName.setScrollFactor(0);
    const selectedSlot = this.slots[this.panelSelectedIndex] || this.getSelectedSlot();
    const selectedItem = ITEMS[selectedSlot?.itemId] || ITEMS[ITEM_IDS.EMPTY];
    const selectedInfo = this.scene.add.text(x + 42, y + 322, `选中：${selectedItem.name}  数量：${this.getSlotQuantityText(selectedSlot, selectedItem) || 0}`, this.textStyle(14, '#3b2a1d'));
    selectedInfo.setScrollFactor(0);
    const goldText = this.scene.add.text(x + 42, y + 352, `金币：${this.gold}`, this.textStyle(14, '#7a4a1f'));
    goldText.setScrollFactor(0);
    const date = this.scene.add.text(
      x + 248,
      y + 350,
      `第 ${this.scene.gameTime.getYear()} 年 · ${this.scene.gameTime.getSeason()} · 第 ${this.scene.gameTime.getSeasonDay()} 日 · ${this.scene.gameTime.getDisplayTime()}`,
      { ...this.textStyle(13, '#3b2a1d'), lineSpacing: 6 }
    );
    date.setScrollFactor(0);
    const water = this.toolState.wateringCan;
    const wateringInfo = this.scene.add.text(x + 42, y + 390, `水壶：${water.currentWater}/${water.maxWater}`, this.textStyle(13, '#2f6687'));
    wateringInfo.setScrollFactor(0);
    const moveHint = this.scene.add.text(x + 248, y + 390, '双击仓库物品：换入当前快捷栏', this.textStyle(12, '#6e4526'));
    moveHint.setScrollFactor(0);

    const equipmentTitle = this.scene.add.text(x + 650, y + 242, '装备', this.textStyle(14, '#3b2a1d'));
    equipmentTitle.setScrollFactor(0);
    const equipmentSlots = [
      { id: 'hat', label: '帽' },
      { id: 'top', label: '衣' },
      { id: 'pants', label: '裤' },
      { id: 'shoes', label: '鞋' },
      { id: 'ring', label: '饰' },
      { id: 'tool', label: '具' }
    ];

    equipmentSlots.forEach((slotInfo, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const slotX = x + 650 + column * 48;
      const slotY = y + 270 + row * 54;

      const equippedId = this.equipment[slotInfo.id];
      const bg = this.scene.add.rectangle(slotX, slotY, 42, 46, 0xd7a86c, 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(2, 0x6e4526, 1);
      bg.setScrollFactor(0);
      
      if (equippedId) {
        const item = ITEMS[equippedId];
        const icon = this.makeIcon(item, slotX + 21, slotY + 23, 25);
        icon.setScrollFactor(0);
        layer.add([bg, icon]);
        
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', (pointer, lx, ly, event) => {
          event.stopPropagation();
          this.unequipItem(slotInfo.id);
        });
      } else {
        const label = this.scene.add.text(slotX + 21, slotY + 23, slotInfo.label, this.textStyle(12, '#5a3c27'));
        label.setOrigin(0.5, 0.5);
        label.setScrollFactor(0);
        layer.add([bg, label]);
      }
    });
    layer.add([characterFrame, characterName, selectedInfo, goldText, date, wateringInfo, moveHint, equipmentTitle]);
  }

  getSlotIndexAt(px, py, modalX, modalY) {
    for (let index = 0; index < this.slots.length; index++) {
      const col = index % 10;
      const row = Math.floor(index / 10);
      const slotX = modalX + 34 + col * 57;
      const slotY = modalY + 92 + row * 64;
      
      // Using actual slot hit area (50x54)
      if (px >= slotX && px <= slotX + 50 &&
          py >= slotY && py <= slotY + 54) {
        return index;
      }
    }
    return -1;
  }

  setupPanelDragListeners(modalX, modalY) {
    // Remove existing handlers if any
    this.removePanelDragListeners();

    this.pointerMoveHandler = (pointer) => {
      if (this.dragCandidateIndex === -1) return;

      if (!this.isDragging) {
        const dist = Phaser.Math.Distance.Between(
          this.dragStartPos.x, this.dragStartPos.y,
          pointer.x, pointer.y
        );

        if (dist > 6) {
          this.isDragging = true;
          const slot = this.slots[this.dragCandidateIndex];
          const item = ITEMS[slot.itemId];
          this.draggingIcon = this.makeIcon(item, pointer.x, pointer.y, 40);
          this.draggingIcon.setDepth(200);
          this.draggingIcon.setScrollFactor(0);
        }
      } else {
        this.draggingIcon.setPosition(pointer.x, pointer.y);
      }
    };

    this.pointerUpHandler = (pointer) => {
      const sourceIndex = this.dragCandidateIndex;
      const isActuallyDragging = this.isDragging;

      // Reset drag state first to avoid recursion issues
      this.dragCandidateIndex = -1;
      this.isDragging = false;
      this.draggingIcon?.destroy();
      this.draggingIcon = null;

      if (sourceIndex === -1) return;

      if (!isActuallyDragging) {
        // Was a simple click/double-click
        this.handlePanelSlotClick(sourceIndex);
      } else {
        // Was a drag release
        const targetIndex = this.getSlotIndexAt(pointer.x, pointer.y, modalX, modalY);
        if (targetIndex !== -1 && targetIndex !== sourceIndex) {
          this.swapSlots(sourceIndex, targetIndex);
        }
        this.openPanel(); // Re-render once
      }
    };

    this.scene.input.on('pointermove', this.pointerMoveHandler);
    this.scene.input.on('pointerup', this.pointerUpHandler);
  }

  removePanelDragListeners() {
    if (this.pointerMoveHandler) {
      this.scene.input.off('pointermove', this.pointerMoveHandler);
      this.pointerMoveHandler = null;
    }
    if (this.pointerUpHandler) {
      this.scene.input.off('pointerup', this.pointerUpHandler);
      this.pointerUpHandler = null;
    }
  }

  swapSlots(indexA, indexB) {
    if (indexA === indexB) return;

    const source = this.slots[indexA];
    const target = this.slots[indexB];

    if (!source || source.itemId === ITEM_IDS.EMPTY) return;

    const sourceItem = ITEMS[source.itemId];

    // 1. 目标是空格：完整移动
    if (target.itemId === ITEM_IDS.EMPTY) {
      this.slots[indexB] = { ...source };
      this.slots[indexA] = { itemId: ITEM_IDS.EMPTY, quantity: 0 };
    } 
    // 2. 同一种物品且不是燃油桶：尝试合并
    else if (source.itemId === target.itemId && source.itemId !== ITEM_IDS.FUEL_CAN) {
      const maxStack = sourceItem?.maxStack ?? 99;
      const space = maxStack - target.quantity;
      
      if (space > 0) {
        const moveAmount = Math.min(source.quantity, space);
        target.quantity += moveAmount;
        source.quantity -= moveAmount;

        if (source.quantity <= 0) {
          this.slots[indexA] = { itemId: ITEM_IDS.EMPTY, quantity: 0 };
        }
      } else {
        this.scene.showMessage('该物品堆叠已满');
        return; // 不发生交换
      }
    } 
    // 3. 不同物品或燃油桶：执行交换
    else {
      const temp = { ...this.slots[indexA] };
      this.slots[indexA] = { ...this.slots[indexB] };
      this.slots[indexB] = temp;
    }

    this.scene.saveNow();
  }

  handlePanelSlotClick(index) {
    const now = performance.now();
    const isDoubleClick = this.lastPanelClick.index === index && now - this.lastPanelClick.at < 300;
    this.lastPanelClick = { index, at: now };

    if (isDoubleClick) {
      const slot = this.slots[index];
      const item = ITEMS[slot.itemId];
      if (item?.type === 'equipment') {
        this.equipItem(index);
        return;
      }
      this.handleSlotDoubleClick(index);
      return;
    }

    if (this.pickedItem !== null) {
      this.swapSlots(this.pickedItem, index);
      this.pickedItem = null;
      this.openPanel();
      return;
    }

    this.panelSelectedIndex = index;
    if (index < HOTBAR_SIZE) {
      this.select(index);
    }
    this.openPanel();
  }

  equipItem(index) {
    const slot = this.slots[index];
    const item = ITEMS[slot.itemId];
    if (!item || item.type !== 'equipment') return;
    
    const targetSlot = item.slot;
    const currentEquippedId = this.equipment[targetSlot];
    
    // Equip new item
    this.equipment[targetSlot] = item.id;
    this.removeItem(item.id, 1);
    
    // Unequip old item back to inventory
    if (currentEquippedId) {
      this.addItem(currentEquippedId, 1);
    }
    
    this.render();
    this.scene.saveNow();
    if (this.panelLayer) this.openPanel();
  }

  equipItemFromId(itemId) {
    const item = ITEMS[itemId];
    if (!item || item.type !== 'equipment') return;
    
    const slotIndex = this.slots.findIndex(s => s.itemId === itemId);
    if (slotIndex !== -1) {
      this.equipItem(slotIndex);
    }
  }

  unequipItem(slotKey) {
    const itemId = this.equipment[slotKey];
    if (!itemId) return;
    if (this.addItem(itemId, 1)) {
      this.equipment[slotKey] = null;
      this.render();
      this.scene.saveNow();
      this.openPanel();
    }
  }

  handleSlotDoubleClick(index) {
    const slot = this.slots[index];
    if (slot.itemId === ITEM_IDS.EMPTY) {
      this.pickedItem = null;
    } else {
      this.pickedItem = index;
    }
    this.openPanel();
  }

  isPanelOpen() {
    return Boolean(this.panelLayer);
  }

  closePanel() {
    this.removePanelDragListeners();
    this.scene.popModal('inventory');
    this.panelLayer?.destroy();
    this.panelLayer = null;
  }

  render() {
    this.normalizeAllSlots();
    this.graphics.clear();
    // Use equipment color or base color
    let bodyColor = 0xffe0bd;
    if (this.equipment.top) {
      const top = ITEMS[this.equipment.top];
      if (top?.color) bodyColor = top.color;
    }
    
    // This is just a conceptual draw, actual player rendering is in ReidManorScene
    // but we can update character properties in saveData
    this.scene.saveData.character = {
      ...this.scene.saveData.character,
      bodyColor: bodyColor,
      equipment: { ...this.equipment }
    };

    this.labels.forEach((label) => label.destroy());
    this.hitAreas.forEach((area) => area.destroy());
    this.labels = [];
    this.hitAreas = [];

    const hotbarSlots = this.slots.slice(0, HOTBAR_SIZE);
    const totalWidth = hotbarSlots.length * SLOT_SIZE + (hotbarSlots.length - 1) * SLOT_GAP;
    const startX = (this.scene.scale.width - totalWidth) / 2;
    const y = this.scene.scale.height - SLOT_SIZE - 12;

    this.graphics.fillStyle(0x2d281f, 0.82);
    this.graphics.fillRoundedRect(startX - 10, y - 8, totalWidth + 20, SLOT_SIZE + 16, 6);

    this.drawTopHud();

    const hudHitArea = this.scene.add.rectangle(10, 10, 425, 62, 0xffffff, 0.001);
    hudHitArea.setOrigin(0, 0);
    hudHitArea.setDepth(42);
    hudHitArea.setScrollFactor(0);
    hudHitArea.setInteractive();
    hudHitArea.on('pointerdown', (p, lx, ly, event) => event.stopPropagation());
    this.hitAreas.push(hudHitArea);

    hotbarSlots.forEach((slot, index) => {
      const x = startX + index * (SLOT_SIZE + SLOT_GAP);
      const isSelected = index === this.selectedIndex;
      const isEmpty = slot.itemId === ITEM_IDS.EMPTY || slot.quantity <= 0;

      this.graphics.fillStyle(isSelected ? 0xffe08a : 0xf7e6b9, isSelected ? 1 : 0.88);
      this.graphics.fillRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 5);
      this.graphics.lineStyle(isSelected ? 4 : 2, isSelected ? 0x4a90e2 : 0x6c5b42, 1);
      this.graphics.strokeRoundedRect(x, y, SLOT_SIZE, SLOT_SIZE, 5);

      const numberLabel = this.makeLabel(index === 9 ? '0' : `${index + 1}`, x + 5, y + 3, 10, '#2d281f');
      this.labels.push(numberLabel);

      if (!isEmpty) {
        const item = ITEMS[slot.itemId];
        const iconLabel = this.makeIcon(item, x + SLOT_SIZE / 2, y + 27, 27);
        const quantityText = this.getSlotQuantityText(slot, item);
        const quantityLabel = this.makeLabel(quantityText, x + SLOT_SIZE - 5, y + SLOT_SIZE - 17, 11, '#2d281f');
        quantityLabel.setOrigin(1, 0);
        this.labels.push(iconLabel, quantityLabel);
      }

      const hitArea = this.scene.add.rectangle(x, y, SLOT_SIZE, SLOT_SIZE, 0xffffff, 0.001);
      hitArea.setOrigin(0, 0);
      hitArea.setDepth(42);
      hitArea.setScrollFactor(0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
        this.select(index);
        this.scene.saveNow?.();
      });

      this.hitAreas.push(hitArea);
    });

    const selectedItem = this.getSelectedItem();
    const selectedSlot = this.getSelectedSlot();
    const selectedQuantity = selectedItem?.id === ITEM_IDS.WATERING_CAN
      ? ` ${this.toolState.wateringCan.currentWater}/${this.toolState.wateringCan.maxWater}`
      : selectedItem?.type === 'tool' || selectedItem?.type === 'empty'
        ? ''
        : ` × ${selectedSlot?.quantity || 0}`;
    this.nameText.setText(selectedItem?.type === 'empty' ? '空位' : `${selectedItem?.name || ''}${selectedQuantity}`);
    this.nameText.setPosition(this.scene.scale.width / 2, y - 10);

    if (selectedItem?.id === ITEM_IDS.WATERING_CAN) {
      this.drawWateringCanMeter(startX + totalWidth + 18, y + 4);
    }
  }

  destroy() {
    this.closePanel();
    this.graphics.destroy();
    this.labels.forEach((label) => label.destroy());
    this.hitAreas.forEach((area) => area.destroy());
    this.nameText.destroy();
    this.goldText.destroy();
    this.timeText.destroy();
    this.coinText.destroy();
  }

  makeLabel(text, x, y, size, color) {
    const label = this.scene.add.text(x, y, text, this.textStyle(size, color));
    label.setDepth(41);
    label.setScrollFactor(0);
    return label;
  }

  makeIcon(item, x, y, size) {
    let icon;
    if (item?.iconKey && this.scene.textures.exists(item.iconKey)) {
      icon = this.scene.add.image(x, y, item.iconKey);
      icon.setDisplaySize(size, size);
    } else {
      icon = this.scene.add.text(x, y, item?.name?.slice(0, 1) || '?', this.textStyle(Math.floor(size * 0.6), '#2d281f'));
      icon.setOrigin(0.5, 0.5);
    }
    icon.setDepth(41);
    icon.setScrollFactor(0);
    return icon;
  }

  drawTopHud() {
    this.graphics.fillStyle(0x263522, 0.78);
    this.graphics.fillRoundedRect(10, 10, 425, 62, 6);
    this.graphics.lineStyle(2, 0xe8d6a2, 0.72);
    this.graphics.strokeRoundedRect(10, 10, 425, 62, 6);

    const weather = this.hudState?.weatherKey;
    const iconX = 30;
    const iconY = 52;
    if (weather === 'rainy') {
      this.graphics.fillStyle(0xb9d7e8, 1);
      this.graphics.fillCircle(iconX - 5, iconY - 4, 6);
      this.graphics.fillCircle(iconX + 3, iconY - 6, 8);
      this.graphics.fillRect(iconX - 10, iconY - 5, 22, 8);
      this.graphics.lineStyle(2, 0x61a8d7, 1);
      this.graphics.lineBetween(iconX - 6, iconY + 6, iconX - 9, iconY + 12);
      this.graphics.lineBetween(iconX + 2, iconY + 6, iconX - 1, iconY + 12);
    } else if (weather === 'cloudy') {
      this.graphics.fillStyle(0xd9e1df, 1);
      this.graphics.fillCircle(iconX - 5, iconY, 6);
      this.graphics.fillCircle(iconX + 3, iconY - 3, 8);
      this.graphics.fillRect(iconX - 10, iconY, 22, 7);
    } else {
      this.graphics.fillStyle(0xffd45c, 1);
      this.graphics.fillCircle(iconX, iconY, 8);
      this.graphics.lineStyle(2, 0xffe99a, 1);
      this.graphics.strokeCircle(iconX, iconY, 12);
    }

    this.graphics.fillStyle(0xf2c14f, 1);
    this.graphics.fillCircle(116, 54, 8);
    this.graphics.lineStyle(2, 0x9b6b22, 1);
    this.graphics.strokeCircle(116, 54, 8);
  }

  drawWateringCanMeter(x, y) {
    const { currentWater, maxWater } = this.toolState.wateringCan;
    const ratio = maxWater > 0 ? currentWater / maxWater : 0;
    this.graphics.fillStyle(0x20241f, 0.86);
    this.graphics.fillRoundedRect(x, y, 26, 50, 4);
    this.graphics.fillStyle(currentWater > 0 ? 0x4aa6d9 : 0x767b79, 1);
    this.graphics.fillRoundedRect(x + 4, y + 46 - Math.round(42 * ratio), 18, Math.round(42 * ratio), 3);
    this.graphics.lineStyle(2, 0xe8d6a2, 0.9);
    this.graphics.strokeRoundedRect(x, y, 26, 50, 4);
  }

  getSlotQuantityText(slot, item) {
    if (item.id === ITEM_IDS.WATERING_CAN) {
      const state = this.toolState.wateringCan;
      return `${state.currentWater}/${state.maxWater}`;
    }
    if (item.id === ITEM_IDS.FUEL_CAN) {
      return `${slot.fuel || 0}/20`;
    }
    if (item.type === 'tool') return `${slot.quantity}`;
    if (item.type === 'empty') return '';
    return `${slot.quantity}`;
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
    const defaults = [
      ...INITIAL_HOTBAR.map((slot) => ({ ...slot })),
      ...Array.from({ length: INVENTORY_SIZE - HOTBAR_SIZE }, () => ({ itemId: ITEM_IDS.EMPTY, quantity: 0 }))
    ];
    if (!Array.isArray(savedSlots)) return defaults;

    return Array.from({ length: INVENTORY_SIZE }, (_, index) => {
      const saved = savedSlots[index];
      if (!saved || !ITEMS[saved.itemId]) return { itemId: ITEM_IDS.EMPTY, quantity: 0 };
      const slot = {
        itemId: saved.itemId,
        quantity: Number.isFinite(saved.quantity) ? Math.max(0, Math.floor(saved.quantity)) : 0,
        fuel: Number.isFinite(saved.fuel) ? saved.fuel : (saved.itemId === ITEM_IDS.FUEL_CAN ? 20 : undefined)
      };
      return this.normalizeSlot(slot);
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

  normalizeToolState(savedToolState = {}) {
    const maxWater = Number.isFinite(savedToolState.wateringCan?.maxWater)
      ? Math.max(1, Math.floor(savedToolState.wateringCan.maxWater))
      : ITEMS[ITEM_IDS.WATERING_CAN].maxWater;
    const currentWater = Number.isFinite(savedToolState.wateringCan?.currentWater)
      ? Math.max(0, Math.min(maxWater, Math.floor(savedToolState.wateringCan.currentWater)))
      : maxWater;
    return { wateringCan: { currentWater, maxWater } };
  }

  normalizeEquipment(savedEquipment = {}) {
    return {
      hat: savedEquipment.hat || null,
      top: savedEquipment.top || null,
      pants: savedEquipment.pants || null,
      shoes: savedEquipment.shoes || null,
      ring: savedEquipment.ring || null,
      tool: savedEquipment.tool || null
    };
  }

  refillWateringCan() {
    const state = this.toolState.wateringCan;
    if (state.currentWater >= state.maxWater) return false;
    state.currentWater = state.maxWater;
    this.render();
    return true;
  }

  // 燃油辅助方法
  getFuelSummary() {
    const fuelCans = this.slots.filter(s => s.itemId === ITEM_IDS.FUEL_CAN);
    const totalFuel = fuelCans.reduce((sum, s) => sum + (s.fuel || 0), 0);
    const totalCapacity = fuelCans.length * 20;
    return { totalFuel, totalCapacity, count: fuelCans.length };
  }

  consumeFuel(amount) {
    let remaining = amount;
    // 优先使用快捷栏选中的燃油桶
    const selectedSlot = this.getSelectedSlot();
    if (selectedSlot?.itemId === ITEM_IDS.FUEL_CAN && (selectedSlot.fuel || 0) > 0) {
      const consumed = Math.min(selectedSlot.fuel, remaining);
      selectedSlot.fuel -= consumed;
      remaining -= consumed;
      this.normalizeSlot(selectedSlot);
    }

    // 依次扣除其他燃油桶
    if (remaining > 0) {
      for (const slot of this.slots) {
        if (remaining <= 0) break;
        if (slot.itemId === ITEM_IDS.FUEL_CAN && (slot.fuel || 0) > 0) {
          const consumed = Math.min(slot.fuel, remaining);
          slot.fuel -= consumed;
          remaining -= consumed;
          this.normalizeSlot(slot);
        }
      }
    }
    this.normalizeAllSlots();
    this.render();
    return amount - remaining; // 返回实际扣除量
  }

  addFuel(amount) {
    let remaining = amount;
    // 优先填充现有未满油桶
    for (const slot of this.slots) {
      if (remaining <= 0) break;
      if (slot.itemId === ITEM_IDS.FUEL_CAN && (slot.fuel || 0) < 20) {
        const canAdd = 20 - (slot.fuel || 0);
        const toAdd = Math.min(canAdd, remaining);
        slot.fuel = (slot.fuel || 0) + toAdd;
        remaining -= toAdd;
      }
    }

    // 剩余油量需要新桶
    while (remaining > 0) {
      const emptySlot = this.slots.find(s => s.itemId === ITEM_IDS.EMPTY);
      if (!emptySlot) break; // 背包满了

      const toAdd = Math.min(20, remaining);
      emptySlot.itemId = ITEM_IDS.FUEL_CAN;
      emptySlot.quantity = 1;
      emptySlot.fuel = toAdd;
      remaining -= toAdd;
    }

    this.normalizeAllSlots();
    this.render();
    return amount - remaining; // 返回实际存入量
  }
}
