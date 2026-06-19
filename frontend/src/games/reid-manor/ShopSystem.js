import { SHOP_CONFIG } from './config';
import { ITEM_IDS } from './items';

export default class ShopSystem {
  constructor(scene) {
    this.scene = scene;
    this.quantity = 1;
    this.layer = null;
  }

  open() {
    this.close();
    this.quantity = 1;
    this.render();
  }

  render() {
    this.close();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(82);
    layer.setScrollFactor(0);
    this.layer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.42);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());

    const width = 500;
    const height = 292;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.97);
    panel.fillRoundedRect(x, y, width, height, 10);
    panel.lineStyle(2, 0xeeeeee, 1);
    panel.strokeRoundedRect(x, y, width, height, 10);

    const title = this.scene.add.text(x + 24, y + 18, '锐德杂货店', style(21, '#333333', true));
    const gold = this.scene.add.text(x + 24, y + 56, `金币：${this.scene.inventory.getQuantity(ITEM_IDS.COIN)}`, style(15, '#666666'));
    const seedInfo = this.scene.add.text(x + 24, y + 92, `萝卜种子：${SHOP_CONFIG.radishSeedPrice} 金币 / 个`, style(16, '#333333', true));
    const radishInfo = this.scene.add.text(x + 24, y + 132, `萝卜收购：${SHOP_CONFIG.radishSellPrice} 金币 / 个`, style(16, '#333333', true));
    const qty = this.scene.add.text(x + 24, y + 178, `购买数量：${this.quantity}`, style(16, '#333333'));
    const owned = this.scene.add.text(
      x + 250,
      y + 56,
      `种子 ${this.scene.inventory.getQuantity(ITEM_IDS.RADISH_SEED)} · 萝卜 ${this.scene.inventory.getQuantity(ITEM_IDS.RADISH)}`,
      style(15, '#666666')
    );

    const minus = this.makeButton(x + 168, y + 168, 44, 34, '-1', () => this.changeQuantity(-1));
    const plus = this.makeButton(x + 220, y + 168, 44, 34, '+1', () => this.changeQuantity(1));
    const buy = this.makeButton(x + 24, y + 224, 138, 42, '购买种子', () => this.buySeeds());
    const sell = this.makeButton(x + 178, y + 224, 138, 42, '出售萝卜', () => this.sellRadishes());
    const close = this.makeButton(x + 340, y + 224, 116, 42, '关闭', () => this.close(), 0xe74c3c);

    layer.add([overlay, panel, title, gold, seedInfo, radishInfo, qty, owned, ...minus, ...plus, ...buy, ...sell, ...close]);
  }

  changeQuantity(delta) {
    const maxAffordable = Math.floor(this.scene.inventory.getQuantity(ITEM_IDS.COIN) / SHOP_CONFIG.radishSeedPrice);
    const max = Math.max(1, Math.min(SHOP_CONFIG.maxBuyQuantity, maxAffordable || 1));
    this.quantity = Math.max(1, Math.min(max, this.quantity + delta));
    this.render();
  }

  buySeeds() {
    const cost = this.quantity * SHOP_CONFIG.radishSeedPrice;
    if (this.scene.inventory.getQuantity(ITEM_IDS.COIN) < cost) {
      this.scene.showMessage('金币不够');
      return;
    }

    this.scene.inventory.removeItem(ITEM_IDS.COIN, cost);
    this.scene.inventory.addItem(ITEM_IDS.RADISH_SEED, this.quantity);
    this.scene.showMessage(`购买了 ${this.quantity} 个萝卜种子`);
    this.scene.saveNow();
    this.render();
  }

  sellRadishes() {
    const amount = this.scene.inventory.getQuantity(ITEM_IDS.RADISH);
    if (amount <= 0) {
      this.scene.showMessage('背包里没有萝卜');
      return;
    }

    this.scene.inventory.removeItem(ITEM_IDS.RADISH, amount);
    this.scene.inventory.addItem(ITEM_IDS.COIN, amount * SHOP_CONFIG.radishSellPrice);
    this.scene.showMessage(`出售 ${amount} 个萝卜`);
    this.scene.saveNow();
    this.render();
  }

  makeButton(x, y, width, height, label, onClick, color = 0x4a90e2) {
    const bg = this.scene.add.rectangle(x, y, width, height, color, 1);
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      onClick();
    });
    const text = this.scene.add.text(x + width / 2, y + height / 2, label, style(14, '#ffffff', true));
    text.setOrigin(0.5, 0.5);
    return [bg, text];
  }

  isOpen() {
    return Boolean(this.layer);
  }

  close() {
    this.layer?.destroy();
    this.layer = null;
  }

  destroy() {
    this.close();
  }
}

function style(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}
