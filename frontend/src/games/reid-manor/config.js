export const SAVE_CONFIG = {
  key: 'reid-manor-save',
  slotsKey: 'reid-manor-save-slots',
  activeSlotKey: 'reid-manor-active-slot',
  version: 2,
  maxSlots: 5
};

export const TIME_CONFIG = {
  realMsPerGameMinute: 1000,
  startDay: 1,
  startHour: 6,
  startMinute: 0,
  sleepHour: 22,
  minutesPerDay: 24 * 60,
  weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
};

export const WEATHER = {
  SUNNY: 'sunny',
  RAINY: 'rainy',
  labels: {
    sunny: '晴天',
    rainy: '雨天'
  },
  rainChance: 0.32
};

export const PLAYER_CONFIG = {
  startX: 9 * 32,
  startY: 9 * 32,
  homeX: 8 * 32,
  homeY: 6 * 32,
  direction: 'down'
};

export const CHARACTER_CONFIG = {
  defaultName: '旅行者',
  nameMinLength: 2,
  nameMaxLength: 12,
  hairstyles: [
    { id: 'short', label: '短发', color: 0x5e3b22 },
    { id: 'bob', label: '圆发', color: 0x2f251f },
    { id: 'wave', label: '卷发', color: 0x7b4a2a },
    { id: 'cap', label: '帽檐', color: 0x3f6542 }
  ],
  skinTones: [
    { id: 'warm', label: '暖杏', color: 0xf0bd8b },
    { id: 'tan', label: '麦色', color: 0xc8895c },
    { id: 'deep', label: '棕肤', color: 0x8f5d3e }
  ],
  outfits: [
    { id: 'blue', label: '蓝衣', color: 0x2c5f9e },
    { id: 'green', label: '绿衣', color: 0x3f8c55 },
    { id: 'red', label: '红衣', color: 0xb84f4a },
    { id: 'violet', label: '紫衣', color: 0x6958a8 }
  ]
};

export const AUTO_SAVE_INTERVAL_MS = 5000;

export const SHOP_CONFIG = {
  radishSeedPrice: 10,
  radishSellPrice: 35,
  maxBuyQuantity: 99
};

export const DAILY_QUEST_CONFIG = {
  id: 'harvestRadishes',
  title: '今日委托：收获萝卜',
  description: '收获 3 个萝卜，交给公告板登记。',
  targetItemId: 'radish',
  targetCount: 3,
  rewardGold: 80
};

export function getWeatherForDay(day) {
  const value = ((day * 9301 + 49297) % 233280) / 233280;
  return value < WEATHER.rainChance ? WEATHER.RAINY : WEATHER.SUNNY;
}
