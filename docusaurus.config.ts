import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
const docList = [
  {
    path: 'interview',
    title: 'Interview'
  },
  {
    path: 'nest',
    title: 'NestJS'
  },
  {
    path: 'postgre_sql',
    title: 'PostgreSQL'
  },
  {
    path: 'python',
    title: 'Python'
  },
]
const config: Config = {
  title: 'Doc',
  tagline: '前端技术文档与知识沉淀',
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
        content: '个人前端技术文档站 - TypeScript、Vue、React、NestJS、PostgreSQL 等技术笔记与面试题库',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:description',
        content: '个人前端技术文档站 - TypeScript、Vue、React、NestJS、PostgreSQL 等技术笔记与面试题库',
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

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './docs/sidebars.ts',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          editUrl:
            'https://github.com/zhangpanonline/enterprise-admin/tree/main/apps/doc/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    ...docList.map(({ path }) => [
      '@docusaurus/plugin-content-docs',
      {
        id: `${path}Id`,
        path,
        routeBasePath: path,
        sidebarPath: `./${path}/sidebars.ts`,
        editUrl:
          `https://github.com/zhangpanonline/enterprise-admin/tree/main/apps/doc/${path}`,
      },
    ])
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
        alt: 'My Site Logo',
        src: 'img/avatar.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'sidebarId',
          position: 'left',
          label: 'WebSite',
        },
        ...docList.map(({ path, title }) => ({
          type: 'docSidebar',
          sidebarId: 'sidebarId',
          docsPluginId: `${path}Id`,
          position: 'left' as 'left' | 'right',
          label: title,
        })),
        {to: 'blog', label: 'Blog', position: 'left'},
        {to: 'download', label: '资源下载', position: 'left'},
        {
          href: 'https://github.com/zhangpanonline/enterprise-admin/tree/main/apps/doc',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: 'WebSite',
              to: '/docs/dir',
            },
            {
              label: 'Interview',
              to: '/interview/vue3/vue',
            },
            {
              label: 'NestJS',
              to: '/nest/Nest 核心概念',
            },
            {
              label: 'PostgreSQL',
              to: '/postgre_sql/SQL',
            },
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: '资源下载',
              to: '/download',
            },
          ],
        },
        {
          title: '网站',
          items: ['main', 'vue.main', 'next.main', 'nuxt.main', 'vercel.api', 'render.api'].map(path => ({
            label: path,
            href: `https://${path}.zhangpan.online`,
          })),
        },
        {
          title: '其它',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/zhangpanonline/enterprise-admin',
            },
            {
              label: '浏览器插件',
              href: 'https://chromewebstore.google.com/detail/crxzp/cldfhecabiccgemiendkpdckcahicbpc?hl=zh-CN&utm_source=ext_sidebar',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} <a target="__blank" href="https://doc.zhangpan.online" >ZhangPan</a>. Built with <a target="__blank" href="https://docusaurus.io/" >Docusaurus</a>. Deploy in <a target="__blank" href="https://vercel.com/" >Vercel</a>.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
