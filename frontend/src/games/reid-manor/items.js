export const ITEM_TYPES = {
  TOOL: 'tool',
  SEED: 'seed',
  CROP: 'crop',
  CURRENCY: 'currency',
  CONTAINER: 'container',
  MATERIAL: 'material',
  CONSUMABLE: 'consumable',
  EMPTY: 'empty'
};

export const ITEM_IDS = {
  HOE: 'hoe',
  AXE: 'axe',
  SHOVEL: 'shovel',
  WATERING_CAN: 'wateringCan',
  FUEL_CAN: 'fuelCan',
  SAPLING: 'sapling',
  RADISH_SEED: 'radishSeed',
  RADISH: 'radish',
  COIN: 'coin',
  BACKPACK: 'backpack',
  WOOD: 'wood',
  STONE: 'stone',
  BREAD: 'bread',
  WATER: 'water',
  EMPTY_BOTTLE: 'emptyBottle',
  WHEAT_SEED: 'wheatSeed',
  WHEAT: 'wheat',
  FLOUR: 'flour',
  MEDICINE_SMALL: 'medicineSmall',
  MEDICINE_MEDIUM: 'medicineMedium',
  MEDICINE_LARGE: 'medicineLarge',
  CLOTH_HAT: 'clothHat',
  CLOTH_TOP: 'clothTop',
  CLOTH_PANTS: 'clothPants',
  CLOTH_SHOES: 'clothShoes',
  CLOTH_RING: 'clothRing',
  SMALL_GENERATOR: 'smallGenerator',
  MEDIUM_GENERATOR: 'mediumGenerator',
  LARGE_GENERATOR: 'largeGenerator',
  EMPTY: 'empty'
};

