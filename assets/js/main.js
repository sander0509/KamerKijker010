/* Kamerkijker 010 — interactions
   GSAP + ScrollTrigger for scroll choreography, Lenis for smooth scroll,
   CSS scroll-driven animation for the header progress bar (with JS fallback),
   View Transitions API for the theme switch. Everything degrades to a static, readable page. */
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
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const tick = '<svg aria-hidden="true"><use href="#i-check"/></svg>';

  /* ---------- Theme (View Transitions circle reveal) ---------- */
  const saved = store.get("kk-theme");
  if (saved) doc.dataset.theme = saved;
  const themeBtn = $("#theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", (e) => {
    const isDark = doc.dataset.theme ? doc.dataset.theme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    const apply = () => { doc.dataset.theme = next; store.set("kk-theme", next); };
    if (!document.startViewTransition || reduce) return apply();
    const x = e.clientX || innerWidth - 60, y = e.clientY || 36;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      doc.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.2,.7,.1,1)", pseudoElement: "::view-transition-new(root)" });
    }).catch(() => {});
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $("#menu-btn"), links = $("#nav-links");
  if (menuBtn && links) {
    menuBtn.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    links.addEventListener("click", (e) => {
      if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- Header state + progress fallback ---------- */
  const header = $(".site-header"), progress = $(".progress");
  const cssTimeline = window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()");
  const onScroll = () => {
    const y = window.scrollY;
    if (header) header.classList.toggle("scrolled", y > 8);
    if (progress && !cssTimeline) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const target = document.getElementById(id.slice(1));
    if (!target) return;
    e.preventDefault();
    if (a.dataset.pkg) selectPackage(a.dataset.pkg);
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  });

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduce) {
    $$(".magnetic").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty("--bx", `${(e.clientX - r.left - r.width / 2) * 0.18}px`);
        b.style.setProperty("--by", `${(e.clientY - r.top - r.height / 2) * 0.25}px`);
      });
      b.addEventListener("pointerleave", () => { b.style.setProperty("--bx", "0px"); b.style.setProperty("--by", "0px"); });
    });
  }

  /* ---------- Phone tilt ---------- */
  const phone = $("#phone");
  if (phone && finePointer && !reduce) {
    const wrap = phone.parentElement;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    addEventListener("pointermove", (e) => {
      const r = wrap.getBoundingClientRect();
      tx = ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 18;
      ty = -((e.clientY - (r.top + r.height / 2)) / innerHeight) * 14;
    });
    const loop = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      phone.style.transform = `rotateY(${cx}deg) rotateX(${cy}deg)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- Viewfinder scene (canvas: Rotterdam front door, then the room) ---------- */
  const canvas = $("#scene");
  let sceneMode = 0; // 0 = street, 1 = room
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const scan = canvas.closest(".screen").querySelector(".vf-scan");
      if (scan) scan.style.setProperty("--scan-h", `${Math.max(120, H - 210)}px`);
    };
    resize(); addEventListener("resize", resize);
    const t0 = performance.now();
    const street = (t) => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#8fb4c4"); g.addColorStop(.5, "#c9d7d6"); g.addColorStop(1, "#5d6b6a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const z = 1 + ((t / 9000) % 1) * 0.18; // slow dolly toward the door
      ctx.save(); ctx.translate(W / 2, H * 0.55); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.55);
      // brick facade
      ctx.fillStyle = "#8a4b36"; ctx.fillRect(-W * .2, H * .02, W * 1.4, H * .85);
      ctx.strokeStyle = "rgba(60,25,15,.35)"; ctx.lineWidth = 1;
      for (let y = H * .02; y < H * .87; y += 9) {
        ctx.beginPath(); ctx.moveTo(-W * .2, y); ctx.lineTo(W * 1.2, y); ctx.stroke();
        const off = (Math.round(y / 9) % 2) * 11;
        for (let x = -W * .2 + off; x < W * 1.2; x += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 9); ctx.stroke(); }
      }
      // windows
      const win = (x, y, w, h, lit) => {
        ctx.fillStyle = "#efe9dc"; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
        ctx.fillStyle = lit ? "#f3d58c" : "#2c3f46"; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#efe9dc"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * .4); ctx.lineTo(x + w, y + h * .4); ctx.stroke();
      };
      win(W * .1, H * .1, W * .26, H * .17, false); win(W * .64, H * .1, W * .26, H * .17, true);
      win(W * .64, H * .4, W * .26, H * .17, false);
      // door
      const dx = W * .14, dy = H * .38, dw = W * .32, dh = H * .49;
      ctx.fillStyle = "#efe9dc"; ctx.fillRect(dx - 6, dy - 6, dw + 12, dh + 6);
      ctx.fillStyle = "#123c3a"; ctx.fillRect(dx, dy, dw, dh);
      ctx.fillStyle = "#0d2e2c"; ctx.fillRect(dx + dw * .12, dy + dh * .08, dw * .76, dh * .32); ctx.fillRect(dx + dw * .12, dy + dh * .5, dw * .76, dh * .42);
      ctx.fillStyle = "#d9b45a"; ctx.beginPath(); ctx.arc(dx + dw * .82, dy + dh * .46, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#efe9dc"; ctx.font = `600 ${Math.round(W * .06)}px ui-monospace, monospace`; ctx.fillText("42", dx + dw * .38, dy - 12);
      // pavement
      ctx.fillStyle = "#6d7776"; ctx.fillRect(-W * .2, H * .87, W * 1.4, H * .2);
      ctx.restore();
    };
    const room = (t) => {
      ctx.fillStyle = "#e8e1d4"; ctx.fillRect(0, 0, W, H);
      const pan = Math.sin(t / 2600) * W * .05;
      ctx.save(); ctx.translate(pan, 0);
      ctx.fillStyle = "#d8cfbf"; ctx.fillRect(-W * .2, H * .68, W * 1.4, H * .4); // floor
      ctx.fillStyle = "#b99f7c"; for (let x = -W * .2; x < W * 1.2; x += 26) ctx.fillRect(x, H * .68, 1.5, H * .4);
      // window with daylight
      ctx.fillStyle = "#f7f4ec"; ctx.fillRect(W * .52, H * .12, W * .38, H * .32);
      const sky = ctx.createLinearGradient(0, H * .14, 0, H * .42); sky.addColorStop(0, "#9cc6dd"); sky.addColorStop(1, "#dbe9ee");
      ctx.fillStyle = sky; ctx.fillRect(W * .55, H * .14, W * .32, H * .28);
      ctx.fillStyle = "#6f8790"; ctx.fillRect(W * .58, H * .32, W * .06, H * .1); ctx.fillRect(W * .66, H * .26, W * .05, H * .16); ctx.fillRect(W * .74, H * .3, W * .1, H * .12); // skyline
      ctx.strokeStyle = "#f7f4ec"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W * .71, H * .14); ctx.lineTo(W * .71, H * .42); ctx.stroke();
      // bed
      ctx.fillStyle = "#0f6b5c"; ctx.fillRect(W * .02, H * .52, W * .48, H * .2);
      ctx.fillStyle = "#f4f1ea"; ctx.fillRect(W * .04, H * .48, W * .14, H * .07);
      ctx.fillStyle = "#7a5a3c"; ctx.fillRect(W * .02, H * .72, W * .48, H * .025);
      // desk + lamp
      ctx.fillStyle = "#7a5a3c"; ctx.fillRect(W * .58, H * .56, W * .36, H * .025); ctx.fillRect(W * .6, H * .58, W * .02, H * .12); ctx.fillRect(W * .9, H * .58, W * .02, H * .12);
      ctx.fillStyle = "#c27712"; ctx.beginPath(); ctx.moveTo(W * .82, H * .5); ctx.lineTo(W * .9, H * .5); ctx.lineTo(W * .87, H * .45); ctx.lineTo(W * .85, H * .45); ctx.fill();
      // smoke detector on ceiling
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(W * .3, H * .03, W * .05, H * .012, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = (Math.floor(t / 600) % 2) ? "#e5544a" : "#7a2a24"; ctx.beginPath(); ctx.arc(W * .3, H * .03, 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const draw = (now) => {
      const t = now - t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // handheld camera wobble
      const sx = reduce ? 0 : Math.sin(t / 900) * 2 + Math.sin(t / 370) * .8;
      const sy = reduce ? 0 : Math.cos(t / 1100) * 2;
      ctx.translate(sx, sy);
      (sceneMode ? room : street)(t);
      // vignette
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const v = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75);
      v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)");
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce) setInterval(() => requestAnimationFrame(draw), 1500);
  }

  /* ---------- Viewfinder checklist loop ---------- */
  const vfItems = $$("#vf-list li"), vfCount = $("#vf-count"), vfText = $("#vf-verdict-text"), lights = $$(".lights i"), timecode = $("#timecode"), vfLabel = $(".vf-label");
  if (vfItems.length) {
    let i = 0, secs = 0;
    setInterval(() => {
      secs++;
      const h = String(Math.floor(secs / 3600)).padStart(2, "0"), m = String(Math.floor(secs / 60) % 60).padStart(2, "0"), s = String(secs % 60).padStart(2, "0");
      if (timecode) timecode.textContent = `${h}:${m}:${s}`;
    }, 1000);
    const setLight = (k) => lights.forEach((l) => l.classList.toggle("on", l.classList.contains(k)));
    const step = () => {
      if (i < vfItems.length) {
        vfItems[i].classList.add("done"); i++;
        vfCount.textContent = `${i}/${vfItems.length}`;
        if (i === 3) { sceneMode = 1; if (vfLabel) vfLabel.textContent = T("2nd floor · the room", "2e verdieping · de kamer"); }
        vfText.textContent = T("Checking…", "Bezig met checken…");
        setLight(i < 3 ? "" : "o");
        setTimeout(step, reduce ? 300 : 1100);
      } else {
        vfText.textContent = T("Advice: green", "Advies: groen");
        setLight("g");
        setTimeout(() => {
          vfItems.forEach((li) => li.classList.remove("done")); i = 0; sceneMode = 0;
          if (vfLabel) vfLabel.textContent = T("Kralingen · front door", "Kralingen · voordeur");
          vfCount.textContent = `0/${vfItems.length}`; setLight("");
          setTimeout(step, 700);
        }, 3200);
      }
    };
    setTimeout(step, 1400);
  }

  /* ---------- Data ---------- */
  const CHECKS = {
    online: [
      T("Do the photos also appear elsewhere (reverse image search)?", "Komen de foto’s ook elders voor (omgekeerd zoeken)?"),
      T("Is the rent far below the market (too good to be true)?", "Ligt de huur ver onder de markt (te mooi om waar te zijn)?"),
      T("Does the ad text appear on several sites or in several cities?", "Komt de tekst van de advertentie op meerdere sites of in meerdere steden voor?"),
      T("Does the owner in the Kadaster match the landlord (or is there a mandate)?", "Komt de eigenaar volgens het Kadaster overeen met de verhuurder (of is er een machtiging)?"),
      T("Is the IBAN Dutch or foreign?", "Is de IBAN Nederlands of buitenlands?"),
      T("Does the landlord use Western Union, MoneyGram, crypto or PayPal Friends?", "Gebruikt de verhuurder Western Union, MoneyGram, crypto of PayPal Friends?"),
      T("Does the landlord ask for money before a viewing or before the contract?", "Vraagt de verhuurder geld vóór een bezichtiging of vóór het contract?"),
      T("Is the address on our scam radar?", "Staat het adres op onze scam-radar?"),
      T("Does the address exist (Google Street View and BAG)?", "Bestaat het adres (Google Street View en BAG)?"),
      T("Can the landlord be reached in a normal way (phone, real name)?", "Is de verhuurder op een normale manier bereikbaar (telefoon, echte naam)?")
    ],
    site: [
      T("Does the room exist, and does it match the photos?", "Bestaat de kamer, en klopt die met de foto’s?"),
      T("Does the landlord or their representative have a key and access?", "Heeft de verhuurder of zijn vertegenwoordiger een sleutel en toegang?"),
      T("Are condition and safety OK (smoke detector, mould, windows, lock)?", "Zijn de staat en de veiligheid in orde (rookmelder, schimmel, ramen, slot)?"),
      T("Is the size roughly what the ad says?", "Komt de grootte ongeveer overeen met de advertentie?"),
      T("What do the entrance, stairwell and street look like?", "Hoe zien de entree, het trappenhuis en de straat eruit?"),
      T("Which facilities are there (kitchen, bathroom, wifi, washing machine)?", "Welke voorzieningen zijn er (keuken, badkamer, wifi, wasmachine)?"),
      T("How many housemates are there (never filmed without permission)?", "Hoeveel huisgenoten zijn er (nooit gefilmd zonder toestemming)?")
    ],
    contract: [
      T("Is the deposit higher than 2 months’ basic rent?", "Is de borg hoger dan 2 maanden kale huur?"),
      T("Does the contract contain unusual costs or clauses?", "Bevat het contract ongebruikelijke kosten of bepalingen?"),
      T("Does the points system suggest the rent is too high? Then we refer you to the Huurcommissie.", "Geeft het puntenstelsel een indicatie dat de huur te hoog is? Dan verwijzen we door naar de Huurcommissie.")
    ]
  };
  const FLAGS = [
    { b: T("The landlord is abroad", "De verhuurder zit in het buitenland"), s: T("and will “send the key by post”.", "en stuurt “de sleutel per post”."), w: 3 },
    { b: T("No viewing possible", "Geen bezichtiging mogelijk"), s: T("but they want a deposit to “reserve” the room.", "maar wel borg om te “reserveren”."), w: 3 },
    { b: T("Western Union, MoneyGram, crypto", "Western Union, MoneyGram, crypto"), s: T("or a foreign bank account.", "of een buitenlandse rekening."), w: 3 },
    { b: T("The price is far below", "De prijs ligt ver onder"), s: T("comparable rooms in Rotterdam.", "vergelijkbare kamers in Rotterdam."), w: 2 },
    { b: T("The same photos", "Dezelfde foto’s"), s: T("appear in ads in other cities.", "staan in advertenties in andere steden."), w: 3 },
    { b: T("Pressure", "Druk"), s: T("“Many people want this room, pay today.”", "“Veel mensen willen deze kamer, betaal vandaag.”"), w: 2 },
    { b: T("They ask for your passport", "Ze vragen je paspoort"), s: T("or ID before you’ve seen the room.", "of ID voordat je de kamer hebt gezien."), w: 2 },
    { b: T("The contract looks unprofessional", "Het contract ziet er amateuristisch uit"), s: T("or the name differs from the owner.", "of de naam wijkt af van de eigenaar."), w: 2 },
    { b: T("Deposit above 2 months’ rent", "Borg hoger dan 2 maanden huur"), s: T("of basic rent.", "kale huur."), w: 1 },
    { b: T("The chat moves off-platform", "Het gesprek gaat snel naar"), s: T("quickly, to WhatsApp or private email.", "WhatsApp of privémail."), w: 1 }
  ];
  const RADAR = [
    { area: "Kralingen", text: T("Photos also used in an ad in Utrecht. Landlord “abroad”, asks for the deposit via Western Union.", "Foto’s ook gebruikt in een advertentie in Utrecht. Verhuurder ‘in het buitenland’, vraagt borg via Western Union."), pattern: "Western Union · reused photos", date: "12-11-2026", status: "confirmed", x: .68, y: .36 },
    { area: "Centrum · Cool", text: T("Room at €450 all-in, far below market. Key “sent by post” after the first payment.", "Kamer voor €450 all-in, ver onder de markt. Sleutel ‘per post’ na de eerste betaling."), pattern: "Key by post · too cheap", date: "05-11-2026", status: "confirmed", x: .47, y: .45 },
    { area: "Delfshaven", text: T("Asks for a passport copy before any viewing. Moves the chat to WhatsApp right away.", "Vraagt een kopie paspoort vóór een bezichtiging. Gaat direct naar WhatsApp."), pattern: "Passport first · off-platform", date: "29-10-2026", status: "reported", x: .3, y: .5 },
    { area: "Kop van Zuid", text: T("Same ad text found for rooms in Rotterdam, Amsterdam and Groningen.", "Dezelfde advertentietekst gevonden voor kamers in Rotterdam, Amsterdam en Groningen."), pattern: "Copied ad text", date: "21-10-2026", status: "reported", x: .55, y: .64 },
    { area: "Blijdorp", text: T("Landlord asks to pay the deposit in crypto “for your safety”.", "Verhuurder vraagt de borg in crypto te betalen ‘voor je veiligheid’."), pattern: "Crypto payment", date: "14-10-2026", status: "confirmed", x: .42, y: .26 },
    { area: "Schiedam", text: T("Reported as fake. Our check found the owner and the room were real.", "Gemeld als nep. Onze check vond dat de eigenaar en de kamer echt waren."), pattern: "Report checked", date: "02-10-2026", status: "resolved", x: .16, y: .58 }
  ];
  const FAQ = [
    [T("What exactly do you check?", "Wat checken jullie precies?"), T("We check the ad, the photos, the official owner in the Dutch Land Registry (Kadaster), the bank account country and our scam radar. With a Room Check, one of us visits the room and shows it to you live on video. See our 20-point checklist.", "We checken de advertentie, de foto’s, de officiële eigenaar in het Kadaster, het land van de bankrekening en onze scam-radar. Bij een Kamercheck gaat een van ons langs en laat de kamer live via video zien. Zie onze checklist van 20 punten.")],
    [T("How fast is it?", "Hoe snel is het?"), T("Online Check: within 24 hours. Room Check: within 48 hours, if the landlord agrees to a viewing. If the landlord refuses a viewing, that’s already a red flag, and we’ll tell you.", "Online Check: binnen 24 uur. Kamercheck: binnen 48 uur, als de verhuurder een bezichtiging toestaat. Weigert de verhuurder? Dan is dat al een rode vlag, en dat horen jullie van ons.")],
    [T("Do you guarantee that the room is safe?", "Garanderen jullie dat de kamer veilig is?"), T("No. Nobody can guarantee that. We check carefully against a fixed checklist and tell you what we found and what we couldn’t verify. You make the final decision.", "Nee. Niemand kan dat garanderen. We checken zorgvuldig volgens een vaste checklist en vertellen wat we zagen en wat we niet konden controleren. U beslist zelf.")],
    [T("Are you a rental agent?", "Zijn jullie een makelaar?"), T("No. We don’t rent out rooms, we don’t connect you with landlords and we never take money from landlords. We only work for you.", "Nee. We verhuren geen kamers, brengen u niet in contact met verhuurders en nemen nooit geld aan van verhuurders. We werken alleen voor de huurder.")],
    [T("Who pays: me or my parents?", "Wie betaalt: ik of mijn ouders?"), T("Whoever books. Many parents book a check for their child. You’ll both get the report.", "Wie boekt, betaalt. Veel ouders boeken een check voor hun kind. U krijgt allebei het rapport.")],
    [T("What if the landlord doesn’t let you in?", "Wat als de verhuurder jullie niet binnenlaat?"), T("Then you get a refund of the difference between the Room Check and the Online Check, plus our advice not to pay.", "Dan krijgt u het verschil tussen de Kamercheck en de Online Check terug, plus ons advies om niet te betalen.")],
    [T("Can you check rooms outside Rotterdam?", "Checken jullie ook buiten Rotterdam?"), T("We cover Rotterdam and nearby areas such as Schiedam, Capelle and Delft. Ask us for other places.", "We werken in Rotterdam en omgeving, zoals Schiedam, Capelle en Delft. Vraag het ons voor andere plekken.")],
    [T("Do you check the rent price?", "Checken jullie de huurprijs?"), T("With Room Check Plus we give an indication based on the Dutch points system. For an official ruling you can go to the Huurcommissie (the Dutch rent tribunal).", "Bij Kamercheck Plus geven we een indicatie op basis van het puntenstelsel. Voor een officiële uitspraak kunt u naar de Huurcommissie.")],
    [T("What happens with my data?", "Wat gebeurt er met mijn gegevens?"), T("We only use your data for this check and delete it after 6 months. See our privacy statement.", "We gebruiken uw gegevens alleen voor deze check en verwijderen ze na 6 maanden. Zie onze privacyverklaring.")],
    [T("I think I’ve already been scammed. What now?", "Ik denk dat ik al opgelicht ben. Wat nu?"), T("Report it to the police and to the Fraudehelpdesk, and contact your bank right away. You can also report it on our scam radar. For legal help, contact Juridisch Loket or the LSVb Housing Hotline.", "Doe aangifte bij de politie, meld het bij de Fraudehelpdesk en bel direct uw bank. U kunt het ook melden op onze scam-radar. Voor juridische hulp: het Juridisch Loket of de LSVb Huurpunt.")],
    [T("Is this a real company?", "Is dit een echt bedrijf?"), T("Yes. We’re a registered student company in Rotterdam. Our KVK number is in the footer.", "Ja. We zijn een geregistreerd studentenbedrijf in Rotterdam. Ons KVK-nummer staat onderaan de pagina.")]
  ];
  const PKGS = {
    online: { name: "Online Check", price: 19, time: T("within 24 hours", "binnen 24 uur") },
    room: { name: T("Room Check", "Kamercheck"), price: 59, time: T("within 48 hours", "binnen 48 uur") },
    plus: { name: T("Room Check Plus", "Kamercheck Plus"), price: 89, time: T("within 48 hours", "binnen 48 uur") },
    bundle: { name: "3-Room Bundle", price: 149, time: T("within 5 days", "binnen 5 dagen") }
  };

  /* ---------- Checklist ---------- */
  const list = $("#check-list");
  const ticked = new Set();
  const ringFg = $("#ring-fg"), ringNum = $("#ring-num");
  const renderChecklist = (tab) => {
    if (!list) return;
    const start = tab === "online" ? 0 : tab === "site" ? 10 : 17;
    list.innerHTML = CHECKS[tab].map((q, i) => {
      const n = start + i + 1;
      return `<li><button type="button" class="check-item" data-n="${n}" aria-pressed="${ticked.has(n)}"><span class="no">${String(n).padStart(2, "0")}</span><span>${q}</span><span class="box">${tick}</span></button></li>`;
    }).join("");
    if (hasGSAP && !reduce) gsap.from(list.children, { y: 14, opacity: 0, duration: .5, stagger: .04, ease: "power3.out" });
  };
  const updateRing = () => {
    if (!ringFg) return;
    const c = 326.7;
    ringFg.style.strokeDashoffset = String(c - (ticked.size / 20) * c);
    ringNum.textContent = String(ticked.size);
  };
  if (list) {
    renderChecklist("online");
    list.addEventListener("click", (e) => {
      const b = e.target.closest(".check-item"); if (!b) return;
      const n = +b.dataset.n;
      ticked.has(n) ? ticked.delete(n) : ticked.add(n);
      b.setAttribute("aria-pressed", String(ticked.has(n)));
      updateRing();
    });
    $$('[data-tab]').forEach((t) => t.addEventListener("click", () => {
      $$('[data-tab]').forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      renderChecklist(t.dataset.tab);
    }));
  }

  /* ---------- Red flag scanner ---------- */
  const flagsEl = $("#flags");
  if (flagsEl) {
    flagsEl.innerHTML = FLAGS.map((f, i) => `<button type="button" class="flag-btn" aria-pressed="false" data-i="${i}"><span class="fi"><svg aria-hidden="true"><use href="#i-x"/></svg></span><span><b>${f.b}</b><span>${f.s}</span></span></button>`).join("");
    const needle = $("#needle"), badge = $("#v-badge"), title = $("#v-title"), text = $("#v-text");
    const on = new Set();
    const update = () => {
      const score = Array.from(on).reduce((a, i) => a + FLAGS[i].w, 0);
      const angle = -80 + Math.min(score / 8, 1) * 160;
      needle.style.transform = `rotate(${angle}deg)`;
      let k = "g", b = T("Green", "Groen"), h, p;
      if (on.size === 0) { h = T("No red flags ticked yet", "Nog geen rode vlaggen aangevinkt"); p = T("Tick the flags you see. Even with zero flags, a fake ad can look perfect. That is why we go and look.", "Vink aan wat u ziet. Ook zonder rode vlaggen kan een nepadvertentie er perfect uitzien. Daarom gaan wij kijken."); }
      else if (score < 3) { k = "o"; b = T("Orange", "Oranje"); h = T("Be careful", "Wees voorzichtig"); p = T("Something is off. Don’t pay anything until someone has seen the room and the owner is checked.", "Er klopt iets niet. Betaal niets totdat iemand de kamer heeft gezien en de eigenaar is gecheckt."); }
      else { k = "r"; b = T("Red", "Rood"); h = T("Don’t pay yet", "Nog niet betalen"); p = T(`You ticked ${on.size} red flag${on.size > 1 ? "s" : ""} that scammers often use. Don’t send money. Let us check the ad and the owner first.`, `U vinkte ${on.size} rode vlag${on.size > 1 ? "gen" : ""} aan die oplichters vaak gebruiken. Stuur geen geld. Laat ons eerst de advertentie en de eigenaar checken.`); }
      badge.className = `badge ${k}`; badge.textContent = b; title.textContent = h; text.textContent = p;
    };
    flagsEl.addEventListener("click", (e) => {
      const btn = e.target.closest(".flag-btn"); if (!btn) return;
      const i = +btn.dataset.i;
      on.has(i) ? on.delete(i) : on.add(i);
      btn.setAttribute("aria-pressed", String(on.has(i)));
      update();
    });
  }
  const cards = $("#flag-cards");
  if (cards) cards.innerHTML = FLAGS.map((f, i) => `<article class="flag-card"><span class="fn"><svg aria-hidden="true"><use href="#i-flag"/></svg>${T("Red flag", "Rode vlag")} ${String(i + 1).padStart(2, "0")}</span><p><b>${f.b}</b> ${f.s}</p></article>`).join("");

  /* ---------- Pricing audience switch + spotlight ---------- */
  $$("[data-aud]").forEach((t) => t.addEventListener("click", () => {
    $$("[data-aud]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    const s = $("#plans-students"), o = $("#plans-orgs");
    s.hidden = t.dataset.aud !== "students"; o.hidden = t.dataset.aud !== "orgs";
    const shown = s.hidden ? o : s;
    if (hasGSAP && !reduce) gsap.from(shown.children, { y: 30, opacity: 0, duration: .6, stagger: .07, ease: "power3.out" });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));
  $$(".plan").forEach((p) => p.addEventListener("pointermove", (e) => {
    const r = p.getBoundingClientRect();
    p.style.setProperty("--mx", `${e.clientX - r.left}px`); p.style.setProperty("--my", `${e.clientY - r.top}px`);
  }));

  /* ---------- Scam radar ---------- */
  const radarList = $("#radar-list"), radarQ = $("#radar-q");
  let radarFilter = "all", radarMatches = RADAR.map(() => true);
  const statusLabel = { confirmed: T("Confirmed by a check", "Bevestigd door een check"), reported: T("Reported", "Gemeld"), resolved: T("Resolved or incorrect", "Opgelost of onjuist") };
  const renderRadar = () => {
    if (!radarList) return;
    const q = (radarQ.value || "").trim().toLowerCase();
    radarMatches = RADAR.map((r) => (radarFilter === "all" || r.status === radarFilter) && (!q || `${r.area} ${r.text} ${r.pattern}`.toLowerCase().includes(q)));
    const items = RADAR.filter((_, i) => radarMatches[i]);
    radarList.innerHTML = items.length ? items.map((r) => `<li class="radar-item"><h4>${r.area}</h4><span class="status ${r.status}">${statusLabel[r.status]}</span><p>${r.text}</p><div class="meta"><span>${T("Pattern", "Patroon")}: ${r.pattern}</span><span>${r.date}</span><span>${T("Example", "Voorbeeld")}</span></div></li>`).join("")
      : `<li class="radar-empty">${T("Nothing on the radar for this search. That doesn’t mean the ad is safe. New scams appear every week.", "Niets op de radar voor deze zoekopdracht. Dat betekent niet dat de advertentie veilig is. Er komen elke week nieuwe trucs bij.")}</li>`;
  };
  if (radarList) {
    renderRadar();
    radarQ.addEventListener("input", renderRadar);
    $$("[data-status]").forEach((c) => c.addEventListener("click", () => {
      radarFilter = c.dataset.status;
      $$("[data-status]").forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      renderRadar();
    }));
  }
  const rc = $("#radar-canvas");
  if (rc) {
    const ctx = rc.getContext("2d");
    let S = 0, dpr = 1;
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); S = rc.clientWidth; rc.width = S * dpr; rc.height = S * dpr; };
    size(); addEventListener("resize", size);
    const col = { confirmed: "255,138,127", reported: "240,183,82", resolved: "89,215,156" };
    // a simplified Maas river line through the radar
    const draw = (now) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      const c = S / 2, a = reduce ? 1.2 : (now / 2200) % (Math.PI * 2);
      ctx.strokeStyle = "rgba(157,180,178,.18)"; ctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(c, c, (S / 2) * r / 4.2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, S); ctx.moveTo(0, c); ctx.lineTo(S, c); ctx.stroke();
      ctx.strokeStyle = "rgba(63,193,163,.35)"; ctx.lineWidth = S * .035; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(0, S * .62); ctx.bezierCurveTo(S * .3, S * .52, S * .45, S * .62, S * .6, S * .56); ctx.bezierCurveTo(S * .75, S * .5, S * .85, S * .6, S, S * .55); ctx.stroke();
      ctx.fillStyle = "rgba(157,180,178,.6)"; ctx.font = `500 ${Math.max(9, S * .03)}px ui-monospace, monospace`; ctx.fillText("MAAS", S * .78, S * .63);
      // sweep
      const grad = ctx.createConicGradient ? ctx.createConicGradient(a - .9, c, c) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(89,226,192,0)"); grad.addColorStop(.14, "rgba(89,226,192,.28)"); grad.addColorStop(.145, "rgba(89,226,192,0)");
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(c, c, S / 2, 0, Math.PI * 2); ctx.fill();
      }
      RADAR.forEach((r, i) => {
        const x = r.x * S, y = r.y * S;
        let ang = Math.atan2(y - c, x - c); if (ang < 0) ang += Math.PI * 2;
        let d = a - ang; if (d < 0) d += Math.PI * 2;
        const glow = Math.max(0, 1 - d / 3.5);
        const alpha = radarMatches[i] ? .35 + glow * .65 : .08;
        ctx.fillStyle = `rgba(${col[r.status]},${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, S * .014 + glow * S * .01, 0, Math.PI * 2); ctx.fill();
        if (radarMatches[i]) {
          ctx.strokeStyle = `rgba(${col[r.status]},${glow * .6})`; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.arc(x, y, S * .02 + (1 - glow) * S * .05, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(231,240,238,${.45 + glow * .5})`; ctx.font = `500 ${Math.max(9, S * .028)}px ui-monospace, monospace`;
          ctx.fillText(r.area.split(" ")[0].toUpperCase(), x + S * .03, y + 4);
        }
      });
      if (!reduce) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    if (reduce) radarQ && radarQ.addEventListener("input", () => requestAnimationFrame(draw));
  }

  /* ---------- FAQ ---------- */
  const faq = $("#faq-list");
  if (faq) {
    faq.innerHTML = FAQ.map(([q, a], i) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">${q}<span class="pm" aria-hidden="true"></span></button><div class="faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}"><div><p>${a}</p></div></div></div>`).join("");
    faq.addEventListener("click", (e) => {
      const q = e.target.closest(".faq-q"); if (!q) return;
      q.setAttribute("aria-expanded", String(q.getAttribute("aria-expanded") !== "true"));
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 520);
    });
  }

  /* ---------- Booking ---------- */
  const form = $("#book-form");
  let stepN = 1;
  function selectPackage(k) {
    const r = document.getElementById(`pkg-${k}`);
    if (r) { r.checked = true; updateSummary(); }
  }
  function updateSummary() {
    const sel = form && form.querySelector('input[name="pkg"]:checked');
    if (!sel) return;
    const p = PKGS[sel.value];
    $("#sum-pkg").textContent = p.name; $("#sum-time").textContent = p.time; $("#sum-total").textContent = `€${p.price}`;
  }
  if (form) {
    const fs = $$("fieldset", form), stepsLi = $$("#book-steps li"), prev = $("#prev"), next = $("#next");
    const nextLabel = next.innerHTML;
    form.addEventListener("change", updateSummary);
    const show = (n) => {
      stepN = n;
      fs.forEach((f) => (f.hidden = +f.dataset.step !== n));
      stepsLi.forEach((li, i) => { li.classList.toggle("active", i + 1 === n); li.classList.toggle("done", i + 1 < n); });
      prev.hidden = n === 1;
      next.innerHTML = n === 4 ? `${T("Pay", "Betalen")} ${$("#sum-total").textContent} <svg class="arrow" width="18" height="18" aria-hidden="true"><use href="#i-arrow"/></svg>` : nextLabel;
      const cur = fs[n - 1];
      if (hasGSAP && !reduce) gsap.from(cur, { x: 24, opacity: 0, duration: .45, ease: "power3.out" });
      if (n === 4) {
        const v = (id) => ($(id).value || "–");
        const rows = [[T("Package", "Pakket"), `${$("#sum-pkg").textContent} · ${$("#sum-total").textContent}`], [T("Ad", "Advertentie"), v("#ad-url")], [T("Address", "Adres"), v("#address")], [T("Landlord", "Verhuurder"), `${v("#ll-name")} · ${v("#ll-phone")}`], [T("You", "U"), `${v("#c-name")} · ${v("#c-email")}`]];
        $("#review").innerHTML = rows.map(([k, val]) => `<div><dt>${k}</dt><dd></dd></div>`).join("");
        $$("#review dd").forEach((dd, i) => (dd.textContent = rows[i][1]));
      }
    };
    const validate = (n) => {
      const err = $(`#err-${n}`);
      const bad = (msg, el) => { if (err) err.textContent = msg; if (el) el.focus(); return false; };
      if (err) err.textContent = "";
      if (n === 2) {
        const ad = $("#ad-url"), addr = $("#address");
        if (!ad.value.trim() || !/^https?:\/\/\S+\.\S+/.test(ad.value.trim())) return bad(T("Paste the full link to the ad, starting with https://", "Plak de volledige link naar de advertentie, beginnend met https://"), ad);
        if (addr.value.trim().length < 5) return bad(T("Add the address of the room so we can plan the visit.", "Vul het adres van de kamer in zodat we het bezoek kunnen plannen."), addr);
      }
      if (n === 3) {
        const nm = $("#c-name"), em = $("#c-email");
        if (!nm.value.trim()) return bad(T("Add your name so we know who the report is for.", "Vul uw naam in zodat we weten voor wie het rapport is."), nm);
        if (!/^\S+@\S+\.\S+$/.test(em.value.trim())) return bad(T("Add a valid email address. We send the report there.", "Vul een geldig e-mailadres in. Daar sturen we het rapport naartoe."), em);
      }
      if (n === 4 && !$("#agree").checked) return bad(T("Tick the box to confirm you want us to start right away.", "Vink het vakje aan om te bevestigen dat we direct mogen starten."), $("#agree"));
      return true;
    };
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!validate(stepN)) return;
      if (stepN < 4) return show(stepN + 1);
      fs.forEach((f) => (f.hidden = true));
      $("#form-nav").hidden = true;
      stepsLi.forEach((li) => { li.classList.remove("active"); li.classList.add("done"); });
      const ok = $("#book-success"); ok.hidden = false;
      if (hasGSAP && !reduce) gsap.from(ok.children, { y: 20, opacity: 0, stagger: .08, duration: .6, ease: "back.out(1.6)" });
    });
    prev.addEventListener("click", () => show(stepN - 1));
    $("#book-again").addEventListener("click", () => { form.reset(); $("#book-success").hidden = true; $("#form-nav").hidden = false; updateSummary(); show(1); });
    updateSummary();
  }

  /* ---------- Copy email ---------- */
  const copyBtn = $("#copy-mail");
  if (copyBtn) copyBtn.addEventListener("click", () => {
    const addr = $("#mail-addr").textContent;
    const done = () => { copyBtn.textContent = T("Copied", "Gekopieerd"); setTimeout(() => (copyBtn.textContent = T("Copy address", "Kopieer adres")), 1800); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($("#mail-addr")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); };
    try { navigator.clipboard.writeText(addr).then(done, fallback); } catch (e) { fallback(); }
  });

  /* ---------- GSAP choreography ---------- */
  if (!hasGSAP || reduce) {
    const h = $("#hours"); if (h) h.textContent = "48";
    const tb = $("#timeline-bar"); if (tb) tb.style.transform = "scaleX(1)";
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  // Hero intro: one orchestrated moment
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro.from(".hero h1 .line > span", { yPercent: 110, duration: 1.2, stagger: .1 })
    .from(".hero h1 em path", { strokeDashoffset: 600, duration: 1.2, ease: "power2.inOut" }, "-=.6")
    .from("[data-hero]", { y: 24, opacity: 0, duration: 1, stagger: .08 }, .25)
    .from(".phone", { rotateY: -24, rotateX: 10, y: 60, duration: 1.6 }, .3)
    .from(".float-chip", { scale: .6, opacity: 0, duration: .9, stagger: .2, ease: "back.out(1.8)" }, 1.1);
  gsap.to(".chip-1", { y: -10, duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
  gsap.to(".chip-2", { y: 10, duration: 2.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

  // Split headings into words that rise in
  $$("[data-split]").forEach((h) => {
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute("aria-label", h.textContent.trim());
    h.innerHTML = words.map((w) => `<span style="display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em"><span style="display:inline-block" aria-hidden="true">${w}</span></span>`).join(" ");
    gsap.from(h.querySelectorAll("span > span"), { yPercent: 105, duration: 1, stagger: .045, ease: "expo.out", scrollTrigger: { trigger: h, start: "top 85%", once: true } });
  });

  // Generic reveals
  const reveal = (sel, opts = {}) => $$(sel).forEach((group) => {
    gsap.from(group.children, Object.assign({ y: 40, opacity: 0, duration: .9, stagger: .08, ease: "power3.out", scrollTrigger: { trigger: group, start: "top 85%", once: true } }, opts));
  });
  reveal(".problem-grid"); reveal(".why"); reveal("#plans-students"); reveal(".team"); reveal(".flag-cards", { y: 30, stagger: .05 }); reveal(".split"); reveal(".contact-row"); reveal(".values");
  gsap.from(".table-scroll", { y: 40, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".table-scroll", start: "top 88%", once: true } });

  // Counters
  $$("[data-count]").forEach((el) => {
    const end = +el.dataset.count, fmt = el.dataset.format === "thousands";
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 1.8, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: () => { el.textContent = fmt ? Math.round(o.v).toLocaleString("en-US") : Math.round(o.v); } });
  });
  // Bars grow to scale
  $$("#bars rect").forEach((r, i) => {
    gsap.from(r, { attr: { width: 0 }, duration: 1.4, delay: i * .15, ease: "expo.out", scrollTrigger: { trigger: "#bars", start: "top 85%", once: true } });
  });

  // How it works: pinned horizontal travel on wide screens
  const mm = gsap.matchMedia();
  const hours = $("#hours"), bar = $("#timeline-bar"), stepsEl = $("#steps");
  const setHours = (p) => {
    if (hours) hours.textContent = String(Math.round(Math.min(1, p * 1.15) * 48));
    if (bar) bar.style.transform = `scaleX(${p})`;
  };
  mm.add("(min-width: 861px)", () => {
    const dist = () => Math.max(0, stepsEl.scrollWidth - stepsEl.parentElement.clientWidth + 40);
    const tw = gsap.to(stepsEl, {
      x: () => -dist(), ease: "none",
      scrollTrigger: { trigger: "#how", start: "top 72px", end: () => `+=${dist() + innerHeight * .3}`, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: (s) => setHours(s.progress) }
    });
    return () => tw.scrollTrigger && tw.scrollTrigger.kill();
  });
  mm.add("(max-width: 860px)", () => {
    const st = ScrollTrigger.create({ trigger: "#steps", start: "top 70%", end: "bottom 60%", onUpdate: (s) => setHours(s.progress) });
    gsap.from("#steps .step", { y: 40, opacity: 0, stagger: .1, duration: .8, ease: "power3.out", scrollTrigger: { trigger: "#steps", start: "top 85%", once: true } });
    return () => st.kill();
  });

  // Gentle parallax on panels
  gsap.to(".panel.parents", { yPercent: -4, ease: "none", scrollTrigger: { trigger: ".split", scrub: true } });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
