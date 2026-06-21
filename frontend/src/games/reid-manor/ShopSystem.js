import { ECONOMY_CONFIG, SHOP_CONFIG } from './config';
import { ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const DESCRIPTIONS = {
  axe: '砍伐树木的基础工具。',
  hoe: '翻耕农田使用。',
  shovel: '挖坑种树或恢复草地。',
  wateringCan: '容量 20，可在水井或池塘补水。',
  fuelCan: '用于为发动机补充燃油。',
  sapling: '种在树坑里，第二天长成大树。',
  radishSeed: '用于种植萝卜。',
  radish: '可以食用或出售。',
  wheatSeed: '种植后可收获小麦。',
  wheat: '可在磨坊加工成面粉。',
  flour: '制作面包的原料。',
  bread: '恢复较多饥饿值。',
  water: '饮用恢复口渴并留下空瓶。',
  emptyBottle: '烧水和装水需要的容器。',
  wood: '建造与家具制作材料。',
  stone: '建造和加工材料。',
  medicineSmall: '恢复 20 点血量。',
  medicineMedium: '恢复 45 点血量。',
  medicineLarge: '恢复 80 点血量。'
};

const ALL_PRODUCTS = Object.entries(ECONOMY_CONFIG)
  .filter(([itemId]) => ITEMS[itemId])
  .map(([itemId, economy]) => ({ itemId, ...economy, description: DESCRIPTIONS[itemId] || '可交易物品。' }));

export default class ShopSystem {
  constructor(scene) {
    this.scene = scene;
    this.quantity = 1;
    this.selectedItemId = ITEM_IDS.RADISH_SEED;
    this.page = 0;
    this.storeType = 'general';
    this.layer = null;
    this.lastWheelTime = 0;
  }

  open(storeType = 'general') {
    this.storeType = storeType;
    this.quantity = 1;
    this.page = 0;
    const products = this.getProducts();
    this.selectedItemId = products[0]?.itemId || ITEM_IDS.RADISH_SEED;
    this.render();
  }

  render() {
    this.close();
    const width = 760;
    const height = 460;
    const shell = createModalShell(this.scene, {
      width,
      height,
      depth: 82,
      panelColor: 0xf4d89b,
      borderColor: 0x6e4526,
      onClose: () => this.close()
    });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'shop', close: () => this.close() });

    const headerColor = this.storeType === 'pharmacy' ? 0x356b68 : 
                      this.storeType === 'clothing' ? 0x6b3568 : 0x89522f;
    const header = this.scene.add.rectangle(x + 14, y + 14, width - 28, 54, headerColor, 1);
    header.setOrigin(0, 0);
    
    const titleStr = this.storeType === 'pharmacy' ? '青叶药房' : 
                    this.storeType === 'clothing' ? '时尚衣橱' : '锐德杂货铺';
    
    const title = this.scene.add.text(x + 30, y + 27, titleStr, modalTextStyle(23, '#fff7df', true));
    const gold = this.scene.add.text(x + width - 78, y + 31, `${this.scene.inventory.getQuantity(ITEM_IDS.COIN)} 金币`, modalTextStyle(14, '#ffe08a', true));
    gold.setOrigin(1, 0);
    const close = makeCloseButton(this.scene, x + width - 50, y + 25, () => this.close());

    const listBg = this.scene.add.rectangle(x + 20, y + 82, 330, 322, 0xfbe9bb, 1);
    listBg.setOrigin(0, 0);
    listBg.setStrokeStyle(2, 0x8a5a35, 1);
    const detailBg = this.scene.add.rectangle(x + 364, y + 82, 376, 322, 0xe8bd78, 1);
    detailBg.setOrigin(0, 0);
    detailBg.setStrokeStyle(2, 0x8a5a35, 1);
    layer.add([header, title, gold, listBg, detailBg, ...close]);

    const products = this.getProducts();
    const pageCount = Math.max(1, Math.ceil(products.length / 5));
    this.page = Math.max(0, Math.min(pageCount - 1, this.page));
    
    // Add product rows
    const visibleProducts = products.slice(this.page * 5, this.page * 5 + 5);
    visibleProducts.forEach((product, index) => {
      const row = this.makeProductRow(product, x + 32, y + 94 + index * 56, 306, 48);
      layer.add(row);
    });

    // Keyboard navigation
    if (!this.keyboardListener) {
      this.keyboardListener = (event) => {
        if (!this.isOpen() || this.scene.itemConfirm?.isOpen()) return;
        
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          this.navigateSelection(1);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          this.navigateSelection(-1);
        }
      };
      window.addEventListener('keydown', this.keyboardListener);
    }

    if (!this.wheelListener) {
      this.wheelListener = (event) => {
        if (!this.isOpen() || this.scene.itemConfirm?.isOpen()) return;

        // 判断鼠标是否在左侧商品列表区域 (x+20, y+82, 330, 322)
        const mouseX = this.scene.input.x;
        const mouseY = this.scene.input.y;
        const inListArea = (
          mouseX >= x + 20 && mouseX <= x + 20 + 330 &&
          mouseY >= y + 82 && mouseY <= y + 82 + 322
        );

        if (inListArea) {
          event.preventDefault(); // 阻止浏览器滚动
          
          const now = Date.now();
          if (now - this.lastWheelTime < 180) return; // 节流
          this.lastWheelTime = now;

          if (event.deltaY > 0) {
            this.navigateSelection(1);
          } else if (event.deltaY < 0) {
            this.navigateSelection(-1);
          }
        }
      };
      window.addEventListener('wheel', this.wheelListener, { passive: false });
    }
    const prev = makeModalButton(this.scene, {
      x: x + 40, y: y + 372, width: 86, height: 28, label: '上一页',
      onClick: () => this.changePage(-1), color: 0x8a5a35, fontSize: 12
    });
    const pageText = this.scene.add.text(x + 185, y + 378, `${this.page + 1}/${pageCount}`, modalTextStyle(12, '#5d4b35', true));
    pageText.setOrigin(0.5, 0);
    const next = makeModalButton(this.scene, {
      x: x + 244, y: y + 372, width: 86, height: 28, label: '下一页',
      onClick: () => this.changePage(1), color: 0x8a5a35, fontSize: 12
    });
    layer.add([...prev, pageText, ...next]);

    const selected = this.getSelectedProduct();
    const item = ITEMS[selected.itemId];
    const detailTitle = this.scene.add.text(x + 386, y + 102, item.name, modalTextStyle(21, '#3b2a1d', true));
    const icon = this.makeIcon(item, x + 690, y + 122, 42);
    const description = this.scene.add.text(x + 386, y + 140, selected.description, {
      ...modalTextStyle(13, '#5d4b35'), wordWrap: { width: 270 }
    });
    const owned = this.scene.add.text(x + 386, y + 180, `持有：${this.scene.inventory.getQuantity(selected.itemId)}`, modalTextStyle(14, '#3b2a1d'));
    const prices = this.scene.add.text(x + 386, y + 208, `买入：${selected.buy} 金币    出售：${selected.sell} 金币`, modalTextStyle(14, '#7a4a1f', true));
    const quantity = this.scene.add.text(x + 386, y + 242, `交易数量：${this.quantity}`, modalTextStyle(15, '#3b2a1d', true));
    const buyTotal = this.scene.add.text(x + 386, y + 270, `购买合计 ${this.quantity * selected.buy} · 出售合计 ${this.quantity * selected.sell}`, modalTextStyle(12, '#6e4526'));

    const controls = [
      ['zero', '0'], [1, '+1'], [5, '+5'], [10, '+10'],
      ['all', '全选'], [-1, '-1'], [-5, '-5'], [-10, '-10']
    ].flatMap(([value, label], index) => {
      const btns = makeModalButton(this.scene, {
        x: x + 386 + (index % 4) * 78,
        y: y + 298 + Math.floor(index / 4) * 38,
        width: 70,
        height: 32,
        label,
        onClick: () => this.adjustQuantity(value),
        color: typeof value === 'string' ? 0x8a5a35 : 0x4a90e2,
        fontSize: 12
      });
      return btns;
    });
    const buy = makeModalButton(this.scene, {
      x: x + 386, y: y + 378, width: 146, height: 42, label: `购买 ${item.name}`,
      onClick: () => this.buySelected(), color: 0x3f8c55
    });
    const sell = makeModalButton(this.scene, {
      x: x + 548, y: y + 378, width: 146, height: 42, label: `出售 ${item.name}`,
      onClick: () => this.sellSelected(), color: 0xb7653c
    });

    // Special: Wear button for clothing store
    let wear = [];
    if (this.storeType === 'clothing' && item.type === 'equipment') {
      const isOwned = this.scene.inventory.hasItem(selected.itemId, 1);
      const isEquipped = this.scene.inventory.equipment[item.slot] === item.id;
      
      wear = makeModalButton(this.scene, {
        x: x + 694, y: y + 84, width: 38, height: 32, 
        label: isEquipped ? '已穿' : '穿戴',
        onClick: () => {
          if (!isOwned && !isEquipped) return this.scene.showMessage('请先购买');
          if (isEquipped) return;
          this.scene.inventory.equipItemFromId(item.id);
          this.render();
        },
        color: isEquipped ? 0x2d5a27 : 0x8a5a35,
        fontSize: 10
      });
    }

    const hint = this.scene.add.text(x + 24, y + height - 28, '选择左侧商品，在右侧统一购买或出售', modalTextStyle(12, '#6e4526'));
    layer.add([detailTitle, icon, description, owned, prices, quantity, buyTotal, ...controls, ...buy, ...sell, ...wear, hint]);
  }

  makeProductRow(product, x, y, width, height) {
    const selected = product.itemId === this.selectedItemId;
    const item = ITEMS[product.itemId];
    
    // Main background
    const bg = this.scene.add.rectangle(x, y, width, height, selected ? 0xffdf83 : 0xe7c58a, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(selected ? 3 : 1, selected ? 0x3f78bd : 0x8a5a35, 1);
    bg.setScrollFactor(0);
    
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (_pointer, _localX, _localY, event) => {
      event?.stopPropagation?.();
      this.selectedItemId = product.itemId;
      this.quantity = 1;
      this.render();
    });

    const icon = this.makeIcon(item, x + 28, y + height / 2, 28);
    const name = this.scene.add.text(
      x + 52,
      y + 7,
      item.name,
      modalTextStyle(14, '#3b2a1d', true)
    );
    const meta = this.scene.add.text(
      x + 52,
      y + 27,
      `买 ${product.buy} · 卖 ${product.sell} · 持有 ${this.scene.inventory.getQuantity(product.itemId)}`,
      modalTextStyle(10, '#6e4526')
    );
    
    icon.setScrollFactor(0);
    name.setScrollFactor(0);
    meta.setScrollFactor(0);
    
    return [bg, icon, name, meta];
  }

  navigateSelection(delta) {
    const products = this.getProducts();
    if (products.length === 0) return;

    const currentIndex = products.findIndex(p => p.itemId === this.selectedItemId);
    let nextIndex = currentIndex + delta;

    const pageCount = Math.max(1, Math.ceil(products.length / 5));

    // Circular navigation switching
    if (nextIndex < 0) {
      nextIndex = products.length - 1;
      this.page = pageCount - 1;
    } else if (nextIndex >= products.length) {
      nextIndex = 0;
      this.page = 0;
    } else {
      this.page = Math.floor(nextIndex / 5);
    }

    this.selectedItemId = products[nextIndex].itemId;
    this.quantity = 1;
    this.render();
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

  adjustQuantity(value) {
    const selected = this.getSelectedProduct();
    if (!selected) return;

    if (value === 'zero') {
      this.quantity = 0;
    } else if (value === 'all') {
      // Calculate max buyable
      const gold = this.scene.inventory.getQuantity(ITEM_IDS.COIN);
      const affordable = selected.buy > 0 ? Math.floor(gold / selected.buy) : SHOP_CONFIG.maxBuyQuantity;
      
      // Backpack space check (simplified: if item exists, check stack; if not, check free slots)
      // For now, use a reasonable upper bound from config
      const maxBuy = Math.min(SHOP_CONFIG.maxBuyQuantity, affordable);
      
      // Calculate max sellable
      const owned = this.scene.inventory.getQuantity(selected.itemId);
      const maxSell = owned;

      // "All" is the max of either buying or selling possibility
      this.quantity = Math.max(maxBuy, maxSell);
    } else {
      this.quantity = Math.max(0, Math.min(SHOP_CONFIG.maxBuyQuantity, this.quantity + value));
    }
    this.render();
  }

  buySelected() {
    if (this.quantity <= 0) return this.scene.showMessage('请先选择购买数量');
    const product = this.getSelectedProduct();
    const cost = this.quantity * product.buy;
    if (this.scene.inventory.getQuantity(ITEM_IDS.COIN) < cost) return this.scene.showMessage('金币不够');
    if (!this.scene.inventory.addItem(product.itemId, this.quantity)) return this.scene.showMessage('背包已满');
    this.scene.inventory.removeItem(ITEM_IDS.COIN, cost);
    this.scene.showMessage(`购买了 ${this.quantity} 个${ITEMS[product.itemId].name}`);
    this.scene.saveNow();
    this.render();
  }

  sellSelected() {
    if (this.quantity <= 0) return this.scene.showMessage('请先选择出售数量');
    const product = this.getSelectedProduct();
    if (!this.scene.inventory.removeItem(product.itemId, this.quantity)) return this.scene.showMessage('持有数量不足');
    this.scene.inventory.addItem(ITEM_IDS.COIN, this.quantity * product.sell);
    this.scene.showMessage(`出售了 ${this.quantity} 个${ITEMS[product.itemId].name}`);
    this.scene.saveNow();
    this.quantity = Math.min(this.quantity, this.scene.inventory.getQuantity(product.itemId));
    this.render();
  }

  changePage(delta) {
    const pageCount = Math.max(1, Math.ceil(this.getProducts().length / 5));
    this.page = (this.page + delta + pageCount) % pageCount;
    this.render();
  }

  getProducts() {
    if (this.storeType === 'pharmacy') {
      return ALL_PRODUCTS.filter((product) => product.itemId.startsWith('medicine'));
    }
    if (this.storeType === 'clothing') {
      return ALL_PRODUCTS.filter((product) => product.itemId.startsWith('cloth'));
    }
    return ALL_PRODUCTS.filter((product) => !product.itemId.startsWith('medicine') && !product.itemId.startsWith('cloth'));
  }

  getSelectedProduct() {
    return this.getProducts().find((product) => product.itemId === this.selectedItemId) || this.getProducts()[0];
  }

  isOpen() { return Boolean(this.layer); }
  close() { 
    this.scene.popModal('shop');
    if (this.keyboardListener) {
      window.removeEventListener('keydown', this.keyboardListener);
      this.keyboardListener = null;
    }
    if (this.wheelListener) {
      window.removeEventListener('wheel', this.wheelListener);
      this.wheelListener = null;
    }
    this.layer?.destroy(); 
    this.layer = null; 
  }
  destroy() { this.close(); }
}
