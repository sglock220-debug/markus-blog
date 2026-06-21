import Phaser from 'phaser';
import { ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

/**
 * 通用容器 UI 系统
 * 支持垃圾桶 (3x3) 和 个人木箱 (10x2)
 * 统一使用屏幕坐标，解决相机错位问题
 */
export function openContainerModal(scene, {
  title,
  containerType, // 'trash' | 'chest'
  containerSlots,
  containerCols,
  containerRows,
  onUpdate, // 当物品变动时回调
  onClose,
  extraButtons = [] // { label, onClick, color }
}) {
  const width = 680;
  const height = 540;
  
  // 1. 创建 Modal Shell
  // 使用 scene.scale 确保居中，setScrollFactor(0) 确保不随相机移动
  const shell = createModalShell(scene, {
    width,
    height,
    depth: 10000, // 高深度
    onClose: () => {
      cleanup();
      onClose?.();
    }
  });
  const { layer, x, y } = shell;

  // 禁用右键菜单
  scene.input.mouse.disableContextMenu();

  // 2. 标题和关闭按钮
  const titleText = scene.add.text(x + 24, y + 20, title, modalTextStyle(22, '#3b2a1d', true));
  titleText.setScrollFactor(0);
  const close = makeCloseButton(scene, x + width - 44, y + 14, () => {
    cleanup();
    onClose?.();
  });
  layer.add([titleText, ...close]);

  // 3. 容器区域
  const containerLabel = scene.add.text(x + 24, y + 60, `${title}库存 (${containerCols}x${containerRows})`, modalTextStyle(16, '#3b2a1d', true));
  containerLabel.setScrollFactor(0);
  const containerGridWidth = containerCols * 58;
  const containerGridHeight = containerRows * 58;
  const containerBg = scene.add.rectangle(x + 24, y + 85, containerGridWidth + 10, containerGridHeight + 10, 0xfbe9bb, 1);
  containerBg.setOrigin(0, 0);
  containerBg.setStrokeStyle(2, 0x8a5a35, 1);
  containerBg.setScrollFactor(0);
  layer.add([containerLabel, containerBg]);

  // 4. 背包区域 (位置下移，为按钮留出空间)
  const buttonY = y + 85 + containerGridHeight + 20;
  const backpackTitleY = buttonY + 45;
  const invLabel = scene.add.text(x + 24, backpackTitleY, '个人背包', modalTextStyle(16, '#3b2a1d', true));
  invLabel.setScrollFactor(0);
  const invBg = scene.add.rectangle(x + 24, backpackTitleY + 25, 590, 200, 0xfbe9bb, 1);
  invBg.setOrigin(0, 0);
  invBg.setStrokeStyle(2, 0x8a5a35, 1);
  invBg.setScrollFactor(0);
  layer.add([invLabel, invBg]);

  // 5. 额外按钮
  extraButtons.forEach((btn, i) => {
    const btnWidth = 100;
    const btnHeight = 36;
    const phaserBtn = makeModalButton(scene, {
      x: x + 24 + containerGridWidth + 10 - btnWidth - (i * (btnWidth + 15)),
      y: buttonY,
      width: btnWidth,
      height: btnHeight,
      label: btn.label,
      onClick: btn.onClick,
      color: btn.color || 0x4a90e2
    });
    // 确保按钮及其子元素 setScrollFactor(0)
    phaserBtn.forEach(obj => {
      if (obj.setScrollFactor) obj.setScrollFactor(0);
      if (obj.setDepth) obj.setDepth(10001);
    });
    layer.add(phaserBtn);
  });

  // 6. 拖拽状态
  let dragData = null; // { source, index, item, quantity, icon }
  let slotObjects = []; // 存储所有格子的对象以便重绘

  // 渲染所有格子
  const renderAll = () => {
    // 清理旧格子
    slotObjects.forEach(obj => obj.destroy());
    slotObjects = [];

    // 渲染容器格子
    containerSlots.forEach((slot, index) => {
      const col = index % containerCols;
      const row = Math.floor(index / containerCols);
      renderSlot(x + 34 + col * 58, y + 95 + row * 58, slot, containerType, index);
    });

    // 渲染背包格子
    scene.inventory.slots.forEach((slot, index) => {
      const col = index % 10;
      const row = Math.floor(index / 10);
      renderSlot(x + 34 + col * 58, backpackTitleY + 35 + row * 62, slot, 'backpack', index);
    });
  };

  const renderSlot = (sx, sy, slot, type, index) => {
    const item = ITEMS[slot.itemId];
    const isEmpty = !item || item.id === ITEM_IDS.EMPTY;
    
    const bg = scene.add.rectangle(sx, sy, 50, 54, 0xf7e6b9, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x8a5a35, 1);
    bg.setInteractive({ useHandCursor: true });
    bg.setScrollFactor(0);
    layer.add(bg);
    slotObjects.push(bg);

    // 记录格子信息用于碰撞检测
    bg.setData('slotInfo', { type, index, x: sx, y: sy });

    if (!isEmpty) {
      const icon = makeIcon(scene, item, sx + 25, sy + 25, 30);
      icon.setScrollFactor(0);
      const qtyText = slot.quantity > 1 ? `${slot.quantity}` : '';
      const qty = scene.add.text(sx + 46, sy + 38, qtyText, modalTextStyle(10, '#3b2a1d', true));
      qty.setOrigin(1, 0);
      qty.setScrollFactor(0);
      layer.add([icon, qty]);
      slotObjects.push(icon, qty);

      // 拖拽开始
      bg.on('pointerdown', (pointer) => {
        // 右键拆分
        if (pointer.rightButtonDown()) {
          handleRightClickSplit(scene, type, index, slot, (type === 'backpack' ? scene.inventory.slots : containerSlots), renderAll);
          return;
        }

        if (dragData) return;
        
        dragData = {
          source: type,
          index: index,
          item: item,
          quantity: slot.quantity,
          icon: makeIcon(scene, item, pointer.x, pointer.y, 40)
        };
        dragData.icon.setDepth(10010);
        dragData.icon.setAlpha(0.7);
        dragData.icon.setScrollFactor(0);
        
        // 隐藏原图标
        icon.setVisible(false);
        if (qty) qty.setVisible(false);
      });
    }

    // 高亮逻辑
    bg.on('pointerover', () => {
      if (dragData) bg.setStrokeStyle(3, 0xffdf83, 1);
    });
    bg.on('pointerout', () => {
      bg.setStrokeStyle(1, 0x8a5a35, 1);
    });
  };

  const handlePointerMove = (pointer) => {
    if (dragData && dragData.icon) {
      dragData.icon.setPosition(pointer.x, pointer.y);
    }
  };

  const handlePointerUp = (pointer) => {
    if (!dragData) return;

    // 寻找落点格子
    // 统一使用 pointer.x/y (屏幕坐标) 进行检测
    const target = findSlotAt(pointer.x, pointer.y);
    
    if (target && (target.type !== dragData.source || target.index !== dragData.index)) {
      // 执行移动逻辑
      executeMove(dragData, target);
    }

    // 清理拖拽状态
    dragData.icon.destroy();
    dragData = null;
    renderAll();
  };

  const findSlotAt = (px, py) => {
    // 遍历所有背景格子进行命中检测
    for (const obj of slotObjects) {
      if (obj instanceof Phaser.GameObjects.Rectangle) {
        const info = obj.getData('slotInfo');
        if (info && px >= info.x && px <= info.x + 50 && py >= info.y && py <= info.y + 54) {
          return info;
        }
      }
    }
    return null;
  };

  const executeMove = (source, target) => {
    const sourceSlots = source.source === 'backpack' ? scene.inventory.slots : containerSlots;
    const targetSlots = target.type === 'backpack' ? scene.inventory.slots : containerSlots;
    
    const sourceSlot = sourceSlots[source.index];
    const targetSlot = targetSlots[target.index];

    if (targetSlot.itemId === sourceSlot.itemId) {
      // 堆叠合并逻辑 (支持部分合并，如 17+6 = 20+3)
      const itemDef = ITEMS[targetSlot.itemId];
      const maxStack = itemDef?.maxStack || 99;
      const space = maxStack - targetSlot.quantity;
      
      if (space > 0) {
        const toMove = Math.min(sourceSlot.quantity, space);
        targetSlot.quantity += toMove;
        sourceSlot.quantity -= toMove;
        
        if (sourceSlot.quantity <= 0) {
          sourceSlot.itemId = ITEM_IDS.EMPTY;
          sourceSlot.quantity = 0;
        }
      } else {
        scene.showMessage('该物品堆叠已满');
        return; // 不发生交换，保持原样
      }
    } else if (targetSlot.itemId === ITEM_IDS.EMPTY) {
      // 移动到空格
      targetSlot.itemId = sourceSlot.itemId;
      targetSlot.quantity = sourceSlot.quantity;
      sourceSlot.itemId = ITEM_IDS.EMPTY;
      sourceSlot.quantity = 0;
    } else {
      // 不同物品：交换
      const tempId = sourceSlot.itemId;
      const tempQty = sourceSlot.quantity;
      sourceSlot.itemId = targetSlot.itemId;
      sourceSlot.quantity = targetSlot.quantity;
      targetSlot.itemId = tempId;
      targetSlot.quantity = tempQty;
    }

    // 保存并更新
    onUpdate?.();
    if (source.source === 'backpack' || target.type === 'backpack') {
      scene.inventory.render(); // 同步 HUD
    }
    scene.saveNow();
  };

  const cleanup = () => {
    scene.input.off('pointermove', handlePointerMove);
    scene.input.off('pointerup', handlePointerUp);
    scene.input.mouse.enabledContextMenu(); // 恢复右键菜单
  };

  scene.input.on('pointermove', handlePointerMove);
  scene.input.on('pointerup', handlePointerUp);

  renderAll();

  return {
    layer,
    render: renderAll, // 暴露重新渲染方法
    close: () => {
      cleanup();
      shell.layer.destroy();
    }
  };
}

function makeIcon(scene, item, x, y, size) {
  let icon;
  if (item.iconKey && scene.textures.exists(item.iconKey)) {
    icon = scene.add.image(x, y, item.iconKey);
    icon.setDisplaySize(size, size);
  } else {
    icon = scene.add.text(x, y, item.name.slice(0, 1), modalTextStyle(Math.floor(size * 0.6), '#3b2a1d', true));
    icon.setOrigin(0.5, 0.5);
  }
  icon.setScrollFactor(0);
  return icon;
}

/**
 * 处理右键拆分逻辑
 */
export function handleRightClickSplit(scene, containerType, slotIndex, slot, slots, onComplete) {
  const item = ITEMS[slot.itemId];
  if (!item || item.id === ITEM_IDS.EMPTY) return;

  if (slot.quantity <= 1) {
    scene.showMessage('该物品无法拆分');
    return;
  }

  // 检查是否有空格
  const emptyIndex = slots.findIndex((s, i) => i !== slotIndex && s.itemId === ITEM_IDS.EMPTY);
  if (emptyIndex === -1) {
    const typeNames = { backpack: '背包', trash: '垃圾桶', chest: '木箱' };
    scene.showMessage(`${typeNames[containerType] || '容器'}空间已满，无法拆分`);
    return;
  }

  openSplitQuantityModal(scene, {
    item,
    currentQty: slot.quantity,
    onConfirm: (splitQty) => {
      // 执行拆分
      slot.quantity -= splitQty;
      const targetSlot = slots[emptyIndex];
      targetSlot.itemId = slot.itemId;
      targetSlot.quantity = splitQty;

      if (slot.quantity <= 0) {
        slot.itemId = ITEM_IDS.EMPTY;
        slot.quantity = 0;
      }

      scene.saveNow();
      if (containerType === 'backpack') scene.inventory.render();
      onComplete();
    }
  });
}

function openSplitQuantityModal(scene, { item, currentQty, onConfirm }) {
  const width = 360;
  const height = 300;
  const shell = createModalShell(scene, { width, height, depth: 20000 });
  const { layer, x, y } = shell;

  let splitQty = 0;

  const title = scene.add.text(x + width / 2, y + 25, '拆分物品', modalTextStyle(20, '#3b2a1d', true)).setOrigin(0.5);
  const itemName = scene.add.text(x + width / 2, y + 60, item.name, modalTextStyle(16, '#3b2a1d', true)).setOrigin(0.5);
  const qtyInfo = scene.add.text(x + width / 2, y + 90, `当前数量: ${currentQty}  拆出: ${splitQty}`, modalTextStyle(14, '#6e4526')).setOrigin(0.5);
  layer.add([title, itemName, qtyInfo]);

  const updateDisplay = () => {
    qtyInfo.setText(`当前数量: ${currentQty}  拆出: ${splitQty}`);
    confirmBtn[0].setAlpha(splitQty > 0 ? 1 : 0.5);
    confirmBtn[0].disableInteractive();
    if (splitQty > 0) confirmBtn[0].setInteractive({ useHandCursor: true });
  };

  const addQty = (amt) => {
    splitQty = Phaser.Math.Clamp(splitQty + amt, 0, currentQty);
    updateDisplay();
  };

  // 按钮行 1: [-10] [-5] [-1] [当前] [+1] [+5] [+10]
  const btnY1 = y + 130;
  const btnConfigs = [
    { label: '-10', amt: -10 }, { label: '-5', amt: -5 }, { label: '-1', amt: -1 },
    { label: '+1', amt: 1 }, { label: '+5', amt: 5 }, { label: '+10', amt: 10 }
  ];

  btnConfigs.forEach((cfg, i) => {
    const btn = makeModalButton(scene, {
      x: x + 25 + i * 52, y: btnY1, width: 45, height: 32,
      label: cfg.label, fontSize: 12, color: 0x8a5a35,
      onClick: () => addQty(cfg.amt)
    });
    layer.add(btn);
  });

  // 按钮行 2: [全部]
  const allBtn = makeModalButton(scene, {
    x: x + width / 2 - 40, y: y + 175, width: 80, height: 32,
    label: '全部', color: 0x8a5a35,
    onClick: () => { splitQty = currentQty; updateDisplay(); }
  });
  layer.add(allBtn);

  // 按钮行 3: [取消] [确认拆分]
  const cancelBtn = makeModalButton(scene, {
    x: x + 60, y: y + 230, width: 100, height: 38,
    label: '取消', color: 0x888888,
    onClick: () => layer.destroy()
  });
  
  const confirmBtn = makeModalButton(scene, {
    x: x + 200, y: y + 230, width: 100, height: 38,
    label: '确认拆分', color: 0x3f8c55,
    onClick: () => {
      if (splitQty > 0) {
        onConfirm(splitQty);
        layer.destroy();
      }
    }
  });
  layer.add([...cancelBtn, ...confirmBtn]);

  updateDisplay();
}
