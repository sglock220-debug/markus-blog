export const TILE_SIZE = 32;
export const MAP_COLUMNS = 56;
export const MAP_ROWS = 30; // 增加了 6 行 (原 24)
export const WORLD_WIDTH = MAP_COLUMNS * TILE_SIZE;
export const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE;
export const VIEW_WIDTH = 1024;
export const VIEW_HEIGHT = 576;

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
  ...line(31, 5, 31, 8),
  ...line(38, 8, 50, 8),
  ...line(46, 5, 46, 18),
  ...line(34, 18, 50, 18)
];

const ROAD_TILE_KEYS = new Set(ROAD_TILES.map(({ x, y }) => `${x},${y}`));

export function isRoadTile(tileX, tileY) {
  return ROAD_TILE_KEYS.has(`${tileX},${tileY}`);
}

export const WATER_AREAS = [
  { id: 'pond', x: 22, y: 9, width: 4, height: 4 },
  { id: 'stream', x: 24, y: 5, width: 2, height: 4 }
];

export function isWaterTile(tileX, tileY) {
  return WATER_AREAS.some((area) =>
    tileX >= area.x && tileX < area.x + area.width &&
    tileY >= area.y && tileY < area.y + area.height
  );
}

export function isTileInWorld(tileX, tileY) {
  return Number.isInteger(tileX) && Number.isInteger(tileY) &&
    tileX >= 0 && tileY >= 0 && tileX < MAP_COLUMNS && tileY < MAP_ROWS;
}

export function isGrassTile(tileX, tileY) {
  return isTileInWorld(tileX, tileY) && !isRoadTile(tileX, tileY) && !isWaterTile(tileX, tileY);
}

export function canPlaceChestOnTerrain(tileX, tileY) {
  return isTileInWorld(tileX, tileY) && (isGrassTile(tileX, tileY) || isRoadTile(tileX, tileY));
}

export function isPointInWater(worldX, worldY) {
  return isWaterTile(Math.floor(worldX / TILE_SIZE), Math.floor(worldY / TILE_SIZE));
}

export function isNearWater(worldX, worldY, maxDist = TILE_SIZE / 2) {
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);

  // If already in water, we are swimming, not refilling from the shore
  if (isWaterTile(tileX, tileY)) return false;

  // Check 3x3 grid around the point
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = tileX + dx;
      const ty = tileY + dy;
      if (isWaterTile(tx, ty)) {
        // Closest point on the water tile rectangle to the given world point
        const rectLeft = tx * TILE_SIZE;
        const rectRight = (tx + 1) * TILE_SIZE;
        const rectTop = ty * TILE_SIZE;
        const rectBottom = (ty + 1) * TILE_SIZE;

        let dx2 = 0;
        if (worldX < rectLeft) dx2 = rectLeft - worldX;
        else if (worldX > rectRight) dx2 = worldX - rectRight;

        let dy2 = 0;
        if (worldY < rectTop) dy2 = rectTop - worldY;
        else if (worldY > rectBottom) dy2 = worldY - rectBottom;

        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) <= maxDist) return true;
      }
    }
  }
  return false;
}

export const HOUSE = {
  id: 'house',
  x: 3,
  y: 2,
  width: 5,
  height: 4,
  footprintOffsetY: 2,
  footprintHeight: 2,
  label: '房屋',
  message: '木屋还很安静，未来会成为庄园的家。'
};

