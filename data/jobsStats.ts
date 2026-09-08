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
        {city: '北京', n: 2, p10: 45, p25: 45, p50: 45, p75: 45, p90: 45, range: [30, 60]},
        {city: '上海', n: 4, p10: 13, p25: 13, p50: 15, p75: 18, p90: 21, range: [10, 23]},
        {city: '广州', n: 2, p10: 27, p25: 27, p50: 28, p75: 29, p90: 30, range: [18, 40]},
        {city: '深圳', n: 4, p10: 29, p25: 39, p50: 45, p75: 58, p90: 80, range: [20, 95]},
        {city: '杭州', n: 10, p10: 20, p25: 25, p50: 34, p75: 41, p90: 46, range: [15, 61]},
        {city: '成都', n: 4, p10: 11, p25: 12, p50: 17, p75: 22, p90: 24, range: [9, 29]},
        {city: '武汉', n: 2, p10: 11, p25: 12, p50: 13, p75: 15, p90: 15, range: [10, 19]},
        {city: '南京', n: 7, p10: 11, p25: 12, p50: 12, p75: 15, p90: 21, range: [9, 26]},
        {city: '西安', n: 7, p10: 10, p25: 11, p50: 12, p75: 13, p90: 17, range: [9, 20]},
        {city: '重庆', n: 1, p10: 18, p25: 18, p50: 18, p75: 18, p90: 18, range: [15, 20]},
      ],
      job51: [
        {city: '北京', n: 18, p10: 10, p25: 14, p50: 15, p75: 19, p90: 40, range: [8, 48]},
        {city: '上海', n: 21, p10: 19, p25: 20, p50: 24, p75: 28, p90: 40, range: [15, 50]},
        {city: '深圳', n: 25, p10: 10, p25: 14, p50: 16, p75: 20, p90: 25, range: [7, 33]},
        {city: '杭州', n: 19, p10: 11, p25: 14, p50: 18, p75: 20, p90: 30, range: [10, 38]},
        {city: '成都', n: 19, p10: 8, p25: 9, p50: 15, p75: 18, p90: 23, range: [6, 27]},
        {city: '武汉', n: 22, p10: 10, p25: 12, p50: 15, p75: 17, p90: 20, range: [8, 25]},
        {city: '南京', n: 17, p10: 9, p25: 11, p50: 13, p75: 18, p90: 22, range: [7, 27]},
        {city: '西安', n: 12, p10: 10, p25: 11, p50: 14, p75: 15, p90: 20, range: [8, 24]},
        {city: '重庆', n: 11, p10: 8, p25: 13, p50: 16, p75: 21, p90: 28, range: [5, 35]},
      ],
    },
    bossTags: [
      {tag: 'Spring', count: 26},
      {tag: 'Java', count: 23},
      {tag: 'Vue', count: 16},
      {tag: 'MySQL', count: 16},
      {tag: 'JavaScript', count: 15},
      {tag: 'MongoDB', count: 14},
      {tag: 'Redis', count: 13},
      {tag: 'Python', count: 11},
      {tag: 'React', count: 9},
      {tag: 'TypeScript', count: 6},
      {tag: 'HTML', count: 5},
      {tag: 'SpringCloud', count: 5},
      {tag: 'MyBatis', count: 5},
      {tag: 'Node.js', count: 4},
      {tag: '微服务', count: 4},
      {tag: 'CSS', count: 3},
      {tag: 'AI', count: 2},
      {tag: '大模型', count: 2},
      {tag: 'Golang', count: 2},
      {tag: 'HTML5', count: 1},
    ],
  },
  'devops': {
    cities: {
      boss: [
        {city: '北京', n: 1, p10: 14, p25: 14, p50: 14, p75: 14, p90: 14, range: [14, 15]},
        {city: '上海', n: 8, p10: 15, p25: 18, p50: 22, p75: 30, p90: 33, range: [12, 40]},
        {city: '广州', n: 6, p10: 12, p25: 14, p50: 19, p75: 24, p90: 26, range: [10, 30]},
        {city: '深圳', n: 4, p10: 26, p25: 27, p50: 28, p75: 30, p90: 34, range: [20, 46]},
        {city: '杭州', n: 4, p10: 11, p25: 12, p50: 15, p75: 19, p90: 22, range: [9, 27]},
        {city: '武汉', n: 5, p10: 14, p25: 14, p50: 15, p75: 18, p90: 19, range: [12, 23]},
        {city: '南京', n: 1, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [10, 15]},
        {city: '西安', n: 20, p10: 5, p25: 6, p50: 8, p75: 9, p90: 12, range: [5, 15]},
        {city: '重庆', n: 1, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [10, 15]},
      ],
      job51: [
        {city: '北京', n: 29, p10: 9, p25: 12, p50: 15, p75: 18, p90: 30, range: [8, 36]},
        {city: '上海', n: 30, p10: 10, p25: 11, p50: 17, p75: 25, p90: 38, range: [7, 43]},
        {city: '深圳', n: 43, p10: 7, p25: 9, p50: 12, p75: 19, p90: 25, range: [6, 30]},
        {city: '杭州', n: 23, p10: 9, p25: 11, p50: 12, p75: 16, p90: 28, range: [8, 37]},
        {city: '成都', n: 22, p10: 6, p25: 7, p50: 8, p75: 15, p90: 21, range: [5, 25]},
        {city: '武汉', n: 30, p10: 7, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
        {city: '南京', n: 27, p10: 8, p25: 10, p50: 12, p75: 16, p90: 19, range: [6, 22]},
        {city: '西安', n: 16, p10: 6, p25: 7, p50: 8, p75: 12, p90: 15, range: [5, 17]},
        {city: '重庆', n: 19, p10: 6, p25: 6, p50: 7, p75: 12, p90: 15, range: [4, 20]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 13},
      {tag: 'Shell', count: 13},
      {tag: 'Docker', count: 11},
      {tag: 'Kubernetes', count: 11},
      {tag: 'Java', count: 10},
      {tag: 'DevOps', count: 8},
      {tag: 'Golang', count: 6},
      {tag: 'CI/CD', count: 6},
      {tag: 'MySQL', count: 4},
      {tag: 'SRE', count: 3},
      {tag: 'Oracle', count: 3},
      {tag: 'Redis', count: 3},
      {tag: 'AI', count: 2},
      {tag: '阿里云', count: 2},
      {tag: '云平台', count: 2},
      {tag: 'Ansible', count: 2},
      {tag: 'Salt', count: 2},
      {tag: 'Puppet', count: 2},
      {tag: 'Jenkins', count: 2},
      {tag: '网络基础协议', count: 1},
    ],
  },
  'ai-coding': {
    cities: {
      boss: [
        {city: '北京', n: 5, p10: 27, p25: 30, p50: 30, p75: 40, p90: 43, range: [20, 53]},
        {city: '上海', n: 3, p10: 29, p25: 35, p50: 45, p75: 110, p90: 149, range: [26, 172]},
        {city: '广州', n: 2, p10: 18, p25: 19, p50: 20, p75: 21, p90: 22, range: [15, 29]},
        {city: '深圳', n: 4, p10: 21, p25: 27, p50: 30, p75: 39, p90: 55, range: [14, 64]},
        {city: '杭州', n: 2, p10: 16, p25: 16, p50: 18, p75: 19, p90: 20, range: [12, 24]},
        {city: '成都', n: 2, p10: 10, p25: 11, p50: 12, p75: 14, p90: 15, range: [9, 16]},
        {city: '武汉', n: 1, p10: 22, p25: 22, p50: 22, p75: 22, p90: 22, range: [15, 30]},
        {city: '南京', n: 1, p10: 28, p25: 28, p50: 28, p75: 28, p90: 28, range: [20, 35]},
      ],
      job51: [
        {city: '北京', n: 4, p10: 29, p25: 33, p50: 36, p75: 38, p90: 39, range: [20, 48]},
        {city: '上海', n: 3, p10: 8, p25: 10, p50: 12, p75: 17, p90: 20, range: [6, 27]},
        {city: '深圳', n: 1, p10: 40, p25: 40, p50: 40, p75: 40, p90: 40, range: [35, 45]},
        {city: '武汉', n: 2, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [8, 17]},
        {city: '南京', n: 1, p10: 10, p25: 10, p50: 10, p75: 10, p90: 10, range: [8, 12]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 9},
      {tag: 'Java', count: 7},
      {tag: 'AI', count: 6},
      {tag: 'Docker', count: 3},
      {tag: 'Redis', count: 3},
      {tag: 'C++', count: 3},
      {tag: 'Golang', count: 3},
      {tag: '并行计算', count: 2},
      {tag: 'Spring', count: 2},
      {tag: 'C', count: 2},
      {tag: 'DevOps', count: 2},
      {tag: 'Agent', count: 2},
      {tag: '模型加速', count: 1},
      {tag: '性能优化', count: 1},
      {tag: 'SpringCloud', count: 1},
      {tag: 'MySQL', count: 1},
      {tag: 'MyBatis', count: 1},
      {tag: 'Oracle', count: 1},
      {tag: 'CI/CD', count: 1},
      {tag: '系统集成', count: 1},
    ],
  },
  'backend': {
    cities: {
      boss: [
        {city: '北京', n: 4, p10: 9, p25: 11, p50: 14, p75: 16, p90: 17, range: [8, 19]},
        {city: '上海', n: 1, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [9, 14]},
        {city: '广州', n: 3, p10: 6, p25: 10, p50: 18, p75: 20, p90: 21, range: [5, 22]},
        {city: '深圳', n: 1, p10: 11, p25: 11, p50: 11, p75: 11, p90: 11, range: [9, 13]},
        {city: '杭州', n: 4, p10: 14, p25: 14, p50: 18, p75: 24, p90: 27, range: [12, 36]},
        {city: '成都', n: 3, p10: 10, p25: 10, p50: 10, p75: 12, p90: 12, range: [9, 13]},
        {city: '南京', n: 2, p10: 13, p25: 14, p50: 14, p75: 16, p90: 16, range: [10, 18]},
        {city: '西安', n: 64, p10: 10, p25: 11, p50: 14, p75: 19, p90: 22, range: [8, 30]},
        {city: '重庆', n: 2, p10: 11, p25: 12, p50: 13, p75: 14, p90: 15, range: [10, 16]},
      ],
      job51: [
        {city: '北京', n: 39, p10: 12, p25: 14, p50: 15, p75: 20, p90: 36, range: [9, 45]},
        {city: '上海', n: 38, p10: 14, p25: 15, p50: 16, p75: 18, p90: 24, range: [10, 31]},
        {city: '深圳', n: 56, p10: 11, p25: 13, p50: 16, p75: 19, p90: 22, range: [10, 30]},
        {city: '杭州', n: 42, p10: 12, p25: 12, p50: 15, p75: 20, p90: 35, range: [9, 40]},
        {city: '成都', n: 38, p10: 7, p25: 10, p50: 12, p75: 17, p90: 21, range: [6, 25]},
        {city: '武汉', n: 38, p10: 10, p25: 12, p50: 14, p75: 15, p90: 18, range: [8, 24]},
        {city: '南京', n: 43, p10: 10, p25: 11, p50: 13, p75: 15, p90: 18, range: [7, 22]},
        {city: '西安', n: 41, p10: 10, p25: 12, p50: 14, p75: 16, p90: 16, range: [8, 20]},
        {city: '重庆', n: 26, p10: 7, p25: 9, p50: 11, p75: 15, p90: 20, range: [6, 25]},
      ],
    },
    bossTags: [
      {tag: 'Java', count: 73},
      {tag: 'MySQL', count: 60},
      {tag: 'Spring', count: 54},
      {tag: 'SpringCloud', count: 49},
      {tag: 'Redis', count: 33},
      {tag: 'MyBatis', count: 27},
      {tag: 'Oracle', count: 17},
      {tag: 'C', count: 12},
      {tag: 'C++', count: 12},
      {tag: 'Python', count: 12},
      {tag: 'Docker', count: 11},
      {tag: '微服务', count: 10},
      {tag: 'Kafka', count: 9},
      {tag: 'PostgreSQL', count: 9},
      {tag: 'Golang', count: 8},
      {tag: 'Dubbo', count: 5},
      {tag: 'SQL', count: 5},
      {tag: 'Nginx', count: 5},
      {tag: 'JVM', count: 5},
      {tag: 'MongoDB', count: 5},
    ],
  },
  'agents': {
    cities: {
      boss: [
        {city: '北京', n: 3, p10: 17, p25: 17, p50: 18, p75: 32, p90: 40, range: [14, 52]},
        {city: '上海', n: 4, p10: 11, p25: 14, p50: 22, p75: 32, p90: 35, range: [9, 47]},
        {city: '广州', n: 2, p10: 8, p25: 10, p50: 14, p75: 17, p90: 19, range: [7, 22]},
        {city: '深圳', n: 1, p10: 30, p25: 30, p50: 30, p75: 30, p90: 30, range: [20, 40]},
        {city: '杭州', n: 5, p10: 14, p25: 14, p50: 27, p75: 38, p90: 42, range: [12, 56]},
        {city: '武汉', n: 3, p10: 9, p25: 10, p50: 12, p75: 18, p90: 20, range: [7, 23]},
        {city: '南京', n: 3, p10: 16, p25: 18, p50: 20, p75: 21, p90: 22, range: [13, 29]},
        {city: '西安', n: 52, p10: 7, p25: 8, p50: 12, p75: 20, p90: 23, range: [5, 30]},
      ],
      job51: [
        {city: '北京', n: 66, p10: 10, p25: 15, p50: 20, p75: 35, p90: 40, range: [8, 50]},
        {city: '上海', n: 77, p10: 12, p25: 15, p50: 20, p75: 30, p90: 38, range: [10, 50]},
        {city: '深圳', n: 93, p10: 12, p25: 15, p50: 20, p75: 28, p90: 40, range: [10, 49]},
        {city: '杭州', n: 62, p10: 14, p25: 15, p50: 22, p75: 30, p90: 47, range: [10, 60]},
        {city: '成都', n: 56, p10: 10, p25: 11, p50: 14, p75: 18, p90: 24, range: [7, 28]},
        {city: '武汉', n: 53, p10: 6, p25: 7, p50: 12, p75: 18, p90: 22, range: [5, 29]},
        {city: '南京', n: 60, p10: 10, p25: 12, p50: 18, p75: 25, p90: 30, range: [8, 40]},
        {city: '西安', n: 51, p10: 6, p25: 10, p50: 14, p75: 17, p90: 30, range: [5, 40]},
        {city: '重庆', n: 54, p10: 4, p25: 5, p50: 12, p75: 20, p90: 31, range: [4, 35]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 28},
      {tag: 'MySQL', count: 16},
      {tag: 'Java', count: 13},
      {tag: 'Redis', count: 10},
      {tag: 'Django', count: 8},
      {tag: '大模型', count: 8},
      {tag: 'Docker', count: 6},
      {tag: 'C++', count: 5},
      {tag: 'Numpy', count: 5},
      {tag: 'Golang', count: 5},
      {tag: 'PostgreSQL', count: 5},
      {tag: 'Flask', count: 5},
      {tag: 'Oracle', count: 4},
      {tag: 'Kafka', count: 4},
      {tag: 'Pandas', count: 4},
      {tag: 'MongoDB', count: 4},
      {tag: 'AI', count: 4},
      {tag: 'C', count: 3},
      {tag: 'PyTorch', count: 3},
      {tag: 'Tornado', count: 3},
    ],
  },
};
