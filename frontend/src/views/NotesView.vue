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
            @click="setMode(mode.id)"
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
          <template v-if="selectedSticky && stickyDetailMode">
            <header class="content-toolbar sticky-detail-toolbar">
              <button type="button" class="back-btn" @click="closeStickyDetail">返回</button>
              <div class="sticky-detail-title">
                <span>{{ stickyDetailMode === 'edit' ? '编辑便签' : '查看便签' }}</span>
                <small>{{ selectedSticky.text.length }}/500</small>
              </div>
              <button
                v-if="stickyDetailMode === 'view'"
                type="button"
                class="toolbar-icon-btn"
                aria-label="编辑便签"
                title="编辑"
                @click="openStickyDetail(selectedSticky, 'edit')"
              >
                <Pencil :size="18" />
              </button>
            </header>

            <div v-if="stickyDetailMode === 'edit'" class="sticky-editor" :style="stickyCardStyle(selectedSticky)">
              <textarea
                v-model="selectedSticky.text"
                class="sticky-editor-textarea"
                maxlength="500"
                placeholder="写点什么"
              ></textarea>

              <div class="sticky-editor-panel">
                <label class="field-label">
                  <span>标签</span>
                  <select v-model="selectedSticky.tagId" @change="syncStickyTagColor(selectedSticky)">
                    <option v-for="tag in allTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
                  </select>
                </label>

                <div class="field-label">
                  <span>标签颜色</span>
                  <div class="color-row" aria-label="选择标签颜色">
                    <button
                      v-for="color in tagColorOptions"
                      :key="color"
                      type="button"
                      class="color-swatch"
                      :class="{ active: selectedSticky.color === color }"
                      :style="{ backgroundColor: color }"
                      :aria-label="`选择颜色 ${color}`"
                      @click="setStickyColor(selectedSticky, color)"
                    ></button>
                    <label class="custom-color">
                      <input v-model="selectedSticky.color" type="color" />
                      <span>自定义</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <article v-else class="sticky-reader" :style="stickyCardStyle(selectedSticky)">
              <div class="sticky-reader-tag">
                <span class="tag-dot" :style="{ backgroundColor: selectedSticky.color }"></span>
                {{ stickyTagName(selectedSticky) }}
              </div>
              <p>{{ selectedSticky.text || '还没有内容' }}</p>
            </article>
          </template>

          <template v-else>
            <header class="content-toolbar">
              <h1>便签</h1>
              <button type="button" @click="addSticky">新增</button>
            </header>
            <div class="sticky-grid">
              <article
                v-for="note in stickyNotes"
                :key="note.id"
                class="sticky-card"
                :style="stickyCardStyle(note)"
              >
                <div class="sticky-card-actions" aria-label="便签操作">
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="查看便签"
                    title="查看"
                    @click="openStickyDetail(note, 'view')"
                  >
                    <Eye :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action"
                    aria-label="编辑便签"
                    title="编辑"
                    @click="openStickyDetail(note, 'edit')"
                  >
                    <Pencil :size="16" />
                  </button>
                  <button
                    type="button"
                    class="circle-action delete-action"
                    aria-label="删除便签"
                    title="删除"
                    @click="removeSticky(note.id)"
                  >
                    <X :size="18" />
                  </button>
                </div>
                <div class="sticky-tag">
                  <span class="tag-dot" :style="{ backgroundColor: note.color }"></span>
                  {{ stickyTagName(note) }}
                </div>
                <p class="sticky-preview">{{ note.text || '写点什么' }}</p>
              </article>
            </div>
          </template>
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

          <section class="custom-tags-panel" aria-label="自定义标签">
            <div class="custom-tags-header">
              <h2>自定义标签</h2>
              <span>{{ settings.customTags.length }} 个</span>
            </div>
            <div class="custom-tag-form">
              <input v-model.trim="newTagName" type="text" maxlength="10" placeholder="标签名" />
              <input v-model="newTagColor" type="color" aria-label="标签颜色" />
              <button type="button" class="icon-text-btn" @click="addCustomTag">
                <Plus :size="17" />
                添加
              </button>
            </div>
            <div class="custom-tag-list">
              <div v-for="tag in settings.customTags" :key="tag.id" class="custom-tag-item">
                <span class="tag-dot" :style="{ backgroundColor: tag.color }"></span>
                <span>{{ tag.name }}</span>
                <button
                  type="button"
                  class="circle-action delete-action"
                  aria-label="删除自定义标签"
                  title="删除"
                  @click="removeCustomTag(tag.id)"
                >
                  <X :size="16" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </section>

      <img class="notebook-frame" src="/Notebook.png" alt="" draggable="false" />
    </section>
  </main>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Eye, Pencil, Plus, X } from 'lucide-vue-next';

