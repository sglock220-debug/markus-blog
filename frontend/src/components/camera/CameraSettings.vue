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
        <label><input v-model="qr.settings.mirrored" type="checkbox" />镜像摄像头画面</label>
        <label><input type="checkbox" :checked="showReticle" @change="$emit('update:showReticle', $event.target.checked)" />显示中心准星</label>
        <label><input v-model="qr.settings.showBounds" type="checkbox" />显示 Code 识别边框</label>
        <label><input v-model="qr.settings.showLabels" type="checkbox" />显示 Code 类型标签（随边框显示）</label>
        <label><input v-model="qr.settings.showStatus" type="checkbox" />显示扫描状态</label>
        <label><input v-model="qr.settings.showCount" type="checkbox" />显示当前画面扫描数量</label>
        <p class="hint">隐藏 HUD 不改变识别模式；条码边框、类型与状态仅在 Code 模式下使用。</p>
      </div>
      <div v-else-if="activeTab === 'classes'"><slot name="classes" /></div>
      <div v-else class="settings-section">
        <div class="section-heading"><h4>扫描控制</h4><span class="engine-tag">ZXing WASM 3.1.6</span></div>
        <p class="hint">在底部「识别」菜单选择「Code识别」才启动扫描；与 YOLO、无识别模式互斥。</p>
        <label class="field">扫描间隔<select :value="qr.settings.interval === 0 ? 'auto' : 'custom'" @change="qr.settings.interval = $event.target.value === 'auto' ? 0 : 500"><option value="auto">自动 · 随性能调整</option><option value="custom">自定义</option></select></label>
        <label v-if="qr.settings.interval !== 0" class="field">间隔（ms）<input v-model.number="qr.settings.interval" type="number" min="100" max="5000" step="100" /></label>
        <label><input v-model="qr.settings.multiple" type="checkbox" />同时识别多个条码</label>
        <p class="hint">相同码制与内容合并为一条；不同码制编码相同内容仍分别保留。</p>
        <div class="section-heading"><h4>Code 码制</h4><span class="engine-tag">已选择 {{ qr.settings.formats.length }} 项</span></div>
        <div class="inline-actions"><button @click="qr.settings.formats = SELECTABLE_CODE_FORMATS.map(f => f.id)">全部选择</button><button @click="qr.settings.formats = []">取消全选</button></div>
        <details v-for="group in CODE_GROUPS" :key="group.id" class="code-format-group" :data-group="group.id" :open="group.id === 'qr'">
          <summary><span>{{ group.label }}<small>{{ group.detail }}</small></span><span class="group-count">{{ selectedCount(group) }} / {{ group.formats.filter(f => !f.disabled).length }}</span></summary>
          <div class="inline-actions"><button @click="selectGroup(group, true)">本组全选</button><button @click="selectGroup(group, false)">本组取消</button></div>
          <label v-for="format in group.formats" :key="format.id" class="format-option" :class="{ unavailable: format.disabled }">
            <input v-model="qr.settings.formats" type="checkbox" :value="format.id" :disabled="format.disabled" />
            <span>{{ format.label }}<small v-if="format.detail">{{ format.detail }}</small></span>
          </label>
        </details>
        <p v-if="!qr.settings.formats.length" class="hint">未选择码制，Code 解码已暂停。</p>
        <p class="hint">仅扫描已选码制。默认只启用原有 QR 四种；开启更多格式会增加计算量。MaxiCode 的实时读取限制见分组说明。</p>
        <div class="section-heading"><h4>聚焦扫描</h4></div>
        <label><input v-model="qr.settings.focusEnabled" type="checkbox" />聚焦扫描模式</label>
        <template v-if="qr.settings.focusEnabled">
          <label class="field">聚焦框形状<select v-model="qr.settings.focusShape" aria-label="聚焦框形状"><option value="auto">自动</option><option value="square">方形</option><option value="wide">横向矩形</option></select></label>
          <label class="field">聚焦框大小 {{ qr.settings.focusSize }}%<input v-model.number="qr.settings.focusSize" aria-label="聚焦框大小" type="range" min="40" max="95" step="5" /></label>
          <p class="hint">只解码框内画面；请将完整条码与四周留白放入框内。自动形状在只选一维码时使用横框，否则使用方框。</p>
        </template>
        <details class="advanced-recognition">
          <summary>高级识别设置</summary>
          <label class="field">识别强度<select v-model="qr.settings.mode" aria-label="识别强度"><option value="standard">标准</option><option value="accurate">高精度 · 原始分辨率</option></select></label>
          <p class="hint">标准模式兼顾速度，保留旋转与反色检测。高精度使用原始像素，并启用 tryHarder 与二维降噪，适当降低扫描频率。</p>
          <p class="hint">没有通用的 0%～100% 解码纠错接口，故不提供百分比滑块。QR 的 L/M/Q/H 由码本身决定；高精度不代表成功率或可修复比例。</p>
        </details>
        <details>
          <summary>高级设置与历史管理</summary>
          <p class="hint">手动删除或清空后，当前内容暂不重新加入；移开条码约 1.5 秒再对准即可重新加入。模式切换保留本次结果。</p>
          <label class="field">会话结果保留数量<input v-model.number="qr.settings.retention" type="number" min="10" max="500" /></label>
          <label><input v-model="qr.settings.autoSave" type="checkbox" />自动保存扫描历史（相同内容不重复自动保存）</label>
          <div class="inline-actions"><button class="danger" @click="qr.clearHistory">清除扫描历史</button><button @click="qr.resetSettings">恢复 Code 默认设置</button></div>
        </details>
        <p class="hint">条码在本机解码。手动或自动保存的历史仅保存在当前浏览器；YOLO 仍使用原有服务。</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { CODE_GROUPS, SELECTABLE_CODE_FORMATS, normalizeQrSettings } from '../../services/qrScanner';
const props = defineProps({ qr: { type: Object, required: true }, showReticle: Boolean });
defineEmits(['update:showReticle']);
const tabs = [{ id: 'hud', label: 'HUD 选项' }, { id: 'classes', label: '识别类别' }, { id: 'qr', label: 'Code 码制' }];
const activeTab = ref('hud');
const normalize = () => Object.assign(props.qr.settings, normalizeQrSettings(props.qr.settings));
const selectedCount = group => group.formats.filter(f => props.qr.settings.formats.includes(f.id)).length;
function selectGroup(group, enabled) {
  const ids = new Set(group.formats.filter(f => !f.disabled).map(f => f.id));
  props.qr.settings.formats = enabled ? [...new Set([...props.qr.settings.formats, ...ids])]
    : props.qr.settings.formats.filter(id => !ids.has(id));
}

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
.code-format-group { border: 1px solid #00ffff40; border-radius: 8px; padding: 12px; }
.code-format-group summary { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.code-format-group summary::after { content: '⌄'; }
.code-format-group[open] summary::after { content: '⌃'; }
.code-format-group small { display: block; margin-top: 3px; color: #9ba8ba; font-size: 11px; }
.group-count { margin-left: auto; font-size: 11px; white-space: nowrap; }
.unavailable { opacity: .6; cursor: not-allowed; }
input[type=range] { accent-color: #00ffff; width: 140px; }
</style>
