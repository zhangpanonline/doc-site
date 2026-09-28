/**
 * 岗位地图统计视图数据（聚合统计，口径与 data/jobs.ts 一致）。
 * 由 ~/.claude/skills/boss-crawler/assets/jobsmap/city_stats.py 生成，勿手改——改口径后重跑脚本。
 *
 * - 城市轴 STAT_CITIES = 10 城；每格统计 = 该平台该城市命中该阶段岗位的样本
 * - p10/p25/p50/p75/p90 = 薪资中点分布百分位（K/月）；range = [低值 P10, 高值 P90]
 * - bossTags = BOSS 技能标签词频（已清洗非技术噪音标签），每阶段 Top20
 * - 样本不足的城市不在 cities 数组里（UI 按 n<20 显示「待扩充」占位）
 * - BOSS 样本落在 10 城之外的未计入分城市统计；51job 无技能标签字段
 */

export type CityStat = {
  /** 城市名 */
  city: string;
  /** 样本数 */
  n: number;
  /** 中点分布：P10 / P25 / P50 / P75 / P90（K/月） */
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  /** 薪资区间口径：[低值 P10, 高值 P90]（K/月） */
  range: [number, number];
};

export type BossTagStat = {
  tag: string;
  count: number;
};

export type StageStats = {
  /** 分平台分城市统计（仅含 n>0 的城市） */
  cities: {
    boss: CityStat[];
    job51: CityStat[];
  };
  /** BOSS 技能标签词频 Top20 */
  bossTags: BossTagStat[];
};

export const STAT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆'] as const;

