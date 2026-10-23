<template>
  <section class="qr-panel" aria-label="二维码扫描结果">
    <header>
      <button class="panel-toggle" :aria-expanded="expanded" @click="expanded = !expanded">
        <ScanLine :size="16" /><span>QR SCANNER</span><span v-if="qr.settings.showStatus" class="scan-status">// {{ qr.status }}</span>
        <span v-if="qr.settings.showCount" class="target-count" title="当前视频帧中的实体二维码数量，可能含相同内容">当前画面 {{ qr.current.length }} 目标</span><ChevronDown :size="15" :class="{ rotated: expanded }" />
      </button>
      <button class="session-refresh icon-button" title="清空本次扫描，保留历史" aria-label="清空本次扫描" @click="qr.clearSession(); showHistory = false; expanded = true"><RefreshCw :size="15" /></button>
      <button class="history-toggle" :class="{ active: showHistory }" @click="showHistory = !showHistory; expanded = true"><History :size="15" />历史 {{ qr.history.length }}</button>
    </header>
    <div v-if="expanded" class="panel-body">
      <div class="results-heading">
        <span>{{ showHistory ? '本机保存的历史' : `本次扫描 · ${qr.sessionResults.length} 条唯一内容` }}</span>
        <div v-if="showHistory" class="actions"><button :disabled="!qr.history.length" @click="qr.exportHistory('json')">导出 JSON</button><button :disabled="!qr.history.length" @click="qr.exportHistory('txt')">TXT</button><button :disabled="!qr.history.length" class="danger" @click="qr.clearHistory">清空</button></div>
      </div>
      <p v-if="!items.length" class="empty">{{ showHistory ? '尚未保存记录。点击结果旁的保存图标即可保存到本机。' : '将二维码放入画面，可同时识别多个目标。' }}</p>
      <div v-else class="results-layout">
        <div class="result-list" aria-label="选择二维码">
          <div v-for="item in items" :key="item.id" class="result-row" :class="{ selected: selected?.id === item.id }">
            <button class="result-select" :aria-pressed="selected?.id === item.id" @click="select(item)">
              <span class="result-number">{{ showHistory ? '历史' : `QR #${item.number}` }} <i v-if="liveIds.has(item.id)" title="当前画面中">LIVE</i></span>
              <span class="preview">{{ item.text || '[二进制内容]' }}</span>
            </button>
            <button class="icon-button" title="复制完整内容" aria-label="复制完整内容" @click="qr.copy(item)"><Copy :size="15" /></button>
            <button v-if="!showHistory" class="icon-button" :class="{ saved: qr.isSaved(item) }" :title="qr.isSaved(item) ? '再次保存' : '保存到历史'" :aria-label="qr.isSaved(item) ? '再次保存' : '保存到历史'" @click="qr.save(item, qr.isSaved(item))"><Save :size="15" /></button>
            <button v-if="!showHistory" class="icon-button danger" title="删除本次结果" aria-label="删除本次结果" @click="qr.deleteResult(item.id)"><Trash2 :size="15" /></button>
            <button v-else class="icon-button danger" title="删除记录" aria-label="删除记录" @click="qr.deleteHistory(item.id)"><Trash2 :size="15" /></button>
          </div>
        </div>
        <article v-if="selected" class="result-detail">
          <div class="metadata">{{ qrLabel(selected.format) }} · {{ selected.contentType }}<span v-if="selected.version"> · V{{ selected.version }}</span><span v-if="selected.ecLevel"> · EC {{ selected.ecLevel }}</span></div>
          <time>{{ formatTime(selected.detectedAt) }}</time><time v-if="showHistory">保存于 {{ formatTime(selected.savedAt) }}</time>
          <time v-else-if="selected.lastSeenAt">最近识别 {{ formatTime(selected.lastSeenAt) }}</time>
          <pre tabindex="0" title="双击复制完整内容" :class="{ 'full-content': fullContent }" @dblclick="qr.copy(selected)">{{ selected.text || '[无文本内容，原始字节保存在 JSON 中]' }}</pre>
          <div class="actions">
            <button @click="fullContent = !fullContent">{{ fullContent ? '收起内容' : '展开全文' }}</button>
            <button @click="qr.copy(selected)"><Copy :size="14" />复制</button>
            <button v-if="!showHistory" @click="qr.save(selected, qr.isSaved(selected))"><Save :size="14" />{{ qr.isSaved(selected) ? '再次保存' : '保存' }}</button>
            <a v-if="safeQrUrl(selected.text)" :href="safeQrUrl(selected.text)" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><ExternalLink :size="14" />打开链接</a>
          </div>
          <p v-if="qr.isSaved(selected) && !showHistory" class="saved-note">已保存到历史</p>
        </article>
      </div>
    </div>
    <p v-if="qr.error || qr.storageError" class="panel-error" role="alert">{{ qr.error || qr.storageError }}</p>
    <p v-if="qr.notification" class="notification" role="status">{{ qr.notification }}</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { ScanLine, ChevronDown, History, Copy, Save, Trash2, ExternalLink, RefreshCw } from '@lucide/vue';
