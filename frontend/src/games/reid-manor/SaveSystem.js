import {
  CHARACTER_CONFIG,
  DAILY_QUEST_CONFIG,
  SAVE_CONFIG,
  PLAYER_CONFIG,
  TIME_CONFIG,
  getWeatherForDay
} from './config';
import { MAP_COLUMNS, MAP_ROWS, WORLD_HEIGHT, WORLD_WIDTH } from './map';
import { INITIAL_GOLD, INITIAL_HOTBAR, ITEM_IDS } from './items';
import { createDefaultChest } from './ChestSystem';
import { createDefaultFurniture, FURNITURE_DEFS } from './furniture';

const INVENTORY_SIZE = 30;

export default class SaveSystem {
  constructor(storage = window.localStorage) {
    this.storage = storage;
  }

  load() {
    return this.loadExisting() || this.createNewSave();
  }

  loadExisting() {
    const active = this.getActiveSlotId();
    if (active) {
      const activeSave = this.loadSlot(active);
      if (activeSave) return activeSave;
    }

    const firstSlot = this.getSlots().find((slot) => slot.save);
    if (!firstSlot) return null;
    this.setActiveSlot(firstSlot.slotId);
    return firstSlot.save;
  }

  hasValidSave() {
    return this.getSlots().some((slot) => slot.save);
  }

  getSlots() {
    const slots = Array.from({ length: SAVE_CONFIG.maxSlots }, (_, index) => ({
      slotId: index + 1,
      save: null
    }));

    this.readStoredSlots().forEach((entry) => {
      const slotId = Number(entry?.slotId);
      if (!Number.isInteger(slotId) || slotId < 1 || slotId > SAVE_CONFIG.maxSlots) return;

      const save = entry.save || entry;
      if (!this.isValidSave(save)) return;

      slots[slotId - 1] = {
        slotId,
        save: this.normalizeSave(save)
      };
    });

    return slots;
  }

  loadSlot(slotId) {
    const slot = this.getSlots().find((entry) => entry.slotId === slotId);
    return slot?.save || null;
  }

  setActiveSlot(slotId) {
    if (!Number.isInteger(slotId) || slotId < 1 || slotId > SAVE_CONFIG.maxSlots) return false;

    try {
      this.storage.setItem(SAVE_CONFIG.activeSlotKey, String(slotId));
      return true;
    } catch (error) {
      return false;
    }
  }

  getActiveSlotId() {
    const value = Number(this.storage.getItem(SAVE_CONFIG.activeSlotKey));
    return Number.isInteger(value) && value >= 1 && value <= SAVE_CONFIG.maxSlots ? value : null;
  }

  getFirstAvailableSlotId() {
    const emptySlot = this.getSlots().find((slot) => !slot.save);
    return emptySlot?.slotId || null;
  }

  save(snapshot) {
    const activeSlotId = this.getActiveSlotId() || this.getFirstAvailableSlotId() || 1;
    return this.saveToSlot(activeSlotId, snapshot);
  }

  saveToSlot(slotId, snapshot) {
    try {
      const normalized = this.normalizeSave({
        ...snapshot,
        version: SAVE_CONFIG.version,
        savedAt: Date.now()
      });
      const slots = this.getSlots()
        .filter((slot) => slot.save && slot.slotId !== slotId)
        .map((slot) => ({ slotId: slot.slotId, save: slot.save }));

      slots.push({ slotId, save: normalized });
      this.writeSlots(slots);
      this.setActiveSlot(slotId);
      return true;
    } catch (error) {
      return false;
    }
  }

  reset() {
    const slotId = this.getActiveSlotId() || this.getFirstAvailableSlotId() || 1;
    const freshSave = this.createNewSave();
    this.saveToSlot(slotId, freshSave);
    return freshSave;
  }

