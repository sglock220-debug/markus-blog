import Phaser from 'phaser';
import {
  COLLISION_RECTS,
  MAP_COLUMNS,
  MAP_ROWS,
  NPCS,
  TILE_SIZE,
  VILLAGE_HOUSES,
  isPointInWater,
  isWaterTile
} from './map';
import { createModalShell, makeCloseButton } from './ModalUi';

const NPC_SPEED = 22;
const SWIM_SPEED_FACTOR = 0.8;
const WATER_PATH_COST = 6;
const STUCK_CHECK_MS = 3200;
const INTERACTION_DISTANCE = 42;

export default class NpcSystem {
  constructor(scene) {
    this.scene = scene;
    this.npcs = NPCS.map((config) => this.createNpc(config));
    this.dialogLayer = null;
    this.externalVisible = true;
  }

  createNpc(config) {
    const sprite = this.scene.add.container(config.x * TILE_SIZE + 16, config.y * TILE_SIZE + 18);
    const body = this.scene.add.graphics();
    body.fillStyle(config.color, 1);
    body.fillRoundedRect(-9, -13, 18, 24, 5);
    body.fillStyle(0xf0bd8b, 1);
    body.fillCircle(0, -18, 8);
    body.fillStyle(0x2d281f, 1);
    body.fillRect(-3, -20, 2, 2);
    body.fillRect(4, -20, 2, 2);

    const displayName = `${config.name}（${config.profession || '村民'}）`;
    const name = this.scene.add.text(0, -42, displayName, {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: '12px',
      color: '#fff7df',
      backgroundColor: 'rgba(45, 40, 31, 0.62)',
      padding: { x: 6, y: 3 }
    });
    name.setOrigin(0.5, 0);

    const swimEffects = this.scene.add.graphics();

    sprite.add([body, name, swimEffects]);

    const npc = {
      ...config,
      sprite,
      body,
      swimEffects,
      isSwimming: isPointInWater(sprite.x, sprite.y),
      patrolIndex: 0,
      idleOffset: Math.random() * Math.PI * 2,
      path: [],
      pathIndex: 0,
      targetKey: '',
      atHome: false,
      stuckElapsed: 0,
      stuckDistance: 0,
      stuckRetries: 0,
      lastPosition: { x: sprite.x, y: sprite.y }
    };

    this.updateNpcWorldDepth(npc);
    return npc;
  }

