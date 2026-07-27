<template>
  <main class="notes-page" :style="notebookVars">
    <section class="notebook-stage" aria-label="笔记本">
      <div class="page-fill left-page-fill"></div>
      <div class="page-fill right-page-fill"></div>

      <aside class="notebook-left-page">
        <div class="mode-list">
          <button
            v-for="mode in modes"
            :key="mode.id"
            type="button"
            class="mode-btn"
            :class="{ active: activeMode === mode.id }"
            @click="activeMode = mode.id"
          >
            <span class="mode-icon">{{ mode.icon }}</span>
            <span>{{ mode.label }}</span>
          </button>
        </div>

        <div class="quick-panel">
          <div class="quick-title">{{ activeModeLabel }}</div>
          <div class="quick-meta">{{ quickMeta }}</div>
        </div>
      </aside>

      <section class="notebook-right-page">
        <div v-if="activeMode === 'sticky'" class="content-view sticky-view">
          <header class="content-toolbar">
            <h1>便签</h1>
            <button type="button" @click="addSticky">新增</button>
          </header>
          <div class="sticky-grid">
            <article v-for="note in stickyNotes" :key="note.id" class="sticky-card">
              <textarea v-model="note.text" maxlength="220" placeholder="写点什么"></textarea>
              <button type="button" class="delete-btn" @click="removeSticky(note.id)">删除</button>
            </article>
          </div>
        </div>

        <div v-else-if="activeMode === 'note'" class="content-view note-view">
          <header class="content-toolbar">
            <input v-model="longNote.title" class="note-title-input" maxlength="30" placeholder="笔记标题" />
            <span>{{ longNote.body.length }}/3000</span>
          </header>
          <textarea v-model="longNote.body" class="note-body-input" maxlength="3000" placeholder="开始写笔记"></textarea>
        </div>

        <div v-else-if="activeMode === 'worksheet'" class="content-view worksheet-view">
          <header class="content-toolbar">
            <h1>工作表</h1>
            <button type="button" @click="addWorksheetRow">新增</button>
          </header>
          <div class="worksheet-table">
            <div class="worksheet-head">
              <span>状态</span>
              <span>事项</span>
              <span>日期</span>
              <span></span>
            </div>
            <div v-for="row in worksheetRows" :key="row.id" class="worksheet-row">
              <input v-model="row.done" type="checkbox" />
              <input v-model="row.task" type="text" maxlength="60" placeholder="待办事项" />
              <input v-model="row.date" type="date" />
              <button type="button" class="delete-btn" @click="removeWorksheetRow(row.id)">删除</button>
            </div>
          </div>
        </div>

        <div v-else class="content-view settings-view">
          <header class="content-toolbar">
            <h1>设置</h1>
            <button type="button" @click="resetSettings">重置</button>
          </header>
          <div class="settings-grid">
            <label>
              <span>文字颜色</span>
              <input v-model="settings.textColor" type="color" />
            </label>
            <label>
              <span>文字大小</span>
              <input v-model.number="settings.fontSize" type="range" min="14" max="24" step="1" />
              <strong>{{ settings.fontSize }}px</strong>
            </label>
            <label>
              <span>左侧背景颜色</span>
              <input v-model="settings.leftBg" type="color" />
            </label>
            <label>
              <span>右侧背景颜色</span>
              <input v-model="settings.rightBg" type="color" />
            </label>
          </div>
        </div>
      </section>

      <img class="notebook-frame" src="/Notebook.png" alt="" draggable="false" />
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const STORAGE_KEY = 'notebook_notes_state_v1';

const modes = [
  { id: 'sticky', label: '便签', icon: '☑' },
  { id: 'note', label: '笔记', icon: '✎' },
  { id: 'worksheet', label: '工作表', icon: '▦' },
  { id: 'settings', label: '设置', icon: '⚙' },
];

const defaultState = {
  activeMode: 'sticky',
  stickyNotes: [
    { id: 1, text: '今天要完成的事' },
    { id: 2, text: '灵感先放这里' },
  ],
  longNote: {
    title: '我的笔记',
    body: '',
  },
  worksheetRows: [
    { id: 1, done: false, task: '整理学习计划', date: '' },
  ],
  settings: {
    textColor: '#2f2a24',
    fontSize: 17,
    leftBg: '#fff7cf',
    rightBg: '#fffdf7',
  },
};

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...defaultState, ...saved } : structuredClone(defaultState);
  } catch (err) {
    return structuredClone(defaultState);
  }
};

const initialState = loadState();
const activeMode = ref(initialState.activeMode);
const stickyNotes = ref(initialState.stickyNotes);
const longNote = ref(initialState.longNote);
const worksheetRows = ref(initialState.worksheetRows);
const settings = ref(initialState.settings);

const activeModeLabel = computed(() => modes.find((mode) => mode.id === activeMode.value)?.label || '笔记');

const quickMeta = computed(() => {
  if (activeMode.value === 'sticky') return `${stickyNotes.value.length} 张便签`;
  if (activeMode.value === 'worksheet') return `${worksheetRows.value.length} 条事项`;
  if (activeMode.value === 'settings') return '外观';
  return longNote.value.title || '未命名';
});

