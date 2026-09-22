/**
 * 语言注册表：可运行语言的识别与展示信息。
 * 未来加语言（如 java）= 在此加一行 + engines/ 加一个引擎。
 */

export type RunnerLang = 'python' | 'sql';

export interface LangSpec {
  label: string;
  engine: 'pyodide' | 'sqljs';
}

export const RUNNER_LANGS: Record<RunnerLang, LangSpec> = {
  python: {label: 'Python', engine: 'pyodide'},
  sql: {label: 'SQL', engine: 'sqljs'},
};

export function matchRunnerLanguage(className?: string): RunnerLang | null {
  if (!className) return null;
  if (/\blanguage-(python|py)\b/.test(className)) return 'python';
  if (/\blanguage-sql\b/.test(className)) return 'sql';
  return null;
}
