async (page) => page.evaluate(() => {
  const scene = document.querySelector('.reid-manor-page').__vueParentComponent.setupState.getGameScene();
  const checks = [[9,10], [7,11], [22,9], [2,8], [3,2]].map(([x,y]) => {
    scene.chest.state.position = { x, y };
    return {
      x, y,
      chest: scene.chest.canPlaceHere(),
      objectWithPlayer: scene.hasBlockingObjectAt(x, y, { ignoreChest: true, includePlayer: true }),
      objectWithoutPlayer: scene.hasBlockingObjectAt(x, y, { ignoreChest: true, includePlayer: false }),
      farm: scene.farming.hasActiveStateAt(x, y),
      tree: scene.resources.isTreeAt(x, y),
      plot: scene.treePlots.get(`${x},${y}`) || null
    };
  });
  return {
    inside: scene.interior.inside,
    player: { x: scene.player.x, y: scene.player.y },
    npcs: scene.npcs.npcs.map((npc) => ({ x: npc.sprite.x, y: npc.sprite.y })),
    checks
  };
})