import { qrLabel, safeQrUrl } from '../../services/qrScanner';
const props = defineProps({ qr: { type: Object, required: true } });
const expanded = ref(false);
const showHistory = ref(false);
const historyId = ref(null);
const fullContent = ref(false);
const items = computed(() => showHistory.value ? props.qr.history : props.qr.sessionResults);
const liveIds = computed(() => new Set(props.qr.current.map(e => e.resultId)));
const selected = computed(() => showHistory.value ? items.value.find(e => e.id === historyId.value) || items.value[0] : props.qr.selected);
function select(item) {
  if (showHistory.value) historyId.value = item.id;
  else props.qr.selectedId = item.id;
  fullContent.value = false;
}
const formatTime = time => time ? new Date(time).toLocaleString() : '';
// Reveal first success once per session, without jumping back from history.
watch(() => props.qr.sessionResults.length, (length, previous) => { if (length && !previous && !showHistory.value) expanded.value = true; });
</script>

<style scoped>
.qr-panel { width: min(760px, calc(100vw - 32px)); border: 1px solid #00ffff70; border-radius: 10px; background: rgba(12, 9, 25, .94); color: #edfaff; box-shadow: 0 0 20px #00ffff13; backdrop-filter: blur(12px); overflow: hidden; font: 12px monospace; }
header { display: flex; align-items: center; min-height: 40px; padding: 3px 8px; gap: 8px; }
button, a { display: inline-flex; align-items: center; gap: 5px; border: 1px solid #00ffff40; border-radius: 4px; background: #00ffff08; color: #8dfaff; padding: 6px 8px; font: inherit; cursor: pointer; text-decoration: none; }
button:hover, a:hover, button.active { background: #00ffff22; border-color: #00ffff; }
button:disabled { opacity: .4; cursor: default; }
.panel-toggle { border: 0; flex: 1; min-width: 0; flex-wrap: wrap; background: none; text-align: left; }
.scan-status { color: #95a7b8; font-size: 10px; }
.target-count { color: #00ffff; margin-left: auto; font-size: 10px; }
.rotated { transform: rotate(180deg); }
.panel-body { border-top: 1px solid #00ffff30; padding: 10px; max-height: min(40dvh, 310px); overflow: auto; overscroll-behavior: contain; }
.results-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: #a5adbf; margin-bottom: 8px; }
.results-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr); gap: 12px; }
.result-list { max-height: 230px; overflow: auto; }
.result-row { display: flex; align-items: center; gap: 4px; border: 1px solid transparent; margin-bottom: 4px; border-radius: 5px; }
.result-row.selected { border-color: #ff54ee88; background: #ff54ee0d; }
.result-select { display: flex; flex-direction: column; align-items: flex-start; border: 0; background: none; flex: 1; min-width: 0; text-align: left; }
.preview { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; color: #ddd9e9; }
.result-number { font-size: 10px; color: #00ffff; }
i { color: #69ffae; font-size: 9px; font-style: normal; }
.icon-button { padding: 6px; border-color: transparent; }
.saved, .saved-note { color: #69ffae; }
.danger { color: #ff80a6; }
.danger:hover { border-color: #ff5985; background: #ff005522; }
.result-detail { min-width: 0; padding: 5px 3px; }
.metadata { color: #00ffff; overflow-wrap: anywhere; }
time { display: block; font-size: 10px; color: #9ba8ba; margin-top: 4px; }
pre { font: 12px/1.6 monospace; color: #f0edff; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; margin: 10px 0; max-height: 60px; overflow: hidden; user-select: text; }
pre.full-content { max-height: 160px; overflow: auto; }
.actions { display: flex; flex-wrap: wrap; gap: 6px; }
.actions button, .actions a { font-size: 10px; }
.empty { color: #9ba8ba; line-height: 1.7; }
.notification, .panel-error { padding: 8px 12px; margin: 0; border-top: 1px solid #00ffff30; overflow-wrap: anywhere; }
.notification { color: #69ffae; }
.panel-error { color: #ff96b4; }
:focus-visible { outline: 2px solid #ff54ee; outline-offset: 1px; }
@media (max-width: 600px) {
  .qr-panel { width: calc(100vw - 20px); }
  header { gap: 2px; padding: 3px; }
  .panel-toggle { gap: 4px; font-size: 10px; }
  .history-toggle { font-size: 10px; padding: 6px 4px; }
  .scan-status { font-size: 9px; }
  .results-layout { grid-template-columns: 1fr; gap: 5px; }
  .result-list { max-height: 95px; }
  .panel-body { max-height: 36dvh; }
}
</style>
