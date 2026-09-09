/* ============================================================
   面试实战弹框组件 · teach/assets/interview.js （纯 vanilla，无依赖）
   按《面试实战模板 v2》（teach/INTERVIEW-TEMPLATE.md）实现。

   用法：课程页面试实战小节内放两样东西——
   1) 题目数据脚本（必须在 interview.js 之前）：
      <script>
        window.__interview = {
          lesson: '0008-类和对象',          // localStorage 缓存键用
          questions: [
            {
              type: 'trap',                 // trap|mechanism|review|design|scenario（主型）
              subtype: 'mechanism',         // 可选，副型（复合题标注）
              level: '中级岗常问',           // 职级标签，仅展示不分组
              prompt: `题干（可含 <pre><code>，用反引号模板串，注意内容里不要出现反引号）`,
              scene: {                      // 仅 scenario 型需要：任务卡
                time: '约 15 分钟',
                goal: '任务目标',
                accept: ['验收点一', '验收点二'],
              },
              source: '出处（HTML，允许 <a>）',
              breakdown: `思路拆解（HTML，场景题给思路而非标准答案）`,
            },
            ...
          ],
        };
      </script>
   2) 触发按钮：<button type="button" class="interview-launch">开始面试实战</button>

   交互（v2）：弹框一次一题 → 作答框（答案按题缓存 localStorage，键
   interview-answer:<lesson>:<序号>，下次打开自动回填）→ 点击核对思路拆解
   → 用户自判 → 下一题。不显示总数、不显示第几题；最后一道完成页
   「所有题做完了」+ 重新练习（同一顺序）。Esc / 点遮罩 / × 关闭，
   重开弹框回到当前题。
   ============================================================ */

