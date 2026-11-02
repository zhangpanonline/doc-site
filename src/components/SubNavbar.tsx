/**
 * 滚动二级导航（SubNavbar）
 *
 * 需求：页面向上滚动时，导航栏中间那排主导航向上滚出，紧接着从下方滑入一条
 * 「当前单元的子导航」（如 Agents 单元下的 Python 语言核心 / 数据库 / Python 框架 …）；
 * 左侧 logo 与右侧 AI 搜索、主题三态始终保留不动；向下滚动页面又切回主导航。
 *
 * 实现要点：
 * - 关闭 docusaurus.config.ts 的 navbar.hideOnScroll，滚动状态由本组件统一控制，
 *   写到 html[data-nav]：swap = 菜单换成子导航，hide = 整条上滑（无子导航的页面）。
 * - 子导航数据来自 data/courses.ts（与侧边栏、上次学到同一份数据源），
 *   单元 → 该单元已登记课程；课程不足 2 个时没有「子菜单」可言，回落整条隐藏。
 * - 中间区左右边界用 navbar__brand / navbar__items--right 实测，避免盖住 logo 与右侧工具。
 */
import React, {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {useThemeConfig} from '@docusaurus/theme-common';
import {courses} from '@site/data/courses';
import './subnavbar.css';

type SubNavLink = {
  /** 课程名（取 data/courses.ts 的 CourseDef.name） */
  label: string;
  /** 课程首节地址 */
  href: string;
  /** 课程路由前缀，用来判断当前所在课程 */
  prefix: string;
};

/** 路由第一段即单元 slug（/agents/python/函数 → agents） */
const UNIT_RE = /^\/([^/]+)\//;
/** 滚过这个距离才允许切换，避免页面顶部轻微抖动就换导航 */
const SWAP_THRESHOLD = 120;
/** 方向死区：小于该位移不改变状态，抵消触控板的细碎抖动 */
const DIRECTION_EPSILON = 4;
/** 中间区与左右两侧之间的呼吸缝（px） */
const EDGE_GAP = 6;

/** 单元 → 该单元已上线课程（顺序沿用 courses 数组） */
function buildUnitNav(): Record<string, SubNavLink[]> {
  const map: Record<string, SubNavLink[]> = {};
  for (const course of courses) {
    const first = course.sections[0];
    if (!first) continue;
    (map[course.unit] ??= []).push({
      label: course.name,
      href: first.href ?? `/${first.id}`,
      prefix: `/${first.id.split('/').slice(0, 2).join('/')}/`,
    });
  }
  return map;
}

export default function SubNavbar(): React.JSX.Element | null {
  const {pathname} = useLocation();
  const {navbar} = useThemeConfig();
  const unitNav = useMemo(buildUnitNav, []);
  const [open, setOpen] = useState(false);

  const unit = UNIT_RE.exec(pathname)?.[1] ?? '';
  const navItems = unitNav[unit] ?? [];
  const enabled = navItems.length > 1;

  const unitLabel = useMemo(() => {
    const items = navbar.items as Array<{to?: string; label?: string}>;
    return items.find(item => item.to === `/${unit}/`)?.label ?? '';
  }, [navbar.items, unit]);

  // 滚动方向 → html[data-nav]
  useEffect(() => {
    const root = document.documentElement;
    let mode: 'idle' | 'swap' | 'hide' | null = null;
    let lastY = Math.max(0, window.scrollY);
    let raf = 0;

    const commit = (next: 'idle' | 'swap' | 'hide') => {
      if (next === mode) return;
      mode = next;
      if (next === 'idle') {
        root.removeAttribute('data-nav');
      } else {
        root.setAttribute('data-nav', next);
      }
      setOpen(next === 'swap');
    };

    const apply = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      const dy = y - lastY;
      if (Math.abs(dy) < DIRECTION_EPSILON) return;
      lastY = y;
      if (dy > 0 && y > SWAP_THRESHOLD) {
        commit(enabled ? 'swap' : 'hide');
      } else if (dy < 0) {
        commit('idle');
      }
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(apply);
    };

    // 换页时路由会重置滚动位置，dy 触发不了，这里显式归位
    commit('idle');
    lastY = Math.max(0, window.scrollY);
    window.addEventListener('scroll', onScroll, {passive: true});
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute('data-nav');
    };
  }, [enabled, pathname]);

  // 实测 logo 右侧边界与右侧工具左侧边界，决定子导航面板的左右起止
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    const measure = () => {
      const brand = document.querySelector<HTMLElement>('.navbar__brand');
      const right = document.querySelector<HTMLElement>('.navbar__items--right');
      if (!brand || !right) return;
      const brandBox = brand.getBoundingClientRect();
      const rightBox = right.getBoundingClientRect();
      root.style.setProperty('--subnav-left', `${Math.round(brandBox.right + EDGE_GAP)}px`);
      root.style.setProperty(
        '--subnav-right',
        `${Math.max(0, Math.round(window.innerWidth - rightBox.left + EDGE_GAP))}px`,
      );
    };
    measure();
    window.addEventListener('resize', measure);
    // 字体加载完成后站名宽度会变，再量一次
    void document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener('resize', measure);
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <div className="subnavbar-slot" aria-hidden={!open}>
      <div
        className="subnavbar"
        role="navigation"
        aria-label={`${unitLabel || unit} 课程导航`}>
        {unitLabel ? <span className="subnavbar__unit">{unitLabel}</span> : null}
        <div className="subnavbar__list">
          {navItems.map(item => {
            const active = pathname.startsWith(item.prefix);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`subnavbar__item${active ? ' subnavbar__item--active' : ''}`}
                tabIndex={open ? 0 : -1}
                aria-current={active ? 'page' : undefined}>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
