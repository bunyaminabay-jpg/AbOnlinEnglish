/* AbOnlinEnglish Grammar hub: search, level filter, progress marks. Safe DOM only, no network. */
(function () {
  "use strict";
  var KEY = "ab_grammar_progress_v1";
  var state = { topics: {} };
  try { state = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { state = {}; }
  var topics = state.topics || {};

  var rows = Array.prototype.slice.call(document.querySelectorAll(".hb-list li"));
  var groups = Array.prototype.slice.call(document.querySelectorAll(".hb-group"));
  var LABEL = { done: "✓ Tamam", review: "↻ Tekrar", started: "Başladın" };

  function statusOf(id) {
    var s = topics[id] && topics[id].status;
    if (s === "completed" || s === "mastered") return "done";
    if (s === "needs-review") return "review";
    if (s === "in-progress") return "started";
    return "";
  }

  // progress marks on rows + level bars
  var perLevel = {};
  rows.forEach(function (li) {
    var st = statusOf(li.getAttribute("data-id"));
    var L = li.getAttribute("data-lvl");
    perLevel[L] = perLevel[L] || { done: 0, total: 0 };
    perLevel[L].total++;
    if (st === "done") perLevel[L].done++;
    var mark = li.querySelector(".hb-st");
    if (st && mark) { mark.setAttribute("data-s", st); mark.textContent = LABEL[st]; mark.removeAttribute("aria-hidden"); }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-lvl-bar]"), function (bar) {
    var p = perLevel[bar.getAttribute("data-lvl-bar")];
    if (p && p.total) bar.style.width = Math.round(p.done / p.total * 100) + "%";
  });

  // "continue" box: topics to review, else topics in progress
  var box = document.getElementById("hb-continue");
  var review = rows.filter(function (li) { return statusOf(li.getAttribute("data-id")) === "review"; });
  var started = rows.filter(function (li) { return statusOf(li.getAttribute("data-id")) === "started"; });
  var pick = review.length ? review : started;
  if (box && pick.length) {
    var h = document.createElement("h2");
    h.textContent = review.length ? "Tekrar etmen önerilen konular" : "Kaldığın yerden devam et";
    var ul = document.createElement("ul");
    pick.slice(0, 6).forEach(function (li) {
      var a = li.querySelector("a"), item = document.createElement("li"), link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = li.querySelector(".hb-en").textContent;
      item.appendChild(link); ul.appendChild(item);
    });
    box.appendChild(h); box.appendChild(ul); box.hidden = false;
  }

  // filter + search
  var q = document.getElementById("hb-q");
  var chips = Array.prototype.slice.call(document.querySelectorAll(".hb-chips button"));
  var level = "all";
  function norm(s) { return String(s || "").toLocaleLowerCase("tr").trim(); }
  function apply() {
    var term = norm(q && q.value);
    var any = false;
    rows.forEach(function (li) {
      var ok = (level === "all" || li.getAttribute("data-lvl") === level) &&
               (!term || li.getAttribute("data-k").indexOf(term) !== -1 || norm(li.textContent).indexOf(term) !== -1);
      li.hidden = !ok;
    });
    groups.forEach(function (g) {
      var n = g.querySelectorAll(".hb-list li:not([hidden])").length;
      g.hidden = n === 0;
      var c = g.querySelector("[data-count]");
      if (c) c.textContent = n + " konu";
      if (n) any = true;
    });
    var empty = document.getElementById("hb-empty");
    if (empty) empty.hidden = any;
  }
  chips.forEach(function (b) {
    b.addEventListener("click", function () {
      level = b.getAttribute("data-f");
      chips.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      apply();
    });
  });
  if (q) {
    var t = null;
    q.addEventListener("input", function () { clearTimeout(t); t = setTimeout(apply, 100); });
  }

  // close "Başlıklar" menu after choosing a heading
  var jump = document.querySelector(".hb-jump");
  if (jump) jump.addEventListener("click", function (ev) { if (ev.target.tagName === "A") jump.open = false; });
})();
