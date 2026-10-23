import { test, expect } from '@playwright/test';
import { multiQrFixture, repeatedQrFixture, mixedCodeFixture, focusCodeFixture } from './qrFixtures.mjs';
import { focusSourceRect } from '../src/services/codeGeometry.js';
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
    window.qrTestStreams = [];
    window.qrTestHeldMessages = [];
    window.qrTestHoldWorkerMessages = false;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(...args) {
        super(...args); window.qrTestWorkersCreated++; window.qrTestLiveWorkers++;
        this.addEventListener('message', event => {
          if (window.qrTestHoldWorkerMessages) {
            event.stopImmediatePropagation();
            window.qrTestHeldMessages.push({ handler: this.onmessage, data: event.data });
          }
        });
      }
      postMessage(...args) { window.qrTestScanTasks++; super.postMessage(...args); }
      terminate() {
        if (!this.qrTestTerminated) { this.qrTestTerminated = true; window.qrTestLiveWorkers--; }
        super.terminate();
      }
    };
    navigator.mediaDevices.getUserMedia = async () => {
      window.qrTestCameraRequests++;
      let image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      window.qrTestSetImage = async png => { const next = new Image(); next.src = `data:image/png;base64,${png}`; await next.decode(); image = next; };
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const stream = canvas.captureStream(15);
      window.qrTestStreams.push(stream);
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
  await selectMode(page, 'Code识别');
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
  await expect(page.locator('.hud-subtitle')).toContainText('DETECT: CODE');
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: '识别类别' }).click();
  await page.getByPlaceholder('搜索类别，例如 person / 手机 / 67').fill('手机');
  await expect(page.locator('.class-list .class-item')).toHaveCount(1);
  await page.locator('.class-list input').check();
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  await page.screenshot({ path: testInfo.outputPath('desktop-settings.png') });
  await expect(page.getByLabel('启用 QR Code 扫描', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '取消全选', exact: true }).click();
  await expect(page.locator('.scan-status')).toContainText('请选择');
  await page.getByRole('button', { name: '全部选择', exact: true }).click();
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
  expect((await download).suggestedFilename()).toMatch(/code-history.*\.json/);
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
    await selectMode(page, 'Code识别');
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
  await selectMode(page, 'Code识别');
  await expect(page.locator('.result-detail pre')).toHaveText(chinese); // history survived mode changes
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(1);
  expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
  await expect(page.locator('.qr-panel')).toBeHidden();
  await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
  await page.getByRole('button', { name: '开启视觉系统' }).click();
  await expect(page.getByRole('button', { name: '识别: 无', exact: true })).toBeVisible();
  await expect(page.locator('.qr-panel')).toBeHidden();
  await selectMode(page, 'Code识别');
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
  await expect(page.locator('.result-number').filter({ hasText: 'CODE #1' })).toHaveCount(1);
  const sessionRows = await page.locator('.result-list').textContent();
  await selectMode(page, '无识别模式');
  await expect(page.locator('.qr-panel')).toBeHidden();
  await selectMode(page, 'Code识别');
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
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  const bounds = await page.locator('.options-menu').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: testInfo.outputPath('mobile-settings.png') });
  await page.locator('.advanced-recognition > summary').click();
  await page.getByLabel('识别强度', { exact: true }).selectOption('accurate');
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
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  await expect(page.getByLabel('识别强度', { exact: true })).toHaveValue('accurate');
  await context.close();
});

