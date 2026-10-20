/* Terraform Associate training site — single-page app over window.COURSE (see scripts/build-site.py). */
(() => {
  "use strict";
  const C = window.COURSE;
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const main = $("#main");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inline = (s) => marked.parseInline(s);
  const slug = (s) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  /* ---------------- persistence (per-browser; app works without it) ---------------- */
  const KEY = "tfa-progress-v1";
  const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch { /* private mode */ } },
  };
  const freshProgress = () => ({ lessons: {}, exams: {}, cards: {}, objectives: {}, quizzes: {}, labChecks: {}, missed: {}, run: null, last: null });
  const P = Object.assign(freshProgress(), store.load());
  function resetProgress(epoch) {
    Object.keys(P).forEach((k) => delete P[k]);
    Object.assign(P, freshProgress(), epoch ? { epoch } : {});
    fcSession.deck = null; store.save();
  }
  const lessonState = (id) => (P.lessons[id] ||= { read: false, lab: false });

  /* ---------------- theme ---------------- */
  const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  let theme; try { theme = localStorage.getItem("tfa-theme"); } catch { theme = null; }
  const applyTheme = (t) => { document.documentElement.dataset.theme = t; };
  applyTheme(theme || (prefersDark() ? "dark" : "light"));
  $("#themeBtn").onclick = () => {
    const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(t); try { localStorage.setItem("tfa-theme", t); } catch { /* ignore */ }
  };

  /* ---------------- toast ---------------- */
  let toastEl;
  function toast(msg) {
    toastEl ||= document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast" }));
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  /* ---------------- link mapping: repo paths -> app routes ---------------- */
  function resolvePath(base, href) {
    const parts = base ? base.split("/") : [];
    for (const seg of href.split("/")) {
      if (seg === "..") parts.pop(); else if (seg && seg !== ".") parts.push(seg);
    }
    return parts.join("/");
  }
  function routeFor(path) {
    const [p, frag] = path.split("#");
    const s = frag ? `?s=${frag}` : "";
    let m;
    if ((m = p.match(/^lessons\/([^/]+)\/lab\/LAB\.md$/))) return `#/lesson/${m[1]}/lab${s}`;
    if ((m = p.match(/^lessons\/([^/]+)\/lab\/(.+)$/))) return `#/lesson/${m[1]}/files/${m[2]}`;
    if ((m = p.match(/^lessons\/([^/]+)(\/README\.md)?\/?$/))) return `#/lesson/${m[1]}${s}`;
    if ((m = p.match(/^practice-exams\/(.+)\.md$/))) return `#/exam/${m[1]}`;
    if ((m = p.match(/^cheatsheets\/(.+)\.md$/))) return `#/cheatsheet/${m[1]}${s}`;
    if (p === "flashcards.md") return "#/flashcards";
    if (p === "STUDY-PLAN.md") return `#/plan${s}`;
    if (p === "EXAM-OBJECTIVES.md") return "#/objectives";
    if (p === "README.md" || p === "") return `#/about${s}`;
    if (p.startsWith("scripts/")) return null;
    return null;
  }

  /* ---------------- markdown rendering ---------------- */
  marked.use({ gfm: true });
  function renderMd(md, baseDir) {
    const div = document.createElement("div");
    div.className = "md";
    div.innerHTML = marked.parse(md);
    const used = {};
    $$("h1,h2,h3,h4", div).forEach((h) => {
      let id = slug(h.textContent); if (used[id]) id += `-${used[id]++}`; else used[id] = 1;
      h.id = id;
      if (h.tagName !== "H1") h.insertAdjacentHTML("beforeend", `<a class="anchor" href="#${id}" aria-label="Link to section">#</a>`);
    });
    $$("a[href]", div).forEach((a) => {
      const href = a.getAttribute("href");
      if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; return; }
      if (href.startsWith("#")) return;
      const r = routeFor(resolvePath(baseDir, href));
      if (r) a.setAttribute("href", r); else a.removeAttribute("href");
    });
    $$("pre > code", div).forEach((code) => {
      const lang = (code.className.match(/language-(\w+)/) || [])[1];
      if (lang === "sh" || lang === "shell") code.className = "language-bash";
      if (window.Prism && /language-/.test(code.className)) Prism.highlightElement(code);
      addCopy(code.parentElement);
    });
    return div;
  }
  function addCopy(pre) {
    const b = document.createElement("button");
    b.className = "copy-btn"; b.textContent = "Copy";
    b.onclick = () => navigator.clipboard?.writeText(pre.querySelector("code").innerText).then(() => { b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1200); });
    pre.appendChild(b);
  }
  // In-page anchors ("#section") would clash with hash routing: scroll instead.
  main.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a || a.getAttribute("href").startsWith("#/")) return;
    e.preventDefault();
    document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth" });
  });
  function scrollToSection(s) {
    if (!s) { window.scrollTo(0, 0); return; }
    requestAnimationFrame(() => (document.getElementById(s) || document.getElementById(slug(s)))?.scrollIntoView());
  }

  /* ---------------- progress metrics ---------------- */
  /* ---------------- lesson gating: read + quiz passed + lab done unlocks the next lesson ---------------- */
  const PASS = 80;
  const LOCK_ICON = `<svg class="lock" viewBox="0 0 24 24" width="13" height="13" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  const quizPassed = (l) => !l.quiz.length || (P.quizzes[l.id]?.best ?? 0) >= PASS;
  // A lab with checkpoints is done when every checkpoint passed. `P.lessons[id].lab` is the old self-declared
  // flag: it can no longer be set for labs with checkpoints, but labs completed that way stay completed.
  const cpPassed = (l, id) => !!P.labChecks[l.id]?.[id];
  const labProgress = (l) => ({ done: l.labCheckpoints.filter((c) => cpPassed(l, c.id)).length, total: l.labCheckpoints.length });
  const labDone = (l) => { const p = labProgress(l); return !!P.lessons[l.id]?.lab || (p.total > 0 && p.done === p.total); };
  const steps = (l) => ({ read: !!P.lessons[l.id]?.read, quiz: quizPassed(l), lab: labDone(l) });
  const stepCount = (l) => Object.values(steps(l)).filter(Boolean).length;
  const lessonDone = (l) => stepCount(l) === 3;
  const isUnlocked = (i) => C.lessons.slice(0, i).every(lessonDone);

  function metrics() {
    const n = C.lessons.length;
    const read = C.lessons.filter((l) => P.lessons[l.id]?.read).length;
    const labs = C.lessons.filter((l) => P.lessons[l.id]?.lab).length;
    const quizzes = C.lessons.filter((l) => quizPassed(l) && P.quizzes[l.id]).length;
    const done = C.lessons.filter(lessonDone).length;
    const stepsDone = C.lessons.reduce((a, l) => a + stepCount(l), 0);
    const current = C.lessons.find((l) => !lessonDone(l));
    const best = C.exams.map((e) => Math.max(0, ...(P.exams[e.id] || []).map((h) => h.score)));
    const cardsSeen = C.flashcards.filter((c) => P.cards[c.n] !== undefined).length;
    const mastered = C.flashcards.filter((c) => (P.cards[c.n] || 0) >= 3).length;
    const objTotal = (C.objectives.match(/^- \[[ x]\]/gm) || []).length;
    const objDone = Object.values(P.objectives).filter(Boolean).length;
    return { n, read, labs, quizzes, done, stepsDone, current, best, cardsSeen, mastered, objTotal, objDone, course: pct(stepsDone, n * 3) };
  }

  /* ---------------- sidebar ---------------- */
  function renderSidebar(route) {
    const m = metrics();
    const link = (href, label, extra = "", num = "") =>
      `<a class="nav-link${route === href ? " active" : ""}" href="${href}">${num ? `<span class="nav-num">${num}</span>` : ""}<span>${label}</span>${extra}</a>`;
    const dot = (l, i) => {
      if (!isUnlocked(i)) return `<span class="nav-lock" title="Locked">${LOCK_ICON}</span>`;
      const c = stepCount(l);
      return `<span class="dot ${c === 3 ? "done" : c ? "half" : ""}" title="${c} of 3 steps done"></span>`;
    };
    $("#sidebar").innerHTML = `
      <div class="nav-group">
        ${link("#/", "Dashboard")}
      </div>
      <div class="nav-group"><div class="nav-label">Lessons</div>
        ${C.lessons.map((l, i) => link(`#/lesson/${l.id}`, esc(l.title), dot(l, i), l.num).replace('class="nav-link', `class="nav-link${isUnlocked(i) ? "" : " locked"}`)).join("")}
      </div>
      <div class="nav-group"><div class="nav-label">Practice</div>
        ${C.exams.map((e) => link(`#/exam/${e.id}`, esc(e.title))).join("")}
        ${link("#/flashcards", "Flashcards")}
      </div>
      <div class="nav-group"><div class="nav-label">Reference</div>
        ${C.cheatsheets.map((c) => link(`#/cheatsheet/${c.id}`, esc(c.title.replace(/\s*cheat ?sheet\s*/i, "") || c.title) + " cheatsheet")).join("")}
        ${link("#/objectives", "Exam objectives")}
        ${link("#/plan", "Study plan")}
        ${link("#/about", "About the exam")}
      </div>`;
    updateTopProgress(m);
  }

  // Segmented bar under the top bar: one segment per lesson, filled by its completed steps.
  function updateTopProgress(m = metrics()) {
    const bar = $("#courseProgress");
    bar.innerHTML = C.lessons.map((l, i) => {
      const c = stepCount(l);
      return `<a href="#/lesson/${l.id}" class="seg${c === 3 ? " done" : ""}${isUnlocked(i) ? "" : " locked"}" title="Lesson ${l.num}: ${esc(l.title)} — ${c}/3 steps"><span style="width:${(c / 3) * 100}%"></span></a>`;
    }).join("");
    bar.setAttribute("aria-valuenow", m.course);
    $("#progressLabel").innerHTML = m.done === m.n
      ? `<b>Course complete</b> · 100%`
      : `<span class="pl-long">Lesson ${m.current.num}/${String(m.n).padStart(2, "0")} · </span><b>${m.course}%</b>`;
    $("#progressLabel").href = m.done === m.n ? "#/" : `#/lesson/${m.current.id}`;
  }

  /* ---------------- pages ---------------- */
  function pageDashboard() {
    const m = metrics();
    const resume = m.current;
    const bestExam = Math.max(0, ...m.best);
    const ready = bestExam >= 85 && m.done === m.n;
    main.innerHTML = `<div class="page wide">
      <section class="hero">
        <div>
          <p class="eyebrow">Terraform Associate (004)</p>
          <h1 class="page-title">${m.course === 0 ? "Welcome — let's get you certified" : m.course === 100 ? "Course complete — time to sharpen up" : "Welcome back"}</h1>
          <p class="lede">${C.lessons.length} lessons with hands-on local labs, ${C.exams.reduce((a, e) => a + e.questions.length, 0)} practice-exam questions and ${C.flashcards.length} flashcards. Everything runs locally — no cloud account, no cost.</p>
          <div class="row">
            ${resume ? `<a class="btn primary" href="#/lesson/${resume.id}">${m.course ? "Continue" : "Start"}: Lesson ${resume.num} →</a>` : `<a class="btn primary" href="#/exam/${C.exams[0].id}">Take a practice exam →</a>`}
            <a class="btn" href="#/plan">View study plan</a>
          </div>
        </div>
        <div class="ring" style="--p:${m.course}" role="img" aria-label="Course ${m.course}% complete"><div><span><b>${m.course}%</b><br><small>course</small></span></div></div>
      </section>

      <div class="stats">
        <div class="card stat"><div class="k">Lessons completed</div><div class="v">${m.done}<span class="muted" style="font-size:16px"> / ${m.n}</span></div><div class="bar"><span style="width:${pct(m.done, m.n)}%"></span></div></div>
        <div class="card stat"><div class="k">Quizzes passed (${PASS}%+)</div><div class="v">${m.quizzes}<span class="muted" style="font-size:16px"> / ${m.n}</span></div><div class="bar"><span style="width:${pct(m.quizzes, m.n)}%"></span></div></div>
        <div class="card stat"><div class="k">Best practice exam</div><div class="v">${m.best.some((b) => b > 0) ? bestExam + "%" : "—"}</div><div class="bar ${bestExam >= 85 ? "ok" : ""}"><span style="width:${bestExam}%"></span></div></div>
        <div class="card stat"><div class="k">Flashcards mastered</div><div class="v">${m.mastered}<span class="muted" style="font-size:16px"> / ${C.flashcards.length}</span></div><div class="bar"><span style="width:${pct(m.mastered, C.flashcards.length)}%"></span></div></div>
      </div>
      ${ready ? `<div class="card" style="border-color:var(--ok);margin-bottom:8px"><b style="color:var(--ok)">You look exam-ready.</b> All lessons completed and a practice score ≥ 85%. Check the <a href="https://developer.hashicorp.com/certifications/infrastructure-automation" target="_blank" rel="noopener">official exam page</a> and book it.</div>` : ""}

      <div class="section-h"><h2>Lessons</h2><span class="muted">${m.stepsDone} of ${m.n * 3} steps done · read, quiz and lab unlock the next lesson</span></div>
      <div class="lesson-grid">
        ${C.lessons.map((l, i) => { const open = isUnlocked(i); return `
          <a class="card lesson-card${open ? "" : " locked"}${lessonDone(l) ? " done" : ""}" href="#/lesson/${l.id}">
            <span class="num">LESSON ${l.num}${open ? "" : ` ${LOCK_ICON}`}</span>
            <h3>${esc(l.title)}</h3>
            <div class="row">${open ? stepPills(l) : `<span class="pill">Locked — finish lesson ${C.lessons[i - 1].num}</span>`}</div>
          </a>`; }).join("")}
      </div>

      <div class="section-h"><h2>Practice</h2></div>
      <div class="lesson-grid">
        ${C.exams.map((e, i) => { const h = P.exams[e.id] || []; return `
          <a class="card lesson-card" href="#/exam/${e.id}">
            <span class="num">EXAM ${i + 1}</span><h3>${esc(e.title)}</h3>
            <span class="muted" style="font-size:14px">${e.questions.length} questions${h.length ? ` · ${h.length} attempt${h.length > 1 ? "s" : ""}` : ""}</span>
            <div class="row">${h.length ? `<span class="pill ${m.best[i] >= 85 ? "ok" : m.best[i] >= 70 ? "warn" : "bad"}">Best ${m.best[i]}%</span>` : `<span class="pill">Not taken</span>`}</div>
          </a>`; }).join("")}
        <a class="card lesson-card" href="#/flashcards">
          <span class="num">RECALL</span><h3>Flashcards</h3>
          <span class="muted" style="font-size:14px">${m.cardsSeen} of ${C.flashcards.length} seen</span>
          <div class="row"><span class="pill accent">${m.mastered} mastered</span></div>
        </a>
        <a class="card lesson-card" href="#/objectives">
          <span class="num">CHECKLIST</span><h3>Exam objectives</h3>
          <span class="muted" style="font-size:14px">Tick what you can explain and have practised</span>
          <div class="row"><span class="pill accent">${m.objDone} / ${m.objTotal}</span></div>
        </a>
      </div>
      <div class="row" style="justify-content:flex-end;margin-top:40px"><button class="btn small" id="resetAll">Reset all progress</button></div>
    </div>`;
    $("#resetAll").onclick = async () => {
      if (!confirm("Reset ALL progress? Lessons, labs, exam history, flashcards and objectives are cleared. If the lab server is running, every lab sandbox is reset too.")) return;
      let epoch;
      if (await labSession()) { try { epoch = (await api("/api/reset-all", { method: "POST" })).progressEpoch; } catch { /* server gone */ } }
      resetProgress(epoch || P.epoch); toast("All progress reset"); render();
    };
  }

  function stepPills(l) {
    const st = steps(l), best = P.quizzes[l.id]?.best;
    return `<span class="pill ${st.read ? "ok" : ""}">${st.read ? "✓ " : ""}Read</span>`
      + `<span class="pill ${st.quiz ? "ok" : best !== undefined ? "bad" : ""}">${st.quiz ? "✓ " : ""}Quiz${best !== undefined ? ` ${best}%` : ""}</span>`
      + `<span class="pill ${st.lab ? "ok" : ""}">${st.lab ? "✓ " : ""}Lab</span>`;
  }

  function pageLocked(i) {
    const l = C.lessons[i];
    const blocker = C.lessons.find((x) => !lessonDone(x));
    const st = steps(blocker);
    main.innerHTML = `<div class="page"><div class="card locked-card">
      <div class="lock-badge">${LOCK_ICON}</div>
      <p class="eyebrow">Lesson ${l.num} is locked</p>
      <h1 class="page-title">${esc(l.title)}</h1>
      <p class="lede">Finish <b>Lesson ${blocker.num} — ${esc(blocker.title)}</b> to unlock it. Still to do there:</p>
      <ul class="step-list">${Object.entries({ read: "Read the lesson", quiz: `Pass the review quiz (${PASS}%+)`, lab: "Complete the hands-on lab" })
        .map(([k, label]) => `<li class="${st[k] ? "done" : ""}"><span class="check">${st[k] ? "✓" : ""}</span>${label}</li>`).join("")}</ul>
      <a class="btn primary" href="#/lesson/${blocker.id}">Go to Lesson ${blocker.num} →</a>
    </div></div>`;
  }

  function pageLesson(id, sub, rest, q) {
    const i = C.lessons.findIndex((l) => l.id === id);
    if (i < 0) return pageNotFound();
    if (!isUnlocked(i)) return pageLocked(i);
    const l = C.lessons[i];
    const s = lessonState(id);
    P.last = id; store.save();
    const tab = sub || "lesson";
    const prev = C.lessons[i - 1], next = C.lessons[i + 1];
    const headPills = () => stepPills(l);
    const drawPager = () => {
      const done = lessonDone(l);
      $(".pager").innerHTML = `
        ${prev ? `<a class="btn" href="#/lesson/${prev.id}">← ${prev.num}. ${esc(prev.title)}</a>` : "<span></span>"}
        ${next ? (done ? `<a class="btn primary" href="#/lesson/${next.id}">${next.num}. ${esc(next.title)} →</a>`
                      : `<span class="btn locked-next" aria-disabled="true" title="Complete this lesson's read, quiz and lab steps first">${LOCK_ICON} ${next.num}. ${esc(next.title)}</span>`)
               : done ? `<a class="btn primary" href="#/exam/${C.exams[0].id}">Practice exam 1 →</a>` : "<span></span>"}`;
    };
    // redraw everything that depends on this lesson's progress
    const refresh = (wasDone) => {
      $(".lesson-head .row").innerHTML = headPills(); drawBox(); drawPager(); renderSidebar(`#/lesson/${id}`);
      if (!wasDone && lessonDone(l)) toast(next ? `Lesson ${l.num} complete — Lesson ${next.num} unlocked 🎉` : "Course complete 🎉");
    };
    main.innerHTML = `<div class="page${tab === "lab" ? " lab-page" : ""}">
      <div class="lesson-head">
        <div><p class="eyebrow">Lesson ${l.num} of ${String(C.lessons.length).padStart(2, "0")}</p></div>
        <div class="row">${headPills()}</div>
      </div>
      <div class="tabs" role="tablist">
        <a class="tab ${tab === "lesson" ? "active" : ""}" href="#/lesson/${id}">Lesson</a>
        <a class="tab ${tab === "lab" ? "active" : ""}" href="#/lesson/${id}/lab">Hands-on lab</a>
        <a class="tab ${tab === "files" ? "active" : ""}" href="#/lesson/${id}/files">Lab files (${l.labFiles.length})</a>
      </div>
      <div id="lessonBody"></div>
      <div class="card complete-box" id="completeBox"></div>
      <nav class="pager"></nav>
    </div>`;
    const body = $("#lessonBody");
    if (tab === "files") {
      const path = rest || l.labFiles[0]?.path;
      const f = l.labFiles.find((x) => x.path === path);
      const lang = /\.(tf|hcl|tfvars|tftpl)$/.test(path || "") ? "hcl" : /\.sh$/.test(path || "") ? "bash" : "";
      body.innerHTML = `<p class="muted">Run these from <code>${esc(l.dir)}/lab</code> in your terminal — follow the steps in the <a href="#/lesson/${id}/lab">lab guide</a>.</p>
        <div class="files"><div class="file-list">${l.labFiles.map((x) => `<a class="${x.path === path ? "active" : ""}" href="#/lesson/${id}/files/${x.path}">${esc(x.path)}</a>`).join("")}</div>
        <div class="file-view" id="fileView"></div></div>`;
      if (f) {
        const view = $("#fileView");
        if (path.endsWith(".md")) view.append(renderMd(f.content, `${l.dir}/lab/${path.split("/").slice(0, -1).join("/")}`));
        else {
          view.innerHTML = `<h3>${esc(path)}</h3><div class="md"><pre><code class="language-${lang || "none"}">${esc(f.content)}</code></pre></div>`;
          const code = $("code", view); if (lang && window.Prism) Prism.highlightElement(code); addCopy(code.parentElement);
        }
      }
    } else if (tab === "lab") {
      labTab(l, body, refresh);
    } else {
      const md = renderMd(l.md, l.dir);
      if (l.quiz.length) md.append(renderQuiz(l, refresh));
      const heads = $$("h2", md);
      if (heads.length > 3) {
        const toc = document.createElement("details");
        toc.className = "card toc";
        toc.innerHTML = `<summary>On this page</summary><ol>${heads.map((h) => `<li><a href="#${h.id}">${esc(h.firstChild.textContent)}</a></li>`).join("")}</ol>`;
        md.querySelector("h1")?.after(toc);
      }
      body.append(md);
    }
    const box = $("#completeBox");
    function drawBox() {
      const st = steps(l), best = P.quizzes[l.id]?.best, done = lessonDone(l);
      const item = (k, title, detail, action) => `<li class="${st[k] ? "done" : ""}"><span class="check">${st[k] ? "✓" : ""}</span>
        <div><b>${title}</b><small class="muted">${detail}</small></div>${st[k] ? "" : action}</li>`;
      box.innerHTML = `
        <div class="box-head"><b>${done ? `Lesson ${l.num} complete` : next ? `Complete these 3 steps to unlock Lesson ${next.num}` : "Complete these 3 steps to finish the course"}</b>
          <span class="muted">${stepCount(l)} / 3</span></div>
        <ol class="step-list">
          ${item("read", "Read the lesson", "Work through every section above.", `<button class="btn small primary" data-k="read">Mark as read</button>`)}
          ${item("quiz", `Pass the review quiz (${PASS}%+)`, best === undefined ? `${l.quiz.length} questions at the end of the lesson.` : st.quiz ? `Best score: ${best}%` : `Best score so far: ${best}% — you need ${PASS}%.`,
            `<a class="btn small${st.read ? " primary" : ""}" href="#/lesson/${l.id}?s=review-quiz">${best === undefined ? "Take the quiz" : "Retry the quiz"}</a>`)}
          ${l.labCheckpoints.length
            ? item("lab", "Complete the hands-on lab", P.lessons[l.id]?.lab && labProgress(l).done < labProgress(l).total
                ? "Completed before checkpoints existed. The checkpoints are still there to practise."
                : `${labProgress(l).done} of ${labProgress(l).total} lab checkpoints passed.`,
                tab === "lab" ? "" : `<a class="btn small${st.read && st.quiz ? " primary" : ""}" href="#/lesson/${l.id}/lab">Open the lab</a>`)
            : item("lab", "Complete the hands-on lab", "Do every exercise, then confirm here.",
                `${tab === "lab" ? "" : `<a class="btn small" href="#/lesson/${l.id}/lab">Open the lab</a>`}<button class="btn small${st.read && st.quiz ? " primary" : ""}" data-k="lab">Mark lab as done</button>`)}
        </ol>
        ${done && next ? `<a class="btn primary" href="#/lesson/${next.id}">Continue to Lesson ${next.num} →</a>` : ""}`;
      $$("button[data-k]", box).forEach((b) => (b.onclick = () => {
        const wasDone = lessonDone(l);
        s[b.dataset.k] = true; store.save(); refresh(wasDone);
      }));
    }
    drawBox(); drawPager();
    scrollToSection(q.s);
  }

  /* ---------------- lesson review quizzes ---------------- */
  // Review questions from earlier lessons: their quizzes plus the hands-on questions of their labs.
  // Questions the learner missed before come first; the rest are spread across the earlier lessons.
  function reviewQuestions(i) {
    const count = Math.min(5, i + 1);
    if (i === 0) return [];
    const pool = C.lessons.slice(0, i).flatMap((pl) => [
      ...pl.quiz.map((q) => ({ ...q, key: `${pl.id}:quiz:${q.n}`, from: `Lesson ${pl.num}` })),
      ...pl.labCheckpoints.filter((c) => c.kind === "question").map((c) => ({ ...c, key: `${pl.id}:lab:${c.id}`, from: `Lab ${pl.num}` })),
    ]);
    const shuffled = pool.map((q) => [Math.random(), q]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    const chosen = shuffled.filter((q) => P.missed[q.key]).slice(0, count);
    const perLesson = {};
    chosen.forEach((q) => (perLesson[q.from.slice(-2)] = (perLesson[q.from.slice(-2)] || 0) + 1));
    for (const q of shuffled) {
      if (chosen.length >= count) break;
      if (chosen.includes(q)) continue;
      const least = Math.min(...C.lessons.slice(0, i).map((pl) => perLesson[pl.num] || 0));
      if ((perLesson[q.from.slice(-2)] || 0) > least) continue; // keep the spread even
      chosen.push(q); perLesson[q.from.slice(-2)] = (perLesson[q.from.slice(-2)] || 0) + 1;
    }
    for (const q of shuffled) { if (chosen.length >= count) break; if (!chosen.includes(q)) chosen.push(q); }
    return chosen.map((q) => ({ ...q, review: true }));
  }

  function renderQuiz(l, onScore) {
    const wrap = document.createElement("section");
    wrap.className = "quiz";
    const i = C.lessons.indexOf(l);
    let qs, answers, checked;
    const start = () => {
      qs = [...l.quiz.map((q) => ({ ...q, key: `${l.id}:quiz:${q.n}` })), ...reviewQuestions(i)].map((q, idx) => ({ ...q, n: idx + 1 }));
      answers = {}; checked = false;
    };
    start();
    const isRight = (q) => { const a = answers[q.n] || []; return a.length === q.answer.length && q.answer.every((k) => a.includes(k)); };
    const question = (q) => {
      const sel = answers[q.n] || [];
      const need = q.multi ? ` <span class="pill accent">Select ${["", "ONE", "TWO", "THREE", "FOUR"][q.answer.length] || q.answer.length}</span>` : "";
      return `<div class="quiz-q card${q.review ? " review" : ""}" data-n="${q.n}">
        ${q.review ? `<div class="review-from">Review · ${esc(q.from)}${P.missed[q.key] ? " · you missed this before" : ""}</div>` : ""}
        <div class="question"><span class="muted">${q.n}.</span> ${inline(q.q.replace(/\s*\*\(Select [A-Z]+\)\*\s*$/, ""))}${need}</div>
        <div class="opts" role="${q.multi ? "group" : "radiogroup"}">${q.options.map((o) => {
          let cls = sel.includes(o.key) ? " sel" : "";
          if (checked) cls = q.answer.includes(o.key) ? " correct" : sel.includes(o.key) ? " incorrect" : "";
          return `<button class="opt${q.multi ? " multi" : ""}${cls}" data-k="${o.key}" ${checked ? "disabled" : ""} role="${q.multi ? "checkbox" : "radio"}" aria-checked="${sel.includes(o.key)}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></button>`;
        }).join("")}</div>
        ${checked ? `<div class="explain ${isRight(q) ? "ok" : "bad"}"><b>${isRight(q) ? "Correct." : `Answer: ${q.answer.join(", ")}.`}</b> ${inline(q.explanation)}</div>` : ""}
      </div>`;
    };
    const draw = () => {
      const own = qs.filter((q) => !q.review), review = qs.filter((q) => q.review);
      const done = qs.filter((q) => (answers[q.n] || []).length).length;
      const correct = qs.filter(isRight).length;
      const score = pct(correct, qs.length);
      const r = P.quizzes[l.id];
      wrap.innerHTML = `
        <h2 id="review-quiz">Review quiz</h2>
        <p class="muted">${own.length} questions on this lesson${review.length ? ` + ${review.length} from earlier lessons and labs` : ""}. Answer them all, then check your score.${r ? ` Best so far: <b>${r.best}%</b>${r.attempts > 1 ? ` (${r.attempts} attempts)` : ""}.` : ""}</p>
        ${checked ? `<div class="card quiz-score ${score >= 80 ? "ok" : score >= 60 ? "warn" : "bad"}"><div class="score-big">${score}%</div>
          <div><b>${correct} of ${qs.length} correct</b>${review.length ? ` <span class="muted">(review: ${review.filter(isRight).length}/${review.length})</span>` : ""}<br><span class="muted">${score === 100 ? "Perfect — on to the lab!" : score >= 80 ? "Solid. Review the explanations for the ones you missed." : "Re-read the sections behind the red answers, then try again."}</span></div></div>` : ""}
        ${own.map(question).join("")}
        ${review.length ? `<h3 class="review-h">From previous lessons</h3><p class="muted" style="margin-top:0">Questions you missed before come back here until you get them right. They count towards your score.</p>${review.map(question).join("")}` : ""}
        <div class="row quiz-actions">
          ${checked ? `<button class="btn primary" data-act="retry">Try again${review.length ? " (new review questions)" : ""}</button>`
            : `<button class="btn primary" data-act="check" ${done < qs.length ? "disabled" : ""}>Check answers</button><span class="muted">${done} of ${qs.length} answered</span>`}
        </div>`;
    };
    wrap.addEventListener("click", (e) => {
      const opt = e.target.closest(".opt");
      if (opt && !checked) {
        const q = qs.find((x) => x.n === +opt.closest(".quiz-q").dataset.n), k = opt.dataset.k, a = answers[q.n] || [];
        answers[q.n] = q.multi ? (a.includes(k) ? a.filter((x) => x !== k) : [...a, k].sort()) : [k];
        const y = window.scrollY; draw(); window.scrollTo(0, y);
        return;
      }
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "check") {
        const wasDone = lessonDone(l);
        const score = pct(qs.filter(isRight).length, qs.length);
        qs.forEach((q) => { if (isRight(q)) delete P.missed[q.key]; else P.missed[q.key] = true; });
        checked = true;
        const r = P.quizzes[l.id] || { best: 0, attempts: 0 };
        P.quizzes[l.id] = { best: Math.max(r.best, score), last: score, attempts: r.attempts + 1, date: Date.now() };
        store.save(); draw(); onScore?.(wasDone);
        $(".quiz-score", wrap)?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (score === 100) toast("Perfect score 🎉");
      } else if (act === "retry") {
        start(); draw();
        $("#review-quiz").scrollIntoView({ behavior: "smooth" });
      }
    });
    draw();
    return wrap;
  }

  function pageDoc(md, base, q, opts = {}) {
    main.innerHTML = `<div class="page"></div>`;
    const el = renderMd(md, base);
    if (opts.checklist) {
      const head = document.createElement("div");
      head.className = "card"; head.style.marginBottom = "24px";
      head.innerHTML = `<div class="row" style="justify-content:space-between"><b>Objectives covered</b><span class="obj-count"></span></div><div class="bar" style="margin-top:8px"><span class="obj-bar"></span></div>`;
      el.querySelector("h1").after(head);
      const updateObj = () => {
        const m = metrics();
        $(".obj-count", head).textContent = `${m.objDone} / ${m.objTotal}`;
        $(".obj-bar", head).style.width = pct(m.objDone, m.objTotal) + "%";
      };
      $$("li", el).forEach((li) => {
        const cb = li.querySelector(":scope > input[type=checkbox]");
        if (!cb) return;
        const key = li.textContent.trim().split(/\s+/)[0];
        cb.disabled = false; cb.checked = !!P.objectives[key];
        li.classList.add("task-list-item"); li.classList.toggle("checked", cb.checked);
        li.parentElement.classList.add("contains-task-list");
        cb.setAttribute("aria-label", li.textContent.trim());
        cb.onchange = () => { P.objectives[key] = cb.checked; li.classList.toggle("checked", cb.checked); store.save(); updateObj(); };
      });
      updateObj();
    }
    $(".page").append(el);
    scrollToSection(q.s);
  }

  /* ---------------- practice exams ---------------- */
  let timerId = null;
  function examMeta(e) {
    const mins = +(e.intro.match(/(\d+)\s*minutes/) || [])[1] || 60;
    const pass = +(e.intro.match(/pass mark:\s*(\d+)%/) || [])[1] || 70;
    return { mins, pass };
  }
  function pageExam(id, sub) {
    const e = C.exams.find((x) => x.id === id);
    if (!e) return pageNotFound();
    if (sub === "results") return examResults(e);
    if (P.run && P.run.exam === id) return examRun(e);
    const { mins, pass } = examMeta(e);
    const hist = P.exams[id] || [];
    const lastWrong = hist.length ? hist[hist.length - 1].wrong : [];
    main.innerHTML = `<div class="page">
      <p class="eyebrow">Practice exam</p>
      <h1 class="page-title">${esc(e.title)}</h1>
      <p class="lede">${e.questions.length} questions · ${mins} minutes · pass mark ${pass}% (aim for 85%+ before booking the real exam).</p>
      <div class="mode-cards">
        <div class="card"><h3>Exam mode</h3><p class="muted">Timed, no feedback until you submit — just like test day.</p><button class="btn primary" data-mode="exam">Start timed exam</button></div>
        <div class="card"><h3>Study mode</h3><p class="muted">Untimed. Check each answer and read the explanation as you go.</p><button class="btn" data-mode="study">Start study mode</button></div>
        ${lastWrong.length ? `<div class="card"><h3>Retry mistakes</h3><p class="muted">The ${lastWrong.length} question${lastWrong.length > 1 ? "s" : ""} you missed last time, in study mode.</p><button class="btn" data-mode="retry">Retry ${lastWrong.length} question${lastWrong.length > 1 ? "s" : ""}</button></div>` : ""}
      </div>
      ${hist.length ? `<h2 style="font-size:18px;margin-top:32px">Your attempts</h2>
        <div class="card" style="padding:8px 16px;overflow-x:auto"><table class="history"><thead><tr><th>Date</th><th>Mode</th><th>Score</th><th>Time</th><th></th></tr></thead><tbody>
        ${hist.map((h, i) => `<tr><td>${new Date(h.date).toLocaleString()}</td><td>${h.mode}</td><td><span class="pill ${h.score >= 85 ? "ok" : h.score >= pass ? "warn" : "bad"}">${h.correct}/${h.total} · ${h.score}%</span></td><td>${fmtTime(h.secs || 0)}</td><td><a href="#/exam/${id}/results?i=${i}">Review</a></td></tr>`).reverse().join("")}
        </tbody></table></div>` : ""}
    </div>`;
    $$("[data-mode]", main).forEach((b) => (b.onclick = () => {
      const mode = b.dataset.mode;
      const qs = mode === "retry" ? lastWrong : e.questions.map((x) => x.n);
      P.run = { exam: id, mode: mode === "retry" ? "study" : mode, label: mode, qs, idx: 0, answers: {}, checked: {}, flags: {}, start: Date.now(), deadline: mode === "exam" ? Date.now() + mins * 60000 : null };
      store.save(); examRun(e);
    }));
  }

  function examRun(e) {
    const R = P.run;
    const byN = Object.fromEntries(e.questions.map((x) => [x.n, x]));
    const study = R.mode === "study";
    main.innerHTML = `<div class="page">
      <div class="exam-top">
        <b>${esc(e.title)}</b><span class="pill accent">${study ? "Study mode" : "Exam mode"}</span>
        <span style="margin-left:auto" class="timer" id="timer"></span>
        <button class="btn small" id="quitBtn">Quit</button>
        <button class="btn small primary" id="submitBtn">Submit</button>
      </div>
      <div class="qnav" id="qnav" aria-label="Question navigator"></div>
      <div class="card" id="qcard"></div>
      <p class="muted" style="font-size:13px;margin-top:14px">Keyboard: <kbd>A</kbd>–<kbd>E</kbd> select · <kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>F</kbd> flag${study ? " · <kbd>Enter</kbd> check" : ""}</p>
    </div>`;
    const tick = () => {
      const t = $("#timer"); if (!t) return;
      if (R.deadline) {
        const left = Math.max(0, Math.round((R.deadline - Date.now()) / 1000));
        t.textContent = "⏱ " + fmtTime(left); t.classList.toggle("low", left < 300);
        if (left === 0) { toast("Time's up!"); finish(); }
      } else t.textContent = fmtTime(Math.round((Date.now() - R.start) / 1000));
    };
    clearInterval(timerId); timerId = setInterval(tick, 1000); tick();

    const isRight = (q) => { const a = R.answers[q.n] || []; return a.length === q.answer.length && q.answer.every((k) => a.includes(k)); };
    function nav() {
      $("#qnav").innerHTML = R.qs.map((n, i) => {
        const q = byN[n]; let cls = (R.answers[n] || []).length ? "answered" : "";
        if (study && R.checked[n]) cls = isRight(q) ? "right" : "wrong";
        return `<button class="${cls}${i === R.idx ? " current" : ""}${R.flags[n] ? " flag" : ""}" data-i="${i}" aria-label="Question ${q.n}">${q.n}</button>`;
      }).join("");
      $$("#qnav button").forEach((b) => (b.onclick = () => go(+b.dataset.i)));
    }
    function draw() {
      const q = byN[R.qs[R.idx]];
      const sel = R.answers[q.n] || [];
      const revealed = study && R.checked[q.n];
      const need = q.multi ? `Select ${["", "ONE", "TWO", "THREE", "FOUR"][q.answer.length] || q.answer.length}` : "";
      $("#qcard").innerHTML = `
        <div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="muted" style="font-size:13px">Question ${R.idx + 1} of ${R.qs.length}${need ? ` · <b>${need}</b>` : ""}</span>
          <button class="btn small" id="flagBtn">${R.flags[q.n] ? "★ Flagged" : "☆ Flag for review"}</button></div>
        <div class="question">${marked.parse(q.q.replace(/\s*\*\(Select [A-Z]+\)\*\s*$/, ""))}</div>
        <div class="opts" role="${q.multi ? "group" : "radiogroup"}">
          ${q.options.map((o) => {
            let cls = sel.includes(o.key) ? " sel" : "";
            if (revealed) cls = q.answer.includes(o.key) ? " correct" : sel.includes(o.key) ? " incorrect" : "";
            return `<button class="opt${q.multi ? " multi" : ""}${cls}" data-k="${o.key}" ${revealed ? "disabled" : ""} role="${q.multi ? "checkbox" : "radio"}" aria-checked="${sel.includes(o.key)}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></button>`;
          }).join("")}
        </div>
        ${revealed ? `<div class="explain ${isRight(q) ? "ok" : "bad"}"><b>${isRight(q) ? "Correct." : `Answer: ${q.answer.join(", ")}.`}</b> ${inline(q.explanation)}</div>` : ""}
        <div class="row" style="justify-content:space-between">
          <button class="btn" id="prevBtn" ${R.idx === 0 ? "disabled" : ""}>← Previous</button>
          <div class="row">
            ${study && !revealed ? `<button class="btn primary" id="checkBtn" ${sel.length ? "" : "disabled"}>Check answer</button>` : ""}
            ${R.idx < R.qs.length - 1 ? `<button class="btn ${study && !revealed ? "" : "primary"}" id="nextBtn">Next →</button>` : `<button class="btn primary" id="endBtn">Finish</button>`}
          </div>
        </div>`;
      $$(".opt", $("#qcard")).forEach((b) => (b.onclick = () => choose(b.dataset.k)));
      $("#flagBtn").onclick = () => { R.flags[q.n] = !R.flags[q.n]; store.save(); draw(); nav(); };
      $("#prevBtn").onclick = () => go(R.idx - 1);
      $("#nextBtn") && ($("#nextBtn").onclick = () => go(R.idx + 1));
      $("#endBtn") && ($("#endBtn").onclick = () => confirmFinish());
      $("#checkBtn") && ($("#checkBtn").onclick = check);
    }
    function choose(k) {
      const q = byN[R.qs[R.idx]];
      if (study && R.checked[q.n]) return;
      const a = R.answers[q.n] || [];
      R.answers[q.n] = q.multi ? (a.includes(k) ? a.filter((x) => x !== k) : [...a, k].sort()) : [k];
      store.save(); draw(); nav();
    }
    function check() { const n = R.qs[R.idx]; if (!(R.answers[n] || []).length) return; R.checked[n] = true; store.save(); draw(); nav(); }
    function go(i) { if (i < 0 || i >= R.qs.length) return; R.idx = i; store.save(); draw(); nav(); window.scrollTo({ top: 0 }); }
    function confirmFinish() {
      const un = R.qs.filter((n) => !(R.answers[n] || []).length).length;
      if (un && !confirm(`${un} question${un > 1 ? "s are" : " is"} unanswered. Submit anyway?`)) return;
      finish();
    }
    function finish() {
      clearInterval(timerId);
      const qs = R.qs.map((n) => byN[n]);
      const wrong = qs.filter((q) => !isRight(q)).map((q) => q.n);
      const correct = qs.length - wrong.length;
      (P.exams[e.id] ||= []).push({ date: Date.now(), mode: R.label, total: qs.length, correct, score: pct(correct, qs.length), wrong, qs: R.qs, answers: R.answers, secs: Math.round((Date.now() - R.start) / 1000) });
      P.run = null; store.save();
      location.hash = `#/exam/${e.id}/results`;
    }
    $("#submitBtn").onclick = confirmFinish;
    $("#quitBtn").onclick = () => { if (confirm("Quit this attempt? Your answers will be discarded.")) { clearInterval(timerId); P.run = null; store.save(); render(); } };
    keyHandler = (ev) => {
      if (ev.target.closest("input,textarea,select") || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      const k = ev.key.toUpperCase();
      const q = byN[R.qs[R.idx]];
      if (q.options.some((o) => o.key === k)) choose(k);
      else if (ev.key === "ArrowRight") go(R.idx + 1);
      else if (ev.key === "ArrowLeft") go(R.idx - 1);
      else if (k === "F") $("#flagBtn").click();
      else if (ev.key === "Enter" && study && !R.checked[q.n]) check();
      else if (ev.key === "Enter" && R.idx < R.qs.length - 1) go(R.idx + 1);
      else return;
      ev.preventDefault();
    };
    draw(); nav();
  }

  function examResults(e) {
    const hist = P.exams[e.id] || [];
    const i = +(new URLSearchParams(location.hash.split("?")[1] || "").get("i") ?? hist.length - 1);
    const h = hist[Number.isNaN(i) ? hist.length - 1 : i];
    if (!h) { location.hash = `#/exam/${e.id}`; return; }
    const { pass } = examMeta(e);
    const byN = Object.fromEntries(e.questions.map((x) => [x.n, x]));
    const verdict = h.score >= 85 ? ["ok", "Excellent — exam-ready territory."] : h.score >= pass ? ["warn", "Pass, but aim for 85%+ before booking."] : ["bad", "Not yet — review the explanations below and the related lessons."];
    main.innerHTML = `<div class="page">
      <p class="eyebrow">${esc(e.title)} · results</p>
      <div class="card" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap;margin-bottom:24px">
        <div class="score-big" style="color:var(--${verdict[0]})">${h.score}%</div>
        <div style="flex:1;min-width:200px"><b>${h.correct} of ${h.total} correct</b> · ${fmtTime(h.secs || 0)}<br><span class="muted">${verdict[1]}</span></div>
        <div class="row"><a class="btn" href="#/exam/${e.id}">Back to exam</a>${h.wrong.length ? `<button class="btn primary" id="retryBtn">Retry ${h.wrong.length} mistake${h.wrong.length > 1 ? "s" : ""}</button>` : ""}</div>
      </div>
      <div class="row" style="margin-bottom:8px"><label class="row muted" style="font-size:14px"><input type="checkbox" id="onlyWrong" ${h.wrong.length ? "checked" : ""}> Show only questions I got wrong</label></div>
      <div id="review"></div>
    </div>`;
    const draw = () => {
      const only = $("#onlyWrong").checked;
      $("#review").innerHTML = h.qs.filter((n) => !only || h.wrong.includes(n)).map((n) => {
        const q = byN[n], sel = h.answers[n] || [], ok = !h.wrong.includes(n);
        return `<div class="review-item"><div class="row" style="margin-bottom:6px"><span class="pill ${ok ? "ok" : "bad"}">${ok ? "✓ Correct" : "✗ Incorrect"}</span><span class="muted" style="font-size:13px">Question ${n}</span></div>
          <div class="question">${marked.parse(q.q)}</div>
          <div class="opts">${q.options.map((o) => `<div class="opt${q.answer.includes(o.key) ? " correct" : sel.includes(o.key) ? " incorrect" : ""}"><span class="key">${o.key}</span><span>${inline(o.text)}</span></div>`).join("")}</div>
          <div class="explain ${ok ? "ok" : "bad"}">${sel.length ? "" : "<b>Not answered.</b> "}${inline(q.explanation)}</div></div>`;
      }).join("") || `<div class="empty">Perfect score — nothing to review. 🎉</div>`;
    };
    $("#onlyWrong").onchange = draw; draw();
    $("#retryBtn") && ($("#retryBtn").onclick = () => {
      P.run = { exam: e.id, mode: "study", label: "retry", qs: h.wrong, idx: 0, answers: {}, checked: {}, flags: {}, start: Date.now(), deadline: null };
      store.save(); location.hash = `#/exam/${e.id}`;
    });
    window.scrollTo(0, 0);
  }

  /* ---------------- flashcards ---------------- */
  // P.cards[n] = consecutive-correct streak (absent = never seen). Mastered at >= 3.
  const fcSession = { deck: null, i: 0, flipped: false, filter: "due", from: 1, to: C.flashcards.length, shuffle: true };
  function pageFlashcards() {
    const S = fcSession;
    const counts = { new: 0, learning: 0, known: 0, mastered: 0 };
    C.flashcards.forEach((c) => { const v = P.cards[c.n]; counts[v === undefined ? "new" : v >= 3 ? "mastered" : v >= 1 ? "known" : "learning"]++; });
    const build = () => {
      let d = C.flashcards.filter((c) => c.n >= S.from && c.n <= S.to);
      if (S.filter === "due") d = d.filter((c) => (P.cards[c.n] ?? -1) < 3);
      if (S.filter === "learning") d = d.filter((c) => P.cards[c.n] !== undefined && P.cards[c.n] < 1);
      if (S.shuffle) d = d.map((c) => [Math.random(), c]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
      S.deck = d; S.i = 0; S.flipped = false;
    };
    if (!S.deck) build();
    main.innerHTML = `<div class="page">
      <p class="eyebrow">Rapid recall</p>
      <h1 class="page-title">Flashcards</h1>
      <p class="lede">Say the answer out loud, flip, then be honest. Cards you get right three times in a row are mastered.</p>
      <div class="boxes" style="margin-bottom:18px">
        <span><b>${counts.new}</b>New</span><span><b>${counts.learning}</b>Learning</span><span><b>${counts.known}</b>Known</span><span style="background:var(--ok-soft);color:var(--ok)"><b>${counts.mastered}</b>Mastered</span>
      </div>
      <div class="card row" style="align-items:flex-end">
        <label class="field">Cards<select id="fcFilter"><option value="due">Not mastered yet</option><option value="all">All cards</option><option value="learning">Missed last time</option></select></label>
        <label class="field">From #<input id="fcFrom" type="number" min="1" max="${C.flashcards.length}" value="${S.from}" style="width:80px"></label>
        <label class="field">To #<input id="fcTo" type="number" min="1" max="${C.flashcards.length}" value="${S.to}" style="width:80px"></label>
        <label class="row muted" style="font-size:14px;padding-bottom:8px"><input type="checkbox" id="fcShuffle" ${S.shuffle ? "checked" : ""}> Shuffle</label>
        <button class="btn" id="fcApply" style="margin-left:auto">New session</button>
      </div>
      <div id="fcArea"></div>
      <div class="row" style="justify-content:space-between;margin-top:30px"><p class="muted" style="font-size:13px;margin:0"><kbd>Space</kbd> flip · <kbd>1</kbd> again · <kbd>2</kbd> got it · <kbd>←</kbd> <kbd>→</kbd> browse</p>
        <button class="btn small" id="fcReset">Reset flashcard progress</button></div>
    </div>`;
    $("#fcFilter").value = S.filter;
    $("#fcApply").onclick = () => {
      S.filter = $("#fcFilter").value; S.shuffle = $("#fcShuffle").checked;
      S.from = Math.max(1, +$("#fcFrom").value || 1); S.to = Math.min(C.flashcards.length, +$("#fcTo").value || C.flashcards.length);
      build(); pageFlashcards();
    };
    $("#fcReset").onclick = () => { if (confirm("Reset all flashcard progress?")) { P.cards = {}; store.save(); S.deck = null; pageFlashcards(); } };
    const area = $("#fcArea");
    const draw = () => {
      const c = S.deck[S.i];
      if (!c) {
        area.innerHTML = `<div class="card empty" style="margin-top:20px"><h3 style="color:var(--text);margin-top:0">${S.deck.length ? "Session complete 🎉" : "No cards match this filter"}</h3><p>${S.deck.length ? `You went through ${S.deck.length} card${S.deck.length > 1 ? "s" : ""}.` : "Try “All cards” or widen the range."}</p><button class="btn primary" id="fcAgain">Start another session</button></div>`;
        $("#fcAgain").onclick = () => { build(); pageFlashcards(); };
        return;
      }
      const v = P.cards[c.n];
      area.innerHTML = `
        <div class="row" style="justify-content:space-between;margin-top:20px"><span class="muted" style="font-size:14px">Card ${S.i + 1} of ${S.deck.length}</span>
          <span class="pill ${v === undefined ? "" : v >= 3 ? "ok" : v >= 1 ? "accent" : "bad"}">${v === undefined ? "New" : v >= 3 ? "Mastered" : v >= 1 ? `Streak ${v}` : "Learning"}</span></div>
        <div class="bar" style="margin:8px 0 0"><span style="width:${pct(S.i, S.deck.length)}%"></span></div>
        <div class="fc-wrap"><div class="fc ${S.flipped ? "flipped" : ""}" id="fc" tabindex="0" role="button" aria-label="Flip card">
          <div class="fc-face fc-front" ${S.flipped ? 'aria-hidden="true"' : ""}><small>#${c.n}</small><div>${inline(c.q)}</div><span class="fc-hint">Click or press Space to reveal</span></div>
          <div class="fc-face fc-back" ${S.flipped ? "" : 'aria-hidden="true"'}><small>#${c.n}</small><div>${inline(c.a)}</div></div>
        </div></div>
        <div class="row" style="justify-content:center">
          ${S.flipped ? `<button class="btn" id="fcBad" style="min-width:140px">✗ Again</button><button class="btn primary" id="fcGood" style="min-width:140px">✓ Got it</button>`
            : `<button class="btn primary" id="fcFlip" style="min-width:200px">Show answer</button>`}
        </div>`;
      $("#fc").onclick = flip; $("#fcFlip") && ($("#fcFlip").onclick = flip);
      $("#fcBad") && ($("#fcBad").onclick = () => grade(false));
      $("#fcGood") && ($("#fcGood").onclick = () => grade(true));
    };
    const flip = () => { S.flipped = !S.flipped; draw(); };
    const grade = (ok) => {
      const c = S.deck[S.i];
      P.cards[c.n] = ok ? (P.cards[c.n] ?? 0) + 1 : 0;
      if (!ok) S.deck.push(c); // see it again this session
      store.save(); S.i++; S.flipped = false; draw();
      if (ok && P.cards[c.n] === 3) toast(`Card #${c.n} mastered`);
    };
    keyHandler = (ev) => {
      if (ev.target.closest("input,select,textarea") || !S.deck[S.i]) return;
      if (ev.key === " ") flip();
      else if (ev.key === "1" && S.flipped) grade(false);
      else if (ev.key === "2" && S.flipped) grade(true);
      else if (ev.key === "ArrowRight") { S.i = Math.min(S.deck.length - 1, S.i + 1); S.flipped = false; draw(); }
      else if (ev.key === "ArrowLeft") { S.i = Math.max(0, S.i - 1); S.flipped = false; draw(); }
      else return;
      ev.preventDefault();
    };
    draw();
  }

  /* ---------------- hands-on labs in the browser (needs scripts/lab-server.py) ---------------- */
  let sessionP;
  const labSession = () => (sessionP ||= location.protocol.startsWith("http")
    ? fetch("/api/session", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null)
    : Promise.resolve(null));
  async function api(path, opts = {}) {
    const s = await labSession();
    const r = await fetch(path, { ...opts, headers: { "X-Lab-Token": s.token, "Content-Type": "application/json", ...(opts.headers || {}) } });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || r.statusText), { status: r.status, data });
    return data;
  }
  let xtermP;
  function loadXterm() {
    const css = Object.assign(document.createElement("link"), { rel: "stylesheet", href: "https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css" });
    const js = (src) => new Promise((ok, ko) => document.head.append(Object.assign(document.createElement("script"), { src, onload: ok, onerror: ko })));
    return (xtermP ||= (document.head.append(css), js("https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js")
      .then(() => js("https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"))));
  }
  // Terminals use a dark palette in both site themes.
  const TERM_THEME = { background: "#1e1c26", foreground: "#e9e7f2", cursor: "#a87ae6", selectionBackground: "#4a3a6a",
    black: "#3b3a45", brightBlack: "#7d7a8c", red: "#f07a70", brightRed: "#ff9b92", green: "#4cc386", brightGreen: "#7ee0a8",
    yellow: "#f0b04f", brightYellow: "#ffd07a", blue: "#82aaff", brightBlue: "#a8c4ff", magenta: "#c792ea", brightMagenta: "#ddb4f5",
    cyan: "#5fd0d0", brightCyan: "#8ee6e6", white: "#d6d4e0", brightWhite: "#ffffff" };

  // Turn each shell line of the guide into a runnable command.
  function addRunButtons(md, run) {
    $$("pre > code.language-bash", md).forEach((code) => {
      const pre = code.parentElement;
      const lines = code.textContent.replace(/\n$/, "").split("\n");
      code.innerHTML = lines.map((line) => {
        const cmd = line.replace(/^>\s?/, "").trim();
        const runnable = cmd && !cmd.startsWith("#") && !/^cd\s+lessons\//.test(cmd);
        const html = window.Prism ? Prism.highlight(line, Prism.languages.bash, "bash") : esc(line);
        return `<span class="cmd-line">${runnable ? `<button class="run-line" data-cmd="${esc(cmd)}" title="Run in terminal" aria-label="Run: ${esc(cmd)}">▶</button>` : `<span class="run-gap"></span>`}<span>${html || " "}</span></span>`;
      }).join("");
      pre.classList.add("runnable");
    });
    $$(":not(pre) > code", md).forEach((c) => {
      if (/^(terraform|ls|cat|echo|rm|export)\s/.test(c.textContent) || c.textContent === "ls")
        c.insertAdjacentHTML("afterend", `<button class="run-inline" data-cmd="${esc(c.textContent)}" title="Run in terminal" aria-label="Run: ${esc(c.textContent)}">▶</button>`);
    });
    md.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cmd]");
      if (!b) return;
      run(b.dataset.cmd); b.classList.add("ran");
    });
  }

  /* ---------------- lab checkpoints: ```question and ```check blocks in LAB.md ---------------- */
  function addCheckpoints(guide, l, server, onProgress) {
    const cps = l.labCheckpoints;
    if (!cps.length) return;
    const blocks = $$("pre > code.language-question, pre > code.language-check", guide);
    // the "> **Checkpoints:** ..." note is for GitHub readers; the progress card replaces it here
    $$("blockquote", guide).forEach((q) => /^\s*Checkpoints:/.test(q.textContent) && q.remove());
    const bar = document.createElement("div");
    bar.className = "card cp-progress";
    guide.querySelector("h1")?.after(bar);
    const drawBar = () => {
      const p = labProgress(l);
      bar.innerHTML = `<div class="row" style="justify-content:space-between"><b>Lab checkpoints</b><span class="muted">${p.done} / ${p.total}${p.done === p.total ? " · lab complete ✓" : ""}</span></div>
        <div class="bar ${p.done === p.total ? "ok" : ""}" style="margin-top:8px"><span style="width:${pct(p.done, p.total)}%"></span></div>
        <p class="muted" style="font-size:13px;margin:8px 0 0">Answer each question and run each check as you go. ${server ? "Checks inspect your lab sandbox." : "Start <code>scripts/lab-server.py</code> to verify checks automatically, or confirm them by hand."}</p>`;
    };
    const pass = (cp) => {
      const wasDone = lessonDone(l);
      (P.labChecks[l.id] ||= {})[cp.id] = true; store.save(); drawBar();
      if (labDone(l)) toast(`Lab ${l.num} complete ✓`);
      onProgress?.(wasDone); // may announce the unlocked lesson, which should win over the lab toast
    };
    blocks.forEach((code, i) => {
      const cp = cps[i];
      if (!cp) return;
      const el = document.createElement("div");
      el.className = `checkpoint card ${cp.kind}`;
      code.parentElement.replaceWith(el);
      (cp.kind === "question" ? questionWidget : checkWidget)(el, cp);
    });
    drawBar();

    function questionWidget(el, cp) {
      let sel = cpPassed(l, cp.id) ? [...cp.answer] : [], wrong = false;
      const draw = () => {
        const done = cpPassed(l, cp.id);
        el.classList.toggle("passed", done);
        el.innerHTML = `<div class="cp-head"><span class="cp-tag">Question</span>${done ? `<span class="pill ok">✓ Passed</span>` : ""}</div>
          <div class="question">${inline(cp.q)}${cp.multi ? ` <span class="pill accent">Select ${cp.answer.length}</span>` : ""}</div>
          <div class="opts">${cp.options.map((o) => `<button class="opt${cp.multi ? " multi" : ""}${done ? (cp.answer.includes(o.key) ? " correct" : "") : sel.includes(o.key) ? " sel" : ""}" data-k="${o.key}" ${done ? "disabled" : ""}><span class="key">${o.key}</span><span>${inline(o.text)}</span></button>`).join("")}</div>
          ${done ? `<div class="explain ok"><b>Correct.</b> ${inline(cp.explanation)}</div>`
            : `<div class="row"><button class="btn small primary" data-act="check" ${sel.length ? "" : "disabled"}>Check answer</button>${wrong ? `<span class="cp-wrong">Not quite. Look at what your terminal showed and try again.</span>` : ""}</div>`}`;
      };
      el.addEventListener("click", (e) => {
        const opt = e.target.closest(".opt");
        if (opt && !cpPassed(l, cp.id)) {
          const k = opt.dataset.k;
          sel = cp.multi ? (sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]) : [k];
          wrong = false; draw(); return;
        }
        if (e.target.closest("[data-act=check]")) {
          const right = sel.length === cp.answer.length && cp.answer.every((k) => sel.includes(k));
          if (right) { pass(cp); draw(); } else { wrong = true; sel = []; draw(); }
        }
      });
      draw();
    }

    function checkWidget(el, cp) {
      let state = "idle", output = "";
      const draw = () => {
        const done = cpPassed(l, cp.id);
        el.classList.toggle("passed", done);
        el.innerHTML = `<div class="cp-head"><span class="cp-tag">Check</span><b>${esc(cp.title)}</b>${done ? `<span class="pill ok">✓ Verified</span>` : ""}</div>
          ${done ? "" : `<p class="muted cp-hint">${inline(cp.hint)}</p>
          <div class="row">
            ${server ? `<button class="btn small primary" data-act="verify" ${state === "running" ? "disabled" : ""}>${state === "running" ? "Checking…" : "Check my work"}</button>` : ""}
            ${!server || cp.manual ? `<button class="btn small" data-act="manual">${server ? "Confirm by hand" : "I did this"}</button>` : ""}
            ${state === "fail" ? `<span class="cp-wrong">Not yet. Finish the step, then check again.</span>` : ""}
          </div>
          ${state === "fail" && output.trim() ? `<details class="cp-output"><summary>Check output</summary><pre>${esc(output)}</pre></details>` : ""}`}`;
      };
      el.addEventListener("click", async (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "manual") { pass(cp); draw(); }
        if (act === "verify") {
          state = "running"; draw();
          try {
            const r = await api(`/api/labs/${l.id}/checks/${encodeURIComponent(cp.id)}`, { method: "POST" });
            state = r.ok ? "idle" : "fail"; output = r.output || "";
            if (r.ok) pass(cp);
          } catch (err) { state = "fail"; output = err.message; }
          draw();
        }
      });
      draw();
    }
  }

  async function labTab(l, body, onProgress) {
    const guide = renderMd(l.lab || "_This lesson has no lab._", `${l.dir}/lab`);
    const s = await labSession();
    addCheckpoints(guide, l, !!s, onProgress);
    if (!s) {
      body.innerHTML = `<div class="card lab-hint"><b>Do this lab right here in the browser</b>
        <p class="muted">Start the local lab server from the repo root and open the address it prints. You get a real terminal and a file editor next to these instructions.</p>
        <div class="md"><pre><code class="language-bash">python3 scripts/lab-server.py</code></pre></div>
        <p class="muted" style="font-size:13px;margin:0">Needs Linux, macOS or WSL, plus Terraform on your PATH. Otherwise, follow the steps below in your own terminal.</p></div>`;
      $$("pre", body).forEach(addCopy);
      body.append(guide);
      return;
    }
    if (!$("#lessonBody") || body !== $("#lessonBody")) return; // navigated away meanwhile
    $(".lab-page")?.classList.add("workbench-page");
    body.innerHTML = `
      ${s.terraform ? "" : `<div class="card lab-hint warn">Terraform isn't on the lab server's PATH. <a href="https://developer.hashicorp.com/terraform/install" target="_blank" rel="noopener">Install it</a>, then restart <code>scripts/lab-server.py</code>.</div>`}
      <div class="workbench">
        <div class="wb-guide"></div>
        <section class="wb-panel" aria-label="Lab workspace">
          <div class="wb-bar">
            <div class="wb-tabs" role="tablist"></div>
            <button class="icon-btn" id="wbNewTerm" title="New terminal" aria-label="New terminal"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
            <span class="wb-sep"></span>
            <button class="wb-tab" id="wbFilesTab">Files</button>
            <button class="btn small" id="wbReset" title="Delete your copy of this lab and start over">Reset lab</button>
          </div>
          <div class="wb-body">
            <div class="wb-terms"></div>
            <div class="wb-files" hidden>
              <div class="wb-filelist"></div>
              <div class="wb-editor">
                <div class="wb-edbar"><span class="wb-path muted">Select a file</span><span class="wb-dirty" hidden>● unsaved</span>
                  <span style="margin-left:auto" class="row"><button class="btn small" id="wbReload">Reload</button><button class="btn small primary" id="wbSave" disabled>Save</button></span></div>
                <textarea spellcheck="false" autocapitalize="off" autocomplete="off" disabled placeholder="Pick a file on the left to edit it. Ctrl/⌘+S saves."></textarea>
              </div>
            </div>
          </div>
          <div class="wb-foot muted">Sandbox: <code>${esc(s.workspace)}/${esc(l.id)}</code> · ${esc(s.terraform || "terraform not found")}</div>
        </section>
      </div>`;
    $(".wb-guide", body).append(guide);
    const tabsEl = $(".wb-tabs", body), termsEl = $(".wb-terms", body), filesEl = $(".wb-files", body);
    const terms = []; let active = null; let view = "term";
    let disposed = false, teardown = null;
    cleanups.push(() => { disposed = true; teardown?.(); });
    const Xterm = loadXterm();

    function show(which, t) {
      view = which;
      termsEl.hidden = which !== "term"; filesEl.hidden = which !== "files";
      $("#wbFilesTab").classList.toggle("active", which === "files");
      if (t) active = t;
      terms.forEach((x) => { x.el.hidden = x !== active; x.tab.classList.toggle("active", which === "term" && x === active); });
      if (which === "term" && active) requestAnimationFrame(() => { active.fit(); active.xterm.focus(); });
      if (which === "files") refreshFiles();
    }

    async function attach(id, n) {
      await Xterm;
      if (disposed) return;
      const el = document.createElement("div"); el.className = "wb-term"; termsEl.append(el);
      const tab = document.createElement("button"); tab.className = "wb-tab"; tab.role = "tab";
      tab.innerHTML = `Terminal ${n} <span class="x" title="Close terminal" aria-label="Close terminal ${n}">×</span>`;
      tabsEl.append(tab);
      const xterm = new window.Terminal({ fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace', fontSize: 13, lineHeight: 1.2, cursorBlink: true, scrollback: 5000, theme: TERM_THEME });
      const fitAddon = new window.FitAddon.FitAddon(); xterm.loadAddon(fitAddon); xterm.open(el);
      let pending = "", inflight = false;
      const flush = async () => {
        if (inflight || !pending) return;
        inflight = true; const data = pending; pending = "";
        try { await api(`/api/terms/${id}/input`, { method: "POST", body: data }); } catch { /* terminal gone */ }
        inflight = false; flush();
      };
      const send = (d) => { pending += d; flush(); };
      xterm.onData(send);
      let lastSize = "";
      const fit = () => {
        if (el.hidden || !el.offsetWidth) return;
        try { fitAddon.fit(); } catch { return; }
        const size = `${xterm.cols}x${xterm.rows}`;
        if (size !== lastSize) { lastSize = size; api(`/api/terms/${id}/resize`, { method: "POST", body: JSON.stringify({ cols: xterm.cols, rows: xterm.rows }) }).catch(() => {}); }
      };
      const es = new EventSource(`/api/terms/${id}/stream?token=${encodeURIComponent(s.token)}&from=0`);
      es.onmessage = (e) => xterm.write(JSON.parse(e.data));
      es.addEventListener("exit", () => { es.close(); t.exited = true; xterm.write("\r\n\x1b[2m[shell exited — open a new terminal with +]\x1b[0m\r\n"); });
      const t = { id, el, tab, xterm, fit, send, es, exited: false };
      tab.onclick = (e) => {
        if (e.target.classList.contains("x")) { closeTerm(t); return; }
        show("term", t);
      };
      terms.push(t);
      show("term", t);
      return t;
    }
    async function newTerm() {
      try { const { id } = await api(`/api/labs/${l.id}/terms`, { method: "POST" }); return attach(id, terms.length ? Math.max(...terms.map((t) => +t.tab.textContent.match(/\d+/)[0])) + 1 : 1); }
      catch (e) { toast(e.message); }
    }
    function closeTerm(t) {
      api(`/api/terms/${t.id}/kill`, { method: "POST" }).catch(() => {});
      t.es.close(); t.xterm.dispose(); t.el.remove(); t.tab.remove();
      terms.splice(terms.indexOf(t), 1);
      if (active === t) active = terms[terms.length - 1] || null;
      if (!terms.length) newTerm(); else show("term", active);
    }
    async function run(cmd) {
      if (!active || active.exited) { await newTerm(); }
      show("term", active);
      active.send(cmd + "\r");
    }
    addRunButtons(guide, run);

    // reattach to shells still running on the server (survive navigation and reloads)
    try {
      const { terms: existing } = await api(`/api/labs/${l.id}/terms`);
      if (existing.length) for (const [i, x] of existing.entries()) await attach(x.id, i + 1);
      else await newTerm();
    } catch (e) { toast("Lab server: " + e.message); }
    $("#wbNewTerm").onclick = newTerm;
    $("#wbFilesTab").onclick = () => show("files");
    $("#wbReset").onclick = async () => {
      if (!confirm("Reset this lab? Your edits, state and outputs in the sandbox copy are deleted and the original lab files are restored. Open terminals are closed.")) return;
      await api(`/api/labs/${l.id}/reset`, { method: "POST" });
      terms.splice(0).forEach((t) => { t.es.close(); t.xterm.dispose(); t.el.remove(); t.tab.remove(); });
      active = null; editor.open = null; ta.value = ""; ta.disabled = true; $(".wb-path", body).textContent = "Select a file";
      await newTerm(); toast("Lab reset to its original files");
    };

    // ----- file editor
    const ta = $("textarea", filesEl);
    const editor = { open: null, mtime: null, dirty: false };
    const setDirty = (d) => { editor.dirty = d; $(".wb-dirty", body).hidden = !d; $("#wbSave").disabled = !d; };
    async function refreshFiles() {
      const { files } = await api(`/api/labs/${l.id}/files`);
      $(".wb-filelist", body).innerHTML = files.map((f) => `<a href="#" data-p="${esc(f.path)}" class="${f.path === editor.open ? "active" : ""}${/(^|\/)(output\/|terraform\.tfstate|\.terraform\.lock)/.test(f.path) ? " gen" : ""}">${esc(f.path)}</a>`).join("") || `<span class="muted">No files</span>`;
      $$(".wb-filelist a", body).forEach((a) => (a.onclick = (e) => { e.preventDefault(); openFile(a.dataset.p); }));
    }
    async function openFile(p) {
      if (editor.dirty && !(await save())) return;
      try {
        const f = await api(`/api/labs/${l.id}/file?path=${encodeURIComponent(p)}`);
        Object.assign(editor, { open: p, mtime: f.mtime }); ta.value = f.content; ta.disabled = false; setDirty(false);
        $(".wb-path", body).textContent = p;
        $$(".wb-filelist a", body).forEach((a) => a.classList.toggle("active", a.dataset.p === p));
      } catch (e) { toast(e.message); }
    }
    async function save(force = false) {
      if (!editor.open) return true;
      try {
        const r = await api(`/api/labs/${l.id}/file?path=${encodeURIComponent(editor.open)}`, { method: "PUT", body: JSON.stringify({ content: ta.value, mtime: editor.mtime, force }) });
        editor.mtime = r.mtime; setDirty(false); toast(`Saved ${editor.open}`); return true;
      } catch (e) {
        if (e.status === 409 && confirm(`${editor.open} was changed on disk (e.g. by terraform fmt). Overwrite it with your version?`)) return save(true);
        if (e.status !== 409) toast(e.message);
        return false;
      }
    }
    ta.addEventListener("input", () => setDirty(true));
    ta.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
      else if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end"); setDirty(true); }
    });
    $("#wbSave").onclick = () => save();
    $("#wbReload").onclick = async () => {
      if (editor.dirty && !confirm("Discard your unsaved changes?")) return;
      setDirty(false); await refreshFiles(); if (editor.open) openFile(editor.open);
    };

    const ro = new ResizeObserver(() => active && view === "term" && active.fit());
    ro.observe(termsEl);
    const beforeUnload = (e) => { if (editor.dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", beforeUnload);
    teardown = () => {
      if (editor.dirty) save();
      ro.disconnect(); window.removeEventListener("beforeunload", beforeUnload);
      terms.forEach((t) => { t.es.close(); t.xterm.dispose(); }); // shells keep running server-side
    };
    if (disposed) teardown();
  }

  /* ---------------- search ---------------- */
  let index;
  function buildIndex() {
    const chunks = (md, where, route) => {
      const out = []; let title = where, s = "", buf = [];
      const flush = () => { if (buf.length) out.push({ where, title, route: route + (s ? `?s=${s}` : ""), text: buf.join(" ") }); buf = []; };
      for (const line of md.split("\n")) {
        const h = line.match(/^#{1,3}\s+(.+)/);
        if (h) { flush(); title = h[1].replace(/`/g, ""); s = slug(marked.parseInline(h[1])); } else if (line.trim()) buf.push(line.replace(/[#*`|>]/g, " "));
      }
      flush(); return out;
    };
    index = [
      ...C.lessons.flatMap((l) => l.quiz.map((q) => ({ where: `Lesson ${l.num} quiz · Q${q.n}`, title: q.q.replace(/[`*]/g, ""), route: `#/lesson/${l.id}?s=review-quiz`, text: q.options.map((o) => o.text).join(" ").replace(/`/g, "") }))),
      ...C.lessons.flatMap((l) => [...chunks(l.md, `Lesson ${l.num}`, `#/lesson/${l.id}`), ...chunks(l.lab.replace(/^```(question|check)\n[\s\S]*?^```$/gm, ""), `Lab ${l.num}`, `#/lesson/${l.id}/lab`),
        ...l.labFiles.map((f) => ({ where: `Lab ${l.num} file`, title: f.path, route: `#/lesson/${l.id}/files/${f.path}`, text: f.content }))]),
      ...C.cheatsheets.flatMap((c) => chunks(c.md, "Cheatsheet", `#/cheatsheet/${c.id}`)),
      ...chunks(C.studyPlan, "Study plan", "#/plan"),
      ...chunks(C.readme, "About", "#/about"),
      ...C.flashcards.map((c) => ({ where: `Flashcard #${c.n}`, title: c.q.replace(/`/g, ""), route: "#/flashcards", text: `${c.q} — ${c.a}`.replace(/`/g, "") })),
      ...C.exams.flatMap((e) => e.questions.map((q) => ({ where: `${e.title} · Q${q.n}`, title: q.q.replace(/[`*]/g, "").slice(0, 120), route: `#/exam/${e.id}`, text: q.options.map((o) => o.text).join(" ").replace(/`/g, "") }))),
    ];
  }
  function pageSearch(term) {
    index || buildIndex();
    $("#searchInput").value = term;
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const hits = !words.length ? [] : index.map((d) => {
      const t = d.title.toLowerCase(), x = d.text.toLowerCase();
      if (!words.every((w) => t.includes(w) || x.includes(w))) return null;
      return { d, score: words.reduce((a, w) => a + (t.includes(w) ? 5 : 0) + Math.min(3, x.split(w).length - 1), 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 50);
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const snip = (text) => {
      const x = text.toLowerCase(); const p = Math.max(0, x.indexOf(words[0]) - 70);
      return (p ? "…" : "") + esc(text.slice(p, p + 220).replace(/\s+/g, " ")).replace(re, "<mark>$1</mark>") + "…";
    };
    main.innerHTML = `<div class="page"><p class="eyebrow">Search</p><h1 class="page-title">${hits.length} result${hits.length === 1 ? "" : "s"} for “${esc(term)}”</h1>
      <div style="margin-top:20px">${hits.map(({ d }) => `<a class="result" href="${d.route}"><div class="where">${esc(d.where)}</div><b>${esc(d.title).replace(re, "<mark>$1</mark>")}</b><div class="snip">${snip(d.text)}</div></a>`).join("") || `<div class="empty">No matches. Try a command like <code>state mv</code> or a keyword like <code>for_each</code>.</div>`}</div></div>`;
  }
  $("#searchForm").onsubmit = (e) => { e.preventDefault(); const v = $("#searchInput").value.trim(); if (v) location.hash = `#/search?q=${encodeURIComponent(v)}`; };

  function pageNotFound() {
    main.innerHTML = `<div class="page empty"><h1 class="page-title">Page not found</h1><p><a href="#/">Back to the dashboard</a></p></div>`;
  }

  /* ---------------- router ---------------- */
  let keyHandler = null;
  const cleanups = []; // run when leaving a page
  document.addEventListener("keydown", (ev) => {
    if (ev.target.closest("input,textarea,select")) return;
    if (ev.key === "/") { ev.preventDefault(); $("#searchInput").focus(); return; }
    // let a focused button handle its own Enter/Space activation
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.closest("button,a")) return;
    keyHandler && keyHandler(ev);
  });
  function render() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const q = Object.fromEntries(new URLSearchParams(qs || ""));
    const [, page, a, b, ...rest] = path.split("/");
    clearInterval(timerId); keyHandler = null;
    cleanups.splice(0).forEach((f) => f());
    closeMenu();
    if (page !== "search") $("#searchInput").value = "";
    renderSidebar(`#${path.match(/^\/(lesson\/[^/]+|exam\/[^/]+|cheatsheet\/[^/]+|[a-z]*)/)?.[0] || "/"}`);
    const titles = [];
    switch (page || "") {
      case "": pageDashboard(); break;
      case "lesson": pageLesson(a, b, rest.length ? rest.map(decodeURIComponent).join("/") : undefined, q); titles.push(C.lessons.find((l) => l.id === a)?.title); break;
      case "exam": pageExam(a, b); titles.push(C.exams.find((e) => e.id === a)?.title); break;
      case "flashcards": pageFlashcards(); titles.push("Flashcards"); break;
      case "cheatsheet": { const c = C.cheatsheets.find((x) => x.id === a); c ? pageDoc(c.md, "cheatsheets", q) : pageNotFound(); titles.push(c?.title); break; }
      case "objectives": pageDoc(C.objectives, "", q, { checklist: true }); titles.push("Exam objectives"); break;
      case "plan": pageDoc(C.studyPlan, "", q); titles.push("Study plan"); break;
      case "about": pageDoc(C.readme, "", q); titles.push("About the exam"); break;
      case "search": pageSearch(q.q || ""); titles.push("Search"); break;
      default: pageNotFound();
    }
    document.title = [...titles.filter(Boolean), "Terraform Associate Training"].join(" · ");
    if (!q.s && page !== "exam") window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener("hashchange", render);

  /* ---------------- mobile menu ---------------- */
  const sidebar = $("#sidebar"), scrim = $("#scrim"), menuBtn = $("#menuBtn");
  function closeMenu() { sidebar.classList.remove("open"); scrim.classList.remove("show"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.onclick = () => { const o = !sidebar.classList.contains("open"); sidebar.classList.toggle("open", o); scrim.classList.toggle("show", o); menuBtn.setAttribute("aria-expanded", String(o)); };
  scrim.onclick = closeMenu;

  render();
  // `lab-server.py --reset` starts a new progress epoch: clear what this browser saved before it.
  labSession().then((s) => {
    if (s?.progressEpoch && P.epoch !== s.progressEpoch) { resetProgress(s.progressEpoch); render(); }
  });
})();
