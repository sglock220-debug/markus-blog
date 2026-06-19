<template>
  <div 
    class="game-card" 
    :class="{ 'disabled': !game.enabled }"
    @click="handleClick"
  >
    <div class="game-cover-container">
      <img 
        v-if="game.cover" 
        :src="game.cover" 
        class="game-cover"
        :alt="game.name"
      />
      <div v-else class="placeholder-cover">
        <span class="placeholder-icon">🎮</span>
        <span v-if="!game.enabled" class="coming-soon">敬请期待</span>
      </div>
      <div class="hover-overlay">
        <span class="play-btn-icon">▶</span>
      </div>
    </div>
    <div class="game-info">
      <h3 class="game-name">{{ game.name }}</h3>
      <p v-if="game.description" class="game-desc">{{ game.description }}</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  game: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['select']);
const router = useRouter();

const handleClick = () => {
  if (props.game.confirmBeforeEnter) {
    emit('select', props.game);
    return;
  }

  if (props.game.enabled) {
    if (props.game.route) {
      router.push(props.game.route);
    }
  } else {
    // Simple toast/alert for disabled games
    alert('该游戏正在开发中，敬请期待！');
  }
};
</script>

<style scoped>
.game-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--card-shadow);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.game-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  border-color: var(--accent-color);
}

.game-card.disabled {
  cursor: default;
}

.game-cover-container {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  background: #f0f0f0;
  overflow: hidden;
}

.game-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.game-card:hover .game-cover {
  transform: scale(1.1);
}

.placeholder-cover {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  color: #ccc;
}

.placeholder-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}

.coming-soon {
  font-size: 0.9rem;
  font-weight: 600;
  color: #999;
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(var(--accent-rgb), 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
}

.game-card:hover:not(.disabled) .hover-overlay {
  opacity: 1;
}

.play-btn-icon {
  color: #fff;
  font-size: 2.5rem;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.game-info {
  padding: 16px;
  text-align: center;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.game-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-color);
}

.game-desc {
  font-size: 0.85rem;
  color: var(--secondary-text);
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Dark mode adjustments */
[data-theme="dark"] .placeholder-cover {
  background: #333;
}
</style>
