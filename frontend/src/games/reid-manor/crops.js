export const CROP_IDS = {
  RADISH: 'radish',
  WHEAT: 'wheat'
};

export const CROPS = {
  [CROP_IDS.RADISH]: {
    id: CROP_IDS.RADISH,
    name: '萝卜',
    seedItemId: 'radishSeed',
    harvestItemId: 'radish',
    harvestQuantity: 1,
    growthMinutes: [0, 2, 4],
    matureMinutes: 6,
    stages: [
      { id: 'seedling', label: '幼苗' },
      { id: 'growing', label: '成长中' },
      { id: 'mature', label: '成熟' }
    ]
  },
  [CROP_IDS.WHEAT]: {
    id: CROP_IDS.WHEAT,
    name: '小麦',
    seedItemId: 'wheatSeed',
    harvestItemId: 'wheat',
    harvestQuantity: 2,
    growthMinutes: [0, 3, 6],
    matureMinutes: 9,
    stages: [
      { id: 'sprout', label: '嫩芽' },
      { id: 'stem', label: '抽穗' },
      { id: 'mature', label: '成熟' }
    ]
  }
};