  update(delta) {
    const hour = this.scene.gameTime.getHour();
    const isNight = hour >= 20 || hour < 6;

    this.npcs.forEach((npc) => {
      if (!this.externalVisible) {
        npc.sprite.setVisible(false);
        return;
      }

      npc.isSwimming = isPointInWater(npc.sprite.x, npc.sprite.y);
      const target = this.getMovementTarget(npc, isNight);
      if (!target) {
        npc.sprite.setVisible(!isNight && !npc.atHome);
        this.updateSwimVisual(npc, false);
        return;
      }

      npc.sprite.setVisible(true);
      const distanceToTarget = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, target.x, target.y);
      if (isNight && distanceToTarget <= 18 && !npc.isSwimming) {
        npc.atHome = true;
        npc.sprite.setVisible(false);
        npc.path = [];
        this.updateSwimVisual(npc, false);
        return;
      }

      if (!isNight && npc.atHome && distanceToTarget <= 8) {
        npc.atHome = false;
        npc.path = [];
      }

      const moved = this.moveAlongPath(npc, target, delta);
      this.updateNpcWorldDepth(npc);
      npc.isSwimming = isPointInWater(npc.sprite.x, npc.sprite.y);
      this.updateSwimVisual(npc, moved);
      this.updateStuckProtection(npc, target, delta, moved);
    });
  }

  updateNpcWorldDepth(npc) {
    const npcFootY = npc.sprite.y + 14;
    npc.sprite.setDepth(this.scene.getWorldDepth(npcFootY, 0.001));
  }

  getMovementTarget(npc, isNight) {
    if (npc.isSwimming) {
      const shore = this.findNearestLegalLandTile(Math.floor(npc.sprite.x / TILE_SIZE), Math.floor(npc.sprite.y / TILE_SIZE));
      if (shore) return tileCenter(shore.x, shore.y);
    }

    const home = VILLAGE_HOUSES.find((house) => house.id === npc.homeId);
    if (isNight) {
      const door = home?.outsideDoorPosition || { x: home?.x || npc.x, y: (home?.y || npc.y) + (home?.height || 0) };
      return tileCenter(door.x, door.y);
    }

    if (npc.atHome) return this.getPreferredLandTarget(npc.x, npc.y);
    if (!npc.patrol?.length) return null;
    const patrolTarget = npc.patrol[npc.patrolIndex];
    const target = this.getPreferredLandTarget(patrolTarget.x, patrolTarget.y);
    if (Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, target.x, target.y) <= 7) {
      npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrol.length;
      const next = npc.patrol[npc.patrolIndex];
      return this.getPreferredLandTarget(next.x, next.y);
    }
    return target;
  }

  getPreferredLandTarget(tileX, tileY) {
    if (!isWaterTile(tileX, tileY) && !this.isBlockedTile(tileX, tileY)) return tileCenter(tileX, tileY);
    const land = this.findNearestLegalLandTile(tileX, tileY);
    return land ? tileCenter(land.x, land.y) : tileCenter(tileX, tileY);
  }

  moveAlongPath(npc, target, delta) {
    const targetTile = worldToTile(target.x, target.y);
    const targetKey = `${targetTile.x},${targetTile.y}`;
    if (npc.targetKey !== targetKey || !npc.path.length || npc.pathIndex >= npc.path.length) {
      npc.path = this.findPath(worldToTile(npc.sprite.x, npc.sprite.y), targetTile);
      npc.pathIndex = npc.path.length > 1 ? 1 : 0;
      npc.targetKey = targetKey;
    }
    if (!npc.path.length || npc.pathIndex >= npc.path.length) return false;

    const waypoint = tileCenter(npc.path[npc.pathIndex].x, npc.path[npc.pathIndex].y);
    const dx = waypoint.x - npc.sprite.x;
    const dy = waypoint.y - npc.sprite.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= 2) {
      npc.pathIndex += 1;
      return false;
    }

    const speed = NPC_SPEED * (npc.isSwimming ? SWIM_SPEED_FACTOR : 1);
    const step = Math.min(distance, speed * (delta / 1000));
    npc.sprite.x += (dx / distance) * step;
    npc.sprite.y += (dy / distance) * step;
    return step > 0;
  }

  findPath(start, target) {
    if (this.isBlockedTile(target.x, target.y)) return [];
    const open = [{ ...start, cost: 0, score: manhattan(start, target) }];
    const cameFrom = new Map();
    const costs = new Map([[tileKey(start), 0]]);

    while (open.length) {
      open.sort((a, b) => a.score - b.score);
      const current = open.shift();
      if (current.x === target.x && current.y === target.y) return reconstructPath(cameFrom, current);

      cardinalNeighbors(current).forEach((next) => {
        if (this.isBlockedTile(next.x, next.y)) return;
        const nextCost = current.cost + (isWaterTile(next.x, next.y) ? WATER_PATH_COST : 1);
        const key = tileKey(next);
        if (nextCost >= (costs.get(key) ?? Infinity)) return;
        costs.set(key, nextCost);
        cameFrom.set(key, { x: current.x, y: current.y });
        open.push({ ...next, cost: nextCost, score: nextCost + manhattan(next, target) });
      });
    }
    return [];
  }

  isBlockedTile(tileX, tileY) {
    if (tileX < 0 || tileY < 0 || tileX >= MAP_COLUMNS || tileY >= MAP_ROWS) return true;
    const rect = new Phaser.Geom.Rectangle(tileX * TILE_SIZE + 5, tileY * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10);
    if (COLLISION_RECTS.some((obstacle) => Phaser.Geom.Intersects.RectangleToRectangle(
      rect,
      new Phaser.Geom.Rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height)
    ))) return true;
    if (this.scene.resources?.isTreeAt(tileX, tileY)) return true;
    return this.scene.chest?.state?.position?.x === tileX && this.scene.chest?.state?.position?.y === tileY;
  }

  findNearestLegalLandTile(startX, startY) {
    const queue = [{ x: startX, y: startY }];
    const visited = new Set([`${startX},${startY}`]);
    while (queue.length) {
      const current = queue.shift();
      if (!isWaterTile(current.x, current.y) && !this.isBlockedTile(current.x, current.y)) return current;
      cardinalNeighbors(current).forEach((next) => {
        const key = tileKey(next);
        if (visited.has(key) || next.x < 0 || next.y < 0 || next.x >= MAP_COLUMNS || next.y >= MAP_ROWS) return;
        visited.add(key);
        queue.push(next);
      });
    }
    return null;
  }

  updateStuckProtection(npc, target, delta, moved) {
    const travelled = Phaser.Math.Distance.Between(npc.lastPosition.x, npc.lastPosition.y, npc.sprite.x, npc.sprite.y);
    npc.stuckDistance += travelled;
    npc.stuckElapsed += delta;
    npc.lastPosition = { x: npc.sprite.x, y: npc.sprite.y };
    if (npc.stuckElapsed < STUCK_CHECK_MS) return;

    const stillNeedsMove = Phaser.Math.Distance.Between(npc.sprite.x, npc.sprite.y, target.x, target.y) > 10;
    if (stillNeedsMove && (!moved || npc.stuckDistance < 3)) {
      npc.path = [];
      npc.targetKey = '';
      npc.stuckRetries += 1;
      if (npc.stuckRetries >= 2) {
        const current = worldToTile(npc.sprite.x, npc.sprite.y);
        const shore = this.findNearestLegalLandTile(current.x, current.y);
        if (shore) npc.sprite.setPosition(tileCenter(shore.x, shore.y).x, tileCenter(shore.x, shore.y).y);
        npc.stuckRetries = 0;
      }
    } else {
      npc.stuckRetries = 0;
    }
    npc.stuckElapsed = 0;
    npc.stuckDistance = 0;
  }

  updateSwimVisual(npc, isMoving) {
    npc.swimEffects.clear();
    if (!npc.isSwimming) {
      npc.body.y = 0;
      return;
    }
    const bob = Math.sin(this.scene.time.now / 260 + npc.idleOffset) * 1.4;
    const pulse = (Math.sin(this.scene.time.now / 190 + npc.idleOffset) + 1) * 1.5;
    npc.body.y = bob;
    npc.swimEffects.lineStyle(2, 0x2f83b8, 0.65);
    npc.swimEffects.strokeEllipse(0, 8, 27 + pulse, 9 + pulse * 0.3);
    if (isMoving) {
      npc.swimEffects.lineStyle(1, 0xb7e4f7, 0.55);
      npc.swimEffects.strokeEllipse(0, 10, 38 + pulse * 2, 12 + pulse);
    }
    npc.swimEffects.fillStyle(0x4aa6d9, 0.86);
    npc.swimEffects.fillRect(-10, 1 + bob, 20, 14);
    npc.swimEffects.lineStyle(1, 0xc8efff, 0.7);
    npc.swimEffects.lineBetween(-9, 2 + bob, 9, 2 + bob);
  }

  getNearby(player) {
    return this.npcs.find((npc) => {
      if (!npc.sprite.visible) return false;
      const distance = Math.hypot(player.x - npc.sprite.x, player.y - npc.sprite.y);
      return distance <= INTERACTION_DISTANCE;
    }) || null;
  }

  setVisible(visible) {
    this.externalVisible = visible;
    const hour = this.scene.gameTime.getHour();
    this.npcs.forEach((npc) => npc.sprite.setVisible(visible && hour >= 6 && hour < 20));
  }

  openDialog(npc) {
    this.closeDialog();
    this.dialogLayer = createPanel(this.scene, `${npc.name}（${npc.profession || '村民'}）`, npc.dialog, '点击空白处或按 ESC 关闭', () => {
      this.dialogLayer = null;
    }, npc.id === 'doctorLin' ? () => this.treatByDoctor() : null);
    this.scene.pushModal({ id: 'npcs', close: () => this.closeDialog() });
  }

  treatByDoctor() {
    const price = 30;
    if (!this.scene.inventory.removeItem('coin', price)) return this.scene.showMessage('金币不够');
    const result = this.scene.status.heal(60, '医生注射');
    if (!result.ok) this.scene.inventory.addItem('coin', price);
    this.scene.showMessage(result.message);
    this.scene.saveNow();
    this.closeDialog();
  }

  isOpen() {
    return Boolean(this.dialogLayer);
  }

  closeDialog() {
    this.scene.popModal('npcs');
    this.dialogLayer?.destroy();
    this.dialogLayer = null;
  }

  destroy() {
    this.closeDialog();
    this.npcs.forEach((npc) => npc.sprite.destroy());
  }
}

