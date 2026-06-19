import { NPCS, TILE_SIZE } from './map';

const NPC_SPEED = 22;
const INTERACTION_DISTANCE = 42;

export default class NpcSystem {
  constructor(scene) {
    this.scene = scene;
    this.npcs = NPCS.map((config) => this.createNpc(config));
    this.dialogLayer = null;
  }

  createNpc(config) {
    const sprite = this.scene.add.container(config.x * TILE_SIZE + 16, config.y * TILE_SIZE + 18);
    const body = this.scene.add.graphics();
    body.fillStyle(config.color, 1);
    body.fillRoundedRect(-9, -13, 18, 24, 5);
    body.fillStyle(0xf0bd8b, 1);
    body.fillCircle(0, -18, 8);
    body.fillStyle(0x2d281f, 1);
    body.fillRect(-3, -20, 2, 2);
    body.fillRect(4, -20, 2, 2);

    const name = this.scene.add.text(0, -42, config.name, {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '12px',
      color: '#fff7df',
      backgroundColor: 'rgba(45, 40, 31, 0.62)',
      padding: { x: 6, y: 3 }
    });
    name.setOrigin(0.5, 0);

    sprite.add([body, name]);
    sprite.setDepth(9);

    return {
      ...config,
      sprite,
      patrolIndex: 0,
      idleOffset: Math.random() * Math.PI * 2
    };
  }

  update(delta) {
    this.npcs.forEach((npc) => {
      npc.sprite.y += Math.sin(this.scene.time.now / 360 + npc.idleOffset) * 0.018;
      if (!npc.patrol) return;

      const target = npc.patrol[npc.patrolIndex];
      const targetX = target.x * TILE_SIZE + 16;
      const targetY = target.y * TILE_SIZE + 18;
      const distance = Math.hypot(targetX - npc.sprite.x, targetY - npc.sprite.y);

      if (distance < 2) {
        npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrol.length;
        return;
      }

      const step = NPC_SPEED * (delta / 1000);
      npc.sprite.x += ((targetX - npc.sprite.x) / distance) * step;
      npc.sprite.y += ((targetY - npc.sprite.y) / distance) * step;
    });
  }

  getNearby(player) {
    return this.npcs.find((npc) => {
      const distance = Math.hypot(player.x - npc.sprite.x, player.y - npc.sprite.y);
      return distance <= INTERACTION_DISTANCE;
    }) || null;
  }

  openDialog(npc) {
    this.closeDialog();
    this.dialogLayer = createPanel(this.scene, `${npc.name}`, npc.dialog, '点击空白处或按 ESC 关闭', () => {
      this.dialogLayer = null;
    });
  }

  isOpen() {
    return Boolean(this.dialogLayer);
  }

  closeDialog() {
    this.dialogLayer?.destroy();
    this.dialogLayer = null;
  }

  destroy() {
    this.closeDialog();
    this.npcs.forEach((npc) => npc.sprite.destroy());
  }
}

function createPanel(scene, title, body, hint, onClose) {
  const layer = scene.add.container(0, 0);
  layer.setDepth(80);
  layer.setScrollFactor(0);

  const overlay = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x000000, 0.38);
  overlay.setOrigin(0, 0);
  overlay.setInteractive();
  overlay.on('pointerdown', () => layer.destroy());

  const width = 420;
  const height = 180;
  const x = (scene.scale.width - width) / 2;
  const y = (scene.scale.height - height) / 2;
  const panel = scene.add.graphics();
  panel.fillStyle(0xffffff, 0.96);
  panel.fillRoundedRect(x, y, width, height, 10);
  panel.lineStyle(2, 0xeeeeee, 1);
  panel.strokeRoundedRect(x, y, width, height, 10);

  const titleText = scene.add.text(x + 22, y + 18, title, textStyle(20, '#333333', true));
  const bodyText = scene.add.text(x + 22, y + 62, body, {
    ...textStyle(15, '#666666'),
    wordWrap: { width: width - 44 }
  });
  const hintText = scene.add.text(x + 22, y + height - 34, hint, textStyle(13, '#4a90e2'));

  layer.add([overlay, panel, titleText, bodyText, hintText]);
  layer.destroy = wrapDestroy(layer, () => {
    overlay.removeAllListeners();
    onClose?.();
  });
  return layer;
}

function textStyle(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}

function wrapDestroy(layer, beforeDestroy) {
  const originalDestroy = layer.destroy.bind(layer);
  return (...args) => {
    beforeDestroy();
    originalDestroy(...args);
  };
}
