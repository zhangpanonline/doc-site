import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';
import OriginalRoot from '@theme-original/Root';
import {courses, sectionHref} from '@site/data/courses';

/**
 * 沉浸模式开关（仅 PC）：阅读课程小节时一键隐藏左侧菜单与顶部导航栏。
 * - 只在存在文档侧边栏的页面显示按钮（SSR 下不渲染任何东西，effects 仅客户端执行）
 * - 状态持久化到 localStorage（immersive-mode），刷新/换页保持
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

  useEffect(() => {
    setVisible(Boolean(document.querySelector('.theme-doc-sidebar-container')));
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('immersive', on);
    try {
      localStorage.setItem('immersive-mode', on ? '1' : '0');
    } catch {
      // localStorage 不可用（隐私模式等）时仅本次会话生效
    }
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

export default function Root({children}: {children: React.ReactNode}): React.JSX.Element {
  return (
    <OriginalRoot>
      <ProgressRecorder />
      {children}
    </OriginalRoot>
  );
}
