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

export default sidebars;
