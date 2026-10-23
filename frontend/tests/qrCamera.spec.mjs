import { test, expect } from '@playwright/test';
import { multiQrFixture, repeatedQrFixture } from './qrFixtures.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let fixture;
test.beforeAll(async () => { fixture = (await multiQrFixture()).toString('base64'); });

async function mockCamera(page, png = fixture) {
  // Exercise the real Worker + WASM with a deterministic camera MediaStream.
  await page.addInitScript(({ png }) => {
    window.qrTestStoppedTracks = 0;
    window.qrTestCameraRequests = 0;
    window.qrTestShowCodes = true;
    window.qrTestWorkersCreated = 0;
    window.qrTestLiveWorkers = 0;
    window.qrTestScanTasks = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) { super(...args); window.qrTestWorkersCreated++; window.qrTestLiveWorkers++; }
      postMessage(...args) { window.qrTestScanTasks++; super.postMessage(...args); }
      terminate() {
        if (!this.qrTestTerminated) { this.qrTestTerminated = true; window.qrTestLiveWorkers--; }
        super.terminate();
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      window.qrTestCameraRequests++;
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const stream = canvas.captureStream(15);
      const repaint = setInterval(() => {
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (window.qrTestShowCodes) ctx.drawImage(image, 0, 0);
      }, 60);
      const track = stream.getVideoTracks()[0];
      const stop = track.stop.bind(track);
      track.stop = () => { clearInterval(repaint); window.qrTestStoppedTracks++; stop(); };
      return stream;
    };
    window.qrTestCopies = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.qrTestCopies.push(text); },
    } });
  }, { png });
}

async function selectMode(page, mode) {
  await page.getByRole('button', { name: /^识别:/ }).click();
  await page.getByRole('button', { name: mode, exact: true }).click();
}

async function startQr(page) {
  await page.getByRole('button', { name: '开启视觉系统' }).click();
  await expect(page.locator('.qr-panel')).toBeHidden();
  expect(await page.evaluate(() => window.qrTestWorkersCreated)).toBe(0);
  await selectMode(page, 'QR Code识别');
}

