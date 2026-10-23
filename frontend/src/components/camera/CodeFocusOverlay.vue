<template>
  <div class="code-focus-overlay" aria-hidden="true">
    <div class="code-focus-window" :class="{ compact: rect.height < 100 }" :style="{ left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px` }">
      <span>将完整条码放入框内</span>
    </div>
  </div>
</template>
<script setup>
defineProps({ rect: { type: Object, required: true } });
</script>
<style scoped>
.code-focus-overlay { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 12; }
.code-focus-window { position: absolute; box-sizing: border-box; border-radius: 8px; border: 1px solid #00ffff35; box-shadow: 0 0 0 9999px #05081780;
  background: linear-gradient(#00ffff,#00ffff) left top/24px 2px, linear-gradient(#00ffff,#00ffff) left top/2px 24px,
  linear-gradient(#00ffff,#00ffff) right top/24px 2px, linear-gradient(#00ffff,#00ffff) right top/2px 24px,
  linear-gradient(#00ffff,#00ffff) left bottom/24px 2px, linear-gradient(#00ffff,#00ffff) left bottom/2px 24px,
  linear-gradient(#00ffff,#00ffff) right bottom/24px 2px, linear-gradient(#00ffff,#00ffff) right bottom/2px 24px;
  background-repeat: no-repeat; }
span { position: absolute; bottom: 7px; left: 4px; right: 4px; text-align: center; font-size: 11px; color: #d8ffff; text-shadow: 0 1px 4px #000; }
.compact span { top: calc(100% + 2px); bottom: auto; left: 50%; right: auto; transform: translateX(-50%); white-space: nowrap; font-size: 9px; line-height: 1.2; }
</style>
