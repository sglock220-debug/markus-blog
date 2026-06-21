export const SAVE_CONFIG = {
  key: 'reid-manor-save',
  slotsKey: 'reid-manor-save-slots',
  activeSlotKey: 'reid-manor-active-slot',
  version: 6,
  maxSlots: 5
};

export const TIME_CONFIG = {
  realMsPerGameMinute: 1000,
  startDay: 1,
  startHour: 6,
  startMinute: 0,
  dayEndHour: 24,
  minutesPerDay: 24 * 60,
  daysPerSeason: 7,
  seasons: ['春季', '夏季', '秋季', '冬季'],
  weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
};

export const WEATHER = {
  SUNNY: 'sunny',
  CLOUDY: 'cloudy',
  RAINY: 'rainy',
  labels: {
    sunny: '晴',
    cloudy: '阴',
    rainy: '雨'
  },
  cloudyChance: 0.28
};

export const SURVIVAL_CONFIG = {
  initialValue: 100,
  hungerLossPerGameMinute: 100 / (8 * 60),
  thirstLossPerGameMinute: 100 / (6 * 60),
  healthLossPerGameMinute: 0.06,
  breadRestore: 28,
  waterRestore: 36,
  radishHungerRestore: 14,
  radishHealthRestore: 3
};

export const ECONOMY_CONFIG = {
  axe: { buy: 160, sell: 80 },
  hoe: { buy: 140, sell: 70 },
  shovel: { buy: 120, sell: 60 },
  wateringCan: { buy: 180, sell: 90 },
  fuelCan: { buy: 60, sell: 30 },
  sapling: { buy: 50, sell: 20 },
  radishSeed: { buy: 10, sell: 4 },
  clothHat: { buy: 120, sell: 60 },
  clothTop: { buy: 200, sell: 100 },
  clothPants: { buy: 150, sell: 75 },
  clothShoes: { buy: 100, sell: 50 },
  clothRing: { buy: 300, sell: 150 },
  radish: { buy: 42, sell: 35 },
  wheatSeed: { buy: 12, sell: 5 },
  wheat: { buy: 24, sell: 14 },
  flour: { buy: 38, sell: 24 },
  bread: { buy: 24, sell: 14 },
  water: { buy: 18, sell: 10 },
  emptyBottle: { buy: 6, sell: 3 },
  wood: { buy: 16, sell: 8 },
  stone: { buy: 14, sell: 7 },
  medicineSmall: { buy: 45, sell: 22 },
  medicineMedium: { buy: 90, sell: 45 },
  medicineLarge: { buy: 160, sell: 80 }
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
  breadPrice: 24,
  waterPrice: 18,
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

export function getWeatherPlanForWeek(weekIndex) {
  const firstDay = weekIndex * 7 + 1;
  const candidates = [1, 2, 3, 4, 5, 6];
  candidates.sort((a, b) => seededValue(weekIndex * 17 + a) - seededValue(weekIndex * 17 + b));
  const rainCount = seededValue(weekIndex + 91) < 0.5 ? 1 : 2;
  const rainOffsets = new Set(candidates.slice(0, rainCount));
  const plan = {};

  for (let offset = 0; offset < 7; offset += 1) {
    const day = firstDay + offset;
    if (offset === 0) {
      plan[day] = WEATHER.SUNNY;
    } else if (rainOffsets.has(offset)) {
      plan[day] = WEATHER.RAINY;
    } else {
      plan[day] = seededValue(day * 29 + 7) < WEATHER.cloudyChance ? WEATHER.CLOUDY : WEATHER.SUNNY;
    }
  }

  return plan;
}

export function getWeatherForDay(day) {
  const weekIndex = Math.floor((Math.max(1, day) - 1) / 7);
  return getWeatherPlanForWeek(weekIndex)[day] || WEATHER.SUNNY;
}

function seededValue(seed) {
  return ((seed * 9301 + 49297) % 233280) / 233280;
}
