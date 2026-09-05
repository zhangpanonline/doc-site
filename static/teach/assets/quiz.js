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
   选项顺序由课程作者在创作时打乱，组件运行时保持原样。
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
          : pct >= 0.5 ? `📖 答对 ${correct} 题，建议回看《24.协程》再挑战一次`
          : `🌱 答对 ${correct} 题，先回读一遍文档再来吧`;
      } else {
        finale.textContent = '';
      }
    }

    questions.forEach(q => {
      const idx = Number(q.dataset.correct);
      const options = Array.from(q.querySelectorAll('.quiz-option'));
      const explain = q.querySelector('.quiz-explain');

      options.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          if (q.classList.contains('answered')) return;
          q.classList.add('answered');
          answered++;

          const isRight = i === idx;
          if (isRight) {
            btn.classList.add('correct');
            correct++;
          } else {
            btn.classList.add('wrong');
            options[idx].classList.add('correct');
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
