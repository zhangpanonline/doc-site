import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';
import {courses} from './data/courses';

// 课程侧边栏 = 平铺一级菜单：顶部课程名标题 + 该课程全部节。
// 课程卡片页（单元首页）不显示侧边栏（displayed_sidebar: null）；
// 课程视图只显示当前课程的节，见 docs/adr/0001-渐进式课程导航.md。
const sidebars: SidebarsConfig = {};

for (const c of courses) {
  sidebars[c.sidebar] = [
    {
      type: 'html',
      value: `<div class="menu-course-title">${c.name}</div>`,
      defaultStyle: false,
    },
    ...c.sections.map(s => s.id),
  ];
}

// 岗位地图：不属于六个学习单元的板块，保持原平铺列表
sidebars.jobs = ['jobs/agents', 'jobs/backend', 'jobs/devops', 'jobs/ai-coding', 'jobs/fullstack'];

// 数据库官方文档拓展（非渡一课程）：分组标题标注来源。
// 追加到所有「数据库」课程侧边栏（common / agentsDatabase / backendDatabase），
// 用户从任意单元点进数据库课程，左侧菜单都能看到完整两分组。
type SidebarItem = string | {type: string; value: string; defaultStyle: boolean};
const databaseExt: SidebarItem[] = [
  {
    type: 'html',
    value: '<div class="menu-course-title">🔖 数据库 · PostgreSQL 官方文档拓展</div>',
    defaultStyle: false,
  },
  'common/database-pg/pg-01-架构基础',
  'common/database-pg/pg-02-RETURNING与UPSERT',
  'common/database-pg/pg-03-子查询与集合运算',
  'common/database-pg/pg-04-CTE与递归查询',
  'common/database-pg/pg-05-数据类型-基础',
  'common/database-pg/pg-06-数据类型-数组与jsonb',
  'common/database-pg/pg-07-函数与窗口函数',
  'common/database-pg/pg-08-索引进阶',
  'common/database-pg/pg-09-全文检索',
  'common/database-pg/pg-10-显式锁与死锁',
  'common/database-pg/pg-11-EXPLAIN进阶',
  'common/database-pg/pg-12-客户端认证',
  'common/database-pg/pg-13-角色与权限',
  'common/database-pg/pg-14-备份与恢复',
  'common/database-pg/pg-15-日常维护',
  'common/database-pg/pg-16-服务器配置',
];

for (const name of ['common', 'agentsDatabase', 'backendDatabase']) {
  (sidebars[name] as SidebarItem[]).push(...databaseExt);
}

export default sidebars;
