<template>
  <section class="camera-settings" aria-label="相机设置" @change="normalize">
    <nav class="settings-tabs" role="tablist" aria-label="设置分类" @keydown="navigateTabs">
      <button v-for="tab in tabs" :id="`camera-tab-${tab.id}`" :key="tab.id" role="tab"
        :aria-selected="activeTab === tab.id" :aria-controls="`camera-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1" :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>
    <div :id="`camera-panel-${activeTab}`" class="settings-body" role="tabpanel" :aria-labelledby="`camera-tab-${activeTab}`">
      <div v-if="activeTab === 'hud'" class="settings-section">
        <h4>HUD 显示</h4>
        <label><input type="checkbox" :checked="showReticle" @change="$emit('update:showReticle', $event.target.checked)" />显示中心准星</label>
        <label><input v-model="qr.settings.showBounds" type="checkbox" />显示 QR Code 识别边框</label>
        <label><input v-model="qr.settings.showLabels" type="checkbox" />显示 QR Code 类型标签（随边框显示）</label>
        <label><input v-model="qr.settings.showStatus" type="checkbox" />显示扫描状态</label>
        <label><input v-model="qr.settings.showCount" type="checkbox" />显示当前画面扫描数量</label>
        <p class="hint">隐藏 HUD 不改变识别模式；二维码边框、类型与状态仅在 QR Code 模式下使用。</p>
      </div>
      <div v-else-if="activeTab === 'classes'"><slot name="classes" /></div>
      <div v-else class="settings-section">
        <div class="section-heading"><h4>扫描控制</h4><span class="engine-tag">ZXing WASM 3.1.6</span></div>
        <p class="hint">在底部「识别」菜单选择「QR Code识别」才启动扫描；与 YOLO、无识别模式互斥。</p>
        <label class="field">扫描模式<select v-model="qr.settings.mode" aria-label="扫描模式"><option value="standard">标准</option><option value="accurate">高精度 · 原始分辨率</option></select></label>
        <label class="field">扫描间隔<select :value="qr.settings.interval === 0 ? 'auto' : 'custom'" @change="qr.settings.interval = $event.target.value === 'auto' ? 0 : 500"><option value="auto">自动 · 随性能调整</option><option value="custom">自定义</option></select></label>
        <label v-if="qr.settings.interval !== 0" class="field">间隔（ms）<input v-model.number="qr.settings.interval" type="number" min="100" max="5000" step="100" /></label>
        <label><input v-model="qr.settings.multiple" type="checkbox" />同时识别多个二维码</label>
        <p class="hint">本次扫描始终按完整解码内容合并；相同内容的多个实体码仍分别显示边框。</p>
        <div class="section-heading"><h4>QR 码制</h4><div class="inline-actions"><button @click="qr.settings.formats = QR_FORMATS.map(f => f.id)">全选</button><button @click="qr.settings.formats = []">取消全选</button></div></div>
        <label v-for="format in QR_FORMATS" :key="format.id" class="format-option">
          <input v-model="qr.settings.formats" type="checkbox" :value="format.id" />
          <span>{{ format.label }}<small>{{ format.detail }}</small></span>
        </label>
        <p v-if="!qr.settings.formats.length" class="hint">未选择码制，QR 解码已暂停。</p>
        <p class="hint">四种码制均由引擎支持并可单独选择。尺寸版本、纠错等级自动识别；清晰度、光线和码的大小仍会影响读取。</p>
        <details>
          <summary>高级设置与历史管理</summary>
          <p class="hint">手动删除或清空后，当前内容暂不重新加入；移开二维码约 1.5 秒再对准即可重新加入。模式切换保留本次结果。</p>
          <label class="field">会话结果保留数量<input v-model.number="qr.settings.retention" type="number" min="10" max="500" /></label>
          <label><input v-model="qr.settings.autoSave" type="checkbox" />自动保存扫描历史（相同内容不重复自动保存）</label>
          <div class="inline-actions"><button class="danger" @click="qr.clearHistory">清除扫描历史</button><button @click="qr.resetSettings">恢复 QR 默认设置</button></div>
        </details>
        <p class="hint">二维码在本机解码。手动或自动保存的历史仅保存在当前浏览器；YOLO 仍使用原有服务。</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { QR_FORMATS, normalizeQrSettings } from '../../services/qrScanner';
const props = defineProps({ qr: { type: Object, required: true }, showReticle: Boolean });
defineEmits(['update:showReticle']);
const tabs = [{ id: 'hud', label: 'HUD 选项' }, { id: 'classes', label: '识别类别' }, { id: 'qr', label: 'QR Code 模型' }];
const activeTab = ref('hud');
const normalize = () => Object.assign(props.qr.settings, normalizeQrSettings(props.qr.settings));
function navigateTabs(event) {
  const i = tabs.findIndex(t => t.id === activeTab.value);
  let next;
  if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
  if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = tabs.length - 1;
  if (next === undefined) return;
  event.preventDefault(); activeTab.value = tabs[next].id;
  event.currentTarget.querySelectorAll('[role="tab"]')[next].focus();
}
</script>

<style scoped>
.camera-settings { color: #ecfaff; font-size: 13px; }
.settings-tabs { display: flex; gap: 4px; overflow-x: auto; border-bottom: 1px solid #00ffff40; padding-bottom: 10px; }
button, select, input[type=number] { border: 1px solid #00ffff65; color: #9afaff; background: #07131f; border-radius: 5px; padding: 7px 9px; font: inherit; }
button { cursor: pointer; }
button:hover, button.active { background: #00ffff24; color: #00ffff; border-color: #00ffff; }
.settings-tabs button { white-space: nowrap; flex: 1; }
.settings-body { max-height: min(49dvh, 440px); overflow: auto; overscroll-behavior: contain; padding: 14px 3px 4px; scrollbar-color: #00ffff66 transparent; }
.settings-section { display: grid; gap: 14px; }
h4 { margin: 0; font-size: 15px; }
label { display: flex; align-items: center; gap: 9px; cursor: pointer; line-height: 1.5; }
input[type=checkbox] { accent-color: #00ffff; flex-shrink: 0; width: 16px; height: 16px; }
.field { justify-content: space-between; flex-wrap: wrap; }
.field select, .field input { max-width: 200px; min-width: 80px; }
.field input { width: 105px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; }
.engine-tag { color: #9ba8ba; font: 10px monospace; }
.inline-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.inline-actions button { font-size: 12px; }
.format-option small { display: block; font-size: 11px; color: #9ba8ba; }
.hint { color: #a8adbf; line-height: 1.6; margin: 0; font-size: 11px; }
details { border-top: 1px solid #00ffff30; padding-top: 12px; }
details > label, details > p, details > div { margin-top: 12px; }
summary { color: #00ffff; cursor: pointer; }
button.danger { color: #ff719a; border-color: #ff719a88; }
:focus-visible { outline: 2px solid #ff54ee; outline-offset: 3px; }
</style>
