import { createModalShell } from './ModalUi';

export default class PauseMenuSystem {
  constructor(scene) {
    this.scene = scene;
    this.layer = null;
    this.confirmLayer = null;
    this.savedMessage = null;
  }

  open() {
    this.close();
    const width = 420;
    const height = 410; // Increased height for "Reset Position"
    const shell = createModalShell(this.scene, { width, height, depth: 95, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;

    const title = this.scene.add.text(x + 28, y + 24, '暂停', textStyle(24, '#2d281f', true));
    const subtitle = this.scene.add.text(x + 28, y + 58, '锐德庄园已暂停', textStyle(14, '#6c5b42'));
    this.savedMessage = this.scene.add.text(x + width - 28, y + 31, '', textStyle(14, '#3f8c55', true));
    this.savedMessage.setOrigin(1, 0);

    [title, subtitle, this.savedMessage].forEach(t => t.setScrollFactor(0));

    const buttons = [
      this.makeButton(x + 28, y + 94, width - 56, '继续游戏', () => this.close()),
      this.makeButton(x + 28, y + 142, width - 56, '保存游戏', () => this.saveGame()),
      this.makeButton(x + 28, y + 190, width - 56, '控制说明', () => this.openHelp()),
      this.makeButton(x + 28, y + 238, width - 56, '重置位置', () => this.resetPosition()),
      this.makeButton(x + 28, y + 286, width - 56, '返回标题菜单', () => this.returnToTitle()),
      this.makeButton(x + 28, y + 334, width - 56, '返回游戏大厅', () => this.returnToHall(), true)
    ];

    layer.add([title, subtitle, this.savedMessage, ...buttons.flat()]);
  }

  resetPosition() {
    this.close();
    this.scene.resetPlayerPosition();
  }

  makeButton(x, y, width, label, onClick, danger = false) {
    const bg = this.scene.add.rectangle(x, y, width, 38, danger ? 0xfff0ee : 0xf7e6b9, 1);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, danger ? 0xe74c3c : 0x6c5b42, 0.9);
    bg.setScrollFactor(0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (_pointer, _localX, _localY, event) => {
      event.stopPropagation();
      onClick();
    });

    const text = this.scene.add.text(x + width / 2, y + 19, label, textStyle(15, danger ? '#e74c3c' : '#2d281f', true));
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
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
    window.dispatchEvent(new CustomEvent('reid-manor-request-leave', { detail: { target: 'title' } }));
  }

  returnToHall() {
    window.dispatchEvent(new CustomEvent('reid-manor-request-leave', { detail: { target: 'hall' } }));
  }

  openConfirm({ title, message, confirmText, onConfirm, danger = false }) {
    this.closeConfirm();

    const width = 420;
    const height = 190;
    const shell = createModalShell(this.scene, { width, height, depth: 105, onClose: () => this.closeConfirm() });
    const { layer, x, y } = shell;
    this.confirmLayer = layer;

    const titleText = this.scene.add.text(x + 24, y + 22, title, textStyle(22, '#2d281f', true));
    const messageText = this.scene.add.text(x + 24, y + 64, message, {
      ...textStyle(15, '#5d5449'),
      wordWrap: { width: width - 48 },
      lineSpacing: 6
    });
    titleText.setScrollFactor(0);
    messageText.setScrollFactor(0);

    const cancel = this.makeDialogButton(x + width - 196, y + height - 54, 82, '取消', () => this.closeConfirm());
    const confirm = this.makeDialogButton(x + width - 102, y + height - 54, 82, confirmText, () => {
      this.closeConfirm();
      onConfirm?.();
    }, danger);

    layer.add([titleText, messageText, ...cancel, ...confirm]);
  }

  makeDialogButton(x, y, width, label, onClick, danger = false) {
    const bg = this.scene.add.rectangle(x, y, width, 38, danger ? 0xe74c3c : 0x4a90e2, danger ? 1 : 1);
    bg.setOrigin(0, 0);
    bg.setScrollFactor(0);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (_pointer, _localX, _localY, event) => {
      event.stopPropagation();
      onClick();
    });

    const text = this.scene.add.text(x + width / 2, y + 19, label, textStyle(14, '#ffffff', true));
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);
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
