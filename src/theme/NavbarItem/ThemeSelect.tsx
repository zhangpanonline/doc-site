import React, {useEffect, useRef, useState} from 'react';

/**
 * 主题三态下拉（导航栏右侧，注册为 custom-theme-select）：
 * - 青简 · 亮：html data-theme='light'，不加额外标记（薄荷绿青简样式）
 * - 夜读 · 暗：html data-theme='dark'（牛皮纸夜读样式）
 * - 森林 · 亮：html data-theme='light' + html.theme-forest class（森林绿样式）
 *
 * 状态持久化到 localStorage（key: site-theme），读取时兼容旧值
 * theme=light→qingjian、theme=dark→night。原生 <select> 无自绘菜单。
 *
 * 防覆写：Docusaurus 的 react-helmet-async 在水合与路由切换时会覆写 <html>
 * 的 class 与 data-theme（参考 Root.tsx 的 ImmersiveToggle 同款防护），
 * 这里用 MutationObserver 观察这两个属性，一旦被覆写立即按当前主题重新对齐，
 * 保证换页后三态不丢失。同时同步 Docusaurus 原生 theme key（night→dark、
 * qingjian/forest→light），让 ThemeProvider 初始化/水合时与三态保持一致。
 */
const THEMES = [
  {value: 'qingjian', label: '青简 · 亮'},
  {value: 'night', label: '夜读 · 暗'},
  {value: 'forest', label: '森林 · 亮'},
];

/** 读取当前三态：site-theme 优先，其次兼容旧 theme key，默认青简 */
function readInitial(): string {
  try {
    const t = localStorage.getItem('site-theme');
    if (t === 'qingjian' || t === 'night' || t === 'forest') {
      return t;
    }
    const old = localStorage.getItem('theme');
    return old === 'dark' ? 'night' : 'qingjian';
  } catch {
    return 'qingjian';
  }
}

/** 把三态应用到 <html>（幂等：状态已符合就跳过，观察器触发自身不会死循环） */
function applyTheme(root: HTMLElement, t: string): void {
  const isNight = t === 'night';
  if (root.getAttribute('data-theme') !== (isNight ? 'dark' : 'light')) {
    root.setAttribute('data-theme', isNight ? 'dark' : 'light');
  }
  const hasForest = root.classList.contains('theme-forest');
  if (t === 'forest' && !hasForest) {
    root.classList.add('theme-forest');
  }
  if (t !== 'forest' && hasForest) {
    root.classList.remove('theme-forest');
  }
}

/** 持久化三态，并同步 Docusaurus 原生 theme key 保持一致 */
function persistTheme(t: string): void {
  try {
    localStorage.setItem('site-theme', t);
    localStorage.setItem('theme', t === 'night' ? 'dark' : 'light');
  } catch {
    // localStorage 不可用（隐私模式等）时仅本次会话生效
  }
}

export default function ThemeSelect(): React.JSX.Element {
  // 初始固定 qingjian，保证 SSR 与 hydrate 渲染一致；真实值在 effect 中读取并同步
  const [theme, setTheme] = useState('qingjian');
  const current = useRef('qingjian');

  useEffect(() => {
    const root = document.documentElement;
    const t = readInitial();
    current.current = t;
    setTheme(t);
    applyTheme(root, t);
    persistTheme(t);

    // react-helmet-async 水合/路由切换会覆写 html 的 class/data-theme，
    // 观察后立即按当前主题重新对齐（applyTheme 幂等）
    const mo = new MutationObserver(() => applyTheme(root, current.current));
    mo.observe(root, {attributes: true, attributeFilter: ['class', 'data-theme']});
    return () => mo.disconnect();
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    current.current = v;
    setTheme(v);
    applyTheme(document.documentElement, v);
    persistTheme(v);
  };

  return (
    <select
      className="theme-select"
      value={theme}
      onChange={onChange}
      aria-label="选择主题配色"
      title="选择主题配色">
      {THEMES.map(t => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
