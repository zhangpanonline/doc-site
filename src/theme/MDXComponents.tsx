import React, {useState} from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Image from '@site/src/components/Image';
import CodeRunner from '@site/src/components/CodeRunner';
import {matchRunnerLanguage} from '@site/src/components/CodeRunner/languages';

/**
 * 围栏代码块分流（fenced 块经 MDXComponents.pre 进入，children 是原 Code
 * 组件，className/代码字符串都在其 props 上）：
 * - ```python / ```sql → CodeRunner（可运行代码块：运行/编辑/重置）
 * - 其余语言 → 原样渲染（与官方 MDXPre 行为一致，仅透传 children）
 * - 所有代码块下方追加「AI 解释」按钮（调用 /api/explain，按代码哈希缓存）
 */

function langFromClassName(className?: string): string {
  const m = /language-([\w+-]+)/.exec(className ?? '');
  return m?.[1] ?? 'text';
}

/** 从 pre 的 children（原 Code 元素）解析 className 与原始代码字符串 */
function parseCodeProps(children?: React.ReactNode): {className?: string; code?: string} {
  const kids = React.Children.toArray(children);
  const only = kids.length === 1 ? kids[0] : null;
  if (!React.isValidElement(only)) return {};
  const p = only.props as {className?: string; children?: unknown};
  return {className: p.className, code: typeof p.children === 'string' ? p.children : undefined};
}

/**
 * 代码块 AI 解释：按钮挂在每个代码块下方，点击调用 /api/explain。
 * 服务端按代码哈希缓存，同一段代码只消耗一次 AI 额度。
 */
function AiExplain({code, lang}: {code: string; lang: string}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');
  const [cached, setCached] = useState(false);

  const explain = async () => {
    setState('loading');
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({code, lang}),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {explanation: string; cached: boolean};
      setText(data.explanation);
      setCached(data.cached);
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'idle') {
    return (
      <div className="code-ai">
        <button type="button" className="code-ai-btn" onClick={explain}>
          ✨ AI 解释这段代码
        </button>
      </div>
    );
  }
  if (state === 'loading') {
    return <div className="code-ai code-ai-loading">🤖 AI 思考中…</div>;
  }
  if (state === 'error') {
    return (
      <div className="code-ai">
        <button type="button" className="code-ai-btn" onClick={explain}>
          解释失败，点击重试
        </button>
      </div>
    );
  }
  return (
    <div className="code-ai">
      <div className="code-ai-note">
        <div className="code-ai-head">
          <span>AI 解释{cached ? ' · 已缓存' : ''}</span>
          <button type="button" className="code-ai-close" onClick={() => setState('idle')}>
            收起
          </button>
        </div>
        <div className="code-ai-body">{text}</div>
      </div>
    </div>
  );
}

/** 非执行块：原 CodeBlock 渲染 + 下方 AI 解释按钮 */
function PlainBlockWithAI(props: {children?: React.ReactNode}) {
  const {className, code} = parseCodeProps(props.children);
  return (
    <div className="code-block-ai">
      {props.children}
      {code && code.trim() && <AiExplain code={code} lang={langFromClassName(className)} />}
    </div>
  );
}

function MDXPre(props: {children?: React.ReactNode}): React.JSX.Element {
  const {className, code} = parseCodeProps(props.children);
  const runnerLang = matchRunnerLanguage(className);

  // 非目标语言、手写 <pre>、children 非纯字符串 → 原样透传 + AI 解释
  if (!runnerLang || !code) {
    return <PlainBlockWithAI {...props} />;
  }
  return (
    <div className="code-block-ai">
      <CodeRunner language={runnerLang} code={code} staticNode={props.children} />
      <AiExplain code={code} lang={runnerLang} />
    </div>
  );
}

export default {
  ...MDXComponents,
  pre: MDXPre,
  Image,
};
