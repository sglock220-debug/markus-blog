import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { qrFormat } from './qrScanner';

// Resolve against the worker origin in development and /static/ in production.
// No third-party CDN, camera upload, or main-thread WASM decoding.
prepareZXingModule({ overrides: { locateFile: () => new URL(wasmUrl, self.location.origin).href } });

self.onmessage = async ({ data: { width, height, data, settings } }) => {
  try {
    if (!settings.formats.length) { self.postMessage({ results: [] }); return; }
    const results = await readBarcodes(new ImageData(new Uint8ClampedArray(data), width, height), {
      formats: settings.formats,
      tryHarder: settings.mode === 'accurate', tryRotate: true, tryInvert: true,
      tryDownscale: true, tryDenoise: settings.mode === 'accurate',
      maxNumberOfSymbols: settings.multiple ? 0 : 1, textMode: 'Plain',
    });
    self.postMessage({ results: results.filter(r => r.isValid).map(r => {
      let metadata = {};
      try { metadata = JSON.parse(r.extra || '{}'); } catch { /* optional engine metadata */ }
      return { text: r.text, bytes: Array.from(r.bytes), bytesECI: Array.from(r.bytesECI),
        format: qrFormat(r), symbologyIdentifier: r.symbologyIdentifier,
        engineContentType: r.contentType, hasECI: r.hasECI,
        version: metadata.Version || r.version, ecLevel: metadata.ECLevel || r.ecLevel,
        points: [r.position.topLeft, r.position.topRight, r.position.bottomRight, r.position.bottomLeft]
          .map(p => ({ x: p.x / width, y: p.y / height })) };
    }) });
  } catch (error) { self.postMessage({ error: `QR 解码失败：${error.message}` }); }
};
