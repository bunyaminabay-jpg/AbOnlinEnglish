/* AbOnlinEnglish · Upper Secondary — us.js (oyun, test, ilerleme motoru). Harici servis yok. */
(function () {
  "use strict";
  var dataEl = document.getElementById("us-data");
  var D = {};
  try { D = dataEl ? JSON.parse(dataEl.textContent) : {}; } catch (e) { D = {}; }
  var C = D.content || {};

  /* ---------- yardımcılar ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a, n, not) { return shuffle(a.filter(function (x) { return x !== not; })).slice(0, n); }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- ilerleme ---------- */
  var SECTIONS = D.sections || [];
  function key(year, theme) { return "us:" + year + ":" + theme; }
  var PKEY = D.page && D.page.theme ? key(D.page.year, D.page.theme) : null;
  function prog(k) { return store.get(k || PKEY, { done: {}, scores: {}, xp: 0 }); }
  function saveProg(p) { if (!PKEY) return; store.set(PKEY, p); touchStreak(); renderProgress(); }
  function markDone(id, on) {
    var p = prog();
    if (on === false) { delete p.done[id]; }
    else if (!p.done[id]) { p.done[id] = Date.now(); p.xp = (p.xp || 0) + 10; }
    saveProg(p);
  }
  function score(id, pct) { var p = prog(); var s = p.scores[id]; p.scores[id] = { last: pct, best: Math.max(pct, s ? s.best : 0) }; saveProg(p); }
  function touchStreak() {
    var s = store.get("us:streak", { last: null, n: 0 });
    var today = new Date().toISOString().slice(0, 10);
    if (s.last === today) return;
    var y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    s.n = s.last === y ? s.n + 1 : 1; s.last = today; store.set("us:streak", s);
  }

  function renderProgress() {
    if (!PKEY) return;
    var p = prog(), done = 0;
    SECTIONS.forEach(function (s) { if (p.done[s.id]) done++; });
    var pct = SECTIONS.length ? Math.round(done / SECTIONS.length * 100) : 0;
    $$("[data-pcount]").forEach(function (el) { el.textContent = done + " / " + SECTIONS.length; });
    $$("[data-ppct]").forEach(function (el) { el.textContent = pct + "%"; });
    $$("[data-pbar]").forEach(function (el) { el.style.width = pct + "%"; });
    $$("[data-xp]").forEach(function (el) { el.textContent = (p.xp || 0) + " XP"; });
    var st = store.get("us:streak", { n: 0 });
    $$("[data-streak]").forEach(function (el) { el.textContent = st.n ? st.n + " gün seri" : "Seri yok"; });
    var next = null;
    SECTIONS.forEach(function (sec) { if (!p.done[sec.id] && !next) next = sec.id; });
    $$(".tab[data-step]").forEach(function (t) { t.classList.toggle("is-done", !!p.done[t.getAttribute("data-step")]); });
    $$("[data-complete]").forEach(function (b) {
      var d = !!p.done[b.getAttribute("data-complete")];
      b.classList.toggle("done", d);
      b.textContent = d ? "✓ Tamamlandı" : "Bu adımı tamamladım";
      b.setAttribute("aria-pressed", d ? "true" : "false");
    });
    var nb = $("[data-next]");
    if (nb) {
      var sec = SECTIONS.filter(function (s) { return s.id === next; })[0];
      if (sec) {
        $("[data-next-title]", nb).textContent = sec.title;
        $("[data-next-sub]", nb).textContent = sec.hint || "";
        var a = $("a", nb); a.href = "#" + sec.id; a.textContent = done ? "Devam et" : "Başla";
      } else {
        $("[data-next-title]", nb).textContent = "Tema tamamlandı";
        $("[data-next-sub]", nb).textContent = "Tekrar için istediğin bölüme dön ya da sonraki temaya geç.";
        var a2 = $("a", nb); a2.href = "#my-progress"; a2.textContent = "İlerlemem";
      }
    }
    // skill rows in My Progress
    $$("[data-skill-row]").forEach(function (li) {
      var id = li.getAttribute("data-skill-row"); var sc = p.scores[id];
      var v = p.done[id] ? (sc ? sc.best : 100) : (sc ? sc.best : 0);
      $("span", li).style.width = v + "%";
      $("em", li).textContent = p.done[id] || sc ? v + "%" : "—";
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-complete]");
    if (b) { var id = b.getAttribute("data-complete"); markDone(id, !prog().done[id]); }
  });

  // grade page: theme progress
  $$("[data-theme-progress]").forEach(function (el) {
    var parts = el.getAttribute("data-theme-progress").split("|");
    var p = store.get(key(parts[0], parts[1]), { done: {} });
    var total = +parts[2] || 8, n = Object.keys(p.done || {}).length;
    var pct = Math.round(Math.min(n, total) / total * 100);
    var bar = $("span", el); if (bar) bar.style.width = pct + "%";
    var lab = el.parentNode.querySelector("[data-theme-pct]"); if (lab) lab.textContent = n ? pct + "%" : "Başlanmadı";
  });

  /* ---------- sesli okuma (tarayıcı TTS, ücretsiz) ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-say]"); if (!b) return;
    if (!("speechSynthesis" in window)) return;
    var u = new SpeechSynthesisUtterance(b.getAttribute("data-say"));
    u.lang = "en-GB"; u.rate = 0.9;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^en(-|_)GB/i.test(x.lang); })[0];
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  });

  /* ---------- ses oynatıcı (MP3 varsa) ---------- */
  $$(".audio[data-src]").forEach(function (box) {
    var src = box.getAttribute("data-src"); var btn = $(".pp", box);
    if (!src) return;
    var au = new Audio(); au.preload = "none"; var loaded = false;
    btn.disabled = false;
    btn.addEventListener("click", function () {
      if (!loaded) { au.src = src; loaded = true; }
      if (au.paused) { au.play().catch(function () {}); btn.setAttribute("aria-label", "Duraklat"); }
      else { au.pause(); btn.setAttribute("aria-label", "Oynat"); }
    });
    au.addEventListener("timeupdate", function () {
      if (!au.duration) return;
      $(".track span", box).style.width = (au.currentTime / au.duration * 100) + "%";
      var s = Math.floor(au.currentTime); $(".t", box).textContent = Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2);
    });
  });

  /* ---------- yazma: kelime sayacı ---------- */
  $$("textarea.draft").forEach(function (t) {
    var k = "us:draft:" + (PKEY || "") + ":" + t.id; var saved = store.get(k, "");
    if (saved) t.value = saved;
    var out = document.querySelector('[data-wc="' + t.id + '"]');
    function upd() { var n = (t.value.trim().match(/\S+/g) || []).length; if (out) out.textContent = n + " kelime"; store.set(k, t.value); }
    t.addEventListener("input", upd); upd();
  });

  /* ---------- OYUNLAR ---------- */
  var V = (C.vocabulary || []).filter(function (w) { return w.word && w.tr; });
  var GAMES = {
    match: { title: "Match It", goal: "Kelimeleri Türkçe anlamlarıyla eşleştir.", min: 4 },
    choose: { title: "Choose the Meaning", goal: "Kelimenin doğru anlamını seç.", min: 4 },
    missing: { title: "Missing Word", goal: "Cümledeki boşluğa doğru kelimeyi yerleştir.", min: 4 },
    race: { title: "Word Race", goal: "60 saniyede olabildiğince çok anlam–kelime eşleştir.", min: 4 }
  };
  function gameAvailable(t) {
    if (V.length < GAMES[t].min) return false;
    if (t === "missing") return clozeItems().length >= 3;
    return true;
  }
  function clozeItems() {
    return V.filter(function (w) { return w.example && new RegExp("\\b" + w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(w.example); });
  }
  $$(".game-tile[data-game]").forEach(function (t) {
    var g = t.getAttribute("data-game");
    if (!gameAvailable(g)) { t.disabled = true; $(".state", t).textContent = "İçerik eklenince açılır"; return; }
    var sc = prog().scores["game-" + g];
    if (sc) $(".best", t).textContent = "En iyi: " + sc.best + "%";
    t.addEventListener("click", function () { startGame(g); });
  });

  function stage() { var s = $("#game-stage"); s.hidden = false; s.scrollIntoView({ behavior: "smooth", block: "start" }); return s; }
  function head(title, extra) { return '<div class="stage-head"><h3>' + esc(title) + '</h3><span class="score" aria-live="polite">' + (extra || "") + "</span></div>"; }

  function startGame(g) {
    var s = stage();
    s.innerHTML = head(GAMES[g].title) + '<p class="muted">' + esc(GAMES[g].goal) + '</p><div class="row" style="margin-top:14px"><button class="btn primary" id="go">Başla</button><button class="btn" id="close-game">Kapat</button></div>';
    $("#go", s).onclick = function () { ({ match: gMatch, choose: gChoose, missing: gMissing, race: gRace })[g](s, g); };
    $("#close-game", s).onclick = function () { s.hidden = true; s.innerHTML = ""; };
  }

  function finish(s, g, right, total, missed) {
    var pct = total ? Math.round(right / total * 100) : 0;
    score("game-" + g, pct);
    if (pct >= 70) markDone("play");
    var uniq = []; missed.forEach(function (w) { if (uniq.indexOf(w) < 0) uniq.push(w); });
    s.innerHTML = head(GAMES[g].title) +
      '<div class="result"><div><span class="big tab-num">' + right + " / " + total + '</span> <span class="muted">(' + pct + '%)</span></div>' +
      (uniq.length ? "<div><strong>Bu kelimeleri tekrar et:</strong><ul>" + uniq.map(function (w) { var o = V.filter(function (x) { return x.word === w; })[0]; return "<li>" + esc(w) + (o ? " — " + esc(o.tr) : "") + "</li>"; }).join("") + '</ul><p class="muted" style="margin-top:6px"><a href="#vocabulary">Kelime kartlarına dön</a></p></div>' : "<p>Hatasız. Harika iş.</p>") +
      (pct >= 70 ? '<p class="chip ok">Oyun bölümü tamamlandı olarak işaretlendi</p>' : '<p class="muted">Bölümü tamamlamak için en az %70 gerekiyor.</p>') +
      '<div class="row"><button class="btn primary" id="again">Tekrar oyna</button><button class="btn" id="close-game">Kapat</button></div></div>';
    $("#again", s).onclick = function () { ({ match: gMatch, choose: gChoose, missing: gMissing, race: gRace })[g](s, g); };
    $("#close-game", s).onclick = function () { s.hidden = true; s.innerHTML = ""; };
    var t = $('.game-tile[data-game="' + g + '"] .best'); if (t) t.textContent = "En iyi: " + prog().scores["game-" + g].best + "%";
  }

  function gMatch(s, g) {
    var set = shuffle(V).slice(0, 6), left = null, right = 0, tries = 0, missed = [];
    s.innerHTML = head(GAMES[g].title, "0 / " + set.length) +
      '<div class="match"><div class="col" id="mw">' + shuffle(set).map(function (w) { return '<button class="opt" data-w="' + esc(w.word) + '">' + esc(w.word) + "</button>"; }).join("") +
      '</div><div class="col" id="mt">' + shuffle(set).map(function (w) { return '<button class="opt" data-w="' + esc(w.word) + '">' + esc(w.tr) + "</button>"; }).join("") + '</div></div><p class="feedback" aria-live="polite"></p>';
    var fb = $(".feedback", s);
    $$("#mw .opt", s).forEach(function (b) { b.onclick = function () { $$("#mw .opt", s).forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); left = b; }; });
    $$("#mt .opt", s).forEach(function (b) {
      b.onclick = function () {
        if (!left) { fb.textContent = "Önce soldan bir kelime seç."; fb.className = "feedback"; return; }
        tries++;
        if (b.getAttribute("data-w") === left.getAttribute("data-w")) {
          [b, left].forEach(function (x) { x.classList.remove("sel"); x.classList.add("right"); x.disabled = true; });
          right++; left = null; fb.textContent = "Doğru!"; fb.className = "feedback good";
          $(".score", s).textContent = right + " / " + set.length;
          if (right === set.length) setTimeout(function () { finish(s, g, set.length, tries, missed); }, 500);
        } else {
          missed.push(left.getAttribute("data-w")); b.classList.add("wrong", "shake");
          fb.textContent = "Olmadı, tekrar dene."; fb.className = "feedback bad";
          setTimeout(function () { b.classList.remove("wrong", "shake"); }, 450);
        }
      };
    });
  }

  function mcqRun(s, g, qs, opts) {
    var i = 0, right = 0, missed = [], timer = null, left = opts && opts.seconds;
    function render() {
      if (i >= qs.length || (opts && opts.seconds && left <= 0)) { clearInterval(timer); return finish(s, g, right, opts && opts.seconds ? i : qs.length, missed); }
      var q = qs[i];
      s.innerHTML = head(GAMES[g].title, (opts && opts.seconds ? left + " sn · " : "") + right + " doğru") +
        (opts && opts.seconds ? '<div class="timer"><span style="width:' + (left / opts.seconds * 100) + '%"></span></div>' : '<p class="eyebrow" style="margin-bottom:8px">Soru ' + (i + 1) + " / " + qs.length + "</p>") +
        '<p class="q">' + q.prompt + '</p><div class="opts">' + q.options.map(function (o, k) { return '<button class="opt" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + '</div><p class="feedback" aria-live="polite"></p>';
      $$(".opt", s).forEach(function (b) {
        b.onclick = function () {
          var k = +b.getAttribute("data-k"); var ok = k === q.answer;
          $$(".opt", s).forEach(function (x) { x.disabled = true; });
          b.classList.add(ok ? "right" : "wrong"); $$(".opt", s)[q.answer].classList.add("right");
          var fb = $(".feedback", s);
          if (ok) { right++; fb.textContent = "Doğru!"; fb.className = "feedback good"; }
          else { missed.push(q.word); fb.innerHTML = "Doğru cevap: <strong>" + esc(q.options[q.answer]) + "</strong>"; fb.className = "feedback bad"; }
          i++; setTimeout(render, ok ? 600 : 1300);
        };
      });
    }
    if (opts && opts.seconds) {
      timer = setInterval(function () { left--; var sp = $(".timer span", s); if (sp) sp.style.width = (left / opts.seconds * 100) + "%"; var sc = $(".score", s); if (sc) sc.textContent = left + " sn · " + right + " doğru"; if (left <= 0) { clearInterval(timer); finish(s, g, right, Math.max(i, 1), missed); } }, 1000);
    }
    render();
  }
  function gChoose(s, g) {
    var qs = shuffle(V).slice(0, Math.min(10, V.length)).map(function (w) {
      var opts = shuffle([w.tr].concat(pick(V, 3, w).map(function (x) { return x.tr; })));
      return { word: w.word, prompt: '“' + esc(w.word) + '” ne demek?', options: opts, answer: opts.indexOf(w.tr) };
    });
    mcqRun(s, g, qs);
  }
  function gMissing(s, g) {
    var pool = clozeItems();
    var qs = shuffle(pool).slice(0, Math.min(8, pool.length)).map(function (w) {
      var re = new RegExp("\\b" + w.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      var opts = shuffle([w.word].concat(pick(V, 3, w).map(function (x) { return x.word; })));
      return { word: w.word, prompt: esc(w.example.replace(re, "_____")), options: opts, answer: opts.indexOf(w.word) };
    });
    mcqRun(s, g, qs);
  }
  function gRace(s, g) {
    var qs = []; for (var r = 0; r < 4; r++) qs = qs.concat(shuffle(V));
    qs = qs.map(function (w) { var opts = shuffle([w.word].concat(pick(V, 3, w).map(function (x) { return x.word; }))); return { word: w.word, prompt: esc(w.tr), options: opts, answer: opts.indexOf(w.word) }; });
    mcqRun(s, g, qs, { seconds: 60 });
  }

  /* ---------- TEST / ALIŞTIRMA MOTORU ---------- */
  function tokens(s) { return String(s || "").trim().split(/\s+/); }
  function rightText(it) {
    if (it.type === "gap" || it.type === "rewrite") return (it.answers || [])[0];
    if (it.type === "order") return it.answer;
    if (it.type === "judge") return it.answer === 0 ? "Correct" : "Incorrect" + (it.fix ? " → " + it.fix : "");
    return it.options[it.answer];
  }
  function norm(x) { return String(x || "").trim().toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").replace(/[.!?]$/, ""); }
  $$(".quiz[data-quiz]").forEach(function (box) {
    var id = box.getAttribute("data-quiz"); var Q = (D.quizzes || {})[id]; if (!Q || !Q.items || !Q.items.length) return;
    function draw() {
      var html = "", n = 0, lastSec = null;
      Q.items.forEach(function (it, i) {
        if (it.section && it.section !== lastSec) { html += '<h3 class="test-sec">' + esc(it.section) + "</h3>"; lastSec = it.section; }
        n++;
        html += '<div class="qitem" data-i="' + i + '"><span class="qn"><b>' + n + "</b>" + (it.skill ? esc(it.skill) : "") + "</span>" +
          '<p class="qt">' + esc(it.q) + "</p>";
        if (it.type === "gap") html += '<label class="sr-only" for="' + id + "-" + i + '">Cevap</label><input type="text" id="' + id + "-" + i + '" autocomplete="off" spellcheck="false">';
        else if (it.type === "rewrite") html += (it.prompt ? '<p class="muted" style="font-size:.92rem">' + esc(it.prompt) + "</p>" : "") + '<label class="sr-only" for="' + id + "-" + i + '">Cevap</label><input type="text" class="wide" id="' + id + "-" + i + '" autocomplete="off" spellcheck="false" placeholder="Write the new sentence…">';
        else if (it.type === "order") {
          var words = tokens(it.answer), end = /[.?!]$/.test(words[words.length - 1]) ? words[words.length - 1].slice(-1) : "";
          if (end) words[words.length - 1] = words[words.length - 1].slice(0, -1);
          if (!it.keepCase && words[0] !== "I") words[0] = words[0].charAt(0).toLowerCase() + words[0].slice(1);
          var sh = shuffle(words);
          for (var t = 0; t < 5 && sh.join(" ") === words.join(" "); t++) sh = shuffle(words);
          html += '<div class="row" style="--g:6px;align-items:center"><div class="order-line" aria-label="Your sentence" style="flex:1"></div><b>' + esc(end) + '</b></div><div class="order-bank">' + sh.map(function (w) { return '<button type="button" class="chipw">' + esc(w) + "</button>"; }).join("") + '</div><button type="button" class="linkish order-reset">↺ Reset</button>';
        }
        else {
          var opts = it.type === "judge" ? ["✓ Correct", "✗ Incorrect"] : it.options;
          html += '<div class="opts" role="radiogroup">' + opts.map(function (o, k) { return '<button type="button" class="opt" role="radio" aria-checked="false" data-k="' + k + '">' + esc(o) + "</button>"; }).join("") + "</div>";
        }
        html += '<div class="explain" hidden></div></div>';
      });
      box.innerHTML = html + '<div class="row"><button class="btn primary" data-check>Kontrol et</button></div><div class="quiz-result" hidden aria-live="polite"></div>';
      $$(".qitem .opt", box).forEach(function (b) {
        b.onclick = function () { $$(".opt", b.parentNode).forEach(function (x) { x.classList.remove("sel"); x.setAttribute("aria-checked", "false"); }); b.classList.add("sel"); b.setAttribute("aria-checked", "true"); };
      });
      $$(".qitem", box).forEach(function (el) {
        var line = $(".order-line", el), bank = $(".order-bank", el); if (!line) return;
        el.addEventListener("click", function (e) {
          var c = e.target.closest(".chipw"); if (c && !c.disabled) { (c.parentNode === bank ? line : bank).appendChild(c); return; }
          if (e.target.closest(".order-reset")) $$(".chipw", line).forEach(function (x) { bank.appendChild(x); });
        });
      });
      $("[data-check]", box).onclick = check;
    }
    function check() {
      var right = 0, wrongBy = {};
      Q.items.forEach(function (it, i) {
        var el = $('.qitem[data-i="' + i + '"]', box), ok = false, given = "";
        if (it.type === "gap" || it.type === "rewrite") { given = $("input", el).value; ok = (it.answers || []).some(function (a) { return norm(a) === norm(given); }); $("input", el).disabled = true; }
        else if (it.type === "order") { given = $$(".order-line .chipw", el).map(function (x) { return x.textContent; }).join(" "); ok = norm(given) === norm(tokens(it.answer).join(" ")); $$(".chipw", el).forEach(function (x) { x.disabled = true; }); }
        else { var sel = $(".opt.sel", el); given = sel ? +sel.getAttribute("data-k") : -1; ok = given === it.answer; $$(".opt", el).forEach(function (x, k) { x.disabled = true; if (k === it.answer) x.classList.add("right"); else if (k === given) x.classList.add("wrong"); }); }
        el.classList.add(ok ? "right" : "wrong");
        if (ok) right++; else { var sk = it.skill || "Genel"; (wrongBy[sk] = wrongBy[sk] || { n: 0, review: it.review }).n++; }
        var ex = $(".explain", el);
        if (!ok || it.explain) { ex.hidden = false; ex.innerHTML = (ok ? "" : "<strong>Doğru cevap:</strong> " + esc(rightText(it)) + (it.explain ? " — " : "")) + esc(it.explain || ""); }
      });
      var total = Q.items.length, pct = Math.round(right / total * 100);
      score(Q.progressId || id, pct);
      if (Q.progressId && pct >= (Q.pass || 60)) markDone(Q.progressId);
      var res = $(".quiz-result", box); res.hidden = false;
      var pr = box.parentNode.querySelector(".praise"); if (pr) pr.hidden = pct < 100;
      var tips = Object.keys(wrongBy).map(function (k) {
        var w = wrongBy[k]; return "<li>" + esc(k) + ": " + w.n + " hata" + (w.review ? ' → <a href="' + esc(w.review.href) + '">' + esc(w.review.label) + "</a>" : "") + "</li>";
      }).join("");
      res.innerHTML = '<div><span class="big tab-num">' + right + " / " + total + '</span> <span class="muted">(' + pct + "%)</span></div>" +
        (tips ? "<div><strong>Tekrar etmen gerekenler</strong><ul>" + tips + "</ul></div>" : "<p>Hepsi doğru.</p>") +
        '<div class="row"><button class="btn" data-retry>Tekrar dene</button></div>';
      $("[data-check]", box).disabled = true;
      $("[data-retry]", res).onclick = function () { draw(); box.scrollIntoView({ behavior: "smooth", block: "start" }); };
      res.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    draw();
  });

  /* ---------- öz değerlendirme ---------- */
  $$(".checklist[data-store] input[type=checkbox]").forEach(function (cb) {
    var k = "us:check:" + (PKEY || "") + ":" + cb.id;
    cb.checked = !!store.get(k, false);
    cb.addEventListener("change", function () { store.set(k, cb.checked); });
  });

  /* ---------- etkinlik filtresi ---------- */
  var fform = $("#act-filter");
  if (fform) {
    function apply() {
      var f = {}; $$("select", fform).forEach(function (s) { if (s.value) f[s.name] = s.value; });
      var shown = 0;
      $$(".act[data-tags]").forEach(function (a) {
        var t = JSON.parse(a.getAttribute("data-tags")); var ok = Object.keys(f).every(function (k) { return String(t[k]) === f[k]; });
        a.hidden = !ok; if (ok) shown++;
      });
      var c = $("#act-count"); if (c) c.textContent = shown + " etkinlik";
      var e = $("#act-empty"); if (e) e.hidden = shown > 0;
    }
    fform.addEventListener("change", apply); apply();
  }

  /* ---------- sekmeler ---------- */
  var tabRoot = $("[data-tabs]");
  if (tabRoot) {
    tabRoot.classList.add("tabs-on");
    var panels = $$(".tab-panel", tabRoot), tabs = $$('.tab[href^="#"]');
    var bar = $(".tabbar");
    var ids = panels.map(function (p) { return p.id; });
    function show(id, scrollTo) {
      var target = document.getElementById(id), panelId = id;
      if (ids.indexOf(id) < 0) {
        var host = target ? target.closest(".tab-panel") : null;
        panelId = host ? host.id : ids[0];
      }
      panels.forEach(function (p) { p.classList.toggle("is-active", p.id === panelId); });
      tabs.forEach(function (t) {
        var on = t.getAttribute("href") === "#" + panelId;
        t.setAttribute("aria-selected", on ? "true" : "false");
        if (on && t.scrollIntoView && bar) { var r = t.getBoundingClientRect(), br = bar.getBoundingClientRect(); if (r.left < br.left || r.right > br.right) t.scrollIntoView({ block: "nearest", inline: "center" }); }
      });
      if (scrollTo) {
        var scrollEl = (target && ids.indexOf(id) < 0) ? target : document.getElementById(panelId);
        if (scrollEl) {
          var barH = bar ? bar.getBoundingClientRect().height : 0;
          var y = 0, node = scrollEl;
          while (node) { y += node.offsetTop; node = node.offsetParent; }
          window.scrollTo(0, Math.max(y - barH - 8, 0));
        }
      }
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]'); if (!a) return;
      var id = a.getAttribute("href").slice(1); if (!id) return;
      var el = document.getElementById(id); if (!el || !tabRoot.contains(el)) return;
      e.preventDefault();
      try { history.replaceState(null, "", "#" + id); } catch (x) {}
      show(id, true);
    });
    window.addEventListener("hashchange", function () { show(location.hash.slice(1), true); });
    show(location.hash.slice(1) || ids[0], false);
  }

  /* ---------- anlamları gizle ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-hide-tr]");
    if (b) {
      var w = document.querySelector(".vocab-wrap"); var on = w.classList.toggle("hide-tr");
      b.textContent = on ? "Anlamları göster" : "Anlamları gizle (kendini test et)";
      $$(".vcard .tr.shown", w).forEach(function (x) { x.classList.remove("shown"); });
      return;
    }
    var t = e.target.closest(".hide-tr .vcard .tr"); if (t) t.classList.toggle("shown");
  });

  /* ---------- SAYAÇLAR: görüntülenme, indirme, değerlendirme (Netlify Function) ---------- */
  var EP = (window.US_CONFIG || {}).statsEndpoint || "";
  var PAGE = D.pageKey || location.pathname;
  var today = new Date().toISOString().slice(0, 10);
  function fmt(n) { n = +n || 0; return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",") + "B" : n.toLocaleString("tr-TR"); }
  function api(method, body, qs) {
    if (!EP) return Promise.reject(new Error("off"));
    return fetch(EP + (qs || ""), method === "GET" ? { method: "GET" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function onceDaily(k) { var key = "us:once:" + k; if (store.get(key, "") === today) return false; store.set(key, today); return true; }
  var dlLinks = $$("a[data-dl]");
  var fb = $("[data-feedback]");
  function paint(all) {
    var mine = all[PAGE] || {};
    $$("[data-count]").forEach(function (el) {
      var m = el.getAttribute("data-count"); el.textContent = fmt(mine[m] || 0); el.hidden = false;
    });
    var vc = $("[data-view-chip]"); if (vc) vc.hidden = false;
    var st = $("[data-stats]"); if (st) st.hidden = false;
    var total = 0;
    dlLinks.forEach(function (a) { var n = (all[a.getAttribute("data-dl")] || {}).download || 0; total += n; var s = $("[data-dl-count]", a); if (s) { s.textContent = "↓ " + fmt(n); s.hidden = false; } });
    if (dlLinks.length) { var w = $("[data-dl-total-wrap]"); if (w) { w.hidden = false; $("[data-dl-total]").textContent = fmt(total); } }
  }
  var CACHE = {};
  function merge(res) { Object.keys(res || {}).forEach(function (k) { CACHE[k] = res[k]; }); paint(CACHE); }
  if (EP && !D.statsPage) {
    var keys = [PAGE].concat(dlLinks.map(function (a) { return a.getAttribute("data-dl"); }));
    var first = onceDaily("v:" + PAGE)
      ? api("POST", { page: PAGE, metric: "view" }).then(function (r) { merge(r); })
      : Promise.resolve();
    first.catch(function () {}).then(function () {
      for (var i = 0; i < keys.length; i += 40) api("GET", null, "?pages=" + encodeURIComponent(keys.slice(i, i + 40).join(","))).then(merge).catch(function () {});
    });
    dlLinks.forEach(function (a) {
      a.addEventListener("click", function () {
        var k = a.getAttribute("data-dl"); if (!onceDaily("d:" + k)) return;
        api("POST", { page: k, metric: "download" }).then(merge).catch(function () {});
      });
    });
  }
  // değerlendirme
  if (fb) {
    var RK = "us:react:" + PAGE;
    function setPressed(v) { $$("[data-react]", fb).forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-react") === v ? "true" : "false"); }); $(".fb-note", fb).hidden = v !== "improve"; }
    setPressed(store.get(RK, ""));
    $$("[data-react]", fb).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-react"), old = store.get(RK, ""), nv = old === v ? "" : v;
        store.set(RK, nv); setPressed(nv);
        var mine = CACHE[PAGE] = CACHE[PAGE] || {};
        if (old) mine["r:" + old] = Math.max(0, (mine["r:" + old] || 0) - 1);
        if (nv) mine["r:" + nv] = (mine["r:" + nv] || 0) + 1;
        if (EP) { paint(CACHE); api("POST", { page: PAGE, metric: "react", from: old || null, to: nv || null }).then(merge).catch(function () {}); }
      });
    });
    $(".fb-note", fb).addEventListener("submit", function (e) {
      e.preventDefault();
      var t = $("#fb-text", fb), msg = $(".fb-msg", fb), txt = t.value.trim();
      if (txt.length < 3) { msg.textContent = "Birkaç kelime yazman yeterli."; return; }
      if (!EP) { msg.textContent = "Not gönderimi şu an kapalı."; return; }
      api("POST", { page: PAGE, metric: "note", text: txt.slice(0, 500) }).then(function () { t.value = ""; msg.textContent = "Teşekkürler, notun bize ulaştı."; })
        .catch(function () { msg.textContent = "Gönderilemedi. Biraz sonra tekrar dene."; });
    });
  }
  // istatistik sayfası
  if (D.statsPage) {
    var sortKey = "view", rowsData = [];
    function draw() {
      var body = $("#st-body"); if (!body) return;
      rowsData.sort(function (a, b) { return sortKey === "page" ? a.page.localeCompare(b.page) : (b[sortKey] || 0) - (a[sortKey] || 0); });
      body.innerHTML = rowsData.map(function (r) {
        return "<tr><td><a href=\"" + esc(r.page) + "\">" + esc(r.page.replace("/upper-secondary/", "")) + "</a></td>" +
          ["view", "download", "r:love", "r:like", "r:improve"].map(function (m) { return '<td class="tab-num">' + fmt(r[m] || 0) + "</td>"; }).join("") + "</tr>";
      }).join("");
    }
    function load() {
      var msg = $("#st-msg");
      if (!EP) { msg.textContent = "Sayaç uç noktası tanımlı değil (assets/us-config.js)."; return; }
      msg.textContent = "Yükleniyor…";
      api("GET", null, "?all=1").then(function (all) {
        rowsData = Object.keys(all).map(function (k) { var o = all[k]; o.page = k; return o; });
        var tv = 0, td = 0; rowsData.forEach(function (r) { tv += r.view || 0; td += r.download || 0; });
        $("#st-total-v").textContent = fmt(tv) + " görüntülenme"; $("#st-total-d").textContent = fmt(td) + " indirme";
        msg.hidden = rowsData.length > 0; msg.textContent = "Henüz sayım yok."; $("#st-wrap").hidden = !rowsData.length; draw();
      }).catch(function () { msg.hidden = false; msg.textContent = "Veriler alınamadı. Netlify Function yüklendi mi?"; });
    }
    $$("[data-sort]").forEach(function (b) { b.addEventListener("click", function () { sortKey = b.getAttribute("data-sort"); draw(); }); });
    var rl = $("#st-reload"); if (rl) rl.addEventListener("click", load);
    load();
  }

  renderProgress();
})();
