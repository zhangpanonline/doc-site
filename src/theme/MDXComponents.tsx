import React, {useEffect, useState} from 'react';
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

/** 递归提取代码文本：MDX v3 里 pre 的 children 是 code 元素（或嵌套），不是裸字符串 */
function extractCode(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  const parts: string[] = [];
  for (const c of React.Children.toArray(children)) {
    if (typeof c === 'string') {
      parts.push(c);
    } else if (React.isValidElement(c)) {
      parts.push(extractCode((c.props as {children?: React.ReactNode}).children));
    }
  }
  return parts.join('');
}

/** 从 pre 的 children（原 Code 元素）解析 className 与原始代码字符串（递归兼容嵌套） */
function parseCodeProps(children?: React.ReactNode): {className?: string; code?: string} {
  if (!children) {
    return {};
  }
  const first = React.Children.toArray(children).find(React.isValidElement);
  if (!first) {
    return {};
  }
  const p = first.props as {className?: string; children?: unknown};
  const code = extractCode(children).trim();
  return {className: p.className, code: code || undefined};
}

/**
 * 代码块 AI 助教（分层讲解 + 定向答疑）：
 * - 点「AI 解释」→ mode=init：分层输出 + 6 个追问按钮（服务端按代码哈希缓存 10 天）
 * - 点追问按钮 → mode=followup：只深挖该方向（按钮问题全文随请求回传，AI 无需历史）
 * - 追问 ≥1 次后可「生成结课笔记」→ mode=generate_note：汇总已问方向的结论
 * 追问上限 5 次；已问方向（asked）随请求累积回传，由服务端拼进提示词。
 */

interface AskButton {
  letter: string;
  question: string;
}
interface FollowupAnswer extends AskButton {
  answer: string;
}

/** 从 init 输出里解析 A~F 追问按钮（每行一个，格式 "A. 问题"）；按钮区从正文切除 */
function parseInit(raw: string): {text: string; buttons: AskButton[]} {
  const lines = raw.split('\n');
  const btnRe = /^([A-F])[\.、．]\s*(.+)$/;
  const buttons: AskButton[] = [];
  let cutAt = lines.length;
  lines.forEach((line, i) => {
    const m = btnRe.exec(line.trim());
    if (m) {
      if (buttons.length === 0) cutAt = i;
      buttons.push({letter: m[1], question: m[2]});
    }
  });
  return {text: lines.slice(0, cutAt).join('\n').trim(), buttons: buttons.slice(0, 6)};
}

/** 从追问回复里解析「还可以看：<字母>」引导 */
function parseFollowNext(answer: string): string | null {
  const m = /还可以看[：:]\s*([A-F])/.exec(answer);
  return m ? m[1] : null;
}