test('desktop: QR results, persistence and mutually exclusive engine lifecycles', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockCamera(page);
  let yoloFrames = 0;
  await page.routeWebSocket('**/ws/yolo-client/', socket => {
    socket.onMessage(message => {
      if (JSON.parse(String(message)).type === 'detect') {
        yoloFrames++;
        socket.send(JSON.stringify({ type: 'result', width: 640, height: 360,
          detections: [{ x1: 10, y1: 10, x2: 100, y2: 100, label: 'person', score: .9 }] }));
      }
    });
  });
  await page.goto('/cyber-camera');
  await startQr(page);
  await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标', { timeout: 20000 });
  await expect(page.locator('.result-row')).toHaveCount(4);
  await expect(page.locator('.hud-subtitle')).toContainText('DETECT: QR CODE');
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: '识别类别' }).click();
  await page.getByPlaceholder('搜索类别，例如 person / 手机 / 67').fill('手机');
  await expect(page.locator('.class-list .class-item')).toHaveCount(1);
  await page.locator('.class-list input').check();
  await page.getByRole('tab', { name: 'QR Code 模型' }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-settings.png') });
  await expect(page.getByLabel('启用 QR Code 扫描', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '取消全选', exact: true }).click();
  await expect(page.locator('.scan-status')).toContainText('请选择');
  await page.getByRole('button', { name: '全选', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标');
  await page.locator('.result-select').filter({ hasText: '你好' }).click();
  const chinese = '你好，Cyber Camera！\n完整中文与 English';
  await expect(page.locator('.result-detail pre')).toHaveText(chinese);
  await page.screenshot({ path: testInfo.outputPath('desktop-results.png') });
  await page.locator('.result-detail pre').dblclick();
  await page.locator('.result-row.selected').getByRole('button', { name: '复制完整内容' }).click();
  expect(await page.evaluate(() => window.qrTestCopies)).toEqual([chinese, chinese]);
  await page.locator('.result-row.selected').getByRole('button', { name: '保存到历史' }).click();
  await page.locator('.history-toggle').click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 JSON' }).click();
  expect((await download).suggestedFilename()).toMatch(/qr-history.*\.json/);
  await page.reload();
  await startQr(page);
  await page.locator('.history-toggle').click();
  await expect(page.locator('.result-detail pre')).toHaveText(chinese);
  await selectMode(page, 'YOLO识别');
  await expect(page.locator('.qr-panel')).toBeHidden();
  await expect(page.locator('.yolo-worker-badge')).toContainText('在线');
  const stoppedAt = await page.evaluate(() => window.qrTestScanTasks);
  await expect.poll(() => yoloFrames).toBeGreaterThan(0);
  expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
  expect(await page.evaluate(() => window.qrTestScanTasks)).toBe(stoppedAt);
  for (let i = 0; i < 3; i++) {
    const oldYoloFrames = yoloFrames;
    await selectMode(page, 'QR Code识别');
    await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标');
    expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(1);
    await selectMode(page, '无识别模式');
    await expect(page.locator('.qr-panel')).toBeHidden();
    await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
    expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
    // Sample for longer than the old YOLO interval to verify it stays stopped.
    await page.waitForTimeout(850);
    expect(yoloFrames).toBe(oldYoloFrames);
  }
  expect(await page.evaluate(() => window.qrTestCameraRequests)).toBe(1);
  expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(0);
  expect(await page.locator('video').evaluate(v => !v.paused && v.srcObject.active)).toBe(true);
  await selectMode(page, 'QR Code识别');
  await expect(page.locator('.result-detail pre')).toHaveText(chinese); // history survived mode changes
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(1);
  expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
  await page.locator('.result-row').getByRole('button', { name: '删除记录' }).click();
  await expect(page.locator('.result-row')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('30 seconds of repeated GitHub codes stay unique; delete and refresh wait for reentry', async ({ page }, testInfo) => {
  test.setTimeout(70000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockCamera(page, (await repeatedQrFixture()).toString('base64'));
  await page.goto('/cyber-camera');
  await startQr(page);
  await expect(page.locator('.target-count')).toHaveText('当前画面 3 目标', { timeout: 20000 });
  await expect(page.locator('.result-row')).toHaveCount(2);
  const github = page.locator('.result-row').filter({ hasText: 'https://github.com' });
  await github.locator('.result-select').click();
  const firstTime = await page.locator('.result-detail time').first().textContent();
  for (let second = 0; second < 30; second++) {
    await page.waitForTimeout(1000);
    await expect(github).toHaveCount(1);
    await expect(page.locator('.result-row')).toHaveCount(2);
  }
  await expect(page.locator('.result-detail time').first()).toHaveText(firstTime);
  await github.getByRole('button', { name: '保存到历史' }).click();
  await github.getByRole('button', { name: '删除本次结果' }).click();
  await expect(page.locator('.result-row')).toHaveCount(1);
  await expect(page.locator('.result-detail pre')).toHaveText('https://wikipedia.org');
  let scans = await page.evaluate(() => window.qrTestScanTasks);
  await expect.poll(() => page.evaluate(() => window.qrTestScanTasks)).toBeGreaterThan(scans + 3);
  await expect(github).toHaveCount(0);
  await expect(page.locator('.history-toggle')).toContainText('历史 1');
  await page.screenshot({ path: testInfo.outputPath('session-delete.png') });
  await page.evaluate(() => { window.qrTestShowCodes = false; });
  await expect(page.locator('.target-count')).toHaveText('当前画面 0 目标');
  await page.waitForTimeout(1800);
  await page.evaluate(() => { window.qrTestShowCodes = true; });
  await expect(github).toHaveCount(1);
  await expect(page.locator('.result-row')).toHaveCount(2);
  const workerCount = await page.evaluate(() => window.qrTestWorkersCreated);
  await page.getByRole('button', { name: '清空本次扫描' }).click();
  await expect(page.locator('.result-row')).toHaveCount(0);
  await expect(page.locator('.scan-status')).toContainText('扫描中');
  scans = await page.evaluate(() => window.qrTestScanTasks);
  await expect.poll(() => page.evaluate(() => window.qrTestScanTasks)).toBeGreaterThan(scans + 3);
  await expect(page.locator('.result-row')).toHaveCount(0);
  expect(await page.evaluate(() => window.qrTestWorkersCreated)).toBe(workerCount);
  expect(await page.evaluate(() => window.qrTestCameraRequests)).toBe(1);
  expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(0);
  await page.locator('.history-toggle').click();
  await expect(page.locator('.result-row')).toHaveCount(1);
  await expect(page.locator('.result-detail pre')).toHaveText('https://github.com');
  await page.locator('.history-toggle').click();
  await page.evaluate(() => { window.qrTestShowCodes = false; });
  await expect(page.locator('.target-count')).toHaveText('当前画面 0 目标');
  await page.waitForTimeout(1800);
  await page.evaluate(() => { window.qrTestShowCodes = true; });
  await expect(page.locator('.result-row')).toHaveCount(2);
  await expect(page.locator('.result-number').filter({ hasText: 'QR #1' })).toHaveCount(1);
  const sessionRows = await page.locator('.result-list').textContent();
  await selectMode(page, '无识别模式');
  await expect(page.locator('.qr-panel')).toBeHidden();
  await selectMode(page, 'QR Code识别');
  await expect(page.locator('.result-list')).toHaveText(sessionRows);
  await expect(page.locator('.result-row')).toHaveCount(2);
});

test('mobile: bounded settings/results, camera switch, fullscreen, and settings persistence', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await mockCamera(page);
  await page.goto('http://localhost:5179/cyber-camera');
  await startQr(page);
  await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标', { timeout: 20000 });
  await expect(page.locator('.mobile-camera-page')).toBeVisible();
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: 'QR Code 模型' }).click();
  const bounds = await page.locator('.options-menu').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: testInfo.outputPath('mobile-settings.png') });
  await page.getByLabel('扫描模式', { exact: true }).selectOption('accurate');
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('mobile-results.png') });
  await page.getByRole('button', { name: '切换镜头', exact: true }).click();
  await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标');
  expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(1);
  await page.getByRole('button', { name: '全屏', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: '全屏', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '开启视觉系统' }).click();
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: 'QR Code 模型' }).click();
  await expect(page.getByLabel('扫描模式', { exact: true })).toHaveValue('accurate');
  await context.close();
});

