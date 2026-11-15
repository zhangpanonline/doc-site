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

export const STAT_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆', '长沙'] as const;

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
        {city: '南京', n: 51, p10: 10, p25: 12, p50: 14, p75: 18, p90: 25, range: [8, 30]},
        {city: '西安', n: 41, p10: 9, p25: 10, p50: 12, p75: 15, p90: 18, range: [8, 20]},
        {city: '重庆', n: 31, p10: 6, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
        {city: '长沙', n: 51, p10: 8, p25: 9, p50: 10, p75: 12, p90: 18, range: [6, 22]},
      ],
      job51: [
        {city: '北京', n: 24, p10: 11, p25: 14, p50: 16, p75: 30, p90: 38, range: [8, 47]},
        {city: '上海', n: 44, p10: 13, p25: 15, p50: 19, p75: 24, p90: 30, range: [10, 39]},
        {city: '广州', n: 27, p10: 10, p25: 12, p50: 15, p75: 17, p90: 27, range: [8, 36]},
        {city: '深圳', n: 31, p10: 10, p25: 14, p50: 16, p75: 20, p90: 26, range: [8, 35]},
        {city: '杭州', n: 27, p10: 11, p25: 15, p50: 18, p75: 20, p90: 27, range: [10, 33]},
        {city: '成都', n: 32, p10: 8, p25: 10, p50: 14, p75: 20, p90: 22, range: [6, 30]},
        {city: '武汉', n: 29, p10: 10, p25: 12, p50: 15, p75: 18, p90: 21, range: [9, 25]},
        {city: '南京', n: 24, p10: 11, p25: 12, p50: 14, p75: 19, p90: 22, range: [8, 28]},
        {city: '西安', n: 10, p10: 12, p25: 13, p50: 15, p75: 16, p90: 18, range: [10, 21]},
        {city: '重庆', n: 15, p10: 7, p25: 12, p50: 16, p75: 21, p90: 23, range: [5, 30]},
        {city: '长沙', n: 7, p10: 12, p25: 12, p50: 12, p75: 18, p90: 22, range: [9, 25]},
      ],
    },
    bossTags: [
      {tag: 'Spring', count: 226},
      {tag: 'Java', count: 200},
      {tag: 'MySQL', count: 136},
      {tag: 'Vue', count: 119},
      {tag: 'Python', count: 111},
      {tag: 'Redis', count: 97},
      {tag: 'JavaScript', count: 93},
      {tag: 'MongoDB', count: 65},
      {tag: 'React', count: 62},
      {tag: 'TypeScript', count: 43},
      {tag: 'HTML', count: 42},
      {tag: 'SpringCloud', count: 40},
      {tag: 'AI', count: 38},
      {tag: 'MyBatis', count: 36},
      {tag: 'Node.js', count: 35},
      {tag: 'CSS', count: 32},
      {tag: 'Golang', count: 31},
      {tag: 'Docker', count: 28},
      {tag: 'PHP', count: 22},
      {tag: '全栈侧重前端', count: 21},
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
        {city: '南京', n: 53, p10: 7, p25: 10, p50: 12, p75: 22, p90: 30, range: [6, 35]},
        {city: '西安', n: 60, p10: 7, p25: 10, p50: 12, p75: 19, p90: 22, range: [6, 30]},
        {city: '重庆', n: 50, p10: 4, p25: 6, p50: 8, p75: 18, p90: 22, range: [4, 29]},
        {city: '长沙', n: 35, p10: 6, p25: 8, p50: 10, p75: 14, p90: 19, range: [5, 22]},
      ],
      job51: [
        {city: '北京', n: 46, p10: 9, p25: 11, p50: 15, p75: 20, p90: 30, range: [8, 34]},
        {city: '上海', n: 50, p10: 10, p25: 13, p50: 17, p75: 22, p90: 33, range: [8, 40]},
        {city: '广州', n: 28, p10: 10, p25: 11, p50: 14, p75: 17, p90: 20, range: [8, 23]},
        {city: '深圳', n: 57, p10: 8, p25: 9, p50: 12, p75: 19, p90: 32, range: [6, 40]},
        {city: '杭州', n: 37, p10: 7, p25: 9, p50: 12, p75: 15, p90: 23, range: [5, 27]},
        {city: '成都', n: 39, p10: 6, p25: 7, p50: 8, p75: 12, p90: 20, range: [5, 25]},
        {city: '武汉', n: 42, p10: 6, p25: 8, p50: 10, p75: 14, p90: 19, range: [6, 23]},
        {city: '南京', n: 41, p10: 6, p25: 9, p50: 12, p75: 16, p90: 20, range: [6, 25]},
        {city: '西安', n: 25, p10: 7, p25: 7, p50: 8, p75: 16, p90: 19, range: [5, 21]},
        {city: '重庆', n: 30, p10: 6, p25: 6, p50: 7, p75: 12, p90: 13, range: [5, 16]},
        {city: '长沙', n: 17, p10: 5, p25: 7, p50: 8, p75: 9, p90: 14, range: [4, 16]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 151},
      {tag: 'Shell', count: 140},
      {tag: 'Kubernetes', count: 103},
      {tag: 'DevOps', count: 98},
      {tag: 'Docker', count: 91},
      {tag: 'Java', count: 84},
      {tag: 'MySQL', count: 65},
      {tag: 'Golang', count: 52},
      {tag: 'SRE', count: 47},
      {tag: 'Redis', count: 42},
      {tag: 'Oracle', count: 42},
      {tag: 'Nginx', count: 39},
      {tag: '桌面运维', count: 24},
      {tag: 'Linux', count: 22},
      {tag: 'Elasticsearch', count: 21},
      {tag: 'CI/CD', count: 21},
      {tag: 'Ansible', count: 16},
      {tag: 'Salt', count: 15},
      {tag: 'Puppet', count: 15},
      {tag: 'Prometheus', count: 13},
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
        {city: '南京', n: 8, p10: 12, p25: 24, p50: 34, p75: 39, p90: 60, range: [9, 75]},
        {city: '西安', n: 8, p10: 12, p25: 13, p50: 22, p75: 28, p90: 30, range: [11, 36]},
        {city: '重庆', n: 1, p10: 20, p25: 20, p50: 20, p75: 20, p90: 20, range: [15, 25]},
        {city: '长沙', n: 6, p10: 19, p25: 20, p50: 22, p75: 36, p90: 68, range: [14, 80]},
      ],
      job51: [
        {city: '北京', n: 5, p10: 28, p25: 30, p50: 35, p75: 38, p90: 39, range: [19, 48]},
        {city: '上海', n: 7, p10: 10, p25: 13, p50: 18, p75: 22, p90: 24, range: [8, 32]},
        {city: '广州', n: 2, p10: 13, p25: 13, p50: 14, p75: 14, p90: 15, range: [10, 18]},
        {city: '深圳', n: 1, p10: 40, p25: 40, p50: 40, p75: 40, p90: 40, range: [35, 45]},
        {city: '武汉', n: 2, p10: 12, p25: 12, p50: 12, p75: 12, p90: 12, range: [8, 17]},
        {city: '南京', n: 1, p10: 10, p25: 10, p50: 10, p75: 10, p90: 10, range: [8, 12]},
        {city: '长沙', n: 1, p10: 15, p25: 15, p50: 15, p75: 15, p90: 15, range: [12, 18]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 35},
      {tag: 'Java', count: 27},
      {tag: 'AI', count: 27},
      {tag: 'MySQL', count: 24},
      {tag: 'CI/CD', count: 16},
      {tag: 'Spring', count: 13},
      {tag: 'Golang', count: 12},
      {tag: 'C++', count: 12},
      {tag: 'Redis', count: 9},
      {tag: 'SpringCloud', count: 9},
      {tag: 'Docker', count: 8},
      {tag: 'DevOps', count: 8},
      {tag: 'coding', count: 6},
      {tag: 'Kubernetes', count: 5},
      {tag: 'Django', count: 5},
      {tag: 'C', count: 4},
      {tag: 'Shell', count: 4},
      {tag: 'Agent', count: 4},
      {tag: 'ai', count: 4},
      {tag: 'AI产品', count: 4},
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
        {city: '南京', n: 106, p10: 10, p25: 12, p50: 16, p75: 21, p90: 29, range: [8, 35]},
        {city: '西安', n: 80, p10: 10, p25: 12, p50: 14, p75: 19, p90: 22, range: [9, 30]},
        {city: '重庆', n: 90, p10: 7, p25: 9, p50: 11, p75: 15, p90: 18, range: [6, 24]},
        {city: '长沙', n: 97, p10: 8, p25: 10, p50: 12, p75: 18, p90: 22, range: [6, 30]},
      ],
      job51: [
        {city: '北京', n: 58, p10: 12, p25: 14, p50: 16, p75: 26, p90: 36, range: [9, 45]},
        {city: '上海', n: 62, p10: 14, p25: 15, p50: 16, p75: 19, p90: 27, range: [10, 33]},
        {city: '广州', n: 50, p10: 11, p25: 13, p50: 15, p75: 19, p90: 23, range: [10, 26]},
        {city: '深圳', n: 72, p10: 12, p25: 15, p50: 16, p75: 19, p90: 22, range: [10, 25]},
        {city: '杭州', n: 50, p10: 11, p25: 12, p50: 15, p75: 18, p90: 34, range: [10, 40]},
        {city: '成都', n: 70, p10: 8, p25: 12, p50: 15, p75: 20, p90: 25, range: [6, 32]},
        {city: '武汉', n: 57, p10: 10, p25: 12, p50: 12, p75: 15, p90: 18, range: [8, 20]},
        {city: '南京', n: 57, p10: 10, p25: 12, p50: 15, p75: 16, p90: 22, range: [8, 29]},
        {city: '西安', n: 49, p10: 10, p25: 12, p50: 14, p75: 16, p90: 17, range: [8, 21]},
        {city: '重庆', n: 28, p10: 7, p25: 9, p50: 10, p75: 14, p90: 19, range: [6, 24]},
        {city: '长沙', n: 23, p10: 5, p25: 10, p50: 14, p75: 18, p90: 21, range: [4, 25]},
      ],
    },
    bossTags: [
      {tag: 'Java', count: 1104},
      {tag: 'MySQL', count: 940},
      {tag: 'Spring', count: 794},
      {tag: 'SpringCloud', count: 632},
      {tag: 'Redis', count: 467},
      {tag: 'MyBatis', count: 280},
      {tag: 'Python', count: 258},
      {tag: 'Oracle', count: 225},
      {tag: 'Kafka', count: 152},
      {tag: 'Docker', count: 119},
      {tag: 'C++', count: 103},
      {tag: 'Golang', count: 95},
      {tag: 'PostgreSQL', count: 95},
      {tag: 'MongoDB', count: 93},
      {tag: 'SQL', count: 91},
      {tag: 'JVM', count: 75},
      {tag: 'C', count: 74},
      {tag: 'AI', count: 71},
      {tag: 'Nginx', count: 59},
      {tag: 'Django', count: 48},
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
        {city: '南京', n: 86, p10: 10, p25: 12, p50: 18, p75: 25, p90: 30, range: [8, 40]},
        {city: '西安', n: 96, p10: 8, p25: 10, p50: 14, p75: 20, p90: 24, range: [6, 30]},
        {city: '重庆', n: 87, p10: 6, p25: 8, p50: 12, p75: 16, p90: 24, range: [5, 30]},
        {city: '长沙', n: 78, p10: 8, p25: 9, p50: 12, p75: 17, p90: 27, range: [6, 33]},
      ],
      job51: [
        {city: '北京', n: 85, p10: 11, p25: 15, p50: 22, p75: 35, p90: 42, range: [8, 50]},
        {city: '上海', n: 122, p10: 12, p25: 16, p50: 21, p75: 30, p90: 38, range: [10, 50]},
        {city: '广州', n: 70, p10: 8, p25: 11, p50: 15, p75: 20, p90: 29, range: [7, 32]},
        {city: '深圳', n: 103, p10: 12, p25: 15, p50: 20, p75: 26, p90: 40, range: [9, 45]},
        {city: '杭州', n: 79, p10: 12, p25: 15, p50: 22, p75: 30, p90: 46, range: [10, 60]},
        {city: '成都', n: 82, p10: 9, p25: 11, p50: 13, p75: 18, p90: 25, range: [7, 30]},
        {city: '武汉', n: 75, p10: 6, p25: 8, p50: 14, p75: 20, p90: 25, range: [5, 30]},
        {city: '南京', n: 70, p10: 10, p25: 15, p50: 19, p75: 27, p90: 32, range: [8, 40]},
        {city: '西安', n: 65, p10: 7, p25: 9, p50: 12, p75: 18, p90: 30, range: [6, 40]},
        {city: '重庆', n: 65, p10: 4, p25: 9, p50: 14, p75: 22, p90: 31, range: [4, 38]},
        {city: '长沙', n: 41, p10: 5, p25: 8, p50: 15, p75: 20, p90: 30, range: [4, 40]},
      ],
    },
    bossTags: [
      {tag: 'Python', count: 738},
      {tag: 'MySQL', count: 411},
      {tag: 'Django', count: 226},
      {tag: 'Java', count: 203},
      {tag: 'Redis', count: 187},
      {tag: 'Flask', count: 145},
      {tag: 'Docker', count: 140},
      {tag: 'PyTorch', count: 104},
      {tag: 'C++', count: 100},
      {tag: 'PostgreSQL', count: 90},
      {tag: 'Golang', count: 84},
      {tag: 'AI', count: 84},
      {tag: 'MongoDB', count: 82},
      {tag: 'Pandas', count: 76},
      {tag: '大模型', count: 75},
      {tag: 'Agent', count: 73},
      {tag: 'Oracle', count: 60},
      {tag: 'Numpy', count: 59},
      {tag: '爬虫经验', count: 51},
      {tag: 'C', count: 50},
    ],
  },
};
