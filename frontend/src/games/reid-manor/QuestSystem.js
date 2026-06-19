import { DAILY_QUEST_CONFIG } from './config';
import { ITEM_IDS } from './items';

export default class QuestSystem {
  constructor(scene, savedQuest = {}) {
    this.scene = scene;
    this.state = this.normalize(savedQuest, scene.gameTime.getDay());
    this.layer = null;
  }

  ensureForDay(day) {
    if (this.state.day === day) return;
    this.state = createQuestState(day);
  }

  recordHarvest(itemId, quantity = 1) {
    if (itemId !== DAILY_QUEST_CONFIG.targetItemId || this.state.completed) return;
    this.state.progress = Math.min(DAILY_QUEST_CONFIG.targetCount, this.state.progress + quantity);
    this.state.completed = this.state.progress >= DAILY_QUEST_CONFIG.targetCount;
  }

  open() {
    this.close();
    this.render();
  }

  render() {
    this.close();
    const layer = this.scene.add.container(0, 0);
    layer.setDepth(83);
    layer.setScrollFactor(0);
    this.layer = layer;

    const overlay = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.42);
    overlay.setOrigin(0, 0);
    overlay.setInteractive();
    overlay.on('pointerdown', () => this.close());

    const width = 480;
    const height = 260;
    const x = (this.scene.scale.width - width) / 2;
    const y = (this.scene.scale.height - height) / 2;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0xffffff, 0.97);
    panel.fillRoundedRect(x, y, width, height, 10);
    panel.lineStyle(2, 0xeeeeee, 1);
    panel.strokeRoundedRect(x, y, width, height, 10);

    const title = this.scene.add.text(x + 24, y + 18, '小镇公告板', style(21, '#333333', true));
    const quest = this.scene.add.text(x + 24, y + 62, DAILY_QUEST_CONFIG.title, style(17, '#333333', true));
    const desc = this.scene.add.text(x + 24, y + 96, DAILY_QUEST_CONFIG.description, style(15, '#666666'));
    const progress = this.scene.add.text(
      x + 24,
      y + 132,
      `进度：${this.state.progress} / ${DAILY_QUEST_CONFIG.targetCount}`,
      style(16, '#333333')
    );
    const reward = this.scene.add.text(x + 24, y + 164, `奖励：${DAILY_QUEST_CONFIG.rewardGold} 金币`, style(15, '#666666'));
    const status = this.scene.add.text(x + 250, y + 132, this.getStatusText(), style(15, '#4a90e2', true));

    const claim = this.makeButton(x + 24, y + 200, 140, 42, '领取奖励', () => this.claimReward());
    const close = this.makeButton(x + 322, y + 200, 116, 42, '关闭', () => this.close(), 0xe74c3c);

    layer.add([overlay, panel, title, quest, desc, progress, reward, status, ...claim, ...close]);
  }

  claimReward() {
    if (!this.state.completed) {
      this.scene.showMessage('任务还没有完成');
      return;
    }

    if (this.state.rewardClaimed) {
      this.scene.showMessage('今天的奖励已经领取过了');
      return;
    }

    this.state.rewardClaimed = true;
    this.scene.inventory.addItem(ITEM_IDS.COIN, DAILY_QUEST_CONFIG.rewardGold);
    this.scene.showMessage('领取了每日任务奖励');
    this.scene.saveNow();
    this.render();
  }

  getStatusText() {
    if (this.state.rewardClaimed) return '已领取';
    if (this.state.completed) return '可领取';
    return '进行中';
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

  normalize(savedQuest, day) {
    if (!savedQuest || savedQuest.id !== DAILY_QUEST_CONFIG.id || savedQuest.day !== day) {
      return createQuestState(day);
    }

    return {
      id: DAILY_QUEST_CONFIG.id,
      day,
      progress: Math.max(0, Math.min(DAILY_QUEST_CONFIG.targetCount, savedQuest.progress || 0)),
      completed: Boolean(savedQuest.completed),
      rewardClaimed: Boolean(savedQuest.rewardClaimed)
    };
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

function createQuestState(day) {
  return {
    id: DAILY_QUEST_CONFIG.id,
    day,
    progress: 0,
    completed: false,
    rewardClaimed: false
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
