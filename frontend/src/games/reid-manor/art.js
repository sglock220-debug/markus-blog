import { CHARACTER_CONFIG } from './config';

import {
  COLORS,
  HOUSE,
  MILL,
  NOTICE_BOARD,
  PHARMACY,
  ROAD_TILES,
  SHOP,
  STONES,
  TILE_SIZE,
  TRASH_CAN,
  TOWN_FLOWERS,
  WATER_AREAS,
  VILLAGE_HOUSES,
  WELL,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './map';

export function drawFarmMap(scene) {
  const groundGraphics = scene.mapGraphics;
  const buildingGraphicsMap = scene.buildingGraphics;

  if (!groundGraphics || !buildingGraphicsMap) {
    throw new Error('drawFarmMap requires scene.mapGraphics and scene.buildingGraphics');
  }

  groundGraphics.clear();
  buildingGraphicsMap.forEach(g => g.clear());

  drawGrass(groundGraphics);
  drawRoads(groundGraphics);
  drawTownGround(groundGraphics);
  drawWater(groundGraphics);

  drawBuildingLayer(scene, HOUSE.id, HOUSE, (g) => drawHouse(g, HOUSE.x * TILE_SIZE, HOUSE.y * TILE_SIZE, COLORS.houseRoof, COLORS.houseWall));
  drawBuildingLayer(scene, SHOP.id, SHOP, (g) => drawHouse(g, SHOP.x * TILE_SIZE, SHOP.y * TILE_SIZE, 0x8b4513, 0xd2b48c));
  drawBuildingLayer(scene, PHARMACY.id, PHARMACY, (g) => drawHouse(g, PHARMACY.x * TILE_SIZE, PHARMACY.y * TILE_SIZE, 0x2e8b57, 0xf0e68c));
  drawBuildingLayer(scene, MILL.id, MILL, (g) => drawMill(g, MILL.x * TILE_SIZE, MILL.y * TILE_SIZE));
  drawBuildingLayer(scene, 'clothingShop', { ...SHOP, id: 'clothingShop', x: 36, y: 2, height: 4 }, (g) => drawClothingShop(g, 36 * TILE_SIZE, 2 * TILE_SIZE));

  VILLAGE_HOUSES.forEach((house) => {
    drawBuildingLayer(scene, house.id, house, (g) => {
      drawHouse(g, house.x * TILE_SIZE, house.y * TILE_SIZE, house.roofColor, house.wallColor);
    });
  });

  drawTrashCan(groundGraphics);
  drawNoticeBoard(groundGraphics);
  drawWell(groundGraphics);
  drawStones(groundGraphics);
  drawTownFlowers(groundGraphics);

  return { groundGraphics, buildingGraphics: buildingGraphicsMap };
}

function getBuildingGraphic(scene, id) {
  let graphic = scene.buildingGraphics.get(id);
  if (!graphic) {
    graphic = scene.add.graphics();
    scene.buildingGraphics.set(id, graphic);
  }
  return graphic;
}

function drawBuildingLayer(scene, id, building, draw) {
  const graphic = getBuildingGraphic(scene, id);
  graphic.clear();
  
  // Set position to 0 since drawing functions take absolute world coordinates usually,
  // but let's check drawHouse signature.
  // Assuming drawHouse(graphics, x, y, ...)
  draw(graphic);

  const houseFootY = building.y * TILE_SIZE + building.height * TILE_SIZE;
  graphic.setDepth(scene.getWorldDepth(houseFootY, 0.002));
  graphic.setVisible(true);
}

function drawHouse(graphics, x, y, roofColor, wallColor) {
  graphics.fillStyle(wallColor, 1);
  graphics.fillRect(x + 12, y + 54, 136, 74);
  graphics.fillStyle(roofColor, 1);
  graphics.fillTriangle(x, y + 54, x + 160, y + 54, x + 80, y);
  graphics.fillStyle(0x3e2723, 1);
  graphics.fillRect(x + 64, y + 84, 32, 44);
  graphics.fillStyle(0x81d4fa, 1);
  graphics.fillRect(x + 24, y + 74, 24, 24);
  graphics.fillRect(x + 112, y + 74, 24, 24);
  graphics.lineStyle(2, COLORS.outline, 1);
  graphics.strokeRect(x + 12, y + 54, 136, 74);
  graphics.strokeTriangle(x, y + 54, x + 160, y + 54, x + 80, y);
}

function drawMill(graphics, x, y) {
  graphics.fillStyle(0x795548, 1);
  graphics.fillRect(x + 20, y + 40, 88, 88);
  graphics.fillStyle(0x5d4037, 1);
  graphics.fillRect(x + 10, y + 20, 108, 20);
  graphics.fillStyle(0x3e2723, 1);
  graphics.fillRect(x + 50, y + 88, 28, 40);
  graphics.lineStyle(4, 0x4e342e, 1);
  graphics.lineBetween(x + 64, y + 60, x + 64, y - 20);
  graphics.lineBetween(x + 24, y + 20, x + 104, y + 20);
}

function drawClothingShop(graphics, x, y) {
  graphics.fillStyle(0xdc86c1, 1);
  graphics.fillRect(x + 12, y + 54, 136, 74);
  graphics.fillStyle(0xad1457, 1);
  graphics.fillRect(x, y + 34, 160, 20);
  graphics.fillStyle(0x3e2723, 1);
  graphics.fillRect(x + 64, y + 84, 32, 44);
  graphics.lineStyle(2, COLORS.outline, 1);
  graphics.strokeRect(x + 12, y + 54, 136, 74);
}

function drawTownGround(graphics) {
  graphics.fillStyle(0x8fc56d, 0.68);
  graphics.fillRoundedRect(28 * TILE_SIZE, TILE_SIZE, 27 * TILE_SIZE, 22 * TILE_SIZE, 12);

  for (let y = 2; y < 23; y += 1) {
    for (let x = 28; x < 55; x += 1) {
      if ((x + y) % 3 === 0) {
        graphics.fillStyle(COLORS.townStone, 0.14);
        graphics.fillCircle(x * TILE_SIZE + 17, y * TILE_SIZE + 16, 3);
      }
    }
  }
}

export function getPlayerTextureKey(direction, character = {}) {
  const hair = Number.isFinite(character.hair) ? character.hair : 0;
  const skin = Number.isFinite(character.skin) ? character.skin : 0;
  const outfit = Number.isFinite(character.outfit) ? character.outfit : 0;
  return `reid-player-${hair}-${skin}-${outfit}-${direction}`;
}

export function createItemIconTextures(scene) {
  createIconTexture(scene, 'item-axe', drawAxeIcon);
  createIconTexture(scene, 'item-hoe', drawHoeIcon);
  createIconTexture(scene, 'item-watering-can', drawWateringCanIcon);
  createIconTexture(scene, 'item-radish-seed', drawRadishSeedIcon);
  createIconTexture(scene, 'item-radish', drawRadishIcon);
  createIconTexture(scene, 'item-backpack', drawBackpackIcon);
  createIconTexture(scene, 'item-wood', drawWoodIcon);
  createIconTexture(scene, 'item-stone', drawStoneIcon);
  createIconTexture(scene, 'item-bread', drawBreadIcon);
  createIconTexture(scene, 'item-water', drawWaterIcon);
  createIconTexture(scene, 'item-empty-bottle', (g) => drawBottleIcon(g, 0xb7c0c5));
  createIconTexture(scene, 'item-wheat-seed', drawWheatSeedIcon);
  createIconTexture(scene, 'item-wheat', drawWheatIcon);
  createIconTexture(scene, 'item-flour', drawFlourIcon);
  createIconTexture(scene, 'item-medicine-small', (g) => drawMedicineIcon(g, 0x6fcf76));
  createIconTexture(scene, 'item-medicine-medium', (g) => drawMedicineIcon(g, 0x4aa6d9));
  createIconTexture(scene, 'item-medicine-large', (g) => drawMedicineIcon(g, 0xd95656));
}

export function createPlayerTextures(scene, character = {}) {
  const hairOption = CHARACTER_CONFIG.hairstyles[character.hair] || CHARACTER_CONFIG.hairstyles[0];
  const skinOption = CHARACTER_CONFIG.skinTones[character.skin] || CHARACTER_CONFIG.skinTones[0];
  const outfitOption = CHARACTER_CONFIG.outfits[character.outfit] || CHARACTER_CONFIG.outfits[0];

  ['down', 'up', 'left', 'right'].forEach((direction) => {
    const key = getPlayerTextureKey(direction, character);
    if (scene.textures.exists(key)) return;

    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.clear();
    g.fillStyle(outfitOption.color, 1);
    g.fillRect(8, 16, 16, 14);
    g.fillStyle(darken(outfitOption.color, 0.72), 1);
    g.fillRect(8, 28, 6, 4);
    g.fillRect(18, 28, 6, 4);
    g.fillStyle(skinOption.color, 1);
    g.fillRect(9, 7, 14, 12);
    drawHair(g, direction, hairOption.color, character.hair);

    if (direction === 'down') {
      g.fillStyle(0x2a211b, 1);
      g.fillRect(12, 13, 2, 2);
      g.fillRect(18, 13, 2, 2);
    } else if (direction === 'up') {
      g.fillStyle(hairOption.color, 1);
      g.fillRect(9, 11, 14, 7);
    } else if (direction === 'left') {
      g.fillStyle(0x2a211b, 1);
      g.fillRect(11, 13, 2, 2);
      g.fillStyle(hairOption.color, 1);
      g.fillRect(20, 9, 4, 8);
    } else {
      g.fillStyle(0x2a211b, 1);
      g.fillRect(19, 13, 2, 2);
      g.fillStyle(hairOption.color, 1);
      g.fillRect(8, 9, 4, 8);
    }

    g.lineStyle(2, COLORS.outline, 1);
    g.strokeRect(8, 5, 16, 25);
    g.generateTexture(key, 32, 32);
    g.destroy();
  });
}

function createIconTexture(scene, key, draw) {
  if (scene.textures.exists(key)) return;

  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  g.clear();
  draw(g);
  g.generateTexture(key, 32, 32);
  g.destroy();
}

function drawHoeIcon(g) {
  g.lineStyle(4, 0x6c4a2e, 1);
  g.lineBetween(11, 27, 23, 7);
  g.lineStyle(4, 0xd7dde4, 1);
  g.lineBetween(15, 9, 27, 13);
  g.lineStyle(2, 0x2d281f, 0.8);
  g.lineBetween(11, 27, 23, 7);
  g.lineBetween(15, 9, 27, 13);
}

function drawAxeIcon(g) {
  g.lineStyle(5, 0x765035, 1);
  g.lineBetween(11, 28, 20, 8);
  g.fillStyle(0xbec8ce, 1);
  g.fillTriangle(17, 6, 28, 10, 20, 17);
  g.lineStyle(2, 0x3f484d, 1);
  g.lineBetween(17, 6, 28, 10);
  g.lineBetween(28, 10, 20, 17);
}

function drawWateringCanIcon(g) {
  g.fillStyle(0x6aa6c9, 1);
  g.fillRoundedRect(7, 13, 16, 11, 3);
  g.fillRect(10, 9, 8, 5);
  g.lineStyle(3, 0x2d5c76, 1);
  g.strokeRoundedRect(7, 13, 16, 11, 3);
  g.lineBetween(21, 15, 28, 11);
  g.lineBetween(22, 20, 28, 23);
  g.lineStyle(2, 0x9ed8f0, 1);
  g.lineBetween(5, 17, 2, 15);
  g.lineBetween(5, 20, 2, 22);
}

function drawRadishSeedIcon(g) {
  g.fillStyle(0xb98248, 1);
  g.fillEllipse(16, 17, 13, 17);
  g.fillStyle(0xe0b26f, 1);
  g.fillEllipse(13, 14, 4, 5);
  g.lineStyle(2, 0x5f3b20, 1);
  g.strokeEllipse(16, 17, 13, 17);
}

function drawRadishIcon(g) {
  g.fillStyle(0x5aa853, 1);
  g.fillTriangle(16, 9, 11, 3, 18, 5);
  g.fillTriangle(17, 9, 23, 3, 21, 11);
  g.fillStyle(0xe95265, 1);
  g.fillEllipse(16, 19, 15, 16);
  g.fillStyle(0xf7dce0, 1);
  g.fillEllipse(13, 16, 4, 5);
  g.lineStyle(2, 0x7f2c3a, 1);
  g.strokeEllipse(16, 19, 15, 16);
}

function drawBackpackIcon(g) {
  g.fillStyle(0x8a5a35, 1);
  g.fillRoundedRect(8, 10, 16, 17, 4);
  g.fillStyle(0xb98555, 1);
  g.fillRoundedRect(11, 16, 10, 7, 2);
  g.lineStyle(3, 0x5a3822, 1);
  g.strokeRoundedRect(8, 10, 16, 17, 4);
  g.lineBetween(12, 10, 12, 7);
  g.lineBetween(20, 10, 20, 7);
  g.lineBetween(12, 7, 20, 7);
}

function drawWoodIcon(g) {
  g.fillStyle(0x9a6537, 1);
  g.fillRoundedRect(5, 11, 22, 13, 5);
  g.fillStyle(0xc58a4d, 1);
  g.fillCircle(25, 17, 6);
  g.fillStyle(0x70431f, 1);
  g.fillCircle(25, 17, 2);
  g.lineStyle(2, 0x61381d, 1);
  g.strokeRoundedRect(5, 11, 22, 13, 5);
}

function drawStoneIcon(g) {
  g.fillStyle(0x727b82, 1);
  g.fillTriangle(5, 24, 10, 10, 22, 7);
  g.fillTriangle(5, 24, 22, 7, 28, 24);
  g.fillStyle(0xaeb6ba, 1);
  g.fillTriangle(10, 10, 22, 7, 16, 14);
}

function drawBreadIcon(g) {
  g.fillStyle(0xd89a4c, 1);
  g.fillRoundedRect(5, 10, 22, 15, 7);
  g.lineStyle(2, 0x7b4a22, 1);
  g.strokeRoundedRect(5, 10, 22, 15, 7);
  g.lineBetween(12, 12, 10, 17);
  g.lineBetween(18, 11, 16, 17);
  g.lineBetween(24, 13, 22, 18);
}

function drawWaterIcon(g) {
  g.fillStyle(0x77bde2, 1);
  g.fillRoundedRect(9, 9, 14, 19, 4);
  g.fillStyle(0xd7edf7, 1);
  g.fillRect(12, 4, 8, 6);
  g.fillStyle(0x4c9bca, 1);
  g.fillRect(11, 17, 10, 8);
  g.lineStyle(2, 0x2f6687, 1);
  g.strokeRoundedRect(9, 9, 14, 19, 4);
}

function drawBottleIcon(g, color) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(10, 10, 12, 18, 3);
  g.fillStyle(0xe7eef1, 1);
  g.fillRect(13, 5, 6, 6);
  g.lineStyle(2, 0x52656a, 1);
  g.strokeRoundedRect(10, 10, 12, 18, 3);
}

