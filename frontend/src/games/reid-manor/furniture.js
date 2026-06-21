export const GRID_SIZE = 32;

export const FURNITURE_CATEGORIES = {
  ALL: '全部',
  BEDROOM: '卧室',
  LIVING: '客厅',
  KITCHEN: '厨房',
  STORAGE: '收纳',
  LIGHTING: '照明',
  APPLIANCES: '电器',
  DECOR: '装饰',
  PRODUCTION: '生产'
};

export const FURNITURE_DEFS = {
  // Bedroom
  singleBed: { type: 'singleBed', label: '单人床', category: FURNITURE_CATEGORIES.BEDROOM, gridWidth: 1, gridHeight: 2, buy: 180, sell: 90, thumbnail: 'furn-bed-s' },
  doubleBed: { type: 'doubleBed', label: '双人床', category: FURNITURE_CATEGORIES.BEDROOM, gridWidth: 2, gridHeight: 2, buy: 320, sell: 160, thumbnail: 'furn-bed-d' },
  wardrobe: { type: 'wardrobe', label: '衣柜', category: FURNITURE_CATEGORIES.BEDROOM, gridWidth: 1, gridHeight: 2, buy: 170, sell: 85, thumbnail: 'furn-wardrobe' },
  
  // Living Room
  sofa: { type: 'sofa', label: '沙发', category: FURNITURE_CATEGORIES.LIVING, gridWidth: 2, gridHeight: 1, buy: 200, sell: 100, thumbnail: 'furn-sofa' },
  tv: { type: 'tv', label: '电视', category: FURNITURE_CATEGORIES.LIVING, gridWidth: 1, gridHeight: 1, buy: 450, sell: 220, powered: true, powerRequired: 5, thumbnail: 'furn-tv' },
  bookcase: { type: 'bookcase', label: '书柜', category: FURNITURE_CATEGORIES.LIVING, gridWidth: 1, gridHeight: 2, buy: 150, sell: 75, thumbnail: 'furn-bookcase' },
  
  // Kitchen
  table: { type: 'table', label: '餐桌', category: FURNITURE_CATEGORIES.KITCHEN, gridWidth: 2, gridHeight: 2, buy: 140, sell: 70, thumbnail: 'furn-table' },
  chair: { type: 'chair', label: '椅子', category: FURNITURE_CATEGORIES.KITCHEN, gridWidth: 1, gridHeight: 1, buy: 60, sell: 30, thumbnail: 'furn-chair' },
  stove: { type: 'stove', label: '灶台', category: FURNITURE_CATEGORIES.KITCHEN, gridWidth: 2, gridHeight: 1, buy: 220, sell: 110, powered: true, powerRequired: 10, thumbnail: 'furn-stove' },
  fridge: { type: 'fridge', label: '冰箱', category: FURNITURE_CATEGORIES.KITCHEN, gridWidth: 1, gridHeight: 2, buy: 580, sell: 290, powered: true, powerRequired: 8, thumbnail: 'furn-fridge' },
  
  // Storage
  box: { type: 'box', label: '箱子', category: FURNITURE_CATEGORIES.STORAGE, gridWidth: 1, gridHeight: 1, buy: 80, sell: 40, thumbnail: 'furn-box' },
  locker: { type: 'locker', label: '储物柜', category: FURNITURE_CATEGORIES.STORAGE, gridWidth: 1, gridHeight: 2, buy: 190, sell: 95, thumbnail: 'furn-locker' },
  
  // Lighting
  wallLamp: { type: 'wallLamp', label: '壁灯', category: FURNITURE_CATEGORIES.LIGHTING, gridWidth: 1, gridHeight: 1, buy: 40, sell: 20, powered: true, powerRequired: 2, thumbnail: 'furn-lamp-w' },
  floorLamp: { type: 'floorLamp', label: '落地灯', category: FURNITURE_CATEGORIES.LIGHTING, gridWidth: 1, gridHeight: 1, buy: 90, sell: 45, powered: true, powerRequired: 2, thumbnail: 'furn-lamp-f' },
  
  // Decor
  carpet: { type: 'carpet', label: '地毯', category: FURNITURE_CATEGORIES.DECOR, gridWidth: 3, gridHeight: 2, buy: 120, sell: 60, walkable: true, thumbnail: 'furn-carpet' },
  pottedPlant: { type: 'pottedPlant', label: '盆栽', category: FURNITURE_CATEGORIES.DECOR, gridWidth: 1, gridHeight: 1, buy: 50, sell: 25, thumbnail: 'furn-plant' },
  windowDecor: { type: 'windowDecor', label: '窗户装饰', category: FURNITURE_CATEGORIES.DECOR, gridWidth: 1, gridHeight: 1, buy: 35, sell: 15, thumbnail: 'furn-window' },
  
  // Production
  workbench: { type: 'workbench', label: '工作台', category: FURNITURE_CATEGORIES.PRODUCTION, gridWidth: 2, gridHeight: 1, buy: 280, sell: 140, thumbnail: 'furn-workbench' },
  smallGenerator: { type: 'smallGenerator', label: '小型发动机', category: FURNITURE_CATEGORIES.PRODUCTION, gridWidth: 1, gridHeight: 1, buy: 300, sell: 150, powerOutput: 10, fuelConsumption: 2, thumbnail: 'furn-gen-s' },
  mediumGenerator: { type: 'mediumGenerator', label: '中型发动机', category: FURNITURE_CATEGORIES.PRODUCTION, gridWidth: 1, gridHeight: 1, buy: 600, sell: 300, powerOutput: 20, fuelConsumption: 4, thumbnail: 'furn-gen-m' },
  largeGenerator: { type: 'largeGenerator', label: '大型发动机', category: FURNITURE_CATEGORIES.PRODUCTION, gridWidth: 2, gridHeight: 1, buy: 1200, sell: 600, powerOutput: 40, fuelConsumption: 8, thumbnail: 'furn-gen-l' }
};

export function makeFurniture(type, id, gridX, gridY, extra = {}) {
  const definition = FURNITURE_DEFS[type];
  const powerProps = {};
  
  if (definition.powered) {
    powerProps.isOn = extra.isOn ?? true;
    powerProps.hasPower = extra.hasPower ?? false;
  }
  
  if (definition.powerOutput) {
    powerProps.fuel = extra.fuel ?? 0;
    powerProps.maxFuel = 20;
    powerProps.isGeneratorOn = extra.isGeneratorOn ?? true;
  }

  return {
    surfaceItemId: null,
    ...powerProps,
    ...extra,
    id,
    type,
    label: definition.label,
    gridX,
    gridY,
    width: definition.gridWidth * GRID_SIZE,
    height: definition.gridHeight * GRID_SIZE
  };
}

export function createDefaultFurniture() {
  return [
    makeFurniture('singleBed', 'single-bed-1', 1, 0),
    makeFurniture('table', 'table-1', 10, 4),
    makeFurniture('chair', 'chair-1', 13, 5),
    makeFurniture('wardrobe', 'wardrobe-1', 19, 0),
    makeFurniture('stove', 'stove-1', 17, 10)
  ];
}
