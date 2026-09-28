import React, {useEffect, useRef, useState} from 'react';
import './index.css';

/**
 * AI 搜索（导航栏右上角入口）：
 * - Ctrl/Cmd+K 唤起，Esc 关闭；问答式返回：答案 + 来源文档链接
 * - 请求走 /api/ai-search（Vercel 函数：配额 + 文档检索 + DeepSeek 生成），
 *   API Key 只在服务端，前端接触不到
 */

type Source = {title: string; url: string; h: string};
type Result = {answer: string; sources: Source[]};

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 11 L14.5 14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function AiSearchButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 全局快捷键：Ctrl/Cmd+K 唤起，Esc 关闭（沉浸模式下导航栏隐藏也仍可用）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  const submit = async () => {
    const question = q.trim();
    if (question.length < 2) {
      setError('请输入至少两个字的问题');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({q: question}),
      });
      const data = (await res.json().catch(() => null)) as
        | ({error?: string} & Partial<Result>)
        | null;
      if (!res.ok || !data) {
        setError(data?.error ?? `服务错误（HTTP ${res.status}）`);
        return;
      }
      setResult({answer: data.answer ?? '', sources: data.sources ?? []});
    } catch {
      setError('网络请求失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="ai-search-btn"
        aria-label="AI 搜索课程文档（Ctrl K）"
        title="AI 搜索课程文档（Ctrl K）"
        onClick={() => setOpen(true)}>
        <SearchGlyph />
        <span>搜索</span>
      </button>

      {open && (
        <div className="ai-search-overlay" onClick={() => setOpen(false)}>
          <div
            className="ai-search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="AI 搜索"
            onClick={e => e.stopPropagation()}>
            <div className="ai-search-input-row">
              <SearchGlyph />
              <input
                ref={inputRef}
                value={q}
                placeholder="搜索课程文档，如：Python 怎么装环境"
                maxLength={120}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !loading) {
                    void submit();
                  }
                }}
              />
              <kbd>Ctrl K</kbd>
              <button
                type="button"
                className="ai-search-go"
                disabled={loading}
                onClick={() => void submit()}>
                {loading ? '思考中…' : '搜索'}
              </button>
            </div>

            <div className="ai-search-body">
              {loading && <p className="ai-search-loading">正在检索课程文档并生成回答…</p>}
              {!loading && error && <p className="ai-search-error">{error}</p>}
              {!loading && !error && result && (
                <>
                  <div className="ai-search-answer">{result.answer}</div>
                  {result.sources.length > 0 && (
                    <ul className="ai-search-sources">
                      {result.sources.map(s => (
                        <li key={s.url + s.h}>
                          <a href={s.url} onClick={() => setOpen(false)}>
                            {s.title}
                          </a>
                          {s.h && <span className="ai-search-source-h">{s.h}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {!loading && !error && !result && (
                <p className="ai-search-hint">
                  基于全站课程文档回答，答案仅来自文档内容。
                  <br />
                  每 IP 每日限 20 次。
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
