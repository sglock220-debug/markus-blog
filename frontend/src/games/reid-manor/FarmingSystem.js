import { CROPS } from './crops';
import { ITEM_IDS } from './items';
import { COLORS, TILE_SIZE } from './map';
import { WEATHER } from './config';

export default class FarmingSystem {
  constructor(scene, savedFarm = {}) {
    this.scene = scene;
    this.tiles = new Map();
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);
    this.initializeFarmTiles(savedFarm.tiles);
    this.render();
  }

  initializeFarmTiles(savedTiles = []) {
    if (Array.isArray(savedTiles)) {
      savedTiles.forEach((tile) => {
        this.tiles.set(tileKey(tile.x, tile.y), {
          x: tile.x,
          y: tile.y,
          tilled: Boolean(tile.tilled),
          weedy: Boolean(tile.weedy),
          wateredDay: Number.isFinite(tile.wateredDay) ? tile.wateredDay : null,
          cropId: tile.cropId && CROPS[tile.cropId] ? tile.cropId : null,
          plantedAtMinute: Number.isFinite(tile.plantedAtMinute) ? tile.plantedAtMinute : null,
          growthMinutes: Number.isFinite(tile.growthMinutes) ? tile.growthMinutes : 0,
          lastGrowthTotalMinute: Number.isFinite(tile.lastGrowthTotalMinute)
            ? tile.lastGrowthTotalMinute
            : null,
          harvested: Boolean(tile.harvested)
        });
      });
    }
  }

  useSelectedItem({ item, tile, inventory, gameTime }) {
    if (!tile) return { ok: false, message: '无效位置' };

    const farmTile = this.getTile(tile.x, tile.y);

    if (item?.id === ITEM_IDS.HOE) {
      if (farmTile && farmTile.tilled) {
        if (farmTile.weedy) {
          return this.clearWeeds(farmTile);
        }
        return { ok: false, message: '这里已经翻过地' };
      }
      if (!this.scene.canUseGrassToolAt(tile.x, tile.y)) {
        return { ok: false, message: '这里不能翻地' };
      }
      return this.hoeTile(tile.x, tile.y);
    }

    if (item?.id === ITEM_IDS.SHOVEL) {
      // 1. Check for farm tile
      if (farmTile && farmTile.tilled) {
        if (farmTile.cropId) {
          return { ok: false, message: '请先收获或移除作物' };
        }
        return this.restoreGrass(tile.x, tile.y);
      }
      
      // 2. Check for tree hole
      if (this.scene.isTreeHoleAt(tile.x, tile.y)) {
        return this.scene.restoreTreeHoleAt(tile.x, tile.y);
      }

      if (!this.scene.canUseGrassToolAt(tile.x, tile.y)) {
        return { ok: false, message: '这里不能挖坑' };
      }
      return this.scene.digTreeHoleAt(tile.x, tile.y);
    }

    if (item?.id === ITEM_IDS.SAPLING) {
      return this.scene.plantSaplingAt(tile.x, tile.y, inventory);
    }

    if (!farmTile || !farmTile.tilled) {
      return { ok: false, message: this.failureForItem(item, '这里不能操作') };
    }

    if (item?.type === 'seed') {
      return this.plantSeed(farmTile, item, inventory, gameTime);
    }

    if (item?.id === ITEM_IDS.WATERING_CAN) {
      return this.waterTile(farmTile, gameTime);
    }

    return this.harvestIfReady(farmTile, inventory, gameTime);
  }

  failureForItem(item, fallback) {
    if (item?.id === ITEM_IDS.HOE) return '这里不能翻地';
    if (item?.type === 'seed') return '需要先翻耕';
    if (item?.id === ITEM_IDS.WATERING_CAN) return '这里没有需要浇水的作物';
    return fallback;
  }

  harvestIfReadyAt(tile, inventory, gameTime) {
    if (!tile || !this.isFarmTile(tile.x, tile.y)) {
      return { ok: false, message: null };
    }

    return this.harvestIfReady(this.getTile(tile.x, tile.y), inventory, gameTime);
  }

  canHarvestAt(tile, gameTime) {
    if (!tile || !this.isFarmTile(tile.x, tile.y)) return false;
    const farmTile = this.getTile(tile.x, tile.y);
    return this.isMature(farmTile, gameTime);
  }

  hoeTile(x, y) {
    const key = tileKey(x, y);
    this.tiles.set(key, {
      x,
      y,
      tilled: true,
      weedy: false,
      wateredDay: null,
      cropId: null,
      plantedAtMinute: null,
      growthMinutes: 0,
      lastGrowthTotalMinute: null,
      harvested: false
    });
    this.render();
    return { ok: true, message: '土地已翻好' };
  }

  clearWeeds(tile) {
    tile.weedy = false;
    this.render();
    return { ok: true, message: '杂草已除尽' };
  }

  restoreGrass(x, y) {
    this.tiles.delete(tileKey(x, y));
    this.render();
    return { ok: true, message: '土地已恢复为草地' };
  }

  plantSeed(tile, item, inventory, gameTime) {
    if (!tile.tilled) {
      return { ok: false, message: '需要先翻耕' };
    }

    if (tile.cropId) {
      return { ok: false, message: '这里已经种了作物' };
    }

    if (!inventory.hasItem(item.id, 1)) {
      return { ok: false, message: '种子不够' };
    }

    inventory.removeItem(item.id, 1);
    tile.cropId = item.cropId;
    tile.plantedAtMinute = gameTime.getTotalMinutes();
    tile.growthMinutes = 0;
    tile.lastGrowthTotalMinute = gameTime.getTotalMinutes();
    tile.wateredDay = null;
    tile.harvested = false;
    this.render();
    return { ok: true, message: `种下了${CROPS[item.cropId]?.name || '作物'}种子` };
  }

  waterTile(tile, gameTime) {
    if (!tile.tilled) {
      return { ok: false, message: '这里不是耕地' };
    }

    if (tile.wateredDay === gameTime.getDay()) {
      return { ok: false, message: '今天已经浇过水' };
    }

    tile.wateredDay = gameTime.getDay();
    this.render();
    return { ok: true, message: tile.cropId ? '作物喝饱水了' : '土地已经浇湿' };
  }

  harvestIfReady(tile, inventory, gameTime) {
    if (!tile.cropId) {
      return { ok: false, message: null };
    }

    const crop = CROPS[tile.cropId];
    if (!this.isMature(tile, gameTime)) {
      return { ok: false, message: `${crop.name}还没成熟` };
    }

    inventory.addItem(crop.harvestItemId, crop.harvestQuantity);
    tile.cropId = null;
    tile.plantedAtMinute = null;
    tile.growthMinutes = 0;
    tile.lastGrowthTotalMinute = null;
    tile.wateredDay = null;
    tile.harvested = true;
    this.render();
    return {
      ok: true,
      message: `收获了${crop.name}`,
      harvestedItemId: crop.harvestItemId,
      harvestQuantity: crop.harvestQuantity
    };
  }

  isFarmTile(x, y) {
    return this.tiles.has(tileKey(x, y));
  }

  getTile(x, y) {
    return this.tiles.get(tileKey(x, y));
  }

  hasActiveStateAt(x, y) {
    const tile = this.getTile(x, y);
    return Boolean(tile && (tile.tilled || tile.weedy || tile.cropId || tile.wateredDay !== null));
  }

  isMature(tile, gameTime) {
    if (!tile.cropId || !CROPS[tile.cropId]) return false;
    const crop = CROPS[tile.cropId];
    return tile.growthMinutes >= crop.matureMinutes;
  }

  getGrowthMinutes(tile, gameTime) {
    if (!tile.cropId) return 0;
    return tile.growthMinutes;
  }

  getGrowthStage(tile, gameTime) {
    const crop = CROPS[tile.cropId];
    if (!crop) return 0;
    const minutes = this.getGrowthMinutes(tile, gameTime);
    if (minutes >= crop.matureMinutes) return 2;
    if (minutes >= crop.growthMinutes[1]) return 1;
    return 0;
  }

  resetWateredStateForNewDay(day) {
    this.tiles.forEach((tile) => {
      // Logic for tilled land without crops
      if (tile.tilled && !tile.cropId) {
        if (tile.weedy) {
          // If already weedy, restore to grass
          this.restoreGrass(tile.x, tile.y);
        } else {
          // If clean, become weedy
          tile.weedy = true;
        }
      }

      if (tile.wateredDay && tile.wateredDay < day) {
        tile.wateredDay = null;
      }
    });
    this.render();
  }

  update(gameTime, weather) {
    this.applyWeather(gameTime, weather);
    this.updateGrowth(gameTime, weather);
    this.render();
  }

  applyWeather(gameTime, weather) {
    if (weather !== WEATHER.RAINY) return;

    this.tiles.forEach((tile) => {
      if (tile.tilled) {
        tile.wateredDay = gameTime.getDay();
      }
    });
  }

  updateGrowth(gameTime, weather) {
    const now = gameTime.getTotalMinutes();

    this.tiles.forEach((tile) => {
      if (!tile.cropId) return;

      if (!Number.isFinite(tile.lastGrowthTotalMinute)) {
        tile.lastGrowthTotalMinute = now;
        return;
      }

      const delta = Math.max(0, now - tile.lastGrowthTotalMinute);
      const canGrow = weather === WEATHER.RAINY || tile.wateredDay === gameTime.getDay();

      if (canGrow) {
        tile.growthMinutes += delta;
      }

      tile.lastGrowthTotalMinute = now;
    });
  }

  getSnapshot() {
    return {
      tiles: Array.from(this.tiles.values()).filter(tile => 
        tile.tilled || tile.cropId || tile.weedy
      )
    };
  }

  render() {
    this.graphics.clear();

    this.tiles.forEach((tile) => {
      const x = tile.x * TILE_SIZE;
      const y = tile.y * TILE_SIZE;

      if (tile.tilled) {
        this.graphics.fillStyle(0x8c5a34, 1);
        this.graphics.fillRoundedRect(x + 3, y + 3, TILE_SIZE - 6, TILE_SIZE - 6, 5);
        this.graphics.lineStyle(1, 0x6f4228, 0.65);
        this.graphics.lineBetween(x + 7, y + 11, x + TILE_SIZE - 7, y + 11);
        this.graphics.lineBetween(x + 7, y + 21, x + TILE_SIZE - 7, y + 21);
      }

      if (tile.weedy) {
        this.drawWeeds(x, y);
      }

      if (tile.wateredDay !== null) {
        this.graphics.fillStyle(0x4f86b8, 0.34);
        this.graphics.fillRoundedRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8, 5);
        this.graphics.lineStyle(1, 0xbbe4ff, 0.5);
        this.graphics.lineBetween(x + 8, y + 15, x + 24, y + 18);
      }

      if (tile.cropId) {
        this.drawCrop(tile, x, y);
      }

      if (!tile.tilled) {
        this.graphics.lineStyle(1, COLORS.dirtDark, 0.18);
        this.graphics.strokeRoundedRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4, 5);
      }
    });
  }

  drawCrop(tile, x, y) {
    const stage = this.getGrowthStage(tile, this.scene.gameTime);

    if (tile.cropId === 'wheat') {
      this.graphics.lineStyle(2, stage >= 2 ? 0x9a7428 : 0x4f913c, 1);
      this.graphics.lineBetween(x + 16, y + 28, x + 16, y + 12 - stage * 2);
      this.graphics.fillStyle(stage >= 2 ? 0xe0b74f : 0x63a84b, 1);
      const grains = stage + 1;
      for (let index = 0; index < grains; index += 1) {
        this.graphics.fillEllipse(x + 12, y + 12 + index * 5, 7, 4);
        this.graphics.fillEllipse(x + 20, y + 14 + index * 5, 7, 4);
      }
      return;
    }

    if (stage === 0) {
      this.graphics.fillStyle(0x48a64f, 1);
      this.graphics.fillRect(x + 14, y + 17, 4, 9);
      this.graphics.fillTriangle(x + 16, y + 15, x + 9, y + 20, x + 16, y + 21);
      this.graphics.fillTriangle(x + 16, y + 15, x + 23, y + 20, x + 16, y + 21);
      return;
    }

    if (stage === 1) {
      this.graphics.fillStyle(0x3e9a47, 1);
      this.graphics.fillRect(x + 14, y + 10, 4, 16);
      this.graphics.fillTriangle(x + 16, y + 10, x + 7, y + 16, x + 16, y + 19);
      this.graphics.fillTriangle(x + 16, y + 10, x + 25, y + 16, x + 16, y + 19);
      this.graphics.fillTriangle(x + 16, y + 16, x + 9, y + 24, x + 16, y + 24);
      return;
    }

    this.graphics.fillStyle(0xd9535f, 1);
    this.graphics.fillEllipse(x + 16, y + 22, 14, 12);
    this.graphics.fillStyle(0x3a913f, 1);
    this.graphics.fillTriangle(x + 16, y + 9, x + 7, y + 17, x + 16, y + 18);
    this.graphics.fillTriangle(x + 16, y + 9, x + 25, y + 17, x + 16, y + 18);
    this.graphics.fillStyle(0xffffff, 0.28);
    this.graphics.fillEllipse(x + 13, y + 19, 4, 3);
  }

  drawWeeds(x, y) {
    this.graphics.lineStyle(1.5, 0x4a7a3c, 1);
    // Draw some simple weed lines
    this.graphics.lineBetween(x + 10, y + 25, x + 8, y + 15);
    this.graphics.lineBetween(x + 10, y + 25, x + 12, y + 18);
    this.graphics.lineBetween(x + 22, y + 28, x + 25, y + 16);
    this.graphics.lineBetween(x + 22, y + 28, x + 20, y + 20);
  }

  destroy() {
    this.graphics.destroy();
  }
}

function tileKey(x, y) {
  return `${x},${y}`;
}
