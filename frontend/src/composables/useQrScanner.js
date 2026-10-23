import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { defaultQrSettings, normalizeQrSettings, QrSession, qrIdentity, coverPoint, qrLabel } from '../services/qrScanner';

import { QrWorkerClient } from '../services/qrWorkerClient';

const SETTINGS_KEY = 'cyber-camera.qr.settings.v1';
const HISTORY_KEY = 'cyber-camera.qr.history.v1';

export function useQrScanner(videoRef, isStreaming, detectionMode) {
  const storageError = ref('');
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { storageError.value = '无法读取本地数据；请检查浏览器存储权限。'; return fallback; }
  };
  const settings = reactive(normalizeQrSettings(read(SETTINGS_KEY, {})));
  const loadedHistory = read(HISTORY_KEY, []);
  const history = ref(Array.isArray(loadedHistory) ? loadedHistory.filter(e => e && typeof e.id === 'string'
    && typeof e.text === 'string' && typeof e.format === 'string' && typeof e.savedAt === 'string') : []);
  const current = ref([]);
  const sessionResults = ref([]);
  const selectedId = ref(null);
  const error = ref('');
  const notification = ref('');
  const status = ref('等待摄像头');
  const savedIds = ref(new Set());
  const selected = computed(() => sessionResults.value.find(e => e.id === selectedId.value));
  const session = new QrSession();
  let client = null;
  let timer = null;
  let noticeTimer = null;
  let generation = 0;
  const frame = document.createElement('canvas');
  const context = frame.getContext('2d', { willReadFrequently: true });

  function persist(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); storageError.value = ''; return true; }
    catch { storageError.value = '本地存储不可用或空间已满，数据尚未保存。可导出历史以备份。'; return false; }
  }

  function notify(message) {
    notification.value = message;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notification.value = ''; }, 3000);
  }

  function save(result, again = false, automatic = false) {
    if (!result) return;
    const existing = history.value.find(e => qrIdentity(e) === qrIdentity(result));
    if (existing && (!again || automatic)) {
      savedIds.value.add(result.id);
      if (!automatic) notify('已在历史中，可点击“再次保存”另存一条');
      return;
    }
    const record = { ...result, id: crypto.randomUUID(), savedAt: new Date().toISOString() };
    const next = [record, ...history.value];
    if (persist(HISTORY_KEY, next)) {
      history.value = next;
      savedIds.value.add(result.id);
      if (!automatic) notify('已保存到本机历史');
    }
  }

  function deleteHistory(id) {
    const next = history.value.filter(e => e.id !== id);
    if (persist(HISTORY_KEY, next)) { history.value = next; savedIds.value = new Set(); }
  }

  function clearHistory() {
    if (persist(HISTORY_KEY, [])) { history.value = []; savedIds.value = new Set(); notify('历史记录已清空'); }
  }

  function isSaved(result) {
    return savedIds.value.has(result.id) || history.value.some(e => qrIdentity(e) === qrIdentity(result));
  }

  async function copy(result) {
    try {
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(result.text); notify('已复制完整内容'); return; }
        catch { /* use the legacy copy path when clipboard permission is denied */ }
      }
      const previousFocus = document.activeElement;
      const area = document.createElement('textarea');
      area.value = result.text;
      area.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(area);
      try {
        area.focus(); area.select();
        if (!document.execCommand('copy')) throw new Error('浏览器拒绝剪贴板访问，请选择内容手动复制');
      } finally { area.remove(); previousFocus?.focus(); }
      notify('已复制完整内容');
    } catch (e) { notify(`复制失败：${e.message}`); }
  }

  function exportHistory(format = 'json') {
    const text = format === 'json' ? JSON.stringify(history.value, null, 2)
      : history.value.map(e => `[${e.savedAt}] ${qrLabel(e.format)} / ${e.contentType}\n${e.text}`).join('\n\n');
    const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `qr-history-${Date.now()}.${format}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function syncSession() {
    sessionResults.value = [...session.entries];
    if (!session.entries.some(e => e.id === selectedId.value)) selectedId.value = session.entries[0]?.id ?? null;
    const ids = new Set(session.entries.map(e => e.id));
    current.value = current.value.map(e => ids.has(e.resultId) ? e : { ...e, resultId: null, number: null });
  }

  function deleteResult(id) {
    session.remove(id);
    savedIds.value.delete(id);
    syncSession();
    notify('已删除本次结果；移开该二维码约 1.5 秒后再对准可重新加入');
  }

  function clearSession() {
    session.clear(isStreaming.value && detectionMode.value === 'qrcode');
    savedIds.value = new Set();
    selectedId.value = null;
    syncSession();
    status.value = isStreaming.value ? '扫描中' : '等待摄像头';
    notify('本次扫描已清空，历史保留；移开当前二维码约 1.5 秒后再对准');
  }

  function halt() {
    generation++;
    clearTimeout(timer);
    client?.stop(); client = null;
    current.value = [];
    session.pause();
  }

  function restart() {
    halt();
    error.value = '';
    if (detectionMode.value !== 'qrcode') { status.value = 'QR 模式未启用'; return; }
    if (!isStreaming.value) { status.value = '等待摄像头'; return; }
    if (!settings.formats.length) { status.value = '请选择 QR 码制'; return; }
    if (typeof Worker === 'undefined' || typeof WebAssembly === 'undefined' || !context) {
      error.value = '当前浏览器不支持 Worker / WebAssembly / Canvas，请使用新版浏览器。'; return;
    }
    try { client = new QrWorkerClient(); }
    catch (e) { error.value = `无法启动 QR Worker：${e.message}`; return; }
    status.value = '引擎加载中';
    const token = generation;
    const scan = async () => {
      if (token !== generation) return;
      if (document.hidden || !videoRef.value?.videoWidth || videoRef.value.readyState < 2) {
        current.value = [];
        timer = setTimeout(scan, 300); return;
      }
      const started = performance.now();
      try {
        const video = videoRef.value;
        // High accuracy keeps native pixels; standard mode bounds readback cost.
        const scale = settings.mode === 'accurate' ? 1 : Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
        frame.width = Math.round(video.videoWidth * scale);
        frame.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, frame.width, frame.height);
        const results = await client.decode(context.getImageData(0, 0, frame.width, frame.height), settings);
        if (token !== generation) return;
        current.value = session.update(results, settings);
        syncSession();
        if (settings.autoSave) {
          const liveIds = new Set(current.value.map(e => e.resultId));
          session.entries.filter(e => liveIds.has(e.id)).forEach(e => save(e, false, true));
        }
        status.value = current.value.some(e => e.resultId) ? '已识别' : '扫描中';
      } catch (e) {
        if (token !== generation) return;
        error.value = e.message; status.value = '扫描错误';
        client?.stop(); client = null; current.value = []; return;
      }
      // A single outstanding task; adapt the idle gap to decoding cost.
      const elapsed = performance.now() - started;
      const interval = settings.interval || (settings.mode === 'accurate' ? 650 : 250);
      timer = setTimeout(scan, Math.max(80, interval - elapsed, elapsed * 0.4));
    };
    timer = setTimeout(scan, 0);
  }

  function resetSettings() { Object.assign(settings, defaultQrSettings()); }

  function draw(ctx, width, height) {
    if (detectionMode.value !== 'qrcode' || !settings.showBounds) return;
    ctx.save();
    current.value.forEach(result => {
      // Source points are normalized before transfer; use current layout size.
      const video = videoRef.value;
      if (!video?.videoWidth) return;
      const points = result.points.map(p => coverPoint({ x: p.x * video.videoWidth, y: p.y * video.videoHeight },
        video.videoWidth, video.videoHeight, width, height));
      ctx.strokeStyle = result.resultId && result.resultId === selectedId.value ? '#ff54ee' : '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke();
      if (settings.showLabels) {
        const label = `${result.number ? `QR #${result.number}` : 'QR · 已忽略'} · ${qrLabel(result.format)}`;
        ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
        const x = Math.max(4, Math.min(width - ctx.measureText(label).width - 12, points[0].x));
        const y = Math.max(22, Math.min(height - 4, points[0].y - 6));
        ctx.fillStyle = 'rgba(20, 10, 30, .9)'; ctx.fillRect(x - 3, y - 16, ctx.measureText(label).width + 10, 22);
        ctx.fillStyle = ctx.strokeStyle; ctx.fillText(label, x, y);
      }
    });
    ctx.restore();
  }

  watch(settings, () => persist(SETTINGS_KEY, normalizeQrSettings(settings)), { deep: true });
  // A sync mode watcher terminates old QR work before another engine starts.
  watch(() => [isStreaming.value, detectionMode.value], restart, { flush: 'sync' });
  watch(() => [settings.formats.join(','), settings.mode, settings.multiple], restart);
  onBeforeUnmount(() => { halt(); clearTimeout(noticeTimer); });

  return { settings, current, sessionResults, selectedId, selected, history, error, storageError, notification, status,
    copy, save, isSaved, deleteHistory, clearHistory, exportHistory, resetSettings, draw, deleteResult, clearSession };
}
