/* 静态互动课/速查表的数学公式渲染（本地 KaTeX，不走 CDN）。
 *
 * 为什么需要：站点根目录的 docusaurus.config.ts 只给 docs 的 MDX 管线挂了
 * remark-math + rehype-katex；teach/lessons|reference 是 static 静态 HTML，
 * 不经过那条管线，所以 $...$ / $$...$$ 需要这个加载器在浏览器里渲染。
 *
 * 用法：在页面 </body> 前加一行
 *   <script src="../assets/math.js"></script>
 * （KaTeX 的 CSS 由本脚本注入，也可在 head 里额外写 <link> 以更早生效）
 *
 * 安全性：auto-render 默认忽略 pre/code/script/style/textarea/option，
 * 所以代码块里的 $ 不会被误渲染。
 */
(function () {
  var self = document.currentScript;
  var base = self && self.src ? self.src.replace(/[^/]*$/, '') + 'katex/' : '../assets/katex/';

  // 1) 注入 KaTeX 样式（若 head 里已有 <link> 则跳过）
  if (!document.querySelector('link[href$="katex/katex.min.css"]')) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = base + 'katex.min.css';
    document.head.appendChild(link);
  }

  function loadScript(src, cb) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = cb;
    s.onerror = function () {
      // 公式渲染失败不应影响课程其它功能（测验/面试实战）
      if (window.console) console.warn('[math.js] 加载失败：' + src);
    };
    document.head.appendChild(s);
  }

  function render() {
    if (typeof window.renderMathInElement !== 'function') return;
    window.renderMathInElement(document.body, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '\\[', right: '\\]', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
      ],
      throwOnError: false,
      errorColor: '#9d3b2c',
    });
  }

  /* 动态内容（如 interview.js 的弹框题目、quiz 反馈）是 innerHTML 插入的，
     只在 DOMContentLoaded 渲染一次会漏掉它们；这里用 MutationObserver 补渲染。
     渲染本身会改 DOM，所以先 disconnect 再渲染，避免自我触发死循环。 */
  var observer = null;
  var scheduled = null;

  function observe() {
    observer = new MutationObserver(function () {
      if (scheduled) return;
      scheduled = setTimeout(function () {
        scheduled = null;
        if (observer) observer.disconnect();
        render();
        if (observer) observe();
      }, 150);
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }

  function boot() {
    if (typeof window.renderMathInElement === 'function') {
      render();
      observe();
      return;
    }
    loadScript(base + 'katex.min.js', function () {
      loadScript(base + 'auto-render.min.js', function () {
        render();
        observe();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
