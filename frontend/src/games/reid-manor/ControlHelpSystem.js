export default class ControlHelpSystem {
  constructor(scene, isTouchDevice) {
    this.scene = scene;
    this.isTouchDevice = isTouchDevice;
    this.layer = null;
    this.button = this.createHelpButton();
  }

  createHelpButton() {
    const button = this.scene.add.container(this.scene.scale.width - 74, 52);
    button.setDepth(72);
    button.setScrollFactor(0);

    const bg = this.scene.add.rectangle(0, 0, 96, 30, 0xffffff, 0.86);
    bg.setOrigin(0.5, 0.5);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      this.open();
    });

    const text = this.scene.add.text(0, 0, '操作说明', {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '13px',
      color: '#2d281f',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    button.add([bg, text]);
    return button;
  }

  open() {
    this.close();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(84);
    layer.setScrollFactor(0);
    this.layer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.38);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());

    const width = 480;
    const height = this.isTouchDevice ? 220 : 240;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.97);
    panel.fillRoundedRect(x, y, width, height, 10);
    panel.lineStyle(2, 0xeeeeee, 1);
    panel.strokeRoundedRect(x, y, width, height, 10);

    const title = this.scene.add.text(x + 24, y + 20, this.isTouchDevice ? '手机操作' : '桌面操作', style(21, '#333333', true));
    const body = this.scene.add.text(x + 24, y + 66, this.getBodyText(), {
      ...style(15, '#666666'),
      lineSpacing: 9,
      wordWrap: { width: width - 48 }
    });
    const hint = this.scene.add.text(x + 24, y + height - 34, '点击空白处或按 ESC 关闭', style(13, '#4a90e2'));
    layer.add([overlay, panel, title, body, hint]);
  }

  getBodyText() {
    if (this.isTouchDevice) {
      return [
        '左下角虚拟摇杆：移动角色',
        '右下角 E：互动、对话、打开商店/公告板',
        '右下角工具：使用当前快捷栏物品',
        '右下角背包：查看物品并切换快捷栏'
      ].join('\n');
    }

    return [
      'WASD / 方向键：移动角色',
      '数字键 1-5：切换快捷栏',
      '空格：使用当前工具或物品',
      'E：互动、对话、打开商店/公告板',
      'ESC：关闭面板；没有面板时打开暂停菜单'
    ].join('\n');
  }

  reposition() {
    this.button?.setPosition(this.scene.scale.width - 74, 52);
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
    this.button?.destroy();
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
