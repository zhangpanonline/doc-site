/**
 * CodeMirror 6 工厂：动态 import（webpack 自动拆 async chunk，首屏 0 字节）。
 * 主题全部走 CSS 变量（--cr-*），亮暗跟随 [data-theme]，无需监听主题切换重建。
 * 高亮色板与 docusaurus.config.ts 的 paperInkTheme 同源。
 */

import type {Extension} from '@codemirror/state';
import type {RunnerLang} from './languages';

export interface EditorHandle {
  getValue: () => string;
  setValue: (v: string) => void;
  requestMeasure: () => void;
  destroy: () => void;
}

const LANG_EXT: Record<RunnerLang, () => Promise<Extension>> = {
  python: async () => (await import('@codemirror/lang-python')).python(),
  sql: async () => {
    const {sql, SQLite} = await import('@codemirror/lang-sql');
    return sql({dialect: SQLite});
  },
};

export async function createEditor(host: HTMLElement, opts: {
  doc: string;
  lang: RunnerLang;
  onChange: (v: string) => void;
}): Promise<EditorHandle> {
  const [
    {EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection},
    {defaultKeymap, history, historyKeymap, indentWithTab},
    {syntaxHighlighting, indentOnInput, bracketMatching, HighlightStyle},
    {tags},
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@codemirror/language'),
    import('@lezer/highlight'),
  ]);
  const langExt = await LANG_EXT[opts.lang]();

  // 纸墨高亮：颜色写 CSS 变量（在 index.css 的 .cr 作用域定义亮/暗两套）
  const paperInkHighlight = HighlightStyle.define([
    {tag: tags.comment, color: 'var(--cr-comment)', fontStyle: 'italic'},
    {tag: [tags.keyword, tags.operatorKeyword], color: 'var(--cr-keyword)'},
    {tag: [tags.string, tags.special(tags.string)], color: 'var(--cr-string)'},
    {tag: [tags.number, tags.bool], color: 'var(--cr-number)'},
    {tag: [tags.function(tags.variableName), tags.typeName], color: 'var(--cr-func)'},
    {tag: [tags.definition(tags.variableName), tags.propertyName], color: 'var(--cr-fg)'},
    {tag: [tags.operator, tags.punctuation], color: 'var(--cr-operator)'},
  ]);

  const paperInkTheme = EditorView.theme({
    '&': {
      backgroundColor: 'var(--cr-bg)',
      color: 'var(--cr-fg)',
      fontSize: 'var(--ifm-code-font-size)',
    },
    '.cm-content': {
      fontFamily: 'var(--ifm-font-family-monospace)',
      caretColor: 'var(--cr-accent)',
    },
    '&.cm-focused': {outline: 'none'},
    '.cm-gutters': {
      backgroundColor: 'var(--cr-gutter-bg)',
      color: 'var(--cr-muted)',
      border: 'none',
    },
    '.cm-activeLine': {backgroundColor: 'var(--cr-active-line)'},
    '.cm-activeLineGutter': {backgroundColor: 'var(--cr-active-line)'},
    '.cm-selectionBackground, ::selection': {backgroundColor: 'var(--cr-selection) !important'},
    '.cm-cursor': {borderLeftColor: 'var(--cr-accent)'},
  });

  const view = new EditorView({
    parent: host,
    doc: opts.doc,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
      indentOnInput(),
      bracketMatching(),
      syntaxHighlighting(paperInkHighlight),
      paperInkTheme,
      EditorView.lineWrapping,
      langExt,
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange(view.state.doc.toString());
      }),
    ],
  });

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (v: string) => view.dispatch({changes: {from: 0, to: view.state.doc.length, insert: v}}),
    requestMeasure: () => view.requestMeasure(),
    destroy: () => view.destroy(),
  };
}