const notebookVars = computed(() => ({
  '--note-text-color': settings.value.textColor,
  '--note-font-size': `${settings.value.fontSize}px`,
  '--left-page-bg': settings.value.leftBg,
  '--right-page-bg': settings.value.rightBg,
}));

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeMode: activeMode.value,
    stickyNotes: stickyNotes.value,
    longNote: longNote.value,
    worksheetRows: worksheetRows.value,
    settings: settings.value,
  }));
};

watch([activeMode, stickyNotes, longNote, worksheetRows, settings], saveState, { deep: true });

const nextId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

const addSticky = () => {
  stickyNotes.value.unshift({ id: nextId(stickyNotes.value), text: '' });
};

const removeSticky = (id) => {
  stickyNotes.value = stickyNotes.value.filter((note) => note.id !== id);
};

const addWorksheetRow = () => {
  worksheetRows.value.push({ id: nextId(worksheetRows.value), done: false, task: '', date: '' });
};

const removeWorksheetRow = (id) => {
  worksheetRows.value = worksheetRows.value.filter((row) => row.id !== id);
};

const resetSettings = () => {
  settings.value = { ...defaultState.settings };
};
</script>

<style scoped>
.notes-page {
  min-height: calc(100dvh - var(--navbar-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(8px, 1.5vw, 18px);
  color: var(--note-text-color);
  font-size: var(--note-font-size);
  overflow: hidden;
}

.notebook-stage {
  position: relative;
  width: min(
    1480px,
    calc(100vw - 32px),
    calc((100dvh - var(--navbar-height) - 36px) * 1.5)
  );
  aspect-ratio: 3 / 2;
  isolation: isolate;
}

.notebook-frame {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.page-fill,
.notebook-left-page,
.notebook-right-page {
  position: absolute;
}

.page-fill {
  z-index: 1;
  border-radius: 16px;
}

.left-page-fill {
  left: 3.6%;
  top: 5.3%;
  width: 25.6%;
  height: 88.8%;
  background: var(--left-page-bg);
}

.right-page-fill {
  left: 32%;
  top: 5.2%;
  width: 61.2%;
  height: 88.8%;
  background: var(--right-page-bg);
}

.notebook-left-page {
  z-index: 4;
  left: 5.2%;
  top: 11%;
  width: 19.8%;
  height: 78%;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vw, 28px);
}

.notebook-right-page {
  z-index: 4;
  left: 35%;
  top: 9%;
  width: 55.2%;
  height: 82%;
  overflow: hidden;
}

.mode-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 10px 14px;
  border: 1px solid rgba(109, 80, 35, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.42);
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.mode-btn:hover,
.mode-btn.active {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 10px 24px rgba(120, 91, 38, 0.14);
}

.mode-icon {
  width: 26px;
  text-align: center;
}

.quick-panel {
  margin-top: auto;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.32);
  border: 1px solid rgba(109, 80, 35, 0.14);
}

.quick-title {
  font-size: 1.4em;
  font-weight: 800;
}

.quick-meta {
  margin-top: 6px;
  color: color-mix(in srgb, var(--note-text-color), transparent 30%);
}

.content-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 0 0 auto;
  min-height: 42px;
}

.content-toolbar h1 {
  font-size: 1.35em;
  line-height: 1.2;
}

.content-toolbar button,
.delete-btn {
  border: 1px solid rgba(105, 78, 40, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  font-weight: 700;
  padding: 8px 12px;
}

.sticky-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  overflow: auto;
  padding-right: 6px;
}

.sticky-card {
  min-height: 150px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 245, 158, 0.72);
  box-shadow: 0 10px 28px rgba(117, 89, 30, 0.12);
}

textarea,
input[type="text"],
input[type="date"] {
  width: 100%;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
  color: inherit;
  font: inherit;
  outline: none;
}

textarea {
  resize: none;
  flex: 1;
  min-height: 0;
  padding: 10px;
  line-height: 1.55;
}

.note-title-input {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  font-size: 1.15em;
  font-weight: 800;
}

.note-body-input {
  height: 100%;
  min-height: 0;
  background:
    linear-gradient(transparent calc(1.7em - 1px), rgba(89, 132, 168, 0.18) 1px),
    rgba(255, 255, 255, 0.28);
  background-size: 100% 1.7em;
}

.worksheet-table {
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: auto;
  padding-right: 6px;
}

.worksheet-head,
.worksheet-row {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) 160px 64px;
  align-items: center;
  gap: 10px;
}

.worksheet-head {
  font-weight: 800;
  color: color-mix(in srgb, var(--note-text-color), transparent 28%);
}

.worksheet-row {
  min-height: 44px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.36);
}

.worksheet-row input[type="checkbox"] {
  width: 20px;
  height: 20px;
  justify-self: center;
}

.worksheet-row input[type="text"],
.worksheet-row input[type="date"] {
  height: 34px;
  padding: 6px 9px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  overflow: auto;
}

.settings-grid label {
  display: grid;
  gap: 10px;
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(105, 78, 40, 0.14);
  font-weight: 800;
}

.settings-grid input[type="color"] {
  width: 100%;
  height: 44px;
  border: 0;
  background: transparent;
}

.settings-grid input[type="range"] {
  width: 100%;
}

@media (max-width: 900px) {
  .notes-page {
    overflow-x: auto;
    justify-content: flex-start;
  }

  .notebook-stage {
    width: 980px;
  }
}
</style>
