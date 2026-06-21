import { ITEM_IDS, ITEMS } from './items';
import { createModalShell, makeCloseButton, makeModalButton, modalTextStyle } from './ModalUi';

const RECIPES = {
  mill: [
    { id: 'flour', label: '研磨面粉', input: [{ itemId: ITEM_IDS.WHEAT, quantity: 2 }], output: { itemId: ITEM_IDS.FLOUR, quantity: 1 } }
  ],
  stove: [
    { id: 'bread', label: '烘烤面包', input: [{ itemId: ITEM_IDS.FLOUR, quantity: 1 }], output: { itemId: ITEM_IDS.BREAD, quantity: 1 } },
    { id: 'bottledWater', label: '烧水装瓶', input: [{ itemId: ITEM_IDS.EMPTY_BOTTLE, quantity: 1 }], waterCost: 10, output: { itemId: ITEM_IDS.WATER, quantity: 1 } }
  ]
};

export default class CraftingSystem {
  constructor(scene) {
    this.scene = scene;
    this.layer = null;
    this.mode = 'stove';
  }

  open(mode) {
    this.mode = mode;
    this.render();
  }

  render() {
    this.close();
    const width = 520;
    const height = 300;
    const shell = createModalShell(this.scene, { width, height, depth: 102, onClose: () => this.close() });
    const { layer, x, y } = shell;
    this.layer = layer;
    this.scene.pushModal({ id: 'crafting', close: () => this.close() });
    const title = this.scene.add.text(x + 24, y + 20, this.mode === 'mill' ? '磨坊加工' : '灶台烹饪', modalTextStyle(22, '#3b2a1d', true));
    const close = makeCloseButton(this.scene, x + width - 44, y + 14, () => this.close());
    layer.add([title, ...close]);

    RECIPES[this.mode].forEach((recipe, index) => {
      const rowY = y + 72 + index * 92;
      const bg = this.scene.add.rectangle(x + 24, rowY, width - 48, 76, 0xe7c58a, 1);
      bg.setOrigin(0, 0);
      bg.setStrokeStyle(2, 0x8a5a35, 1);
      bg.setInteractive();
      bg.on('pointerdown', (pointer, localX, localY, event) => {
        event.stopPropagation();
      });
      const name = this.scene.add.text(x + 40, rowY + 12, recipe.label, modalTextStyle(16, '#3b2a1d', true));
      const requirements = recipe.input.map((entry) => `${ITEMS[entry.itemId].name}×${entry.quantity}`).join(' + ') + (recipe.waterCost ? ` + 水壶水量×${recipe.waterCost}` : '');
      const detail = this.scene.add.text(x + 40, rowY + 41, `${requirements} → ${ITEMS[recipe.output.itemId].name}×${recipe.output.quantity}`, modalTextStyle(12, '#6e4526'));
      const craft = makeModalButton(this.scene, {
        x: x + width - 132, y: rowY + 18, width: 92, height: 40, label: '制作',
        onClick: () => this.craft(recipe), color: 0x3f8c55
      });
      layer.add([bg, name, detail, ...craft]);
    });
  }

  craft(recipe) {
    const missing = recipe.input.find((entry) => !this.scene.inventory.hasItem(entry.itemId, entry.quantity));
    if (missing) return this.scene.showMessage(`缺少${ITEMS[missing.itemId].name}`);
    if (recipe.waterCost && this.scene.inventory.getWateringCanState().currentWater < recipe.waterCost) return this.scene.showMessage('水壶水量不足');
    if (!this.scene.inventory.addItem(recipe.output.itemId, recipe.output.quantity)) return this.scene.showMessage('背包已满');
    recipe.input.forEach((entry) => this.scene.inventory.removeItem(entry.itemId, entry.quantity));
    if (recipe.waterCost) this.scene.inventory.consumeWater(recipe.waterCost);
    this.scene.showMessage(`制作了${ITEMS[recipe.output.itemId].name}`);
    this.scene.saveNow();
    this.render();
  }

  isOpen() { return Boolean(this.layer); }
  close() { 
    this.scene.popModal('crafting');
    this.layer?.destroy(); 
    this.layer = null; 
  }
  destroy() { this.close(); }
}
