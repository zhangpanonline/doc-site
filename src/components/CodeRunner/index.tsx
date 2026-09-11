import React, {useCallback, useEffect, useRef, useState} from 'react';
import {RUNNER_LANGS, type RunnerLang} from './languages';
import {runCode, ensureFreshPage, type RunEvent} from './runner';
import {createEditor, type EditorHandle} from './editor';
import './index.css';

/**
 * 可运行代码块：静态 Prism 高亮 + 代码卡片下方一行纸墨工具条。
 * - ▶ 运行：浏览器内执行（Python→Pyodide Worker / SQL→sql.js），全站串行排队
 * - ✎ 编辑：按需挂载 CodeMirror 6；退出编辑不销毁实例，草稿保留、复显无闪烁
 * - ↺ 重置：还原原始代码并清空输出
 * SSR 与首次客户端渲染完全一致（工具条静态输出），水合零 mismatch。
 */

interface Props {
  language: RunnerLang;
  code: string; // MDX 编译产物里的原始代码字符串
  staticNode: React.ReactNode; // 原 Code 组件（Prism 高亮/title/行高亮原样保留）
}

type RunPhase = 'idle' | 'queued' | 'loading' | 'running' | 'error' | 'done';

export default function CodeRunner({language, code, staticNode}: Props): React.JSX.Element {
  const spec = RUNNER_LANGS[language];
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<EditorHandle | null>(null);
  const creatingRef = useRef(false);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [phase, setPhase] = useState<RunPhase>('idle');
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [statusText, setStatusText] = useState<string>('');

  // 仅卸载时销毁编辑器（退出编辑只隐藏，草稿保留）
  useEffect(
    () => () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    },
    [],
  );

  // 编辑态：挂载一次；复显只 requestMeasure（display:none 恢复后需重新测量）
  useEffect(() => {
    if (!editing || !hostRef.current) return;
    if (handleRef.current) {
      handleRef.current.requestMeasure();
      return;
    }
    if (creatingRef.current) return; // 防止并发重复创建
    creatingRef.current = true;
    let cancelled = false;
    void createEditor(hostRef.current, {
      doc: code,
      lang: language,
      onChange: () => setDirty(true),
    }).then((h) => {
      if (cancelled) {
        h.destroy();
        return;
      }
      handleRef.current = h;
      creatingRef.current = false;
    });
    return () => {
      cancelled = true;
    };
  }, [editing, code, language]);

  const onRun = useCallback(async () => {
    ensureFreshPage();
    const source = handleRef.current?.getValue() ?? code;
    if (!source.trim()) return;
    setEvents([]);
    setStatusText('');
    setPhase('queued');
    try {
      await runCode(spec.engine, source, {sessionKey: ''}, (e) => {
        if (e.type === 'status') {
          setStatusText(e.message);
          setPhase((p) => (p === 'queued' ? 'loading' : p));
        } else if (e.type === 'error') {
          setStatusText('');
          setPhase('error');
          setEvents((prev) => [...prev, {type: 'stderr', text: e.text}]);
        } else if (e.type === 'done') {
          setPhase('done');
        } else {
          setEvents((prev) => [...prev, e]);
        }
      });
      setPhase('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPhase('error');
      setEvents((prev) => [
        ...prev,
        {
          type: 'stderr',
          text: msg === '__TIMEOUT__'
            ? '执行超过 15 秒已强制中断 Python 运行时（页面不受影响，可重新运行）'
            : msg,
        },
      ]);
      setStatusText('');
    }
  }, [code, spec.engine]);

  const onReset = useCallback(() => {
    if (handleRef.current) {
      handleRef.current.setValue(code);
      handleRef.current.requestMeasure();
    }
    setDirty(false);
    setEvents([]);
    setStatusText('');
    setPhase('idle');
  }, [code]);

  const busy = phase === 'queued' || phase === 'loading' || phase === 'running';
  const hasOutput = events.length > 0;

  const stdout = events.filter((e) => e.type === 'stdout').map((e) => (e as {text: string}).text).join('');
  const stderr = events.filter((e) => e.type === 'stderr').map((e) => (e as {text: string}).text).join('\n');
  const tables = events.filter((e) => e.type === 'table') as Extract<RunEvent, {type: 'table'}>[];
  const notices = events.filter((e) => e.type === 'notice').map((e) => (e as {text: string}).text);

  const statusLine =
    statusText || (phase === 'done' ? '运行完成' : phase === 'error' ? '运行出错' : phase === 'queued' ? '排队中…' : '');

  return (
    <div className="cr" data-lang={language} data-editing={editing} data-phase={phase}>
      <div className="cr-static">{staticNode}</div>
      <div className="cr-editor" ref={hostRef} hidden={!editing} />
      <div className="cr-toolbar" role="group" aria-label={`${spec.label} 代码运行工具`}>
        <button type="button" className="cr-btn cr-btn-run" onClick={() => void onRun()} disabled={busy}>
          <span aria-hidden="true">▶</span> 运行
        </button>
        <button
          type="button"
          className="cr-btn"
          onClick={() => setEditing((v) => !v)}
          disabled={busy}
          aria-pressed={editing}>
          <span aria-hidden="true">✎</span> {editing ? '收起编辑' : '编辑'}
        </button>
        <button
          type="button"
          className="cr-btn"
          onClick={onReset}
          disabled={busy || (!dirty && !editing && !hasOutput)}
          title="还原原始代码并清空输出">
          <span aria-hidden="true">↺</span> 重置
        </button>
        {statusLine && <span className="cr-status">{statusLine}</span>}
        <span className="cr-lang">{spec.label}</span>
        {dirty && <span className="cr-dirty-dot" title="已修改（运行的是编辑后的代码）" />}
      </div>
      {hasOutput && (
        <div className="cr-out" role="region" aria-label="运行输出">
          {notices.map((n) => (
            <div key={n} className="cr-out-notice">
              {n}
            </div>
          ))}
          {stdout && <pre className="cr-out-text">{stdout}</pre>}
          {stderr && <pre className="cr-out-err">{stderr}</pre>}
          {tables.map((t, i) => (
            <div key={i} className="cr-table-wrap">
              {t.truncated && <div className="cr-table-cap">仅显示前 200 行（共更多）</div>}
              <table className="cr-table">
                <thead>
                  <tr>
                    {t.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((row, j) => (
                    <tr key={j}>
                      {t.columns.map((_, k) => (
                        <td key={k} className={row[k] === null ? 'is-null' : undefined}>
                          {row[k] === null ? 'NULL' : String(row[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
