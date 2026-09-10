import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import OriginalRoot from '@theme-original/Root';
import {courses, sectionHref} from '@site/data/courses';
// 代码手写等宽字体（霞鹜文楷 Mono GB 屏幕版）：unicode-range 分片，浏览器按需下载
import 'lxgw-wenkai-mono-gb-screen-webfont/fonts/style.css';

/** 沉浸模式下页签标题伪装成「文档」 */
const IMMERSIVE_TITLE = '文档';

/**
 * 沉浸模式开关（仅 PC）：阅读课程小节时一键隐藏左侧菜单与顶部导航栏。
 * - 只在存在文档侧边栏的页面显示按钮（SSR 下不渲染任何东西，effects 仅客户端执行）
 * - 状态持久化到 localStorage（immersive-mode），刷新/换页保持
 * - 沉浸期间页签标题改为「文档」、页签图标移除（浏览器回落成"未设置图标"的
 *   默认地球样式），退出时一并还原
 */
function ImmersiveToggle(): React.JSX.Element | null {
  const location = useLocation();
  const [on, setOn] = useState(() => {
    try {
      return localStorage.getItem('immersive-mode') === '1';
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);
  // 沉浸期间 Docusaurus 每次改页签标题都会被记录，退出时还原到这里
  const lastPageTitle = useRef<string | null>(null);
  // 沉浸期间被移除的 favicon link 元素及其原始 href（退出时原样插回，保留
  // Helmet 的 data-rh 标记，避免它后续再补一条重复 link）
  const iconOrigins = useRef(new Map<HTMLLinkElement, string>());

  useEffect(() => {
    setVisible(Boolean(document.querySelector('.theme-doc-sidebar-container')));
  }, [location.pathname]);

  useEffect(() => {
    const root = document.documentElement;

    // 三个 apply 全部幂等（状态已符合就跳过），观察器触发自身时不会死循环
    const applyClass = () => {
      const has = root.classList.contains('immersive');
      if (has !== on) root.classList.toggle('immersive', on);
    };
    const applyTitle = () => {
      if (on) {
        if (document.title !== IMMERSIVE_TITLE) {
          lastPageTitle.current = document.title;
          document.title = IMMERSIVE_TITLE;
        }
      } else if (lastPageTitle.current) {
        document.title = lastPageTitle.current;
        lastPageTitle.current = null;
      }
    };
    const applyIcon = () => {
      const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
      if (on) {
        // 直接移除 favicon link：浏览器回落成"未设置图标"的默认地球样式
        for (const el of links) {
          if (!iconOrigins.current.has(el)) {
            iconOrigins.current.set(el, el.href);
            el.remove();
          }
        }
      } else if (iconOrigins.current.size > 0) {
        // 退出：清掉 Helmet 在沉浸期间补插的重复 link，插回保存的原始元素
        const savedEls = new Set(iconOrigins.current.keys());
        for (const el of links) {
          if (!savedEls.has(el)) el.remove();
        }
        for (const [el] of iconOrigins.current) {
          if (!el.isConnected) document.head.appendChild(el);
        }
        iconOrigins.current.clear();
      }
    };
    const applyAll = () => {
      applyClass();
      applyTitle();
      applyIcon();
    };

    applyAll();
    try {
      localStorage.setItem('immersive-mode', on ? '1' : '0');
    } catch {
      // localStorage 不可用（隐私模式等）时仅本次会话生效
    }

    // Docusaurus 用 react-helmet-async 管理 <html> 的 class、<title> 与 <head> 里的
    // link，水合与路由切换时会把这些节点整体覆写回它渲染的版本，抹掉上面的直接修改
    // （首屏水合恰晚于本 effect 几毫秒——旧版「第一下点击无效」的根因）。
    // 观察这三个目标，一旦被覆写立即重新对齐。
    const mo = new MutationObserver(applyAll);
    mo.observe(root, {attributes: true, attributeFilter: ['class']});
    mo.observe(document.head, {childList: true, subtree: true});
    const titleEl = document.querySelector('title');
    if (titleEl) mo.observe(titleEl, {childList: true, characterData: true});
    return () => mo.disconnect();
  }, [on]);

  if (!visible) {
    return null;
  }
  return (
    <button
      type="button"
      className="immersive-toggle"
      onClick={() => setOn(v => !v)}
      title={on ? '显示菜单（退出沉浸模式）' : '隐藏左侧菜单与顶部导航'}
      aria-label={on ? '显示菜单' : '隐藏菜单'}>
      {on ? '👁' : '🙈'}
    </button>
  );
}

/**
 * 学习进度记录：打开任意章节页时，把「上次学到」写入 localStorage（每单元一个槽）。
 * 记录 = {course, href, index, name}；课程卡片页（CourseTiles）读取本单元槽做高亮与「继续学习」直达。
 */
function ProgressRecorder(): React.JSX.Element | null {
  const location = useLocation();

  useEffect(() => {
    const path = decodeURIComponent(location.pathname);
    for (const c of courses) {
      const idx = c.sections.findIndex(s => sectionHref(s) === path);
      if (idx >= 0) {
        try {
          const name = c.sections[idx].id.split('/').pop() ?? '';
          localStorage.setItem(
            `last-learned:${c.unit}`,
            JSON.stringify({course: c.key, href: path, index: idx, name}),
          );
        } catch {
          // localStorage 不可用（隐私模式等）时静默跳过
        }
        return;
      }
    }
  }, [location.pathname]);

  return null;
}

/**
 * 访问埋点：每次页面浏览（含 SPA 路由切换）POST /api/track 记录一条访问。
 * IP 与地区由 Vercel 函数从请求头读取；本地 dev 等请求失败时静默忽略。
 */
function VisitTracker(): null {
  const {pathname} = useLocation();

  useEffect(() => {
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({path: pathname}),
        keepalive: true,
      }).catch(() => {
        // 上报失败（本地 dev / 网络波动）不影响阅读
      });
    } catch {
      // fetch 不可用时静默跳过
    }
  }, [pathname]);

  return null;
}

export default function Root({children}: {children: React.ReactNode}): React.JSX.Element {
  return (
    <OriginalRoot>
      <ProgressRecorder />
      <ImmersiveToggle />
      <VisitTracker />
      {children}
    </OriginalRoot>
  );
}
