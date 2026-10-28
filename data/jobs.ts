/** 单个招聘平台的分口径统计 */
export type PlatformStat = {
  platform: 'boss' | 'job51' | 'liepin';
  /** 展示名 */
  label: string;
  sampleSize: number;
  salaryRange: [number, number];
  salaryMedian: number;
  updatedAt: string;
};

export type UnitJobs = {
  emoji: string;
  title: string;
  /** 学习路线阶段序号（递进关系，本阶段要求默认包含之前所有阶段） */
  stage: number;
  /** 学完该单元可应聘的岗位方向 */
  positions: string[];
  /** 本单元新增的岗位技能要求（此前单元的技能默认已掌握） */
  skills: string[];
  /** 常见薪资区间（K/月）——各平台合并口径 */
  salaryRange: [number, number];
  /** 薪资中位数（K/月）——各平台合并口径 */
  salaryMedian: number;
  /** 样本岗位数（0 = 示例数据，待补采） */
  sampleSize: number;
  updatedAt: string;
  /** 按招聘平台分口径的统计（未采集的平台不在列表） */
  platforms: PlatformStat[];
};

/**
 * 岗位地图数据（聚合统计，按学习路线递进）
 * 数据来源：各招聘平台公开岗位信息的聚合统计，不含公司信息与岗位原文。
 * - BOSS 直聘：逐城轮换口径（11 组岗位关键词 × 50 城；2026-09-28 起 50 批 = 每批 1 城防封控，已完成批次 1-10 北京/上海/广州/深圳/成都/杭州/重庆/苏州/武汉/西安）
 * - 前程无忧：10 城口径（北上广深杭蓉汉宁西渝，12 组岗位关键词），2026-09-28 全量扩采
 * - 猎聘：免登录 SPA 搜索口径（11 组岗位关键词，与 BOSS 批次同城对齐；卡片无发布时间，行业/规模按 cube_rules 归并）
 * 已过滤已失效/代招/实习及非本路线岗位（硬件、销售、现场运维、培训、数据标注等）。
 * 薪资区间为样本 P10–P90，中位数为各岗位薪资中点值的中位数。
 * platforms 为按招聘平台分口径的统计；顶层 salaryRange/salaryMedian/sampleSize 为各平台合并口径。
 * ai-coding 阶段仅采「研发效能/AI 辅助开发」类工程岗（职位名须含工程信号），前程无忧侧样本较少（20 份）。
 * 递进规则：第 N 阶段岗位要求 = 本阶段新增技能 + 第 1..N-1 阶段全部技能。
 * 分城市薪资与技能标签词频统计见 data/jobsStats.ts（由 boss-crawler 归档目录 city_stats.py 生成，勿手改）。
 */
export const jobs: Record<string, UnitJobs> = {
  agents: {
    emoji: '🤖',
    title: 'Agents 应用开发能力',
    stage: 1,
    positions: ['Python 开发工程师', 'AI Agent 开发工程师', '大模型应用开发工程师'],
    skills: ['Python', 'PostgreSQL', 'LangChain', 'FastAPI', 'asyncio'],
    salaryRange: [8, 60],
    salaryMedian: 20,
    sampleSize: 3218,
    updatedAt: '2026-10-28',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 1243,
        salaryRange: [7, 40],
        salaryMedian: 16,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'job51',
        label: '前程无忧',
        sampleSize: 872,
        salaryRange: [7, 45],
        salaryMedian: 18,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'liepin',
        label: '猎聘',
        sampleSize: 1103,
        salaryRange: [12, 80],
        salaryMedian: 30,
        updatedAt: '2026-10-28',
      },
    ],
  },
  backend: {
    emoji: '⚙️',
    title: '后端开发能力',
    stage: 2,
    positions: ['Java 开发工程师', '后端开发工程师', '微服务架构师'],
    skills: ['Java', 'Spring Boot', 'Spring Cloud', 'Redis'],
    salaryRange: [9, 40],
    salaryMedian: 17,
    sampleSize: 2666,
    updatedAt: '2026-10-28',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 1196,
        salaryRange: [9, 30],
        salaryMedian: 15,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'job51',
        label: '前程无忧',
        sampleSize: 571,
        salaryRange: [8, 30],
        salaryMedian: 15,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'liepin',
        label: '猎聘',
        sampleSize: 899,
        salaryRange: [11, 60],
        salaryMedian: 23,
        updatedAt: '2026-10-28',
      },
    ],
  },
  devops: {
    emoji: '☁️',
    title: '运维和云计算能力',
    stage: 3,
    positions: ['运维工程师', 'SRE 工程师', '云平台工程师'],
    skills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD'],
    salaryRange: [6, 50],
    salaryMedian: 16,
    sampleSize: 1878,
    updatedAt: '2026-10-28',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 788,
        salaryRange: [6, 45],
        salaryMedian: 15,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'job51',
        label: '前程无忧',
        sampleSize: 408,
        salaryRange: [5, 30],
        salaryMedian: 12,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'liepin',
        label: '猎聘',
        sampleSize: 682,
        salaryRange: [8, 60],
        salaryMedian: 22,
        updatedAt: '2026-10-28',
      },
    ],
  },
  'ai-coding': {
    emoji: '✨',
    title: '高效 AI 编程能力',
    stage: 4,
    positions: ['AI 辅助开发工程师', '研发效能工程师'],
    skills: ['Claude Code', '提示工程', 'AI 工作流'],
    salaryRange: [10, 90],
    salaryMedian: 30,
    sampleSize: 285,
    updatedAt: '2026-10-28',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 134,
        salaryRange: [10, 79],
        salaryMedian: 30,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'job51',
        label: '前程无忧',
        sampleSize: 20,
        salaryRange: [8, 46],
        salaryMedian: 22,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'liepin',
        label: '猎聘',
        sampleSize: 131,
        salaryRange: [15, 95],
        salaryMedian: 38,
        updatedAt: '2026-10-28',
      },
    ],
  },
  fullstack: {
    emoji: '🏗️',
    title: '企业级全栈项目',
    stage: 5,
    positions: ['全栈工程师', '技术负责人'],
    skills: ['前后端全栈', '架构设计', '项目管理'],
    salaryRange: [9, 45],
    salaryMedian: 18,
    sampleSize: 1389,
    updatedAt: '2026-10-28',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 633,
        salaryRange: [8, 35],
        salaryMedian: 16,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'job51',
        label: '前程无忧',
        sampleSize: 279,
        salaryRange: [8, 33],
        salaryMedian: 16,
        updatedAt: '2026-10-28',
      },
      {
        platform: 'liepin',
        label: '猎聘',
        sampleSize: 477,
        salaryRange: [11, 60],
        salaryMedian: 25,
        updatedAt: '2026-10-28',
      },
    ],
  },
};
