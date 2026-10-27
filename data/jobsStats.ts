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
        {city: '北京', n: 77, p10: 12, p25: 16, p50: 18, p75: 24, p90: 30, range: [11, 40]},
        {city: '上海', n: 122, p10: 12, p25: 15, p50: 20, p75: 27, p90: 32, range: [11, 40]},
        {city: '广州', n: 24, p10: 10, p25: 12, p50: 16, p75: 22, p90: 27, range: [8, 34]},
        {city: '深圳', n: 60, p10: 12, p25: 13, p50: 18, p75: 22, p90: 30, range: [10, 36]},
        {city: '杭州', n: 67, p10: 12, p25: 14, p50: 18, p75: 22, p90: 30, range: [10, 40]},
        {city: '成都', n: 96, p10: 10, p25: 12, p50: 15, p75: 20, p90: 26, range: [8, 30]},
        {city: '武汉', n: 66, p10: 10, p25: 10, p50: 14, p75: 18, p90: 21, range: [8, 26]},
        {city: '重庆', n: 31, p10: 6, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
      ],
      job51: [
        {city: '北京', n: 24, p10: 11, p25: 14, p50: 16, p75: 30, p90: 38, range: [8, 47]},
        {city: '上海', n: 44, p10: 13, p25: 15, p50: 19, p75: 24, p90: 30, range: [10, 39]},
        {city: '广州', n: 27, p10: 10, p25: 12, p50: 15, p75: 17, p90: 27, range: [8, 36]},
        {city: '深圳', n: 31, p10: 10, p25: 14, p50: 16, p75: 20, p90: 26, range: [8, 35]},
        {city: '杭州', n: 27, p10: 11, p25: 15, p50: 18, p75: 20, p90: 27, range: [10, 33]},
        {city: '成都', n: 32, p10: 8, p25: 10, p50: 14, p75: 20, p90: 22, range: [6, 30]},
        {city: '武汉', n: 29, p10: 10, p25: 12, p50: 15, p75: 18, p90: 21, range: [9, 25]},
        {city: '南京', n: 19, p10: 10, p25: 11, p50: 12, p75: 15, p90: 22, range: [8, 26]},
        {city: '西安', n: 7, p10: 12, p25: 12, p50: 14, p75: 15, p90: 15, range: [9, 17]},
        {city: '重庆', n: 15, p10: 7, p25: 12, p50: 16, p75: 21, p90: 23, range: [5, 30]},
      ],
    },
    bossTags: [
      {tag: 'Spring', count: 156},
      {tag: 'Java', count: 142},
      {tag: 'MySQL', count: 103},
      {tag: 'Python', count: 85},
      {tag: 'Vue', count: 80},
      {tag: 'Redis', count: 69},
      {tag: 'JavaScript', count: 66},
      {tag: 'React', count: 48},
      {tag: 'MongoDB', count: 47},
      {tag: 'AI', count: 35},
      {tag: 'TypeScript', count: 35},
      {tag: 'SpringCloud', count: 29},
      {tag: 'Node.js', count: 27},
      {tag: 'HTML', count: 27},
      {tag: 'Docker', count: 22},
      {tag: 'MyBatis', count: 22},
      {tag: 'CSS', count: 21},
      {tag: 'Golang', count: 20},
      {tag: 'Agent', count: 18},
      {tag: 'Django', count: 16},
    ],
  },
  'devops': {
    cities: {
      boss: [
        {city: '北京', n: 52, p10: 10, p25: 12, p50: 16, p75: 22, p90: 37, range: [8, 45]},
        {city: '上海', n: 200, p10: 10, p25: 14, p50: 20, p75: 30, p90: 45, range: [9, 55]},
        {city: '广州', n: 58, p10: 10, p25: 12, p50: 16, p75: 21, p90: 28, range: [8, 35]},
        {city: '深圳', n: 56, p10: 10, p25: 12, p50: 21, p75: 28, p90: 44, range: [8, 58]},
        {city: '杭州', n: 88, p10: 8, p25: 10, p50: 12, p75: 20, p90: 36, range: [7, 43]},
        {city: '成都', n: 99, p10: 6, p25: 10, p50: 12, p75: 20, p90: 28, range: [5, 36]},
        {city: '武汉', n: 87, p10: 6, p25: 8, p50: 10, p75: 18, p90: 21, range: [5, 26]},
        {city: '重庆', n: 50, p10: 4, p25: 6, p50: 8, p75: 18, p90: 22, range: [4, 29]},
      ],
      job51: [
        {city: '北京', n: 46, p10: 9, p25: 11, p50: 15, p75: 20, p90: 30, range: [8, 34]},
        {city: '上海', n: 50, p10: 10, p25: 13, p50: 17, p75: 22, p90: 33, range: [8, 40]},
        {city: '广州', n: 28, p10: 10, p25: 11, p50: 14, p75: 17, p90: 20, range: [8, 23]},
        {city: '深圳', n: 57, p10: 8, p25: 9, p50: 12, p75: 19, p90: 32, range: [6, 40]},
        {city: '杭州', n: 37, p10: 7, p25: 9, p50: 12, p75: 15, p90: 23, range: [5, 27]},
        {city: '成都', n: 39, p10: 6, p25: 7, p50: 8, p75: 12, p90: 20, range: [5, 25]},
        {city: '武汉', n: 42, p10: 6, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
        {city: '南京', n: 30, p10: 6, p25: 9, p50: 14, p75: 16, p90: 21, range: [5, 26]},
        {city: '西安', n: 19, p10: 7, p25: 8, p50: 9, p75: 16, p90: 20, range: [5, 22]},
        {city: '重庆', n: 30, p10: 6, p25: 6, p50: 7, p75: 12, p90: 13, range: [5, 16]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 126},
      {tag: 'Shell', count: 117},
      {tag: 'Kubernetes', count: 89},
      {tag: 'DevOps', count: 86},
      {tag: 'Docker', count: 77},
      {tag: 'Java', count: 71},
      {tag: 'MySQL', count: 56},
      {tag: 'Golang', count: 47},
      {tag: 'Redis', count: 37},
      {tag: 'Nginx', count: 36},
      {tag: 'SRE', count: 36},
      {tag: 'Oracle', count: 35},
      {tag: '桌面运维', count: 23},
      {tag: 'Elasticsearch', count: 20},
      {tag: 'CI/CD', count: 19},
      {tag: 'Linux', count: 15},
      {tag: 'Prometheus', count: 13},
      {tag: 'Ansible', count: 13},
      {tag: 'Salt', count: 13},
      {tag: 'Puppet', count: 13},
    ],
  },
  'ai-coding': {
    cities: {
      boss: [
        {city: '北京', n: 16, p10: 21, p25: 29, p50: 45, p75: 48, p90: 95, range: [18, 110]},
        {city: '上海', n: 32, p10: 20, p25: 26, p50: 38, p75: 51, p90: 74, range: [15, 88]},
        {city: '广州', n: 11, p10: 12, p25: 16, p50: 25, p75: 42, p90: 55, range: [10, 70]},
        {city: '深圳', n: 13, p10: 13, p25: 25, p50: 30, p75: 65, p90: 93, range: [10, 108]},
        {city: '杭州', n: 19, p10: 19, p25: 22, p50: 38, p75: 50, p90: 60, range: [15, 73]},
        {city: '成都', n: 15, p10: 11, p25: 16, p50: 22, p75: 26, p90: 30, range: [9, 40]},
        {city: '武汉', n: 15, p10: 8, p25: 9, p50: 12, p75: 20, p90: 34, range: [6, 42]},
        {city: '重庆', n: 1, p10: 20, p25: 20, p50: 20, p75: 20, p90: 20, range: [15, 25]},
      ],
      job51: [
        {city: '北京', n: 5, p10: 28, p25: 30, p50: 35, p75: 38, p90: 39, range: [19, 48]},
        {city: '上海', n: 7, p10: 10, p25: 13, p50: 18, p75: 22, p90: 24, range: [8, 32]},
        {city: '广州', n: 2, p10: 13, p25: 13, p50: 14, p75: 14, p90: 15, range: [10, 18]},
        {city: '深圳', n: 1, p10: 40, p25: 40, p50: 40, p75: 40, p90: 40, range: [35, 45]},
        {city: '武汉', n: 2, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [8, 17]},
        {city: '南京', n: 1, p10: 10, p25: 10, p50: 10, p75: 10, p90: 10, range: [8, 12]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 31},
      {tag: 'AI', count: 25},
      {tag: 'Java', count: 22},
      {tag: 'MySQL', count: 21},
      {tag: 'CI/CD', count: 16},
      {tag: 'C++', count: 11},
      {tag: 'Golang', count: 10},
      {tag: 'Spring', count: 10},
      {tag: 'Redis', count: 9},
      {tag: 'Docker', count: 8},
      {tag: 'DevOps', count: 8},
      {tag: 'SpringCloud', count: 7},
      {tag: 'Kubernetes', count: 5},
      {tag: 'coding', count: 5},
      {tag: 'Django', count: 5},
      {tag: 'C', count: 4},
      {tag: 'Shell', count: 4},
      {tag: 'Agent', count: 4},
      {tag: '企业内部技术项目管理', count: 3},
      {tag: 'AI产品', count: 3},
    ],
  },
  'backend': {
    cities: {
      boss: [
        {city: '北京', n: 106, p10: 12, p25: 15, p50: 17, p75: 22, p90: 25, range: [11, 30]},
        {city: '上海', n: 305, p10: 12, p25: 14, p50: 16, p75: 20, p90: 28, range: [10, 35]},
        {city: '广州', n: 92, p10: 10, p25: 12, p50: 16, p75: 20, p90: 22, range: [9, 28]},
        {city: '深圳', n: 111, p10: 12, p25: 14, p50: 16, p75: 21, p90: 30, range: [10, 35]},
        {city: '杭州', n: 83, p10: 12, p25: 14, p50: 16, p75: 22, p90: 25, range: [10, 30]},
        {city: '成都', n: 183, p10: 10, p25: 12, p50: 14, p75: 18, p90: 22, range: [8, 30]},
        {city: '武汉', n: 76, p10: 10, p25: 10, p50: 12, p75: 16, p90: 22, range: [8, 30]},
        {city: '重庆', n: 90, p10: 7, p25: 9, p50: 11, p75: 15, p90: 18, range: [6, 24]},
      ],
      job51: [
        {city: '北京', n: 58, p10: 12, p25: 14, p50: 16, p75: 26, p90: 36, range: [9, 45]},
        {city: '上海', n: 62, p10: 14, p25: 15, p50: 16, p75: 19, p90: 27, range: [10, 33]},
        {city: '广州', n: 50, p10: 11, p25: 13, p50: 15, p75: 19, p90: 23, range: [10, 26]},
        {city: '深圳', n: 72, p10: 12, p25: 15, p50: 16, p75: 19, p90: 22, range: [10, 25]},
        {city: '杭州', n: 50, p10: 11, p25: 12, p50: 15, p75: 18, p90: 34, range: [10, 40]},
        {city: '成都', n: 70, p10: 8, p25: 12, p50: 15, p75: 20, p90: 25, range: [6, 32]},
        {city: '武汉', n: 57, p10: 10, p25: 12, p50: 12, p75: 15, p90: 18, range: [8, 20]},
        {city: '南京', n: 40, p10: 10, p25: 12, p50: 14, p75: 15, p90: 22, range: [8, 28]},
        {city: '西安', n: 39, p10: 11, p25: 12, p50: 14, p75: 16, p90: 16, range: [8, 20]},
        {city: '重庆', n: 28, p10: 7, p25: 9, p50: 10, p75: 14, p90: 19, range: [6, 24]},
      ],
    },
    bossTags: [
      {tag: 'Java', count: 863},
      {tag: 'MySQL', count: 752},
      {tag: 'Spring', count: 632},
      {tag: 'SpringCloud', count: 500},
      {tag: 'Redis', count: 367},
      {tag: 'MyBatis', count: 223},
      {tag: 'Python', count: 193},
      {tag: 'Oracle', count: 168},
      {tag: 'Kafka', count: 123},
      {tag: 'Docker', count: 90},
      {tag: 'PostgreSQL', count: 75},
      {tag: 'Golang', count: 74},
      {tag: 'MongoDB', count: 73},
      {tag: 'SQL', count: 68},
      {tag: 'AI', count: 64},
      {tag: 'C++', count: 61},
      {tag: 'JVM', count: 59},
      {tag: 'C', count: 43},
      {tag: 'Nginx', count: 41},
      {tag: 'Dubbo', count: 39},
    ],
  },
  'agents': {
    cities: {
      boss: [
        {city: '北京', n: 143, p10: 12, p25: 14, p50: 16, p75: 22, p90: 29, range: [10, 35]},
        {city: '上海', n: 332, p10: 13, p25: 16, p50: 20, p75: 30, p90: 38, range: [11, 50]},
        {city: '广州', n: 78, p10: 10, p25: 12, p50: 16, p75: 21, p90: 30, range: [8, 35]},
        {city: '深圳', n: 57, p10: 10, p25: 12, p50: 16, p75: 22, p90: 27, range: [8, 35]},
        {city: '杭州', n: 91, p10: 10, p25: 13, p50: 18, p75: 22, p90: 30, range: [9, 40]},
        {city: '成都', n: 195, p10: 8, p25: 10, p50: 14, p75: 20, p90: 25, range: [6, 30]},
        {city: '武汉', n: 89, p10: 7, p25: 10, p50: 12, p75: 16, p90: 22, range: [6, 30]},
        {city: '重庆', n: 87, p10: 6, p25: 8, p50: 12, p75: 16, p90: 24, range: [5, 30]},
      ],
      job51: [
        {city: '北京', n: 85, p10: 11, p25: 15, p50: 22, p75: 35, p90: 42, range: [8, 50]},
        {city: '上海', n: 122, p10: 12, p25: 16, p50: 21, p75: 30, p90: 38, range: [10, 50]},
        {city: '广州', n: 70, p10: 8, p25: 11, p50: 15, p75: 20, p90: 29, range: [7, 32]},
        {city: '深圳', n: 103, p10: 12, p25: 15, p50: 20, p75: 26, p90: 40, range: [9, 45]},
        {city: '杭州', n: 79, p10: 12, p25: 15, p50: 22, p75: 30, p90: 46, range: [10, 60]},
        {city: '成都', n: 82, p10: 9, p25: 11, p50: 13, p75: 18, p90: 25, range: [7, 30]},
        {city: '武汉', n: 75, p10: 6, p25: 8, p50: 14, p75: 20, p90: 25, range: [5, 30]},
        {city: '南京', n: 58, p10: 10, p25: 13, p50: 18, p75: 27, p90: 30, range: [8, 40]},
        {city: '西安', n: 55, p10: 7, p25: 9, p50: 12, p75: 16, p90: 22, range: [6, 30]},
        {city: '重庆', n: 65, p10: 4, p25: 9, p50: 14, p75: 22, p90: 31, range: [4, 38]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 626},
      {tag: 'MySQL', count: 361},
      {tag: 'Django', count: 202},
      {tag: 'Java', count: 166},
      {tag: 'Redis', count: 161},
      {tag: 'Flask', count: 122},
      {tag: 'Docker', count: 114},
      {tag: 'PyTorch', count: 91},
      {tag: 'C++', count: 72},
      {tag: 'AI', count: 70},
      {tag: 'PostgreSQL', count: 69},
      {tag: 'MongoDB', count: 68},
      {tag: 'Golang', count: 66},
      {tag: 'Agent', count: 66},
      {tag: 'Pandas', count: 66},
      {tag: '大模型', count: 61},
      {tag: 'Numpy', count: 55},
      {tag: 'Oracle', count: 50},
      {tag: '爬虫经验', count: 41},
      {tag: 'C', count: 39},
    ],
  },
};
