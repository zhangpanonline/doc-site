import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Image from '@site/src/components/Image';
import CodeRunner from '@site/src/components/CodeRunner';
import {matchRunnerLanguage} from '@site/src/components/CodeRunner/languages';

/**
 * 围栏代码块分流（fenced 块经 MDXComponents.pre 进入，children 是原 Code
 * 组件，className/代码字符串都在其 props 上）：
 * - ```python / ```sql → CodeRunner（可运行代码块：运行/编辑/重置）
 * - 其余语言 → 原样渲染（与官方 MDXPre 行为一致，仅透传 children）
 */

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

function MDXPre(props: {children?: React.ReactNode}): React.JSX.Element {
  // 全站代码块统一显示行号：给原 Code 元素直接注入 showLineNumbers 布尔 prop
  //（CodeBlock 的 createCodeBlockMetadata 直接消费该 prop，最稳路径；
  //  title="..." 等既有 meta 不受影响）
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

  // 非目标语言、手写 <pre>、children 非纯字符串 → 原样透传
  if (!runnerLang || !code) {
    return <>{props.children}</>;
  }
  return <CodeRunner language={runnerLang} code={code} staticNode={props.children} />;
}

export default {
  ...MDXComponents,
  pre: MDXPre,
  Image,
};
