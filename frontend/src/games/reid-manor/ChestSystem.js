import { ITEM_IDS, ITEMS } from './items';

export default class ChestSystem {
  constructor(scene, savedChest = {}) {
    this.scene = scene;
    this.state = normalizeChest(savedChest);
    this.layer = null;
  }

  open() {
    this.state.opened = true;
    this.render();
    this.scene.saveNow();
  }

  render() {
    this.close();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(84);
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

    const title = this.scene.add.text(x + 24, y + 18, '木箱', style(22, '#333333', true));
    const noteTitle = this.scene.add.text(x + 24, y + 58, '新手纸条', style(16, '#333333', true));
    const note = this.scene.add.text(x + 24, y + 88, this.state.note, {
      ...style(14, '#666666'),
      wordWrap: { width: width - 48 }
    });
    const seedInfo = this.scene.add.text(
      x + 24,
      y + 166,
      `萝卜种子：${this.state.radishSeeds}`,
      style(16, '#333333', true)
    );

    const transfer = this.makeButton(x + 24, y + 222, 160, 42, '转移种子', () => this.transferSeeds());
    const close = this.makeButton(x + 340, y + 222, 116, 42, '关闭', () => this.close(), 0xe74c3c);

    layer.add([overlay, panel, title, noteTitle, note, seedInfo, ...transfer, ...close]);
  }

  transferSeeds() {
    if (this.state.radishSeeds <= 0) {
      this.scene.showMessage('木箱里没有种子了');
      return;
    }

    const amount = this.state.radishSeeds;
    this.state.radishSeeds = 0;
    this.scene.inventory.addItem(ITEM_IDS.RADISH_SEED, amount);
    this.scene.showMessage(`取出了 ${amount} 个萝卜种子`);
    this.scene.saveNow();
    this.render();
  }

  getSnapshot() {
    return { ...this.state };
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
}

export function createDefaultChest() {
  return {
    opened: false,
    radishSeeds: 10,
    note: '欢迎来到锐德庄园。先从木箱里取出种子，翻地、播种、浇水，照看你的第一批萝卜吧。'
  };
}

function normalizeChest(savedChest) {
  const fallback = createDefaultChest();
  return {
    opened: Boolean(savedChest?.opened),
    radishSeeds: Number.isFinite(savedChest?.radishSeeds)
      ? Math.max(0, savedChest.radishSeeds)
      : fallback.radishSeeds,
    note: typeof savedChest?.note === 'string' ? savedChest.note : fallback.note
  };
}

function style(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}
