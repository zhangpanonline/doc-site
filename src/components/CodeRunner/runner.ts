/**
 * 运行引擎编排：引擎单例、全站串行队列（Pyodide/sql.js 均不可重入）、
 * SPA 路由切换时重置会话（SQL 内存库、Python 命名空间）。
 * 加一门语言 = 在 engines/ 加一个实现并在此注册，组件零改动。
 */

export type EngineId = 'pyodide' | 'sqljs';

export type RunEvent =
  | {type: 'status'; message: string}
  | {type: 'stdout'; text: string}
  | {type: 'stderr'; text: string}
  | {type: 'error'; text: string}
  | {type: 'table'; columns: string[]; rows: (string | number | null)[][]; truncated?: boolean}
  | {type: 'notice'; text: string}
  | {type: 'done'; ms: number};

export interface RunOptions {
  /** 同一块多次运行共享状态（Python 命名空间）；SQL 为页面级共享库 */
  sessionKey: string;
}

export interface RunnerEngine {
  readonly id: EngineId;
  warmup(onEvent: (e: RunEvent) => void): Promise<void>;
  run(code: string, opts: RunOptions, onEvent: (e: RunEvent) => void): Promise<void>;
  /** 页面级会话重置（路由切换时调用） */
  resetSession(): void;
  /** 硬中断（Python 引擎 = terminate Worker）；不支持时返回 false */
  interrupt(): boolean;
}

const engines = new Map<EngineId, Promise<RunnerEngine>>();

async function loadEngine(id: EngineId): Promise<RunnerEngine> {
  if (id === 'pyodide') {
    const {pyodideEngine} = await import('./engines/pyodide');
    return pyodideEngine;
  }
  const {sqlJsEngine} = await import('./engines/sqljs');
  return sqlJsEngine;
}

export function getEngine(id: EngineId): Promise<RunnerEngine> {
  let p = engines.get(id);
  if (!p) {
    p = loadEngine(id);
    engines.set(id, p);
  }
  return p;
}

/** 引擎级串行：同一时刻全站只跑一个任务；失败不断链 */
let chain: Promise<unknown> = Promise.resolve();

export function runCode(
  engineId: EngineId,
  code: string,
  opts: RunOptions,
  onEvent: (e: RunEvent) => void,
): Promise<void> {
  const task = chain.then(async () => {
    const eng = await getEngine(engineId);
    await eng.warmup(onEvent);
    await eng.run(code, opts, onEvent);
  });
  chain = task.catch(() => {});
  return task;
}

/** SPA 路由切换：清空 SQL 内存库 / Python 命名空间（新页面新会话） */
let lastPath = typeof window !== 'undefined' ? window.location.pathname : '';
export function ensureFreshPage(): void {
  const now = window.location.pathname;
  if (now === lastPath) return;
  lastPath = now;
  for (const id of ['pyodide', 'sqljs'] as EngineId[]) {
    const p = engines.get(id);
    void p?.then((eng) => eng.resetSession());
  }
}
