import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { barcode, imageData, multiQrFixture } from './qrFixtures.mjs';
import { defaultQrSettings, normalizeQrSettings, safeQrUrl, qrContentType, qrFormat, QrSession, QR_REENTRY_DELAY, qrContentKey, coverPoint } from '../src/services/qrScanner.js';

prepareZXingModule({ overrides: {
  wasmBinary: readFileSync(new URL('../node_modules/zxing-wasm/dist/reader/zxing_reader.wasm', import.meta.url)),
} });
const formats = defaultQrSettings().formats;
const decode = (png, selectedFormats = formats) => readBarcodes(imageData(png), {
  formats: selectedFormats, textMode: 'Plain', maxNumberOfSymbols: 0, tryHarder: true,
});

test('HTTP(S) links are explicit and dangerous / malformed schemes stay plain text', () => {
  assert.equal(safeQrUrl('javascript:alert(1)'), null);
  assert.equal(safeQrUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(safeQrUrl('//example.com'), null);
  assert.equal(safeQrUrl('https://'), null);
  assert.equal(safeQrUrl('https://example.com/a?x=1'), 'https://example.com/a?x=1');
  assert.equal(qrContentType('WIFI:T:WPA;S:test;P:secret;;'), 'Wi-Fi');
  assert.equal(qrContentType('BEGIN:VCARD\nFN:Test'), 'Contact');
  assert.equal(qrContentType('<img src=x onerror=alert(1)>'), 'Text');
  assert.equal(qrContentType('', 'Binary'), 'Other');
});

test('settings validate persistence input and preserve all-unselected state', () => {
  assert.deepEqual(normalizeQrSettings({ formats: [] }).formats, []);
  assert.deepEqual(normalizeQrSettings({ formats: ['Bad', 'RMQRCode'] }).formats, ['RMQRCode']);
  assert.equal(normalizeQrSettings({ interval: -10 }).interval, 100);
  assert.equal(normalizeQrSettings({ retention: 10000 }).retention, 500);
});

const target = (text, x) => ({ text, bytes: [...new TextEncoder().encode(text)], format: 'QRCodeModel2',
  points: [{ x, y: .2 }, { x: x + .1, y: .2 }, { x: x + .1, y: .3 }, { x, y: .3 }] });

test('a whole session merges exact decoded content, preserves first seen and distinct physical boxes', () => {
  const session = new QrSession();
  const settings = defaultQrSettings();
  const github = target('https://github.com', .1);
  const twin = { ...target('https://github.com', .7), format: 'MicroQRCode', bytes: [99] };
  const wiki = target('https://wikipedia.org', .4);
  const first = session.update([github, twin, wiki], settings, 100000);
  assert.equal(new Set(first.map(t => t.id)).size, 3);
  assert.equal(first[0].resultId, first[1].resultId);
  assert.equal(session.entries.length, 2);
  const record = session.byContent.get(qrContentKey(github));
  for (let now = 100250; now <= 130000; now += 250) session.update([github, twin, wiki], settings, now);
  session.update([], settings, 140000);
  session.update([wiki, github], settings, 2000000);
  assert.equal(session.entries.length, 2);
  assert.equal(session.byContent.get(qrContentKey(github)).id, record.id);
  assert.equal(record.detectedAt, new Date(100000).toISOString());
  assert.equal(record.lastSeenAt, new Date(2000000).toISOString());
});

test('delete suppresses a still-visible content; only confirmed absence releases it', () => {
  const session = new QrSession();
  const settings = defaultQrSettings();
  const a = target('A', .1), b = target('B', .7);
  const initial = session.update([a, a, b], settings, 100000);
  session.remove(initial[0].resultId);
  let active = session.update([a, a, b], settings, 130000);
  assert.equal(active.length, 3);
  assert.equal(active[0].resultId, null);
  assert.deepEqual(session.entries.map(e => e.text), ['B']);
  session.update([b], settings, 131000);
  session.update([a, b], settings, 131500); // a brief detection miss must not release it
  assert.equal(session.entries.length, 1);
  session.update([b], settings, 132000);
  session.update([b], settings, 132000 + QR_REENTRY_DELAY);
  session.update([a, b], settings, 134000);
  assert.equal(session.entries.length, 2);
  assert.notEqual(session.entries.find(e => e.text === 'A').id, initial[0].resultId);
});

test('refresh clears content identities, selection numbers and in-flight frame, without permanently blocking codes', () => {
  const session = new QrSession();
  const settings = defaultQrSettings();
  const a = target('A', .1), b = target('B', .7);
  session.update([a], settings, 100000);
  session.clear();
  assert.equal(session.entries.length, 0);
  assert.equal(session.byContent.size, 0);
  assert.equal(session.sequence, 0);
  session.update([a, b], settings, 100100); // b was in flight at the time of the clear
  assert.equal(session.entries.length, 0);
  session.update([], settings, 101000);
  session.pause();
  session.update([a, b], settings, 200000); // a mode change must not count as observed absence
  assert.equal(session.entries.length, 0);
  session.update([], settings, 201000);
  session.update([], settings, 201000 + QR_REENTRY_DELAY);
  const returned = session.update([b], settings, 203000);
  assert.equal(session.entries.length, 1);
  assert.equal(returned[0].number, 1);
});

test('retention preserves content identity and first time when an old result reappears', () => {
  const session = new QrSession();
  const settings = { ...defaultQrSettings(), retention: 10 };
  const targets = Array.from({ length: 15 }, (_, i) => target(String(i), i / 20));
  const first = session.update(targets, settings, 100000);
  assert.equal(session.entries.length, 15);
  session.update([], settings, 100300);
  assert.equal(session.entries.length, 10);
  session.update([targets[0]], settings, 200000);
  const restored = session.entries.find(e => e.text === '0');
  assert.equal(restored.id, first[0].resultId);
  assert.equal(restored.detectedAt, new Date(100000).toISOString());
  assert.equal(session.byContent.size, 15);
});

test('cover geometry accounts for crop and mirror', () => {
  assert.deepEqual(coverPoint({ x: 640, y: 360 }, 1280, 720, 390, 844), { x: 195, y: 422 });
  const point = coverPoint({ x: 0, y: 0 }, 1280, 720, 390, 844);
  assert.ok(point.x < 0);
  assert.equal(coverPoint({ x: 0, y: 0 }, 1280, 720, 390, 844, true).x, 390 - point.x);
});

test('official Model 1 sample is decoded and the Model 2 switch excludes it', async () => {
  const sample = readFileSync(new URL('./fixtures/qr-model-1.png', import.meta.url));
  const result = await decode(sample, ['QRCodeModel1']);
  assert.equal(qrFormat(result[0]), 'QRCodeModel1');
  assert.equal(result[0].text, 'QR Code Model 1 ');
  assert.equal(qrFormat((await decode(sample))[0]), 'QRCodeModel1');
  assert.equal((await decode(sample, ['QRCodeModel2'])).length, 0);
});

test('Model 2 versions 1–40 and EC L/M/Q/H decode real rendered symbols', async () => {
  for (let version = 1; version <= 40; version++) {
    for (const ec of ['L', 'M', 'Q', 'H']) {
      const png = await barcode('QR123', 'QRCodeModel2', `version=${version},ecLevel=${ec}`, 3);
      const result = (await decode(png, ['QRCodeModel2']))[0];
      assert.equal(result?.text, 'QR123', `version ${version}, EC ${ec}`);
      assert.equal(qrFormat(result), 'QRCodeModel2');
      const metadata = JSON.parse(result.extra);
      assert.equal(String(metadata.Version), String(version));
      assert.equal(metadata.ECLevel, ec);
    }
  }
});

test('Micro QR M1–M4 and rectangular QR are actually decoded', async () => {
  for (let version = 1; version <= 4; version++) {
    const result = (await decode(await barcode('123', 'MicroQRCode', `version=${version}`), ['MicroQRCode']))[0];
    assert.equal(result?.format, 'MicroQRCode');
    assert.equal(result.text, '123');
  }
  for (const ec of ['M', 'H']) {
    const result = (await decode(await barcode('12345678', 'RMQRCode', `ecLevel=${ec}`), ['RMQRCode']))[0];
    assert.equal(result?.format, 'RMQRCode');
    assert.equal(result.text, '12345678');
  }
});

test('one frame decodes all four targets including Chinese ECI; format filters apply', async () => {
  const fixture = await multiQrFixture();
  const results = await decode(fixture);
  assert.equal(results.length, 4);
  assert.ok(results.some(r => r.text === '你好，Cyber Camera！\n完整中文与 English'));
  assert.ok(results.some(r => r.text === 'https://example.com/camera?qr=1'));
  assert.equal((await decode(fixture, ['MicroQRCode'])).length, 1);
  const repeated = PNG.sync.read(await barcode('SAME CONTENT'));
  const pair = new PNG({ width: 800, height: 400 });
  pair.data.fill(255);
  for (const x of [80, 500]) PNG.bitblt(repeated, pair, 0, 0, repeated.width, repeated.height, x, 100);
  assert.equal((await decode(PNG.sync.write(pair))).length, 2, 'two physical copies must not be deduplicated by the decoder');
});