const STORAGE_KEY = 'notebook_notes_state_v2';
const LEGACY_STORAGE_KEY = 'notebook_notes_state_v1';

const modes = [
  { id: 'sticky', label: '便签', icon: '☑' },
  { id: 'note', label: '笔记', icon: '✎' },
  { id: 'worksheet', label: '工作表', icon: '▦' },
  { id: 'settings', label: '设置', icon: '⚙' },
];

const defaultTags = [
  { id: 'life', name: '生活', color: '#fff29d' },
  { id: 'study', name: '学习', color: '#cce7ff' },
  { id: 'fun', name: '娱乐', color: '#ffd6e3' },
  { id: 'work', name: '工作', color: '#d9f7be' },
];

const tagColorOptions = ['#fff29d', '#cce7ff', '#ffd6e3', '#d9f7be', '#ffe0b2', '#d8d2ff'];

const makeSticky = (note = {}) => {
  const tag = defaultTags.find((item) => item.id === note.tagId) || defaultTags[0];

  return {
    id: note.id ?? Date.now(),
    text: note.text ?? '',
    tagId: note.tagId ?? tag.id,
    color: note.color ?? tag.color,
  };
};

const defaultState = {
  activeMode: 'sticky',
  stickyNotes: [
    makeSticky({ id: 1, text: '今天要完成的事', tagId: 'study', color: '#cce7ff' }),
    makeSticky({ id: 2, text: '灵感先放这里', tagId: 'fun', color: '#ffd6e3' }),
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
    customTags: [],
  },
};

const cloneDefaultState = () => structuredClone(defaultState);

const normalizeState = (state) => {
  const base = cloneDefaultState();
  const settings = {
    ...base.settings,
    ...(state?.settings || {}),
    customTags: Array.isArray(state?.settings?.customTags) ? state.settings.customTags : [],
  };

  return {
    ...base,
    ...state,
    stickyNotes: Array.isArray(state?.stickyNotes) ? state.stickyNotes.map(makeSticky) : base.stickyNotes,
    longNote: { ...base.longNote, ...(state?.longNote || {}) },
    worksheetRows: Array.isArray(state?.worksheetRows) ? state.worksheetRows : base.worksheetRows,
    settings,
  };
};

const loadState = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
    return saved ? normalizeState(saved) : cloneDefaultState();
  } catch (err) {
    return cloneDefaultState();
  }
};

const initialState = loadState();
const activeMode = ref(initialState.activeMode);
const stickyNotes = ref(initialState.stickyNotes);
const longNote = ref(initialState.longNote);
const worksheetRows = ref(initialState.worksheetRows);
const settings = ref(initialState.settings);
const selectedStickyId = ref(null);
const stickyDetailMode = ref(null);
const newTagName = ref('');
const newTagColor = ref('#fff29d');

const allTags = computed(() => [...defaultTags, ...settings.value.customTags]);

const selectedSticky = computed(() => stickyNotes.value.find((note) => note.id === selectedStickyId.value) || null);

const activeModeLabel = computed(() => modes.find((mode) => mode.id === activeMode.value)?.label || '笔记');

