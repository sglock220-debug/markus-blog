import { FURNITURE_DEFS, FURNITURE_CATEGORIES } from './furniture';
import { ITEM_IDS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const ITEMS_PER_PAGE = 6;

export default class FurnitureCatalogSystem {
  constructor(scene, interior) {
    this.scene = scene;
    this.interior = interior;
    this.layer = null;
    this.selectedType = 'singleBed';
    this.currentCategory = FURNITURE_CATEGORIES.ALL;
    this.searchQuery = '';
    this.currentPage = 1;
    this.showOnlyOwned = false;
  }

  open() {
    if (!this.interior.inside) {
      this.scene.showMessage('只能在家中布置家具');
      return;
    }
    this.render();
  }

  getFilteredFurniture() {
    return Object.values(FURNITURE_DEFS).filter((def) => {
      const matchCategory = this.currentCategory === FURNITURE_CATEGORIES.ALL || def.category === this.currentCategory;
      const matchSearch = !this.searchQuery || def.label.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchOwned = !this.showOnlyOwned || this.interior.getStoredFurnitureCount(def.type) > 0;
      return matchCategory && matchSearch && matchOwned;
    });
  }

  render() {
    this.close();
    const width = 840;
    const height = 560;
    const shell = createModalShell(this.scene, {
      width, height, depth: 106, panelColor: 0xf4d89b, borderColor: 0x6e4526,
      onClose: () => this.close()
    });
    const { layer, x, y } = shell;
    this.layer = layer;

    // Header
    const title = this.scene.add.text(x + 24, y + 20, '家具建造目录', modalTextStyle(22, '#3b2a1d', true));
    const gold = this.scene.add.text(x + width - 140, y + 24, `${this.scene.inventory.getQuantity(ITEM_IDS.COIN)} 金币`, modalTextStyle(14, '#7a4a1f', true));
    gold.setOrigin(1, 0);
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, gold, ...close]);

    // Search and Categories
    this.renderFilters(layer, x, y);

    // Furniture Grid
    const filtered = this.getFilteredFurniture();
    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    this.currentPage = Math.max(1, this.currentPage);

    const startIdx = (this.currentPage - 1) * ITEMS_PER_PAGE;
    const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

    pageItems.forEach((definition, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const cardX = x + 24 + column * 396;
      const cardY = y + 115 + row * 102;
      this.renderFurnitureCard(layer, cardX, cardY, definition);
    });

    // Pagination
    this.renderPagination(layer, x, y, totalPages);

    // Bottom Action Bar
    const selected = FURNITURE_DEFS[this.selectedType] || Object.values(FURNITURE_DEFS)[0];
    const infoText = `${selected.label} · ${selected.gridWidth}×${selected.gridHeight} 格 · ${selected.category}${selected.powered ? ` · 功率:${selected.powerRequired}` : ''}`;
    const info = this.scene.add.text(x + 24, y + height - 105, infoText, modalTextStyle(15, '#3b2a1d', true));
    info.setInteractive();
    info.on('pointerdown', (p, lx, ly, event) => event.stopPropagation());
    
    const buy = makeModalButton(this.scene, {
      x: x + 24, y: y + height - 64, width: 160, height: 42, label: `购买(${selected.buy})`,
      onClick: () => this.buy(), color: 0x3f8c55
    });
    const place = makeModalButton(this.scene, {
      x: x + 206, y: y + height - 64, width: 160, height: 42, label: '取出放置',
      onClick: () => this.place(), color: 0x4a90e2
    });
    const sell = makeModalButton(this.scene, {
      x: x + 388, y: y + height - 64, width: 160, height: 42, label: `出售(${selected.sell})`,
      onClick: () => this.sell(), color: 0xb7653c
    });
    const toggleOwned = makeModalButton(this.scene, {
      x: x + 570, y: y + height - 64, width: 160, height: 42, label: this.showOnlyOwned ? '显示全部' : '查看库存',
      onClick: () => { this.showOnlyOwned = !this.showOnlyOwned; this.currentPage = 1; this.render(); },
      color: this.showOnlyOwned ? 0x2d5a27 : 0x8a5a35
    });
    layer.add([info, ...buy, ...place, ...sell, ...toggleOwned]);
  }

  renderFilters(layer, x, y) {
    // Search Box
    const searchBg = this.scene.add.rectangle(x + 24, y + 60, 200, 36, 0xffffff, 0.3);
    searchBg.setOrigin(0, 0);
    searchBg.setStrokeStyle(1, 0x8a5a35, 1);
    const searchText = this.scene.add.text(x + 34, y + 68, this.searchQuery || '搜索...', modalTextStyle(14, this.searchQuery ? '#3b2a1d' : '#8a5a35'));
    searchBg.setInteractive({ useHandCursor: true });
    searchBg.on('pointerdown', (p, lx, ly, event) => {
      event.stopPropagation();
      const query = window.prompt('输入家具名称筛选：', this.searchQuery);
      if (query !== null) {
        this.searchQuery = query.trim();
        this.currentPage = 1;
        this.render();
      }
    });
    layer.add([searchBg, searchText]);

    // Category Tabs
    const categories = Object.values(FURNITURE_CATEGORIES);
    categories.forEach((cat, index) => {
      const catX = x + 240 + index * 56;
      const isSelected = this.currentCategory === cat;
      const btn = this.scene.add.text(catX, y + 68, cat, modalTextStyle(13, isSelected ? '#3f78bd' : '#5d4b35', isSelected));
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerdown', (p, lx, ly, event) => {
        event.stopPropagation();
        this.currentCategory = cat;
        this.currentPage = 1;
        this.render();
      });
      layer.add(btn);
    });
  }

  renderFurnitureCard(layer, cardX, cardY, definition) {
    const selected = definition.type === this.selectedType;
    const owned = this.interior.getStoredFurnitureCount(definition.type);
    
    const card = this.scene.add.rectangle(cardX, cardY, 380, 86, selected ? 0xffdf83 : 0xe7c58a, 1);
    card.setOrigin(0, 0);
    card.setStrokeStyle(selected ? 3 : 1, selected ? 0x3f78bd : 0x8a5a35, 1);
    
    const name = this.scene.add.text(cardX + 12, cardY + 10, definition.label, modalTextStyle(16, '#3b2a1d', true));
    const size = this.scene.add.text(cardX + 12, cardY + 36, `尺寸: ${definition.gridWidth}×${definition.gridHeight} 格`, modalTextStyle(12, '#5d4b35'));
    const price = this.scene.add.text(cardX + 12, cardY + 58, `买: ${definition.buy}  卖: ${definition.sell}`, modalTextStyle(12, '#7a4a1f'));
    const stock = this.scene.add.text(cardX + 180, cardY + 10, `库存: ${owned}`, modalTextStyle(13, '#3b2a1d', true));

    // Thumbnail
    const thumbX = cardX + 290;
    const thumbY = cardY + 8;
    const thumbSize = 68;
    const thumbBg = this.scene.add.rectangle(thumbX, thumbY, thumbSize, thumbSize, 0x000000, 0.1);
    thumbBg.setOrigin(0, 0);
    
    let thumbnail;
    if (definition.thumbnail && this.scene.textures.exists(definition.thumbnail)) {
      thumbnail = this.scene.add.image(thumbX + thumbSize/2, thumbY + thumbSize/2, definition.thumbnail);
      thumbnail.setDisplaySize(thumbSize - 10, thumbSize - 10);
    } else {
      thumbnail = this.scene.add.text(thumbX + thumbSize/2, thumbY + thumbSize/2, '?', modalTextStyle(24, '#8a5a35', true));
      thumbnail.setOrigin(0.5, 0.5);
    }

    const select = () => {
      this.selectedType = definition.type;
      this.render();
    };

    [card, name, size, price, stock, thumbBg].forEach((obj) => {
      obj.setInteractive({ useHandCursor: true });
      obj.on('pointerdown', (p, lx, ly, event) => {
        event.stopPropagation();
        select();
      });
    });

    layer.add([card, name, size, price, stock, thumbBg, thumbnail]);
  }

  renderPagination(layer, x, y, totalPages) {
    const pageY = y + 425;
    const centerX = x + 420;

    const first = makeModalButton(this.scene, {
      x: centerX - 180, y: pageY, width: 40, height: 30, label: '<<',
      onClick: () => { this.currentPage = 1; this.render(); }, color: 0x8a5a35, fontSize: 12
    });
    const prev = makeModalButton(this.scene, {
      x: centerX - 130, y: pageY, width: 40, height: 30, label: '<',
      onClick: () => { this.currentPage = this.currentPage === 1 ? totalPages : this.currentPage - 1; this.render(); }, color: 0x8a5a35, fontSize: 12
    });

    const pageBox = this.scene.add.rectangle(centerX - 40, pageY, 80, 30, 0xffffff, 0.5);
    pageBox.setOrigin(0, 0);
    pageBox.setStrokeStyle(1, 0x8a5a35, 1);
    const pageText = this.scene.add.text(centerX, pageY + 15, `${this.currentPage} / ${totalPages}`, modalTextStyle(13, '#3b2a1d', true));
    pageText.setOrigin(0.5, 0.5);
    pageBox.setInteractive({ useHandCursor: true });
    pageBox.on('pointerdown', (p, lx, ly, event) => {
      event.stopPropagation();
      const input = window.prompt(`输入页码 (1-${totalPages})：`, this.currentPage);
      const num = parseInt(input);
      if (!isNaN(num)) {
        this.currentPage = Math.max(1, Math.min(totalPages, num));
        this.render();
      }
    });

    const next = makeModalButton(this.scene, {
      x: centerX + 50, y: pageY, width: 40, height: 30, label: '>',
      onClick: () => { this.currentPage = this.currentPage === totalPages ? 1 : this.currentPage + 1; this.render(); }, color: 0x8a5a35, fontSize: 12
    });
    const last = makeModalButton(this.scene, {
      x: centerX + 100, y: pageY, width: 40, height: 30, label: '>>',
      onClick: () => { this.currentPage = totalPages; this.render(); }, color: 0x8a5a35, fontSize: 12
    });

    layer.add([...first, ...prev, pageBox, pageText, ...next, ...last]);
  }

  buy() {
    const definition = FURNITURE_DEFS[this.selectedType];
    if (!this.scene.inventory.removeItem(ITEM_IDS.COIN, definition.buy)) return this.scene.showMessage('金币不够');
    this.interior.addStoredFurniture(this.selectedType, 1);
    this.scene.saveNow();
    this.render();
  }

  sell() {
    const definition = FURNITURE_DEFS[this.selectedType];
    if (!this.interior.removeStoredFurniture(this.selectedType, 1)) return this.scene.showMessage('库存里没有这件家具');
    this.scene.inventory.addItem(ITEM_IDS.COIN, definition.sell);
    this.scene.saveNow();
    this.render();
  }

  place() {
    if (this.interior.getStoredFurnitureCount(this.selectedType) <= 0) return this.scene.showMessage('请先购买家具');
    this.close();
    this.interior.startPlacementFromStorage(this.selectedType);
  }

  isOpen() { return Boolean(this.layer); }
  close() { this.layer?.destroy(); this.layer = null; }
  destroy() { this.close(); }
}
