import { CODE_GROUPS } from './qrScanner.js';

// Stage coordinates use CSS pixels, independent of display pixel density.
export function codeFocusRect(width, height, settings, controlsTop = height) {
  const inset = Math.min(24, width * .04);
  const top = height < 520 ? 16 : Math.min(130, height * .18);
  const bottom = Math.max(top + 8, Math.min(height - inset, controlsTop - 16));
  const areaWidth = Math.max(8, width - inset * 2);
  const areaHeight = Math.max(8, bottom - top);
  const linear = new Set(CODE_GROUPS.slice(2).flatMap(g => g.formats.map(f => f.id)));
  const wide = settings.focusShape === 'wide' || (settings.focusShape === 'auto'
    && settings.formats.length > 0 && settings.formats.every(id => linear.has(id)));
  const ratio = wide ? 2.8 : 1;
  const size = settings.focusSize / 100;
  const w = Math.min(areaWidth * size, areaHeight * size * ratio);
  const h = w / ratio;
  return { x: (width - w) / 2, y: top + (areaHeight - h) / 2, width: w, height: h };
}

// Invert object-fit: cover, including a horizontally mirrored preview.
export function focusSourceRect(rect, videoWidth, videoHeight, stageWidth, stageHeight, mirrored = false) {
  if (!rect) return { x: 0, y: 0, width: videoWidth, height: videoHeight };
  const scale = Math.max(stageWidth / videoWidth, stageHeight / videoHeight);
  const offsetX = (stageWidth - videoWidth * scale) / 2;
  const offsetY = (stageHeight - videoHeight * scale) / 2;
  const left = mirrored ? stageWidth - rect.x - rect.width : rect.x;
  const x = Math.max(0, Math.floor((left - offsetX) / scale));
  const y = Math.max(0, Math.floor((rect.y - offsetY) / scale));
  const right = Math.min(videoWidth, Math.ceil((left + rect.width - offsetX) / scale));
  const bottom = Math.min(videoHeight, Math.ceil((rect.y + rect.height - offsetY) / scale));
  return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
}

export function restoreCodePoints(results, crop, videoWidth, videoHeight) {
  return results.map(result => ({ ...result, points: result.points.map(p => ({
    x: (crop.x + p.x * crop.width) / videoWidth,
    y: (crop.y + p.y * crop.height) / videoHeight,
  })) }));
}

export function codeReaderOptions(settings) {
  // The fast finder misses Aztec/Data Matrix away from its sparse scan lines.
  // Enable full localization for those selected types, even at standard image
  // resolution; accurate mode additionally keeps native pixels and denoises.
  return { formats: settings.formats, tryHarder: settings.mode === 'accurate'
      || settings.formats.some(id => ['Aztec', 'DataMatrix'].includes(id)),
    tryRotate: true, tryInvert: true, tryDownscale: true, tryDenoise: settings.mode === 'accurate',
    maxNumberOfSymbols: settings.multiple ? 0 : 1, textMode: 'Plain' };
}
