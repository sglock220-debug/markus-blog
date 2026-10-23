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
