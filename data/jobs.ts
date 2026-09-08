/** 单个招聘平台的分口径统计 */
export type PlatformStat = {
  platform: 'boss' | 'job51' | 'kanzhun';
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
 * 数据来源：BOSS 直聘公开岗位信息的聚合统计（2026-09-07 采集，全国口径，546 份去重后样本），
 * 不含公司信息与岗位原文；已过滤已失效/代招/实习及非本路线岗位（硬件、销售、现场运维等）。
 * 薪资区间为样本 P10–P90，中位数为各岗位薪资中点值的中位数。
 * platforms 为按招聘平台分口径的统计；顶层 salaryRange/salaryMedian/sampleSize 为各平台合并口径。
 * devops 与 ai-coding 阶段样本口径不足，暂保留示例数据（待补采）。
 * 递进规则：第 N 阶段岗位要求 = 本阶段新增技能 + 第 1..N-1 阶段全部技能。
 */
export const jobs: Record<string, UnitJobs> = {
  agents: {
    emoji: '🤖',
    title: 'Agents 应用开发能力',
    stage: 1,
    positions: ['Python 开发工程师', 'AI Agent 开发工程师', '大模型应用开发工程师'],
    skills: ['Python', 'PostgreSQL', 'LangChain', 'FastAPI', 'asyncio'],
    salaryRange: [5, 35],
    salaryMedian: 14,
    sampleSize: 76,
    updatedAt: '2026-09-07',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 76,
        salaryRange: [5, 35],
        salaryMedian: 14,
        updatedAt: '2026-09-07',
      },
    ],
  },
  backend: {
    emoji: '⚙️',
    title: '后端开发能力',
    stage: 2,
    positions: ['Java 开发工程师', '后端开发工程师', '微服务架构师'],
    skills: ['Java', 'Spring Boot', 'Spring Cloud', 'Redis'],
    salaryRange: [8, 30],
    salaryMedian: 13,
    sampleSize: 96,
    updatedAt: '2026-09-07',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 96,
        salaryRange: [8, 30],
        salaryMedian: 13,
        updatedAt: '2026-09-07',
      },
    ],
  },
  devops: {
    emoji: '☁️',
    title: '运维和云计算能力',
    stage: 3,
    positions: ['运维工程师', 'SRE 工程师', '云平台工程师'],
    skills: ['Linux', 'Docker', 'Kubernetes', 'CI/CD'],
    salaryRange: [14, 28],
    salaryMedian: 18,
    sampleSize: 0,
    updatedAt: '示例数据（待补采）',
    platforms: [],
  },
  'ai-coding': {
    emoji: '✨',
    title: '高效 AI 编程能力',
    stage: 4,
    positions: ['AI 辅助开发工程师', '研发效能工程师'],
    skills: ['Claude Code', '提示工程', 'AI 工作流'],
    salaryRange: [18, 35],
    salaryMedian: 25,
    sampleSize: 0,
    updatedAt: '示例数据（待补采）',
    platforms: [],
  },
  fullstack: {
    emoji: '🏗️',
    title: '企业级全栈项目',
    stage: 5,
    positions: ['全栈工程师', '技术负责人'],
    skills: ['前后端全栈', '架构设计', '项目管理'],
    salaryRange: [9, 60],
    salaryMedian: 25,
    sampleSize: 30,
    updatedAt: '2026-09-07',
    platforms: [
      {
        platform: 'boss',
        label: 'BOSS 直聘',
        sampleSize: 30,
        salaryRange: [9, 60],
        salaryMedian: 25,
        updatedAt: '2026-09-07',
      },
    ],
  },
};
