# SVT ERP — Colour Palette

Ek hi jagah se poore app ka rang tay hota hai: `frontend/tailwind.config.js`.

## Chhe roles

| Role | Kaam | 600 shade | White par contrast |
|---|---|---|---|
| `primary` | Links, active nav, primary buttons | `#2563eb` | 5.17:1 |
| `neutral` | Text, borders, surfaces | `#475569` | 7.58:1 |
| `success` | Paid, completed, passed | `#047857` | 5.48:1 |
| `warning` | Pending, partial, dhyan dene layak | `#b45309` | 5.02:1 |
| `danger` | Delete, overdue, fail | `#e11d48` | 4.70:1 |
| `accent` | Alag flows (jaise Tally box) jo primary me na ghulen | `#7c3aed` | 5.70:1 |

Har role ke paas poori 50–950 scale hai.

## Niyam

**Text ke liye 600 ya usse gehra shade lijiye.** 300/400/500 halke hain — wo
backgrounds, borders, aur gehre background par text ke liye hain. White par
unka contrast WCAG AA (4.5:1) se kam rehta hai.

**Muted text ke liye `neutral-400` (#687689) hai** — `neutral-500` se halka
dikhta hai par phir bhi 4.62:1 deta hai. Isse halka kuch bhi text ke liye mat
use kijiye.

**Rang akela matlab na bataye.** Har status badge me text bhi hona chahiye —
sirf laal/hara se kaam nahi chalega (colour-blind users ke liye).

## Purane naam kyun chalte hain

Codebase me 2712 jagah `text-sky-700`, `bg-emerald-50` jaise raw Tailwind rang
likhe hain. Un sabko haath se badalna khatarnak aur bekaar hota, isliye purane
naam config me hi upar wale roles par bhej diye gaye hain:

```
sky, blue, indigo, cyan  →  primary
slate, gray, zinc        →  neutral
emerald, green, teal     →  success
amber, yellow, orange    →  warning
rose, red, pink          →  danger
violet, purple           →  accent
```

Iska matlab har purana class waise hi kaam karta hai, bas ab sahi rang deta hai.

**Naya code likhte waqt seedha role ka naam use kijiye** — `text-primary-700`,
`bg-success-50` — `text-sky-700` nahi. Purane naam sirf pichhle code ke liye
hain.

## Charts

Chart series ke rang `Analytics.jsx` aur `AdvancedAnalytics.jsx` ke `COLORS`
array me hain, aur wo isi palette se aate hain. Naye chart me bhi wahi array
use kijiye, apna rang mat chuniye — warna dashboard bikhra hua lagega.

## Badalne se pehle

Contrast dobara naapiye. Script `scratchpad/contrast2.mjs` jaisa kuch —
tailwind.config se rang padh kar har `text-*-*` istemal ka ratio nikaalta hai.
Palette lagane se pehle 32% text AA fail kar raha tha; ab 6%, aur wo bache hue
zyadatar gehre background par hain jahan naap laagu hi nahi hoti.