function drawWheatSeedIcon(g) {
  g.fillStyle(0xc59a48, 1);
  g.fillEllipse(16, 17, 9, 15);
  g.lineStyle(2, 0x7a5825, 1);
  g.strokeEllipse(16, 17, 9, 15);
}

function drawWheatIcon(g) {
  g.lineStyle(3, 0x8d6b27, 1);
  g.lineBetween(16, 28, 16, 5);
  g.fillStyle(0xe0b74f, 1);
  for (let y = 7; y <= 19; y += 4) {
    g.fillEllipse(11, y, 8, 5);
    g.fillEllipse(21, y + 2, 8, 5);
  }
}

function drawFlourIcon(g) {
  g.fillStyle(0xe8dcc1, 1);
  g.fillRoundedRect(7, 8, 18, 20, 4);
  g.fillStyle(0xffffff, 0.85);
  g.fillEllipse(16, 17, 11, 8);
  g.lineStyle(2, 0x8f826c, 1);
  g.strokeRoundedRect(7, 8, 18, 20, 4);
}

function drawMedicineIcon(g, color) {
  g.fillStyle(color, 1);
  g.fillRoundedRect(9, 10, 14, 18, 4);
  g.fillStyle(0xe8eef0, 1);
  g.fillRect(12, 5, 8, 6);
  g.fillStyle(0xffffff, 1);
  g.fillRect(14, 14, 4, 10);
  g.fillRect(11, 17, 10, 4);
}

