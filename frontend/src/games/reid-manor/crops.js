export const CROP_IDS = {
  RADISH: 'radish'
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
  }
};
