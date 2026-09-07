import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const config: Config = {
  title: 'AI 大全栈 · 配套交互课程',
  tagline: '六个单元 · 一条从 Agents 开发到企业级全栈交付的学习路线',
  favicon: 'img/avatar.png',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  themes: ['@docusaurus/theme-mermaid', '@easyops-cn/docusaurus-search-local'],
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh'],
  },

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    faster: false, // 禁用 Rspack（dev 服务器会 panic，稳定性优先）
  },

  // Set the production url of your site here
  url: 'https://doc.zhangpan.online',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'zhangpanonline', // Usually your GitHub org/user name.
  projectName: 'doc', // Usually your repo name.

  onBrokenLinks: 'throw',

  headTags: [
    {
      tagName: 'meta',
      attributes: {
        name: 'description',
        content: 'AI 大全栈学习路线配套交互课程站：Agents 应用开发 / 后端 / 运维云 / 高效 AI 编程 / 企业级全栈项目 / 就业指导六大单元 + 公共课程，每课配套文档、互动测验与实战作业。',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: 'AI 大全栈学习路线配套交互课程站：Agents 应用开发 / 后端 / 运维云 / 高效 AI 编程 / 企业级全栈项目 / 就业指导六大单元 + 公共课程，每课配套文档、互动测验与实战作业。',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'twitter:card',
        content: 'summary',
      },
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  themeConfig: {
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 6,
    },
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'ZP',
      logo: {
        alt: 'AI 大全栈',
        src: 'img/avatar.png',
      },
      items: [
        {
          to: '/agents/',
          label: 'Agents 应用开发能力',
          position: 'left',
        },
        {
          to: '/backend/',
          label: '后端开发能力',
          position: 'left',
        },
        {
          to: '/devops/',
          label: '运维和云计算能力',
          position: 'left',
        },
        {
          to: '/ai-coding/',
          label: '高效 AI 编程能力',
          position: 'left',
        },
        {
          to: '/fullstack/',
          label: '企业级全栈项目',
          position: 'left',
        },
        {
          to: '/career/',
          label: '就业指导',
          position: 'left',
        },
        {
          to: '/jobs/',
          label: '岗位地图',
          position: 'left',
        },
      ],
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
