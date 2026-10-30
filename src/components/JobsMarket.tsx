import React, {useEffect, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {
  insightCategories,
  insightCities,
  insightDegBuckets,
  insightDomains,
  insightExpBuckets,
  insightSizeBuckets,
  insightTags,
  insightTotals,
  job51Monthly,
  trendSnapshots,
} from '@site/data/jobsInsights';
import {skillLinks} from '@site/data/skillLinks';
import {DIM, MIN_CELL_N, filterRows, groupByDim, statOf} from './jobsInsightsUtils';
import type {SalaryStat} from './jobsInsightsUtils';
import './jobsMarket.css';

/**
 * 岗位市场探索器：先给结论，再给对比图。
 * 一切结论都带参照（全国同职类 / 同城全行业），避免「16K」这种孤零零的数字。
 *
 * 数据能力边界（据 data/jobsInsights.ts）：
 * - 薪资 / 岗位数：支持 职类 × 城市 × 经验 × 学历 × 规模 × 行业 × 平台 全维度筛选
 * - 技能标签：只有「职类」一个维度（前程无忧/猎聘无技能字段），不随城市/经验变化
 * - 时间趋势：只有「职类」合并口径快照 + 前程无忧发布时间月度回填
 */

const PLATS: {key: string; label: string}[] = [
  {key: 'boss', label: 'BOSS 直聘'},
  {key: 'job51', label: '前程无忧'},
  {key: 'liepin', label: '猎聘'},
];

const EXP_ORDER = insightExpBuckets as readonly string[];
const DEG_ORDER = insightDegBuckets as readonly string[];
const CAT_ORDER = insightCategories as readonly string[];

/** 全池规模（模块级算一次） */
const ALL_ROWS = filterRows({});
const TOTAL_N = ALL_ROWS.length;
/** 真实城市数（「其他城市」是聚合桶，不计入） */
const CITY_N = new Set(ALL_ROWS.map(r => insightCities[r[DIM.city]] as string).filter(c => c !== '其他城市')).size;

type Filter = {
  cat?: string;
  city?: string;
  exp?: string;
  deg?: string;
  size?: string;
  dom?: string;
  plat?: string;
};

const EMPTY: Filter = {};

/** 横向箱线一行的百分比（相对于给定刻度上限） */
const pctOf = (v: number, max: number) => Math.max(0, Math.min(100, (v / max) * 100));

/* ================= 筛选条 ================= */

function ChipRow({
  label,
  options,
  value,
  counts,
  onPick,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  counts?: Map<string, number>;
  onPick: (v: string | undefined) => void;
}): ReactNode {
  return (
    <div className="jm-frow">
      <span className="jm-flabel">{label}</span>
      <div className="jm-chips">
        <button
          type="button"
          className={`jm-chip${value === undefined ? ' jm-chip-on' : ''}`}
          onClick={() => onPick(undefined)}>
          全部
        </button>
        {options.map(o => {
          const n = counts?.get(o);
          return (
            <button
              key={o}
              type="button"
              className={`jm-chip${value === o ? ' jm-chip-on' : ''}`}
              onClick={() => onPick(value === o ? undefined : o)}>
              {o}
              {n !== undefined && n > 0 && <span className="jm-chip-n">{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= 结论卡 ================= */

function AnswerCard({
  label,
  stat,
  catBase,
  cityBase,
  cat,
  city,
  hasNarrow,
  onClear,
}: {
  label: string;
  stat: SalaryStat | null;
  catBase: SalaryStat | null;
  cityBase: SalaryStat | null;
  cat: string | undefined;
  city: string | undefined;
  hasNarrow: boolean;
  onClear: () => void;
}): ReactNode {
  if (!stat) {
    return (
      <div className="jm-empty">
        <div>这个组合没有任何岗位样本。</div>
        <div style={{fontSize: 12.5, marginTop: 6}}>
          试试放宽一档：去掉「学历」「公司规模」限制，或者换成相邻职类。
        </div>
        <button type="button" onClick={onClear}>
          清除全部筛选
        </button>
      </div>
    );
  }
  const low = stat.n < MIN_CELL_N;
  const vsCat = cat && catBase && hasNarrow ? Math.round(stat.p50 - catBase.p50) : null;
  const vsCity = city && cityBase && hasNarrow ? Math.round(stat.p50 - cityBase.p50) : null;
  return (
    <div className="jm-answer">
      <p className="jm-sentence">
        <b>{label}</b> 共 <b>{stat.n}</b> 个在招岗位，中位月薪 <b>{stat.p50}K</b>，一半岗位落在{' '}
        <b>
          {stat.p25}–{stat.p75}K
        </b>{' '}
        之间。
      </p>
      <div className="jm-metrics">
        <div className="jm-metric">
          <div className="jm-metric-k">在招岗位</div>
          <div className="jm-metric-v">{stat.n}</div>
          <div className="jm-metric-s">份有效样本</div>
        </div>
        <div className="jm-metric">
          <div className="jm-metric-k">中位月薪</div>
          <div className="jm-metric-v">{stat.p50}K</div>
          <div className="jm-metric-s">全部岗位薪资中点值的中位数</div>
        </div>
        <div className="jm-metric">
          <div className="jm-metric-k">主流区间</div>
          <div className="jm-metric-v">
            {stat.p25}–{stat.p75}K
          </div>
          <div className="jm-metric-s">中间一半岗位的落点</div>
        </div>
      </div>
      {(vsCat !== null || vsCity !== null) && (
        <div className="jm-deltas">
          {vsCat !== null && (
            <span className={`jm-delta ${vsCat > 0 ? 'jm-up' : vsCat < 0 ? 'jm-down' : ''}`}>
              比全国「{cat}」{vsCat === 0 ? '持平' : <b>{vsCat > 0 ? `高 ${vsCat}K` : `低 ${-vsCat}K`}</b>}
            </span>
          )}
          {vsCity !== null && (
            <span className={`jm-delta ${vsCity > 0 ? 'jm-up' : vsCity < 0 ? 'jm-down' : ''}`}>
              比「{city}」全部职类{vsCity === 0 ? '持平' : <b>{vsCity > 0 ? `高 ${vsCity}K` : `低 ${-vsCity}K`}</b>}
            </span>
          )}
        </div>
      )}
      {low && (
        <div className="jm-warn">
          样本只有 {stat.n} 份（少于 {MIN_CELL_N} 份），数字会跳，只看趋势别看绝对值。
        </div>
      )}
    </div>
  );
}

/* ================= 视图 1：城市对比 ================= */

function CityCompare({
  rows,
  city,
  onPickCity,
}: {
  rows: number[][];
  city: string | undefined;
  onPickCity: (c: string | undefined) => void;
}): ReactNode {
  const [showWeak, setShowWeak] = useState(false);
  const groups = useMemo(
    () =>
      groupByDim(rows, DIM.city, insightCities)
        .filter(g => g.stat && g.label !== '其他城市')
        .sort((a, b) => b.stat!.p50 - a.stat!.p50),
    [rows],
  );
  const strong = groups.filter(g => g.n >= MIN_CELL_N);
  const weak = groups.filter(g => g.n < MIN_CELL_N);
  const list = showWeak ? [...strong, ...weak] : strong;

  if (strong.length === 0) {
    return (
      <div className="jm-empty">
        当前筛选下没有样本 ≥{MIN_CELL_N} 份的城市。
        {weak.length > 0 && <div style={{marginTop: 6}}>{weak.length} 个城市有零星样本，不足以下结论。</div>}
      </div>
    );
  }
  const max = Math.max(...list.map(g => g.stat!.p90), 10);
  const scale = Math.ceil(max / 5) * 5;

  return (
    <div>
      <div className="jm-axis">
        <span>0K</span>
        <span>{Math.round(scale / 2)}K</span>
        <span>{scale}K/月</span>
      </div>
      {list.map(g => {
        const s = g.stat!;
        const on = g.label === city;
        return (
          <div
            key={g.label}
            className={`jm-cityrow${on ? ' jm-cityrow-on' : ''}`}
            onClick={() => onPickCity(on ? undefined : g.label)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                onPickCity(on ? undefined : g.label);
              }
            }}>
            <span className="jm-cityname">{g.label}</span>
            <div className="jm-track" title={`P10–P90 ${s.range[0]}–${s.range[1]}K · P25–P75 ${s.p25}–${s.p75}K`}>
              <div
                className="jm-whisker"
                style={{left: `${pctOf(s.p10, scale)}%`, width: `${pctOf(s.p90, scale) - pctOf(s.p10, scale)}%`}}
              />
              <div
                className="jm-box"
                style={{left: `${pctOf(s.p25, scale)}%`, width: `${pctOf(s.p75, scale) - pctOf(s.p25, scale)}%`}}
              />
              <div className="jm-median" style={{left: `${pctOf(s.p50, scale)}%`}} />
            </div>
            <span className="jm-citymeta">
              <b>{s.p50}K</b> · n={g.n}
            </span>
          </div>
        );
      })}
      {weak.length > 0 && (
        <button type="button" className="jm-citymore" onClick={() => setShowWeak(v => !v)}>
          {showWeak ? '收起' : `更多城市（${weak.length} 个样本不足 ${MIN_CELL_N} 份）`}
        </button>
      )}
      <p className="jm-sec-sub" style={{marginTop: 14, marginBottom: 0}}>
        粗条 = 中间一半岗位的薪资范围（P25–P75），细条 = 整体 P10–P90，竖线 = 中位数。点任意城市可选中它。
      </p>
    </div>
  );
}

/* ================= 视图 2：薪资分布 ================= */

function SalaryHist({rows, stat}: {rows: number[][]; stat: SalaryStat | null}): ReactNode {
  const data = useMemo(() => {
    if (!stat || rows.length === 0) {
      return null;
    }
    const BUCKET = 5;
    const cap = Math.max(Math.ceil(stat.p90 / BUCKET) * BUCKET, 15);
    const counts = new Map<number, number>();
    for (let k = 0; k <= cap; k += BUCKET) {
      counts.set(k, 0);
    }
    for (const r of rows) {
      const mid = (r[DIM.lo] + r[DIM.hi]) / 2;
      const k = Math.min(Math.floor(mid / BUCKET) * BUCKET, cap);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const keys = [...counts.keys()].sort((a, b) => a - b);
    return {keys, counts, maxN: Math.max(...keys.map(k => counts.get(k) ?? 0), 1), BUCKET};
  }, [rows, stat]);

  if (!data || !stat) {
    return <div className="jm-empty">没有样本可绘制分布。</div>;
  }
  const {keys, counts, maxN, BUCKET} = data;
  return (
    <div>
      <div className="jm-hist">
        {keys.map(k => {
          const n = counts.get(k) ?? 0;
          const inRange = k >= stat.p25 && k <= stat.p75;
          return (
            <div
              key={k}
              className={`jm-hbar${inRange ? ' jm-hbar-on' : ''}`}
              style={{height: `${Math.max((n / maxN) * 100, n > 0 ? 2 : 0)}%`}}
              title={`${k}–${k + BUCKET}K：${n} 个岗位`}>
              {n > 0 && n / maxN > 0.06 && <span className="jm-hbar-n">{n}</span>}
            </div>
          );
        })}
      </div>
      <div className="jm-hlabels">
        {keys.map(k => (
          <span key={k} className="jm-hlabel">
            {k % 10 === 0 ? `${k}K` : ''}
          </span>
        ))}
      </div>
      <div className="jm-marks">
        <span className="jm-mark">
          最低 10% <b>{stat.p10}K</b>
        </span>
        <span className="jm-mark">
          中位 <b>{stat.p50}K</b>
        </span>
        <span className="jm-mark">
          最高 10% 起点 <b>{stat.p90}K</b>
        </span>
        <span className="jm-mark">每个柱子 = {BUCKET}K 一档，高亮段是主流区间</span>
      </div>
    </div>
  );
}

/* ================= 视图 3：经验阶梯 ================= */

function ExpLadder({rows, exp, onPickExp}: {rows: number[][]; exp: string | undefined; onPickExp: (v: string | undefined) => void}): ReactNode {
  const groups = useMemo(() => {
    const g = groupByDim(rows, DIM.exp, insightExpBuckets);
    return [...g].sort((a, b) => EXP_ORDER.indexOf(a.label) - EXP_ORDER.indexOf(b.label));
  }, [rows]);
  const valid = groups.filter(g => g.stat && g.n >= MIN_CELL_N);
  if (valid.length === 0) {
    return <div className="jm-empty">经验维度样本不足，暂时画不出阶梯。</div>;
  }
  const max = Math.max(...valid.map(g => g.stat!.p50), 5);
  const scale = Math.ceil(max / 5) * 5;
  return (
    <div>
      <div className="jm-ladder">
        {groups.map(g => {
          const ok = Boolean(g.stat) && g.n >= MIN_CELL_N;
          const on = g.label === exp;
          return (
            <div
              className="jm-lcol"
              key={g.label}
              onClick={() => onPickExp(on ? undefined : g.label)}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onPickExp(on ? undefined : g.label);
                }
              }}
              style={{cursor: 'pointer'}}>
              <span className="jm-lval" style={ok ? undefined : {color: 'var(--course-muted)', fontSize: 11.5}}>
                {ok ? `${g.stat!.p50}K` : '—'}
              </span>
              <div
                className={`jm-lbar${ok ? '' : ' jm-lbar-on'}`}
                style={{
                  height: ok ? `${(g.stat!.p50 / scale) * 78}%` : '3px',
                  opacity: on ? 1 : undefined,
                  background: on ? 'var(--course-accent)' : undefined,
                }}
              />
              <span className="jm-ln">{ok ? `n=${g.n}` : '积累中'}</span>
              <span className="jm-lname">{g.label}</span>
            </div>
          );
        })}
      </div>
      <p className="jm-sec-sub" style={{marginTop: 14, marginBottom: 0}}>
        柱高 = 该经验档的薪资中位数。点任意一档可把整页筛选切到该档，看它更细的城市与技能构成。
      </p>
    </div>
  );
}

/* ================= 技能（按职类） ================= */

function SkillBlock({cat}: {cat: string | undefined}): ReactNode {
  if (!cat) {
    return (
      <div className="jm-sec">
        <h3 className="jm-sec-h">这个方向要会什么</h3>
        <p className="jm-sec-sub">选一个职类，就能看到该职类岗位里出现最多的技能词。</p>
      </div>
    );
  }
  const tags = insightTags[cat] ?? [];
  if (tags.length === 0) {
    return (
      <div className="jm-sec">
        <h3 className="jm-sec-h">{cat} · 常见技能要求</h3>
        <p className="jm-sec-sub">该职类暂无技能标签样本。</p>
      </div>
    );
  }
  const max = tags[0].count;
  return (
    <div className="jm-sec">
      <h3 className="jm-sec-h">{cat} · 常见技能要求</h3>
      <p className="jm-sec-sub">
        字越大表示提到该技能的岗位越多。点击可跳到站内对应课程。
      </p>
      <div className="jm-skills">
        {tags.map(t => {
          const size = 12.5 + 5 * (t.count / max);
          const href = skillLinks[t.tag];
          const inner = (
            <>
              {t.tag}
              <span className="jm-skill-n">{t.count}</span>
            </>
          );
          return href ? (
            <Link key={t.tag} to={href} className="jm-skill" style={{fontSize: size}}>
              {inner}
            </Link>
          ) : (
            <span key={t.tag} className="jm-skill" style={{fontSize: size}}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ================= 趋势（按职类） ================= */

const DAY_MS = 86400000;

function TrendBlock({cat}: {cat: string | undefined}): ReactNode {
  if (!cat) {
    return null;
  }
  const snaps = trendSnapshots
    .map(s => ({date: s.date, stat: s.cats[cat] ?? null}))
    .filter((p): p is {date: string; stat: SalaryStat} => Boolean(p.stat) && p.stat.n > 0);
  const monthly = job51Monthly[cat] ?? [];
  if (snaps.length < 2 && monthly.length < 2) {
    return (
      <div className="jm-sec">
        <h3 className="jm-sec-h">{cat} · 薪资在涨还是在跌</h3>
        <p className="jm-sec-sub">
          还没有足够的时序样本。BOSS 直聘不提供发布时间，只能靠每次采集后的快照积累；前程无忧按发布时间逐月回填。
        </p>
      </div>
    );
  }
  const toT = (s: string) => new Date(`${s}T00:00:00`).getTime();
  const aPts = snaps
    .map(s => ({t: toT(s.date), v: s.stat.p50, k: `快照 ${s.date}`, n: s.stat.n}))
    .sort((a, b) => a.t - b.t);
  const bPts = monthly
    .map(m => ({t: toT(`${m.month}-01`), v: m.p50, k: `前程无忧 ${m.month}`, n: m.n}))
    .sort((a, b) => a.t - b.t);
  const pts = [...aPts, ...bPts].sort((a, b) => a.t - b.t);
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 14 * DAY_MS);
  const vs = pts.map(p => p.v);
  const minK = Math.floor(Math.min(...vs) / 5) * 5;
  const maxK = Math.max(Math.ceil(Math.max(...vs) / 5) * 5, minK + 5);
  const W = 640;
  const H = 190;
  const padL = 38;
  const padR = 12;
  const padT = 12;
  const padB = 26;
  const px = (t: number) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR);
  const py = (k: number) => padT + ((maxK - k) / (maxK - minK)) * (H - padT - padB);
  const aPath = aPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join(' ');
  const ticks: number[] = [];
  for (let k = minK; k <= maxK; k += 5) {
    ticks.push(k);
  }
  const ends = aPts.length >= 2 ? [aPts[0], aPts[aPts.length - 1]] : [];
  const delta = ends.length === 2 ? ends[1].v - ends[0].v : null;
  return (
    <div className="jm-sec">
      <h3 className="jm-sec-h">{cat} · 薪资在涨还是在跌</h3>
      {delta !== null && (
        <p className="jm-sec-sub">
          采集快照口径的中位数从 {ends[0].v}K 到 {ends[1].v}K，{delta === 0 ? '基本持平' : delta > 0 ? `上升 ${delta}K` : `下降 ${-delta}K`}
          。样本还在积累，短期波动不宜当结论。
        </p>
      )}
      <div className="jm-trend">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${cat} 薪资中位数时间趋势`}>
          {ticks.map(k => (
            <g key={k}>
              <line x1={padL} x2={W - padR} y1={py(k)} y2={py(k)} className="jm-grid" />
              <text x={padL - 6} y={py(k) + 3.5} textAnchor="end" className="jm-axis-t">
                {k}K
              </text>
            </g>
          ))}
          {aPts.length >= 2 && <path d={aPath} className="jm-line" />}
          {aPts.map(p => (
            <circle key={`a${p.k}`} cx={px(p.t)} cy={py(p.v)} r={3.5} className="jm-dot">
              <title>{`${p.k} · n=${p.n} · P50 ${p.v}K`}</title>
            </circle>
          ))}
          {bPts.map(p => (
            <circle key={`b${p.k}`} cx={px(p.t)} cy={py(p.v)} r={3} className="jm-dot-o">
              <title>{`${p.k} · n=${p.n} · P50 ${p.v}K`}</title>
            </circle>
          ))}
          {ends.length === 2 && (
            <>
              <text x={px(ends[0].t)} y={H - 8} textAnchor="start" className="jm-axis-t">
                {ends[0].k.replace('快照 ', '')}
              </text>
              <text x={px(ends[1].t)} y={H - 8} textAnchor="end" className="jm-axis-t">
                {ends[1].k.replace('快照 ', '')}
              </text>
            </>
          )}
        </svg>
      </div>
      <p className="jm-sec-sub" style={{marginBottom: 0}}>
        <span className="jm-legend-swatch jm-legend-a" /> 采集快照（每次采集存档，实线）&nbsp;&nbsp;
        <span className="jm-legend-swatch jm-legend-b" /> 前程无忧按发布时间月度回填（空心点，口径不同不连线）
      </p>
    </div>
  );
}

/* ================= 主体 ================= */

type ViewKey = 'city' | 'hist' | 'exp';

export function JobsMarket(): ReactNode {
  const [f, setF] = useState<Filter>({cat: 'AI 应用'});
  const [view, setView] = useState<ViewKey>('city');
  const [more, setMore] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // 从 URL 恢复筛选状态（分享 / 收藏 / 刷新保留）
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const next: Filter = {};
    const keys: (keyof Filter)[] = ['cat', 'city', 'exp', 'deg', 'size', 'dom', 'plat'];
    for (const k of keys) {
      const v = p.get(k);
      if (v) {
        next[k] = v;
      }
    }
    if (Object.keys(next).length > 0) {
      setF(next);
    }
    setHydrated(true);
  }, []);

  // 把筛选写回 URL（不产生历史记录）
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const p = new URLSearchParams();
    (Object.keys(f) as (keyof Filter)[]).forEach(k => {
      const v = f[k];
      if (v) {
        p.set(k, v);
      }
    });
    const q = p.toString();
    window.history.replaceState(null, '', q ? `${window.location.pathname}?${q}` : window.location.pathname);
  }, [f, hydrated]);

  const rows = useMemo(() => filterRows(f), [f]);
  const stat = useMemo(() => statOf(rows), [rows]);
  const catBase = useMemo(() => (f.cat ? statOf(filterRows({cat: f.cat})) : null), [f.cat]);
  const cityBase = useMemo(() => (f.city ? statOf(filterRows({city: f.city})) : null), [f.city]);

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of insightCategories) {
      m.set(c, insightTotals[c]?.merged?.n ?? 0);
    }
    return m;
  }, []);

  const cityCounts = useMemo(() => {
    const base = filterRows({cat: f.cat});
    const m = new Map<string, number>();
    for (const r of base) {
      const c = insightCities[r[DIM.city]];
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    return m;
  }, [f.cat]);

  const cityOptions = useMemo(() => {
    const all = (insightCities as readonly string[]).filter(c => c !== '其他城市' && (cityCounts.get(c) ?? 0) > 0);
    const strong = all.filter(c => (cityCounts.get(c) ?? 0) >= MIN_CELL_N).sort((a, b) => (cityCounts.get(b) ?? 0) - (cityCounts.get(a) ?? 0));
    const weak = all.filter(c => (cityCounts.get(c) ?? 0) < MIN_CELL_N).sort((a, b) => (cityCounts.get(b) ?? 0) - (cityCounts.get(a) ?? 0));
    return {strong, weak};
  }, [cityCounts]);

  const label = [f.cat ?? '全部职类', f.city, f.exp, f.deg].filter(Boolean).join(' · ');
  const activeCount = Object.values(f).filter(Boolean).length;
  const hasNarrow = (Object.keys(f) as (keyof Filter)[]).some(k => k !== 'cat' && Boolean(f[k]));

  const set = <K extends keyof Filter>(k: K, v: Filter[K]) => setF(prev => ({...prev, [k]: v}));
  const clearAll = () => setF(EMPTY);

  return (
    <div className="jm-root">
      <p className="jm-lede">
        下面的数字来自 BOSS 直聘、前程无忧、猎聘的公开岗位聚合，当前 {TOTAL_N} 份有效样本、{CITY_N} 个城市。
        选你打算投的方向和城市，再看薪资水平、城市对比和技能要求。
      </p>

      <div className="jm-filters">
        <ChipRow label="方向" options={CAT_ORDER} value={f.cat} counts={catCounts} onPick={v => set('cat', v)} />
        <div className="jm-frow">
          <span className="jm-flabel">城市</span>
          <select className="jm-select" value={f.city ?? ''} onChange={e => set('city', e.target.value || undefined)}>
            <option value="">全国</option>
            {cityOptions.strong.length > 0 && (
              <optgroup label="样本充足">
                {cityOptions.strong.map(c => (
                  <option key={c} value={c}>
                    {c}（{cityCounts.get(c)} 份）
                  </option>
                ))}
              </optgroup>
            )}
            {cityOptions.weak.length > 0 && (
              <optgroup label={`样本不足 ${MIN_CELL_N} 份`}>
                {cityOptions.weak.map(c => (
                  <option key={c} value={c}>
                    {c}（{cityCounts.get(c)} 份）
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button type="button" className="jm-more-toggle" onClick={() => setMore(v => !v)}>
            {more ? '收起更多条件' : '学历 / 规模 / 行业 / 平台 ▾'}
          </button>
          {activeCount > 0 && (
            <button type="button" className="jm-reset" onClick={clearAll}>
              清除筛选（{activeCount}）
            </button>
          )}
        </div>
        {more && (
          <>
            <ChipRow label="经验" options={EXP_ORDER} value={f.exp} onPick={v => set('exp', v)} />
            <ChipRow label="学历" options={DEG_ORDER} value={f.deg} onPick={v => set('deg', v)} />
            <ChipRow label="规模" options={insightSizeBuckets} value={f.size} onPick={v => set('size', v)} />
            <ChipRow label="行业" options={insightDomains} value={f.dom} onPick={v => set('dom', v)} />
            <div className="jm-frow">
              <span className="jm-flabel">平台</span>
              <div className="jm-chips">
                <button
                  type="button"
                  className={`jm-chip${f.plat === undefined ? ' jm-chip-on' : ''}`}
                  onClick={() => set('plat', undefined)}>
                  三平台合计
                </button>
                {PLATS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    className={`jm-chip${f.plat === p.key ? ' jm-chip-on' : ''}`}
                    onClick={() => set('plat', p.key)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <AnswerCard
        label={label}
        stat={stat}
        catBase={catBase}
        cityBase={cityBase}
        cat={f.cat}
        city={f.city}
        hasNarrow={hasNarrow}
        onClear={clearAll}
      />

      {stat && (
        <>
          <div className="jm-tabs" role="tablist">
            {(
              [
                ['city', '城市对比'],
                ['hist', '薪资分布'],
                ['exp', '经验阶梯'],
              ] as [ViewKey, string][]
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={view === k}
                className={`jm-tab${view === k ? ' jm-tab-on' : ''}`}
                onClick={() => setView(k)}>
                {t}
              </button>
            ))}
          </div>
          {view === 'city' && <CityCompare rows={rows} city={f.city} onPickCity={c => set('city', c)} />}
          {view === 'hist' && <SalaryHist rows={rows} stat={stat} />}
          {view === 'exp' && <ExpLadder rows={rows} exp={f.exp} onPickExp={v => set('exp', v)} />}
        </>
      )}

      <SkillBlock cat={f.cat} />
      <TrendBlock cat={f.cat} />

      <details className="jm-note">
        <summary>数据说明与口径</summary>
        <p>
          <b>样本范围</b>：BOSS 直聘、前程无忧、猎聘三平台的公开岗位，已剔除已失效、代招、实习，以及硬件、销售、现场运维、培训、数据标注等非本路线岗位。
          「在招岗位」指当前池中的有效样本数，不等于全市场岗位总量。
        </p>
        <p>
          <b>薪资口径</b>：每个岗位取招聘方给出的月薪区间中点，再对中点值求 P10/P25/P50/P75/P90。所以「中位数」是「岗位薪资中点的中位数」，不是从业者实际收入中位数。
        </p>
        <p>
          <b>城市覆盖</b>：BOSS 直聘按 50 城轮换采集，已完成 11 个城市；前程无忧为 10 城口径；猎聘随 BOSS 批次同城对齐。所以某些城市只有单一平台数据，跨城比较时注意样本量。
        </p>
        <p>
          <b>技能标签</b>只来自 BOSS 直聘的结构化字段（前程无忧和猎聘没有该字段），且只能按职类统计，不随城市、经验筛选变化。
        </p>
        <p>
          <b>时间趋势</b>：BOSS 直聘不提供发布时间，只能靠每次采集后的快照逐批积累；前程无忧按发布时间逐月回填。历史快照无法补采，所以趋势线会随采集推进慢慢变长。
        </p>
        <p>
          单个格子样本少于 {MIN_CELL_N} 份时不给结论，只做展示——样本太少时中位数会随机跳动。
        </p>
      </details>
    </div>
  );
}
