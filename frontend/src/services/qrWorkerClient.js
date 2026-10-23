export class QrWorkerClient {
  constructor() {
    this.worker = new Worker(new URL('./qrScanner.worker.js', import.meta.url), { type: 'module' });
  }

  decode(image, settings) {
    if (this.pending) return Promise.reject(new Error('扫描器忙碌'));
    return new Promise((resolve, reject) => {
      const finish = (error, results) => {
        clearTimeout(this.timeout);
        this.pending = null;
        error ? reject(error) : resolve(results);
      };
      this.pending = finish;
      this.worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data.results);
      this.worker.onerror = () => finish(new Error('Code Worker 无法运行，请检查浏览器的 Worker / WASM 支持。'));
      this.timeout = setTimeout(() => {
        this.worker.terminate();
        finish(new Error('Code 引擎加载或解码超时，请关闭扫描后重试。'));
      }, 20000);
      this.worker.postMessage({ width: image.width, height: image.height, data: image.data,
        settings: { formats: [...settings.formats], mode: settings.mode, multiple: settings.multiple } }, [image.data.buffer]);
    });
  }

  stop() {
    this.worker.terminate();
    this.pending?.(new Error('扫描已停止'));
  }
}
