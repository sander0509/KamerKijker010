# Kamerkijker 010 — website

Static multi-page website for Kamerkijker 010 (“See it before you pay”), built from the website briefing of 19 Nov 2026.

## Pages

| File | Page |
| --- | --- |
| `index.html` | Landing page: hero with the phone journey, loss vs price, 3-step overview, prices, red flags teaser, parents and universities, FAQ |
| `how-it-works.html` | Scroll story: the five steps on the left drive the phone on the right; the 20-point checklist |
| `pricing.html` | Plans for students and for organisations, guarantee, comparison table, money FAQ |
| `book.html` | 4-step booking form, prefilled from `?pkg=` and `?ad=` (the landing page’s “paste your ad” field sends you here) |
| `scam-radar.html` | Radar, search and filter, “report a scam” form |
| `red-flags.html` | 30-second self-check with meter, the 10 red flags, what to do if you were scammed |
| `for-universities.html` | B2B: Campus Partner, workshop, trend report, “plan a call” form |
| `about.html` | Story, values, team, what we are not |
| `faq.html` | All questions, grouped |
| `contact.html` | WhatsApp, email, contact form |
| `legal.html` | Disclaimer, terms in short, privacy, team safety |
| `nl/index.html` | Dutch landing page for parents and press |

## Editing: change `src/`, then build

The `.html` files above are generated. Edit the sources and run:

```bash
python3 build.py
```

- `src/layout.html`: header, navigation, footer, scripts (shared by every page)
- `src/pages/*.html`: the content of each page
- `src/partials/phone.html`: the phone (customer journey), with `[[keys]]` translated in `build.py`
- `src/partials/sprite.html`: icons
- `build.py`: page list (titles, descriptions), navigation and the English/Dutch strings

Only the Python standard library is needed. Preview locally with `python3 -m http.server` and open http://localhost:8000.

## The phone (customer journey)

`assets/js/journey.js` plays what the customer sees on their own phone: booking and paying, the online check, the visit, the “your report is ready” notification, and the report itself (video tour with the checklist ticking along, photos, owner and money checks, and the final advice). The steps under the phone are clickable. On `how-it-works.html` the phone follows the scroll position instead of playing by itself.

The checklist timings are the `data-t` values (in seconds of video) in `src/partials/phone.html`.

## Footage

The video and stills are cut from free stock clips on [Mixkit](https://mixkit.co) (Mixkit free licence, commercial use allowed, no attribution required): clips 21813 (front door), 22223 (stairs), 4029 and 3111 (rooms). Replace them with your own footage from a real check: export a vertical 540×960 clip to `assets/media/hero.mp4` and `hero.webm`, replace the stills, and update the `data-t` timings.

## Tech

- GSAP 3.12.5 + ScrollTrigger and Lenis 1.1.13 from CDN; cross-document View Transitions between pages; CSS scroll-driven progress bar; container-query units so the phone scales as one piece.
- Respects `prefers-reduced-motion`; content is readable without JavaScript. Mobile-first, sticky “Book” bar on phones.

## To do before launch

- Booking and the contact, scam report and university forms are front-end only: connect Mollie or Stripe (iDEAL, card, Apple Pay, Google Pay), the confirmation email and a team notification.
- Replace the WhatsApp number placeholder (`wa.me/31600000000`) and confirm `hello@kamerkijker010.nl`.
- Add the KVK number (in `build.py`, key `kvk`).
- Scam radar entries in `assets/js/main.js` (`RADAR`) are examples and marked as such.
- Team: consent for names (and photos, to replace the initials).
- Have the legal texts, deposit limit and VAT/KOR checked (see the [check] items in the briefing).
- Add privacy-friendly analytics (Plausible or Simple Analytics).
