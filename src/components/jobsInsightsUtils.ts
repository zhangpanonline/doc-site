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
import {skillNames, skillMeta, skillRows} from '@site/data/skillSalary';
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

/** 按指定薪资列位求统计（cube 行与技能行的 lo/hi 列位不同，故抽成带列位参数的版本） */
function statOfAt(rows: number[][], loIdx: number, hiIdx: number): SalaryStat | null {
  if (rows.length === 0) {
    return null;
  }
  const mids = rows.map(r => (r[loIdx] + r[hiIdx]) / 2).sort((a, b) => a - b);
  const lows = rows.map(r => r[loIdx]).sort((a, b) => a - b);
  const highs = rows.map(r => r[hiIdx]).sort((a, b) => a - b);
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

export function statOf(rows: number[][]): SalaryStat | null {
  return statOfAt(rows, I.lo, I.hi);
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

/**
 * 二维交叉统计：行维度 × 列维度 → 格子矩阵。
 * 单看任一一维都会把另一维的差异平均掉——只看城市会掩盖经验带来的跨度，
 * 交叉视图才能真正回答「在 X 城、Y 年经验值多少」。
 * keys 由调用方传入并自行排序（经验按档位顺序、城市按样本量降序）。
 */
export type CrossCell = {n: number; stat: SalaryStat | null} | null;
export type CrossGrid = {
  rowKeys: readonly string[];
  colKeys: readonly string[];
  /** cells[行序][列序]，该组合无样本时为 null */
  cells: CrossCell[][];
};

export function crossByDim({
  rows,
  row,
  col,
}: {
  rows: number[][];
  row: {idx: number; labels: readonly string[]; keys: readonly string[]};
  col: {idx: number; labels: readonly string[]; keys: readonly string[]};
}): CrossGrid {
  const buckets = new Map<string, Map<string, number[][]>>();
  for (const r of rows) {
    const rk = row.labels[r[row.idx]];
    const ck = col.labels[r[col.idx]];
    let inner = buckets.get(rk);
    if (!inner) {
      inner = new Map<string, number[][]>();
      buckets.set(rk, inner);
    }
    const bucket = inner.get(ck);
    if (bucket) {
      bucket.push(r);
    } else {
      inner.set(ck, [r]);
    }
  }
  const cells = row.keys.map(rk => {
    const inner = buckets.get(rk);
    return col.keys.map(ck => {
      const bucket = inner?.get(ck);
      return bucket && bucket.length > 0 ? {n: bucket.length, stat: statOf(bucket)} : null;
    });
  });
  return {rowKeys: row.keys, colKeys: col.keys, cells};
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

/* ============================================================
 * 技能 × 薪资：data/skillSalary.ts 的行格式
 *   [职类, 城市, 经验, 学历, 规模, 领域, 平台, maskLo, maskHi, 低值, 高值]
 * 前 7 位与 DIM 完全一致（同一套 cube_rules 生成），因此可以直接套用
 * RowFilter；差异只在薪资列位后移到 9/10，故统计走 statOfAt。
 * ============================================================ */

/** 每行技能位掩码分两段存：低 30 位 / 高 30 位（JS 位运算 32 位有符号的安全上限） */
export const SKILL_BITS = 30;

export const SDIM = {
  cat: 0,
  city: 1,
  exp: 2,
  deg: 3,
  size: 4,
  dom: 5,
  plat: 6,
  m0: 7,
  m1: 8,
  lo: 9,
  hi: 10,
} as const;

export type SkillStat = {
  name: string;
  group: string;
  n: number;
  /** 相对基准（当前筛选下全部岗位）的中位薪资差额，单位 K */
  premium: number;
  stat: SalaryStat | null;
};

/** 技能行集的整体统计：与 skillStatsOf 内部使用的溢价基准口径完全一致 */
export function statOfSkillRows(rows: number[][]): SalaryStat | null {
  return statOfAt(rows, SDIM.lo, SDIM.hi);
}

export function filterSkillRows(f: RowFilter): number[][] {
  return skillRows.filter(
    r =>
      (f.cat === undefined || insightCategories[r[SDIM.cat]] === f.cat) &&
      (f.city === undefined || insightCities[r[SDIM.city]] === f.city) &&
      (f.exp === undefined || insightExpBuckets[r[SDIM.exp]] === f.exp) &&
      (f.deg === undefined || insightDegBuckets[r[SDIM.deg]] === f.deg) &&
      (f.size === undefined || insightSizeBuckets[r[SDIM.size]] === f.size) &&
      (f.dom === undefined || insightDomains[r[SDIM.dom]] === f.dom) &&
      (f.plat === undefined || insightPlatforms[r[SDIM.plat]] === f.plat),
  );
}

/**
 * 技能 × 薪资聚合：把一个行集按技能位拆成多组，各自求分位统计与溢价。
 *
 * 注意：一个岗位命中多个技能时会被同时计入多组，因此各组 n 之和大于行集总数，
 * 不能相加。溢价是「相关性」而非「因果」——高薪岗位本来就更爱堆技能要求。
 */
export function skillStatsOf(rows: number[][]): SkillStat[] {
  // 每个技能一个桶，桶里装的是行（number[][]），故 buckets 是三层
  const buckets: number[][][] = skillNames.map(() => []);
  for (const r of rows) {
    const m0 = r[SDIM.m0];
    const m1 = r[SDIM.m1];
    for (let b = 0; b < skillNames.length; b += 1) {
      const word = b < SKILL_BITS ? m0 : m1;
      if ((word >>> (b % SKILL_BITS)) & 1) {
        buckets[b].push(r);
      }
    }
  }
  const base = statOfAt(rows, SDIM.lo, SDIM.hi)?.p50 ?? 0;
  return skillNames
    .map((name, i) => {
      const stat = statOfAt(buckets[i], SDIM.lo, SDIM.hi);
      return {
        name,
        group: skillMeta[name] ?? '其他',
        n: buckets[i].length,
        premium: stat ? stat.p50 - base : 0,
        stat,
      };
    })
    .filter(s => s.stat !== null);
}
