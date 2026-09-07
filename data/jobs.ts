export type UnitJobs = {
  emoji: string;
  title: string;
  /** 学习路线阶段序号（递进关系，本阶段要求默认包含之前所有阶段） */
  stage: number;
  /** 学完该单元可应聘的岗位方向 */
  positions: string[];
  /** 本单元新增的岗位技能要求（此前单元的技能默认已掌握） */
  skills: string[];
  /** 常见薪资区间（K/月） */
  salaryRange: [number, number];
  /** 薪资中位数（K/月） */
  salaryMedian: number;
  /** 样本岗位数（0 = 示例数据，待采集） */
  sampleSize: number;
  updatedAt: string;
};

/**
 * 岗位地图数据（聚合统计，按学习路线递进）
 * 数据来源：BOSS 直聘公开岗位信息的聚合统计，不含公司信息与岗位原文。
 * 当前为示例数据（sampleSize: 0），待用 boss-crawler-skill 采集后替换。
 * 递进规则：第 N 阶段岗位要求 = 本阶段新增技能 + 第 1..N-1 阶段全部技能。
 */
export const jobs: Record<string, UnitJobs> = {
  agents: {
    emoji: '🤖',
    title: 'Agents 应用开发能力',
    stage: 1,
    positions: ['Python 开发工程师', 'AI Agent 开发工程师', '大模型应用开发工程师'],
    skills: ['Python', 'PostgreSQL', 'LangChain', 'FastAPI', 'asyncio'],
    salaryRange: [15, 35],
    salaryMedian: 22,
    sampleSize: 0,
    updatedAt: '示例数据',
  },
  backend: {
    emoji: '⚙️',
    title: '后端开发能力',
    stage: 2,
    positions: ['Java 开发工程师', '后端开发工程师', '微服务架构师'],
    skills: ['Java', 'Spring Boot', 'Spring Cloud', 'Redis'],
    salaryRange: [15, 30],
    salaryMedian: 20,
    sampleSize: 0,
    updatedAt: '示例数据',
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
    updatedAt: '示例数据',
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
    updatedAt: '示例数据',
  },
  fullstack: {
    emoji: '🏗️',
    title: '企业级全栈项目',
    stage: 5,
    positions: ['全栈工程师', '技术负责人'],
    skills: ['前后端全栈', '架构设计', '项目管理'],
    salaryRange: [20, 40],
    salaryMedian: 28,
    sampleSize: 0,
    updatedAt: '示例数据',
  },
};
