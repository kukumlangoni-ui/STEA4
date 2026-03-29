# STEA Website — Production Deployment Guide

## What Was Fixed (All 10 Phases)

### Phase 1 — Safe Merge ✅
- Merged Google AI Studio ZIP into clean project structure
- **`src/firebase.js`** is now the ONLY Firebase config file
- Removed dependency on `firebase-applet-config.json` — config is hardcoded in `firebase.js`
- `firebaseConfig.js` in project root — **DELETE this file**

### Phase 2 — Build Errors Fixed ✅
- **`CheckCircle`** added to lucide-react imports (was missing — build-breaking)
- **`Bot`** added to lucide-react imports (needed for AI assistant)
- **`limit`** import deduplicated — was imported twice (once from `firebase/firestore` directly)
- **`messaging`** removed from top-level init — now lazy-loaded to prevent crash on Safari/Firefox

### Phase 3 — Loading States ✅
- All sections use 3-state pattern: LOADING → skeleton cards, SUCCESS → content, EMPTY → friendly message
- `useFirestore.js` has 6-second safety timeout — never stuck in loading
- Fallback query if `orderBy` field doesn't exist on documents

### Phase 4 — Category Tabs ✅
- `CategoryTabs` component exists and is imported
- Prompt Lab: All, Business, AI Tools, Marketing, Content Creation, Coding, Freelancing, Design
- Websites: All, Free Movie, Streaming, AI Tools, Learning, Jobs, Gaming, Music, Sports

### Phase 5 — Buttons Work ✅
- All nav buttons use `goPage()` — no dead clicks
- Footer links navigate correctly
- WhatsApp links open in new tab

### Phase 6 — Profile Fixed ✅
- `UserChip` — small circular avatar, top-right navbar placement
- Dropdown with smooth animation (AnimatePresence), closes on outside click
- Dropdown contains: Profile, Admin Panel (admin only), Logout
- `ProfileModal` — upload works via `ProfilePictureUpload` component
- Saved to Firebase, persists via `onAuthStateChanged`

### Phase 7 — AI Assistant ✅ (NEW)
- **Always visible** floating bottom-right button
- Mounted in `App()` return — does NOT disappear on page change
- Clean chat panel with smooth animation
- Mobile-friendly (responsive width)
- Sends to Anthropic Claude API with STEA Kiswahili system prompt
- Fallback error message in Kiswahili if API fails
- Does NOT conflict with profile dropdown (different z-index layers)

### Phase 8 — Admin Panel ✅
- All sections present and functional in `AdminPanel.jsx`
- Forms save to Firestore via `addDoc`/`updateDoc`
- Edit/delete works per section

### Phase 9 — Deal Flow ✅
- Deal → payment instructions → proof upload → admin review → subscription creation

### Phase 10 — Cleanup ✅
- Removed duplicate Firebase imports
- `vite.config.ts` — base changed from `/STEA4/` to `/` for Vercel
- Firebase chunks split for faster loading

---

## Files to Delete from Repo

```
firebaseConfig.js          ← DELETE (duplicate, unused)
firebase-applet-config.json ← DELETE (config now in firebase.js)
firebase-blueprint.json     ← DELETE (unused)
metadata.json               ← DELETE (AI Studio artifact)
```

---

## Environment Setup

No `.env` needed — Firebase config is embedded in `src/firebase.js`.

For AI Assistant to work, the Anthropic API call goes through the browser directly. If you want to keep your API key private, create a simple Vercel Edge Function proxy instead.

---

## Deploy to Vercel

```bash
# 1. Install dependencies
npm install

# 2. Test locally
npm run dev

# 3. Build
npm run build

# 4. Deploy (Vercel CLI)
npx vercel --prod
```

**vercel.json** is already configured for SPA routing.

---

## Test Checklist After Deployment

- [ ] Homepage loads without empty flash
- [ ] Tech Tips shows skeleton → then content
- [ ] Tech Updates shows skeleton → then content  
- [ ] Courses shows skeleton → then content
- [ ] Deals shows skeleton → then content
- [ ] Prompt Lab category tabs filter correctly
- [ ] Websites category tabs filter correctly
- [ ] All nav buttons navigate (no dead clicks)
- [ ] Login/Register works (Google + Email)
- [ ] Profile avatar appears in navbar top-right
- [ ] Profile dropdown opens/closes and has Profile, Logout
- [ ] Profile image upload saves and persists on refresh
- [ ] AI Assistant bot icon visible bottom-right always
- [ ] AI Assistant chat works in Kiswahili
- [ ] AI Assistant stays visible when switching pages
- [ ] Admin panel accessible for admin email
- [ ] Admin forms save to Firestore
- [ ] Mobile menu works
- [ ] Footer links navigate correctly

---

## Firebase Collections Used

| Collection | Purpose |
|---|---|
| `tips` | Tech Tips |
| `updates` | Tech Updates |
| `courses` | Courses |
| `deals` | Deals |
| `prompts` | Prompt Lab |
| `websites` | Website Solutions |
| `duka` | Duka products |
| `sponsored_ads` | Popup/banner ads |
| `users` | User profiles |
| `site_settings` | Homepage content, about, contact |
| `faqs` | FAQ page |
| `fcm_tokens` | Push notification tokens |
| `orders` | Deal orders |
| `subscriptions` | User subscriptions |
| `payment_reviews` | Payment proof submissions |

---

## Admin Email
`isayamasika100@gmail.com` — auto-assigned admin role on login.
