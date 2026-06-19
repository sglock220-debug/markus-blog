import { CHARACTER_CONFIG } from './config';

import {
  COLORS,
  CRATE,
  FARM_PLOTS,
  HOUSE,
  NOTICE_BOARD,
  ROAD_TILES,
  SHOP,
  STONES,
  TILE_SIZE,
  TREES,
  TOWN_FLOWERS,
  WATER_AREAS,
  WELL,
  WORLD_HEIGHT,
  WORLD_WIDTH
} from './map';

export function drawFarmMap(scene) {
  const graphics = scene.add.graphics();

  drawGrass(graphics);
  drawRoads(graphics);
  drawFarmPlots(graphics);
  drawTownGround(graphics);
  drawWater(graphics);
  drawHouse(graphics);
  drawShop(graphics);
  drawNoticeBoard(graphics);
  drawWell(graphics);
  drawCrate(graphics);
  drawStones(graphics);
  drawTownFlowers(graphics);
  drawTrees(graphics);

  return graphics;
}

function drawTownGround(graphics) {
  graphics.fillStyle(0x8fc56d, 0.68);
  graphics.fillRoundedRect(28 * TILE_SIZE, TILE_SIZE, 13 * TILE_SIZE, 16 * TILE_SIZE, 12);

  for (let y = 2; y < 17; y += 1) {
    for (let x = 28; x < 41; x += 1) {
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
  createIconTexture(scene, 'item-hoe', drawHoeIcon);
  createIconTexture(scene, 'item-watering-can', drawWateringCanIcon);
  createIconTexture(scene, 'item-radish-seed', drawRadishSeedIcon);
  createIconTexture(scene, 'item-radish', drawRadishIcon);
  createIconTexture(scene, 'item-backpack', drawBackpackIcon);
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

function drawFarmPlots(graphics) {
  FARM_PLOTS.forEach((plot) => {
    for (let row = 0; row < plot.height; row += 1) {
      for (let col = 0; col < plot.width; col += 1) {
        const px = (plot.x + col) * TILE_SIZE;
        const py = (plot.y + row) * TILE_SIZE;
        graphics.fillStyle(COLORS.dirt, 1);
        graphics.fillRoundedRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4, 5);
        graphics.lineStyle(1, COLORS.dirtDark, 0.45);
        graphics.lineBetween(px + 6, py + 10, px + TILE_SIZE - 6, py + 10);
        graphics.lineBetween(px + 6, py + 21, px + TILE_SIZE - 6, py + 21);
      }
    }
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

function drawHouse(graphics) {
  const x = HOUSE.x * TILE_SIZE;
  const y = HOUSE.y * TILE_SIZE;
  const width = HOUSE.width * TILE_SIZE;
  const height = HOUSE.height * TILE_SIZE;

  graphics.fillStyle(COLORS.houseRoof, 1);
  graphics.fillTriangle(x - 10, y + 42, x + width / 2, y - 16, x + width + 10, y + 42);
  graphics.fillStyle(0x73312b, 1);
  graphics.fillRect(x + 12, y + 40, width - 24, 16);
  graphics.fillStyle(COLORS.houseWall, 1);
  graphics.fillRoundedRect(x + 14, y + 50, width - 28, height - 50, 6);
  graphics.fillStyle(COLORS.houseDoor, 1);
  graphics.fillRect(x + 68, y + 80, 24, 48);
  graphics.fillStyle(0xf6d78b, 1);
  graphics.fillRect(x + 30, y + 72, 24, 22);
  graphics.fillRect(x + 106, y + 72, 24, 22);
  graphics.lineStyle(2, COLORS.outline, 0.45);
  graphics.strokeRoundedRect(x + 14, y + 50, width - 28, height - 50, 6);
}

function drawShop(graphics) {
  const x = SHOP.x * TILE_SIZE;
  const y = SHOP.y * TILE_SIZE;
  const width = SHOP.width * TILE_SIZE;
  const height = SHOP.height * TILE_SIZE;

  graphics.fillStyle(COLORS.shopRoof, 1);
  graphics.fillTriangle(x - 10, y + 44, x + width / 2, y - 12, x + width + 10, y + 44);
  graphics.fillStyle(0x435481, 1);
  graphics.fillRect(x + 10, y + 40, width - 20, 18);
  graphics.fillStyle(COLORS.shopWall, 1);
  graphics.fillRoundedRect(x + 14, y + 56, width - 28, height - 56, 6);
  graphics.fillStyle(0x6b3f2a, 1);
  graphics.fillRect(x + 66, y + 86, 28, 42);
  graphics.fillStyle(0xf7e6b9, 1);
  graphics.fillRect(x + 30, y + 74, 26, 20);
  graphics.fillRect(x + 106, y + 74, 26, 20);
  graphics.fillStyle(0x2d281f, 1);
  graphics.fillRect(x + 54, y + 48, 52, 18);
  graphics.fillStyle(0xffe08a, 1);
  graphics.fillRect(x + 62, y + 53, 36, 4);
  graphics.lineStyle(2, COLORS.outline, 0.42);
  graphics.strokeRoundedRect(x + 14, y + 56, width - 28, height - 56, 6);
}

function drawNoticeBoard(graphics) {
  const x = NOTICE_BOARD.x * TILE_SIZE;
  const y = NOTICE_BOARD.y * TILE_SIZE;

  graphics.fillStyle(0x5b3b22, 1);
  graphics.fillRect(x + 7, y + 18, 5, 44);
  graphics.fillRect(x + 22, y + 18, 5, 44);
  graphics.fillStyle(COLORS.board, 1);
  graphics.fillRoundedRect(x + 1, y + 4, 30, 28, 4);
  graphics.fillStyle(0xf7e6b9, 1);
  graphics.fillRect(x + 6, y + 9, 20, 5);
  graphics.fillRect(x + 6, y + 18, 15, 4);
  graphics.lineStyle(2, COLORS.outline, 0.45);
  graphics.strokeRoundedRect(x + 1, y + 4, 30, 28, 4);
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

function drawCrate(graphics) {
  const x = CRATE.x * TILE_SIZE;
  const y = CRATE.y * TILE_SIZE;

  graphics.fillStyle(COLORS.crate, 1);
  graphics.fillRect(x + 3, y + 4, 26, 24);
  graphics.fillStyle(COLORS.crateDark, 0.65);
  graphics.fillRect(x + 6, y + 7, 4, 18);
  graphics.fillRect(x + 22, y + 7, 4, 18);
  graphics.lineStyle(2, COLORS.crateDark, 1);
  graphics.lineBetween(x + 5, y + 6, x + 27, y + 26);
  graphics.lineBetween(x + 27, y + 6, x + 5, y + 26);
}

function drawTrees(graphics) {
  TREES.forEach((tree) => {
    const x = tree.x * TILE_SIZE;
    const y = tree.y * TILE_SIZE;
    graphics.fillStyle(COLORS.treeTrunk, 1);
    graphics.fillRect(x + 12, y + 30, 10, 28);
    graphics.fillStyle(COLORS.treeShadow, 1);
    graphics.fillEllipse(x + 17, y + 24, 45, 35);
    graphics.fillStyle(COLORS.treeTop, 1);
    graphics.fillCircle(x + 12, y + 18, 17);
    graphics.fillCircle(x + 23, y + 18, 17);
    graphics.fillCircle(x + 17, y + 7, 16);
    graphics.fillStyle(0xffffff, 0.12);
    graphics.fillCircle(x + 10, y + 7, 5);
  });
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
