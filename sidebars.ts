import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

function placeholderCategory(order: string, label: string, unitSlug: string) {
  return {
    type: 'category' as const,
    label: `${order}. ${label}`,
    collapsible: true,
    collapsed: true,
    items: [`${unitSlug}/${label}/index`],
  };
}

// 公共课程在单元侧边栏中渲染为完整分类：章节指向本单元内的包装页（内容导入自公共源文档），
// 用户点击章节时路由与左侧菜单都留在本单元，感知不到跨板块
function databaseCategory(unitSlug: string, order?: string) {
  const sections = [
    'PostgreSQL安装',
    'DDL',
    '表间关系',
    'DML',
    '事务',
    '索引',
    '拓展知识',
  ];
  return {
    type: 'category' as const,
    label: order ? `${order}. 数据库` : '数据库',
    collapsible: true,
    collapsed: true,
    items: sections.map(s => `${unitSlug}/database/${s}`),
  };
}

const sidebars: SidebarsConfig = {
  agents: [
    {
      type: 'category',
      label: '01. Python 语言核心',
      collapsible: true,
      collapsed: true,
      items: [
        'agents/python/必看导言',
        'agents/python/python环境安装',
        'agents/python/python基本语法',
        'agents/python/容器类型',
        'agents/python/函数',
        'agents/python/作用域',
        'agents/python/lambda表达式',
        'agents/python/类和对象',
        'agents/python/对象的类型',
        'agents/python/对象的创建过程',
        'agents/python/可调用对象',
        'agents/python/元类',
        'agents/python/装饰器',
        'agents/python/魔术方法',
        'agents/python/描述符',
        'agents/python/异常处理',
        'agents/python/迭代器与生成器',
        'agents/python/上下文管理器',
        'agents/python/ABC',
        'agents/python/类型标注',
        'agents/python/模块化',
        'agents/python/标准库',
        'agents/python/第三方库',
        'agents/python/事件循环',
        'agents/python/Future类',
        'agents/python/协程 Coroutine',
        'agents/python/异步编程',
        'agents/python/多线程与多进程',
        'agents/python/构建发布',
        'agents/python/项目管理工具',
        'agents/python/monorepo',
        'agents/python/断点调试',
      ],
    },
    databaseCategory('agents', '02'),
    placeholderCategory('03', 'Python框架', 'agents'),
    placeholderCategory('04', '数据科学工具包', 'agents'),
    placeholderCategory('05', 'Agents底层逻辑', 'agents'),
    placeholderCategory('06', 'LangGraph工作流开发', 'agents'),
    placeholderCategory('07', 'LangChain + DeepAgent 开发实战', 'agents'),
    placeholderCategory('08', 'RAG知识库开发实战', 'agents'),
    placeholderCategory('09', 'Dify平台实战应用', 'agents'),
    placeholderCategory('10', '大模型微调实战', 'agents'),
  ],
  backend: [
    placeholderCategory('01', 'Java语言精讲', 'backend'),
    databaseCategory('backend', '02'),
    placeholderCategory('03', 'OAuth2', 'backend'),
    placeholderCategory('04', 'RBAC权限模型', 'backend'),
    placeholderCategory('05', '单体系统和Spring Boot', 'backend'),
    placeholderCategory('06', '微服务架构和Spring Cloud', 'backend'),
    placeholderCategory('07', '主流中间件与框架', 'backend'),
  ],
  devops: [
    placeholderCategory('01', 'Linux与运维基础实战', 'devops'),
    placeholderCategory('02', 'Nginx与应用服务部署', 'devops'),
    placeholderCategory('03', 'Docker容器化与CI/CD发布', 'devops'),
    placeholderCategory('04', '云平台架构与安全治理', 'devops'),
    placeholderCategory('05', '监控告警与高可用优化', 'devops'),
  ],
  'ai-coding': [
    placeholderCategory('01', 'AI Coding', 'ai-coding'),
  ],
  fullstack: [
    placeholderCategory('01', '智能客服与工单协同解决方案', 'fullstack'),
    placeholderCategory('02', '企业知识治理与智能检索运管平台', 'fullstack'),
    placeholderCategory('03', '多模态内容安全与智能审核治理平台', 'fullstack'),
  ],
  career: [
    placeholderCategory('01', '就业指导', 'career'),
  ],
  common: [databaseCategory('common')],
  jobs: [
    'jobs/agents',
    'jobs/backend',
    'jobs/devops',
    'jobs/ai-coding',
    'jobs/fullstack',
  ],
};

export default sidebars;