export const jobsStats: Record<string, StageStats> = {
  'fullstack': {
    cities: {
      boss: [
        {city: '北京', n: 63, p10: 13, p25: 16, p50: 18, p75: 24, p90: 30, range: [10, 39]},
        {city: '上海', n: 79, p10: 13, p25: 16, p50: 22, p75: 26, p90: 32, range: [11, 40]},
      ],
      job51: [
        {city: '北京', n: 18, p10: 10, p25: 14, p50: 15, p75: 19, p90: 40, range: [8, 48]},
        {city: '上海', n: 22, p10: 18, p25: 20, p50: 23, p75: 27, p90: 40, range: [15, 50]},
        {city: '深圳', n: 34, p10: 10, p25: 11, p50: 15, p75: 19, p90: 22, range: [8, 28]},
        {city: '杭州', n: 19, p10: 11, p25: 14, p50: 18, p75: 20, p90: 30, range: [10, 38]},
        {city: '成都', n: 20, p10: 8, p25: 9, p50: 15, p75: 18, p90: 23, range: [6, 26]},
        {city: '武汉', n: 21, p10: 11, p25: 12, p50: 16, p75: 18, p90: 20, range: [9, 25]},
        {city: '南京', n: 19, p10: 10, p25: 11, p50: 12, p75: 15, p90: 20, range: [8, 26]},
        {city: '西安', n: 7, p10: 12, p25: 12, p50: 14, p75: 15, p90: 15, range: [9, 17]},
        {city: '重庆', n: 12, p10: 8, p25: 12, p50: 15, p75: 20, p90: 22, range: [6, 30]},
      ],
    },
    bossTags: [
      {tag: 'Java', count: 43},
      {tag: 'Spring', count: 32},
      {tag: 'Python', count: 28},
      {tag: 'MySQL', count: 27},
      {tag: 'JavaScript', count: 17},
      {tag: 'Vue', count: 17},
      {tag: 'Redis', count: 16},
      {tag: 'React', count: 14},
      {tag: 'AI', count: 13},
      {tag: 'SpringCloud', count: 11},
      {tag: 'MongoDB', count: 11},
      {tag: 'TypeScript', count: 9},
      {tag: 'Node.js', count: 8},
      {tag: 'MyBatis', count: 8},
      {tag: 'Docker', count: 7},
      {tag: 'Agent', count: 6},
      {tag: '全栈侧重前端', count: 5},
      {tag: 'Golang', count: 5},
      {tag: 'Oracle', count: 5},
      {tag: 'Django', count: 5},
    ],
  },
  'devops': {
    cities: {
      boss: [
        {city: '北京', n: 52, p10: 10, p25: 12, p50: 16, p75: 22, p90: 37, range: [8, 45]},
        {city: '上海', n: 129, p10: 11, p25: 14, p50: 20, p75: 30, p90: 45, range: [9, 60]},
      ],
      job51: [
        {city: '北京', n: 29, p10: 9, p25: 12, p50: 15, p75: 18, p90: 30, range: [8, 36]},
        {city: '上海', n: 31, p10: 10, p25: 11, p50: 17, p75: 24, p90: 38, range: [7, 43]},
        {city: '深圳', n: 52, p10: 8, p25: 9, p50: 13, p75: 20, p90: 32, range: [7, 40]},
        {city: '杭州', n: 23, p10: 9, p25: 11, p50: 12, p75: 16, p90: 28, range: [8, 37]},
        {city: '成都', n: 22, p10: 6, p25: 7, p50: 8, p75: 15, p90: 21, range: [5, 25]},
        {city: '武汉', n: 30, p10: 7, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
        {city: '南京', n: 25, p10: 6, p25: 10, p50: 14, p75: 16, p90: 20, range: [5, 25]},
        {city: '西安', n: 18, p10: 7, p25: 8, p50: 10, p75: 16, p90: 20, range: [6, 22]},
        {city: '重庆', n: 18, p10: 6, p25: 6, p50: 7, p75: 12, p90: 16, range: [5, 20]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 36},
      {tag: 'Shell', count: 31},
      {tag: 'Kubernetes', count: 22},
      {tag: 'DevOps', count: 20},
      {tag: 'SRE', count: 15},
      {tag: 'Docker', count: 15},
      {tag: 'Golang', count: 12},
      {tag: 'MySQL', count: 11},
      {tag: 'Java', count: 11},
      {tag: 'Redis', count: 7},
      {tag: 'Oracle', count: 6},
      {tag: '桌面运维', count: 6},
      {tag: 'Nginx', count: 5},
      {tag: 'Prometheus', count: 3},
      {tag: 'Hadoop', count: 3},
      {tag: 'Linux', count: 3},
      {tag: 'SLO', count: 3},
      {tag: '容器技术', count: 3},
      {tag: '源码', count: 3},
      {tag: '数据中心', count: 3},
    ],
  },
  'ai-coding': {
    cities: {
      boss: [
        {city: '北京', n: 16, p10: 21, p25: 29, p50: 45, p75: 48, p90: 95, range: [18, 110]},
        {city: '上海', n: 32, p10: 23, p25: 37, p50: 55, p75: 75, p90: 85, range: [20, 100]},
      ],
      job51: [
        {city: '北京', n: 4, p10: 29, p25: 33, p50: 36, p75: 38, p90: 39, range: [20, 48]},
        {city: '上海', n: 6, p10: 10, p25: 13, p50: 20, p75: 22, p90: 25, range: [8, 32]},
        {city: '深圳', n: 1, p10: 40, p25: 40, p50: 40, p75: 40, p90: 40, range: [35, 45]},
        {city: '武汉', n: 2, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [8, 17]},
        {city: '南京', n: 1, p10: 10, p25: 10, p50: 10, p75: 10, p90: 10, range: [8, 12]},
      ],
    },
    bossTags: [
      {tag: 'AI', count: 11},
      {tag: 'Python', count: 9},
      {tag: 'Java', count: 8},
      {tag: 'MySQL', count: 6},
      {tag: 'Golang', count: 5},
      {tag: 'CI/CD', count: 5},
      {tag: 'Redis', count: 4},
      {tag: 'C++', count: 4},
      {tag: 'Django', count: 3},
      {tag: 'Kubernetes', count: 3},
      {tag: 'Docker', count: 2},
      {tag: 'coding', count: 2},
      {tag: 'DevOps', count: 2},
      {tag: 'SpringCloud', count: 2},
      {tag: 'Spring', count: 2},
      {tag: '企业内部技术项目管理', count: 2},
      {tag: '流程优化', count: 2},
      {tag: '汽车', count: 2},
      {tag: 'Flask', count: 1},
      {tag: 'Kafka', count: 1},
    ],
  },
  'backend': {
    cities: {
      boss: [
        {city: '北京', n: 104, p10: 12, p25: 15, p50: 18, p75: 22, p90: 25, range: [11, 30]},
        {city: '上海', n: 226, p10: 12, p25: 14, p50: 16, p75: 22, p90: 30, range: [10, 38]},
      ],
      job51: [
        {city: '北京', n: 42, p10: 12, p25: 14, p50: 15, p75: 29, p90: 36, range: [9, 45]},
        {city: '上海', n: 40, p10: 14, p25: 15, p50: 16, p75: 19, p90: 29, range: [10, 35]},
        {city: '深圳', n: 65, p10: 13, p25: 15, p50: 16, p75: 20, p90: 24, range: [10, 30]},
        {city: '杭州', n: 40, p10: 11, p25: 12, p50: 15, p75: 18, p90: 26, range: [9, 31]},
        {city: '成都', n: 39, p10: 7, p25: 10, p50: 12, p75: 17, p90: 21, range: [6, 25]},
        {city: '武汉', n: 39, p10: 10, p25: 12, p50: 14, p75: 15, p90: 18, range: [8, 24]},
        {city: '南京', n: 42, p10: 10, p25: 11, p50: 13, p75: 15, p90: 21, range: [7, 28]},
        {city: '西安', n: 42, p10: 10, p25: 12, p50: 14, p75: 16, p90: 16, range: [8, 20]},
        {city: '重庆', n: 23, p10: 7, p25: 9, p50: 12, p75: 15, p90: 20, range: [6, 25]},
      ],
    },
    bossTags: [
      {tag: 'Java', count: 254},
      {tag: 'MySQL', count: 227},
      {tag: 'Spring', count: 183},
      {tag: 'SpringCloud', count: 153},
      {tag: 'Redis', count: 111},
      {tag: 'MyBatis', count: 66},
      {tag: 'Python', count: 60},
      {tag: 'Oracle', count: 57},
      {tag: 'Kafka', count: 41},
      {tag: 'Docker', count: 24},
      {tag: 'PostgreSQL', count: 21},
      {tag: 'MongoDB', count: 21},
      {tag: 'Golang', count: 20},
      {tag: 'SQL', count: 20},
      {tag: 'Dubbo', count: 19},
      {tag: 'AI', count: 18},
      {tag: 'Hibernate', count: 17},
      {tag: 'C++', count: 16},
      {tag: 'JVM', count: 14},
      {tag: 'C', count: 12},
    ],
  },
  'agents': {
    cities: {
      boss: [
        {city: '北京', n: 138, p10: 11, p25: 14, p50: 17, p75: 23, p90: 30, range: [10, 40]},
        {city: '上海', n: 294, p10: 13, p25: 16, p50: 22, p75: 30, p90: 45, range: [11, 60]},
      ],
      job51: [
        {city: '北京', n: 66, p10: 11, p25: 15, p50: 20, p75: 35, p90: 40, range: [8, 50]},
        {city: '上海', n: 83, p10: 12, p25: 16, p50: 20, p75: 28, p90: 37, range: [10, 49]},
        {city: '深圳', n: 100, p10: 11, p25: 14, p50: 20, p75: 25, p90: 38, range: [8, 45]},
        {city: '杭州', n: 60, p10: 13, p25: 15, p50: 22, p75: 29, p90: 48, range: [10, 60]},
        {city: '成都', n: 55, p10: 10, p25: 11, p50: 14, p75: 18, p90: 22, range: [7, 26]},
        {city: '武汉', n: 54, p10: 6, p25: 7, p50: 13, p75: 18, p90: 22, range: [5, 30]},
        {city: '南京', n: 59, p10: 11, p25: 15, p50: 18, p75: 28, p90: 31, range: [8, 40]},
        {city: '西安', n: 55, p10: 7, p25: 10, p50: 12, p75: 16, p90: 22, range: [6, 30]},
        {city: '重庆', n: 51, p10: 4, p25: 8, p50: 14, p75: 22, p90: 30, range: [4, 35]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 271},
      {tag: 'MySQL', count: 150},
      {tag: 'Django', count: 95},
      {tag: 'Redis', count: 69},
      {tag: 'Java', count: 62},
      {tag: 'Docker', count: 48},
      {tag: 'Flask', count: 46},
      {tag: 'PyTorch', count: 40},
      {tag: 'C++', count: 33},
      {tag: 'Agent', count: 32},
      {tag: 'Pandas', count: 30},
      {tag: 'Golang', count: 28},
      {tag: 'Numpy', count: 27},
      {tag: 'MongoDB', count: 25},
      {tag: 'AI', count: 23},
      {tag: 'PostgreSQL', count: 22},
      {tag: '大模型', count: 22},
      {tag: 'Kubernetes', count: 21},
      {tag: 'Oracle', count: 19},
      {tag: '爬虫经验', count: 18},
    ],
  },
};
