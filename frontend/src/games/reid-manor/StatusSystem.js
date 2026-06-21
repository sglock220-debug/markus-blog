import { SURVIVAL_CONFIG, TIME_CONFIG } from './config';

const STATUS_DEFS = [
  { key: 'health', label: '血量', color: 0xd95656 },
  { key: 'hunger', label: '饥饿', color: 0xe3a14a },
  { key: 'thirst', label: '口渴', color: 0x4aa6d9 }
];

export default class StatusSystem {
  constructor(scene, savedStatus = {}) {
    this.scene = scene;
    this.values = {
      health: normalizeValue(savedStatus.health),
      hunger: normalizeValue(savedStatus.hunger),
      thirst: normalizeValue(savedStatus.thirst)
    };
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(45);
    this.graphics.setScrollFactor(0);
    this.labels = STATUS_DEFS.flatMap((definition) => {
      const name = scene.add.text(0, 0, definition.label, textStyle(11, '#fff7df'));
      const value = scene.add.text(0, 0, '', textStyle(11, '#fff7df'));
      [name, value].forEach((text) => {
        text.setOrigin(0.5, 0);
        text.setDepth(46);
        text.setScrollFactor(0);
      });
      return [name, value];
    });
    this.render();
  }

  update(deltaMs) {
    const gameMinutes = deltaMs / TIME_CONFIG.realMsPerGameMinute;
    if (gameMinutes <= 0) return;

    this.values.hunger = clamp(this.values.hunger - SURVIVAL_CONFIG.hungerLossPerGameMinute * gameMinutes);
    this.values.thirst = clamp(this.values.thirst - SURVIVAL_CONFIG.thirstLossPerGameMinute * gameMinutes);
    if (this.values.hunger <= 0 || this.values.thirst <= 0) {
      this.values.health = clamp(this.values.health - SURVIVAL_CONFIG.healthLossPerGameMinute * gameMinutes);
    }
    this.render();
  }

  consume(action) {
    if (action === 'eat') {
      if (this.values.hunger >= 100) return { ok: false, message: '现在还不饿' };
      this.values.hunger = clamp(this.values.hunger + SURVIVAL_CONFIG.breadRestore);
      this.render();
      return { ok: true, message: '吃下面包，饥饿值得到恢复' };
    }

    if (action === 'drink') {
      if (this.values.thirst >= 100) return { ok: false, message: '现在还不渴' };
      this.values.thirst = clamp(this.values.thirst + SURVIVAL_CONFIG.waterRestore);
      this.render();
      return { ok: true, message: '喝下清水，口渴值得到恢复' };
    }

    if (action === 'eatRadish') {
      this.values.hunger = clamp(this.values.hunger + SURVIVAL_CONFIG.radishHungerRestore);
      this.values.health = clamp(this.values.health + SURVIVAL_CONFIG.radishHealthRestore);
      this.render();
      return { ok: true, message: '吃下萝卜，恢复了饥饿和少量血量' };
    }

    return { ok: false, message: '这个物品暂时不能使用' };
  }

  heal(amount, source = '药品') {
    if (this.values.health >= 100) return { ok: false, message: '血量已经满了' };
    this.values.health = clamp(this.values.health + amount);
    this.render();
    return { ok: true, message: `${source}恢复了 ${amount} 点血量` };
  }

  applyWorkCost(hungerCost) {
    this.values.hunger = clamp(this.values.hunger - hungerCost);
    this.render();
  }

  refillAfterSleep() {
    this.values.hunger = 100;
    this.render();
  }

  getSnapshot() {
    return { ...this.values };
  }

  render() {
    this.graphics.clear();
    const panelX = 10;
    const panelY = this.scene.scale.height - 108;
    const barWidth = 82;

    this.graphics.fillStyle(0x263522, 0.78);
    this.graphics.fillRoundedRect(panelX, panelY, 184, 96, 6);
    this.graphics.lineStyle(2, 0xe8d6a2, 0.72);
    this.graphics.strokeRoundedRect(panelX, panelY, 184, 96, 6);

    STATUS_DEFS.forEach((definition, index) => {
      const rowY = panelY + 14 + index * 27;
      const value = this.values[definition.key];
      const fillWidth = Math.round((barWidth - 4) * value / 100);

      this.drawIcon(definition.key, panelX + 18, rowY, definition.color);
      this.graphics.fillStyle(0x151b13, 0.84);
      this.graphics.fillRoundedRect(panelX + 68, rowY - 7, barWidth, 14, 4);
      this.graphics.fillStyle(definition.color, 1);
      this.graphics.fillRoundedRect(panelX + 70, rowY - 5, fillWidth, 10, 3);
      this.graphics.lineStyle(2, 0xf4e7bd, 0.78);
      this.graphics.strokeRoundedRect(panelX + 68, rowY - 7, barWidth, 14, 4);

      const label = this.labels[index * 2];
      const number = this.labels[index * 2 + 1];
      label.setOrigin(0, 0.5);
      label.setPosition(panelX + 30, rowY);
      number.setText(`${Math.round(value)}`);
      number.setOrigin(1, 0.5);
      number.setPosition(panelX + 174, rowY);
    });
  }

  drawIcon(key, x, y, color) {
    this.graphics.fillStyle(color, 1);
    if (key === 'health') {
      this.graphics.fillCircle(x - 4, y, 5);
      this.graphics.fillCircle(x + 4, y, 5);
      this.graphics.fillTriangle(x - 9, y + 1, x + 9, y + 1, x, y + 11);
      return;
    }
    if (key === 'hunger') {
      this.graphics.fillRoundedRect(x - 8, y - 5, 16, 11, 5);
      this.graphics.fillStyle(0xf7e6b9, 1);
      this.graphics.fillRect(x - 5, y - 2, 10, 3);
      return;
    }
    this.graphics.fillTriangle(x, y - 9, x - 7, y + 6, x + 7, y + 6);
    this.graphics.fillCircle(x, y + 4, 7);
  }

  destroy() {
    this.graphics.destroy();
    this.labels.forEach((label) => label.destroy());
  }
}

function normalizeValue(value) {
  return Number.isFinite(value) ? clamp(value) : SURVIVAL_CONFIG.initialValue;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function textStyle(size, color) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: 'bold'
  };
}
