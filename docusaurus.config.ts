import {themes as prismThemes, type PrismTheme} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * 纸墨代码主题（亮色）：暖纸底 + 墨色语法注解。
 * 色板与 src/css/custom.css「纸墨 + 朱批」同源——朱砂关键词、黛绿字符串、
 * 靛青数字、焦茶函数名；正文字号下全部 ≥4.5:1 对比度。
 * 背景必须在此定义：prism 主题以内联样式注入，会盖过 CSS 里的背景设置。
 */
const paperInkTheme: PrismTheme = {
  plain: {color: '#2d2926', backgroundColor: '#f8f5ed'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#73695c', fontStyle: 'italic'}},
    {types: ['punctuation'], style: {color: '#6b6259'}},
    {types: ['keyword', 'atrule', 'selector', 'tag', 'important', 'regex'], style: {color: '#9d3b2c'}},
    {types: ['string', 'char', 'attr-value', 'url'], style: {color: '#1e6e5c'}},
    {types: ['number', 'boolean', 'symbol'], style: {color: '#2b5876'}},
    {types: ['function', 'class-name', 'attr-name'], style: {color: '#7a5200'}},
    {types: ['builtin'], style: {color: '#7c2d21'}},
    {types: ['operator', 'entity'], style: {color: '#6b6259'}},
    {types: ['inserted'], style: {color: '#2e7d32'}},
    {types: ['deleted'], style: {color: '#c0392b'}},
  ],
};

/**
 * 纸墨代码主题（深色）：牛皮纸深底 + 暖墨语法注解（A 方案配套）。
 * 赭石关键词、橄榄绿字符串、麦金函数名、雾蓝数字、珊瑚内建、
 * 暖灰斜体注释；在 #211d14 深底上全部 ≥4.5:1 对比度。
 */
const darkPaperInkTheme: PrismTheme = {
  plain: {color: '#eae3d2', backgroundColor: '#211d14'},
  styles: [
    {types: ['comment', 'prolog', 'doctype', 'cdata'], style: {color: '#9a917d', fontStyle: 'italic'}},
    {types: ['punctuation'], style: {color: '#a99f8a'}},
    {types: ['keyword', 'atrule', 'selector', 'tag', 'important', 'regex'], style: {color: '#e8855f'}},
    {types: ['string', 'char', 'attr-value', 'url'], style: {color: '#a9c477'}},
    {types: ['number', 'boolean', 'symbol'], style: {color: '#a8c0e0'}},
    {types: ['function', 'class-name', 'attr-name'], style: {color: '#e5c07b'}},
    {types: ['builtin'], style: {color: '#f2a080'}},
    {types: ['operator', 'entity'], style: {color: '#a99f8a'}},
    {types: ['inserted'], style: {color: '#7ecb8a'}},
    {types: ['deleted'], style: {color: '#e08b7a'}},
  ],
};

const config: Config = {
  title: 'AI 大全栈 · 配套交互课程',
  tagline: '六个单元 · 一条从 Agents 开发到企业级全栈交付的学习路线',
  favicon: 'img/avatar.png',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
    // future.v4 会把 mdx1Compat.admonitions 默认关掉（v4 移除了 ::: 语法），
    // 站点文档大量使用 :::note/:::tip——显式开启保留 MDX1 admonition 语法
    mdx1Compat: {
      admonitions: true,
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
        content: 'summary_large_image',
      },
    },
    {
      // 结构化数据：WebSite + 站内搜索，帮助搜索引擎理解站点、争取富摘要
      tagName: 'script',
      attributes: { type: 'application/ld+json' },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'AI 大全栈 · 配套交互课程',
        alternateName: 'ZP 课程站',
        url: 'https://doc.zhangpan.online/',
        description:
          'AI 大全栈学习路线配套交互课程站：Agents 应用开发 / 后端 / 运维云 / 高效 AI 编程 / 企业级全栈项目 / 就业指导六大单元，每课配套文档、互动测验与实战作业。',
        inLanguage: 'zh-CN',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://doc.zhangpan.online/search?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      }),
    },
    {
      // 沉浸模式首屏同步（与 src/theme/Root.tsx 的 ImmersiveToggle 配合）：
      // 这段内联脚本在 <head> 解析阶段执行，早于浏览器抓取 favicon，也早于
      // React 水合。favicon 按页面 URL 缓存，运行时改 link 不一定能让页签
      // 图标立即回落默认地球——在浏览器抓取之前就把 link 移除，整页加载时
      // 页签必然是默认地球；标题与隐藏类同步提前设置，进入沉浸模式时
      // 首屏无闪烁。
      tagName: 'script',
      attributes: {},
      innerHTML: `(function(){try{if(localStorage.getItem('immersive-mode')!=='1')return;}catch(e){return;}
document.documentElement.classList.add('immersive');
document.title='文档';
var l=document.querySelectorAll('link[rel~="icon"]'),i;for(i=0;i<l.length;i++)l[i].remove();
})();`,
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
    // 社交分享卡片（微信/朋友圈/社交平台链接预览图，1200×630 纸墨风格）
    image: 'img/social-card.png',
    navbar: {
      title: 'ZP',
      // 下滑隐藏、上滑显示（沉浸模式下由 html.immersive .navbar {display:none}
      // 覆盖，无论滚动方向都不展示）
      hideOnScroll: true,
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
      theme: paperInkTheme,
      darkTheme: darkPaperInkTheme,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