function drawHair(graphics, direction, color, styleIndex = 0) {
  graphics.fillStyle(color, 1);
  graphics.fillRect(8, 5, 16, 5);

  if (styleIndex === 1) {
    graphics.fillRect(7, 9, 4, 10);
    graphics.fillRect(21, 9, 4, 10);
    graphics.fillRect(10, 4, 12, 3);
    return;
  }

  if (styleIndex === 2) {
    graphics.fillCircle(10, 8, 4);
    graphics.fillCircle(16, 5, 5);
    graphics.fillCircle(22, 8, 4);
    graphics.fillRect(7, 10, 4, 8);
    graphics.fillRect(21, 10, 4, 8);
    return;
  }

  if (styleIndex === 3) {
    graphics.fillStyle(0x3f6542, 1);
    graphics.fillRect(7, 4, 18, 6);
    graphics.fillRect(direction === 'left' ? 5 : 20, 8, 7, 3);
    graphics.fillStyle(color, 1);
    graphics.fillRect(8, 10, 4, 5);
    graphics.fillRect(20, 10, 4, 5);
    return;
  }

  graphics.fillRect(7, 9, 4, 7);
  graphics.fillRect(21, 9, 4, 7);
}

function darken(color, amount) {
  const r = Math.floor(((color >> 16) & 255) * amount);
  const g = Math.floor(((color >> 8) & 255) * amount);
  const b = Math.floor((color & 255) * amount);
  return (r << 16) + (g << 8) + b;
}

