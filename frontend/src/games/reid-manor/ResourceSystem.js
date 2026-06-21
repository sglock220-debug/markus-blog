import Phaser from 'phaser';
import { ITEM_IDS } from './items';
import { COLORS, TILE_SIZE, TREES } from './map';

export default class ResourceSystem {
  constructor(scene, savedResources = {}) {
    this.scene = scene;
    this.treeState = Object.fromEntries(TREES.map((tree) => {
      const saved = savedResources.trees?.[tree.id] || {};
      return [tree.id, { 
        hits: Math.max(0, saved.hits || 0), 
        status: saved.status || (saved.hidden ? 'hidden' : saved.felled ? 'felled' : 'alive'),
        // fellingProgress and shaking are runtime-only, not saved
        shaking: false,
        fellingProgress: undefined
      }];
    }));
    this.dynamicTrees = Array.isArray(savedResources.dynamicTrees) ? savedResources.dynamicTrees : [];
    this.dynamicTrees.forEach(tree => {
      if (!this.treeState[tree.id]) {
        const saved = savedResources.trees?.[tree.id] || {};
        this.treeState[tree.id] = { 
          hits: Math.max(0, saved.hits || 0), 
          status: saved.status || (saved.hidden ? 'hidden' : saved.felled ? 'felled' : 'alive'),
          shaking: false,
          fellingProgress: undefined
        };
      }
    });
    this.treeGraphics = new Map();
    this.externalVisible = true;
    this.render();
  }

  getTreeGraphic(treeId) {
    let graphic = this.treeGraphics.get(treeId);
    if (!graphic) {
      graphic = this.scene.add.graphics();
      this.treeGraphics.set(treeId, graphic);
    }
    return graphic;
  }

  getFacingTree(player, direction) {
    const offsets = { up: [0, -40], down: [0, 40], left: [-40, 0], right: [40, 0] };
    const [dx, dy] = offsets[direction] || offsets.down;
    const targetX = player.x + dx;
    const targetY = player.y + dy;
    const allTrees = [...TREES, ...this.dynamicTrees];
    return allTrees.filter((tree) => this.treeState[tree.id]?.status === 'alive')
      .map((tree) => ({ tree, distance: Phaser.Math.Distance.Between(targetX, targetY, tree.x * TILE_SIZE + 16, (tree.y + 1) * TILE_SIZE + 16) }))
      .filter((entry) => entry.distance <= 46)
      .sort((a, b) => a.distance - b.distance)[0]?.tree || null;
  }