export const ITEMS = {
  [ITEM_IDS.AXE]: {
    id: ITEM_IDS.AXE,
    name: '斧头',
    iconKey: 'item-axe',
    type: ITEM_TYPES.TOOL,
    action: 'axe'
  },
  [ITEM_IDS.HOE]: {
    id: ITEM_IDS.HOE,
    name: '锄头',
    iconKey: 'item-hoe',
    type: ITEM_TYPES.TOOL,
    action: 'hoe'
  },
  [ITEM_IDS.SHOVEL]: {
    id: ITEM_IDS.SHOVEL,
    name: '铲子',
    iconKey: 'item-shovel',
    type: ITEM_TYPES.TOOL,
    action: 'shovel'
  },
  [ITEM_IDS.WATERING_CAN]: {
    id: ITEM_IDS.WATERING_CAN,
    name: '喷壶',
    iconKey: 'item-watering-can',
    type: ITEM_TYPES.TOOL,
    action: 'water',
    maxWater: 20
  },
  [ITEM_IDS.FUEL_CAN]: {
    id: ITEM_IDS.FUEL_CAN,
    name: '燃油桶',
    iconKey: 'item-fuel',
    type: ITEM_TYPES.MATERIAL,
    action: 'refillGenerator'
  },
  [ITEM_IDS.SAPLING]: {
    id: ITEM_IDS.SAPLING,
    name: '树苗',
    iconKey: 'item-sapling',
    type: ITEM_TYPES.MATERIAL,
    action: 'plantSapling'
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
    type: ITEM_TYPES.CROP,
    action: 'eatRadish'
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
  },
  [ITEM_IDS.WOOD]: {
    id: ITEM_IDS.WOOD,
    name: '木材',
    iconKey: 'item-wood',
    type: ITEM_TYPES.MATERIAL
  },
  [ITEM_IDS.STONE]: {
    id: ITEM_IDS.STONE,
    name: '石头',
    iconKey: 'item-stone',
    type: ITEM_TYPES.MATERIAL
  },
  [ITEM_IDS.BREAD]: {
    id: ITEM_IDS.BREAD,
    name: '面包',
    iconKey: 'item-bread',
    type: ITEM_TYPES.CONSUMABLE,
    action: 'eat'
  },
  [ITEM_IDS.WATER]: {
    id: ITEM_IDS.WATER,
    name: '水瓶',
    iconKey: 'item-water',
    type: ITEM_TYPES.CONSUMABLE,
    action: 'drink',
    returnsItemId: ITEM_IDS.EMPTY_BOTTLE
  },
  [ITEM_IDS.EMPTY_BOTTLE]: {
    id: ITEM_IDS.EMPTY_BOTTLE,
    name: '空瓶子',
    iconKey: 'item-empty-bottle',
    type: ITEM_TYPES.MATERIAL
  },
  [ITEM_IDS.WHEAT_SEED]: {
    id: ITEM_IDS.WHEAT_SEED,
    name: '小麦种子',
    iconKey: 'item-wheat-seed',
    type: ITEM_TYPES.SEED,
    cropId: 'wheat'
  },
  [ITEM_IDS.WHEAT]: {
    id: ITEM_IDS.WHEAT,
    name: '小麦',
    iconKey: 'item-wheat',
    type: ITEM_TYPES.CROP
  },
  [ITEM_IDS.FLOUR]: {
    id: ITEM_IDS.FLOUR,
    name: '面粉',
    iconKey: 'item-flour',
    type: ITEM_TYPES.MATERIAL
  },
  [ITEM_IDS.MEDICINE_SMALL]: {
    id: ITEM_IDS.MEDICINE_SMALL,
    name: '小瓶药剂',
    iconKey: 'item-medicine-small',
    type: ITEM_TYPES.CONSUMABLE,
    action: 'heal',
    healAmount: 20
  },
  [ITEM_IDS.MEDICINE_MEDIUM]: {
    id: ITEM_IDS.MEDICINE_MEDIUM,
    name: '标准药剂',
    iconKey: 'item-medicine-medium',
    type: ITEM_TYPES.CONSUMABLE,
    action: 'heal',
    healAmount: 45
  },
  [ITEM_IDS.MEDICINE_LARGE]: {
    id: ITEM_IDS.MEDICINE_LARGE,
    name: '强效药剂',
    iconKey: 'item-medicine-large',
    type: ITEM_TYPES.CONSUMABLE,
    action: 'heal',
    healAmount: 80
  },
  [ITEM_IDS.CLOTH_HAT]: {
    id: ITEM_IDS.CLOTH_HAT,
    name: '草帽',
    iconKey: 'item-cloth-hat',
    type: 'equipment',
    slot: 'hat',
    color: 0xffeb3b
  },
  [ITEM_IDS.CLOTH_TOP]: {
    id: ITEM_IDS.CLOTH_TOP,
    name: '工作服',
    iconKey: 'item-cloth-top',
    type: 'equipment',
    slot: 'top',
    color: 0x2196f3
  },
  [ITEM_IDS.CLOTH_PANTS]: {
    id: ITEM_IDS.CLOTH_PANTS,
    name: '耐磨长裤',
    iconKey: 'item-cloth-pants',
    type: 'equipment',
    slot: 'pants',
    color: 0x4caf50
  },
  [ITEM_IDS.CLOTH_SHOES]: {
    id: ITEM_IDS.CLOTH_SHOES,
    name: '皮靴',
    iconKey: 'item-cloth-shoes',
    type: 'equipment',
    slot: 'shoes',
    color: 0x795548
  },
  [ITEM_IDS.CLOTH_RING]: {
    id: ITEM_IDS.CLOTH_RING,
    name: '幸运戒指',
    iconKey: 'item-cloth-ring',
    type: 'equipment',
    slot: 'ring',
    color: 0x9c27b0
  },
  [ITEM_IDS.SMALL_GENERATOR]: {
    id: ITEM_IDS.SMALL_GENERATOR,
    name: '小型发动机',
    iconKey: 'furn-gen-s',
    type: 'furniture',
    action: 'placeFurniture'
  },
  [ITEM_IDS.MEDIUM_GENERATOR]: {
    id: ITEM_IDS.MEDIUM_GENERATOR,
    name: '中型发动机',
    iconKey: 'furn-gen-m',
    type: 'furniture',
    action: 'placeFurniture'
  },
  [ITEM_IDS.LARGE_GENERATOR]: {
    id: ITEM_IDS.LARGE_GENERATOR,
    name: '大型发动机',
    iconKey: 'furn-gen-l',
    type: 'furniture',
    action: 'placeFurniture'
  },
  [ITEM_IDS.EMPTY]: {
    id: ITEM_IDS.EMPTY,
    name: '空位',
    iconKey: null,
    type: ITEM_TYPES.EMPTY
  }
};

export const INITIAL_HOTBAR = [
  { itemId: ITEM_IDS.AXE, quantity: 1 },
  { itemId: ITEM_IDS.HOE, quantity: 1 },
  { itemId: ITEM_IDS.SHOVEL, quantity: 1 },
  { itemId: ITEM_IDS.WATERING_CAN, quantity: 1 },
  { itemId: ITEM_IDS.SAPLING, quantity: 5 },
  { itemId: ITEM_IDS.RADISH_SEED, quantity: 10 },
  { itemId: ITEM_IDS.RADISH, quantity: 0 },
  { itemId: ITEM_IDS.WOOD, quantity: 12 },
  { itemId: ITEM_IDS.STONE, quantity: 8 },
  { itemId: ITEM_IDS.EMPTY, quantity: 0 }
];

export const INITIAL_GOLD = 100;
