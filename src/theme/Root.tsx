import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import OriginalRoot from '@theme-original/Root';
import {courses, sectionHref} from '@site/data/courses';

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