  collidesAt(body) {
    return [...TREES, ...this.dynamicTrees].some((tree) => {
      const state = this.treeState[tree.id];
      if (!state || state.status !== 'alive') return false;
      // 树的实际碰撞只保留底部树根 tile (y+1)
      const rect = new Phaser.Geom.Rectangle(tree.x * TILE_SIZE, (tree.y + 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      return Phaser.Geom.Intersects.RectangleToRectangle(body, rect);
    });
  }

  isTreeAt(tileX, tileY) {
    return [...TREES, ...this.dynamicTrees].some((tree) => {
      const state = this.treeState[tree.id];
      if (!state || state.status !== 'alive') return false;
      // 树木占地只认树根格 (y+1)
      return tree.x === tileX && tree.y + 1 === tileY;
    });
  }

  addTree(x, y) {
    const id = `tree-dynamic-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newTree = { id, x, y };
    this.dynamicTrees.push(newTree);
    this.treeState[id] = { hits: 0, status: 'alive', shaking: false, fellingProgress: undefined };
    this.render();
  }

  chop(player, direction) {
    const tree = this.getFacingTree(player, direction);
    if (!tree) return { ok: false, message: '前方没有可以砍伐的树' };
    
    const state = this.treeState[tree.id];
    if (state.status !== 'alive') return { ok: false, message: '这棵树已经倒下了' };
    
    state.hits += 1;
    this.scene.status.applyWorkCost(2);
    
    // Shake effect (using graphics offset in next render)
    state.shaking = true;
    this.scene.time.delayedCall(100, () => {
      state.shaking = false;
      this.render();
    });

    if (state.hits >= 3) {
      state.status = 'felled';
      state.fellingProgress = 0; // for animation
      this.scene.inventory.addItem(ITEM_IDS.WOOD, 5);
      
      // Felling animation logic (managed in update or timer)
      this.startFellingAnimation(tree.id);
      
      this.render();
      return { ok: true, message: '树被砍倒了，获得 5 个木材' };
    }
    
    this.render();
    return { ok: true, message: `砍中了树，还需要 ${3 - state.hits} 次` };
  }

  startFellingAnimation(treeId) {
    const state = this.treeState[treeId];
    this.scene.time.addEvent({
      delay: 50,
      repeat: 20,
      callback: () => {
        state.fellingProgress = (state.fellingProgress || 0) + 0.05;
        this.render();
      }
    });
    
    // Disappear after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      state.status = 'hidden';
      state.fellingProgress = undefined;
      this.render();
      this.scene.saveNow(); // Save the final hidden state
    });
  }

  resetDailyProgress() {
    [...TREES, ...this.dynamicTrees].forEach(tree => {
      const state = this.treeState[tree.id];
      if (state && state.status === 'alive') {
        state.hits = 0;
      }
    });
    this.render();
  }

  render() {
    const allTrees = [...TREES, ...this.dynamicTrees];
    const currentIds = new Set(allTrees.map(t => t.id));

    // Cleanup graphics for removed dynamic trees
    for (const [id, graphic] of this.treeGraphics.entries()) {
      if (!currentIds.has(id)) {
        graphic.destroy();
        this.treeGraphics.delete(id);
      }
    }

    allTrees.forEach((tree) => {
      const state = this.treeState[tree.id];
      const graphic = this.getTreeGraphic(tree.id);
      graphic.clear();

      if (!state || state.status === 'hidden' || (state.status === 'felled' && state.fellingProgress === undefined)) {
        graphic.setVisible(false);
        return;
      }
      
      const x = tree.x * TILE_SIZE;
      const y = tree.y * TILE_SIZE;
      
      const treeFootY = y + 58;
      graphic.setDepth(this.scene.getWorldDepth(treeFootY, 0.002));
      graphic.setVisible(this.externalVisible);
      
      // Shake effect
      let drawX = x;
      if (state.shaking) {
        drawX += Math.random() * 4 - 2;
      }
      
      // Felling animation
      if (state.status === 'felled' && state.fellingProgress !== undefined) {
        graphic.alpha = 1 - (state.fellingProgress * 0.5);
      } else {
        graphic.alpha = 1.0;
      }

      graphic.fillStyle(COLORS.treeTrunk, 1);
      graphic.fillRect(drawX + 12, y + 30, 10, 28);
      graphic.fillStyle(COLORS.treeShadow, 1);
      graphic.fillEllipse(drawX + 17, y + 24, 45, 35);
      graphic.fillStyle(COLORS.treeTop, 1);
      graphic.fillCircle(drawX + 12, y + 18, 17);
      graphic.fillCircle(drawX + 23, y + 18, 17);
      graphic.fillCircle(drawX + 17, y + 7, 16);
      
      const hits = state.hits;
      if (hits > 0 && state.status === 'alive') {
        graphic.fillStyle(0xf4d35e, 1);
        for (let index = 0; index < hits; index += 1) graphic.fillRect(drawX + 6 + index * 8, y + 52, 5, 5);
      }
    });
  }

  setVisible(visible) { 
    this.externalVisible = visible;
    this.treeGraphics.forEach((graphic) => graphic.setVisible(visible)); 
  }
  getSnapshot() {
    // Only save essential state fields
    const savedTrees = Object.fromEntries(
      Object.entries(this.treeState).map(([id, state]) => [
        id, 
        { hits: state.hits, status: state.status }
      ])
    );
    return {
      trees: savedTrees,
      dynamicTrees: this.dynamicTrees
    };
  }
  destroy() { 
    this.treeGraphics.forEach((graphic) => graphic.destroy());
    this.treeGraphics.clear();
  }
}