function drawGrass(graphics) {
  graphics.fillStyle(COLORS.grass, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
    for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
      if ((x / TILE_SIZE + y / TILE_SIZE) % 2 === 0) {
        graphics.fillStyle(COLORS.grassAlt, 0.28);
        graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }

      graphics.fillStyle(0xffffff, 0.12);
      graphics.fillRect(x + 7, y + 7, 4, 2);
      graphics.fillRect(x + 19, y + 23, 5, 2);
    }
  }
}

function drawRoads(graphics) {
  ROAD_TILES.forEach(({ x, y }) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    graphics.fillStyle(COLORS.road, 1);
    graphics.fillRoundedRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2, 4);
    graphics.fillStyle(COLORS.roadDark, 0.22);
    graphics.fillRect(px + 6, py + 21, 7, 3);
    graphics.fillRect(px + 19, py + 9, 5, 3);
  });
}

function drawWater(graphics) {
  WATER_AREAS.forEach((area) => {
    const x = area.x * TILE_SIZE;
    const y = area.y * TILE_SIZE;
    const width = area.width * TILE_SIZE;
    const height = area.height * TILE_SIZE;
    graphics.fillStyle(COLORS.waterDark, 1);
    graphics.fillRoundedRect(x, y, width, height, 12);
    graphics.fillStyle(COLORS.water, 1);
    graphics.fillRoundedRect(x + 4, y + 4, width - 8, height - 8, 10);
    graphics.lineStyle(2, 0xb7e7ff, 0.55);
    for (let wave = y + 18; wave < y + height - 8; wave += 24) {
      graphics.lineBetween(x + 14, wave, x + width - 18, wave + 6);
    }
  });
}

