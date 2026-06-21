import { createModalShell, makeCloseButton, modalTextStyle } from './ModalUi';

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
    const width = 480;
    const height = this.isTouchDevice ? 276 : 320;
    const shell = createModalShell(this.scene, {
      width,
      height,
      depth: 84,
      onClose: () => this.close()
    });
    const { layer, x, y } = shell;
    this.layer = layer;

    const title = this.scene.add.text(x + 24, y + 20, this.isTouchDevice ? '手机操作' : '桌面操作', modalTextStyle(21, '#2d281f', true));
    const body = this.scene.add.text(x + 24, y + 66, this.getBodyText(), {
      ...modalTextStyle(15, '#5d4b35'),
      lineSpacing: 10,
      wordWrap: { width: width - 48 }
    });
    const hintText = this.isTouchDevice ? '点击面板外关闭' : 'Esc 或点击面板外关闭';
    const hint = this.scene.add.text(x + 24, y + height - 34, hintText, modalTextStyle(12, '#7a674d'));
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, body, hint, ...close]);
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
      'Shift：奔跑；游泳时加速游动',
      '数字键 1-9、0：切换十格快捷栏',
      'I：打开或关闭背包',
      'B：在家中打开家具与建造',
      '空格：使用当前工具或物品',
      'E：互动、对话、开门、商店、水井补水',
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
