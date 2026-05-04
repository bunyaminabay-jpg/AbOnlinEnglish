# AbOnlinEnglish — Site Architecture

## 📁 Folder Structure

```
/
├── index.html              ← Entry point: "Kendin Öğren" hub + Auth
├── CNAME                   ← abonlinenglish.school
│
├── pages/
│   ├── landing.html        ← Ana tanıtım sayfası (was: abonlinenglish-landing.html)
│   ├── placement-test.html ← Seviye testi (was: placement-test-50.html)
│   ├── games.html          ← Oyunlar
│   └── roadmap.html        ← Yol haritası (was: YOL_HARITASI_COMPLETE__2_.html)
│
├── levels/
│   ├── a1-a2.html          ← A1 + A2 ders sayfası (was: index-A1-A2.html)
│   └── b1-b2-c1.html       ← B1 + B2 + C1 ders sayfası (was: index-b1-b2-b1.html ❌)
│
├── assets/
│   └── shared.css          ← Shared CSS tokens (reference)
│
└── components/             ← Reusable HTML snippets (future use)
```

## 🗑️ Removed / Merged Files

| Old File | Status | Replaced By |
|----------|--------|-------------|
| `index-b1-b2-b1.html` | ❌ Wrong name | `levels/b1-b2-c1.html` |
| `oyun.html` | ❌ Duplicate | `pages/games.html` |
| `abonlinenglish-landing.html` | → Moved | `pages/landing.html` |
| `placement-test-50.html` | → Moved | `pages/placement-test.html` |
| `YOL_HARITASI_COMPLETE__2_.html` | → Moved | `pages/roadmap.html` |

## 🔐 Auth System (index.html)

- Email-only login (no password, no backend)
- localStorage key: `abonline_user_v1`
- Progress key: `abonline_progress_v1`
- Auto-login on return visit
- Streak tracking, XP, unit completion

## 🔗 Navigation Flow

```
Landing Page (pages/landing.html)
    ↓ "Kendin Öğren" button
index.html (hub + auth gate)
    ↓ Login with email
Dashboard → Level Selection
    ↓ Click level
levels/a1-a2.html      (A1 or A2)
levels/b1-b2-c1.html   (B1, B2, or C1)
```