(function () {
  const TYPE_META = {
    trap: {emoji: '🕳️', label: '陷阱', rank: 0},
    mechanism: {emoji: '⚙️', label: '机制', rank: 1},
    review: {emoji: '🩺', label: '代码审查排错', rank: 2},
    design: {emoji: '🏗️', label: '设计选型', rank: 3},
    scenario: {emoji: '🤖', label: 'AI 辅助场景', rank: 4},
  };

  const storageKey = (lesson, idx) => `interview-answer:${lesson}:${idx}`;

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function initInterview(launchBtn) {
    const data = window.__interview;
    if (!data || !Array.isArray(data.questions) || !data.questions.length) return;

    // 展示顺序固定：陷阱 → 机制 → 审查排错 → 设计选型 → AI 辅助场景（同类保持原有先后）
    data.questions = data.questions
      .map((q, i) => ({q, i}))
      .sort((a, b) => ((TYPE_META[a.q.type]?.rank ?? 9) - (TYPE_META[b.q.type]?.rank ?? 9)) || (a.i - b.i))
      .map(x => x.q);

    let current = 0;      // 当前题序号（关闭重开不重置）
    let revealed = false; // 当前题是否已核对
    let done = false;     // 是否已到完成页
    let modal = null;
    let answerEl = null;
    let breakdownEl = null;
    let nextBtn = null;
    let checkBtn = null;

    function saveAnswer() {
      try {
        localStorage.setItem(storageKey(data.lesson, current), answerEl.value);
      } catch {
        // localStorage 不可用（隐私模式等）时静默跳过
      }
    }

    function buildBadges(q) {
      const meta = TYPE_META[q.type] || {emoji: '❓', label: q.type};
      const sub = q.subtype && TYPE_META[q.subtype]
        ? ` · 含${TYPE_META[q.subtype].emoji}${TYPE_META[q.subtype].label}` : '';
      return `<div class="iv-badges">
        <span class="iv-badge iv-badge--type">${meta.emoji} ${meta.label}${sub}</span>
        ${q.level ? `<span class="iv-badge iv-badge--level">${q.level}</span>` : ''}
      </div>`;
    }

    function buildScene(q) {
      if (!q.scene) return '';
      const accept = (q.scene.accept || []).map(a => `<li>${a}</li>`).join('');
      return `<div class="iv-scene">
        <p class="iv-scene-goal">🎯 ${q.scene.goal}</p>
        <p class="iv-scene-time">⏱️ 建议用时：${q.scene.time}（不强制计时）</p>
        ${accept ? `<ul class="iv-scene-accept"><li class="iv-accept-head">验收点</li>${accept}</ul>` : ''}
      </div>`;
    }

    function renderQuestion() {
      const q = data.questions[current];
      revealed = false;
      const saved = (() => {
        try {
          return localStorage.getItem(storageKey(data.lesson, current)) || '';
        } catch {
          return '';
        }
      })();
      modal.querySelector('.iv-body').innerHTML = `
        ${buildBadges(q)}
        <div class="iv-prompt">${q.prompt}</div>
        ${buildScene(q)}
        <label class="iv-answer-label" for="iv-answer">写下你的答案</label>
        <textarea id="iv-answer" class="iv-answer" rows="5"
          placeholder="先自己组织语言回答，再点击核对——写在纸上和说出口是两回事。">${saved}</textarea>
        <p class="iv-answer-hint">已自动保存到本地（仅存于当前浏览器）· <button type="button" class="iv-clear" id="iv-clear">清空本题</button></p>
        <div class="iv-breakdown" hidden></div>
      `;
      answerEl = modal.querySelector('.iv-answer');
      breakdownEl = modal.querySelector('.iv-breakdown');
      modal.querySelector('.iv-clear').addEventListener('click', () => {
        answerEl.value = '';
        try { localStorage.removeItem(storageKey(data.lesson, current)); } catch {}
        answerEl.focus();
      });
      answerEl.addEventListener('input', saveAnswer);
      checkBtn.textContent = '点击核对思路拆解';
      checkBtn.hidden = false;
      nextBtn.textContent = '下一题';
      nextBtn.hidden = true;
    }

    function renderDone() {
      done = true;
      modal.querySelector('.iv-body').innerHTML = `
        <div class="iv-done">
          <p class="iv-done-emoji">🎉</p>
          <p class="iv-done-text">所有题做完了</p>
          <p class="iv-done-sub">面试没有标准答案，练习的意义在于「先想、再说、再对」——去面一场试试吧。</p>
        </div>
      `;
      checkBtn.hidden = true;
      nextBtn.textContent = '重新练习';
      nextBtn.hidden = false;
    }

    function nextQuestion() {
      if (done) {
        // 重新练习：同一顺序重走一遍，已保存的答案保留
        current = 0;
        done = false;
        renderQuestion();
        return;
      }
      if (current + 1 < data.questions.length) {
        current += 1;
        renderQuestion();
      } else {
        renderDone();
      }
    }

    launchBtn.addEventListener('click', () => {
      if (!modal) {
        modal = el(`
          <div class="iv-overlay" role="dialog" aria-modal="true" aria-label="面试实战">
            <div class="iv-dialog">
              <button type="button" class="iv-close" aria-label="关闭">×</button>
              <div class="iv-body"></div>
              <div class="iv-actions">
                <button type="button" class="iv-btn iv-btn--primary"></button>
                <button type="button" class="iv-btn" hidden></button>
              </div>
            </div>
          </div>
        `);
        checkBtn = modal.querySelector('.iv-btn--primary');
        nextBtn = modal.querySelectorAll('.iv-btn')[1];
        checkBtn.addEventListener('click', () => {
          if (!revealed) {
            const q = data.questions[current];
            breakdownEl.innerHTML = q.breakdown
              + (q.source ? `<p class="iv-src">📚 ${q.source}</p>` : '');
            breakdownEl.hidden = false;
            revealed = true;
            checkBtn.hidden = true;
            nextBtn.hidden = false;
          }
        });
        nextBtn.addEventListener('click', nextQuestion);
        modal.querySelector('.iv-close').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(modal);
        renderQuestion();
      }
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (answerEl) answerEl.focus();
    });

    function close() {
      if (modal) {
        modal.hidden = true;
        document.body.style.overflow = '';
      }
    }

    function onKey(e) {
      if (e.key === 'Escape' && modal && !modal.hidden) close();
    }
  }

  document.querySelectorAll('.interview-launch').forEach(initInterview);
})();
