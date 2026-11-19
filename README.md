# Kamerkijker 010 — website

Static, dependency-free website for Kamerkijker 010 (“See it before you pay”), built from the website briefing of 19 Nov 2026.

## Structure

| Path | What |
| --- | --- |
| `index.html` | English homepage: hero with live “video tour” viewfinder, problem + sources, how it works (pinned 48-hour timeline), interactive 20-point checklist, red-flag self-check meter, comparison, pricing (students / organisations), scam radar (search + filter + radar), red flags guide, parents & universities, team, FAQ, 4-step booking form, contact |
| `nl/index.html` | Dutch short version for parents, landlords and press |
| `legal.html` | Disclaimer, terms in short, privacy, team safety |
| `assets/css/style.css` | Design tokens (light + dark), layout, components |
| `assets/js/main.js` | All interactions and animations |

## Tech

- GSAP 3.12.5 + ScrollTrigger (scroll choreography, pinned horizontal steps), Lenis 1.1.13 (smooth scroll), loaded from CDN.
- CSS scroll-driven animation for the header progress bar (JS fallback), View Transitions API for the dark-mode switch.
- Canvas for the viewfinder scene and the scam radar.
- Respects `prefers-reduced-motion`; content is readable without JavaScript. Mobile-first, keyboard accessible.

Run locally: `python3 -m http.server` and open http://localhost:8000.

## To do before launch

- Booking form is front-end only: connect Mollie or Stripe (iDEAL, card, Apple Pay, Google Pay), the confirmation email and the team notification.
- Replace the WhatsApp number placeholder (`wa.me/31600000000`) and confirm `hello@kamerkijker010.nl`.
- Add the KVK number in the footer (`index.html`, `nl/index.html`, `legal.html`).
- Scam radar entries in `assets/js/main.js` (`RADAR`) are examples and marked as such: replace with real, moderated reports.
- Team: get consent from all four for names (and photos, to replace the initials).
- Have the legal texts, deposit limit and VAT/KOR checked (see the [check] items in the briefing).
- Add privacy-friendly analytics (Plausible or Simple Analytics).