  deleteSave() {
    const activeSlotId = this.getActiveSlotId();
    if (activeSlotId) {
      return this.deleteSlot(activeSlotId);
    }

    try {
      this.storage.removeItem(SAVE_CONFIG.key);
      this.storage.removeItem(SAVE_CONFIG.slotsKey);
      this.storage.removeItem(SAVE_CONFIG.activeSlotKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  deleteSlot(slotId) {
    try {
      const slots = this.getSlots()
        .filter((slot) => slot.save && slot.slotId !== slotId)
        .map((slot) => ({ slotId: slot.slotId, save: slot.save }));

      this.writeSlots(slots);

      if (this.getActiveSlotId() === slotId) {
        const nextSlot = slots[0]?.slotId;
        if (nextSlot) {
          this.setActiveSlot(nextSlot);
        } else {
          this.storage.removeItem(SAVE_CONFIG.activeSlotKey);
        }
      }

      if (!slots.length) {
        this.storage.removeItem(SAVE_CONFIG.key);
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  createNewSave(character = {}) {
    const totalMinutes = (TIME_CONFIG.startDay - 1) * TIME_CONFIG.minutesPerDay +
      TIME_CONFIG.startHour * 60 +
      TIME_CONFIG.startMinute;
    const weather = getWeatherForDay(TIME_CONFIG.startDay);
    const normalizedCharacter = normalizeCharacter(character, {
      totalMinutes,
      day: TIME_CONFIG.startDay,
      weather
    });

    return {
      version: SAVE_CONFIG.version,
      savedAt: Date.now(),
      character: normalizedCharacter,
      player: {
        x: PLAYER_CONFIG.startX,
        y: PLAYER_CONFIG.startY,
        direction: PLAYER_CONFIG.direction
      },
      time: {
        totalMinutes,
        day: TIME_CONFIG.startDay,
        weather,
        weatherByDay: { [TIME_CONFIG.startDay]: weather }
      },
      inventory: {
        slots: [
          ...INITIAL_HOTBAR.map((slot) => ({ ...slot })),
          ...Array.from({ length: INVENTORY_SIZE - INITIAL_HOTBAR.length }, () => ({ itemId: ITEM_IDS.EMPTY, quantity: 0 }))
        ],
        gold: INITIAL_GOLD,
        selectedIndex: 0,
        equipment: createDefaultEquipment(),
        toolState: {
          wateringCan: { currentWater: 20, maxWater: 20 }
        }
      },
      status: {
        health: 100,
        hunger: 100,
        thirst: 100
      },
      farm: {
        tiles: createDefaultFarmTiles()
      },
      quest: createDefaultQuest(TIME_CONFIG.startDay),
      chest: createDefaultChest(),
      resources: { trees: {} },
      treePlots: [],
      location: 'farm',
      interior: createDefaultInterior()
    };
  }

  normalizeSave(save) {
    const fresh = this.createNewSave();
    const time = save.time || {};
    const totalMinutes = normalizeTotalMinutes(time.totalMinutes, fresh.time.totalMinutes);
    const day = Math.floor(totalMinutes / TIME_CONFIG.minutesPerDay) + 1;
    const weatherByDay = {
      ...fresh.time.weatherByDay,
      ...(time.weatherByDay || {})
    };
    if (!weatherByDay[day]) {
      weatherByDay[day] = time.weather || getWeatherForDay(day);
    }

    return {
      version: SAVE_CONFIG.version,
      savedAt: Number.isFinite(save.savedAt) ? save.savedAt : Date.now(),
      character: normalizeCharacter(save.character, {
        totalMinutes,
        day,
        weather: time.weather || weatherByDay[day]
      }),
      player: normalizePlayer(save.player, fresh.player),
      time: {
        totalMinutes,
        day,
        weather: time.weather || weatherByDay[day],
        weatherByDay
      },
      inventory: {
        slots: Array.isArray(save.inventory?.slots) ? save.inventory.slots : fresh.inventory.slots,
        gold: normalizeGold(save.inventory, fresh.inventory.gold),
        selectedIndex: normalizeSelectedIndex(save.inventory, fresh.inventory.slots),
        equipment: normalizeEquipment(save.inventory?.equipment),
        toolState: normalizeToolState(save.inventory?.toolState, fresh.inventory.toolState)
      },
      status: normalizeStatus(save.status, fresh.status),
      farm: {
        tiles: Array.isArray(save.farm?.tiles) ? save.farm.tiles : fresh.farm.tiles
      },
      quest: normalizeQuest(save.quest, day),
      chest: save.chest || fresh.chest,
      resources: normalizeResources(save.resources),
      treePlots: normalizeTreePlots(save.treePlots),
      location: save.location === 'interior' ? 'interior' : 'farm',
      interior: normalizeInterior(save.interior, fresh.interior)
    };
  }

  isValidSave(save) {
    return save &&
      Number.isFinite(save.version) &&
      save.version <= SAVE_CONFIG.version &&
      save.player &&
      save.time &&
      save.inventory &&
      save.farm;
  }

  readStoredSlots() {
    const slotEntries = this.readSlotContainer();
    if (slotEntries.length) return slotEntries;

    const legacy = this.readLegacySave();
    return legacy ? [{ slotId: 1, save: legacy }] : [];
  }

  readSlotContainer() {
    try {
      const raw = this.storage.getItem(SAVE_CONFIG.slotsKey);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.slots)) return parsed.slots;
      return [];
    } catch (error) {
      return [];
    }
  }

  readLegacySave() {
    try {
      const raw = this.storage.getItem(SAVE_CONFIG.key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      return this.isValidSave(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  writeSlots(slots) {
    const payload = {
      version: SAVE_CONFIG.version,
      updatedAt: Date.now(),
      slots: slots
        .filter((slot) => slot.save)
        .sort((a, b) => a.slotId - b.slotId)
    };
    this.storage.setItem(SAVE_CONFIG.slotsKey, JSON.stringify(payload));
  }
}

function createDefaultFarmTiles() {
  return [];
}

function createDefaultQuest(day) {
  return {
    id: DAILY_QUEST_CONFIG.id,
    day,
    progress: 0,
    completed: false,
    rewardClaimed: false
  };
}

function normalizeQuest(quest, day) {
  if (!quest || quest.id !== DAILY_QUEST_CONFIG.id || quest.day !== day) {
    return createDefaultQuest(day);
  }

  return {
    id: DAILY_QUEST_CONFIG.id,
    day,
    progress: Math.max(0, Math.min(DAILY_QUEST_CONFIG.targetCount, quest.progress || 0)),
    completed: Boolean(quest.completed),
    rewardClaimed: Boolean(quest.rewardClaimed)
  };
}

function normalizePlayer(player, fallback) {
  const x = Number.isFinite(player?.x) ? clamp(player.x, 16, WORLD_WIDTH - 16) : fallback.x;
  const y = Number.isFinite(player?.y) ? clamp(player.y, 16, WORLD_HEIGHT - 16) : fallback.y;
  const directions = new Set(['up', 'down', 'left', 'right']);

  return {
    x,
    y,
    direction: directions.has(player?.direction) ? player.direction : fallback.direction
  };
}

function normalizeTotalMinutes(value, fallback) {
  if (!Number.isFinite(value) || value < 0) return fallback;

  const minutesToday = value % TIME_CONFIG.minutesPerDay;
  const startMinute = TIME_CONFIG.startHour * 60 + TIME_CONFIG.startMinute;
  if (minutesToday >= startMinute) return value;

  const currentDayIndex = Math.floor(value / TIME_CONFIG.minutesPerDay);
  return currentDayIndex * TIME_CONFIG.minutesPerDay + startMinute;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeGold(inventory, fallback) {
  if (Number.isFinite(inventory?.gold)) {
    return Math.max(0, inventory.gold);
  }

  const oldCoinSlot = Array.isArray(inventory?.slots)
    ? inventory.slots.find((slot) => slot?.itemId === ITEM_IDS.COIN)
    : null;
  return Number.isFinite(oldCoinSlot?.quantity) ? Math.max(0, oldCoinSlot.quantity) : fallback;
}

function normalizeSelectedIndex(inventory, defaultSlots) {
  const savedIndex = Number.isFinite(inventory?.selectedIndex) ? Math.floor(inventory.selectedIndex) : 0;
  return Math.max(0, Math.min(Math.min(9, defaultSlots.length - 1), savedIndex));
}

function normalizeStatus(status, fallback) {
  return {
    health: normalizeStatusValue(status?.health, fallback.health),
    hunger: normalizeStatusValue(status?.hunger, fallback.hunger),
    thirst: normalizeStatusValue(status?.thirst, fallback.thirst)
  };
}

function normalizeStatusValue(value, fallback) {
  return Number.isFinite(value) ? clamp(value, 0, 100) : fallback;
}

function normalizeToolState(toolState, fallback) {
  const maxWater = Number.isFinite(toolState?.wateringCan?.maxWater)
    ? Math.max(1, Math.floor(toolState.wateringCan.maxWater))
    : fallback.wateringCan.maxWater;
  const currentWater = Number.isFinite(toolState?.wateringCan?.currentWater)
    ? clamp(Math.floor(toolState.wateringCan.currentWater), 0, maxWater)
    : maxWater;
  return { wateringCan: { currentWater, maxWater } };
}

function createDefaultInterior() {
  return {
    player: { x: 520, y: 430, direction: 'up' },
    furniture: createDefaultFurniture(),
    storage: Object.fromEntries(Object.keys(FURNITURE_DEFS).map((type) => [type, 0]))
  };
}

function normalizeInterior(interior, fallback) {
  return {
    player: {
      x: Number.isFinite(interior?.player?.x) ? interior.player.x : fallback.player.x,
      y: Number.isFinite(interior?.player?.y) ? interior.player.y : fallback.player.y,
      direction: ['up', 'down', 'left', 'right'].includes(interior?.player?.direction)
        ? interior.player.direction
        : fallback.player.direction
    },
    furniture: Array.isArray(interior?.furniture)
      ? interior.furniture.map((item) => ({ ...item }))
      : fallback.furniture.map((item) => ({ ...item })),
    storage: Object.fromEntries(Object.keys(FURNITURE_DEFS).map((type) => [type, Math.max(0, interior?.storage?.[type] || 0)]))
  };
}

function createDefaultEquipment() {
  return { hat: null, top: null, pants: null, shoes: null, ring: null, tool: null };
}

function normalizeEquipment(equipment = {}) {
  return Object.fromEntries(Object.keys(createDefaultEquipment()).map((key) => [key, equipment[key] || null]));
}

function normalizeResources(resources = {}) {
  const trees = resources && typeof resources.trees === 'object' ? resources.trees : {};
  const dynamicTrees = Array.isArray(resources?.dynamicTrees)
    ? resources.dynamicTrees
      .filter((tree) => tree && typeof tree.id === 'string' && Number.isInteger(tree.x) && Number.isInteger(tree.y))
      .map((tree) => ({ id: tree.id, x: tree.x, y: tree.y }))
    : [];
  return {
    trees: Object.fromEntries(Object.entries(trees).map(([id, state]) => [id, {
      hits: Math.max(0, Math.min(3, Number.isFinite(state?.hits) ? Math.floor(state.hits) : 0)),
      status: ['alive', 'felled', 'hidden'].includes(state?.status)
        ? state.status
        : (state?.hidden ? 'hidden' : state?.felled ? 'felled' : 'alive')
    }])),
    dynamicTrees
  };
}

function normalizeTreePlots(treePlots) {
  if (!Array.isArray(treePlots)) return [];
  const normalized = new Map();
  treePlots.forEach((plot) => {
    if (!Number.isInteger(plot?.x) || !Number.isInteger(plot?.y)) return;
    if (plot.x < 0 || plot.y < 0 || plot.x >= MAP_COLUMNS || plot.y >= MAP_ROWS) return;
    if (plot.type !== 'hole' && plot.type !== 'sapling') return;
    normalized.set(`${plot.x},${plot.y}`, {
      x: plot.x,
      y: plot.y,
      type: plot.type,
      day: Number.isFinite(plot.day) ? Math.max(1, Math.floor(plot.day)) : 1
    });
  });
  return Array.from(normalized.values());
}

function normalizeCharacter(character = {}, birthContext = {}) {
  const name = typeof character.name === 'string'
    ? character.name.trim().slice(0, CHARACTER_CONFIG.nameMaxLength)
    : CHARACTER_CONFIG.defaultName;

  const hair = normalizeOptionIndex(character.hair, CHARACTER_CONFIG.hairstyles);
  const skin = normalizeOptionIndex(character.skin, CHARACTER_CONFIG.skinTones);
  const outfit = normalizeOptionIndex(character.outfit, CHARACTER_CONFIG.outfits);
  const birthDay = Number.isFinite(character.birthDay)
    ? Math.max(1, character.birthDay)
    : birthContext.day || TIME_CONFIG.startDay;
  const birthTotalMinutes = Number.isFinite(character.birthTotalMinutes)
    ? Math.max(0, character.birthTotalMinutes)
    : birthContext.totalMinutes || 0;

  return {
    name: name.length >= CHARACTER_CONFIG.nameMinLength ? name : CHARACTER_CONFIG.defaultName,
    hair,
    skin,
    outfit,
    birthDay,
    birthWeekday: character.birthWeekday || TIME_CONFIG.weekdays[(birthDay - 1) % TIME_CONFIG.weekdays.length],
    birthWeather: character.birthWeather || birthContext.weather || getWeatherForDay(birthDay),
    birthTotalMinutes
  };
}

function normalizeOptionIndex(value, options) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(options.length - 1, Math.floor(value)));
}
