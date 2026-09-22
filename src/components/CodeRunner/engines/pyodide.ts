/**
 * Pyodide 引擎（Worker 客户端）：run() 期间挂 15s 定时器，超时 terminate() 硬中断
 * Worker——下一次运行自动重建（HTTP 缓存命中，秒级）。这是主线程方案做不到的：
 * `while True: pass` 在主线程会卡死整页。
 * 定时器在每次收到 worker 事件时重置：首次运行的 10MB 下载不计入执行超时，
 * 只约束"解释器就绪后仍无进展"的代码执行。
 */

import type {RunEvent, RunnerEngine} from '../runner';

export const PYODIDE_RUN_TIMEOUT_MS = 15000;

type Pending = {resolve: () => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>};

let worker: Worker | null = null;
let msgId = 0;
let current: Pending | null = null;
let currentEventSink: ((e: RunEvent) => void) | null = null;
let armTimer: (() => void) | null = null;

function ensureWorker(): Worker {
  if (!worker) {
    // 模块 Worker 指向 static/js/pyodide-worker.js（纯 JS，不进 webpack：
    // Docusaurus 的 runtimeChunk 会让 webpack 打包的 worker 缺 __webpack_require__）
    worker = new Worker('/js/pyodide-worker.js', {type: 'module'});
    worker.onmessage = (ev: MessageEvent) => {
      const {id, event} = ev.data as {id: number; event: RunEvent};
      if (!current || id !== msgId) return;
      if (event.type === 'done') {
        clearTimeout(current.timer);
        const c = current;
        current = null;
        c.resolve();
      } else if (event.type === 'error') {
        clearTimeout(current.timer);
        const c = current;
        current = null;
        c.reject(new Error(event.text));
      } else {
        // 解释器仍有进展（含首次下载期间的状态消息）→ 重置执行超时
        armTimer?.();
        currentEventSink?.(event);
      }
    };
    worker.onerror = (e: ErrorEvent) => {
      // Worker 崩溃（脚本加载失败/OOM）：当作运行错误处理
      if (current) {
        clearTimeout(current.timer);
        const c = current;
        current = null;
        c.reject(new Error(`Python 运行时异常退出：${e.message || '未知错误'}（可重试）`));
      }
    };
  }
  return worker;
}

export const pyodideEngine: RunnerEngine = {
  id: 'pyodide',

  async warmup(onEvent) {
    // 冷启动不做任何事：真正加载发生在首次 run（避免每块预热都等 10MB）
    void onEvent;
  },

  run(code, opts, onEvent) {
    currentEventSink = onEvent;
    return new Promise<void>((resolve, reject) => {
      const w = ensureWorker();
      msgId += 1;
      const runId = msgId;
      armTimer = () => {
        if (!current || runId !== msgId) return;
        clearTimeout(current.timer);
        current.timer = setTimeout(() => {
          // 真·硬中断：terminate Worker，页面永不卡死
          w.terminate();
          worker = null;
          current = null;
          currentEventSink = null;
          armTimer = null;
          reject(new Error('__TIMEOUT__'));
        }, PYODIDE_RUN_TIMEOUT_MS);
      };
      current = {resolve, reject, timer: setTimeout(() => {}, 0)};
      armTimer();
      onEvent({type: 'status', message: '运行中…'});
      w.postMessage({id: runId, type: 'run', code, sessionKey: opts.sessionKey});
    });
  },

  resetSession() {
    if (worker) {
      worker.postMessage({type: 'resetAll'});
    }
  },

  interrupt() {
    if (!worker) return false;
    worker.terminate();
    worker = null;
    current = null;
    currentEventSink = null;
    armTimer = null;
    return true;
  },
};
