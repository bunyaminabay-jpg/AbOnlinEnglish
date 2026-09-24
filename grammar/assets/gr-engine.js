/*!
 * AbOnlinEnglish Dil Eğitimi — Interactive Grammar Engine v2
 * One engine for every /grammar lesson. A page only supplies data:
 *   <script type="application/json" id="gr-quiz-data">{ topic, level, quickCheck:[], practice:[], finalTest:[] }</script>
 * and mount points:  <div data-gq="quickCheck"></div>  <div data-gq="practice"></div>  <div data-gq="finalTest"></div>
 *
 * Question schema (all types):
 *   { id, type, question, options?, correctAnswer?, answers?, segments?, context?, prefix?, suffix?,
 *     correction?, explanation, skill? }
 *   type: multiple-choice | choose-structure | sentence-completion | meaning | context   -> options + correctAnswer (index)
 *         fill-blank | transformation                                                    -> answers (accepted strings)
 *         find-mistake                                                                   -> segments + correctAnswer (index) + correction
 *
 * Security: every piece of text (including the learner's typed answer) is written with
 * textContent / createTextNode — never innerHTML. No network calls, no personal data.
 * Progress is stored only in this browser (localStorage, key ab_grammar_progress_v1).
 */
(function () {
  "use strict";

  var TYPE_LABEL = {
    "multiple-choice": "Multiple choice", "fill-blank": "Fill in the blank", "find-mistake": "Find the mistake",
    "choose-structure": "Choose the structure", "sentence-completion": "Complete the sentence",
    "meaning": "Meaning", "transformation": "Rewrite", "context": "In context"
  };
  var CHOICE = { "multiple-choice": 1, "choose-structure": 1, "sentence-completion": 1, "meaning": 1, "context": 1 };
  var LETTERS = "ABCDEFGH";

  /* ---------------- helpers ---------------- */
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k) || attrs[k] == null) continue;
      if (k === "class") n.className = attrs[k];
      else if (k === "text") n.textContent = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (children || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function range(n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; }

  var CONTRACTIONS = [
    [/\bwon't\b/g, "will not"], [/\bcan't\b/g, "cannot"], [/\bcan not\b/g, "cannot"], [/\bshan't\b/g, "shall not"],
    [/n't\b/g, " not"], [/'d rather\b/g, " would rather"], [/'d prefer\b/g, " would prefer"],
    [/'m\b/g, " am"], [/'re\b/g, " are"], [/'ve\b/g, " have"], [/'ll\b/g, " will"]
  ];
  function norm(s) {
    s = String(s || "").toLowerCase().replace(/[‘’ʼ`´]/g, "'").replace(/[“”]/g, '"');
    s = s.replace(/[.!?,;:]+\s*$/g, "").replace(/\s+/g, " ").trim();
    CONTRACTIONS.forEach(function (p) { s = s.replace(p[0], p[1]); });
    return s.replace(/\s+/g, " ").trim();
  }
  function isRightText(v, answers) { var n = norm(v); if (!n) return false; return (answers || []).some(function (a) { return norm(a) === n; }); }

  /* Render "I'd rather ___ tea." with a visual blank (text-only, safe) */
  function promptNode(q, tag) {
    var p = el(tag || "p", { "class": "gq-prompt" });
    String(q.question).split("___").forEach(function (part, i, arr) {
      p.appendChild(document.createTextNode(part));
      if (i < arr.length - 1) p.appendChild(el("span", { "class": "gq-blank", "aria-label": "boşluk" }));
    });
    return p;
  }
  function correctText(q) {
    if (CHOICE[q.type]) return q.options[q.correctAnswer];
    if (q.type === "find-mistake") return q.segments[q.correctAnswer] + (q.correction ? " → " + q.correction : "");
    return (q.answers || [])[0] || "";
  }
  function fullCorrect(q) {
    if (q.type === "transformation") return [q.prefix, (q.answers || [])[0], q.suffix].filter(Boolean).join(" ").replace(/\s+([.,!?])/g, "$1");
    return correctText(q);
  }

  /* ---------------- progress (compatible with the existing grammar hub) ---------------- */
  var Progress = (function () {
    var KEY = "ab_grammar_progress_v1";
    function load() { try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : { topics: {}, quizAttempts: {} }; } catch (e) { return { topics: {}, quizAttempts: {} }; } }
    function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
    return {
      visit: function (id) { var s = load(); s.topics = s.topics || {}; if (!s.topics[id]) { s.topics[id] = { status: "in-progress", updatedAt: Date.now() }; save(s); } },
      record: function (id, correct, total, missed) {
        var s = load(); s.quizAttempts = s.quizAttempts || {}; s.topics = s.topics || {};
        var pct = total ? Math.round(correct / total * 100) : 0;
        (s.quizAttempts[id] = s.quizAttempts[id] || []).push({ at: Date.now(), correct: correct, total: total, pct: pct, missed: missed || [] });
        s.quizAttempts[id] = s.quizAttempts[id].slice(-10);
        s.topics[id] = { status: pct >= 85 ? "mastered" : pct >= 60 ? "completed" : "needs-review", updatedAt: Date.now() };
        save(s);
      }
    };
  })();

  /* ---------------- one question card ----------------
     mode "instant": feedback immediately (choice = on click, text = Check button)
     mode "test":    selection is only recorded; feedback appears in the result review */
  function Question(q, number, mode, onAnswer) {
    var state = { answered: false, value: null, correct: null, label: null };
    var li = el("li", { "class": "gq-q", "data-qid": q.id });
    var fs = el("fieldset");
    var legendId = "gq-" + mode + "-" + q.id;
    var legend = el("legend", { "class": "gq-legend", id: legendId }, [
      el("span", { "class": "gq-head" }, [
        el("span", { "class": "gq-num", text: number + "." }),
        el("span", { "class": "gq-type", lang: "en", text: TYPE_LABEL[q.type] || "Question" })
      ]),
      q.context ? el("span", { "class": "gq-context", text: q.context }) : null,
      promptNode(q, "span")
    ]);
    fs.appendChild(legend);
    var fb = el("div", { "class": "gq-fb", hidden: "", "aria-live": "polite" });
    var controls = [];

    function lock() { controls.forEach(function (c) { c.disabled = true; }); }

    function showFeedback() {
      fb.textContent = "";
      fb.hidden = false;
      fb.className = "gq-fb " + (state.correct ? "gq-fb-ok" : "gq-fb-no");
      fb.appendChild(el("span", { "class": "gq-fb-title", text: state.correct ? "✓ Correct!" : "✗ Not quite." }));
      if (!state.correct) fb.appendChild(el("span", { "class": "gq-fb-line" }, [el("b", { text: "Correct answer: " }), fullCorrect(q)]));
      if (q.explanation) fb.appendChild(el("span", { "class": "gq-fb-line" }, [el("b", { text: "Why? " }), q.explanation]));
    }

    function commit(value, label, correct) {
      state.value = value; state.label = label; state.correct = correct; state.answered = true;
      if (mode === "instant") { lock(); markChoices(); showFeedback(); }
      onAnswer && onAnswer(state);
    }

    function markChoices() {
      controls.forEach(function (b) {
        if (b.getAttribute("data-idx") == null) return;
        var idx = +b.getAttribute("data-idx");
        var mark = b.querySelector(".gq-mark");
        if (idx === q.correctAnswer) { b.setAttribute("data-state", "correct"); if (mark) mark.textContent = "✓"; }
        else if (idx === state.value) { b.setAttribute("data-state", "wrong"); if (mark) mark.textContent = "✗"; }
      });
      if (q.type === "fill-blank" || q.type === "transformation") {
        controls.forEach(function (c) { if (c.tagName === "INPUT") c.setAttribute("data-state", state.correct ? "correct" : "wrong"); });
      }
    }

    if (CHOICE[q.type]) {
      var order = mode === "instant" || mode === "test" ? shuffle(range(q.options.length)) : range(q.options.length);
      var short = q.options.every(function (o) { return o.length <= 22; });
      var box = el("div", { "class": "gq-opts" + (short ? " gq-opts-short" : ""), role: "group", "aria-labelledby": legendId });
      order.forEach(function (idx, pos) {
        var b = el("button", { type: "button", "class": "gq-opt", "data-idx": idx, "aria-pressed": "false" }, [
          el("span", { "class": "gq-key", "aria-hidden": "true", text: LETTERS[pos] }),
          el("span", { text: q.options[idx] }),
          el("span", { "class": "gq-mark", "aria-hidden": "true" })
        ]);
        b.addEventListener("click", function () {
          if (state.answered && mode === "instant") return;
          controls.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          commit(idx, q.options[idx], idx === q.correctAnswer);
        });
        controls.push(b); box.appendChild(b);
      });
      fs.appendChild(box);
    } else if (q.type === "find-mistake") {
      fs.appendChild(el("p", { "class": "gq-hint", text: "Hatalı bölümü seç. (Select the part that is wrong.)" }));
      var line = el("div", { "class": "gq-seg-line", role: "group", "aria-labelledby": legendId });
      q.segments.forEach(function (seg, idx) {
        var b = el("button", { type: "button", "class": "gq-seg", "data-idx": idx, "aria-pressed": "false" }, [
          el("span", { text: seg }), el("span", { "class": "gq-key", "aria-hidden": "true", text: LETTERS[idx] }),
          el("span", { "class": "gq-mark grx-sr" })
        ]);
        b.addEventListener("click", function () {
          if (state.answered && mode === "instant") return;
          controls.forEach(function (c) { c.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          commit(idx, seg, idx === q.correctAnswer);
        });
        controls.push(b); line.appendChild(b); line.appendChild(document.createTextNode(" "));
      });
      fs.appendChild(line);
    } else {
      var inputId = "gqi-" + mode + "-" + q.id;
      var input = el("input", { type: "text", "class": "gq-input", id: inputId, autocomplete: "off", autocapitalize: "off", spellcheck: "false", "aria-labelledby": legendId, placeholder: "Cevabını yaz…" });
      var row = el("div", { "class": "gq-input-row" }, [
        q.prefix ? el("span", { "class": "gq-affix", text: q.prefix }) : null, input,
        q.suffix ? el("span", { "class": "gq-affix", text: q.suffix }) : null
      ]);
      fs.appendChild(row);
      controls.push(input);
      if (mode === "instant") {
        var check = el("button", { type: "button", "class": "grx-btn grx-btn-navy", disabled: "", text: "Check answer" });
        controls.push(check);
        input.addEventListener("input", function () { check.disabled = !input.value.trim(); });
        var go = function () { if (!input.value.trim() || state.answered) return; commit(input.value, input.value.trim(), isRightText(input.value, q.answers)); };
        check.addEventListener("click", go);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); go(); } });
        fs.appendChild(el("div", { "class": "gq-actions" }, [check]));
      } else {
        input.addEventListener("input", function () {
          var v = input.value.trim();
          if (!v) { state.answered = false; state.value = null; onAnswer && onAnswer(state); return; }
          commit(input.value, v, isRightText(input.value, q.answers));
        });
      }
    }
    fs.appendChild(fb);
    li.appendChild(fs);
    return { node: li, state: state, q: q, focus: function () { var c = controls[0]; c && c.focus({ preventScroll: true }); } };
  }

  /* ---------------- Quick Check / Practice (instant feedback) ---------------- */
  function InstantSet(host, questions, label) {
    var items, done, right;
    var bar = el("div", { "class": "gq-bar" });
    var track = el("div", { "class": "gq-bar-track", "aria-hidden": "true" }, [el("div", { "class": "gq-bar-fill" })]);
    var count = el("span", { "aria-live": "polite" });
    bar.appendChild(track); bar.appendChild(count);
    var list = el("ol", { "class": "gq-list" });
    var summary = el("div", { "class": "gq-summary", hidden: "", "aria-live": "polite" });
    var reset = el("button", { type: "button", "class": "grx-btn grx-btn-ghost", text: "↻ Try again" });
    var actions = el("div", { "class": "gq-actions" }, [reset]);

    function update() {
      track.firstChild.style.width = Math.round(done / questions.length * 100) + "%";
      count.textContent = done + " / " + questions.length + " answered · " + right + " correct";
      if (done === questions.length) {
        summary.hidden = false;
        summary.textContent = label + ": " + right + " / " + questions.length + " correct. " +
          (right === questions.length ? "Great work — move on to the next section." : "Read the explanations above, then press “Try again”.");
      }
    }
    function build() {
      list.textContent = ""; summary.hidden = true; done = 0; right = 0;
      items = questions.map(function (q, i) {
        var it = Question(q, i + 1, "instant", function (st) { done++; if (st.correct) right++; update(); });
        list.appendChild(it.node); return it;
      });
      update();
    }
    reset.addEventListener("click", function () { build(); items[0] && items[0].focus(); });
    host.textContent = "";
    [bar, list, summary, actions].forEach(function (n) { host.appendChild(n); });
    build();
  }

  /* ---------------- Final test (feedback only at the end) ---------------- */
  function FinalTest(host, questions, topicId) {
    var items, cur, confirmFinish;
    host.textContent = "";
    var box = el("div", { "class": "gq-final" });
    host.appendChild(box);

    function start() {
      box.textContent = "";
      box.appendChild(el("div", { "class": "gq-start" }, [
        el("p", { text: questions.length + " questions · Answers and explanations appear after you finish." }),
        (function () { var b = el("button", { type: "button", "class": "grx-btn grx-btn-primary", text: "Start the final check" }); b.addEventListener("click", run); return b; })()
      ]));
    }

    function run() {
      box.textContent = ""; cur = 0; confirmFinish = false;
      var dots = el("ol", { "class": "gq-dots", "aria-label": "Questions" });
      var stage = el("ol", { "class": "gq-list", start: "1" });
      var status = el("p", { "class": "gq-hint", "aria-live": "polite" });
      var prev = el("button", { type: "button", "class": "grx-btn grx-btn-ghost", text: "← Previous" });
      var next = el("button", { type: "button", "class": "grx-btn grx-btn-navy", text: "Next →" });
      var finish = el("button", { type: "button", "class": "grx-btn grx-btn-primary", text: "Finish & see my score" });
      items = questions.map(function (q, i) {
        var it = Question(q, i + 1, "test", function () { refresh(); });
        var d = el("button", { type: "button", "class": "gq-dot", "aria-label": "Question " + (i + 1), text: String(i + 1) });
        d.addEventListener("click", function () { show(i); });
        it.dot = d; dots.appendChild(el("li", null, [d]));
        return it;
      });
      function answered() { return items.filter(function (it) { return it.state.answered; }).length; }
      function refresh() {
        items.forEach(function (it, i) { it.dot.setAttribute("data-answered", it.state.answered ? "true" : "false"); if (i === cur) it.dot.setAttribute("aria-current", "step"); else it.dot.removeAttribute("aria-current"); });
        prev.disabled = cur === 0;
        next.hidden = cur === items.length - 1;
        var a = answered();
        status.textContent = confirmFinish && a < items.length
          ? (items.length - a) + " question(s) unanswered. Press “Finish” again to submit anyway."
          : "Question " + (cur + 1) + " of " + items.length + " · " + a + " answered";
      }
      function show(i) { cur = i; confirmFinish = false; stage.textContent = ""; stage.setAttribute("start", String(i + 1)); stage.appendChild(items[i].node); refresh(); items[i].focus(); }
      prev.addEventListener("click", function () { if (cur > 0) show(cur - 1); });
      next.addEventListener("click", function () { if (cur < items.length - 1) show(cur + 1); });
      finish.addEventListener("click", function () {
        if (answered() < items.length && !confirmFinish) { confirmFinish = true; refresh(); return; }
        result();
      });
      box.appendChild(dots); box.appendChild(stage); box.appendChild(status);
      box.appendChild(el("div", { "class": "gq-nav" }, [prev, el("div", { "class": "gq-actions", style: "margin:0" }, [next, finish])]));
      show(0);
    }

    function result() {
      var total = items.length;
      var right = items.filter(function (it) { return it.state.correct; }).length;
      var wrong = items.filter(function (it) { return !it.state.correct; });
      var pct = Math.round(right / total * 100);
      Progress.record(topicId, right, total, wrong.map(function (it) { return it.q.skill || it.q.id; }));
      var msg = pct === 100 ? "Every answer is correct. You can use this structure confidently."
        : pct >= 80 ? "Strong result. Check the explanations below for the points you missed."
        : pct >= 50 ? "Good progress. Review the mistakes below, re-read the rule they point to, then try again."
        : "This topic needs another look. Go back to “The Structure” and “Common Mistakes”, then try again.";
      box.textContent = "";
      var res = el("div", { "class": "gq-result", role: "status", tabindex: "-1" }, [
        el("p", { "class": "grx-sr", text: "Final check result" }),
        el("div", { "class": "gq-result-score", text: right + " / " + total }),
        el("div", { "class": "gq-result-pct", text: pct + "%" }),
        el("div", { "class": "gq-result-grid" }, [
          el("div", { "class": "gq-stat gq-stat-ok" }, [el("b", { text: String(right) }), el("span", { text: "Correct" })]),
          el("div", { "class": "gq-stat gq-stat-no" }, [el("b", { text: String(total - right) }), el("span", { text: "Incorrect" })]),
          el("div", { "class": "gq-stat" }, [el("b", { text: pct + "%" }), el("span", { text: "Score" })])
        ]),
        el("p", { "class": "gq-result-msg", text: msg })
      ]);
      var again = el("button", { type: "button", "class": "grx-btn grx-btn-primary", text: "↻ Try again" });
      again.addEventListener("click", run);
      var actions = el("div", { "class": "gq-result-actions" }, [again]);
      if (wrong.length) {
        var go = el("a", { "class": "grx-btn grx-btn-ghost", href: "#gq-review", text: "Review your mistakes" });
        actions.insertBefore(go, again);
      }
      actions.appendChild(el("a", { "class": "grx-btn grx-btn-ghost", href: "#structure", text: "Back to the lesson" }));
      res.appendChild(actions);
      box.appendChild(res);
      if (wrong.length) {
        var rev = el("div", { "class": "gq-review", id: "gq-review" }, [el("h3", { text: "Review your mistakes" })]);
        wrong.forEach(function (it) {
          var q = it.q, n = questions.indexOf(q) + 1;
          var qText = (q.context ? q.context + " " : "") + String(q.question).replace(/___/g, "_____");
          rev.appendChild(el("div", { "class": "gq-review-item" }, [
            el("p", { "class": "gq-review-q", text: n + ". " + qText }),
            el("p", null, [el("span", { "class": "gq-review-lbl", lang: "en", text: "Your answer" }), el("span", { "class": "gq-review-yours", text: it.state.answered ? it.state.label : "(no answer)" })]),
            el("p", null, [el("span", { "class": "gq-review-lbl", lang: "en", text: "Correct answer" }), el("span", { "class": "gq-review-right", text: fullCorrect(q) })]),
            el("p", null, [el("span", { "class": "gq-review-lbl", lang: "en", text: "Why?" }), q.explanation || ""])
          ]));
        });
        box.appendChild(rev);
      }
      res.focus({ preventScroll: true });
      box.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    start();
  }

  /* ---------------- page enhancements ---------------- */
  function sectionNav() {
    var links = [].slice.call(document.querySelectorAll(".grx-toc a[href^='#']"));
    if (!links.length || !("IntersectionObserver" in window)) return;
    var map = {};
    links.forEach(function (a) { var s = document.getElementById(a.getAttribute("href").slice(1)); if (s) map[s.id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var a = map[e.target.id]; if (!a) return;
        a.setAttribute("aria-current", "true");
        var ol = a.closest("ol"); if (ol) ol.scrollTo({ left: a.offsetLeft - 20, behavior: "smooth" });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }
  function trToggle() {
    var b = document.querySelector("[data-grx-tr-toggle]");
    if (!b) return;
    b.hidden = false;
    b.addEventListener("click", function () {
      var hide = document.body.classList.toggle("grx-hide-tr");
      b.setAttribute("aria-pressed", hide ? "true" : "false");
      b.textContent = hide ? "Türkçe çevirileri göster" : "Türkçe çevirileri gizle";
    });
  }

  function init() {
    var src = document.getElementById("gr-quiz-data");
    trToggle(); sectionNav();
    if (!src) return;
    var data;
    try { data = JSON.parse(src.textContent); } catch (e) { return; }
    var topic = data.topic || "unknown";
    Progress.visit(topic);
    [].forEach.call(document.querySelectorAll("[data-gq]"), function (host) {
      var key = host.getAttribute("data-gq");
      var qs = data[key];
      if (!qs || !qs.length) { host.closest("section") && (host.closest("section").hidden = true); return; }
      if (key === "finalTest") FinalTest(host, qs, topic);
      else InstantSet(host, qs, key === "quickCheck" ? "Quick check" : "Practice");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  window.AbGrammarEngine = { normalize: norm, isRightText: isRightText, version: "2.0.0" };
})();