const quickMeta = computed(() => {
  if (activeMode.value === 'sticky') return `${stickyNotes.value.length} 张便签`;
  if (activeMode.value === 'worksheet') return `${worksheetRows.value.length} 条事项`;
  if (activeMode.value === 'settings') return `${allTags.value.length} 个标签`;
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

watch(selectedSticky, (note) => {
  if (!note && stickyDetailMode.value) closeStickyDetail();
});

const nextId = (items) => Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;

const stickyTagName = (note) => allTags.value.find((tag) => tag.id === note.tagId)?.name || '生活';

const stickyCardStyle = (note) => ({
  '--sticky-bg': note.color || defaultTags[0].color,
});

const setMode = (modeId) => {
  activeMode.value = modeId;
  closeStickyDetail();
};

const openStickyDetail = (note, mode) => {
  selectedStickyId.value = note.id;
  stickyDetailMode.value = mode;
};

const closeStickyDetail = () => {
  selectedStickyId.value = null;
  stickyDetailMode.value = null;
};

const syncStickyTagColor = (note) => {
  const tag = allTags.value.find((item) => item.id === note.tagId);
  if (tag) note.color = tag.color;
};

const setStickyColor = (note, color) => {
  note.color = color;
};

const addSticky = () => {
  stickyNotes.value.unshift(makeSticky({ id: nextId(stickyNotes.value), text: '' }));
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

const addCustomTag = () => {
  if (!newTagName.value) return;

  settings.value.customTags.push({
    id: `custom-${Date.now()}`,
    name: newTagName.value,
    color: newTagColor.value,
  });
  newTagName.value = '';
};

const removeCustomTag = (id) => {
  settings.value.customTags = settings.value.customTags.filter((tag) => tag.id !== id);
  stickyNotes.value.forEach((note) => {
    if (note.tagId === id) {
      note.tagId = defaultTags[0].id;
      note.color = defaultTags[0].color;
    }
  });
};

const resetSettings = () => {
  settings.value = { ...cloneDefaultState().settings };
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
  top: -46px;
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
  left: 2.6%;
  top: 4.3%;
  width: 26.6%;
  height: 89.8%;
  background: var(--left-page-bg);
}

.right-page-fill {
  left: 30%;
  top: 4.2%;
  width: 64.2%;
  height: 89.8%;
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
.delete-btn,
.icon-text-btn {
  border: 1px solid rgba(105, 78, 40, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  font-weight: 700;
  padding: 8px 12px;
}

.toolbar-icon-btn,
.circle-action {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid rgba(84, 64, 34, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #4d4335;
  padding: 0;
  box-shadow: 0 4px 10px rgba(94, 73, 38, 0.1);
}

.delete-action {
  background: rgba(255, 255, 255, 0.9);
  color: #7f322e;
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 48px 14px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sticky-bg), white 20%);
  box-shadow: 0 10px 28px rgba(117, 89, 30, 0.12);
}

.sticky-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 7px;
}

.sticky-tag,
.sticky-reader-tag {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  max-width: 100%;
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  font-size: 0.78em;
  font-weight: 800;
}

.tag-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  box-shadow: inset 0 0 0 1px rgba(54, 43, 24, 0.14);
}

.sticky-preview {
  min-height: 0;
  margin: 0;
  color: color-mix(in srgb, var(--note-text-color), transparent 8%);
  line-height: 1.55;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  word-break: break-word;
}

.sticky-detail-toolbar {
  align-items: center;
}

.sticky-detail-title {
  display: grid;
  justify-items: center;
  gap: 2px;
  font-weight: 900;
}

.sticky-detail-title small {
  color: color-mix(in srgb, var(--note-text-color), transparent 42%);
  font-size: 0.7em;
}

.back-btn {
  min-width: 64px;
}

.sticky-editor,
.sticky-reader {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--sticky-bg), white 18%);
  box-shadow: 0 12px 30px rgba(117, 89, 30, 0.14);
}

.sticky-editor-textarea {
  min-height: 0;
  flex: 1;
  background:
    linear-gradient(transparent calc(1.7em - 1px), rgba(111, 136, 150, 0.18) 1px),
    rgba(255, 255, 255, 0.32);
  background-size: 100% 1.7em;
}

.sticky-editor-panel {
  display: grid;
  grid-template-columns: minmax(140px, 0.8fr) minmax(0, 1.2fr);
  gap: 12px;
}

.field-label {
  display: grid;
  gap: 8px;
  font-weight: 800;
}

.field-label select {
  width: 100%;
  height: 40px;
  border: 1px solid rgba(105, 78, 40, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.62);
  color: inherit;
  font: inherit;
  padding: 0 10px;
}

.color-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 999px;
  box-shadow: 0 0 0 1px rgba(84, 64, 34, 0.2);
}

.color-swatch.active {
  box-shadow: 0 0 0 3px rgba(68, 52, 31, 0.26);
}

.custom-color {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  font-size: 0.82em;
  font-weight: 800;
}

.custom-color input {
  width: 28px;
  height: 28px;
  border: 0;
  padding: 0;
  background: transparent;
}

.sticky-reader {
  overflow: auto;
}

.sticky-reader p {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.7;
  word-break: break-word;
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

.settings-view {
  overflow: auto;
  padding-right: 6px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-grid label,
.custom-tags-panel {
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

.custom-tags-panel {
  margin-top: 2px;
}

.custom-tags-header,
.custom-tag-item,
.custom-tag-form,
.icon-text-btn {
  display: flex;
  align-items: center;
}

.custom-tags-header {
  justify-content: space-between;
}

.custom-tags-header h2 {
  margin: 0;
  font-size: 1em;
}

.custom-tag-form {
  gap: 10px;
}

.custom-tag-form input[type="text"] {
  height: 38px;
  padding: 6px 10px;
}

.custom-tag-form input[type="color"] {
  width: 44px;
  height: 38px;
  border: 0;
  background: transparent;
}

.icon-text-btn {
  gap: 6px;
  white-space: nowrap;
}

.custom-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.custom-tag-item {
  gap: 8px;
  min-height: 34px;
  padding: 4px 5px 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(105, 78, 40, 0.12);
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
