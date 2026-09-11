import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Layout from '@theme/Layout';
import './status.css';

/**
 * /status 站点访问统计页。
 * 数据来自 GET /api/status（Vercel 函数 → Supabase visit_stats() 一次 RPC）。
 * 埋点由 src/theme/Root.tsx 的 VisitTracker 完成，本页自身也会被统计。
 * 设置了 STATUS_TOKEN 环境变量时，首次访问需要输入口令（存 localStorage）。
 */

type DailyPoint = {date: string; count: number};
type Region = {region: string; count: number};
type IpRow = {
  ip: string;
  count: number;
  first: string;
  last: string;
  last7: number;
  region: string | null;
  city: string | null;
  browser: string;
  app: string;
  os: string;
};
type PathRow = {path: string; count: number};
type Stats = {
  total: number;
  unique_ips: number;
  today: number;
  new_ips_today?: number;
  new_regions_today?: number;
  daily: DailyPoint[];
  regions?: Region[];
  /** 旧版 SQL（003 之前）的兼容字段，regions 缺失时兜底 */
  countries?: {country: string; count: number; regions: {region: string; count: number}[]}[];
  ips: IpRow[];
  paths: PathRow[];
  updated_at: string;
};

const TOKEN_KEY = 'status-token';
const REFRESH_MS = 60_000;

type WhoAmI = {
  ip: string;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string;
  app: string;
  os: string;
  history: {count: number; last7: number; first: string; last: string} | null;
};

function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

/**
 * '2026-09-09' 或 PostgREST 序列化的 '2026-09-09T00:00:00+00:00' → '9/9'
 * （取前 10 位字符串切分，避免 Date 时区偏移）
 */