function drawShop(graphics, x, y) {
  drawHouse(graphics, x, y, 0x8b4513, 0xd2b48c);
}

function drawPharmacy(graphics, x, y) {
  drawHouse(graphics, x, y, 0x2e8b57, 0xf0e68c);
}

function drawVillageHouses(graphics) {
  // Not used anymore in the new dynamic layer system
}

function drawTrashCan(graphics) {
  const x = TRASH_CAN.x * TILE_SIZE;
  const y = TRASH_CAN.y * TILE_SIZE;
  graphics.fillStyle(0x52656a, 1);
  graphics.fillRoundedRect(x + 7, y + 7, 18, 22, 3);
  graphics.fillStyle(0x809399, 1);
  graphics.fillRect(x + 5, y + 4, 22, 5);
  graphics.lineStyle(2, 0x334247, 1);
  graphics.lineBetween(x + 12, y + 10, x + 12, y + 26);
  graphics.lineBetween(x + 20, y + 10, x + 20, y + 26);
}

function drawNoticeBoard(graphics) {
  const x = NOTICE_BOARD.x * TILE_SIZE;
  const y = NOTICE_BOARD.y * TILE_SIZE;

  // 两根短木腿，最底部不得超过 y + 31 
  graphics.fillStyle(0x5b3b22, 1); 
  graphics.fillRect(x + 7, y + 19, 5, 12); 
  graphics.fillRect(x + 20, y + 19, 5, 12); 

  // 木质公告板主体 
  graphics.fillStyle(COLORS.board, 1); 
  graphics.fillRect(x + 2, y + 3, 28, 18); 

  // 公告纸 
  graphics.fillStyle(0xf7e6b9, 1); 
  graphics.fillRect(x + 6, y + 7, 18, 4); 
  graphics.fillRect(x + 6, y + 14, 13, 3); 

  // 像素描边 
  graphics.lineStyle(2, COLORS.outline, 0.7); 
  graphics.strokeRect(x + 2, y + 3, 28, 18); 
}

