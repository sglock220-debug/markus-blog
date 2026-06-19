import { CROPS } from './crops';
import { ITEM_IDS } from './items';
import { COLORS, FARM_PLOTS, TILE_SIZE } from './map';
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
    const savedByKey = new Map(
      Array.isArray(savedTiles) ? savedTiles.map((tile) => [tileKey(tile.x, tile.y), tile]) : []
    );

    FARM_PLOTS.forEach((plot) => {
      for (let y = plot.y; y < plot.y + plot.height; y += 1) {
        for (let x = plot.x; x < plot.x + plot.width; x += 1) {
          const saved = savedByKey.get(tileKey(x, y));
          this.tiles.set(tileKey(x, y), {
            x,
            y,
            tilled: Boolean(saved?.tilled),
            wateredDay: Number.isFinite(saved?.wateredDay) ? saved.wateredDay : null,
            cropId: saved?.cropId && CROPS[saved.cropId] ? saved.cropId : null,
            plantedAtMinute: Number.isFinite(saved?.plantedAtMinute) ? saved.plantedAtMinute : null,
            growthMinutes: Number.isFinite(saved?.growthMinutes) ? saved.growthMinutes : 0,
            lastGrowthTotalMinute: Number.isFinite(saved?.lastGrowthTotalMinute)
              ? saved.lastGrowthTotalMinute
              : null,
            harvested: Boolean(saved?.harvested)
          });
        }
      }
    });
  }

  useSelectedItem({ item, tile, inventory, gameTime }) {
    if (!tile || !this.isFarmTile(tile.x, tile.y)) {
      return { ok: false, message: this.failureForItem(item, '这里不能操作') };
    }

    const farmTile = this.getTile(tile.x, tile.y);

    if (item?.id === ITEM_IDS.HOE) {
      return this.hoeTile(farmTile);
    }

    if (item?.id === ITEM_IDS.RADISH_SEED) {
      return this.plantSeed(farmTile, item, inventory, gameTime);
    }

    if (item?.id === ITEM_IDS.WATERING_CAN) {
      return this.waterTile(farmTile, gameTime);
    }

    return this.harvestIfReady(farmTile, inventory, gameTime);
  }

  failureForItem(item, fallback) {
    if (item?.id === ITEM_IDS.HOE) return '这里不能翻地';
    if (item?.id === ITEM_IDS.RADISH_SEED) return '需要先翻耕';
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

  hoeTile(tile) {
    if (tile.tilled) {
      return { ok: false, message: '这里已经翻过地' };
    }

    tile.tilled = true;
    tile.wateredDay = null;
    this.render();
    return { ok: true, message: '土地已翻好' };
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
    return { ok: true, message: '种下了萝卜种子' };
  }

  waterTile(tile, gameTime) {
    if (!tile.cropId) {
      return { ok: false, message: '这里还没有作物' };
    }

    if (tile.wateredDay === gameTime.getDay()) {
      return { ok: false, message: '今天已经浇过水' };
    }

    tile.wateredDay = gameTime.getDay();
    this.render();
    return { ok: true, message: '作物喝饱水了' };
  }

  harvestIfReady(tile, inventory, gameTime) {
    if (!tile.cropId) {
      return { ok: false, message: null };
    }

    const crop = CROPS[tile.cropId];
    if (!this.isMature(tile, gameTime)) {
      return { ok: false, message: '萝卜还没成熟' };
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
      message: '收获了萝卜',
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
      if (tile.cropId) {
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

  getSnapshot(gameTime) {
    return {
      tiles: Array.from(this.tiles.values()).map((tile) => ({
        x: tile.x,
        y: tile.y,
        tilled: tile.tilled,
        wateredDay: tile.wateredDay,
        cropId: tile.cropId,
        plantedAtMinute: tile.plantedAtMinute,
        growthMinutes: tile.growthMinutes,
        growthStage: tile.cropId && gameTime ? this.getGrowthStage(tile, gameTime) : null,
        lastGrowthTotalMinute: tile.lastGrowthTotalMinute,
        harvested: tile.harvested
      }))
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

  destroy() {
    this.graphics.destroy();
  }
}

function tileKey(x, y) {
  return `${x},${y}`;
}
