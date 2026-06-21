import Phaser from 'phaser';

export function createModalShell(scene, {
  width,
  height,
  depth = 84,
  overlayAlpha = 0.42,
  panelColor = 0xfff4d4,
  borderColor = 0x6c5b42,
  onClose
}) {
  const viewWidth = scene.scale.width;
  const viewHeight = scene.scale.height;

  const layer = scene.add.container(0, 0);
  layer.setDepth(depth);
  layer.setScrollFactor(0);

  const x = Math.round((viewWidth - width) / 2);
  const y = Math.round((viewHeight - height) / 2);

  const overlay = scene.add.rectangle(
    0, 0, viewWidth, viewHeight, 0x000000, overlayAlpha
  );
  overlay.setOrigin(0, 0);
  overlay.setScrollFactor(0);

  const panel = scene.add.graphics();
  panel.setScrollFactor(0);
  panel.fillStyle(panelColor, 0.98);
  panel.fillRoundedRect(x, y, width, height, 8);
  panel.lineStyle(3, borderColor, 1);
  panel.strokeRoundedRect(x, y, width, height, 8);

  layer.add([overlay, panel]);

  return {
    layer,
    overlay,
    panel,
    x,
    y,
    width,
    height
  };
}

export function makeModalButton(scene, {
  x,
  y,
  width,
  height = 38,
  label,
  onClick,
  color = 0x4a90e2,
  textColor = '#ffffff',
  borderColor = null,
  fontSize = 14
}) {
  const bg = scene.add.rectangle(x, y, width, height, color, 1);
  bg.setOrigin(0, 0);
  if (borderColor !== null) bg.setStrokeStyle(2, borderColor, 1);

  bg.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, width, height),
    Phaser.Geom.Rectangle.Contains
  );
  bg.input.cursor = 'pointer';

  bg.on('pointerdown', (_pointer, _localX, _localY, event) => {
    event?.stopPropagation?.();
    onClick?.();
  });

  const text = scene.add.text(x + width / 2, y + height / 2, label, {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${fontSize}px`,
    color: textColor,
    fontStyle: 'bold'
  });
  text.setOrigin(0.5, 0.5);

  bg.setScrollFactor(0);
  text.setScrollFactor(0);

  return [bg, text];
}

export function makeCloseButton(scene, x, y, onClick) {
  return makeModalButton(scene, {
    x,
    y,
    width: 32,
    height: 32,
    label: '×',
    onClick,
    color: 0xc94f45,
    fontSize: 20
  });
}

export function modalTextStyle(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}
