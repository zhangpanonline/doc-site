/**
 * 课程定义：平铺侧边栏与「上次学到」记录共用的单一数据源。
 *
 * 一个 CourseDef = 一张可点击的课程卡片：
 * - sidebar：sidebars.ts 里为该课程生成的侧边栏名——课程视图左侧只平铺本课程的节（一级菜单）；
 * - sections：按学习顺序排列的节；id 为 Docusaurus 文档 id，href 仅在 slug 与 id 不一致时显式给出
 *   （路由去数字前缀、空格变连字符，如「协程 Coroutine」→ /agents/python/协程-Coroutine）。
 *
 * 公共课程（数据库）在各单元内是包装页：内容导入自 common 源文档，
 * 学员在单元内学习时路由与菜单都留在本单元，感知不到跨板块。
 * 新增课程时：在此登记 + 对应单元首页卡片加 courseKey + 章节页 frontmatter 声明 sidebar。
 */

export type CourseSection = {
  /** Docusaurus 文档 id，如 'agents/python/必看导言' */
  id: string;
  /** 页面 URL；默认 `/${id}`，slug 与 id 不一致时显式给出 */
  href?: string;
};

export type CourseDef = {
  /** 单元 slug（agents / backend / common） */
  unit: string;
  /** 课程 key，与课程卡片 courseKey、「上次学到」记录匹配 */
  key: string;
  /** 课程名（课程视图一级菜单顶部标题） */
  name: string;
  /** sidebars.ts 中的侧边栏名 */
  sidebar: string;
  /** 按学习顺序排列的节 */
  sections: CourseSection[];
};

export const sectionHref = (s: CourseSection): string => s.href ?? `/${s.id}`;

const PYTHON_NAMES = [
  '必看导言',
  'python环境安装',
  'python基本语法',
  '容器类型',
  '函数',
  '作用域',
  'lambda表达式',
  '类和对象',
  '对象的类型',
  '对象的创建过程',
  '可调用对象',
  '元类',
  '装饰器',
  '魔术方法',
  '描述符',
  '异常处理',
  '迭代器与生成器',
  '上下文管理器',
  'ABC',
  '类型标注',
  '模块化',
  '标准库',
  '第三方库',
  '事件循环',
  'Future类',
  '协程 Coroutine',
  '异步编程',
  '多线程与多进程',
  '构建发布',
  '项目管理工具',
  'monorepo',
  '断点调试',
];

const DB_NAMES = ['PostgreSQL安装', 'DDL', '表间关系', 'DML', '事务', '索引', '拓展知识'];

const pythonSections: CourseSection[] = PYTHON_NAMES.map(name => {
  const id = `agents/python/${name}`;
  // 路由约定：空格变连字符（docs/agents/python/26.协程 Coroutine.mdx 的 slug 覆盖）
  return name === '协程 Coroutine' ? {id, href: '/agents/python/协程-Coroutine'} : {id};
});

const databaseSections = (unit: string): CourseSection[] =>
  DB_NAMES.map(name => ({id: `${unit}/database/${name}`}));

export const courses: CourseDef[] = [
  {unit: 'agents', key: 'python', name: 'Python 语言核心', sidebar: 'agentsPython', sections: pythonSections},
  {unit: 'agents', key: 'database', name: '数据库', sidebar: 'agentsDatabase', sections: databaseSections('agents')},
  {unit: 'backend', key: 'database', name: '数据库', sidebar: 'backendDatabase', sections: databaseSections('backend')},
  {unit: 'common', key: 'database', name: '数据库', sidebar: 'common', sections: databaseSections('common')},
];
