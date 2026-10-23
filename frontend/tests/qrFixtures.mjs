import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer';

prepareZXingModule({ overrides: {
  wasmBinary: readFileSync(new URL('../node_modules/zxing-wasm/dist/writer/zxing_writer.wasm', import.meta.url)),
} });

export function imageData(png) {
  const image = PNG.sync.read(png);
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) };
}

export async function barcode(text, format = 'QRCodeModel2', options = '', scale = 4) {
  const result = await writeBarcode(text, { format, options, scale, addQuietZones: true });
  if (result.error || !result.image) throw new Error(result.error || 'No barcode image');
  return Buffer.from(await result.image.arrayBuffer());
}

export async function multiQrFixture() {
  const fixtures = [
    await barcode('https://example.com/camera?qr=1'),
    await barcode('你好，Cyber Camera！\n完整中文与 English', 'QRCodeModel2', 'eci=26'),
    await barcode('12345678', 'MicroQRCode'),
    await barcode('RECTANGULAR QR', 'RMQRCode'),
  ];
  const sheet = new PNG({ width: 1280, height: 720 });
  sheet.data.fill(255);
  fixtures.forEach((png, i) => {
    const image = PNG.sync.read(png);
    PNG.bitblt(image, sheet, 0, 0, image.width, image.height, 110 + (i % 2) * 620, 85 + Math.floor(i / 2) * 325);
  });
  return PNG.sync.write(sheet);
}

export async function repeatedQrFixture() {
  const github = PNG.sync.read(await barcode('https://github.com'));
  const wiki = PNG.sync.read(await barcode('https://wikipedia.org'));
  const sheet = new PNG({ width: 1280, height: 720 });
  sheet.data.fill(255);
  for (const [image, x, y] of [[github, 110, 85], [github, 730, 85], [wiki, 110, 410]]) {
    PNG.bitblt(image, sheet, 0, 0, image.width, image.height, x, y);
  }
  return PNG.sync.write(sheet);
}

export async function mixedCodeFixture() {
  const items = [['Aztec', 'AZTEC123'], ['DataMatrix', 'MATRIX123'], ['PDF417', 'PDF123'],
    ['EAN13', '5901234123457'], ['Code128', 'CODE128'], ['Code39Std', 'ABC12']];
  const sheet = new PNG({ width: 1280, height: 720 }); sheet.data.fill(255);
  for (let i = 0; i < items.length; i++) {
    const [format, text] = items[i];
    const image = PNG.sync.read(await barcode(text, format, '', 3));
    PNG.bitblt(image, sheet, 0, 0, image.width, image.height, 40 + i % 3 * 410, 85 + Math.floor(i / 3) * 315);
  }
  return PNG.sync.write(sheet);
}

export async function focusCodeFixture(crop, multiple = false) {
  const sheet = new PNG({ width: 1280, height: 720 }); sheet.data.fill(255);
  const inside = PNG.sync.read(await barcode('INSIDE', 'QRCodeModel2', '', Math.min(crop.width, crop.height) >= 80 ? 2 : 1));
  const outside = PNG.sync.read(await barcode('OUTSIDE', 'QRCodeModel2', '', 3));
  const x = crop.x + (crop.width - inside.width) / 2;
  const y = Math.round(crop.y + (crop.height - inside.height) / 2);
  PNG.bitblt(inside, sheet, 0, 0, inside.width, inside.height, Math.round(multiple ? x - crop.width / 4 : x), y);
  if (multiple) {
    const second = PNG.sync.read(await barcode('INSIDE-2', 'QRCodeModel2', '', 2));
    PNG.bitblt(second, sheet, 0, 0, second.width, second.height, Math.round(x + crop.width / 4), y);
  }
  PNG.bitblt(outside, sheet, 0, 0, outside.width, outside.height, 600, 620);
  return PNG.sync.write(sheet);
}
