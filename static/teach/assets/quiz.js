/* ============================================================
   可复用测验组件 · teach/assets/quiz.js （纯 vanilla，无依赖）

   用法：
   <div class="quiz">
     <div class="quiz-q" data-correct="0">
       <div class="quiz-prompt">问题（可含 <code> / <pre>）</div>
       <div class="quiz-options">
         <button class="quiz-option">选项A</button>
         <button class="quiz-option">选项B</button>
       </div>
       <div class="quiz-explain" hidden>解释文字</div>
     </div>
     ...
   </div>

   data-correct 是正确选项的下标（从 0 开始）。
   选项顺序：每次页面加载与「重新挑战」时由组件随机洗牌（正确选项随内容移动，
   data-correct 同步更新），避免答案位置可被记忆。
   ============================================================ */

(function () {
  function initQuiz(quiz) {
    const questions = Array.from(quiz.querySelectorAll('.quiz-q'));
    if (!questions.length) return;

    // 先保存解释原文，供「重新挑战」恢复
    questions.forEach(q => {
      const ex = q.querySelector('.quiz-explain');
      if (ex) ex.dataset.text = ex.textContent;
    });

    // 运行时随机洗牌：每次加载/重新挑战时选项位置都不同（正确选项随内容移动）
    function shuffleOptions(q) {
      const options = Array.from(q.querySelectorAll('.quiz-option'));
      if (options.length < 2) return;
      const correctIdx = Number(q.dataset.correct);
      const order = options.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const box = q.querySelector('.quiz-options');
      order.forEach(i => box.appendChild(options[i]));
      q.dataset.correct = String(order.indexOf(correctIdx));
    }
    questions.forEach(shuffleOptions);

    // 计分栏
    const scorebar = document.createElement('div');
    scorebar.className = 'quiz-scorebar';
    const progress = document.createElement('span');
    progress.className = 'quiz-progress';
    const finale = document.createElement('span');
    scorebar.append(progress, finale);
    quiz.insertBefore(scorebar, quiz.firstChild);

    // 重新挑战按钮
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'quiz-reset';
    reset.textContent = '重新挑战';
    quiz.appendChild(reset);

    let answered = 0;
    let correct = 0;

    function refresh() {
      progress.textContent = `进度 ${answered} / ${questions.length}`;
      if (answered === questions.length) {
        const pct = correct / questions.length;
        finale.textContent =
          pct === 1 ? '🎉 全部答对！'
          : pct >= 0.75 ? `💪 答对 ${correct} 题，掌握得不错！`
          : pct >= 0.5 ? `📖 答对 ${correct} 题，建议回看课程文档再挑战一次`
          : `🌱 答对 ${correct} 题，先回读一遍文档再来吧`;
      } else {
        finale.textContent = '';
      }
    }

    questions.forEach(q => {
      const explain = q.querySelector('.quiz-explain');

      q.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          answered++;

          // 洗牌后正确下标可能变化：点击时实时查询当前 DOM 顺序
          const opts = Array.from(q.querySelectorAll('.quiz-option'));
          const idx = Number(q.dataset.correct);
          const isRight = opts.indexOf(btn) === idx;
          if (isRight) {
            btn.classList.add('correct');
            correct++;
          } else {
            btn.classList.add('wrong');
            opts[idx].classList.add('correct');
          }

          if (explain) {
            explain.hidden = false;
            explain.classList.add(isRight ? 'correct-fb' : 'wrong-fb');
            explain.textContent = (isRight ? '✅ 正确！' : '❌ 答错了。') + explain.dataset.text;
          }
          refresh();
        });
      });
    });

    reset.addEventListener('click', () => {
      answered = 0;
      correct = 0;
      questions.forEach(shuffleOptions);   // 重新挑战：选项位置再次随机
      questions.forEach(q => {
        q.classList.remove('answered');
        q.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('correct', 'wrong'));
        const ex = q.querySelector('.quiz-explain');
        if (ex) {
          ex.hidden = true;
          ex.classList.remove('correct-fb', 'wrong-fb');
          ex.textContent = ex.dataset.text;
        }
      });
      refresh();
    });

    refresh();
  }

  function boot() {
    document.querySelectorAll('.quiz').forEach(initQuiz);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
