import Phaser from 'phaser';
import ReidManorScene from './ReidManorScene';
import { WORLD_HEIGHT, WORLD_WIDTH } from './map';

export function createReidManorGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: '#6fb55a',
    pixelArt: true,
    roundPixels: true,
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true
    },
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT
    },
    callbacks: {
      postBoot: (game) => {
        requestAnimationFrame(() => game.scale.refresh());
      }
    },
    scene: [ReidManorScene]
  });
}