test('camera permission denial is explained without starting a scan', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }; });
  await page.goto('/cyber-camera');
  await page.getByRole('button', { name: '开启视觉系统' }).click();
  await expect(page.locator('.cyber-camera-error')).toContainText('Permission denied');
  await expect(page.locator('.target-count')).toHaveText('当前画面 0 目标');
});

test('unsupported Worker is explained while the camera keeps playing', async ({ page }) => {
  await mockCamera(page);
  await page.addInitScript(() => { window.Worker = undefined; });
  await page.goto('/cyber-camera');
  await startQr(page);
  await expect(page.getByRole('alert')).toContainText('不支持 Worker');
  expect(await page.locator('video').evaluate(v => !v.paused)).toBe(true);
});

test('save and copy failures do not claim success or interrupt video', async ({ page }) => {
  await mockCamera(page);
  await page.goto('/cyber-camera');
  await startQr(page);
  await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标', { timeout: 20000 });
  await page.evaluate(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
    navigator.clipboard.writeText = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
    document.execCommand = () => false;
  });
  await page.locator('.result-row').first().getByRole('button', { name: '保存到历史' }).click();
  await expect(page.getByRole('alert')).toContainText('数据尚未保存');
  await expect(page.locator('.history-toggle')).toContainText('历史 0');
  await page.locator('.result-row').first().getByRole('button', { name: '复制完整内容' }).click();
  await expect(page.locator('.notification')).toContainText('复制失败');
  expect(await page.locator('video').evaluate(v => !v.paused)).toBe(true);
});

test('production /static/ bundle loads local WASM and scans through the built Worker', async ({ browser }) => {
  const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
  const server = createServer(async (request, response) => {
    const requested = new URL(request.url, 'http://localhost').pathname;
    const file = requested.startsWith('/static/') ? path.join(dist, requested.slice('/static/'.length)) : path.join(dist, 'index.html');
    try {
      const content = await readFile(file);
      response.setHeader('Content-Type', ({ '.js': 'application/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.png': 'image/png', '.html': 'text/html' })[path.extname(file)] || 'application/octet-stream');
      response.end(content);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  try {
    await mockCamera(page);
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(`${origin}/cyber-camera`);
    await startQr(page);
    await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标', { timeout: 20000 });
    expect(requests.some(url => url.startsWith(`${origin}/static/assets/zxing_reader-`) && url.endsWith('.wasm'))).toBe(true);
    expect(requests.some(url => url.includes('cdn.jsdelivr.net'))).toBe(false);
  } finally {
    await page.close();
    await new Promise(resolve => server.close(resolve));
  }
});
