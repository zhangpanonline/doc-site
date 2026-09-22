/**
 * Pyodide 宿主 Worker（模块 Worker，纯 JS 不进 webpack——Docusaurus 的
 * runtimeChunk 配置会让 webpack 产出的 worker 入口缺失 __webpack_require__）。
 * 由 src/components/CodeRunner/engines/pyodide.ts 以
 * `new Worker('/js/pyodide-worker.js', {type: 'module'})` 加载。
 * 职责：多源探测、下载 Pyodide、stdout/stderr 捕获、每块独立命名空间、
 *       input() 替换为清晰报错。硬中断 = 主线程 terminate() 本 Worker。
 */

// cdn 与 fastly 两个 jsdelivr 域名互为冗余（国内镜像普遍封 .zip，不可用）
const CDN_BASES = [
  'https://cdn.jsdelivr.net/pyodide/v0.29.4/full/',
  'https://fastly.jsdelivr.net/pyodide/v0.29.4/full/',
];

// input() 替换：浏览器内没有交互输入，给清晰提示而不是晦涩的 OSError
const PRELUDE = `
import builtins
def _cr_input(prompt=""):
    if prompt: print(prompt, end="")
    raise RuntimeError("浏览器内不支持 input()：请把输入直接写成变量后重新运行")
builtins.input = _cr_input
`;

let boot = null;
const namespaces = new Map();
/** 当前运行的消息通道：stdout/stderr 归属正在执行的这一次运行（boot 只发生一次） */
let currentChannel = null;

async function probe() {
  for (const base of CDN_BASES) {
    try {
      const r = await fetch(base + 'pyodide.js', {method: 'HEAD', signal: AbortSignal.timeout(8000)});
      if (r.ok) return base;
    } catch {
      // 试下一个源
    }
  }
  throw new Error('Python 运行时代理不可达（已尝试 jsdelivr 两个源）。请检查网络后重试。');
}

function bootPyodide(post) {
  if (boot) return boot;
  boot = (async () => {
    post({type: 'status', message: '正在探测运行时代理…'});
    const base = await probe();
    post({type: 'status', message: '正在下载 Python 运行时（约 10MB，仅首次）…'});
    // 运行时从 CDN 动态导入（jsdelivr 带 CORS，模块 Worker 内可用）
    const mod = await import(`${base}pyodide.mjs`);
    const py = await mod.loadPyodide({indexURL: base});
    // stdout/stderr 走 currentChannel 动态路由：setStdout 只在 boot 设置一次，
    // 若闭包捕获某次运行的 id，后续运行的输出会全部串台/丢失
    py.setStdout({batched: (s) => {
      if (currentChannel) currentChannel.post({type: 'stdout', text: s});
    }});
    py.setStderr({batched: (s) => {
      if (currentChannel) currentChannel.post({type: 'stderr', text: s});
    }});
    await py.runPythonAsync(PRELUDE);
    post({type: 'status', message: '解释器就绪'});
    return py;
  })();
  boot.catch(() => {
    boot = null; // 失败允许重试
  });
  return boot;
}

async function doRun(id, code, sessionKey) {
  const post = (event) => self.postMessage({id, event});
  currentChannel = {post};
  const t0 = Date.now();
  try {
    const py = await bootPyodide(post);
    let g = namespaces.get(sessionKey || '');
    if (!g) {
      g = py.globals.get('dict')();
      g.set('__name__', '__main__');
      namespaces.set(sessionKey || '', g);
    }
    await py.runPythonAsync(code, {globals: g});
    post({type: 'done', ms: Date.now() - t0});
  } catch (e) {
    post({type: 'error', text: e instanceof Error ? e.message : String(e)});
  } finally {
    currentChannel = null;
  }
}

// Worker 内串行：Pyodide 不可重入，消息并发会让解释器状态互相踩踏
let runChain = Promise.resolve();

self.onmessage = (ev) => {
  const {id, type, code, sessionKey} = ev.data || {};

  if (type === 'resetAll') {
    namespaces.clear();
    return;
  }
  if (type === 'reset') {
    namespaces.delete(sessionKey || '');
    return;
  }
  if (type === 'run' && typeof code === 'string') {
    runChain = runChain.then(() => doRun(id, code, sessionKey)).catch(() => {});
  }
};
