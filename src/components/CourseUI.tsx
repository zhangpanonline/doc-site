import React, {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import {jobs} from '@site/data/jobs';

export type Course = {
  emoji: string;
  title: string;
  badges?: string[];
  desc: string;
  meta?: string;
  chips?: string[];
  href: string;
};

const UNITS: {emoji: string; name: string; desc: string; courses: string; href: string}[] = [
  {emoji: '🤖', name: 'Agents 应用开发能力', desc: '构建 AI Agent 应用的核心工程能力：Python 语言核心、数据库与必备工具链。', courses: '2 门课程', href: '/agents/'},
  {emoji: '⚙️', name: '后端开发能力', desc: '服务端开发：接口设计、主流框架、微服务与工程化实践。', courses: '筹备中', href: '/backend/'},
  {emoji: '☁️', name: '运维和云计算能力', desc: '部署上线、容器编排、CI/CD 与云平台实践。', courses: '筹备中', href: '/devops/'},
  {emoji: '✨', name: '高效 AI 编程能力', desc: '善用 AI 工具提效：提示工程、AI 辅助开发与智能工作流。', courses: '筹备中', href: '/ai-coding/'},
  {emoji: '🏗️', name: '企业级全栈项目', desc: '真实企业级项目实战：从需求分析到上线交付的完整闭环。', courses: '筹备中', href: '/fullstack/'},
  {emoji: '🎯', name: '就业指导', desc: '简历打磨、面试实战与职业规划，走稳求职每一步。', courses: '筹备中', href: '/career/'},
];

export function UnitTiles(): ReactNode {
  return (
    <div className="ai-hero">
      <p className="ai-hero-kicker">渡一《AI 大全栈》学习路线 · 配套课程</p>
      <h1 className="ai-hero-title">AI 大全栈 · 配套交互课程</h1>
      <p className="ai-hero-sub">六个单元 · 一条从 Agents 开发到企业级全栈交付的学习路线</p>
      <div className="ai-tiles">
        {UNITS.map(u => (
          <Link key={u.href} to={u.href} className="ai-tile">
            <span className="ai-tile-emoji">{u.emoji}</span>
            <h3 className="ai-tile-name">{u.name}</h3>
            <p className="ai-tile-desc">{u.desc}</p>
            <span className="ai-badge">{u.courses}</span>
            <span className="ai-enter">进入单元 →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export type CourseTile = {
  emoji: string;
  name: string;
  desc: string;
  badge: string;
  href?: string;
  /** 课程 key：与 data/courses.ts 的 CourseDef.key 一致，用于「上次学到」匹配 */
  courseKey?: string;
};

type LastLearned = {
  course: string;
  href: string;
  index: number;
  name: string;
};

export function CourseTiles({unit, courses, numbered}: {unit?: string; courses: CourseTile[]; numbered?: boolean}): ReactNode {
  const [last, setLast] = useState<LastLearned | null>(null);

  // 「上次学到」：读取本单元记录；用一次轻量请求校验章节仍存在（404 则清除记录）。
  // 仅在客户端执行（useEffect），SSR 首屏不渲染高亮，避免水合不一致。
  useEffect(() => {
    if (!unit) {
      return;
    }
    let cancelled = false;
    try {
      const raw = localStorage.getItem(`last-learned:${unit}`);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as LastLearned;
      fetch(parsed.href, {cache: 'force-cache'})
        .then(res => {
          if (cancelled) {
            return;
          }
          if (res.ok) {
            setLast(parsed);
          } else {
            localStorage.removeItem(`last-learned:${unit}`);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLast(parsed); // 网络失败不视为记录失效
          }
        });
    } catch {
      // 记录损坏或 localStorage 不可用：忽略
    }
    return () => {
      cancelled = true;
    };
  }, [unit]);

  return (
    <div className="ai-tiles">
      {courses.map((c, idx) => {
        const title = numbered ? `${String(idx + 1).padStart(2, '0')} · ${c.name}` : c.name;
        if (!c.href) {
          return (
            <div key={c.name} className="ai-tile ai-tile-soon">
              <span className="ai-tile-emoji">{c.emoji}</span>
              <h3 className="ai-tile-name">{title}</h3>
              <p className="ai-tile-desc">{c.desc}</p>
              <span className="ai-badge ai-badge-dim">{c.badge}</span>
            </div>
          );
        }
        const isCurrent = last !== null && last.course === c.courseKey;
        return (
          <div key={c.name} className={`ai-tile${isCurrent ? ' ai-tile-current' : ''}`}>
            <Link to={c.href} className="ai-tile-main">
              <span className="ai-tile-emoji">{c.emoji}</span>
              <h3 className="ai-tile-name">{title}</h3>
              <p className="ai-tile-desc">{c.desc}</p>
              <span className="ai-badge">{c.badge}</span>
              <span className="ai-enter">进入课程 →</span>
            </Link>
            {isCurrent && last && (
              <>
                <span className="ai-last-badge">上次学到：第 {last.index + 1} 节 · {last.name}</span>
                <Link to={last.href} className="ai-continue">继续学习 →</Link>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CourseGrid({courses}: {courses: Course[]}): ReactNode {
  return (
    <div className="ai-course-grid">
      {courses.map(c => (
        <div key={c.title} className="ai-course-card">
          <div className="ai-course-head">
            <span className="ai-course-emoji">{c.emoji}</span>
            <h2 className="ai-course-name">{c.title}</h2>
          </div>
          <div className="ai-badges">
            {c.badges?.map(b => <span key={b} className="ai-badge">{b}</span>)}
          </div>
          <p className="ai-course-desc">{c.desc}</p>
          {c.meta ? <div className="ai-meta">{c.meta}</div> : null}
          {c.chips ? <div className="ai-chips">{c.chips.map(ch => <span key={ch} className="ai-chip">{ch}</span>)}</div> : null}
          <Link className="ai-cta" to={c.href}>进入课程 →</Link>
        </div>
      ))}
    </div>
  );
}

export function CommonBanner({title, desc}: {title: string; desc: string}): ReactNode {
  return (
    <div className="ai-c-banner">
      <h1 className="ai-c-banner-title">{title}</h1>
      <p className="ai-c-banner-desc">{desc}</p>
    </div>
  );
}

/** 单元首页 hero：与首页同款的大纸卡（眉题 + 大标题 + 副标题），内容（课程卡片）以 children 嵌入 */
export function UnitHero({kicker, title, desc, children}: {kicker: string; title: string; desc: string; children?: ReactNode}): ReactNode {
  return (
    <div className="ai-hero">
      <p className="ai-hero-kicker">{kicker}</p>
      <h1 className="ai-hero-title">{title}</h1>
      <p className="ai-hero-sub">{desc}</p>
      {children}
    </div>
  );
}

export function CourseRow({emoji, title, desc, note, to}: {emoji: string; title: string; desc: string; note?: string; to: string}): ReactNode {
  return (
    <Link className="ai-c-row" to={to}>
      <span className="ai-course-emoji">{emoji}</span>
      <span className="ai-c-row-body">
        <span className="ai-c-row-title">{title}</span>
        <span className="ai-c-row-desc">{desc}</span>
      </span>
      {note ? <span className="ai-badge ai-badge-dim">{note}</span> : null}
      <span className="ai-c-row-go">→</span>
    </Link>
  );
}

export function PlaceholderNote({text}: {text: string}): ReactNode {
  return <div className="ai-placeholder">{text}</div>;
}

/* ===== 岗位地图 ===== */

export function JobBoard({unit}: {unit: string}): ReactNode {
  const d = jobs[unit];
  if (!d) {
    return null;
  }
  return (
    <div className="ai-course-card">
      <div className="ai-course-head">
        <span className="ai-course-emoji">{d.emoji}</span>
        <h2 className="ai-course-name">
          第 {d.stage} 阶段 · {d.title} · 岗位地图
        </h2>
      </div>
      <div className="ai-badges">
        <span className="ai-badge">岗位方向</span>
      </div>
      <div className="ai-chips">
        {d.positions.map(p => <span key={p} className="ai-chip">{p}</span>)}
      </div>
      <p className="ai-course-desc">本阶段新增技能要求</p>
      <div className="ai-chips">
        {d.skills.map(s => <span key={s} className="ai-chip">{s}</span>)}
      </div>
      <p className="ai-course-desc">
        💰 常见薪资 {d.salaryRange[0]}–{d.salaryRange[1]}K/月 · 中位数约 {d.salaryMedian}K
      </p>
      {d.platforms.length > 0 && (
        <>
          <p className="ai-course-desc">各平台口径</p>
          <div className="ai-chips">
            {d.platforms.map(p => (
              <span key={p.platform} className="ai-chip ai-chip--platform">
                {p.label}：{p.sampleSize} 份 · {p.salaryRange[0]}–{p.salaryRange[1]}K · 中位数 {p.salaryMedian}K
              </span>
            ))}
          </div>
        </>
      )}
      <p className="ai-meta">
        递进规则：本阶段岗位要求默认包含前面所有阶段的技能。
        样本 {d.sampleSize} 份 · 更新于 {d.updatedAt}。
        薪资区间为样本 P10–P90；BOSS 直聘为全国口径，前程无忧为北上深杭蓉汉六城口径。
        数据为各招聘平台公开岗位信息的聚合统计，不含公司信息与岗位原文。
      </p>
    </div>
  );
}

export function JobsTiles(): ReactNode {
  return (
    <div className="ai-tiles">
      {Object.entries(jobs).map(([key, d]) => (
        <Link key={key} to={`/jobs/${key}`} className="ai-tile">
          <span className="ai-tile-emoji">{d.emoji}</span>
          <h3 className="ai-tile-name">
            {String(d.stage).padStart(2, '0')} · {d.title}
          </h3>
          <p className="ai-tile-desc">{d.positions.join(' / ')}</p>
          <span className="ai-badge">{d.salaryRange[0]}–{d.salaryRange[1]}K/月 · {d.sampleSize} 份</span>
          <span className="ai-enter">查看岗位 →</span>
        </Link>
      ))}
    </div>
  );
}