for (const device of [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, touch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, touch: true },
]) {
  test(`${device.name}: unified shutdown resets modes, preserves data and rejects late results`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport: device.viewport, hasTouch: device.touch, isMobile: device.touch });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await mockCamera(page);
    await page.routeWebSocket('**/ws/yolo-client/', socket => socket.onMessage(message => {
      if (JSON.parse(String(message)).type === 'detect') socket.send(JSON.stringify({ type: 'result', width: 640, height: 360,
        detections: [{ x1: 10, y1: 10, x2: 100, y2: 100, label: 'person', score: .9 }] }));
    }));
    await page.goto('http://localhost:5179/cyber-camera');
    let firstSeen;
    for (let cycle = 0; cycle < 5; cycle++) {
      const created = await page.evaluate(() => window.qrTestWorkersCreated);
      await page.getByRole('button', { name: '开启视觉系统' }).click();
      await expect(page.getByRole('button', { name: '识别: 无', exact: true })).toBeVisible();
      await expect(page.locator('.qr-panel')).toBeHidden();
      expect(await page.evaluate(() => window.qrTestWorkersCreated)).toBe(created);
      if (cycle % 2 === 0) {
        await selectMode(page, 'Code识别');
        await expect(page.locator('.target-count')).toHaveText('当前画面 4 目标');
        if (cycle === 0) {
          firstSeen = await page.locator('.result-detail time').first().textContent();
          await page.locator('.result-row.selected').getByRole('button', { name: '保存到历史' }).click();
        } else await expect(page.locator('.result-detail time').first()).toHaveText(firstSeen);
      } else {
        await selectMode(page, 'YOLO识别');
        await expect(page.locator('.yolo-worker-badge')).toContainText('在线');
      }
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      await expect(page.getByRole('button', { name: '开启视觉系统' })).toBeEnabled();
      await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
      await expect(page.locator('.qr-panel')).toBeHidden();
      await expect(page.locator('.code-focus-overlay, .yolo-worker-badge, .options-menu')).toHaveCount(0);
      expect(await page.locator('video').evaluate(v => v.srcObject)).toBe(null);
      expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
      expect(await page.evaluate(() => window.qrTestStoppedTracks)).toBe(cycle + 1);
      expect(await page.evaluate(() => window.qrTestStreams.every(s => s.getTracks().every(t => t.readyState === 'ended')))).toBe(true);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cyber-camera.qr.history.v1')).length)).toBe(1);
    }
    await page.screenshot({ path: testInfo.outputPath(`closed-${device.name}.png`) });
    // Delay a real WASM reply until after shutdown; it must not resurrect state.
    await page.getByRole('button', { name: '开启视觉系统' }).click();
    await page.evaluate(() => { window.qrTestHoldWorkerMessages = true; });
    await selectMode(page, 'Code识别');
    await expect.poll(() => page.evaluate(() => window.qrTestHeldMessages.length)).toBeGreaterThan(0);
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await page.evaluate(() => {
      window.qrTestHeldMessages.forEach(({ handler, data }) => handler?.({ data }));
      window.qrTestHoldWorkerMessages = false;
    });
    await expect(page.locator('.qr-panel')).toBeHidden();
    await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
    const stoppedAt = await page.evaluate(() => window.qrTestScanTasks);
    await page.waitForTimeout(850);
    expect(await page.evaluate(() => window.qrTestScanTasks)).toBe(stoppedAt);
    await page.getByRole('button', { name: '开启视觉系统' }).click();
    await expect(page.getByRole('button', { name: '识别: 无', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const old = window.qrTestStreams[0];
      old.dispatchEvent(new Event('inactive'));
      old.getVideoTracks()[0].dispatchEvent(new Event('ended'));
    });
    expect(await page.locator('video').evaluate(v => !!v.srcObject?.active)).toBe(true);
    await selectMode(page, 'Code识别');
    await page.evaluate(() => window.qrTestStreams.at(-1).getVideoTracks()[0].dispatchEvent(new Event('ended')));
    await expect(page.getByRole('button', { name: '开启视觉系统' })).toBeVisible();
    await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
    await expect(page.locator('.qr-panel')).toBeHidden();
    await page.getByRole('button', { name: '开启视觉系统' }).click();
    await selectMode(page, 'YOLO识别');
    await page.evaluate(() => window.qrTestStreams.at(-1).dispatchEvent(new Event('inactive')));
    await expect(page.getByRole('button', { name: '开启视觉系统' })).toBeVisible();
    await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
    expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
    await page.getByRole('button', { name: '开启视觉系统' }).click();
    await selectMode(page, 'Code识别');
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission revoked', 'NotAllowedError'); }; });
    await page.getByRole('button', { name: '切换镜头', exact: true }).click();
    await expect(page.locator('.cyber-camera-error')).toContainText('Permission revoked');
    await expect(page.locator('.qr-panel')).toBeHidden();
    await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
    expect(await page.evaluate(() => window.qrTestLiveWorkers)).toBe(0);
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('camera permission denial is explained without starting a scan', async ({ page }) => {
  await page.addInitScript(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Permission denied', 'NotAllowedError'); }; });
  await page.goto('/cyber-camera');
  await page.getByRole('button', { name: '开启视觉系统' }).click();
  await expect(page.locator('.cyber-camera-error')).toContainText('Permission denied');
  await expect(page.locator('.target-count')).toHaveText('当前画面 0 目标');
  await expect(page.locator('.qr-panel')).toBeHidden();
  await expect(page.locator('.hud-subtitle')).toContainText('DETECT: OFF');
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

test('four format groups select real mixed codes; disabled formats stop detection', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockCamera(page, (await mixedCodeFixture()).toString('base64'));
  await page.goto('/cyber-camera');
  await startQr(page);
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  await expect(page.locator('.code-format-group')).toHaveCount(4);
  await expect(page.locator('.code-format-group[open]')).toHaveCount(1);
  await page.locator('[data-group="matrix"] > summary').click();
  await expect(page.locator('input[value="MaxiCode"]')).toBeDisabled();
  await page.getByRole('button', { name: '全部选择', exact: true }).click();
  await expect(page.locator('.section-heading')).toContainText(['扫描控制', 'Code 码制已选择 26 项', '聚焦扫描']);
  await page.screenshot({ path: testInfo.outputPath('code-groups.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('.target-count')).toHaveText('当前画面 6 目标', { timeout: 20000 });
  await expect(page.locator('.result-row')).toHaveCount(6);
  await page.locator('.result-select').filter({ hasText: '5901234123457' }).click();
  await expect(page.locator('.metadata')).toContainText('EAN-13 · 商品编码');
  await expect(page.locator('.result-detail a')).toHaveCount(0);
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  await page.getByRole('button', { name: '取消全选', exact: true }).click();
  const group = page.locator('[data-group="retail"]');
  await group.locator('summary').click();
  await group.getByRole('button', { name: '本组全选', exact: true }).click();
  await expect(group.locator('.group-count')).toHaveText('9 / 9');
  await group.getByRole('button', { name: '本组取消', exact: true }).click();
  await group.locator('input[value="EAN13"]').check();
  await page.keyboard.press('Escape');
  await expect(page.locator('.target-count')).toHaveText('当前画面 1 目标');
  await expect(page.locator('.result-row')).toHaveCount(6); // past session results remain visible
});

test('legacy QR settings and saved history remain readable under Code naming', async ({ page }) => {
  await mockCamera(page);
  await page.addInitScript(() => {
    localStorage.setItem('cyber-camera.qr.settings.v1', JSON.stringify({ formats: ['MicroQRCode', 'RMQRCode'], mode: 'standard' }));
    localStorage.setItem('cyber-camera.qr.history.v1', JSON.stringify([{ id: 'legacy', text: 'https://legacy.example.com',
      format: 'QRCodeModel2', contentType: 'URL', detectedAt: '2026-10-20T12:00:00.000Z', savedAt: '2026-10-20T12:00:01.000Z' }]));
  });
  await page.goto('/cyber-camera');
  await startQr(page);
  await expect(page.locator('.target-count')).toHaveText('当前画面 2 目标', { timeout: 20000 });
  await expect(page.locator('.code-focus-overlay')).toHaveCount(0);
  await page.locator('.history-toggle').click();
  await expect(page.locator('.result-detail pre')).toHaveText('https://legacy.example.com');
  await page.getByRole('button', { name: '选项', exact: true }).click();
  await page.getByRole('tab', { name: 'Code 码制' }).click();
  await expect(page.locator('input[value="QRCodeModel2"]')).not.toBeChecked();
  await expect(page.locator('input[value="MicroQRCode"]')).toBeChecked();
  await expect(page.getByLabel('聚焦扫描模式')).not.toBeChecked();
});

test('focus decodes only cropped pixels on desktop, portrait HiDPI mirror and landscape', async ({ browser }, testInfo) => {
  test.setTimeout(60000);
  for (const scenario of [
    { name: 'desktop', viewport: { width: 1440, height: 1000 }, dpr: 1, mirror: false },
    { name: 'phone-mirror', viewport: { width: 390, height: 844 }, dpr: 2, mirror: true },
    { name: 'landscape', viewport: { width: 844, height: 390 }, dpr: 2, mirror: false },
  ]) {
    const context = await browser.newContext({ viewport: scenario.viewport, deviceScaleFactor: scenario.dpr, hasTouch: scenario.dpr === 2 });
    const page = await context.newPage();
    await mockCamera(page);
    await page.addInitScript(({ mirror }) => {
      localStorage.setItem('cyber-camera.qr.settings.v1', JSON.stringify({ formats: ['QRCodeModel2'],
        focusEnabled: true, focusShape: 'square', focusSize: 95, mirrored: mirror }));
    }, { mirror: scenario.mirror });
    await page.goto('http://localhost:5179/cyber-camera');
    await page.evaluate(() => { window.qrTestShowCodes = false; });
    await startQr(page);
    await page.locator('.panel-toggle').click(); // establish the expanded panel layout before placing test codes
    await expect(page.locator('.code-focus-window')).toBeVisible();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const layout = await page.evaluate(() => {
      const stage = document.querySelector('.cyber-camera-stage').getBoundingClientRect();
      const focus = document.querySelector('.code-focus-window').getBoundingClientRect();
      const video = document.querySelector('video');
      return { width: stage.width, height: stage.height, videoWidth: video.videoWidth, videoHeight: video.videoHeight,
        rect: { x: focus.x - stage.x, y: focus.y - stage.y, width: focus.width, height: focus.height } };
    });
    const crop = focusSourceRect(layout.rect, layout.videoWidth, layout.videoHeight, layout.width, layout.height, scenario.mirror);
    const png = (await focusCodeFixture(crop)).toString('base64');
    await page.evaluate(async png => { await window.qrTestSetImage(png); window.qrTestShowCodes = true; }, png);
    await expect(page.locator('.target-count')).toHaveText('当前画面 1 目标', { timeout: 20000 });
    await expect(page.locator('.result-row')).toHaveCount(1);
    await expect(page.locator('.result-detail pre')).toHaveText('INSIDE');
    const scans = await page.evaluate(() => window.qrTestScanTasks);
    await expect.poll(() => page.evaluate(() => window.qrTestScanTasks)).toBeGreaterThan(scans + 2);
    await expect(page.locator('.result-row')).toHaveCount(1);
    if (scenario.name === 'desktop') {
      const multiple = (await focusCodeFixture(crop, true)).toString('base64');
      await page.evaluate(png => window.qrTestSetImage(png), multiple);
      await expect(page.locator('.target-count')).toHaveText('当前画面 2 目标');
      await expect(page.locator('.result-row')).toHaveCount(2);
      await expect(page.locator('.result-select').filter({ hasText: 'OUTSIDE' })).toHaveCount(0);
    }
    await page.screenshot({ path: testInfo.outputPath(`focus-${scenario.name}.png`) });
    const workers = await page.evaluate(() => window.qrTestWorkersCreated);
    await page.getByRole('button', { name: '选项', exact: true }).click();
    await page.getByRole('tab', { name: 'Code 码制' }).click();
    await page.getByLabel('聚焦扫描模式').uncheck();
    await page.keyboard.press('Escape');
    await expect(page.locator('.code-focus-overlay')).toHaveCount(0);
    const total = scenario.name === 'desktop' ? 3 : 2;
    await expect(page.locator('.target-count')).toHaveText(`当前画面 ${total} 目标`);
    await expect(page.locator('.result-row')).toHaveCount(total);
    expect(await page.evaluate(() => window.qrTestWorkersCreated)).toBe(workers);
    await context.close();
  }
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