function drawWell(graphics) {
  const x = WELL.x * TILE_SIZE;
  const y = WELL.y * TILE_SIZE;

  graphics.fillStyle(0x7a5838, 1);
  graphics.fillRect(x + 5, y - 10, 5, 22);
  graphics.fillRect(x + 22, y - 10, 5, 22);
  graphics.fillStyle(0x8b4b3d, 1);
  graphics.fillTriangle(x + 2, y - 8, x + 16, y - 22, x + 30, y - 8);
  graphics.fillStyle(COLORS.wellStone, 1);
  graphics.fillRoundedRect(x + 3, y + 9, 26, 18, 7);
  graphics.fillStyle(0x425d70, 1);
  graphics.fillEllipse(x + 16, y + 17, 19, 8);
  graphics.lineStyle(2, COLORS.outline, 0.4);
  graphics.strokeRoundedRect(x + 3, y + 9, 26, 18, 7);
}

function drawStones(graphics) {
  STONES.forEach((stone) => {
    const x = stone.x * TILE_SIZE;
    const y = stone.y * TILE_SIZE;
    graphics.fillStyle(COLORS.stoneDark, 1);
    graphics.fillEllipse(x + 16, y + 21, 25, 16);
    graphics.fillStyle(COLORS.stone, 1);
    graphics.fillEllipse(x + 14, y + 17, 24, 18);
    graphics.fillStyle(0xffffff, 0.28);
    graphics.fillEllipse(x + 9, y + 12, 8, 5);
  });
}

function drawTownFlowers(graphics) {
  TOWN_FLOWERS.forEach(({ x, y }) => {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    graphics.fillStyle(0x2f8a45, 1);
    graphics.fillRect(px + 15, py + 13, 3, 14);
    graphics.fillStyle(0xf07aa8, 1);
    graphics.fillCircle(px + 14, py + 12, 4);
    graphics.fillCircle(px + 20, py + 12, 4);
    graphics.fillCircle(px + 17, py + 8, 4);
    graphics.fillStyle(0xffe08a, 1);
    graphics.fillCircle(px + 17, py + 12, 3);
  });
}
