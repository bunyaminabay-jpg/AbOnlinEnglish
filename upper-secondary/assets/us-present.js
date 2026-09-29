/* AbOnlinEnglish · Sınıf Modu (akıllı tahta / projeksiyon / ekran paylaşımı). Harici servis yok, çevrimdışı çalışır. */
(function () {
  "use strict";
  var el = document.getElementById("present-data");
  var P = JSON.parse(el.textContent);
  var DECKS = P.decks || [];
  var root = document.querySelector("[data-present]");
  var stage = root.querySelector(".pstage");
  var PRINT = location.hash === "#print";
  function $(s, r) { return (r || root).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || root).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function blanks(s) { return esc(s).replace(/_{3,}/g, '<span class="pblank"></span>'); }
  function safeMark(s) { return esc(s).replace(/&lt;mark&gt;/g, "<mark>").replace(/&lt;\/mark&gt;/g, "</mark>"); }
  var store = { get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var cur = { d: 0, s: 0, revealed: false, step: 0 };

  /* ---------- ekran çizimi ---------- */
  function screenHTML(sc, reveal) {
    var h = "";
    var sec = sc.section ? '<p class="psec">' + esc(sc.section) + "</p>" : "";
    switch (sc.type) {
      case "title":
        h = '<div class="p-title"><p class="pk">' + esc(sc.kicker || "") + '</p><h1>' + esc(sc.title) + "</h1>" +
          (sc.list ? '<div class="pchips">' + sc.list.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "") + "</div>";
        break;
      case "prompt":
        h = '<div class="p-block"><h2>' + esc(sc.title) + '</h2><p class="pbig">' + esc(sc.text) + "</p>" +
          (sc.chips && sc.chips.length ? '<div class="pchips alt">' + sc.chips.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "") + "</div>";
        break;
      case "list":
        h = '<div class="p-block"><h2>' + esc(sc.title) + "</h2>" + (sc.text ? '<p class="pmed">' + esc(sc.text) + "</p>" : "") +
          (sc.chips ? '<div class="pchips alt big">' + sc.list.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>"
            : '<ol class="plist">' + sc.list.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>") + "</div>";
        break;
      case "word":
        h = '<div class="p-word"><div class="pw">' + esc(sc.word) + '</div><div class="pwm">' + esc(sc.pos) + (sc.ipa ? " · " + esc(sc.ipa) : "") +
          ' <button type="button" class="psay" data-say="' + esc(sc.word) + '" aria-label="Dinle">🔊</button></div>' +
          '<div class="phide' + (reveal ? " on" : "") + '"><p class="ptr">' + esc(sc.tr) + '</p><p class="pex">' + esc(sc.example) + "</p></div></div>";
        break;
      case "notice":
        var n = reveal ? sc.items.length : cur.step;
        h = '<div class="p-block"><h2>' + esc(sc.title) + '</h2><ul class="pnotice">' + sc.items.map(function (x, i) {
          return '<li class="' + (i < n ? "on" : "") + '">' + safeMark(x) + "</li>"; }).join("") + "</ul>" +
          '<p class="pask' + (n >= sc.items.length ? " on" : "") + '">' + esc(sc.ask || "") + "</p></div>";
        break;
      case "rule":
        h = '<div class="p-block p-rule"><h2>' + esc(sc.title) + '</h2><p class="pbig">' + esc(sc.en) + '</p><p class="ptrl"><b>TR</b> ' + esc(sc.tr) + "</p>" +
          (sc.when_en ? '<p class="pmed"><b>When?</b> ' + esc(sc.when_en) + '</p><p class="ptrl"><b>TR</b> ' + esc(sc.when) + "</p>" : "") + "</div>";
        break;
      case "form":
        var f = sc.form, cols = [["Positive", "positive"], ["Negative", "negative"], ["Question", "question"], ["Short answers", "short"]].filter(function (c) { return f[c[1]] && f[c[1]].length; });
        h = '<div class="p-block"><h2>' + esc(sc.title) + '</h2><div class="pform">' + cols.map(function (c) {
          return "<div><h3>" + c[0] + "</h3>" + f[c[1]].map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") + "</div>"; }).join("") + "</div></div>";
        break;
      case "question":
        h = '<div class="p-q">' + sec + '<p class="pq">' + blanks(sc.q) + "</p>" + (sc.prompt ? '<p class="pmed">(' + esc(sc.prompt) + ")</p>" : "");
        if (sc.options) {
          h += '<div class="popts">' + sc.options.map(function (o, k) {
            var cls = reveal ? (k === sc.answer ? " right" : " dim") : "";
            return '<button type="button" class="popt' + cls + '" data-k="' + k + '"><b>' + "abcd"[k] + "</b>" + esc(o) + "</button>"; }).join("") + "</div>";
          if (sc.qtype === "judge" && sc.fix) h += '<p class="pans' + (reveal ? " on" : "") + '">✓ ' + esc(sc.fix) + "</p>";
        } else if (sc.qtype === "order") {
          h += '<div class="porder-line"></div><div class="porder-bank">' + shuffle(sc.words).map(function (w) { return '<button type="button" class="pchipw">' + esc(w) + "</button>"; }).join("") +
            '</div><p class="pend">' + esc(sc.end || "") + '</p><p class="pans' + (reveal ? " on" : "") + '">✓ ' + esc(sc.reveal) + "</p>";
        } else {
          h += '<p class="pans' + (reveal ? " on" : "") + '">✓ ' + esc(sc.reveal) + "</p>";
        }
        h += "</div>";
        break;
      case "cue":
        h = '<div class="p-q">' + sec + '<div class="pcues">' + sc.cue.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join('<i>+</i>') + "</div>" +
          '<p class="pans big' + (reveal || sc.shown ? " on" : "") + '">' + esc(sc.reveal) + "</p></div>";
        break;
      case "paragraph":
        h = '<div class="p-read"><p class="pk">' + esc(sc.title) + " · " + sc.num + " / " + sc.total + '</p><p class="ptext">' + esc(sc.text) + "</p></div>";
        break;
      case "audio":
        h = '<div class="p-block"><h2>' + esc(sc.title) + "</h2>" + (sc.audio ? '<button type="button" class="pplay" data-audio="' + esc(sc.audio) + '">▶ Play</button>' : '<p class="pmed muted">Ses kaydı yakında — transkripti öğretmen okuyabilir.</p>') +
          '<div class="ptrans' + (reveal ? " on" : "") + '">' + (sc.transcript || []).map(function (x) { return "<p><b>" + esc(x.speaker) + "</b> " + esc(x.line) + "</p>"; }).join("") + "</div></div>";
        break;
      case "task":
        h = '<div class="p-block"><p class="pk">' + esc(sc.kicker) + '</p><h2>' + esc(sc.title) + '</h2><p class="pmed">' + esc(sc.text) + "</p>" +
          (sc.steps && sc.steps.length ? '<ol class="plist small">' + sc.steps.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol>" : "") +
          (sc.chips && sc.chips.length ? '<div class="pchips alt">' + sc.chips.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "") +
          (sc.levels && sc.levels.filter(Boolean).length ? '<div class="plevels">' + ["Support", "Core", "Extension"].map(function (l, i) { return sc.levels[i] ? "<div><b>" + l + "</b>" + esc(sc.levels[i]) + "</div>" : ""; }).join("") + "</div>" : "") + "</div>";
        break;
    }
    return h;
  }
  function canReveal(sc) { return ["word", "notice", "question", "cue", "audio"].indexOf(sc.type) >= 0 && !sc.shown; }

  /* ---------- baskı modu (slayt PDF) ---------- */
  if (PRINT) {
    root.classList.add("printing");
    var out = "";
    DECKS.forEach(function (d) {
      d.screens.forEach(function (sc, i) {
        out += '<section class="pslide" style="--c:' + d.color + '"><div class="pslide-top"><span>' + esc(P.theme) + " · " + esc(d.title) + "</span><span>" + (i + 1) + " / " + d.screens.length + "</span></div>" +
          '<div class="pslide-body">' + screenHTML(sc, true) + "</div>" + (sc.note ? '<div class="pslide-note">' + esc(sc.note) + "</div>" : "") + "</section>";
      });
    });
    stage.innerHTML = out;
    return;
  }

  /* ---------- gezinme ---------- */
  function deck() { return DECKS[cur.d]; }
  function screen() { return deck().screens[cur.s]; }
  function render() {
    var d = deck(), sc = screen();
    root.style.setProperty("--c", d.color);
    stage.innerHTML = '<div class="pscreen">' + screenHTML(sc, cur.revealed) + "</div>";
    $(".pcount").textContent = (cur.s + 1) + " / " + d.screens.length;
    $(".pprog span").style.width = ((cur.s + 1) / d.screens.length * 100) + "%";
    $$(".pdeck").forEach(function (b, i) { b.setAttribute("aria-current", i === cur.d ? "true" : "false"); });
    var rb = $(".preveal"); rb.hidden = !canReveal(sc);
    rb.textContent = sc.type === "notice" && cur.step < sc.items.length && !cur.revealed ? "Sonraki cümle (R)" : "Cevabı göster (R)";
    $(".pnotes-body").textContent = sc.note || "Bu ekran için not yok.";
    $(".pprev").disabled = cur.d === 0 && cur.s === 0;
    if (sc.timer) setTimer(sc.timer, false);
    try { history.replaceState(null, "", "#" + d.id + "-" + (cur.s + 1)); } catch (e) {}
    store.set("us:present:" + P.key, { d: cur.d, s: cur.s });
    bindStage(sc);
  }
  function go(dd, ss) { cur.d = dd; cur.s = ss; cur.revealed = false; cur.step = 0; render(); }
  function next() {
    var d = deck();
    if (cur.s < d.screens.length - 1) go(cur.d, cur.s + 1);
    else if (cur.d < DECKS.length - 1) go(cur.d + 1, 0);
  }
  function prev() {
    if (cur.s > 0) go(cur.d, cur.s - 1);
    else if (cur.d > 0) go(cur.d - 1, DECKS[cur.d - 1].screens.length - 1);
  }
  function reveal() {
    var sc = screen(); if (!canReveal(sc)) return;
    if (sc.type === "notice" && cur.step < sc.items.length) { cur.step++; if (cur.step >= sc.items.length) cur.revealed = true; }
    else cur.revealed = true;
    var keep = stage.querySelector(".porder-line") ? stage.querySelector(".porder-line").innerHTML : null;
    stage.innerHTML = '<div class="pscreen">' + screenHTML(sc, cur.revealed) + "</div>";
    if (keep !== null) stage.querySelector(".porder-line").innerHTML = keep;
    var rb = $(".preveal"); rb.textContent = sc.type === "notice" && !cur.revealed ? "Sonraki cümle (R)" : "Cevabı göster (R)";
    bindStage(sc);
  }
  function bindStage(sc) {
    $$(".popt", stage).forEach(function (b) { b.addEventListener("click", function () { $$(".popt", stage).forEach(function (x) { x.classList.remove("sel"); }); b.classList.add("sel"); }); });
    var pl = stage.querySelector("[data-audio]");
    if (pl) { var au; pl.addEventListener("click", function () { if (!au) au = new Audio(pl.getAttribute("data-audio")); if (au.paused) { au.play().catch(function () {}); pl.textContent = "❚❚ Pause"; } else { au.pause(); pl.textContent = "▶ Play"; } }); }
    var hid = stage.querySelector(".phide"); if (hid) hid.addEventListener("click", function () { hid.classList.add("on"); cur.revealed = true; });
  }
  stage.addEventListener("click", function (e) {
    var c = e.target.closest(".pchipw"); if (!c) return;
    var line = stage.querySelector(".porder-line"), bank = stage.querySelector(".porder-bank");
    (c.parentNode === bank ? line : bank).appendChild(c);
  });
  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-say]");
    if (b && "speechSynthesis" in window) { var u = new SpeechSynthesisUtterance(b.getAttribute("data-say")); u.lang = "en-GB"; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  });

  /* ---------- araçlar: sayaç ---------- */
  var T = { left: 0, total: 0, id: null };
  var tbox = $(".ptimer");
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
  function drawT() { $(".ptime", tbox).textContent = fmt(T.left); tbox.classList.toggle("ending", T.left > 0 && T.left <= 10); tbox.classList.toggle("done", T.left === 0 && T.total > 0); }
  function setTimer(sec, start) { stopT(); T.left = T.total = sec; tbox.hidden = false; drawT(); if (start) startT(); }
  function startT() { if (T.id || !T.left) return; T.id = setInterval(function () { T.left--; drawT(); if (T.left <= 0) { stopT(); beep(); } }, 1000); $(".ptgo", tbox).textContent = "❚❚"; }
  function stopT() { clearInterval(T.id); T.id = null; if (tbox) $(".ptgo", tbox).textContent = "▶"; }
  function beep() { try { var a = new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach(function (t) { var o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.2, a.currentTime + t); o.start(a.currentTime + t); o.stop(a.currentTime + t + .15); }); } catch (e) {} }
  $(".ptgo", tbox).addEventListener("click", function () { T.id ? stopT() : startT(); });
  $$("[data-t]", tbox).forEach(function (b) { b.addEventListener("click", function () { setTimer(+b.getAttribute("data-t"), true); }); });
  $(".ptclose", tbox).addEventListener("click", function () { stopT(); tbox.hidden = true; });

  /* ---------- araçlar: rastgele öğrenci ---------- */
  var pick = $(".ppick"), used = [];
  $("#p-size").value = store.get("us:classsize", 30);
  function pickOne() {
    var n = Math.max(2, Math.min(60, +$("#p-size").value || 30)); store.set("us:classsize", n);
    if (used.length >= n) used = [];
    var r; do { r = 1 + Math.floor(Math.random() * n); } while (used.indexOf(r) >= 0);
    used.push(r);
    var big = $(".pnum", pick); var k = 0;
    var spin = setInterval(function () { big.textContent = 1 + Math.floor(Math.random() * n); if (++k > 10) { clearInterval(spin); big.textContent = r; } }, 60);
    $(".pused", pick).textContent = "Seçilenler: " + used.join(", ");
  }
  $(".pgo", pick).addEventListener("click", pickOne);
  $(".ppclose", pick).addEventListener("click", function () { pick.hidden = true; });

  /* ---------- araçlar: puan tablosu ---------- */
  var score = $(".pscore"), S = store.get("us:score:" + P.key, [0, 0]);
  function drawS() { $$(".pts", score).forEach(function (x, i) { x.textContent = S[i]; }); store.set("us:score:" + P.key, S); }
  $$("[data-sc]", score).forEach(function (b) { b.addEventListener("click", function () { var a = b.getAttribute("data-sc").split(","); S[+a[0]] = Math.max(0, S[+a[0]] + (+a[1])); drawS(); }); });
  $(".psreset", score).addEventListener("click", function () { S = [0, 0]; drawS(); });
  drawS();

  /* ---------- düğmeler & klavye ---------- */
  function tool(name) {
    if (name === "timer") { tbox.hidden = !tbox.hidden; }
    if (name === "pick") { pick.hidden = !pick.hidden; if (!pick.hidden) pickOne(); }
    if (name === "score") { score.hidden = !score.hidden; }
    if (name === "notes") { var n = $(".pnotes"); n.hidden = !n.hidden; }
    if (name === "full") { var d = document.documentElement; if (!document.fullscreenElement) { (d.requestFullscreen ? d.requestFullscreen() : Promise.reject()).catch(function () {}); } else document.exitFullscreen(); }
  }
  $$("[data-tool]").forEach(function (b) { b.addEventListener("click", function () { tool(b.getAttribute("data-tool")); }); });
  $(".pnext").addEventListener("click", next);
  $(".pprev").addEventListener("click", prev);
  $(".preveal").addEventListener("click", reveal);
  $$(".pdeck").forEach(function (b, i) { b.addEventListener("click", function () { go(i, 0); }); });
  document.addEventListener("keydown", function (e) {
    if (e.target.matches("input,textarea,select")) return;
    var k = e.key.toLowerCase();
    if (k === "arrowright" || k === " " || k === "pagedown") { e.preventDefault(); next(); }
    else if (k === "arrowleft" || k === "pageup") { e.preventDefault(); prev(); }
    else if (k === "r" || k === "enter") { e.preventDefault(); reveal(); }
    else if (k === "t") tool("timer"); else if (k === "p") tool("pick"); else if (k === "s") tool("score"); else if (k === "n") tool("notes"); else if (k === "f") tool("full");
  });
  // dokunmatik kaydırma
  var sx = null;
  stage.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 70) (dx < 0 ? next : prev)(); sx = null; });

  // başlangıç: hash ya da kayıtlı konum
  var m = (location.hash || "").match(/^#([a-z0-9-]+)-(\d+)$/), start = store.get("us:present:" + P.key, { d: 0, s: 0 });
  if (m) { DECKS.forEach(function (d, i) { if (d.id === m[1]) { start = { d: i, s: Math.min(+m[2] - 1, d.screens.length - 1) }; } }); }
  if (!DECKS[start.d] || !DECKS[start.d].screens[start.s]) start = { d: 0, s: 0 };
  go(start.d, start.s);
})();
