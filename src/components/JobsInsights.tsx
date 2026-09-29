import React, {Fragment, useMemo, useState} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {jobs} from '@site/data/jobs';
import {
  insightCategories,
  insightCities,
  insightExpBuckets,
  insightDegBuckets,
  insightDomains,
  insightTags,
  insightTotals,
  job51Monthly,
  trendSnapshots,
  unitCategories,
} from '@site/data/jobsInsights';
import {skillLinks} from '@site/data/skillLinks';
import {
  DIM,
  MIN_CELL_N,
  filterRows,
  groupByDim,
  mergedCityStats,
  cityStatsOf,
  statOf,
} from './jobsInsightsUtils';
import type {CubeCityStat, RowFilter, SalaryStat} from './jobsInsightsUtils';

/** 全池样本总量（模块级计算一次） */
const TOTAL_ROWS = filterRows({}).length;

/** 平台展示名（筛选与图例共用） */
const PLAT_LABELS: Record<string, string> = {
  boss: 'BOSS 直聘',
  job51: '前程无忧',
  liepin: '猎聘',
};

/* ===== 公共小件 ===== */

/** 职类选择器（带合并样本数） */
function CatSelector({value, onChange}: {value: string; onChange: (c: string) => void}): ReactNode {
  return (
    <div className="js-tabs" role="tablist" aria-label="职类">
      {insightCategories.map(c => {
        const n = insightTotals[c].merged?.n ?? 0;
        return (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === value}
            className={`js-tab${c === value ? ' js-tab-active' : ''}`}
            onClick={() => onChange(c)}>
            {c}
            <span className="js-tab-n">{n}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 样本不足徽标 */
function CellBadge({n}: {n: number}): ReactNode {
  return n >= MIN_CELL_N ? null : <span className="ji-badge">样本积累中</span>;
}

/* ===== 核心图 1：城市薪资总览（横条箱线：范围须 + 箱体 P25–P75 + 中位数） ===== */

function CityBar({
  city,
  stat,
  scaleMax,
}: {
  city: string;
  stat: CubeCityStat | undefined;
  scaleMax: number;
}): ReactNode {
  const x = (v: number) => (v / scaleMax) * 100;
  if (!stat) {
    return (
      <div className="ji-city-item">
        <span className="ji-city-name">{city}</span>
        <div className="ji-city-track">
          <div className="ji-bar-empty">待采集</div>
        </div>
        <span className="ji-city-meta">—</span>
      </div>
    );
  }
  if (stat.n < MIN_CELL_N) {
    return (
      <div className="ji-city-item">
        <span className="ji-city-name">{city}</span>
        <div className="ji-city-track">
          <div className="ji-bar-empty">样本 {stat.n} 份 · 积累中</div>
        </div>
        <span className="ji-city-meta">—</span>
      </div>
    );
  }
  const left = x(stat.range[0]);
  const width = x(stat.range[1]) - left;
  const bodyLeft = width > 0 ? ((stat.p25 - stat.range[0]) / (stat.range[1] - stat.range[0])) * 100 : 0;
  const bodyWidth = width > 0 ? ((stat.p75 - stat.p25) / (stat.range[1] - stat.range[0])) * 100 : 0;
  const medLeft = width > 0 ? ((stat.p50 - stat.range[0]) / (stat.range[1] - stat.range[0])) * 100 : 0;
  return (
    <div className="ji-city-item">
      <span className="ji-city-name">{city}</span>
      <div className="ji-city-track">
        <div className="ji-bar" style={{left: `${left}%`, width: `${width}%`}}>
          <div className="ji-bar-body" style={{left: `${bodyLeft}%`, width: `${bodyWidth}%`}} />
          <div className="ji-bar-median" style={{left: `${medLeft}%`}} />
          <span className="ji-tip">
            {city} · 样本 {stat.n} 份
            <br />
            中点分布 P10/P25/P50/P75/P90：{stat.p10}/{stat.p25}/{stat.p50}/{stat.p75}/{stat.p90}K
            <br />
            区间口径 {stat.range[0]}–{stat.range[1]}K/月
          </span>
        </div>
      </div>
      <span className="ji-city-meta">
        P50 {stat.p50}K · n={stat.n}
      </span>
    </div>
  );
}

function CityOverview({cat}: {cat: string}): ReactNode {
  const merged = mergedCityStats(cat);
  const boss = cityStatsOf(cat, 'boss');
  const j51 = cityStatsOf(cat, 'job51');
  const lp = cityStatsOf(cat, 'liepin');
  if (merged.length === 0) {
    return <p className="js-note-plain">该职类暂无城市样本（BOSS 逐城采集推进中，前程无忧为 10 城口径，猎聘随批次对齐采集）。</p>;
  }
  const scaleMax = Math.max(Math.ceil(Math.max(...merged.map(c => c.p90)) / 5) * 5, 5);
  const bossMap = new Map(boss.map(s => [s.city, s]));
  const j51Map = new Map(j51.map(s => [s.city, s]));
  const lpMap = new Map(lp.map(s => [s.city, s]));
  const cities = merged.map(c => c.city);
  const rows: {label: string; map: Map<string, CubeCityStat>}[] = [
    {label: 'BOSS 直聘', map: bossMap},
    {label: '前程无忧', map: j51Map},
    {label: '猎聘', map: lpMap},
  ];
  return (
    <div className="ji-citychart">
      <div className="ji-city-scale">横轴 0–{scaleMax}K/月（城市按合并口径 P50 降序）</div>
      {rows.map(r => (
        <div className="ji-city-row" key={r.label}>
          <span className="ji-city-label">{r.label}</span>
          <div className="ji-city-items">
            {cities.map(city => (
              <Fragment key={city}>
                <CityBar city={city} stat={r.map.get(city)} scaleMax={scaleMax} />
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== 核心图 2：经验分层（柱高 = P50，标注 n） ===== */

/** 按分桶自然顺序排序（groupByDim 默认按 n 降序） */
const orderOf = (labels: readonly string[], l: string) => (labels as readonly string[]).indexOf(l);

function ExpLayers({cat}: {cat: string}): ReactNode {
  const groups = groupByDim(filterRows({cat}), DIM.exp, insightExpBuckets).sort(
    (a, b) => orderOf(insightExpBuckets, a.label) - orderOf(insightExpBuckets, b.label),
  );
  const maxP50 = Math.max(...groups.map(g => g.stat?.p50 ?? 0), 1);
  const scaleMax = Math.max(Math.ceil(maxP50 / 5) * 5, 5);
  return (
    <div className="ji-vchart">
      {groups.map(g => {
        const s = g.stat;
        const ok = Boolean(s) && g.n >= MIN_CELL_N;
        return (
          <div className="ji-vcol" key={g.label}>
            {ok ? (
              <>
                <span className="ji-vval">P50 {s!.p50}K</span>
                <div className="ji-vbar" style={{height: `${(s!.p50 / scaleMax) * 100}%`}} />
                <span className="ji-vn">n={g.n}</span>
              </>
            ) : (
              <>
                <span className="ji-vval ji-vval-muted">{s ? `n=${g.n}` : '—'}</span>
                <div className="ji-vbar ji-vbar-muted" style={{height: '3px'}} />
                <span className="ji-vn">样本积累中</span>
              </>
            )}
            <span className="ji-vname">{g.label}</span>
          </div>
        );
      })}
      <span className="ji-vscale">纵轴 0–{scaleMax}K/月</span>
    </div>
  );
}

/* ===== 核心图 3：时间趋势（快照序列 + 51job 发布时间月度回填） ===== */

const DAY_MS = 86400000;

function TrendChart({cat}: {cat: string}): ReactNode {
  const snaps = trendSnapshots
    .map(s => ({date: s.date, stat: s.cats[cat] ?? null}))
    .filter((p): p is {date: string; stat: SalaryStat} => Boolean(p.stat) && p.stat.n > 0);
  const monthly = job51Monthly[cat] ?? [];
  if (snaps.length === 0 && monthly.length === 0) {
    return (
      <p className="js-note-plain">
        该职类暂无趋势样本。趋势自 2026-09-28 起随每批采集存档（BOSS 无发布时间字段，只能靠快照积累）；前程无忧按「发布时间」逐月回填。
      </p>
    );
  }
  const toT = (s: string) => new Date(`${s}T00:00:00`).getTime();
  const aPts = snaps.map(s => ({t: toT(s.date), date: s.date, stat: s.stat}));
  const bPts = monthly.map(m => ({t: toT(`${m.month}-01`), m}));
  const ts = [...aPts.map(p => p.t), ...bPts.map(p => p.t)];
  let t0 = Math.min(...ts);
  let t1 = Math.max(...ts);
  if (t1 - t0 < 14 * DAY_MS) {
    t1 = t0 + 14 * DAY_MS;
  }
  const p50s = [...aPts.map(p => p.stat.p50), ...bPts.map(p => p.m.p50)];
  const minK = Math.floor(Math.min(...p50s) / 5) * 5;
  const maxK = Math.ceil(Math.max(...p50s) / 5) * 5;
  const spanK = Math.max(maxK - minK, 5);

  const W = 640;
  const H = 200;
  const padL = 34;
  const padR = 10;
  const padT = 8;
  const padB = 24;
  const px = (t: number) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR);
  const py = (k: number) => padT + ((maxK - k) / spanK) * (H - padT - padB);

  // 纵轴刻度（步长 5K 或 10K）
  const step = spanK <= 20 ? 5 : 10;
  const yTicks: number[] = [];
  for (let k = minK; k <= maxK; k += step) {
    yTicks.push(k);
  }
  // 横轴月份刻度
  const xTicks: {t: number; label: string}[] = [];
  const first = new Date(t0);
  const cur = new Date(first.getFullYear(), first.getMonth(), 1);
  while (cur.getTime() <= t1) {
    xTicks.push({
      t: cur.getTime(),
      label: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  const bPath = bPts
    .slice()
    .sort((x, y) => x.t - y.t)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t)},${py(p.m.p50)}`)
    .join(' ');
  const aPath = aPts
    .slice()
    .sort((x, y) => x.t - y.t)
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t)},${py(p.stat.p50)}`)
    .join(' ');

  return (
    <div className="ji-trend">
      <div className="ji-legend">
        <span className="ji-legend-item">
          <span className="ji-swatch ji-swatch-a" />
          合并口径快照（每批采集后存档）
        </span>
        <span className="ji-legend-item">
          <span className="ji-swatch ji-swatch-b" />
          前程无忧 · 发布时间回填（月）
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${cat} 薪资中位数时间趋势`}
        className="ji-trend-svg">
        {yTicks.map(k => (
          <g key={k}>
            <line x1={padL} x2={W - padR} y1={py(k)} y2={py(k)} className="ji-grid" />
            <text x={padL - 6} y={py(k) + 3.5} textAnchor="end" className="ji-axis">
              {k}K
            </text>
          </g>
        ))}
        {xTicks.map(t => (
          <text key={t.t} x={px(t.t)} y={H - 6} textAnchor="middle" className="ji-axis">
            {t.label}
          </text>
        ))}
        {bPath && (
          <path d={bPath} fill="none" className="ji-line-b" strokeDasharray="5 4" />
        )}
        {aPath && <path d={aPath} fill="none" className="ji-line-a" />}
        {bPts
          .slice()
          .sort((x, y) => x.t - y.t)
          .map(p => (
            <g key={p.m.month}>
              <rect
                x={px(p.t) - 3.5}
                y={py(p.m.p50) - 3.5}
                width={7}
                height={7}
                className={p.m.n >= MIN_CELL_N ? 'ji-pt-b' : 'ji-pt-b ji-pt-dim'}>
                <title>{`${p.m.month} · 前程无忧 n=${p.m.n} · P50 ${p.m.p50}K · 区间 ${p.m.range[0]}–${p.m.range[1]}K`}</title>
              </rect>
            </g>
          ))}
        {aPts
          .slice()
          .sort((x, y) => x.t - y.t)
          .map(p => (
            <g key={p.date}>
              <circle cx={px(p.t)} cy={py(p.stat.p50)} r={4} className="ji-pt-a">
                <title>{`快照 ${p.date} · 合并口径 n=${p.stat.n} · P50 ${p.stat.p50}K · 区间 ${p.stat.range[0]}–${p.stat.range[1]}K`}</title>
              </circle>
              <text x={px(p.t) + 8} y={py(p.stat.p50) - 7} className="ji-pt-label">
                {`${p.date.slice(5)} · P50 ${p.stat.p50}K`}
              </text>
            </g>
          ))}
      </svg>
    </div>
  );
}

/* ===== 核心图 4：技能热度（BOSS 标签词频，字号 ∝ 词频） ===== */

function SkillHeat({cat}: {cat: string}): ReactNode {
  const tags = insightTags[cat] ?? [];
  if (tags.length === 0) {
    return <p className="js-note-plain">该职类暂无 BOSS 技能标签样本（前程无忧无技能字段）。</p>;
  }
  const max = tags[0].count;
  return (
    <div className="ji-heat">
      {tags.map(t => {
        const size = 12 + 8 * (t.count / max);
        const href = skillLinks[t.tag] ?? null;
        const inner = (
          <>
            {t.tag}
            <span className="ji-heat-n">{t.count}</span>
          </>
        );
        return href ? (
          <Link key={t.tag} to={href} className="ji-heat-tag" style={{fontSize: size}}>
            {inner}
          </Link>
        ) : (
          <span key={t.tag} className="ji-heat-tag ji-heat-plain" style={{fontSize: size}}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/* ===== 课程对照参考（课程视角已降级） ===== */

function CourseRef(): ReactNode {
  return (
    <div className="ji-course-ref">
      <h3 className="js-sec-title">课程对照参考</h3>
      <p className="js-note-plain">
        市场数据以职类为主轴，课程单元已降级为参考视角。学习路线岗位要求与递进规则见各单元页：
      </p>
      <table className="ji-ref-table">
        <tbody>
          {Object.entries(unitCategories).map(([unit, cats]) => (
            <tr key={unit}>
              <td>
                <Link to={`/jobs/${unit}`}>
                  {jobs[unit]?.emoji ?? ''} {jobs[unit]?.title ?? unit}
                </Link>
              </td>
              <td>{cats.join(' · ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ===== 自由筛选探索器 ===== */

function ChipFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}): ReactNode {
  return (
    <div className="ji-filter">
      <span className="ji-filter-label">{label}</span>
      <div className="ji-filter-chips">
        <button
          type="button"
          className={`ji-fchip${value === undefined ? ' ji-fchip-active' : ''}`}
          onClick={() => onChange(undefined)}>
          全部
        </button>
        {options.map(o => (
          <button
            key={o}
            type="button"
            className={`ji-fchip${value === o ? ' ji-fchip-active' : ''}`}
            onClick={() => onChange(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function DistList({
  groups,
  maxN,
}: {
  groups: {label: string; n: number; stat: SalaryStat | null}[];
  maxN: number;
}): ReactNode {
  return (
    <div className="ji-dist">
      {groups.map(g => (
        <div className="ji-dist-row" key={g.label}>
          <span className="ji-dist-label">{g.label}</span>
          <div className="ji-dist-track">
            <div className="ji-dist-bar" style={{width: `${(g.n / maxN) * 100}%`}} />
          </div>
          <span className="ji-dist-meta">
            n={g.n}
            {g.stat ? ` · P50 ${g.stat.p50}K` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function Explorer(): ReactNode {
  const [cat, setCat] = useState<string | undefined>(undefined);
  const [city, setCity] = useState<string | undefined>(undefined);
  const [exp, setExp] = useState<string | undefined>(undefined);
  const [deg, setDeg] = useState<string | undefined>(undefined);
  const [dom, setDom] = useState<string | undefined>(undefined);
  const [plat, setPlat] = useState<string | undefined>(undefined);
  const f: RowFilter = {cat, city, exp, deg, dom, plat};
  const rows = useMemo(() => filterRows(f), [cat, city, exp, deg, dom, plat]);
  const stat = statOf(rows);
  const low = stat !== null && stat.n < MIN_CELL_N;

  const cityDist = groupByDim(rows, DIM.city, insightCities).slice(0, 10);
  const expDist = groupByDim(rows, DIM.exp, insightExpBuckets).sort(
    (a, b) => orderOf(insightExpBuckets, a.label) - orderOf(insightExpBuckets, b.label),
  );
  const degDist = groupByDim(rows, DIM.deg, insightDegBuckets).sort(
    (a, b) => orderOf(insightDegBuckets, a.label) - orderOf(insightDegBuckets, b.label),
  );
  const domDist = groupByDim(rows, DIM.dom, insightDomains).sort(
    (a, b) => orderOf(insightDomains, a.label) - orderOf(insightDomains, b.label),
  );
  const maxCityN = Math.max(...cityDist.map(g => g.n), 1);
  const maxExpN = Math.max(...expDist.map(g => g.n), 1);
  const maxDegN = Math.max(...degDist.map(g => g.n), 1);
  const maxDomN = Math.max(...domDist.map(g => g.n), 1);

  return (
    <div>
      <div className="ji-filters">
        <ChipFilter label="职类" options={insightCategories} value={cat} onChange={setCat} />
        <div className="ji-filter">
          <span className="ji-filter-label">城市</span>
          <select
            className="ji-select"
            value={city ?? ''}
            onChange={e => setCity(e.target.value || undefined)}>
            <option value="">全部</option>
            {insightCities.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <ChipFilter label="经验" options={insightExpBuckets} value={exp} onChange={setExp} />
        <ChipFilter label="学历" options={insightDegBuckets} value={deg} onChange={setDeg} />
        <ChipFilter label="行业" options={insightDomains} value={dom} onChange={setDom} />
        <ChipFilter
          label="平台"
          options={['BOSS 直聘', '前程无忧', '猎聘']}
          value={plat ? PLAT_LABELS[plat] : undefined}
          onChange={v => setPlat(v ? (v === 'BOSS 直聘' ? 'boss' : v === '前程无忧' ? 'job51' : 'liepin') : undefined)}
        />
      </div>

      <div className="ji-tiles">
        <div className={`ji-tile${low ? ' ji-tile-warn' : ''}`}>
          <div className="ji-tile-label">样本数</div>
          <div className="ji-tile-value">{stat ? `${stat.n} 份` : '0 份'}</div>
          <div className="ji-tile-sub">{low ? 'n<20 · 仅作参考' : '两平台合计'}</div>
        </div>
        <div className={`ji-tile${low ? ' ji-tile-warn' : ''}`}>
          <div className="ji-tile-label">薪资中位数</div>
          <div className="ji-tile-value">{stat ? `${stat.p50}K` : '—'}</div>
          <div className="ji-tile-sub">中点值 P50 · K/月</div>
        </div>
        <div className={`ji-tile${low ? ' ji-tile-warn' : ''}`}>
          <div className="ji-tile-label">主流区间</div>
          <div className="ji-tile-value">{stat ? `${stat.p25}–${stat.p75}K` : '—'}</div>
          <div className="ji-tile-sub">中点分布 P25–P75</div>
        </div>
        <div className={`ji-tile${low ? ' ji-tile-warn' : ''}`}>
          <div className="ji-tile-label">波动区间</div>
          <div className="ji-tile-value">{stat ? `${stat.range[0]}–${stat.range[1]}K` : '—'}</div>
          <div className="ji-tile-sub">低值 P10–高值 P90</div>
        </div>
      </div>

      {low && <CellBadge n={stat?.n ?? 0} />}

      <div className="ji-dist-grid">
        <div>
          <h4 className="ji-dist-title">城市分布（Top 10）</h4>
          <DistList groups={cityDist} maxN={maxCityN} />
        </div>
        <div>
          <h4 className="ji-dist-title">经验分布</h4>
          <DistList groups={expDist} maxN={maxExpN} />
        </div>
        <div>
          <h4 className="ji-dist-title">学历分布</h4>
          <DistList groups={degDist} maxN={maxDegN} />
        </div>
        <div>
          <h4 className="ji-dist-title">行业分布</h4>
          <DistList groups={domDist} maxN={maxDomN} />
        </div>
      </div>
    </div>
  );
}

/* ===== 页面主体 ===== */

export function JobsInsights(): ReactNode {
  const [cat, setCat] = useState('AI 应用');
  const lastSnap = trendSnapshots[trendSnapshots.length - 1]?.date;
  return (
    <div className="ji-root">
      <h2 className="js-title">📈 多维市场情报</h2>
      <p className="js-sub">
        按职类 / 城市 / 经验 / 学历 / 行业切分岗位市场。当前池 {TOTAL_ROWS} 份样本（BOSS 直聘 + 前程无忧 + 猎聘）· 趋势快照自{' '}
        {lastSnap ?? '—'} 起存档 · 单格样本不足 {MIN_CELL_N} 份显示「样本积累中」。
      </p>

      <CatSelector value={cat} onChange={setCat} />

      <h3 className="js-sec-title">城市薪资总览 · {cat}</h3>
      <CityOverview cat={cat} />

      <h3 className="js-sec-title">经验分层 · {cat}</h3>
      <ExpLayers cat={cat} />

      <h3 className="js-sec-title">时间趋势 · {cat}（P50 中位数）</h3>
      <TrendChart cat={cat} />

      <h3 className="js-sec-title">技能热度 · {cat}（BOSS 标签真实词频）</h3>
      <SkillHeat cat={cat} />

      <CourseRef />

      <h3 className="js-sec-title">自由筛选探索器</h3>
      <p className="js-sub">筛选条件即时联动：样本、薪资分布与各维度构成随筛选刷新。</p>
      <Explorer />

      <p className="js-note-plain">
        口径说明：薪资区间为样本 P10–P90、中位数为各岗位薪资中点值的中位数；已过滤已失效 / 代招 / 实习及非本路线岗位（硬件、销售、
        现场运维、培训、数据标注等）。BOSS 直聘为逐城轮换口径（49 城，已完成北京 / 上海 / 广州），前程无忧为 10 城口径，
        猎聘与 BOSS 批次同城对齐（当前广州）；城市轴覆盖 49 城清单，未采集城市显示「待采集」。职类与行业由人工规则表归并
        （随采集迭代），课程单元与职类对照见上表。趋势数据自 2026-09-28 起每批存档，错过不可补；前程无忧侧按发布时间逐月回填。
      </p>
    </div>
  );
}
