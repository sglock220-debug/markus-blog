// QR formats are standards, not AI models. Version / EC level are symbol metadata.
export const QR_FORMATS = [
  { id: 'QRCodeModel1', label: 'QR Code Model 1', detail: '早期 QR 标准，可读取' },
  { id: 'QRCodeModel2', label: 'QR Code Model 2', detail: '常见方形码，Version 1–40 / L、M、Q、H' },
  { id: 'MicroQRCode', label: 'Micro QR Code', detail: '小型码 M1–M4，纠错能力随版本变化' },
  { id: 'RMQRCode', label: 'rMQR', detail: '矩形 Micro QR，支持的纠错等级为 M / H' },
];

export function defaultQrSettings() {
  return { formats: QR_FORMATS.map(f => f.id), mode: 'standard',
    interval: 0, multiple: true, retention: 50,
    autoSave: false, showBounds: true, showLabels: true, showStatus: true, showCount: true };
}

const bounded = (value, min, max, fallback) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Math.round(Number(value)))) : fallback;

export function normalizeQrSettings(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const defaults = defaultQrSettings();
  const result = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof value[key] === 'boolean') result[key] = value[key];
  }
  if (Array.isArray(value.formats)) result.formats = QR_FORMATS.map(f => f.id).filter(id => value.formats.includes(id));
  result.mode = value.mode === 'accurate' ? 'accurate' : 'standard';
  result.interval = value.interval === 0 ? 0 : bounded(value.interval, 100, 5000, 0);
  result.retention = bounded(value.retention, 10, 500, defaults.retention);
  return result;
}

export function safeQrUrl(text) {
  // Never infer or open a scheme. Only explicit HTTP(S) URLs get a link.
  if (!/^https?:\/\//i.test(text.trim())) return null;
  try {
    const url = new URL(text.trim());
    return ['http:', 'https:'].includes(url.protocol) && url.hostname ? url.href : null;
  } catch { return null; }
}

export function qrContentType(text, engineType) {
  if (safeQrUrl(text)) return 'URL';
  if (/^WIFI:/i.test(text)) return 'Wi-Fi';
  if (/^(BEGIN:VCARD|MECARD:)/i.test(text)) return 'Contact';
  if (/^(BEGIN:VEVENT|geo:|mailto:|tel:|sms:)/i.test(text)) return 'Other';
  if (engineType === 'Binary' || !text || /[\u0000-\u0008\u000e-\u001f]/.test(text)) return 'Other';
  return 'Text';
}

export function qrLabel(format) {
  if (format === 'QRCode') return 'QR Code（未区分子类型）';
  return QR_FORMATS.find(f => f.id === format)?.label || format;
}

export function qrFormat(result) {
  // This WASM build returns the QRCode family for both square variants even
  // when the input filter is specific. ZXing's AIM identifier distinguishes
  // Model 1 (]Q0) from Model 2 (]Q1–]Q6, including ECI / GS1 variants).
  if (result.format !== 'QRCode') return result.format;
  if (result.symbologyIdentifier === ']Q0') return 'QRCodeModel1';
  if (/^\]Q[1-6]$/.test(result.symbologyIdentifier)) return 'QRCodeModel2';
  return result.format;
}

export function qrIdentity(result) {
  return JSON.stringify([result.format, result.bytes?.length ? result.bytes : result.text]);
}

export function coverPoint(point, sourceWidth, sourceHeight, width, height, mirrored = false) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const x = point.x * scale + (width - sourceWidth * scale) / 2;
  return { x: mirrored ? width - x : x, y: point.y * scale + (height - sourceHeight * scale) / 2 };
}

// Text is compared exactly, independent of code format, bytes/ECI encoding,
// physical position or a timeout. Binary-only results use their original bytes.
export function qrContentKey(result) {
  return result.text ? JSON.stringify(['text', result.text]) : JSON.stringify(['bytes', Array.from(result.bytes || [])]);
}

export const QR_REENTRY_DELAY = 1500;

export class QrSession {
  tracks = [];
  entries = [];
  byContent = new Map();
  ignored = new Map();
  lastFrameKeys = new Set();
  sequence = 0;
  targetSequence = 0;
  retention = 50;
  suppressNextFrame = false;

  refreshEntries() {
    // Keep first-seen metadata in the Map even when an old row is outside the
    // display limit. Seeing it again restores the same entry, never a duplicate.
    this.entries = [...this.byContent.values()].reverse().filter((entry, i) =>
      i < this.retention || this.lastFrameKeys.has(entry.contentKey));
  }

  update(results, settings, now = Date.now()) {
    const present = new Set(results.map(qrContentKey));
    this.retention = settings.retention;
    if (this.suppressNextFrame) {
      present.forEach(key => this.ignored.set(key, { absentSince: null }));
      this.suppressNextFrame = false;
    }
    for (const [key, ignore] of this.ignored) {
      if (ignore.absentSince !== null && now - ignore.absentSince >= QR_REENTRY_DELAY) {
        this.ignored.delete(key);
      } else if (present.has(key)) ignore.absentSince = null;
      else if (ignore.absentSince === null) ignore.absentSince = now;
    }
    const used = new Set();
    const current = results.map(result => {
      const contentKey = qrContentKey(result);
      const center = result.points.reduce((sum, p) => ({ x: sum.x + p.x / 4, y: sum.y + p.y / 4 }), { x: 0, y: 0 });
      const distance = t => Math.hypot(t.center.x - center.x, t.center.y - center.y);
      let track = this.tracks.filter(t => t.contentKey === contentKey && !used.has(t.id))
        .sort((a, b) => distance(a) - distance(b))[0];
      if (!track) {
        track = { id: `target-${++this.targetSequence}`, contentKey };
        this.tracks.push(track);
      }
      Object.assign(track, { center, lastSeen: now });
      used.add(track.id);
      let entry = this.byContent.get(contentKey);
      if (!this.ignored.has(contentKey)) {
        if (!entry) {
          entry = { ...result, contentKey, id: crypto.randomUUID(), number: ++this.sequence,
            contentType: qrContentType(result.text, result.engineContentType), detectedAt: new Date(now).toISOString() };
          this.byContent.set(contentKey, entry);
        }
        entry.lastSeenAt = new Date(now).toISOString();
      }
      return { ...result, id: track.id, resultId: entry?.id ?? null, number: entry?.number ?? null };
    });
    this.lastFrameKeys = present;
    // Physical tracking is short lived; content identities live for the session.
    this.tracks = this.tracks.filter(t => used.has(t.id) || now - t.lastSeen < QR_REENTRY_DELAY);
    this.refreshEntries();
    return current;
  }

  remove(id) {
    const entry = [...this.byContent.values()].find(e => e.id === id);
    if (!entry) return;
    this.byContent.delete(entry.contentKey);
    this.ignored.set(entry.contentKey, { absentSince: null });
    this.refreshEntries();
  }

  clear(ignoreNextFrame = true) {
    this.lastFrameKeys.forEach(key => this.ignored.set(key, { absentSince: null }));
    this.byContent.clear();
    this.entries = [];
    this.tracks = [];
    this.sequence = 0;
    this.targetSequence = 0;
    // Include an already in-flight frame in the clear operation, without
    // restarting the Worker or requesting camera permission again.
    this.suppressNextFrame = ignoreNextFrame;
  }

  pause() {
    this.tracks = [];
    this.lastFrameKeys.clear();
    // Time spent in another mode is not evidence that a code left the camera.
    this.ignored.forEach(ignore => { ignore.absentSince = null; });
  }
}