/** 简易字符串哈希（仅用于 localStorage 会话键） */
function hashCode(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

const SESSION_PREFIX = 'ai-explain:v1:';
const SESSION_TTL = 10 * 86_400_000; // 与服务端 init 缓存一致：过期自动丢弃

interface StoredSession {
  text: string;
  buttons: AskButton[];
  asked: AskButton[];
  answers: FollowupAnswer[];
  note: string | null;
  cached: boolean;
  ts: number;
}

function AiExplain({code, lang}: {code: string; lang: string}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');
  const [buttons, setButtons] = useState<AskButton[]>([]);
  const [asked, setAsked] = useState<AskButton[]>([]);
  const [answers, setAnswers] = useState<FollowupAnswer[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [busy, setBusy] = useState<'init' | 'followup' | 'note' | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [freeText, setFreeText] = useState('');

  const storeKey = `${SESSION_PREFIX}${lang}:${hashCode(code)}`;

  // 刷新后恢复会话（水合后恢复，避免 SSR 不一致；过期条目自动丢弃）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (!raw) return;
      const s = JSON.parse(raw) as StoredSession;
      if (!s || typeof s.ts !== 'number' || Date.now() - s.ts > SESSION_TTL) {
        localStorage.removeItem(storeKey);
        return;
      }
      setText(s.text ?? '');
      setButtons(Array.isArray(s.buttons) ? s.buttons : []);
      setAsked(Array.isArray(s.asked) ? s.asked : []);
      setAnswers(Array.isArray(s.answers) ? s.answers : []);
      setNote(s.note ?? null);
      setCached(!!s.cached);
      setState('done');
    } catch {
      // localStorage 不可用（隐私模式等）：仅本次会话生效
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会话变化即落盘（几 KB 的文本，无体积顾虑）
  useEffect(() => {
    if (state !== 'done') return;
    try {
      localStorage.setItem(
        storeKey,
        JSON.stringify({text, buttons, asked, answers, note, cached, ts: Date.now()} satisfies StoredSession),
      );
    } catch {
      // localStorage 不可用：静默跳过
    }
  }, [state, text, buttons, asked, answers, note, cached, storeKey]);

  const MAX_FOLLOWUPS = 5;
  const pageContext = () => {
    const crumb = document
      .querySelector('.theme-doc-breadcrumbs')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();
    const heading = document.querySelector('article h1')?.textContent?.trim();
    return {context: [crumb, heading].filter(Boolean).join(' · '), url: window.location.href};
  };

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {error?: string};
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as {explanation: string; cached?: boolean};
  };

  const init = async () => {
    setState('loading');
    setBusy('init');
    setErr(null);
    try {
      const {context, url} = pageContext();
      const data = await post({code, lang, context, url});
      const parsed = parseInit(data.explanation);
      setText(parsed.text);
      setButtons(parsed.buttons);
      setCached(!!data.cached);
      // 重新发起解释：清掉上一轮的追问与笔记
      setAsked([]);
      setAnswers([]);
      setNote(null);
      setState('done');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    } finally {
      setBusy(null);
    }
  };

  const ask = async (letter: string, question: string) => {
    setBusy('followup');
    setErr(null);
    try {
      // 追问不依赖缓存：context/url 只影响 init，这里只回传已问方向与按钮问题全文
      const data = await post({code, lang, mode: 'followup', buttonText: question, asked});
      setAsked(prev => [...prev, {letter, question}]);
      setAnswers(prev => [...prev, {letter, question, answer: data.explanation}]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const submitFree = async () => {
    const q = freeText.trim();
    if (!q || busy !== null || asked.length >= MAX_FOLLOWUPS) return;
    setFreeText('');
    await ask('追问', q);
  };

  const genNote = async () => {
    setBusy('note');
    setErr(null);
    try {
      const data = await post({code, lang, mode: 'generate_note', asked});
      setNote(data.explanation);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  if (state === 'idle') {
    return (
      <div className="code-ai">
        <button type="button" className="code-ai-btn" onClick={() => void init()}>
          ✨ AI 解释这段代码
        </button>
      </div>
    );
  }
  if (state === 'loading') {
    return <div className="code-ai code-ai-loading">🤖 AI 助教思考中…</div>;
  }
  if (state === 'error') {
    return (
      <div className="code-ai">
        <div className="code-ai-err">{err ?? '出错了'}</div>
        <button type="button" className="code-ai-btn" onClick={() => void init()}>
          点击重试
        </button>
      </div>
    );
  }

  const askedLetters = new Set(asked.map(a => a.letter));
  const remaining = buttons.filter(b => !askedLetters.has(b.letter));
  const canAskMore = asked.length < MAX_FOLLOWUPS && remaining.length > 0;
  const noteText = note ? note.replace(/\[复制笔记\]/g, '').trim() : '';

  return (
    <div className="code-ai">
      <div className="code-ai-note">
        <div className="code-ai-head">
          <span>AI 助教{cached ? ' · 已缓存' : ''}</span>
          <button type="button" className="code-ai-close" onClick={() => setState('idle')}>
            收起
          </button>
        </div>
        <div className="code-ai-body">{text}</div>

        {buttons.length > 0 && (
          <div className="code-ai-asks">
            <div className="code-ai-asks-title">你可能想继续</div>
            {canAskMore ? (
              remaining.map(b => (
                <button
                  key={b.letter}
                  type="button"
                  className="code-ai-ask"
                  disabled={busy !== null}
                  onClick={() => void ask(b.letter, b.question)}>
                  <span className="code-ai-ask-letter">{b.letter}</span>
                  {b.question}
                </button>
              ))
            ) : (
              !remaining.length && <div className="code-ai-asks-done">六个方向都已聊过，可以生成结课笔记啦</div>
            )}
            {asked.length < MAX_FOLLOWUPS && (
              <div className="code-ai-free">
                <input
                  className="code-ai-free-input"
                  placeholder="自由追问（100 字内，回车发送）"
                  value={freeText}
                  maxLength={100}
                  disabled={busy !== null}
                  onChange={e => setFreeText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) void submitFree();
                  }}
                />
                <button
                  type="button"
                  className="code-ai-btn"
                  disabled={busy !== null || !freeText.trim()}
                  onClick={() => void submitFree()}>
                  追问
                </button>
              </div>
            )}
          </div>
        )}

        {answers.map((a, i) => (
          <div key={i} className="code-ai-follow">
            <div className="code-ai-follow-q">
              <span className="code-ai-ask-letter">{a.letter}</span>
              {a.question}
            </div>
            <div className="code-ai-follow-a">{a.answer}</div>
            {(() => {
              const nextLetter = parseFollowNext(a.answer);
              const nextBtn = nextLetter ? buttons.find(b => b.letter === nextLetter && !askedLetters.has(b.letter)) : null;
              return nextBtn ? (
                <button
                  type="button"
                  className="code-ai-next"
                  disabled={busy !== null}
                  onClick={() => void ask(nextBtn.letter, nextBtn.question)}>
                  继续：{nextBtn.question}
                </button>
              ) : null;
            })()}
          </div>
        ))}

        {asked.length > 0 && !note && (
          <div className="code-ai-note-act">
            <button type="button" className="code-ai-btn" disabled={busy !== null} onClick={() => void genNote()}>
              {busy === 'note' ? '🤖 生成中…' : '📝 生成结课笔记'}
            </button>
          </div>
        )}
        {note && (
          <div className="code-ai-note-box">
            <div className="code-ai-note-body">{noteText}</div>
            <button
              type="button"
              className="code-ai-btn"
              onClick={() => {
                void navigator.clipboard.writeText(noteText);
              }}>
              📋 复制笔记
            </button>
          </div>
        )}
        {err && <div className="code-ai-err">{err}</div>}
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
  // 全站代码块统一显示行号：给原 Code 元素直接注入 showLineNumbers 布尔 prop
  //（CodeBlock 的 createCodeBlockMetadata 直接消费该 prop，最稳路径；
  //  title="..."、{5,13} 高亮等既有 meta 不受影响）
  const kids = React.Children.toArray(props.children);
  if (kids.length === 1 && React.isValidElement(kids[0])) {
    const codeEl = kids[0];
    const p = codeEl.props as {showLineNumbers?: unknown};
    if (p.showLineNumbers !== true) {
      props = {
        ...props,
        children: React.cloneElement(codeEl as React.ReactElement<{showLineNumbers?: unknown}>, {showLineNumbers: true}),
      };
    }
  }
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
