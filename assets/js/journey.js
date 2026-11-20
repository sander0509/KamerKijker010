/* Kamerkijker 010 — the phone "customer journey".
   The phone shows the customer's own screen: booking, the online check, the visit,
   the push notification and finally the report with the video tour and checklist.
   data-mode="auto"  : plays the whole journey in a loop (landing page).
   data-mode="scroll": a scene plays when the page asks for it (how-it-works page). */
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  class Cancelled extends Error {}

  function Journey(root) {
    const q = (s) => root.querySelector(s);
    const qa = (s) => Array.from(root.querySelectorAll(s));
    const mode = root.dataset.mode || "auto";
    const scenes = qa("[data-scene]");
    const stepBtns = qa("[data-go]");
    const titleEl = q("[data-title]");
    const stepNo = q("[data-stepno]");
    const screen = q(".screen");
    const tapEl = q("[data-tap]");
    const push = q("[data-push]");
    const video = q("video");
    const rscroll = q("[data-rscroll]");
    const checks = qa("[data-check] li");
    const checkCount = q("[data-check-count]");
    const vprog = q("[data-vprog]");
    const light = q("[data-light]");
    const lightText = q("[data-light-text]");
    let token = 0;
    let visible = true;
    let current = -1;

    /* ---------- helpers ---------- */
    const wait = (ms, t) => new Promise((res, rej) => {
      if (reduce) return t === token ? res() : rej(new Cancelled());
      let left = ms, last = performance.now();
      const iv = setInterval(() => {
        const now = performance.now();
        if (visible) left -= now - last;
        last = now;
        if (t !== token) { clearInterval(iv); rej(new Cancelled()); }
        else if (left <= 0) { clearInterval(iv); res(); }
      }, 40);
    });
    const tapAt = (el) => {
      if (!el || !tapEl || reduce) return;
      const s = screen.getBoundingClientRect(), r = el.getBoundingClientRect();
      tapEl.style.left = `${r.left - s.left + r.width / 2}px`;
      tapEl.style.top = `${r.top - s.top + r.height / 2}px`;
      tapEl.classList.remove("go"); void tapEl.offsetWidth; tapEl.classList.add("go");
    };
    const show = (name) => {
      scenes.forEach((sc) => {
        const on = sc.dataset.scene === name;
        if (sc.classList.contains("is-active") && !on) { sc.classList.add("is-leaving"); setTimeout(() => sc.classList.remove("is-leaving"), 600); }
        sc.classList.toggle("is-active", on);
        if (on && titleEl) titleEl.textContent = sc.dataset.title || "";
      });
    };
    const setStep = (i, dur) => {
      current = i;
      if (stepNo) stepNo.textContent = `${i + 1}/${stepBtns.length}`;
      stepBtns.forEach((b, k) => {
        b.classList.toggle("done", k < i);
        b.classList.remove("active");
        b.setAttribute("aria-selected", String(k === i));
        if (k === i) { b.style.setProperty("--dur", `${dur}ms`); void b.offsetWidth; b.classList.add("active"); }
      });
      root.dispatchEvent(new CustomEvent("journey:step", { detail: i }));
    };
    const smoothScroll = (el, to, ms, t) => new Promise((res, rej) => {
      if (reduce) { el.scrollTop = to; return res(); }
      const from = el.scrollTop, start = performance.now();
      const ease = (x) => 1 - Math.pow(1 - x, 3);
      const step = (now) => {
        if (t !== token) return rej(new Cancelled());
        const p = Math.min(1, (now - start) / ms);
        el.scrollTop = from + (to - from) * ease(p);
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });

    /* ---------- video + checklist sync ---------- */
    const syncChecks = () => {
      const t = video ? video.currentTime : 99;
      let n = 0;
      checks.forEach((li) => { const d = t >= +li.dataset.t; li.classList.toggle("done", d); if (d) n++; });
      if (checkCount) checkCount.textContent = `${n}/${checks.length}`;
      if (video && vprog && video.duration) vprog.style.transform = `scaleX(${Math.min(1, t / video.duration)})`;
    };
    const allChecksDone = () => { checks.forEach((li) => li.classList.add("done")); if (checkCount) checkCount.textContent = `${checks.length}/${checks.length}`; if (vprog) vprog.style.transform = "scaleX(1)"; };
    if (video) video.addEventListener("timeupdate", syncChecks);
    const playVideo = () => { if (!video) return; const p = video.play(); if (p && p.catch) p.catch(() => {}); };

    /* ---------- scenes ---------- */
    const S = {};
    S.book = async (t) => {
      setStep(0, 6200); show("book");
      const input = q("[data-type]"), pkg = q("[data-pkg-main]"), pay = q("[data-pay]"), paid = q("[data-paid]");
      const text = input.dataset.type;
      input.textContent = ""; pkg.classList.remove("sel"); pay.classList.remove("loading", "pressed"); paid.classList.remove("show");
      await wait(500, t);
      for (let i = 1; i <= text.length; i++) { input.textContent = text.slice(0, i); if (!reduce) await wait(38, t); }
      await wait(400, t); tapAt(pkg); pkg.classList.add("sel");
      await wait(800, t); tapAt(pay); pay.classList.add("pressed");
      await wait(200, t); pay.classList.add("loading");
      await wait(1100, t); paid.classList.add("show");
      await wait(1500, t);
    };
    S.online = async (t) => {
      setStep(1, 5600); show("online");
      const rows = qa("[data-scene=online] [data-row]"), banner = q("[data-scene=online] [data-banner]");
      rows.forEach((r) => r.classList.remove("scan", "done")); banner.classList.remove("show");
      await wait(500, t);
      for (const r of rows) { r.classList.add("scan"); await wait(650, t); r.classList.remove("scan"); r.classList.add("done"); await wait(150, t); }
      banner.classList.add("show");
      await wait(1700, t);
    };
    S.visit = async (t) => {
      setStep(2, 6800); show("visit");
      const items = qa("[data-scene=visit] [data-v]"), map = q("[data-scene=visit] .s-map");
      items.forEach((v) => v.classList.remove("show")); map.classList.remove("go"); push.classList.remove("show");
      await wait(300, t); map.classList.add("go");
      for (const v of items) { await wait(900, t); v.classList.add("show"); }
      await wait(900, t); push.classList.add("show");
      await wait(1500, t); tapAt(push);
      await wait(450, t); push.classList.remove("show");
    };
    S.report = async (t) => {
      setStep(3, video && video.duration ? Math.round(video.duration * 1000) + 400 : 21600); show("report");
      if (rscroll) rscroll.scrollTop = 0;
      if (light) light.classList.remove("show");
      if (reduce || !video) { allChecksDone(); return; }
      video.currentTime = 0; syncChecks(); playVideo();
      const startedAt = performance.now();
      while (true) {
        await wait(150, t);
        if (video.ended || (video.duration && video.currentTime >= video.duration - .15)) break;
        if (video.paused && visible) playVideo();
        if (video.readyState < 2 && performance.now() - startedAt > 6000) { allChecksDone(); await wait(2000, t); break; }
      }
      allChecksDone();
      await wait(600, t);
    };
    S.decide = async (t) => {
      setStep(4, 7000); show("report");
      allChecksDone();
      if (rscroll) {
        const advice = q("[data-advice]");
        const to = advice ? advice.offsetTop - 10 : rscroll.scrollHeight;
        await wait(200, t);
        await smoothScroll(rscroll, Math.min(to, rscroll.scrollHeight - rscroll.clientHeight), 2600, t);
      }
      if (light) light.classList.add("show");
      if (lightText) lightText.classList.add("show");
      await wait(4200, t);
    };
    const order = ["book", "online", "visit", "report", "decide"];

    const run = async (from, loop) => {
      const t = ++token;
      try {
        let i = from;
        while (true) {
          await S[order[i]](t);
          i++;
          if (i >= order.length) { if (!loop) return; i = 0; }
          if (!loop && i > from) return;
        }
      } catch (e) { if (!(e instanceof Cancelled)) throw e; }
    };

    const api = {
      goTo(i, loop = mode === "auto") { if (i === current && mode === "scroll") return; if (video && order[i] !== "report") video.pause(); run(i, loop); },
      get current() { return current; }
    };
    stepBtns.forEach((b) => b.addEventListener("click", () => api.goTo(+b.dataset.go)));

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        visible = e.isIntersecting;
        root.classList.toggle("is-paused", !visible);
        if (!video) return;
        if (!visible) video.pause();
        else if (order[current] === "report" && !video.ended) playVideo();
      }), { threshold: .25 }).observe(root);
    }

    if (reduce) { api.goTo(4, false); }
    else if (mode === "auto") api.goTo(0, true);
    else api.goTo(0, false);
    root.journey = api;
    return api;
  }

  document.querySelectorAll("[data-journey]").forEach((el) => Journey(el));
})();
