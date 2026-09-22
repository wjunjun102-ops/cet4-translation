/* ===========================================================
   CET4 翻译真题 · 应用逻辑
   数据来源：assets/data-a|b|c.js（window.CET4_DATA）
   学习记录保存在浏览器 localStorage 中
   =========================================================== */
(function () {
  "use strict";

  var STORE_KEY = "cet4trans.records.v1";
  var RATE = {
    hard: { label: "不熟", days: 1, strength: 33 },
    mid:  { label: "一般", days: 3, strength: 66 },
    easy: { label: "熟练", days: 7, strength: 100 }
  };
  var DAY = 86400000;

  /* ------------------------ 数据准备 ------------------------ */
  var QUESTIONS = (window.CET4_DATA || []).slice().sort(function (a, b) {
    return (b.year - a.year) || (b.month - a.month) || (b.set - a.set);
  });
  var INDEX_BY_ID = {};
  QUESTIONS.forEach(function (q, i) { INDEX_BY_ID[q.id] = i; });

  var VOCAB = (function () {
    var map = {}, list = [];
    QUESTIONS.forEach(function (q, qi) {
      (q.words || []).forEach(function (w) {
        var key = w[0] + "\u0000" + w[1];
        if (!map[key]) {
          map[key] = { zh: w[0], en: w[1], count: 0, qs: [] };
          list.push(map[key]);
        }
        map[key].count++;
        if (map[key].qs.indexOf(qi) === -1) map[key].qs.push(qi);
      });
    });
    list.sort(function (a, b) {
      return (b.count - a.count) || (a.qs[0] - b.qs[0]);
    });
    return list;
  })();

  /* ------------------------ 本机记录 ------------------------ */
  var records = load();

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); } catch (e) {}
  }
  function rec(id) {
    if (!records[id]) records[id] = {};
    return records[id];
  }

  /* ------------------------ 小工具 ------------------------ */
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var toastTimer = null;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("on"); }, 1800);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 0.92;
      var voices = window.speechSynthesis.getVoices() || [];
      for (var i = 0; i < voices.length; i++) {
        if (/^en(-|_)?/i.test(voices[i].lang)) { u.voice = voices[i]; break; }
      }
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  function isToday(ts) {
    if (!ts) return false;
    return ts <= Date.now();
  }

  function ratedCount() {
    return Object.keys(records).filter(function (k) { return records[k] && records[k].rating; }).length;
  }
  function dueCount() {
    return Object.keys(records).filter(function (k) {
      var r = records[k];
      return r && r.rating && isToday(r.nextAt);
    }).length;
  }

  /* ===========================================================
     视图切换
     =========================================================== */
  var currentView = "trans";
  function switchView(view) {
    currentView = view;
    $$(".nav-item").forEach(function (b) {
      b.classList.toggle("active", b.dataset.view === view);
    });
    $$(".page").forEach(function (p) {
      p.classList.toggle("on", p.id === "page-" + view);
    });
    if (view === "review") renderReview();
    if (view === "stats") renderStats();
    if (view === "vocab") renderVocab();
    window.scrollTo({ top: 0, behavior: "instant" in window ? "auto" : "auto" });
  }

  $$(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () { switchView(btn.dataset.view); });
  });

  /* ===========================================================
     翻译真题
     =========================================================== */
  var cur = 0;

  function renderFilters() {
    var wrap = $("#filters");
    wrap.innerHTML = "";
    var years = [];
    QUESTIONS.forEach(function (q) { if (years.indexOf(q.year) === -1) years.push(q.year); });

    years.forEach(function (year) {
      var row = document.createElement("div");
      row.className = "year-row";
      var lab = document.createElement("div");
      lab.className = "year-label";
      lab.textContent = year;
      row.appendChild(lab);

      QUESTIONS.forEach(function (q, i) {
        if (q.year !== year) return;
        var b = document.createElement("button");
        b.className = "set-btn";
        b.textContent = q.month + "月第" + q.set + "套";
        b.title = q.label;
        b.dataset.index = i;
        b.addEventListener("click", function () { goto(i); });
        row.appendChild(b);
      });
      wrap.appendChild(row);
    });
    paintFilters();
  }

  function paintFilters() {
    $$("#filters .set-btn").forEach(function (b) {
      var i = Number(b.dataset.index);
      var q = QUESTIONS[i];
      b.classList.toggle("active", i === cur);
      var r = records[q.id];
      b.classList.toggle("attempted", !!(r && (r.rating || r.revealed)));
    });
  }

  function renderQuestion() {
    var q = QUESTIONS[cur];
    if (!q) return;
    $("#counter").innerHTML = "第 <b>" + (cur + 1) + " / " + QUESTIONS.length + "</b> 题 · 按新到旧排序";
    $("#qLabel").textContent = q.label;
    $("#qSrc").textContent = q.title;
    $("#qPassage").textContent = q.zh;
    $("#qEn").textContent = q.en;

    $("#qWords").innerHTML = (q.words || []).map(function (w) {
      return '<span class="word"><b>' + escapeHtml(w[0]) + "</b> " + escapeHtml(w[1]) + "</span>";
    }).join("");

    $("#qPoints").innerHTML = (q.points || []).map(function (p) {
      return "<li>" + escapeHtml(p) + "</li>";
    }).join("");

    var r = records[q.id] || {};
    $("#answerPanels").hidden = !r.revealed;
    $("#btnReveal").textContent = r.revealed ? "隐藏参考译文与考点" : "显示参考译文与考点";
    $$(".rate-btn").forEach(function (b) {
      b.classList.toggle("on", r.rating === b.dataset.rate);
    });
    $("#btnPrev").disabled = cur === 0;
    $("#btnNext").disabled = cur === QUESTIONS.length - 1;
    paintFilters();
    document.title = "第" + (cur + 1) + "题 · " + q.label + "｜CET4 翻译真题";
    setHash(q.id);
  }

  /* file:// 等环境下 history API 可能不可用，静默跳过 */
  function setHash(id) {
    try {
      if (window.history && history.replaceState) history.replaceState(null, "", "#" + id);
    } catch (e) { /* ignore */ }
  }

  function goto(i) {
    if (i < 0 || i >= QUESTIONS.length) return;
    cur = i;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  $("#btnPrev").addEventListener("click", function () { goto(cur - 1); });
  $("#btnNext").addEventListener("click", function () { goto(cur + 1); });

  $("#btnReveal").addEventListener("click", function () {
    var q = QUESTIONS[cur];
    var r = rec(q.id);
    r.revealed = !r.revealed;
    if (r.revealed) markAttempt(q.id);
    save();
    renderQuestion();
    if (r.revealed) {
      $("#answerPanels").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  function markAttempt(id) {
    var r = rec(id);
    if (!r.attemptedAt) r.attemptedAt = Date.now();
    save();
  }

  $$(".rate-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var q = QUESTIONS[cur];
      var r = rec(q.id);
      var key = b.dataset.rate;
      if (r.rating === key) {           // 再次点击取消自评
        delete r.rating; delete r.nextAt; delete r.ratingAt;
        toast("已取消自评");
      } else {
        r.rating = key;
        r.ratingAt = Date.now();
        r.nextAt = Date.now() + RATE[key].days * DAY;
        r.revealed = true;
        toast("已记为「" + RATE[key].label + "」，" + RATE[key].days + " 天后再复习");
      }
      save();
      renderQuestion();
      refreshBadges();
    });
  });

  document.addEventListener("keydown", function (e) {
    if (currentView !== "trans") return;
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowLeft") { goto(cur - 1); }
    if (e.key === "ArrowRight") { goto(cur + 1); }
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { $("#btnReveal").click(); }
  });

  /* ===========================================================
     学习（单词卡片 + 自动发音）
     =========================================================== */
  var flash = 0, flashShowEn = true;

  function renderFlash() {
    if (!VOCAB.length) return;
    var w = VOCAB[flash];
    var q = QUESTIONS[w.qs[0]];
    $("#flashIndex").textContent = "第 " + (flash + 1) + " / " + VOCAB.length + " 张";
    $("#studyCounter").innerHTML = "共 <b>" + VOCAB.length + "</b> 个真题高频词";
    $("#flashZh").textContent = w.zh;
    $("#flashEn").textContent = flashShowEn ? w.en : "· · · · · ·";
    $("#flashEn").className = "flash-en" + (flashShowEn ? "" : " flash-hidden");
    $("#flashSrc").textContent = "出处：" + q.label + " · 出现 " + w.count + " 次";
  }

  $("#btnFlashPrev").addEventListener("click", function () {
    flash = (flash - 1 + VOCAB.length) % VOCAB.length; renderFlash(); maybeAutoSpeak();
  });
  $("#btnFlashNext").addEventListener("click", function () {
    flash = (flash + 1) % VOCAB.length; renderFlash(); maybeAutoSpeak();
  });
  $("#btnFlip").addEventListener("click", function () {
    flashShowEn = !flashShowEn; renderFlash();
  });
  $("#btnSpeak").addEventListener("click", function () {
    if (VOCAB.length) speak(VOCAB[flash].en);
  });
  function maybeAutoSpeak() {
    if ($("#autoSpeak").checked && VOCAB.length) speak(VOCAB[flash].en);
  }
  $("#autoSpeak").addEventListener("change", function () { if (this.checked) maybeAutoSpeak(); });

  /* ===========================================================
     词库
     =========================================================== */
  function renderVocabYearOptions() {
    var sel = $("#vocabYear");
    if (sel.options.length > 1) return;
    var years = [];
    QUESTIONS.forEach(function (q) { if (years.indexOf(q.year) === -1) years.push(q.year); });
    years.forEach(function (y) {
      var o = document.createElement("option");
      o.value = String(y); o.textContent = y + " 年";
      sel.appendChild(o);
    });
  }

  function renderVocab() {
    renderVocabYearOptions();
    var kw = $("#vocabSearch").value.trim().toLowerCase();
    var year = $("#vocabYear").value;
    var rows = VOCAB.filter(function (w) {
      if (kw && (w.zh.toLowerCase().indexOf(kw) === -1 && w.en.toLowerCase().indexOf(kw) === -1)) return false;
      if (year) {
        var hit = w.qs.some(function (i) { return String(QUESTIONS[i].year) === year; });
        if (!hit) return false;
      }
      return true;
    });

    $("#vocabCounter").innerHTML = "共 <b>" + rows.length + "</b> 个词条 · 全库 " + VOCAB.length + " 个";
    var list = $("#vocabList");
    if (!rows.length) {
      list.innerHTML = '<div class="empty">没有匹配的词条</div>';
      return;
    }
    list.innerHTML = rows.map(function (w) {
      var qi = w.qs[0];
      return '<div class="vocab-row" data-i="' + qi + '">' +
        '<span class="vocab-zh">' + escapeHtml(w.zh) + "</span>" +
        '<span class="vocab-en">' + escapeHtml(w.en) + "</span>" +
        '<span class="vocab-count">出现 ' + w.count + " 次</span>" +
        '<span class="vocab-src">' + escapeHtml(QUESTIONS[qi].label) + "</span>" +
        "</div>";
    }).join("");

    list.querySelectorAll(".vocab-row").forEach(function (row) {
      row.addEventListener("click", function () {
        var w = w_byRow(row);
        if ($("#vocabSpeak").checked && w) speak(w.en);
      });
      row.querySelector(".vocab-src").addEventListener("click", function (ev) {
        ev.stopPropagation();
        goto(Number(row.dataset.i));
        switchView("trans");
      });
    });
  }

  function w_byRow(row) {
    var zh = row.querySelector(".vocab-zh").textContent;
    var en = row.querySelector(".vocab-en").textContent;
    for (var i = 0; i < VOCAB.length; i++) {
      if (VOCAB[i].zh === zh && VOCAB[i].en === en) return VOCAB[i];
    }
    return null;
  }

  $("#vocabSearch").addEventListener("input", renderVocab);
  $("#vocabYear").addEventListener("change", renderVocab);

  /* ===========================================================
     复习
     =========================================================== */
  function renderReview() {
    var rated = Object.keys(records).filter(function (k) { return records[k] && records[k].rating; });
    rated.sort(function (a, b) {
      return (records[a].nextAt || 0) - (records[b].nextAt || 0);
    });
    var due = rated.filter(function (k) { return isToday(records[k].nextAt); });

    $("#reviewCounter").innerHTML = "待复习 <b>" + due.length + "</b> 题 · 已自评 " + rated.length + " 题";

    $("#dueList").innerHTML = due.length ? due.map(itemHtml).join("")
      : '<div class="empty">今天没有到期的复习任务，去「翻译真题」继续练习吧。</div>';
    $("#ratedList").innerHTML = rated.length ? rated.map(itemHtml).join("")
      : '<div class="empty">还没有自评记录。在题目下方点击「不熟 / 一般 / 熟练」即可加入复习计划。</div>';

    $$("#page-review .list-item").forEach(function (el) {
      el.querySelector(".go").addEventListener("click", function () {
        goto(Number(el.dataset.i));
        switchView("trans");
      });
    });
  }

  function itemHtml(id) {
    var i = INDEX_BY_ID[id];
    var q = QUESTIONS[i];
    var r = records[id];
    var state = r.nextAt <= Date.now() ? "已到期" : "剩余 " + Math.ceil((r.nextAt - Date.now()) / DAY) + " 天";
    return '<div class="list-item" data-i="' + i + '">' +
      "<div><div class=\"t\">" + escapeHtml(q.label) + " · " + escapeHtml(q.zh.slice(0, 18)) + "…</div>" +
      '<div class="d">自评：' + RATE[r.rating].label + " · " + state + "</div></div>" +
      '<button class="btn go">去练习</button>' +
      "</div>";
  }

  /* ===========================================================
     统计
     =========================================================== */
  function renderStats() {
    var total = QUESTIONS.length;
    var attempted = 0, rated = 0, strengthSum = 0, strengthN = 0;
    Object.keys(records).forEach(function (k) {
      var r = records[k];
      if (!r) return;
      if (r.rating || r.revealed) attempted++;
      if (r.rating) {
        rated++;
        strengthSum += RATE[r.rating].strength;
        strengthN++;
      }
    });
    var strength = strengthN ? Math.round(strengthSum / strengthN) : 0;

    $("#statsCounter").innerHTML = "题库共 <b>" + total + "</b> 题";
    $("#statGrid").innerHTML = [
      ["练习进度", attempted + " / " + total, Math.round(attempted / total * 100)],
      ["自评题数", String(rated), total ? Math.round(rated / total * 100) : 0],
      ["平均记忆强度", strength + "%", strength]
    ].map(function (s) {
      return '<div class="stat-card"><div class="stat-num">' + s[1] + "</div>" +
        '<div class="stat-cap">' + s[0] + "</div>" +
        '<div class="bar"><i style="width:' + s[2] + '%"></i></div></div>';
    }).join("");

    var years = [];
    QUESTIONS.forEach(function (q) { if (years.indexOf(q.year) === -1) years.push(q.year); });
    $("#yearProgress").innerHTML = years.map(function (y) {
      var qs = QUESTIONS.filter(function (q) { return q.year === y; });
      var done = qs.filter(function (q) {
        var r = records[q.id];
        return r && (r.rating || r.revealed);
      }).length;
      var pct = Math.round(done / qs.length * 100);
      return '<div class="list-item"><div style="flex:1;min-width:200px">' +
        '<div class="t">' + y + " 年</div>" +
        '<div class="d">' + done + " / " + qs.length + " 题 · " + pct + "%</div>" +
        '<div class="bar"><i style="width:' + pct + '%"></i></div></div></div>';
    }).join("");
  }

  $("#btnExport").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify({ questions: QUESTIONS.length, records: records }, null, 2)],
      { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cet4-translation-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("已导出学习记录");
  });

  $("#btnReset").addEventListener("click", function () {
    if (!window.confirm("确定要清空本机所有学习记录吗？此操作不可恢复。")) return;
    records = {};
    save();
    renderQuestion(); renderReview(); renderStats(); refreshBadges();
    toast("已清空本机记录");
  });

  /* ===========================================================
     启动
     =========================================================== */
  function refreshBadges() {
    $("#reviewBadge").textContent = String(dueCount());
  }

  function init() {
    if (!QUESTIONS.length) {
      var el = document.getElementById("qPassage");
      if (el) {
        el.textContent = "题库未能加载：请确认 assets/data-a.js、data-b.js、data-c.js 与 index.html 的相对位置没有被改动；" +
          "或者直接使用同目录下的单文件版 cet4-translation-standalone.html（无需任何依赖）。";
      }
      return;
    }
    try {
      var hash = (location.hash || "").replace(/^#/, "");
      if (hash && INDEX_BY_ID[hash] !== undefined) cur = INDEX_BY_ID[hash];
      renderFilters();
      renderQuestion();
      renderFlash();
      renderReview();
      renderStats();
      refreshBadges();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = function () {};
        window.speechSynthesis.getVoices();
      }
      window.addEventListener("hashchange", function () {
        var id = (location.hash || "").replace(/^#/, "");
        if (INDEX_BY_ID[id] !== undefined && INDEX_BY_ID[id] !== cur) goto(INDEX_BY_ID[id]);
      });
    } catch (err) {
      console.error("[CET4] 初始化失败:", err);
      var box = document.getElementById("qPassage");
      if (box && !box.textContent) {
        box.textContent = "页面初始化失败：" + (err && err.message ? err.message : err);
      }
    }
  }

  init();
})();