export const HOUSE_DOOR = {
  id: 'houseDoor',
  x: 5,
  y: 5,
  width: 1,
  height: 1,
  label: '家门'
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

export const POND_INTERACTION = {
  id: 'pondWater',
  x: 22,
  y: 9,
  width: 4,
  height: 4,
  label: '池塘'
};

export const TRASH_CAN = {
  id: 'trashCan', x: 8, y: 5, width: 1, height: 1, label: '垃圾箱'
};

export const SHOP = {
  id: 'shop',
  x: 30,
  y: 2,
  width: 5,
  height: 4,
  footprintOffsetY: 2,
  footprintHeight: 2,
  label: '商店'
};

export const PHARMACY = {
  id: 'pharmacy', x: 43, y: 2, width: 5, height: 4, 
  footprintOffsetY: 2, footprintHeight: 2, label: '青叶药房'
};

export const MILL = {
  id: 'mill', x: 44, y: 10, width: 4, height: 4, 
  footprintOffsetY: 2, footprintHeight: 2, label: '磨坊'
};

export const VILLAGE_HOUSES = [
  {
    id: 'houseVillage1',
    x: 26, y: 13, width: 5, height: 4, // y 从 12 移到 13，避开 y=11 的路
    footprintOffsetY: 2, footprintHeight: 2,
    label: '艾琳的家',
    ownerNpcId: 'erin',
    ownerId: 'erin',
    outsideDoorPosition: { x: 28, y: 17 }, // 门口跟随下移
    insideSceneId: 'interior_village_1',
    roofColor: 0x8b4513, wallColor: 0xfff5e1, style: 'female'
  },
  {
    id: 'houseVillage2',
    x: 34, y: 13, width: 5, height: 4, // y 从 12 移到 13，避开 y=11 的路
    footprintOffsetY: 2, footprintHeight: 2,
    label: '马克的家',
    ownerNpcId: 'mark',
    ownerId: 'mark',
    outsideDoorPosition: { x: 36, y: 17 }, // 门口跟随下移
    insideSceneId: 'interior_village_2',
    roofColor: 0x5d4037, wallColor: 0xd7ccc8, style: 'male'
  },
  {
    id: 'houseVillage3',
    x: 26, y: 19, width: 5, height: 4, // y 从 18 移到 19，避开 y=18 的路
    footprintOffsetY: 2, footprintHeight: 2,
    label: '林医生的家',
    ownerNpcId: 'doctorLin',
    ownerId: 'doctorLin',
    outsideDoorPosition: { x: 28, y: 23 }, // 门口跟随下移
    insideSceneId: 'interior_village_3',
    roofColor: 0x2e7d32, wallColor: 0xe8f5e9, style: 'male'
  },
  {
    id: 'houseVillage4',
    x: 34, y: 19, width: 5, height: 4, // y 从 18 移到 19，避开 y=18 的路
    footprintOffsetY: 2, footprintHeight: 2,
    label: '老木匠的家',
    ownerNpcId: 'carpenter',
    ownerId: 'carpenter',
    outsideDoorPosition: { x: 36, y: 23 }, // 门口跟随下移
    insideSceneId: 'interior_village_4',
    roofColor: 0x4e342e, wallColor: 0xefebe9, style: 'artisan'
  }
];

export const NOTICE_BOARD = {
  id: 'noticeBoard',
  x: 36,
  y: 7,
  width: 1,
  height: 1,
  label: '公告板'
};

export const TOWN_FLOWERS = [
  { x: 29, y: 10 },
  { x: 32, y: 12 },
  { x: 38, y: 11 },
  { x: 39, y: 15 }
];

export const NPCS = [
  { id: 'erin', name: '艾琳', x: 22, y: 10, color: 0xffaacc, profession: '花艺师', homeId: 'houseVillage1', dialog: '你好呀，今天的天气真不错。', patrol: [{ x: 22, y: 10 }, { x: 25, y: 10 }] },
  { id: 'mark', name: '马克', x: 24, y: 15, color: 0x88ccff, profession: '矿工', homeId: 'houseVillage2', dialog: '嘿！新来的，想买点什么吗？', patrol: [{ x: 24, y: 15 }, { x: 28, y: 15 }] },
  { id: 'doctorLin', name: '林医生', x: 28, y: 8, color: 0xaaffcc, profession: '医生', homeId: 'houseVillage3', dialog: '感觉不舒服吗？我可以帮你看看。' },
  { id: 'carpenter', name: '老木匠', x: 32, y: 12, color: 0xffcc88, profession: '木匠', homeId: 'houseVillage4', dialog: '只要有足够的木材，我能做出任何家具。' }
];

export const TREES = [
  { id: 'tree-1', x: 2, y: 8 },
  { id: 'tree-2', x: 4, y: 13 },
  { id: 'tree-3', x: 8, y: 15 },
  { id: 'tree-4', x: 20, y: 2 },
  { id: 'tree-5', x: 23, y: 3 },
  { id: 'tree-6', x: 25, y: 14 },
  { id: 'tree-7', x: 41, y: 15 },
  { id: 'tree-8', x: 52, y: 16 },
  { id: 'tree-9', x: 31, y: 20 },
  { id: 'tree-10', x: 53, y: 21 },
  { id: 'tree-11', x: 23, y: 20 }
];

export const STONES = [
  { id: 'stone-1', x: 12, y: 14 },
  { id: 'stone-2', x: 14, y: 15 },
  { id: 'stone-3', x: 21, y: 7 },
  { id: 'stone-4', x: 26, y: 8 }
];

export const CLOTHING_SHOP = {
  id: 'clothingShop',
  x: 36,
  y: 2,
  width: 5,
  height: 4,
  footprintOffsetY: 2,
  footprintHeight: 2,
  label: '服装店'
};

export const INTERACTIVE_OBJECTS = [HOUSE_DOOR, WELL, SHOP, CLOTHING_SHOP, PHARMACY, MILL, TRASH_CAN, NOTICE_BOARD];

export const DRAW_METHODS = {
  drawClothingShop(scene, graphics, x, y) {
    const w = CLOTHING_SHOP.width * TILE_SIZE;
    const h = CLOTHING_SHOP.height * TILE_SIZE;
    graphics.fillStyle(0x6b3568, 1); // Purple wall
    graphics.fillRect(x, y + 32, w, h - 32);
    graphics.fillStyle(0x8a4f73, 1); // Darker roof
    graphics.fillTriangle(x - 8, y + 32, x + w/2, y, x + w + 8, y + 32);
    graphics.fillStyle(COLORS.houseDoor, 1);
    graphics.fillRect(x + w/2 - 16, y + h - 40, 32, 40);
    graphics.fillStyle(0xfff7df, 1);
    graphics.fillCircle(x + w/2 + 8, y + h - 20, 3);
  },

  drawMill(scene, graphics, x, y) {
    const w = MILL.width * TILE_SIZE;
    const h = MILL.height * TILE_SIZE;
    graphics.fillStyle(COLORS.stone, 1);
    graphics.fillRect(x, y, w, h);
    graphics.fillStyle(COLORS.stoneDark, 1);
    graphics.strokeRect(x, y, w, h);
    // Mill sails placeholder
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.lineBetween(x + w/2, y + h/2, x + w/2 + 20, y + h/2 + 20);
    graphics.lineBetween(x + w/2, y + h/2, x + w/2 - 20, y + h/2 - 20);
  }
};

export const COLLISION_RECTS = [
  HOUSE,
  WELL,
  TRASH_CAN,
  SHOP,
  CLOTHING_SHOP,
  PHARMACY,
  MILL,
  ...VILLAGE_HOUSES,
  NOTICE_BOARD,
  ...STONES.map((stone) => ({ ...stone, width: 1, height: 1 }))
].map(toWorldRect);

export function toWorldRect(item) {
  // Use footprint if available, otherwise fallback to full dimensions
  const offsetY = (item.footprintOffsetY || 0) * TILE_SIZE;
  const height = (item.footprintHeight || item.height) * TILE_SIZE;
  const width = (item.footprintWidth || item.width) * TILE_SIZE;
  const offsetX = (item.footprintOffsetX || 0) * TILE_SIZE;

  return {
    id: item.id,
    x: item.x * TILE_SIZE + offsetX,
    y: item.y * TILE_SIZE + offsetY,
    width: width,
    height: height
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

export function drawHouse(graphics, x, y, roofColor, wallColor) {
  const w = 5 * TILE_SIZE;
  const h = 4 * TILE_SIZE;
  graphics.fillStyle(wallColor, 1);
  graphics.fillRect(x, y + TILE_SIZE, w, h - TILE_SIZE);
  graphics.fillStyle(roofColor, 1);
  graphics.fillTriangle(x - 8, y + TILE_SIZE, x + w / 2, y, x + w + 8, y + TILE_SIZE);
}

export function drawFarmMap(scene) {
  const graphics = scene.mapGraphics;
  const bGraphics = scene.buildingGraphics;
  graphics.clear();
  bGraphics.clear();

  // Path from house to village
  graphics.fillStyle(COLORS.road, 1);
  const houseToVillage = line(10, 8, 30, 8);
  houseToVillage.forEach((p) => graphics.fillRect(p.x * TILE_SIZE, p.y * TILE_SIZE, TILE_SIZE, TILE_SIZE));

  // Pond
  graphics.fillStyle(COLORS.water, 1);
  WATER_AREAS.forEach((rect) => graphics.fillRect(rect.x * TILE_SIZE, rect.y * TILE_SIZE, rect.width * TILE_SIZE, rect.height * TILE_SIZE));

  // Buildings (on bGraphics layer, above player)
  drawHouse(bGraphics, HOUSE.x * TILE_SIZE, HOUSE.y * TILE_SIZE, COLORS.houseRoof, COLORS.houseWall);
  drawHouse(bGraphics, SHOP.x * TILE_SIZE, SHOP.y * TILE_SIZE, 0x8b4513, 0xd2b48c);
  drawHouse(bGraphics, PHARMACY.x * TILE_SIZE, PHARMACY.y * TILE_SIZE, 0x2e8b57, 0xf0e68c);

  DRAW_METHODS.drawMill(scene, bGraphics, MILL.x * TILE_SIZE, MILL.y * TILE_SIZE);
  DRAW_METHODS.drawClothingShop(scene, bGraphics, CLOTHING_SHOP.x * TILE_SIZE, CLOTHING_SHOP.y * TILE_SIZE);

  VILLAGE_HOUSES.forEach((house) => {
    drawHouse(bGraphics, house.x * TILE_SIZE, house.y * TILE_SIZE, house.roofColor, house.wallColor);
  });
}
