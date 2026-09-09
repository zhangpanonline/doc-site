import React, {useCallback, useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import './status.css';

/**
 * /status 站点访问统计页。
 * 数据来自 GET /api/status（Vercel 函数 → Supabase visit_stats() 一次 RPC）。
 * 埋点由 src/theme/Root.tsx 的 VisitTracker 完成，本页自身也会被统计。
 * 设置了 STATUS_TOKEN 环境变量时，首次访问需要输入口令（存 localStorage）。
 */

type DailyPoint = {date: string; count: number};
type Country = {country: string; count: number; regions: {region: string; count: number}[]};
type IpRow = {
  ip: string;
  count: number;
  first: string;
  last: string;
  last7: number;
  country: string | null;
  region: string | null;
  city: string | null;
};
type PathRow = {path: string; count: number};
type Stats = {
  total: number;
  unique_ips: number;
  today: number;
  daily: DailyPoint[];
  countries: Country[];
  ips: IpRow[];
  paths: PathRow[];
  updated_at: string;
};

const TOKEN_KEY = 'status-token';
const REFRESH_MS = 60_000;

function fmt(n: number): string {
  return n.toLocaleString('zh-CN');
}

/** '2026-09-09' → '9/9'（字符串切分，避免 Date 时区偏移） */
function fmtDay(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
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
  const delta = today - yesterday;

  const tiles: {label: string; value: string; delta?: {text: string; up: boolean}}[] = [
    {label: '总访问量', value: fmt(stats.total)},
    {label: '独立 IP', value: fmt(stats.unique_ips)},
    {
      label: '今日访问',
      value: fmt(stats.today),
      delta: delta === 0 ? undefined : {text: `${delta > 0 ? '+' : ''}${fmt(delta)} 较昨日`, up: delta > 0},
    },
    {label: '国家 / 地区', value: fmt(stats.countries.length)},
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

/** 国家/地区分布：横向条形图，值直接标注在条形末端；地区细分常显前 3 个 */
function Countries({countries}: {countries: Country[]}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...countries.map(c => c.count));

  return (
    <section className="card">
      <h2>国家 / 地区分布</h2>
      {countries.length === 0 ? (
        <p className="empty">暂无数据</p>
      ) : (
        <ul className="country-list">
          {countries.map((c, i) => {
            const topRegions = c.regions.slice(0, 3);
            const rest = c.regions.length - topRegions.length;
            return (
              <li
                key={c.country}
                className="country-row"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}>
                <span className="country-name" title={c.country}>
                  {c.country}
                  <span className="country-regions">
                    {c.regions.length === 0
                      ? '未知地区'
                      : `${topRegions.map(r => `${r.region} ${fmt(r.count)}`).join(' · ')}${rest > 0 ? ` · +${rest} 地区` : ''}`}
                  </span>
                </span>
                <span className="country-track">
                  <span className="country-bar" style={{width: `${(c.count / max) * 100}%`}} />
                </span>
                <span className="country-value">{fmt(c.count)}</span>
                {hover === i && (
                  <div className="country-tooltip" role="status">
                    <strong>
                      {fmt(c.count)} 次 · {c.country}
                    </strong>
                    {c.regions.map(r => (
                      <span key={r.region}>
                        {r.region} — {fmt(r.count)} 次
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
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

function IpTable({ips}: {ips: IpRow[]}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? ips : ips.slice(0, 20);

  return (
    <section className="card">
      <div className="card-head">
        <h2>IP 明细</h2>
        <span className="card-note">按访问次数排序 · 频率 = 总次数 ÷ 首次至最近的天数</span>
      </div>
      {ips.length === 0 ? (
        <p className="empty">暂无数据</p>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>IP</th>
                  <th>地区</th>
                  <th className="num">次数</th>
                  <th className="num">近 7 天</th>
                  <th className="num">频率（次/天）</th>
                  <th className="num">首次访问</th>
                  <th className="num">最近访问</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const geo = [r.country, r.region, r.city].filter(Boolean).join(' / ') || '未知';
                  const days = Math.max(1, Math.floor((Date.parse(r.last) - Date.parse(r.first)) / 86_400_000));
                  const freq = r.count / days;
                  return (
                    <tr key={r.ip}>
                      <td className="mono">{r.ip}</td>
                      <td>{geo}</td>
                      <td className="num">{fmt(r.count)}</td>
                      <td className="num">{fmt(r.last7)}</td>
                      <td className="num">{freq.toFixed(1)}</td>
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
              <Countries countries={stats.countries} />
              <Paths paths={stats.paths} />
            </div>
            <IpTable ips={stats.ips} />
          </div>
        )}
      </main>
    </Layout>
  );
}