function worldToTile(x, y) {
  return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

function tileCenter(x, y) {
  return { x: x * TILE_SIZE + TILE_SIZE / 2, y: y * TILE_SIZE + TILE_SIZE / 2 };
}

function cardinalNeighbors(tile) {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 }
  ];
}

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom, current) {
  const path = [{ x: current.x, y: current.y }];
  let key = tileKey(current);
  while (cameFrom.has(key)) {
    const previous = cameFrom.get(key);
    path.push(previous);
    key = tileKey(previous);
  }
  return path.reverse();
}

function createPanel(scene, title, body, hint, onClose, onTreat = null) {
  const width = 420;
  const height = onTreat ? 220 : 180;
  let layer;
  const shell = createModalShell(scene, {
    width,
    height,
    depth: 80,
    onClose: () => layer?.destroy()
  });
  ({ layer } = shell);
  const { x, y } = shell;

  const titleText = scene.add.text(x + 22, y + 18, title, textStyle(20, '#333333', true));
  const bodyText = scene.add.text(x + 22, y + 62, body, {
    ...textStyle(15, '#666666'),
    wordWrap: { width: width - 44 }
  });
  const hintText = scene.add.text(x + 22, y + height - 34, hint, textStyle(13, '#4a90e2'));
  const close = makeCloseButton(scene, x + width - 44, y + 14, () => layer.destroy());

  const extras = onTreat ? makeDoctorButtons(scene, x, y, onTreat) : [];
  layer.add([titleText, bodyText, hintText, ...extras, ...close]);
  layer.destroy = wrapDestroy(layer, () => {
    onClose?.();
  });
  return layer;
}

function makeDoctorButtons(scene, x, y, onTreat) {
  const button = scene.add.rectangle(x + 236, y + 146, 144, 36, 0x3f8c55, 1);
  button.setOrigin(0, 0);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerdown', (pointer, localX, localY, event) => { event.stopPropagation(); onTreat(); });
  const text = scene.add.text(x + 308, y + 164, '打针治疗 · 30金币', textStyle(12, '#ffffff', true));
  text.setOrigin(0.5, 0.5);
  return [button, text];
}

function textStyle(size, color, bold = false) {
  return {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    fontSize: `${size}px`,
    color,
    fontStyle: bold ? 'bold' : 'normal'
  };
}

function wrapDestroy(layer, beforeDestroy) {
  const originalDestroy = layer.destroy.bind(layer);
  return (...args) => {
    beforeDestroy();
    originalDestroy(...args);
  };
}
