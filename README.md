# Kamerkijker 010 — website

Static website for Kamerkijker 010 (“See it before you pay”), built from the website briefing of 19 Nov 2026.

## Structure

| Path | What |
| --- | --- |
| `index.html` | English homepage: hero with live “video tour” viewfinder, problem + sources, how it works (pinned 48-hour timeline), interactive 20-point checklist, red-flag self-check meter, comparison, pricing (students / organisations), scam radar (search + filter + radar), red flags guide, parents & universities, team, FAQ, 4-step booking form, contact |
| `nl/index.html` | Dutch short version for parents, landlords and press |
| `legal.html` | Disclaimer, terms in short, privacy, team safety |
| `assets/css/style.css` | Design tokens (light + dark), layout, components |
| `assets/js/main.js` | All interactions and animations |
| `assets/media/` | Hero video (`hero.webm` + `hero.mp4`, 21 s, vertical) and stills used in the steps and the sample report |

## Footage

The hero video and stills are cut from free stock clips on [Mixkit](https://mixkit.co) (Mixkit free licence, commercial use allowed, no attribution required): clips 21813 (front door), 22223 (stairs), 4029 and 3111 (rooms). The site labels it “Example of a live video tour”. Replace it with your own footage from a real check once you have one: export a vertical 540×960 clip to `assets/media/hero.mp4` (and `hero.webm`) and keep the timings in the `data-t` attributes of the checklist in `index.html` in sync.

## Conversion features

- “Paste the link to the room ad” field in the hero that jumps straight to step 2 of the booking form with the link filled in.
- Loss comparison (€1,250 lost vs €59 check), sample report with real photos, refund guarantee, payment methods, sticky “Book a Room Check” bar on mobile.

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
