/* Kamerkijker 010 — site interactions (all pages)
   GSAP + ScrollTrigger for scroll choreography, Lenis for smooth scroll,
   cross-document View Transitions between pages (CSS), View Transitions API for the theme switch.
   Every block checks that its elements exist, so one script serves every page. */
(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  const lang = doc.lang || "en";
  const T = (en, nl) => (lang === "nl" ? nl : en);
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const tick = '<svg aria-hidden="true"><use href="#i-check"/></svg>';
  const rootPath = (() => { const s = $('script[src$="assets/js/main.js"]'); return s ? s.getAttribute("src").replace("assets/js/main.js", "") : ""; })();

  /* ---------- Theme (circle reveal) ---------- */
  const themeBtn = $("#theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", (e) => {
    const isDark = doc.dataset.theme ? doc.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    const apply = () => { doc.dataset.theme = next; try { localStorage.setItem("kk-theme", next); } catch (er) { /* ignore */ } };
    if (!document.startViewTransition || reduce) return apply();
    const x = e.clientX || innerWidth - 60, y = e.clientY || 36;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc.classList.add("theme-vt");
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => doc.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 650, easing: "cubic-bezier(.2,.7,.1,1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
    vt.finished.finally(() => doc.classList.remove("theme-vt"));
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $("#menu-btn"), links = $("#nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", () => { const open = links.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", String(open)); });
    links.addEventListener("click", (e) => { if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); } });
  }

  /* ---------- Header state + progress fallback ---------- */
  const header = $(".site-header"), progress = $(".progress");
  const cssTimeline = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (progress && !cssTimeline) { const max = doc.scrollHeight - innerHeight; progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`; }
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) { lenis.on("scroll", ScrollTrigger.update); gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
  }
  const scrollToEl = (el) => { if (lenis) lenis.scrollTo(el, { offset: -90, duration: 1.3 }); else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); };
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2) return;
    const target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault(); scrollToEl(target);
  });
  if (location.hash.length > 1) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => scrollToEl(t), 300); }

  /* ---------- Magnetic buttons + phone tilt ---------- */
  if (finePointer && !reduce) {
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => { const r = b.getBoundingClientRect(); b.style.setProperty("--bx", `${(e.clientX - r.left - r.width / 2) * .18}px`); b.style.setProperty("--by", `${(e.clientY - r.top - r.height / 2) * .25}px`); });
      b.addEventListener("pointerleave", () => { b.style.setProperty("--bx", "0px"); b.style.setProperty("--by", "0px"); });
    });
    $$("[data-tilt]").forEach((phone) => {
      let tx = 0, ty = 0, cx = 0, cy = 0;
      addEventListener("pointermove", (e) => {
        const r = phone.getBoundingClientRect();
        tx = ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 16;
        ty = -((e.clientY - (r.top + r.height / 2)) / innerHeight) * 12;
      });
      const loop = () => { cx += (tx - cx) * .06; cy += (ty - cy) * .06; phone.style.transform = `rotateY(${cx}deg) rotateX(${cy}deg)`; requestAnimationFrame(loop); };
      loop();
    });
  }

  /* ---------- Hero "paste your ad" form ---------- */
  const heroForm = $("#ad-form");
  if (heroForm) heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let v = $("#hero-ad").value.trim();
    if (v && !/^https?:\/\//i.test(v)) v = "https://" + v;
    store.set("kk-ad", v); store.set("kk-pkg", "room");
    location.href = `${rootPath}book.html?pkg=room${v ? `&ad=${encodeURIComponent(v)}` : ""}`;
  });

  /* ---------- Sticky CTA (mobile) ---------- */
  const sticky = $("#sticky-cta");
  if (sticky && "IntersectionObserver" in window) {
    if ($("#book-form")) sticky.remove();
    else {
      const vis = new Map();
      const watch = $$(".hero, .page-hero, .site-footer, .cta-band");
      const io = new IntersectionObserver((es) => { es.forEach((e) => vis.set(e.target, e.isIntersecting)); sticky.classList.toggle("show", ![...vis.values()].some(Boolean)); });
      watch.forEach((el) => { vis.set(el, true); io.observe(el); });
    }
  }

  /* ---------- Data ---------- */
  const CHECKS = {
    online: ["Do the photos also appear elsewhere (reverse image search)?", "Is the rent far below the market (too good to be true)?", "Does the ad text appear on several sites or in several cities?", "Does the owner in the Kadaster match the landlord (or is there a mandate)?", "Is the IBAN Dutch or foreign?", "Does the landlord use Western Union, MoneyGram, crypto or PayPal Friends?", "Does the landlord ask for money before a viewing or before the contract?", "Is the address on our scam radar?", "Does the address exist (Google Street View and BAG)?", "Can the landlord be reached in a normal way (phone, real name)?"],
    site: ["Does the room exist, and does it match the photos?", "Does the landlord or their representative have a key and access?", "Are condition and safety OK (smoke detector, mould, windows, lock)?", "Is the size roughly what the ad says?", "What do the entrance, stairwell and street look like?", "Which facilities are there (kitchen, bathroom, wifi, washing machine)?", "How many housemates are there (never filmed without permission)?"],
    contract: ["Is the deposit higher than 2 months’ basic rent?", "Does the contract contain unusual costs or clauses?", "Does the points system suggest the rent is too high? Then we refer you to the Huurcommissie."]
  };
  const FLAGS = [
    { b: "The landlord is abroad", s: "and will “send the key by post”.", w: 3 },
    { b: "No viewing possible", s: "but they want a deposit to “reserve” the room.", w: 3 },
    { b: "Western Union, MoneyGram, crypto", s: "or a foreign bank account.", w: 3 },
    { b: "The price is far below", s: "comparable rooms in Rotterdam.", w: 2 },
    { b: "The same photos", s: "appear in ads in other cities.", w: 3 },
    { b: "Pressure", s: "“Many people want this room, pay today.”", w: 2 },
    { b: "They ask for your passport", s: "or ID before you’ve seen the room.", w: 2 },
    { b: "The contract looks unprofessional", s: "or the name differs from the owner.", w: 2 },
    { b: "Deposit above 2 months’ rent", s: "of basic rent.", w: 1 },
    { b: "The chat moves off-platform", s: "quickly, to WhatsApp or private email.", w: 1 }
  ];
  const RADAR = [
    { area: "Kralingen", text: "Photos also used in an ad in Utrecht. Landlord “abroad”, asks for the deposit via Western Union.", pattern: "Western Union · reused photos", date: "12-11-2026", status: "confirmed", x: .68, y: .36 },
    { area: "Centrum · Cool", text: "Room at €450 all-in, far below market. Key “sent by post” after the first payment.", pattern: "Key by post · too cheap", date: "05-11-2026", status: "confirmed", x: .47, y: .45 },
    { area: "Delfshaven", text: "Asks for a passport copy before any viewing. Moves the chat to WhatsApp right away.", pattern: "Passport first · off-platform", date: "29-10-2026", status: "reported", x: .3, y: .5 },
    { area: "Kop van Zuid", text: "Same ad text found for rooms in Rotterdam, Amsterdam and Groningen.", pattern: "Copied ad text", date: "21-10-2026", status: "reported", x: .55, y: .64 },
    { area: "Blijdorp", text: "Landlord asks to pay the deposit in crypto “for your safety”.", pattern: "Crypto payment", date: "14-10-2026", status: "confirmed", x: .42, y: .26 },
    { area: "Schiedam", text: "Reported as fake. Our check found the owner and the room were real.", pattern: "Report checked", date: "02-10-2026", status: "resolved", x: .16, y: .58 }
  ];
  const FAQ = {
    check: [T("What exactly do you check?", "Wat checken jullie precies?"), T("We check the ad, the photos, the official owner in the Dutch Land Registry (Kadaster), the bank account country and our scam radar. With a Room Check, one of us visits the room and films it for you. See our 20-point checklist.", "We checken de advertentie, de foto’s, de officiële eigenaar in het Kadaster, het land van de bankrekening en onze scam-radar. Bij een Kamercheck gaat een van ons langs en filmt de kamer voor u.")],
    video: [T("Do I watch along live?", "Kijk ik live mee?"), T("No. We film the room, the entrance and the street during the visit and you get the video in your report, together with photos, the checklist and our advice. That way you can watch it as often as you like, together with your parents.", "Nee. We filmen de kamer, de entree en de straat tijdens het bezoek en u krijgt de video in uw rapport, samen met foto’s, de checklist en ons advies. Zo kunt u hem zo vaak bekijken als u wilt.")],
    speed: [T("How fast is it?", "Hoe snel is het?"), T("Online Check: within 24 hours. Room Check: within 48 hours, if the landlord agrees to a viewing. If the landlord refuses a viewing, that’s already a red flag, and we’ll tell you.", "Online Check: binnen 24 uur. Kamercheck: binnen 48 uur, als de verhuurder een bezichtiging toestaat. Weigert de verhuurder? Dan is dat al een rode vlag.")],
    guarantee: [T("Do you guarantee that the room is safe?", "Garanderen jullie dat de kamer veilig is?"), T("No. Nobody can guarantee that. We check carefully against a fixed checklist and tell you what we found and what we couldn’t verify. You make the final decision.", "Nee. Niemand kan dat garanderen. We checken zorgvuldig volgens een vaste checklist en vertellen wat we zagen en wat we niet konden controleren. U beslist zelf.")],
    agent: [T("Are you a rental agent?", "Zijn jullie een makelaar?"), T("No. We don’t rent out rooms, we don’t connect you with landlords and we never take money from landlords. We only work for you.", "Nee. We verhuren geen kamers, brengen u niet in contact met verhuurders en nemen nooit geld aan van verhuurders.")],
    parents: [T("Who pays: me or my parents?", "Wie betaalt: ik of mijn ouders?"), T("Whoever books. Many parents book a check for their child. You’ll both get the report.", "Wie boekt, betaalt. Veel ouders boeken een check voor hun kind. U krijgt allebei het rapport.")],
    refund: [T("What if the landlord doesn’t let you in?", "Wat als de verhuurder jullie niet binnenlaat?"), T("Then you get a refund of the difference between the Room Check and the Online Check, plus our advice not to pay. Red flag in the online check? Then you don’t pay for the visit at all.", "Dan krijgt u het verschil tussen de Kamercheck en de Online Check terug, plus ons advies om niet te betalen. Rode vlag bij de online check? Dan betaalt u niet voor het bezoek.")],
    payment: [T("How do I pay?", "Hoe betaal ik?"), T("Online when you book: iDEAL, credit card, Apple Pay or Google Pay. All prices include VAT. No subscriptions.", "Online bij het boeken: iDEAL, creditcard, Apple Pay of Google Pay. Alle prijzen zijn inclusief btw.")],
    area: [T("Can you check rooms outside Rotterdam?", "Checken jullie ook buiten Rotterdam?"), T("We cover Rotterdam and nearby areas such as Schiedam, Capelle and Delft. Ask us for other places.", "We werken in Rotterdam en omgeving, zoals Schiedam, Capelle en Delft.")],
    rent: [T("Do you check the rent price?", "Checken jullie de huurprijs?"), T("With Room Check Plus we give an indication based on the Dutch points system. For an official ruling you can go to the Huurcommissie (the Dutch rent tribunal).", "Bij Kamercheck Plus geven we een indicatie op basis van het puntenstelsel. Voor een officiële uitspraak kunt u naar de Huurcommissie.")],
    data: [T("What happens with my data?", "Wat gebeurt er met mijn gegevens?"), T("We only use your data for this check and delete it after 6 months. See our privacy statement.", "We gebruiken uw gegevens alleen voor deze check en verwijderen ze na 6 maanden.")],
    scammed: [T("I think I’ve already been scammed. What now?", "Ik denk dat ik al opgelicht ben. Wat nu?"), T("Report it to the police and to the Fraudehelpdesk, and contact your bank right away. You can also report it on our scam radar. For legal help, contact Juridisch Loket or the LSVb Housing Hotline.", "Doe aangifte, meld het bij de Fraudehelpdesk en bel direct uw bank. Voor juridische hulp: het Juridisch Loket of de LSVb.")],
    real: [T("Is this a real company?", "Is dit een echt bedrijf?"), T("Yes. We’re a registered student company in Rotterdam. Our KVK number is in the footer.", "Ja. We zijn een geregistreerd studentenbedrijf in Rotterdam. Ons KVK-nummer staat onderaan de pagina.")]
  };
  const PKGS = {
    online: { name: "Online Check", price: 19, time: "within 24 hours" },
    room: { name: "Room Check", price: 59, time: "within 48 hours" },
    plus: { name: "Room Check Plus", price: 89, time: "within 48 hours" },
    bundle: { name: "3-Room Bundle", price: 149, time: "within 5 days" }
  };

  /* ---------- FAQ (rendered per page from data-faq ids) ---------- */
  $$("[data-faq]").forEach((list, li) => {
    const ids = list.dataset.faq.split(",").filter((id) => FAQ[id]);
    list.innerHTML = ids.map((id, i) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="${li === 0 && i === 0}" aria-controls="faq-${li}-${i}" id="faq-q-${li}-${i}">${FAQ[id][0]}<span class="pm" aria-hidden="true"></span></button><div class="faq-a" id="faq-${li}-${i}" role="region" aria-labelledby="faq-q-${li}-${i}"><div><p>${FAQ[id][1]}</p></div></div></div>`).join("");
    list.addEventListener("click", (e) => {
      const q = e.target.closest(".faq-q"); if (!q) return;
      q.setAttribute("aria-expanded", String(q.getAttribute("aria-expanded") !== "true"));
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 520);
    });
  });

  /* ---------- Checklist ---------- */
  const list = $("#check-list");
  if (list) {
    const ticked = new Set(), ringFg = $("#ring-fg"), ringNum = $("#ring-num");
    const render = (tab) => {
      const start = tab === "online" ? 0 : tab === "site" ? 10 : 17;
      list.innerHTML = CHECKS[tab].map((q, i) => { const n = start + i + 1; return `<li><button type="button" class="check-item" data-n="${n}" aria-pressed="${ticked.has(n)}"><span class="no">${String(n).padStart(2, "0")}</span><span>${q}</span><span class="box">${tick}</span></button></li>`; }).join("");
      if (hasGSAP && !reduce) gsap.from(list.children, { y: 14, opacity: 0, duration: .5, stagger: .04, ease: "power3.out" });
    };
    render("online");
    list.addEventListener("click", (e) => {
      const b = e.target.closest(".check-item"); if (!b) return;
      const n = +b.dataset.n; ticked.has(n) ? ticked.delete(n) : ticked.add(n);
      b.setAttribute("aria-pressed", String(ticked.has(n)));
      ringFg.style.strokeDashoffset = String(326.7 - (ticked.size / 20) * 326.7); ringNum.textContent = String(ticked.size);
    });
    $$("[data-tab]").forEach((t) => t.addEventListener("click", () => { $$("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === t))); render(t.dataset.tab); }));
  }

  /* ---------- Red flag scanner + guide cards ---------- */
  const flagsEl = $("#flags");
  if (flagsEl) {
    flagsEl.innerHTML = FLAGS.map((f, i) => `<button type="button" class="flag-btn" aria-pressed="false" data-i="${i}"><span class="fi"><svg aria-hidden="true"><use href="#i-x"/></svg></span><span><b>${f.b}</b><span>${f.s}</span></span></button>`).join("");
    const needle = $("#needle"), badge = $("#v-badge"), title = $("#v-title"), text = $("#v-text"), on = new Set();
    const update = () => {
      const score = [...on].reduce((a, i) => a + FLAGS[i].w, 0);
      needle.style.transform = `rotate(${-80 + Math.min(score / 8, 1) * 160}deg)`;
      let k = "g", b = "Green", h, p;
      if (!on.size) { h = "No red flags ticked yet"; p = "Tick the flags you see. Even with zero flags, a fake ad can look perfect. That is why we go and look."; }
      else if (score < 3) { k = "o"; b = "Orange"; h = "Be careful"; p = "Something is off. Don’t pay anything until someone has seen the room and the owner is checked."; }
      else { k = "r"; b = "Red"; h = "Don’t pay yet"; p = `You ticked ${on.size} red flag${on.size > 1 ? "s" : ""} that scammers often use. Don’t send money. Let us check the ad and the owner first.`; }
      badge.className = `badge ${k}`; badge.textContent = b; title.textContent = h; text.textContent = p;
    };
    flagsEl.addEventListener("click", (e) => { const btn = e.target.closest(".flag-btn"); if (!btn) return; const i = +btn.dataset.i; on.has(i) ? on.delete(i) : on.add(i); btn.setAttribute("aria-pressed", String(on.has(i))); update(); });
  }
  const cards = $("#flag-cards");
  if (cards) cards.innerHTML = FLAGS.map((f, i) => `<article class="flag-card"><span class="fn">Red flag ${String(i + 1).padStart(2, "0")}</span><p><b>${f.b}</b> ${f.s}</p></article>`).join("");

  /* ---------- Pricing audience switch + spotlight ---------- */
  $$("[data-aud]").forEach((t) => t.addEventListener("click", () => {
    $$("[data-aud]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    const s = $("#plans-students"), o = $("#plans-orgs");
    s.hidden = t.dataset.aud !== "students"; o.hidden = t.dataset.aud !== "orgs";
    if (hasGSAP && !reduce) gsap.from((s.hidden ? o : s).children, { y: 30, opacity: 0, duration: .6, stagger: .07, ease: "power3.out" });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));
  $$(".plan").forEach((p) => p.addEventListener("pointermove", (e) => { const r = p.getBoundingClientRect(); p.style.setProperty("--mx", `${e.clientX - r.left}px`); p.style.setProperty("--my", `${e.clientY - r.top}px`); }));

  /* ---------- Scam radar ---------- */
  const radarList = $("#radar-list"), radarQ = $("#radar-q");
  let radarFilter = "all", radarMatches = RADAR.map(() => true);
  const statusLabel = { confirmed: "Confirmed by a check", reported: "Reported", resolved: "Resolved or incorrect" };
  const renderRadar = () => {
    const q = (radarQ.value || "").trim().toLowerCase();
    radarMatches = RADAR.map((r) => (radarFilter === "all" || r.status === radarFilter) && (!q || `${r.area} ${r.text} ${r.pattern}`.toLowerCase().includes(q)));
    const items = RADAR.filter((_, i) => radarMatches[i]);
    radarList.innerHTML = items.length ? items.map((r) => `<li class="radar-item"><h4>${r.area}</h4><span class="status ${r.status}">${statusLabel[r.status]}</span><p>${r.text}</p><div class="meta"><span>Pattern: ${r.pattern}</span><span>${r.date}</span><span>Example</span></div></li>`).join("")
      : `<li class="radar-empty">Nothing on the radar for this search. That doesn’t mean the ad is safe. New scams appear every week.</li>`;
  };
  if (radarList) {
    renderRadar(); radarQ.addEventListener("input", renderRadar);
    $$("[data-status]").forEach((c) => c.addEventListener("click", () => { radarFilter = c.dataset.status; $$("[data-status]").forEach((x) => x.setAttribute("aria-pressed", String(x === c))); renderRadar(); }));
  }
  const rc = $("#radar-canvas");
  if (rc) {
    const ctx = rc.getContext("2d");
    let S = 0, dpr = 1;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); S = rc.clientWidth; rc.width = S * dpr; rc.height = S * dpr; };
    size(); addEventListener("resize", size);
    const col = { confirmed: "255,138,127", reported: "240,183,82", resolved: "89,215,156" };
    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
      const c = S / 2, a = reduce ? 1.2 : (now / 2200) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(165,172,219,.18)"; ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(c, c, (S / 2) * r / 4.2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, S); ctx.moveTo(0, c); ctx.lineTo(S, c); ctx.stroke();
      ctx.strokeStyle = "rgba(58,77,255,.45)"; ctx.lineWidth = S * .035; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, S * .62); ctx.bezierCurveTo(S * .3, S * .52, S * .45, S * .62, S * .6, S * .56); ctx.bezierCurveTo(S * .75, S * .5, S * .85, S * .6, S, S * .55); ctx.stroke();
      ctx.fillStyle = "rgba(165,172,219,.6)"; ctx.font = `500 ${Math.max(9, S * .03)}px ui-monospace, monospace`; ctx.fillText("MAAS", S * .78, S * .63);
      if (ctx.createConicGradient) { const g = ctx.createConicGradient(a - .9, c, c); g.addColorStop(0, "rgba(255,212,59,0)"); g.addColorStop(.14, "rgba(255,212,59,.25)"); g.addColorStop(.145, "rgba(255,212,59,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, S / 2, 0, Math.PI * 2); ctx.fill(); }
      RADAR.forEach((r, i) => {
        const x = r.x * S, y = r.y * S;
        let ang = Math.atan2(y - c, x - c); if (ang < 0) ang += Math.PI * 2;
        let d = a - ang; if (d < 0) d += Math.PI * 2;
        const glow = Math.max(0, 1 - d / 3.5), m = radarMatches[i];
        ctx.fillStyle = `rgba(${col[r.status]},${m ? .35 + glow * .65 : .08})`;
        ctx.beginPath(); ctx.arc(x, y, S * .014 + glow * S * .01, 0, Math.PI * 2); ctx.fill();
        if (m) {
          ctx.strokeStyle = `rgba(${col[r.status]},${glow * .6})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, S * .02 + (1 - glow) * S * .05, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(238,240,255,${.45 + glow * .5})`; ctx.font = `500 ${Math.max(9, S * .028)}px ui-monospace, monospace`; ctx.fillText(r.area.split(" ")[0].toUpperCase(), x + S * .03, y + 4);
        }
      });
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce && radarQ) radarQ.addEventListener("input", () => requestAnimationFrame(draw));
  }

  /* ---------- Booking (prefilled from ?pkg= and ?ad=) ---------- */
  const form = $("#book-form");
  if (form) {
    const params = new URLSearchParams(location.search);
    const pre = { pkg: params.get("pkg") || store.get("kk-pkg"), ad: params.get("ad") || store.get("kk-ad") };
    const fs = $$("fieldset", form), stepsLi = $$("#book-steps li"), prev = $("#prev"), next = $("#next");
    const nextLabel = next.innerHTML;
    let stepN = 1;
    const updateSummary = () => {
      const sel = form.querySelector('input[name="pkg"]:checked'); if (!sel) return;
      const p = PKGS[sel.value];
      $("#sum-pkg").textContent = p.name; $("#sum-time").textContent = p.time; $("#sum-total").textContent = `€${p.price}`;
    };
    form.addEventListener("change", updateSummary);
    const show = (n) => {
      stepN = n;
      fs.forEach((f) => (f.hidden = +f.dataset.step !== n));
      stepsLi.forEach((li, i) => { li.classList.toggle("active", i + 1 === n); li.classList.toggle("done", i + 1 < n); });
      prev.hidden = n === 1;
      next.innerHTML = n === 4 ? `Pay ${$("#sum-total").textContent} <svg class="arrow" aria-hidden="true"><use href="#i-arrow"/></svg>` : nextLabel;
      if (hasGSAP && !reduce) gsap.from(fs[n - 1], { x: 24, opacity: 0, duration: .45, ease: "power3.out" });
      if (n === 4) {
        const v = (id) => ($(id).value || "–");
        const rows = [["Package", `${$("#sum-pkg").textContent} · ${$("#sum-total").textContent}`], ["Ad", v("#ad-url")], ["Address", v("#address")], ["Landlord", `${v("#ll-name")} · ${v("#ll-phone")}`], ["You", `${v("#c-name")} · ${v("#c-email")}`]];
        $("#review").innerHTML = rows.map(([k]) => `<div><dt>${k}</dt><dd></dd></div>`).join("");
        $$("#review dd").forEach((dd, i) => (dd.textContent = rows[i][1]));
      }
    };
    const validate = (n) => {
      const err = $(`#err-${n}`);
      const bad = (msg, el) => { if (err) err.textContent = msg; if (el) el.focus(); return false; };
      if (err) err.textContent = "";
      if (n === 2) {
        const ad = $("#ad-url"), addr = $("#address");
        if (!/^https?:\/\/\S+\.\S+/.test(ad.value.trim())) return bad("Paste the full link to the ad, starting with https://", ad);
        if (addr.value.trim().length < 5) return bad("Add the address of the room so we can plan the visit.", addr);
      }
      if (n === 3) {
        if (!$("#c-name").value.trim()) return bad("Add your name so we know who the report is for.", $("#c-name"));
        if (!/^\S+@\S+\.\S+$/.test($("#c-email").value.trim())) return bad("Add a valid email address. We send the report there.", $("#c-email"));
      }
      if (n === 4 && !$("#agree").checked) return bad("Tick the box to confirm you want us to start right away.", $("#agree"));
      return true;
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(stepN)) return;
      if (stepN < 4) return show(stepN + 1);
      fs.forEach((f) => (f.hidden = true)); $("#form-nav").hidden = true;
      stepsLi.forEach((li) => { li.classList.remove("active"); li.classList.add("done"); });
      const ok = $("#book-success"); ok.hidden = false;
      if (hasGSAP && !reduce) gsap.from(ok.children, { y: 20, opacity: 0, stagger: .08, duration: .6, ease: "back.out(1.6)" });
    });
    prev.addEventListener("click", () => show(stepN - 1));
    $("#book-again").addEventListener("click", () => { form.reset(); $("#book-success").hidden = true; $("#form-nav").hidden = false; updateSummary(); show(1); });
    if (pre.pkg && PKGS[pre.pkg]) { const r = $(`#pkg-${pre.pkg}`); if (r) r.checked = true; }
    updateSummary();
    if (pre.ad) { $("#ad-url").value = pre.ad; show(2); setTimeout(() => $("#address").focus({ preventScroll: true }), 500); }
  }

  /* ---------- Simple forms (contact, report a scam, universities) ---------- */
  $$("[data-simple-form]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = $(".err", f), bad = $$("[required]", f).find((el) => !el.value.trim() || (el.type === "email" && !/^\S+@\S+\.\S+$/.test(el.value.trim())));
    if (bad) { err.textContent = `Please fill in “${(f.querySelector(`label[for="${bad.id}"]`) || {}).textContent || "this field"}”.`; bad.focus(); return; }
    err.textContent = ""; $("button[type=submit]", f).hidden = true; $(".form-ok", f).hidden = false;
  }));

  /* ---------- Copy email ---------- */
  const copyBtn = $("#copy-mail");
  if (copyBtn) copyBtn.addEventListener("click", () => {
    const done = () => { copyBtn.textContent = "Copied"; setTimeout(() => (copyBtn.textContent = "Copy address"), 1800); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($("#mail-addr")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText($("#mail-addr").textContent).then(done, fallback); } catch (e) { fallback(); }
  });

  /* ---------- How-it-works: scrolling text drives the phone ---------- */
  const storySteps = $$("[data-story]");
  const storyPhone = $(".story-phone [data-journey]");
  if (storySteps.length && storyPhone && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      storySteps.forEach((s) => s.classList.toggle("is-current", s === e.target));
      if (storyPhone.journey) storyPhone.journey.goTo(+e.target.dataset.story, false);
    }), { rootMargin: "-45% 0px -45% 0px" });
    storySteps.forEach((s) => io.observe(s));
    storySteps[0].classList.add("is-current");
  }

  /* ---------- GSAP choreography ---------- */
  if (!hasGSAP || reduce) return;
  gsap.registerPlugin(ScrollTrigger);

  // Landing hero: one orchestrated entrance
  if ($(".hero h1")) {
    gsap.timeline({ defaults: { ease: "expo.out" } })
      .from(".hero h1 .line > span", { yPercent: 115, rotate: 4, duration: 1.3, stagger: .1 })
      .from("[data-hero]", { y: 28, opacity: 0, duration: 1, stagger: .08 }, .25)
      .from(".hero .journey .phone", { rotateY: -28, rotateX: 12, y: 80, scale: .92, duration: 1.8 }, .2)
      .from(".hero .journey-steps li", { y: 12, opacity: 0, stagger: .06, duration: .6 }, 1);
    // phone drifts as you scroll past the hero
    gsap.to("[data-hero-phone]", { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }
  // Sub-page hero entrance
  if ($(".page-hero")) gsap.from(".page-hero .crumbs, .page-hero .eyebrow, .page-hero .lede, .page-hero .hero-cta, .page-hero .contact-row", { y: 24, opacity: 0, duration: 1, stagger: .08, ease: "expo.out", delay: .1 });

  // Split headings into words that rise in (keeps highlighted words)
  $$("[data-split]").forEach((h) => {
    h.setAttribute("aria-label", h.textContent.trim().replace(/\s+/g, " "));
    const wrap = (w, cls) => `<span style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.1em"><span style="display:inline-block"${cls ? ` class="${cls}"` : ""} aria-hidden="true">${w}</span></span>`;
    const out = [];
    h.childNodes.forEach((n) => (n.textContent || "").trim().split(/\s+/).filter(Boolean).forEach((w) => out.push(wrap(w, n.nodeType === 1 ? n.className : ""))));
    h.innerHTML = out.join(" ");
    const inHero = h.closest(".page-hero");
    gsap.from(h.querySelectorAll("span > span"), { yPercent: 110, rotate: 3, duration: 1.1, stagger: .05, ease: "expo.out", delay: inHero ? .15 : 0, scrollTrigger: inHero ? undefined : { trigger: h, start: "top 86%", once: true } });
  });

  // Generic reveals
  const reveal = (sel, opts = {}) => $$(sel).forEach((group) => gsap.from(group.children, Object.assign({ y: 46, opacity: 0, duration: .95, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: group, start: "top 86%", once: true } }, opts)));
  reveal(".loss"); reveal(".stats"); reveal(".plans:not([hidden])"); reveal(".team"); reveal(".split"); reveal(".values"); reveal(".overview"); reveal("[data-stagger]"); reveal(".flag-cards", { y: 30, stagger: .04 }); reveal(".feature-list"); reveal(".contact-row");
  $$("[data-reveal], .table-scroll, .form-card, .radar-vis").forEach((el) => gsap.from(el, { y: 50, opacity: 0, scale: .98, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } }));
  $$(".guarantee").forEach((el) => gsap.from(el, { clipPath: "inset(0 100% 0 0 round 18px)", duration: 1.2, ease: "expo.inOut", scrollTrigger: { trigger: el, start: "top 90%", once: true } }));

  // Counters and bars
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, fmt = el.dataset.format === "thousands", o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, onUpdate: () => { el.textContent = fmt ? Math.round(o.v).toLocaleString("en-US") : Math.round(o.v); } });
  });
  if ($(".bars")) gsap.from(".bar i b", { width: 0, duration: 1.4, stagger: .15, ease: "expo.out", scrollTrigger: { trigger: ".bars", start: "top 90%", once: true } });

  // Parallax images inside cards
  $$("[data-parallax]").forEach((img) => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: img.closest(".ov-card") || img, scrub: true } }));
  // Loss cards tilt toward each other as they enter
  if ($(".loss")) gsap.from(".loss-bad", { rotate: -3, xPercent: -6, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".loss", start: "top 80%", once: true } });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
