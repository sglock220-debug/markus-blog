export const ITEM_TYPES = {
  TOOL: 'tool',
  SEED: 'seed',
  CROP: 'crop',
  CURRENCY: 'currency',
  CONTAINER: 'container'
};

export const ITEM_IDS = {
  HOE: 'hoe',
  WATERING_CAN: 'wateringCan',
  RADISH_SEED: 'radishSeed',
  RADISH: 'radish',
  COIN: 'coin',
  BACKPACK: 'backpack'
};

export const ITEMS = {
  [ITEM_IDS.HOE]: {
    id: ITEM_IDS.HOE,
    name: '锄头',
    iconKey: 'item-hoe',
    type: ITEM_TYPES.TOOL,
    action: 'hoe'
  },
  [ITEM_IDS.WATERING_CAN]: {
    id: ITEM_IDS.WATERING_CAN,
    name: '喷壶',
    iconKey: 'item-watering-can',
    type: ITEM_TYPES.TOOL,
    action: 'water'
  },
  [ITEM_IDS.RADISH_SEED]: {
    id: ITEM_IDS.RADISH_SEED,
    name: '萝卜种子',
    iconKey: 'item-radish-seed',
    type: ITEM_TYPES.SEED,
    cropId: 'radish'
  },
  [ITEM_IDS.RADISH]: {
    id: ITEM_IDS.RADISH,
    name: '萝卜',
    iconKey: 'item-radish',
    type: ITEM_TYPES.CROP
  },
  [ITEM_IDS.COIN]: {
    id: ITEM_IDS.COIN,
    name: '金币',
    iconKey: null,
    type: ITEM_TYPES.CURRENCY
  },
  [ITEM_IDS.BACKPACK]: {
    id: ITEM_IDS.BACKPACK,
    name: '背包',
    iconKey: 'item-backpack',
    type: ITEM_TYPES.CONTAINER,
    action: 'openInventory'
  }
};

export const INITIAL_HOTBAR = [
  { itemId: ITEM_IDS.HOE, quantity: 1 },
  { itemId: ITEM_IDS.WATERING_CAN, quantity: 1 },
  { itemId: ITEM_IDS.RADISH_SEED, quantity: 10 },
  { itemId: ITEM_IDS.RADISH, quantity: 0 },
  { itemId: ITEM_IDS.BACKPACK, quantity: 1 }
];

export const INITIAL_GOLD = 100;
