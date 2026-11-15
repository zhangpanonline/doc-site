import React, {useEffect, useRef, useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

type XMindViewerProps = {
  /** 站点内 .xmind 文件路径，如 /xmind/ai-classification.xmind（文件自托管在 static/xmind/） */
  fileUrl: string;
  /** 查看器高度（px），默认 640 */
  height?: number;
};

/**
 * XMind 官方 Embed Viewer 封装：
 * - 仅在浏览器端加载（SDK 依赖 iframe/postMessage，SSR 阶段不渲染）；
 * - 查看器外壳由 xmind.cn 托管（region: 'cn'，国内访问更快），文件内容走 postMessage 传入，不经第三方服务器；
 * - .xmind 文件本体自托管在 static/xmind/，不依赖外部图床/仓库。
 */
function XMindViewerInner({fileUrl, height = 640}: XMindViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {XMindEmbedViewer} = await import('xmind-embed-viewer');
        if (cancelled || !containerRef.current) return;

        const viewer = new XMindEmbedViewer({
          el: containerRef.current,
          region: 'cn',
        });

        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`脑图文件加载失败：HTTP ${res.status}`);
        const file = await res.arrayBuffer();
        if (!cancelled) viewer.load(file);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (error) {
    return (
      <div style={{padding: '1rem', border: '1px solid var(--ifm-color-danger)', borderRadius: 8}}>
        脑图加载失败：{error}。可 <a href={fileUrl}>直接下载 .xmind 文件</a> 后用 XMind 客户端打开。
      </div>
    );
  }

  return <div ref={containerRef} style={{width: '100%', height}} />;
}

export default function XMindViewer(props: XMindViewerProps) {
  return (
    <BrowserOnly fallback={<div style={{width: '100%', height: props.height ?? 640}}>脑图加载中…</div>}>
      {() => <XMindViewerInner {...props} />}
    </BrowserOnly>
  );
}
