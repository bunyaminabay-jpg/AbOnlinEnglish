/*!
 * AbOnlinEnglish — Irregular Verbs page games (Memory Match + Beat-the-Clock Quiz)
 * Data source: <script type="application/json" id="iv-pool-data"> (array of {v1,v2,v3,tr,g})
 * No network calls. Only localStorage is used for the quiz high score (key: ab_iv_quiz_best).
 */
(function () {
  "use strict";
  var srcEl = document.getElementById("iv-pool-data");
  if (!srcEl) return;
  var POOL = [];
  try { POOL = JSON.parse(srcEl.textContent) || []; } catch (e) { return; }
  if (!POOL.length) return;

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(n, exclude) {
    var copy = POOL.filter(function (v) { return !exclude || exclude.indexOf(v) === -1; });
    return shuffle(copy).slice(0, n);
  }
  /* Produces the classic learner mistake: treating an irregular verb as regular
     (go -> "goed" instead of "went", see -> "seed" instead of "saw", cry-type -> "-ied").
     Used as a deliberate wrong quiz option so the game actually drills the real confusion. */
  function fakeRegularPast(v1) {
    var w = v1.toLowerCase();
    var fake;
    if (/[^aeiou]y$/.test(w)) fake = v1.slice(0, -1) + "ied";
    else if (/e$/.test(w)) fake = v1 + "d";
    else fake = v1 + "ed";
    return fake;
  }

  /* ---------------- Tabs ---------------- */
  var tabMemory = document.getElementById("tab-memory");
  var tabQuiz = document.getElementById("tab-quiz");
  var panelMemory = document.getElementById("game-memory");
  var panelQuiz = document.getElementById("game-quiz");
  function selectTab(which) {
    var memOn = which === "memory";
    tabMemory.setAttribute("aria-selected", memOn ? "true" : "false");
    tabQuiz.setAttribute("aria-selected", memOn ? "false" : "true");
    panelMemory.classList.toggle("on", memOn);
    panelQuiz.classList.toggle("on", !memOn);
  }
  if (tabMemory && tabQuiz) {
    tabMemory.addEventListener("click", function () { selectTab("memory"); });
    tabQuiz.addEventListener("click", function () { selectTab("quiz"); });
  }

  /* ---------------- Game 1: Memory Match ---------------- */
  (function () {
    var grid = document.getElementById("mem-grid");
    var movesEl = document.getElementById("mem-moves");
    var foundEl = document.getElementById("mem-found");
    var totalEl = document.getElementById("mem-total");
    var winEl = document.getElementById("mem-win");
    var newBtn = document.getElementById("mem-new");
    var diffBtns = [].slice.call(document.querySelectorAll(".iv-diff button"));
    if (!grid) return;

    var pairs = 6, moves = 0, found = 0, open = [], lock = false;

    diffBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        diffBtns.forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        pairs = +b.getAttribute("data-diff");
        build();
      });
    });
    newBtn.addEventListener("click", build);

    function build() {
      moves = 0; found = 0; open = []; lock = false;
      movesEl.textContent = "0"; foundEl.textContent = "0"; totalEl.textContent = String(pairs);
      winEl.hidden = true;
      var verbs = pick(pairs);
      var cards = [];
      verbs.forEach(function (v, i) {
        cards.push({ pair: i, label: v.v1, side: "v1" });
        cards.push({ pair: i, label: v.v2, side: "v2" });
      });
      cards = shuffle(cards);
      grid.innerHTML = "";
      cards.forEach(function (c, idx) {
        var el = document.createElement("div");
        el.className = "iv-mcard";
        el.setAttribute("data-pair", c.pair);
        el.setAttribute("data-idx", idx);
        el.setAttribute("role", "button");
        el.setAttribute("tabindex", "0");
        el.setAttribute("aria-label", "Kart " + (idx + 1));
        el.innerHTML =
          '<div class="iv-mcard-in">' +
          '<div class="iv-mcard-face iv-mcard-back">?</div>' +
          '<div class="iv-mcard-face iv-mcard-front"></div>' +
          "</div>";
        el.querySelector(".iv-mcard-front").textContent = c.label;
        el.addEventListener("click", function () { flip(el); });
        el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(el); } });
        grid.appendChild(el);
      });
    }

    function flip(el) {
      if (lock) return;
      if (el.classList.contains("flip") || el.classList.contains("matched")) return;
      el.classList.add("flip");
      open.push(el);
      if (open.length === 2) {
        moves++; movesEl.textContent = String(moves);
        lock = true;
        var a = open[0], b = open[1];
        var match = a.getAttribute("data-pair") === b.getAttribute("data-pair");
        setTimeout(function () {
          if (match) {
            a.classList.add("matched"); b.classList.add("matched");
            found++; foundEl.textContent = String(found);
            if (found === pairs) {
              winEl.hidden = false;
              winEl.textContent = "🎉 Tebrikler! " + pairs + " çifti " + moves + " hamlede eşleştirdin.";
            }
          } else {
            a.classList.add("wrong"); b.classList.add("wrong");
            setTimeout(function () {
              a.classList.remove("flip", "wrong"); b.classList.remove("flip", "wrong");
            }, 500);
          }
          open = []; lock = false;
        }, 650);
      }
    }
    build();
  })();

  /* ---------------- Game 2: Beat-the-Clock Quiz ---------------- */
  (function () {
    var scoreEl = document.getElementById("quiz-score");
    var bestEl = document.getElementById("quiz-best");
    var streakEl = document.getElementById("quiz-streak");
    var timerEl = document.getElementById("quiz-timer");
    var stage = document.getElementById("quiz-stage");
    var beginBtn = document.getElementById("quiz-begin");
    if (!stage) return;

    var BEST_KEY = "ab_iv_quiz_best";
    var best = 0;
    try { best = +(localStorage.getItem(BEST_KEY) || 0); } catch (e) {}
    bestEl.textContent = String(best);

    var score = 0, streak = 0, timeLeft = 60, timerId = null, answering = false, usedRecently = [];

    function startGame() {
      score = 0; streak = 0; timeLeft = 60; usedRecently = [];
      scoreEl.textContent = "0"; streakEl.textContent = "0";
      timerEl.textContent = "60"; timerEl.classList.remove("low");
      timerId = setInterval(tick, 1000);
      nextQuestion();
    }
    function tick() {
      timeLeft--;
      timerEl.textContent = String(Math.max(timeLeft, 0));
      if (timeLeft <= 10) timerEl.classList.add("low");
      if (timeLeft <= 0) endGame();
    }
    function endGame() {
      clearInterval(timerId);
      if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {} bestEl.textContent = String(best); }
      stage.innerHTML =
        '<div class="iv-quiz-end"><p class="gq-hint">Süre doldu!</p><div class="score">' + score + '</div>' +
        '<p class="gq-hint">doğru cevap' + (score > 0 && score === best ? " — yeni rekor! 🏆" : "") + '</p>' +
        '<button type="button" class="grx-btn grx-btn-primary" id="quiz-again">↻ Tekrar Oyna</button></div>';
      document.getElementById("quiz-again").addEventListener("click", startGame);
    }
    function nextQuestion() {
      answering = true;
      if (usedRecently.length > 20) usedRecently = usedRecently.slice(-10);
      var verb = pick(1, usedRecently)[0] || pick(1)[0];
      usedRecently.push(verb);
      var distractors = [];
      var fake = fakeRegularPast(verb.v1);
      if (fake !== verb.v2 && fake !== verb.v3) distractors.push(fake);
      var wrongPool = POOL.filter(function (v) { return v.v2 !== verb.v2 && v.v2 !== fake; });
      shuffle(wrongPool).some(function (v) {
        if (distractors.indexOf(v.v2) === -1) distractors.push(v.v2);
        return distractors.length >= 3;
      });
      var options = shuffle([verb.v2].concat(distractors.slice(0, 3)));
      stage.innerHTML =
        '<div class="iv-quiz-prompt"><span class="lbl">Past Simple (V2) nedir?</span><div class="verb">' + verb.v1 + '</div></div>' +
        '<div class="iv-quiz-opts" id="quiz-opts"></div>';
      var opts = document.getElementById("quiz-opts");
      options.forEach(function (opt) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "iv-qopt"; b.textContent = opt;
        b.addEventListener("click", function () { answer(b, opt, verb.v2, opts); });
        opts.appendChild(b);
      });
    }
    function answer(btn, chosen, correct, opts) {
      if (!answering) return;
      answering = false;
      [].slice.call(opts.children).forEach(function (b) { b.disabled = true; if (b.textContent === correct) b.setAttribute("data-r", "correct"); });
      if (chosen !== correct) btn.setAttribute("data-r", "wrong");
      if (chosen === correct) { score++; streak++; } else { streak = 0; }
      scoreEl.textContent = String(score); streakEl.textContent = String(streak);
      setTimeout(function () { if (timeLeft > 0) nextQuestion(); }, 550);
    }

    beginBtn.addEventListener("click", startGame);
  })();
})();