function fmtDay(isoDate: string): string {
  const [, m, d] = isoDate.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)}`;
}

function fmtClock(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const date = `${d.getMonth() + 1}/${d.getDate()}`;
  const time = d.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});
  return d.getFullYear() === now.getFullYear() ? `${date} ${time}` : `${d.getFullYear()}/${date} ${time}`;
}

function fmtClockWithSec(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/** 向上取整到 1/2/2.5/5×10^k 的"整洁"数 */
function niceCeil(v: number): number {
  if (v <= 1) {
    return 1;
  }
  const m = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * m >= v) {
      return f * m;
    }
  }
  return 10 * m;
}

function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });

  const load = useCallback(async () => {
    setStale(true);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch('/api/status', {headers});
      if (res.status === 401) {
        setError('unauthorized');
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as Stats;
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStale(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        load();
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return {stats, stale, error, token, setToken, load};
}

function Kpi({stats}: {stats: Stats}) {
  const daily = stats.daily;
  const today = daily.length > 0 ? daily[daily.length - 1].count : 0;
  const yesterday = daily.length > 1 ? daily[daily.length - 2].count : 0;
  const deltaVisits = today - yesterday;
  const regionCount = stats.regions?.length ?? 0;

  // 累计类指标（总访问量/独立 IP/地区数）的「较昨日」= 今日新增（累计量只能涨）
  const tiles: {label: string; value: string; delta?: {text: string; up: boolean}}[] = [
    {
      label: '总访问量',
      value: fmt(stats.total),
      delta: today > 0 ? {text: `+${fmt(today)} 较昨日`, up: true} : undefined,
    },
    {
      label: '独立 IP',
      value: fmt(stats.unique_ips),
      delta:
        stats.new_ips_today != null && stats.new_ips_today > 0
          ? {text: `+${fmt(stats.new_ips_today)} 较昨日`, up: true}
          : undefined,
    },
    {
      label: '今日访问',
      value: fmt(stats.today),
      delta:
        deltaVisits === 0
          ? undefined
          : {text: `${deltaVisits > 0 ? '+' : ''}${fmt(deltaVisits)} 较昨日`, up: deltaVisits > 0},
    },
    {
      label: '地区数',
      value: fmt(regionCount),
      delta:
        stats.new_regions_today != null && stats.new_regions_today > 0
          ? {text: `+${fmt(stats.new_regions_today)} 较昨日`, up: true}
          : undefined,
    },
  ];

  return (
    <section className="kpi-row" aria-label="关键指标">
      {tiles.map(t => (
        <div className="kpi" key={t.label}>
          <span className="kpi-label">{t.label}</span>
          <span className="kpi-value">{t.value}</span>
          {t.delta && <span className={`kpi-delta ${t.delta.up ? 'up' : 'down'}`}>{t.delta.text}</span>}
        </div>
      ))}
    </section>
  );
}

/** 近 30 天访问趋势：单序列折线 + 十字准星 tooltip（悬停/键盘焦点均可） */
function TrendChart({daily}: {daily: DailyPoint[]}) {
  const [hover, setHover] = useState<number | null>(null);

  if (daily.length === 0) {
    return (
      <section className="card">
        <h2>近 30 天访问趋势</h2>
        <p className="empty">暂无数据</p>
      </section>
    );
  }

  const W = 760;
  const H = 240;
  const padL = 44;
  const padR = 56;
  const padT = 18;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const n = daily.length;

  const maxV = Math.max(1, ...daily.map(d => d.count));
  const niceMax = niceCeil(maxV);
  const step = plotW / Math.max(1, n - 1);
  const x = (i: number) => padL + (n === 1 ? plotW / 2 : step * i);
  const y = (v: number) => padT + plotH - (plotH * v) / niceMax;

  const linePath = daily
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.count).toFixed(1)}`)
    .join(' ');
  const baseline = padT + plotH;
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${baseline} L${x(0).toFixed(1)},${baseline} Z`;

  const tickStep = niceCeil(niceMax / 4);
  const ticks: number[] = [];
  for (let v = tickStep; v < niceMax; v += tickStep) {
    ticks.push(v);
  }

  const last = daily[n - 1];

  return (
    <section className="card">
      <h2>近 30 天访问趋势</h2>
      <div className="trend-wrap">
        <div className="trend-box">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`近 30 天访问趋势，最高 ${fmt(niceMax)} 次`}
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width) * W;
              const idx = Math.max(0, Math.min(n - 1, Math.round((px - padL) / step)));
              setHover(idx);
            }}
            onMouseLeave={() => setHover(null)}>
            {/* 网格线：一步离表面的灰色，1px 实线 */}
            {ticks.map(v => (
              <line key={v} x1={padL} y1={y(v)} x2={padL + plotW} y2={y(v)} stroke="var(--gridline)" strokeWidth="1" />
            ))}
            {/* 基线 */}
            <line x1={padL} y1={baseline} x2={padL + plotW} y2={baseline} stroke="var(--baseline)" strokeWidth="1" />
            {/* Y 轴刻度 */}
            {ticks.map(v => (
              <text
                key={v}
                x={padL - 8}
                y={y(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-muted)">
                {fmt(v)}
              </text>
            ))}
            {/* X 轴刻度：每 5 天一个 */}
            {daily.map((d, i) => {
              const labeled = i % 5 === 0 && (i < n - 3 || i === n - 1);
              return labeled ? (
                <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                  {fmtDay(d.date)}
                </text>
              ) : null;
            })}
            {/* 面积水洗：序列色 10% 不透明度 */}
            <path d={areaPath} fill="var(--series-1)" opacity="0.1" />
            {/* 折线：2px 圆头 */}
            <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* 端点：≥8px 标记 + 2px 表面色环 */}
            <circle cx={x(n - 1)} cy={y(last.count)} r="4.5" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
            {/* 端点值标签（唯一直接标注） */}
            <text
              x={x(n - 1) + 10}
              y={y(last.count) + 4}
              fontSize="12"
              fill="var(--text-secondary)"
              style={{fontVariantNumeric: 'tabular-nums'}}>
              {fmt(last.count)}
            </text>
            {/* 十字准星 + 悬停点 */}
            {hover !== null && (
              <g>
                <line x1={x(hover)} y1={padT} x2={x(hover)} y2={baseline} stroke="var(--text-muted)" strokeWidth="1" />
                <circle
                  cx={x(hover)}
                  cy={y(daily[hover].count)}
                  r="4.5"
                  fill="var(--series-1)"
                  stroke="var(--surface-1)"
                  strokeWidth="2"
                />
              </g>
            )}
            {/* 键盘可达的悬停热区（每列一个，带 aria-label） */}
            {daily.map((d, i) => (
              <rect
                key={d.date}
                x={x(i) - step / 2}
                y={padT}
                width={step}
                height={plotH}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${fmtDay(d.date)}：${fmt(d.count)} 次`}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            ))}
          </svg>
          {hover !== null && (
            <div
              className="trend-tooltip"
              role="status"
              style={{
                left: `${Math.min(94, Math.max(6, (x(hover) / W) * 100))}%`,
                top: `${(y(daily[hover].count) / H) * 100}%`,
              }}>
              <strong>{fmt(daily[hover].count)} 次</strong>
              <span>{fmtDay(daily[hover].date)}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** 地区分布：横向条形图，只按地区统计（不区分国家） */
function Regions({regions}: {regions: Region[]}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...regions.map(r => r.count));

  return (
    <section className="card">
      <h2>地区分布</h2>
      {regions.length === 0 ? (
        <p className="empty">暂无数据</p>
      ) : (
        <ul className="country-list">
          {regions.map((r, i) => (
            <li
              key={r.region}
              className="country-row"
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}>
              <span className="country-name" title={r.region}>
                {r.region}
              </span>
              <span className="country-track">
                <span className="country-bar" style={{width: `${(r.count / max) * 100}%`}} />
              </span>
              <span className="country-value">{fmt(r.count)}</span>
              {hover === i && (
                <div className="country-tooltip" role="status">
                  <strong>
                    {fmt(r.count)} 次 · {r.region}
                  </strong>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Paths({paths}: {paths: PathRow[]}) {
  return (
    <section className="card">
      <h2>访问路径 Top {paths.length}</h2>
      {paths.length === 0 ? (
        <p className="empty">暂无数据</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>路径</th>
                <th className="num">次数</th>
              </tr>
            </thead>
            <tbody>
              {paths.map(p => (
                <tr key={p.path}>
                  <td className="path-cell">
                    <a href={p.path}>{p.path}</a>
                  </td>
                  <td className="num">{fmt(p.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

type SortKey = 'ip' | 'geo' | 'browser' | 'app' | 'os' | 'count' | 'last7' | 'freq' | 'first' | 'last';

/** 表头排序图标：上下两个小三角，激活方向高亮 */
function SortIcon({dir}: {dir: 1 | -1 | 0}) {
  return (
    <svg className="sort-icon" viewBox="0 0 10 14" aria-hidden="true">
      <path d="M5 1 L9 6 H1 Z" fill={dir === 1 ? 'var(--series-1)' : 'var(--text-muted)'} />
      <path d="M5 13 L1 8 H9 Z" fill={dir === -1 ? 'var(--series-1)' : 'var(--text-muted)'} />
    </svg>
  );
}

function IpTable({ips}: {ips: IpRow[]}) {
  const [showAll, setShowAll] = useState(false);
  // 默认按最近访问降序（最新在最前）
  const [sort, setSort] = useState<{key: SortKey; dir: 1 | -1}>({key: 'last', dir: -1});

  const freqOf = (r: IpRow) =>
    r.count / Math.max(1, Math.floor((Date.parse(r.last) - Date.parse(r.first)) / 86_400_000));

  const sorted = useMemo(() => {
    const val = (r: IpRow, k: SortKey): string | number => {
      switch (k) {
        case 'ip':
          return r.ip;
        case 'geo':
          return [r.region, r.city].filter(Boolean).join(' / ') || '未知';
        case 'browser':
          return r.browser;
        case 'app':
          return r.app;
        case 'os':
          return r.os;
        case 'count':
          return r.count;
        case 'last7':
          return r.last7;
        case 'freq':
          return freqOf(r);
        case 'first':
          return Date.parse(r.first);
        case 'last':
          return Date.parse(r.last);
      }
    };
    return [...ips].sort((a, b) => {
      const va = val(a, sort.key);
      const vb = val(b, sort.key);
      const cmp =
        typeof va === 'string' && typeof vb === 'string' ? va.localeCompare(vb, 'zh-CN') : (va as number) - (vb as number);
      return cmp * sort.dir;
    });
  }, [ips, sort]);

  const toggle = (key: SortKey) => {
    setSort(s =>
      s.key === key
        ? {key, dir: s.dir === 1 ? -1 : 1}
        : {key, dir: key === 'count' || key === 'last7' || key === 'freq' || key === 'last' ? -1 : 1},
    );
  };

  const Th = ({k, label, align}: {k: SortKey; label: string; align?: 'num'}) => {
    const active = sort.key === k;
    return (
      <th className={align} aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="th-btn" onClick={() => toggle(k)}>
          {label}
          <SortIcon dir={active ? sort.dir : 0} />
        </button>
      </th>
    );
  };

  const visible = showAll ? sorted : sorted.slice(0, 20);

  return (
    <section className="card">
      <div className="card-head">
        <h2>IP 明细</h2>
        <span className="card-note">点击表头排序 · 频率 = 总次数 ÷ 首次至最近的天数</span>
      </div>
      {ips.length === 0 ? (
        <p className="empty">暂无数据</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <Th k="ip" label="IP" />
                  <Th k="geo" label="地区" />
                  <Th k="browser" label="浏览器" />
                  <Th k="app" label="应用" />
                  <Th k="os" label="系统" />
                  <Th k="count" label="次数" align="num" />
                  <Th k="last7" label="近 7 天" align="num" />
                  <Th k="freq" label="频率（次/天）" align="num" />
                  <Th k="first" label="首次访问" align="num" />
                  <Th k="last" label="最近访问" align="num" />
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const geo = [r.region, r.city].filter(Boolean).join(' / ') || '未知';
                  return (
                    <tr key={r.ip}>
                      <td className="mono">{r.ip}</td>
                      <td>{geo}</td>
                      <td>{r.browser}</td>
                      <td>{r.app}</td>
                      <td>{r.os}</td>
                      <td className="num">{fmt(r.count)}</td>
                      <td className="num">{fmt(r.last7)}</td>
                      <td className="num">{r.count <= 1 ? '—' : freqOf(r).toFixed(1)}</td>
                      <td className="num">{fmtClock(r.first)}</td>
                      <td className="num">{fmtClock(r.last)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ips.length > 20 && (
            <button type="button" className="more" onClick={() => setShowAll(v => !v)}>
              {showAll ? '收起' : `显示全部 ${ips.length} 条`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

export default function StatusPage(): React.JSX.Element {
  const {stats, stale, error, token, setToken, load} = useStats();
  const [tokenInput, setTokenInput] = useState('');
  const [whoami, setWhoami] = useState<WhoAmI | null>(null);

  useEffect(() => {
    fetch('/api/whoami')
      .then(res => (res.ok ? res.json() : null))
      .then((d: WhoAmI | null) => {
        if (d) {
          setWhoami(d);
        }
      })
      .catch(() => {
        // 自述接口不可用时静默隐藏卡片
      });
  }, []);

  const saveToken = () => {
    try {
      localStorage.setItem(TOKEN_KEY, tokenInput);
    } catch {
      // localStorage 不可用时仅本次会话生效
    }
    setToken(tokenInput);
  };

  return (
    <Layout title="访问统计" description="站点访问统计：IP、地区、访问次数与频率">
      <main className="viz-root status-page">
        <header className="status-header">
          <div>
            <h1>网站访问统计</h1>
            <p className="status-updated">
              更新于 {stats ? fmtClockWithSec(stats.updated_at) : '—'} · 每 60 秒自动刷新
            </p>
          </div>
          <button type="button" className="status-refresh" onClick={load}>
            刷新
          </button>
        </header>

        {whoami && (
          <section className="card">
            <div className="card-head">
              <h2>当前访客（你）</h2>
              <span className="card-note">本页访问不计入统计</span>
            </div>
            <div className="whoami-grid">
              <span className="whoami-item">
                <label>IP</label>
                <b className="mono">{whoami.ip || '未知'}</b>
              </span>
              <span className="whoami-item">
                <label>地区</label>
                <b>{[whoami.region, whoami.city].filter(Boolean).join(' / ') || '未知'}</b>
              </span>
              <span className="whoami-item">
                <label>浏览器</label>
                <b>{whoami.browser}</b>
              </span>
              <span className="whoami-item">
                <label>应用</label>
                <b>{whoami.app}</b>
              </span>
              <span className="whoami-item">
                <label>系统</label>
                <b>{whoami.os}</b>
              </span>
              {whoami.history ? (
                <span className="whoami-item">
                  <label>历史访问</label>
                  <b>
                    {fmt(whoami.history.count)} 次 · 近 7 天 {fmt(whoami.history.last7)} 次 · 首次{' '}
                    {fmtClock(whoami.history.first)} · 最近 {fmtClock(whoami.history.last)}
                  </b>
                </span>
              ) : (
                <span className="whoami-item">
                  <label>历史访问</label>
                  <b>暂无记录</b>
                </span>
              )}
            </div>
          </section>
        )}

        {error === 'unauthorized' && (
          <section className="card token-card">
            <p>此页面受口令保护（STATUS_TOKEN）。请输入访问口令：</p>
            <div className="token-row">
              <input
                type="password"
                value={tokenInput}
                placeholder="访问口令"
                onChange={e => setTokenInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    saveToken();
                  }
                }}
              />
              <button type="button" onClick={saveToken}>
                进入
              </button>
            </div>
          </section>
        )}

        {!stats ? (
          error && error !== 'unauthorized' ? (
            <section className="card">
              <h2>加载失败</h2>
              <p className="empty">无法读取统计数据（{error}）。请确认 Supabase 表已建好、环境变量已配置。</p>
              <button type="button" className="more" onClick={load}>
                重试
              </button>
            </section>
          ) : (
            error !== 'unauthorized' && <p className="empty">加载中…</p>
          )
        ) : (
          <div className={stale ? 'status-body stale' : 'status-body'}>
            {error && error !== 'unauthorized' && (
              <div className="status-banner">
                <span>自动刷新失败：{error}（显示的是最近一次成功的数据）</span>
                <button type="button" className="status-refresh" onClick={load}>
                  重试
                </button>
              </div>
            )}
            <Kpi stats={stats} />
            <TrendChart daily={stats.daily} />
            <div className="status-grid">
              <Regions
                regions={
                  stats.regions ?? (stats.countries ?? []).flatMap(c => c.regions ?? []) /* 旧版 SQL 兜底 */
                }
              />
              <Paths paths={stats.paths} />
            </div>
            <IpTable ips={stats.ips} />
          </div>
        )}
      </main>
    </Layout>
  );
}
