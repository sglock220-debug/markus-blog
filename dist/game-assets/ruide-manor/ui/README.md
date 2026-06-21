# 锐德庄园 UI 素材替换规则

当前版本使用 Phaser Graphics 和 CSS 绘制原创占位图标，因此下列 PNG 缺失时游戏仍可正常运行。替换素材必须为原创或拥有可商用授权，不得使用外链、其他游戏素材、Logo、字体或截图。

所有 PNG 保持透明背景、整数像素边缘，并在页面中使用 `image-rendering: pixelated`。

## 快捷栏

- `hotbar-slot.png`: 64 x 64 px
- `hotbar-slot-selected.png`: 64 x 64 px

## 物品图标

放入 `items/`：

- `axe.png`: 32 x 32 px
- `hoe.png`: 32 x 32 px
- `watering-can.png`: 32 x 32 px
- `strawberry-seed.png`: 32 x 32 px
- `strawberry.png`: 32 x 32 px
- `wood.png`: 32 x 32 px
- `stone.png`: 32 x 32 px
- `bread.png`: 32 x 32 px
- `water.png`: 32 x 32 px

## HUD 图标

放入 `hud/`：

- `coin.png`: 24 x 24 px
- `weather-sunny.png`: 32 x 32 px
- `weather-cloudy.png`: 32 x 32 px
- `weather-rainy.png`: 32 x 32 px
- `health.png`: 24 x 24 px
- `hunger.png`: 24 x 24 px
- `thirst.png`: 24 x 24 px

文件替换后应保持上述文件名和尺寸。若未来接入这些 PNG，加载失败时仍须回退到现有 Graphics/CSS 图形。
