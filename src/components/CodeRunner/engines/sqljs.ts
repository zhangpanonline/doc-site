/**
 * sql.js 引擎（SQLite WASM）：页面级共享内存库——DDL 建表后同页 DML/SELECT
 * 直接可用（数据库课程的教学结构就是 DDL→DML→查询）。
 * 课程是 PostgreSQL 语法：SERIAL/DATABASE 等 SQLite 不支持的构造做兼容改写，
 * 每次改写都在输出面板明示，绝不静默。
 */

import type {RunEvent, RunnerEngine} from '../runner';

const SQLJS_VERSION = '1.13.0';
const CDN_BASES = [
  `https://cdn.jsdelivr.net/npm/sql.js@${SQLJS_VERSION}/dist/`,
  `https://registry.npmmirror.com/sql.js/${SQLJS_VERSION}/files/dist/`,
];

interface SqlJsApi {
  Database: new () => {
    exec: (sql: string) => {columns: string[]; values: (string | number | null)[][]}[];
    prepare: (sql: string) => {getColumnNames: () => string[]; free: () => void};
    close: () => void;
  };
}
declare const initSqlJs: (opts: {locateFile: (f: string) => string}) => Promise<SqlJsApi>;

function injectScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`加载失败：${src}（网络不通或被浏览器拦截）`));
    document.head.appendChild(s);
  });
}

let apiPromise: Promise<SqlJsApi> | null = null;
async function getApi(): Promise<SqlJsApi> {
  if (!apiPromise) {
    apiPromise = (async () => {
      let lastErr: unknown;
      for (const base of CDN_BASES) {
        try {
          await injectScript(`${base}sql-wasm.js`);
          return initSqlJs({locateFile: (f) => `${base}${f}`});
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
    })();
    apiPromise.catch(() => {
      apiPromise = null;
    });
  }
  return apiPromise;
}

/** 页面级共享内存库（路由切换由 runner.ensureFreshPage 重置） */
let db: InstanceType<SqlJsApi['Database']> | null = null;

/** 表行数上限（超出截断显示） */
const MAX_ROWS = 200;

/**
 * PostgreSQL → SQLite 兼容改写：只处理确定性的构造，返回 {sql, notes}。
 * 不做高风险改写（:: 转换、generate_series 等），那些块如实报错。
 */
function toSqlite(sql: string): {sql: string; notes: string[]} {
  const notes: string[] = [];
  let out = sql
    .replace(/\bBIGSERIAL\b/g, () => {
      notes.push('BIGSERIAL → INTEGER');
      return 'INTEGER';
    })
    .replace(/\bSERIAL\b/g, () => {
      notes.push('SERIAL → INTEGER');
      return 'INTEGER';
    })
    .replace(/\bNOW\(\)/g, () => {
      notes.push('NOW() → CURRENT_TIMESTAMP');
      return 'CURRENT_TIMESTAMP';
    });

  // 整句剔除 SQLite 不支持的语句（按分号切分）
  const kept = out
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      if (!s) return false;
      if (/^(CREATE|DROP)\s+DATABASE\b/i.test(s)) {
        notes.push(`${s.split(/\s+/).slice(0, 2).join(' ')} 语句已跳过（SQLite 无多库概念）`);
        return false;
      }
      if (/^ALTER\s+TABLE[\s\S]*ALTER\s+COLUMN\b/i.test(s)) {
        notes.push('ALTER COLUMN 语句已跳过（SQLite 不支持该写法）');
        return false;
      }
      if (/ADD\s+CONSTRAINT\b/i.test(s)) {
        notes.push('ADD CONSTRAINT 语句已跳过（SQLite 不支持该写法）');
        return false;
      }
      return true;
    });
  return {sql: kept.join(';\n'), notes};
}

export const sqlJsEngine: RunnerEngine = {
  id: 'sqljs',

  async warmup(onEvent) {
    onEvent({type: 'status', message: '正在加载 SQL 环境…'});
    await getApi();
    if (!db) {
      const SQL = await getApi();
      db = new SQL.Database();
    }
  },

  async run(code, _opts, onEvent) {
    const SQL = await getApi();
    if (!db) db = new SQL.Database();
    const {sql, notes} = toSqlite(code);
    if (notes.length > 0) {
      onEvent({type: 'notice', text: `已按 SQLite 兼容模式改写 ${notes.length} 处（${notes.slice(0, 3).join('、')}${notes.length > 3 ? ' 等' : ''}）`});
    }
    const t0 = Date.now();
    let results: {columns: string[]; values: (string | number | null)[][]}[];
    try {
      results = db.exec(sql);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
    if (results.length === 0) {
      if (/^\s*SELECT\b/i.test(sql)) {
        // sql.js 对"空表 SELECT"返回 []（连列名都不给）——prepare 补列名，渲染空表格
        const stmt = db.prepare(sql);
        try {
          onEvent({type: 'table', columns: stmt.getColumnNames(), rows: []});
        } finally {
          stmt.free();
        }
      } else {
        onEvent({type: 'notice', text: '语句已执行（无结果集输出）'});
      }
    }
    for (const r of results) {
      const truncated = r.values.length > MAX_ROWS;
      onEvent({
        type: 'table',
        columns: r.columns,
        rows: truncated ? r.values.slice(0, MAX_ROWS) : r.values,
        truncated,
      });
    }
    onEvent({type: 'done', ms: Date.now() - t0});
  },

  resetSession() {
    try {
      db?.close();
    } catch {
      // 已关闭
    }
    db = null;
  },

  interrupt() {
    return false; // sql.js 语句通常瞬时执行，无需中断
  },
};
