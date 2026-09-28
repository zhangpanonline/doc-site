/**
 * 多维市场情报前端聚合工具：对 data/jobsInsights.ts 的匿名行做自由筛选与统计。
 * 百分位算法与 Python 侧（agg_jobs.pct / aggregate_cube）线性插值完全一致。
 */
import {
  insightCategories,
  insightCities,
  insightExpBuckets,
  insightDegBuckets,
  insightSizeBuckets,
  insightDomains,
  insightPlatforms,
  insightRows,
} from '@site/data/jobsInsights';
import type {SalaryStat} from '@site/data/jobsInsights';

export type {SalaryStat};

/** 每格样本不足该数量时 UI 显示「样本积累中」（口径约定，与旧统计视图一致） */
export const MIN_CELL_N = 20;

/** 行维度索引：与 aggregate_cube.py 生成器注释一致：[职类, 城市, 经验, 学历, 规模, 领域, 平台, 低值, 高值] */
export const DIM = {cat: 0, city: 1, exp: 2, deg: 3, size: 4, dom: 5, plat: 6, lo: 7, hi: 8} as const;
const I = DIM;

export type RowFilter = Partial<{
  cat: string;
  city: string;
  exp: string;
  deg: string;
  size: string;
  dom: string;
  plat: string;
}>;

export function filterRows(f: RowFilter): number[][] {
  return insightRows.filter(
    r =>
      (f.cat === undefined || insightCategories[r[I.cat]] === f.cat) &&
      (f.city === undefined || insightCities[r[I.city]] === f.city) &&
      (f.exp === undefined || insightExpBuckets[r[I.exp]] === f.exp) &&
      (f.deg === undefined || insightDegBuckets[r[I.deg]] === f.deg) &&
      (f.size === undefined || insightSizeBuckets[r[I.size]] === f.size) &&
      (f.dom === undefined || insightDomains[r[I.dom]] === f.dom) &&
      (f.plat === undefined || insightPlatforms[r[I.plat]] === f.plat),
  );
}

/** 线性插值百分位（与 Python pct 一致） */
export function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return NaN;
  }
  if (sorted.length === 1) {
    return sorted[0];
  }
  const k = (sorted.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (k - lo);
}

export function statOf(rows: number[][]): SalaryStat | null {
  if (rows.length === 0) {
    return null;
  }
  const mids = rows.map(r => (r[I.lo] + r[I.hi]) / 2).sort((a, b) => a - b);
  const lows = rows.map(r => r[I.lo]).sort((a, b) => a - b);
  const highs = rows.map(r => r[I.hi]).sort((a, b) => a - b);
  return {
    n: rows.length,
    p10: Math.round(pct(mids, 0.1)),
    p25: Math.round(pct(mids, 0.25)),
    p50: Math.round(pct(mids, 0.5)),
    p75: Math.round(pct(mids, 0.75)),
    p90: Math.round(pct(mids, 0.9)),
    range: [Math.round(pct(lows, 0.1)), Math.round(pct(highs, 0.9))],
  };
}

/** 属于若干职类的全部行（课程页单元 → 职类对照用） */
export function rowsOfCats(cats: string[]): number[][] {
  return insightRows.filter(r => cats.includes(insightCategories[r[I.cat]]));
}

/** 按某维度取值分组统计（label → {n, stat}，按 n 降序） */
export function groupByDim(
  rows: number[][],
  idx: number,
  labels: readonly string[],
): {label: string; n: number; stat: SalaryStat | null}[] {
  const groups = new Map<string, number[][]>();
  for (const r of rows) {
    const key = labels[r[idx]];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(r);
  }
  return [...groups.entries()]
    .map(([label, rs]) => ({label, n: rs.length, stat: statOf(rs)}))
    .sort((a, b) => b.n - a.n);
}

/** 城市统计（CityStat 兼容形态，供课程页箱线图复用）：{city, n, p10..p90, range} */
export type CubeCityStat = {
  city: string;
  n: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  range: [number, number];
};

/** 行集 → 城市统计（CubeCityStat 形态，供课程页箱线图 / 情报页复用） */
export function cityStatsOfRows(rows: number[][]): CubeCityStat[] {
  return groupByDim(rows, I.city, insightCities)
    .filter(g => g.stat)
    .map(g => ({
      city: g.label,
      n: g.n,
      p10: g.stat!.p10,
      p25: g.stat!.p25,
      p50: g.stat!.p50,
      p75: g.stat!.p75,
      p90: g.stat!.p90,
      range: g.stat!.range,
    }));
}

export function cityStatsOf(cat: string, plat: string): CubeCityStat[] {
  return cityStatsOfRows(filterRows({cat, plat}));
}

/** 某职类合并口径（两平台）城市统计，按 P50 降序 */
export function mergedCityStats(cat: string): CubeCityStat[] {
  return cityStatsOfRows(filterRows({cat})).sort((a, b) => b.p50 - a.p50);
}
