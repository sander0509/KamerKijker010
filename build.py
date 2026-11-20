#!/usr/bin/env python3
"""Build the Kamerkijker 010 website.

Pages live in src/pages/, shared pieces in src/layout.html and src/partials/.
Run `python3 build.py` and the finished .html files are written to the site root
(and nl/ for Dutch). Only the Python standard library is used.

Template syntax
  {{content}}      page body (layout only)
  {{> name}}       include src/partials/name.html  ({{> phone:scroll}} sets the phone mode)
  {{root}}         relative path to the site root ("" or "../")
  [[key]]          translated string from STRINGS below
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

NAV = [  # (key, file)
    ("how", "how-it-works.html"),
    ("pricing", "pricing.html"),
    ("radar", "scam-radar.html"),
    ("flags", "red-flags.html"),
    ("unis", "for-universities.html"),
    ("about", "about.html"),
    ("faq", "faq.html"),
]

STRINGS = {
    "en": {
        "skip": "Skip to content", "theme": "Switch light or dark mode",
        "topbar": "Scammers say <b>“pay today”</b>. Ask us first: online check within 24 hours.",
        "cta_short": "Book a check", "cta_long": "Book a Room Check · €59",
        "nav_how": "How it works", "nav_pricing": "Pricing", "nav_radar": "Scam radar", "nav_flags": "Red flags",
        "nav_unis": "Universities", "nav_about": "About", "nav_faq": "FAQ", "nav_book": "Book a check",
        "foot_about": "A student company from Rotterdam. We check rooms for people who can’t be here yet.",
        "foot_service": "Service", "foot_company": "Company", "terms": "Terms", "other_lang": "Nederlands",
        "disclaimer": "Kamerkijker 010 performs a visual and administrative check based on a fixed checklist, on the date of the visit. We do not guarantee that a landlord, room or contract is legitimate, and we do not provide legal advice. We work only on behalf of the tenant and receive no payment from landlords. Final decisions remain the responsibility of the client.",
        "kvk": "KVK number: added at launch",
        # phone
        "book_title": "New check", "book_aria": "Step 1: booking a check", "book_kicker": "Step 1 · Book",
        "book_h": "Which room should we check?", "book_label": "Link to the ad",
        "book_link": "facebook.com/groups/rotterdam-rooms/posts/4821", "popular": "Popular", "room_check": "Room Check",
        "pay": "Pay €59 with iDEAL", "paid": "Paid · booking KK-0412",
        "online_title": "Online check", "online_aria": "Step 2: the online check", "online_kicker": "Step 2 · Within 24 hours",
        "online_h": "We check the ad and the owner",
        "row1": "Photos", "row1s": "Not found on other sites", "row2": "Owner in Kadaster", "row2s": "Matches the landlord",
        "row3": "Bank account", "row3s": "Dutch IBAN", "row4": "Scam radar", "row4s": "Address not listed",
        "banner": "No red flags", "banner_s": "Visit planned: Thursday 14:00",
        "visit_title": "Visit", "visit_aria": "Step 3: the visit", "visit_kicker": "Step 3 · Within 48 hours",
        "visit_h": "Levi is at the room for you",
        "v1": "Arrived at the front door", "v2": "Filming the room and the street", "v3": "Writing your report",
        "push": "Your Room Check report is ready. Tap to open.", "now": "now",
        "report_title": "Your report", "report_aria": "Step 4 and 5: the report", "report_h": "Room Check report",
        "report_meta": "Kralingen · visited Thu 14:00", "advice_green": "Advice: green",
        "video_aria": "Video tour of the room from the report", "video_label": "Video tour · 0:21",
        "checklist": "Checklist", "c1": "Address exists", "c2": "Landlord has key and access", "c3": "Entrance and stairwell OK",
        "c4": "Room matches the photos", "c5": "Windows, lock, smoke detector", "c6": "Size matches the ad",
        "photos": "Photos", "owner_money": "Owner and money",
        "r1": "Owner in Kadaster matches", "r2": "Dutch bank account", "r3": "Not on the scam radar", "r4": "No smoke detector in the hallway",
        "advice_text": "Everything we could check matches. One small point: ask the landlord for a smoke detector. You decide.",
        "pdf": "Download PDF", "ask": "Ask a question", "journey_aria": "The customer journey",
        "st1": "Book", "st2": "Online check", "st3": "Visit", "st4": "Report", "st5": "You decide",
    },
    "nl": {
        "skip": "Naar de inhoud", "theme": "Wissel licht of donker",
        "topbar": "Oplichters zeggen <b>“betaal vandaag”</b>. Vraag het eerst aan ons: online check binnen 24 uur.",
        "cta_short": "Boek een check", "cta_long": "Boek een Kamercheck · €59",
        "nav_how": "Zo werkt het", "nav_pricing": "Prijzen", "nav_radar": "Scam-radar", "nav_flags": "Rode vlaggen",
        "nav_unis": "Universiteiten", "nav_about": "Over ons", "nav_faq": "Vragen", "nav_book": "Boek een check",
        "foot_about": "Een studentenbedrijf uit Rotterdam. Wij checken kamers voor mensen die hier nog niet kunnen zijn.",
        "foot_service": "Service", "foot_company": "Bedrijf", "terms": "Voorwaarden", "other_lang": "English",
        "disclaimer": "Kamerkijker 010 voert een visuele en administratieve check uit volgens een vaste checklist, op de datum van het bezoek. We garanderen niet dat een verhuurder, kamer of contract betrouwbaar is, en we geven geen juridisch advies. We werken alleen voor de huurder en ontvangen geen geld van verhuurders. De klant neemt zelf de uiteindelijke beslissing.",
        "kvk": "KVK-nummer: volgt bij livegang",
        "book_title": "Nieuwe check", "book_aria": "Stap 1: een check boeken", "book_kicker": "Stap 1 · Boeken",
        "book_h": "Welke kamer moeten we checken?", "book_label": "Link naar de advertentie",
        "book_link": "facebook.com/groups/kamers-rotterdam/posts/4821", "popular": "Populair", "room_check": "Kamercheck",
        "pay": "Betaal €59 met iDEAL", "paid": "Betaald · boeking KK-0412",
        "online_title": "Online check", "online_aria": "Stap 2: de online check", "online_kicker": "Stap 2 · Binnen 24 uur",
        "online_h": "We checken advertentie en eigenaar",
        "row1": "Foto’s", "row1s": "Niet op andere sites gevonden", "row2": "Eigenaar in Kadaster", "row2s": "Klopt met de verhuurder",
        "row3": "Bankrekening", "row3s": "Nederlandse IBAN", "row4": "Scam-radar", "row4s": "Adres niet gemeld",
        "banner": "Geen rode vlaggen", "banner_s": "Bezoek gepland: donderdag 14:00",
        "visit_title": "Bezoek", "visit_aria": "Stap 3: het bezoek", "visit_kicker": "Stap 3 · Binnen 48 uur",
        "visit_h": "Levi is bij de kamer voor u",
        "v1": "Aangekomen bij de voordeur", "v2": "Kamer en straat filmen", "v3": "Uw rapport schrijven",
        "push": "Uw Kamercheck-rapport staat klaar. Tik om te openen.", "now": "nu",
        "report_title": "Uw rapport", "report_aria": "Stap 4 en 5: het rapport", "report_h": "Kamercheck-rapport",
        "report_meta": "Kralingen · bezocht do 14:00", "advice_green": "Advies: groen",
        "video_aria": "Videotour van de kamer uit het rapport", "video_label": "Videotour · 0:21",
        "checklist": "Checklist", "c1": "Adres bestaat", "c2": "Verhuurder heeft sleutel", "c3": "Entree en trappenhuis OK",
        "c4": "Kamer klopt met de foto’s", "c5": "Ramen, slot, rookmelder", "c6": "Grootte klopt",
        "photos": "Foto’s", "owner_money": "Eigenaar en geld",
        "r1": "Eigenaar in Kadaster klopt", "r2": "Nederlandse bankrekening", "r3": "Niet op de scam-radar", "r4": "Geen rookmelder in de gang",
        "advice_text": "Alles wat we konden checken klopt. Eén klein punt: vraag de verhuurder om een rookmelder. U beslist.",
        "pdf": "Download pdf", "ask": "Stel een vraag", "journey_aria": "De klantreis",
        "st1": "Boeken", "st2": "Online", "st3": "Bezoek", "st4": "Rapport", "st5": "U beslist",
    },
}

# (source, output, slug, nav key, lang, title, description)
PAGES = [
    ("index", "index.html", "home", "", "en", "Kamerkijker 010 · See it before you pay",
     "Found a room in Rotterdam but you're still abroad? A local student checks the room, the street and the real owner, films it and sends you a report before you pay a single euro."),
    ("how-it-works", "how-it-works.html", "how", "how", "en", "How it works · Kamerkijker 010",
     "From ad to answer in 48 hours: booking, the online check, the visit, the video report and your decision."),
    ("pricing", "pricing.html", "pricing", "pricing", "en", "Pricing · Kamerkijker 010",
     "Online Check €19, Room Check €59, Room Check Plus €89, 3-Room Bundle €149. No subscriptions."),
    ("book", "book.html", "book", "", "en", "Book a check · Kamerkijker 010",
     "Send us the link to the room ad. We check it online within 24 hours and visit within 48 hours."),
    ("scam-radar", "scam-radar.html", "radar", "radar", "en", "Scam radar Rotterdam · Kamerkijker 010",
     "A free public list of reported fake room ads and tricks in Rotterdam, checked by our team."),
    ("red-flags", "red-flags.html", "flags", "flags", "en", "Spot the scam: 10 red flags · Kamerkijker 010",
     "A free 30-second self-check and the 10 red flags of a fake room in Rotterdam."),
    ("for-universities", "for-universities.html", "unis", "unis", "en", "For universities · Kamerkijker 010",
     "Fewer housing emergencies for your international students: Campus Partner, workshops and trend reports."),
    ("about", "about.html", "about", "about", "en", "About us · Kamerkijker 010",
     "Four students from Rotterdam with one mission: no new student should lose their deposit to a scam."),
    ("faq", "faq.html", "faq", "faq", "en", "FAQ · Kamerkijker 010",
     "Answers about our checks, prices, refunds, privacy and what to do if you were scammed."),
    ("contact", "contact.html", "contact", "", "en", "Contact · Kamerkijker 010",
     "WhatsApp, email or the contact form. We answer in English or Dutch."),
    ("legal", "legal.html", "legal", "", "en", "Privacy, terms & disclaimer · Kamerkijker 010",
     "Disclaimer, terms in short, privacy and team safety."),
    ("nl-index", "nl/index.html", "home", "", "nl", "Kamerkijker 010 · Eerst zien, dan betalen",
     "Uw kind heeft een kamer in Rotterdam gevonden maar zit nog in het buitenland? Een Rotterdamse student gaat langs, filmt alles en stuurt een rapport. Pas daarna maakt u geld over."),
]


def partial(name):
    return (SRC / "partials" / f"{name}.html").read_text()


def render(text, ctx, strings):
    def inc(m):
        name, _, arg = m.group(1).partition(":")
        body = partial(name)
        if name == "phone":
            body = body.replace("{{mode}}", arg or "auto")
        return body
    for _ in range(3):
        text = re.sub(r"\{\{> ([\w:-]+)\}\}", inc, text)
    for k, v in ctx.items():
        text = text.replace("{{" + k + "}}", v)
    text = re.sub(r"\[\[(\w+)\]\]", lambda m: strings[m.group(1)], text)
    left = re.findall(r"\{\{[^}]+\}\}|\[\[\w+\]\]", text)
    if left:
        raise SystemExit(f"unresolved placeholders: {set(left)}")
    return text


def build():
    layout = (SRC / "layout.html").read_text()
    for src, out, slug, nav_key, lang, title, desc in PAGES:
        depth = out.count("/")
        root = "../" * depth
        strings = STRINGS[lang]
        nav = "\n".join(
            f'      <li><a href="{{{{root}}}}{href}"{" class=\"is-active\" aria-current=\"page\"" if key == nav_key else ""}>[[nav_{key}]]</a></li>'
            for key, href in NAV)
        alt = {"en": ("nl/index.html", "nl", "NL"), "nl": ("../", "en", "EN")}[lang]
        ctx = {
            "content": (SRC / "pages" / f"{src}.html").read_text(),
            "nav": nav, "lang": lang, "title": title, "description": desc, "slug": slug,
        }
        html = layout
        for k, v in ctx.items():
            html = html.replace("{{" + k + "}}", v)
        html = render(html, {"root": root, "home": root or "./", "alt_href": root + alt[0] if lang == "en" else alt[0],
                             "alt_lang": alt[1], "alt_label": alt[2]}, strings)
        path = ROOT / out
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(html)
        print("built", out)


if __name__ == "__main__":
    build()
