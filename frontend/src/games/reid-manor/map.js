export const TILE_SIZE = 32;
export const MAP_COLUMNS = 42;
export const MAP_ROWS = 18;
export const WORLD_WIDTH = MAP_COLUMNS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;

export const COLORS = {
  grass: 0x7fbd61,
  grassAlt: 0x74b658,
  dirt: 0xa86c3f,
  dirtDark: 0x85512f,
  road: 0xc8a56b,
  roadDark: 0xa9854f,
  water: 0x4aa6d9,
  waterDark: 0x2f83b8,
  treeTop: 0x2f8a45,
  treeShadow: 0x246b36,
  treeTrunk: 0x7d4d2f,
  stone: 0x8d9298,
  stoneDark: 0x656a70,
  houseWall: 0xd89d65,
  houseRoof: 0x9f3f35,
  houseDoor: 0x6b3f2a,
  wellStone: 0x9ca4aa,
  crate: 0xa66b35,
  crateDark: 0x73461f,
  shopWall: 0xd8b574,
  shopRoof: 0x5c6f9f,
  townStone: 0xb8b1a3,
  board: 0x8b5a2b,
  outline: 0x3e3528
};

export const FARM_PLOTS = [
  { x: 10, y: 3, width: 7, height: 4 },
  { x: 10, y: 8, width: 5, height: 3 }
];

export const ROAD_TILES = [
  ...line(5, 6, 5, 15),
  ...line(6, 11, 15, 11),
  ...line(15, 6, 15, 10),
  ...line(16, 6, 19, 6),
  ...line(18, 7, 18, 14),
  ...line(19, 14, 34, 14),
  ...line(34, 8, 34, 13),
  ...line(30, 8, 38, 8),
  ...line(31, 5, 31, 8)
];

export const WATER_AREAS = [
  { id: 'pond', x: 22, y: 9, width: 4, height: 4 },
  { id: 'stream', x: 24, y: 5, width: 2, height: 4 }
];

export const HOUSE = {
  id: 'house',
  x: 3,
  y: 2,
  width: 5,
  height: 4,
  label: '房屋',
  message: '木屋还很安静，未来会成为庄园的家。'
};

export const WELL = {
  id: 'well',
  x: 19,
  y: 4,
  width: 1,
  height: 1,
  label: '水井',
  message: '井水清凉，之后可以用来照料农田。'
};

export const CRATE = {
  id: 'crate',
  x: 7,
  y: 11,
  width: 1,
  height: 1,
  label: '木箱',
  message: '木箱里暂时空空如也，背包系统以后再来。'
};

export const SHOP = {
  id: 'shop',
  x: 30,
  y: 2,
  width: 5,
  height: 4,
  label: '商店'
};

export const NOTICE_BOARD = {
  id: 'noticeBoard',
  x: 36,
  y: 7,
  width: 1,
  height: 2,
  label: '公告板'
};

export const TOWN_FLOWERS = [
  { x: 29, y: 10 },
  { x: 32, y: 12 },
  { x: 38, y: 11 },
  { x: 39, y: 15 }
];

export const NPCS = [
  {
    id: 'erin',
    name: '艾琳',
    x: 31,
    y: 9,
    color: 0xce6b8f,
    dialog: '今天的萝卜长势不错。小镇厨房正缺新鲜蔬菜呢。',
    patrol: [{ x: 31, y: 9 }, { x: 33, y: 9 }]
  },
  {
    id: 'thomas',
    name: '托马斯',
    x: 37,
    y: 10,
    color: 0x4f7fb8,
    dialog: '商店的种子很实惠，先买一点试试手感吧。',
    patrol: [{ x: 37, y: 10 }, { x: 37, y: 12 }]
  },
  {
    id: 'mia',
    name: '米娅',
    x: 33,
    y: 15,
    color: 0xd9a441,
    dialog: '公告板每天都会换委托，记得来看看。',
    patrol: [{ x: 33, y: 15 }, { x: 35, y: 15 }]
  },
  {
    id: 'gray',
    name: '老格雷',
    x: 39,
    y: 6,
    color: 0x8d8278,
    dialog: '庄园生活慢一点也没关系，重要的是每天都照看土地。',
    patrol: null
  }
];

export const TREES = [
  { id: 'tree-1', x: 2, y: 8 },
  { id: 'tree-2', x: 4, y: 13 },
  { id: 'tree-3', x: 8, y: 15 },
  { id: 'tree-4', x: 20, y: 2 },
  { id: 'tree-5', x: 23, y: 3 },
  { id: 'tree-6', x: 25, y: 14 }
];

export const STONES = [
  { id: 'stone-1', x: 12, y: 14 },
  { id: 'stone-2', x: 14, y: 15 },
  { id: 'stone-3', x: 21, y: 7 },
  { id: 'stone-4', x: 26, y: 8 }
];

export const INTERACTIVE_OBJECTS = [HOUSE, WELL, CRATE, SHOP, NOTICE_BOARD];

export const COLLISION_RECTS = [
  HOUSE,
  WELL,
  CRATE,
  SHOP,
  NOTICE_BOARD,
  ...WATER_AREAS,
  ...TREES.map((tree) => ({ ...tree, width: 1, height: 2 })),
  ...STONES.map((stone) => ({ ...stone, width: 1, height: 1 }))
].map(toWorldRect);

export function toWorldRect(item) {
  return {
    id: item.id,
    x: item.x * TILE_SIZE,
    y: item.y * TILE_SIZE,
    width: item.width * TILE_SIZE,
    height: item.height * TILE_SIZE
  };
}

function line(x1, y1, x2, y2) {
  const tiles = [];
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x1;
  let y = y1;

  tiles.push({ x, y });

  while (x !== x2 || y !== y2) {
    if (x !== x2) x += dx;
    if (y !== y2) y += dy;
    tiles.push({ x, y });
  }

  return tiles;
}
