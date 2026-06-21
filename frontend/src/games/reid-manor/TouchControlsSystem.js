export default class TouchControlsSystem {
  constructor(scene, { enabled }) {
    this.scene = scene;
    this.enabled = enabled;
    this.vector = { x: 0, y: 0 };
    this.pointerId = null;
    this.baseX = 120;
    this.baseY = scene.scale.height - 186;
    this.radius = 48;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(70);
    this.layer.setScrollFactor(0);
    this.createControls();
    this.setVisible(enabled);
  }

  createControls() {
    this.base = this.scene.add.circle(this.baseX, this.baseY, this.radius, 0x111111, 0.22);
    this.base.setStrokeStyle(2, 0xffffff, 0.45);
    this.stick = this.scene.add.circle(this.baseX, this.baseY, 20, 0xffffff, 0.48);
    this.base.setInteractive();
    this.base.on('pointerdown', (pointer) => this.startJoystick(pointer));
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.stopJoystick, this);
    this.scene.input.on('pointerupoutside', this.stopJoystick, this);

    const interact = this.makeButton(this.scene.scale.width - 92, this.scene.scale.height - 244, 'E', () => this.scene.handleInteractInput());
    const use = this.makeButton(this.scene.scale.width - 166, this.scene.scale.height - 182, '工具', () => this.scene.useSelectedItem(), 62, 42);
    const bag = this.makeButton(this.scene.scale.width - 86, this.scene.scale.height - 176, '背包', () => this.scene.inventory.togglePanel(), 62, 42);

    this.buttons = [...interact, ...use, ...bag];
    this.layer.add([this.base, this.stick, ...this.buttons]);
  }

  makeButton(x, y, label, onClick, width = 56, height = 48) {
    const bg = this.scene.add.rectangle(x, y, width, height, 0x2d281f, 0.58);
    bg.setOrigin(0.5, 0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.35);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', (pointer, localX, localY, event) => {
      event.stopPropagation();
      if (!this.scene.hasBlockingPanelForTouch()) {
        onClick();
      }
    });

    const text = this.scene.add.text(x, y, label, {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5, 0.5);
    return [bg, text];
  }

  startJoystick(pointer) {
    if (!this.enabled || this.scene.hasOpenPanel()) return;
    this.pointerId = pointer.id;
    this.updateVector(pointer);
  }

  handlePointerMove(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.updateVector(pointer);
  }

  stopJoystick(pointer) {
    if (pointer.id !== this.pointerId) return;
    this.pointerId = null;
    this.vector = { x: 0, y: 0 };
    this.stick.setPosition(this.baseX, this.baseY);
  }

  updateVector(pointer) {
    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(this.radius, distance);
    const angle = Math.atan2(dy, dx);
    const x = distance > 0 ? Math.cos(angle) * clamped : 0;
    const y = distance > 0 ? Math.sin(angle) * clamped : 0;

    this.stick.setPosition(this.baseX + x, this.baseY + y);
    this.vector = {
      x: Math.abs(dx) < 6 ? 0 : x / this.radius,
      y: Math.abs(dy) < 6 ? 0 : y / this.radius
    };
  }

  getVector() {
    return this.enabled ? this.vector : { x: 0, y: 0 };
  }

  reposition() {
    this.baseX = 120;
    this.baseY = this.scene.scale.height - 186;
    this.base.setPosition(this.baseX, this.baseY);
    this.stick.setPosition(this.baseX, this.baseY);

    const positions = [
      [this.scene.scale.width - 92, this.scene.scale.height - 244],
      [this.scene.scale.width - 92, this.scene.scale.height - 244],
      [this.scene.scale.width - 166, this.scene.scale.height - 182],
      [this.scene.scale.width - 166, this.scene.scale.height - 182],
      [this.scene.scale.width - 86, this.scene.scale.height - 176],
      [this.scene.scale.width - 86, this.scene.scale.height - 176]
    ];

    this.buttons.forEach((button, index) => {
      button.setPosition(positions[index][0], positions[index][1]);
    });
  }

  setVisible(visible) {
    this.layer.setVisible(visible);
  }

  destroy() {
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.stopJoystick, this);
    this.scene.input.off('pointerupoutside', this.stopJoystick, this);
    this.layer.destroy();
  }
}
