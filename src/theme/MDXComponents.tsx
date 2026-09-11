import React, {useState} from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Image from '@site/src/components/Image';

function langFromClassName(className?: string): string {
  const m = /language-([\w+-]+)/.exec(className ?? '');
  return m?.[1] ?? 'text';
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

/** 包装代码块：原样渲染 CodeBlock，下方追加 AI 解释 */
function CodeBlockWithAI(props: {children?: React.ReactNode; className?: string}) {
  const CodeBlock = MDXComponents.pre as React.ComponentType<typeof props>;
  const code = String(props.children ?? '');
  return (
    <div className="code-block-ai">
      <CodeBlock {...props} />
      {code.trim() && <AiExplain code={code} lang={langFromClassName(props.className)} />}
    </div>
  );
}

export default {
  ...MDXComponents,
  pre: CodeBlockWithAI,
  Image,
};
