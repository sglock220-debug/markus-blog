export default class PauseMenuSystem {
  constructor(scene) {
    this.scene = scene;
    this.layer = null;
    this.confirmLayer = null;
    this.savedMessage = null;
  }

  open() {
    this.close();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(95);
    layer.setScrollFactor(0);
    this.layer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.42);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();

    const width = 420;
    const height = 360;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.98);
    panel.fillRoundedRect(x, y, width, height, 12);
    panel.lineStyle(2, 0xe7e1d6, 1);
    panel.strokeRoundedRect(x, y, width, height, 12);

    const title = this.scene.add.text(x + 28, y + 24, '暂停', textStyle(24, '#2d281f', true));
    const subtitle = this.scene.add.text(x + 28, y + 58, '锐德庄园已暂停', textStyle(14, '#6c5b42'));
    this.savedMessage = this.scene.add.text(x + width - 28, y + 31, '', textStyle(14, '#3f8c55', true));
    this.savedMessage.setOrigin(1, 0);

    const buttons = [
      this.makeButton(x + 28, y + 94, width - 56, '继续游戏', () => this.close()),
      this.makeButton(x + 28, y + 142, width - 56, '保存游戏', () => this.saveGame()),
      this.makeButton(x + 28, y + 190, width - 56, '控制说明', () => this.openHelp()),
      this.makeButton(x + 28, y + 238, width - 56, '返回标题菜单', () => this.returnToTitle()),
      this.makeButton(x + 28, y + 286, width - 56, '返回游戏大厅', () => this.returnToHall(), true)
    ];

    layer.add([overlay, panel, title, subtitle, this.savedMessage, ...buttons.flat()]);
  }

  makeButton(x, y, width, label, onClick, danger = false) {
    const bg = this.scene.add.rectangle(x, y, width, 38, danger ? 0xfff0ee : 0xf7e6b9, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, danger ? 0xe74c3c : 0x6c5b42, 0.9);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      onClick();
    });

    const text = this.scene.add.text(x + width / 2, y + 19, label, textStyle(15, danger ? '#e74c3c' : '#2d281f', true));
    text.setOrigin(0.5, 0.5);
    return [bg, text];
  }

  saveGame() {
    const ok = this.scene.saveNow?.();
    this.savedMessage?.setText(ok ? '已保存' : '保存失败');
    this.scene.time.delayedCall(1400, () => {
      this.savedMessage?.setText('');
    });
  }

  openHelp() {
    this.close();
    this.scene.controlHelp?.open();
  }

  returnToTitle() {
    this.openConfirm({
      title: '返回标题菜单',
      message: '当前进度会先保存。确定返回标题菜单吗？',
      confirmText: '确定',
      onConfirm: () => {
        this.scene.saveNow?.();
        window.dispatchEvent(new CustomEvent('reid-manor-return-title'));
      }
    });
  }

  returnToHall() {
    this.openConfirm({
      title: '返回游戏大厅',
      message: '当前进度会先保存。确定返回游戏大厅吗？',
      confirmText: '确定',
      onConfirm: () => {
        this.scene.saveNow?.();
        window.dispatchEvent(new CustomEvent('reid-manor-return-hall'));
      }
    });
  }

  openConfirm({ title, message, confirmText, onConfirm, danger = false }) {
    this.closeConfirm();

    const layer = this.scene.add.container(0, 0);
    layer.setDepth(105);
    layer.setScrollFactor(0);
    this.confirmLayer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.42);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.closeConfirm());

    const width = 420;
    const height = 190;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.98);
    panel.fillRoundedRect(x, y, width, height, 12);
    panel.lineStyle(2, 0xe7e1d6, 1);
    panel.strokeRoundedRect(x, y, width, height, 12);

    const titleText = this.scene.add.text(x + 24, y + 22, title, textStyle(22, '#2d281f', true));
    const messageText = this.scene.add.text(x + 24, y + 64, message, {
      ...textStyle(15, '#5d5449'),
      wordWrap: { width: width - 48 },
      lineSpacing: 6
    });

    const cancel = this.makeDialogButton(x + width - 196, y + height - 54, 82, '取消', () => this.closeConfirm());
    const confirm = this.makeDialogButton(x + width - 102, y + height - 54, 82, confirmText, () => {
      this.closeConfirm();
      onConfirm?.();
    }, danger);

    layer.add([overlay, panel, titleText, messageText, ...cancel, ...confirm]);
  }

  makeDialogButton(x, y, width, label, onClick, danger = false) {
    const bg = this.scene.add.rectangle(x, y, width, 38, danger ? 0xe74c3c : 0x4a90e2, danger ? 1 : 1);
    bg.setOrigin(0, 0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      onClick();
    });

    const text = this.scene.add.text(x + width / 2, y + 19, label, textStyle(14, '#ffffff', true));
    text.setOrigin(0.5, 0.5);
    return [bg, text];
  }

  closeConfirm() {
    this.confirmLayer?.destroy();
    this.confirmLayer = null;
  }

  isOpen() {
    return Boolean(this.layer);
  }

  close() {
    this.closeConfirm();
    this.layer?.destroy();
    this.layer = null;
    this.savedMessage = null;
  }

  destroy() {
    this.close();
  }
}

function textStyle(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}
