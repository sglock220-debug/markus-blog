import {
  CHARACTER_CONFIG,
  DAILY_QUEST_CONFIG,
  SAVE_CONFIG,
  PLAYER_CONFIG,
  TIME_CONFIG,
  getWeatherForDay
} from './config';
import { FARM_PLOTS, WORLD_HEIGHT, WORLD_WIDTH } from './map';
import { INITIAL_GOLD, INITIAL_HOTBAR, ITEM_IDS } from './items';
import { createDefaultChest } from './ChestSystem';

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
        slots: INITIAL_HOTBAR.map((slot) => ({ ...slot })),
        gold: INITIAL_GOLD,
        selectedIndex: 0
      },
      farm: {
        tiles: createDefaultFarmTiles()
      },
      quest: createDefaultQuest(TIME_CONFIG.startDay),
      chest: createDefaultChest()
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
        selectedIndex: Number.isFinite(save.inventory?.selectedIndex) ? save.inventory.selectedIndex : 0
      },
      farm: {
        tiles: Array.isArray(save.farm?.tiles) ? save.farm.tiles : fresh.farm.tiles
      },
      quest: normalizeQuest(save.quest, day),
      chest: save.chest || fresh.chest
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
  const tiles = [];

  FARM_PLOTS.forEach((plot) => {
    for (let y = plot.y; y < plot.y + plot.height; y += 1) {
      for (let x = plot.x; x < plot.x + plot.width; x += 1) {
        tiles.push({
          x,
          y,
          tilled: false,
          wateredDay: null,
          cropId: null,
          plantedAtMinute: null,
          growthMinutes: 0,
          lastGrowthTotalMinute: null,
          harvested: false
        });
      }
    }
  });

  return tiles;
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
  const sleepMinute = TIME_CONFIG.sleepHour * 60;
  if (minutesToday < sleepMinute) return value;

  const currentDay = Math.floor(value / TIME_CONFIG.minutesPerDay) + 1;
  return currentDay * TIME_CONFIG.minutesPerDay +
    TIME_CONFIG.startHour * 60 +
    TIME_CONFIG.startMinute;
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
