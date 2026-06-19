<template>
  <div class="games-page container">
    <!-- Header Section -->
    <header class="page-header">
      <div class="header-content">
        <span class="header-icon">🎮</span>
        <div class="header-text">
          <h1>游戏与娱乐</h1>
          <p class="subtitle">选择你想体验的游戏</p>
        </div>
      </div>
    </header>

    <!-- Games Grid -->
    <div class="games-grid">
      <GameCard 
        v-for="game in games" 
        :key="game.id" 
        :game="game"
        @select="handleGameSelect"
      />
    </div>

    <GameEntryConfirmModal
      :show="showReidManorConfirm"
      title="游玩 锐德庄园"
      message="是否进入锐德庄园游戏？"
      @cancel="showReidManorConfirm = false"
      @confirm="enterReidManor"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import GameCard from '../components/games/GameCard.vue';
import GameEntryConfirmModal from '../components/games/GameEntryConfirmModal.vue';

const router = useRouter();
const showReidManorConfirm = ref(false);
const games = ref([
  { id: 1, name: '扫雷', enabled: false, cover: '', description: '经典解谜游戏，排除所有雷区。', route: '/games/minesweeper' },
  { id: 2, name: '2048', enabled: false, cover: '', description: '滑动数字，拼凑出 2048。', route: '/games/2048' },
  { id: 3, name: '贪吃蛇', enabled: false, cover: '', description: '操控小蛇吃掉果实，不要碰到自己。', route: '/games/snake' },
  { id: 4, name: '五子棋', enabled: false, cover: '', description: '策略对弈，先连成五子者胜。', route: '/games/gomoku' },
  { id: 5, name: '俄罗斯方块', enabled: false, cover: '', description: '堆叠方块，消除整行。', route: '/games/tetris' },
  { id: 6, name: '数独', enabled: false, cover: '', description: '逻辑填数，挑战大脑极限。', route: '/games/sudoku' },
  { id: 7, name: '猜数字', enabled: false, cover: '', description: '根据提示猜出隐藏的数字。', route: '/games/guess-number' },
  { id: 8, name: '锐德庄园', enabled: true, cover: '', description: '经营农场，探索小镇，开启你的庄园生活。', route: '/games/reid-manor', confirmBeforeEnter: true },
  { id: 9, name: '黑白棋', enabled: false, cover: '', description: '翻转对方棋子，占领更多地盘。', route: '/games/reversi' },
  { id: 10, name: '更多游戏', enabled: false, cover: '', description: '新游戏正在开发中，敬请期待。', route: '' }
]);

const handleGameSelect = (game) => {
  if (game.route === '/games/reid-manor') {
    showReidManorConfirm.value = true;
  }
};

const enterReidManor = () => {
  showReidManorConfirm.value = false;
  router.push('/games/reid-manor');
};
</script>

<style scoped>
.games-page {
  padding: 20px 20px;
  min-height: 80vh;
}

.page-header {
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-icon {
  font-size: 3.5rem;
  background: rgba(var(--accent-rgb), 0.1);
  width: 80px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 20px;
}

.header-text h1 {
  font-size: 2.2rem;
  margin: 0 0 5px 0;
  color: var(--text-color);
  font-weight: 800;
}

.subtitle {
  color: var(--secondary-text);
  font-size: 1.1rem;
  margin: 0;
}

/* Games Grid Styles with precise responsive steps */
.games-grid {
  display: grid;
  gap: 24px;
  grid-template-columns: repeat(5, 1fr);
  margin: 0 auto;
}

/* Responsive Breakpoints */
@media (max-width: 1400px) {
  .games-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 1200px) {
  .games-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 900px) {
  .games-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .header-icon {
    font-size: 2.5rem;
    width: 60px;
    height: 60px;
  }
  .header-text h1 {
    font-size: 1.8rem;
  }
}

@media (max-width: 640px) {
  .games-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  .games-page {
    padding: 20px 16px;
  }
}

@media (max-width: 420px) {
  .games-grid {
    grid-template-columns: 1fr;
  }
  .header-content {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
}
</style>
