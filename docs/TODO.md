# Favicon Maker — UI/UX Task List

Ordered by platform (Desktop first), then urgency: Critical → High → Medium → Low.
All issues sourced from full UX/accessibility audit (April 2026).

---

## 🖥️ Desktop

### 🔴 Critical

- [ ] **Editor canvas + preview thumbnails render SVG preset icons severely cropped**
  `src/components/Editor.tsx`, `src/lib/applyEdits.ts`, `src/components/previews/useFaviconDataUrl.ts` — When a preset SVG icon (24×24 viewBox) is loaded, `state.imgWidth=24` and `state.imgHeight=24` are used in the cover-ratio calculation in both the Konva editor and `applyEdits`. The rasterized canvas is 400×400 but `iw/ih=24` gives `coverRatio=16.67`, which causes the image to render at a massive scale and appear almost entirely outside the canvas bounds — only a small corner of the icon is visible. Fix: when `imageEl` is a canvas (SVG raster path), override `iw/ih` with `imageEl.width / imageEl.height` instead of relying on `state.imgWidth`. Apply the same fix in `useFaviconDataUrl` (preview path) and `zipBuilder` (export path).

---

### 🟠 High

- [x] **Left panel has no scroll affordance**
  `src/App.tsx` — The left panel scrolls vertically (controls below the canvas: Zoom, Rotation, Background, Shape), but nothing indicates this. No scrollbar hint, no bottom fade gradient. Users who don't discover the scroll miss all editing controls.
  **Fix:** Add a `pointer-events-none` bottom fade gradient overlay on the left panel inner div when content overflows. Use the same pattern as the sticky ExportButton.

- [x] **Icon slider has no horizontal scroll affordance**
  `src/components/PresetIconSlider.tsx` — Only ~8 icons are visible at desktop width. The overflow indicator (`·`) is invisible as a scroll hint. Nothing signals "scroll right for 10 more icons."
  **Fix:** Add a right-side fade gradient + subtle right-arrow chevron that appears when scrollable. Hide it once the user scrolls to the end.

- [x] **"Replace image" button is undiscoverable**
  `src/App.tsx` — Renders as a tiny `text-slate-500` link with a 14px icon — reads as a caption, not an action. Most users won't realize they can swap the image.
  **Fix:** Style as a small pill button (`border border-slate-200 rounded-full px-3 py-1.5 text-sm`) with visible affordance.

- [x] **Desktop layout wastes 300px on each side at 1440px**
  `src/App.tsx` — `max-w-5xl` (1024px) container with `border-x` leaves large white gutters at wide viewports. The product looks "floating" and unfinished.
  **Fix:** Expand to `max-w-6xl` or `max-w-7xl`, or add a subtle full-width `bg-slate-50/30` background so the gutters don't look accidental.

---

### 🟡 Medium

- [x] **No loading skeleton when image/icon is first applied**
  `src/components/Editor.tsx` — When clicking a preset icon, the canvas area is invisible for a moment while `rasterizeSvg` resolves async. The layout reflowing from "no image" to "has image" creates a visible flash/jump.
  **Fix:** Show a shimmer skeleton in the canvas slot during the async load (gray rounded rectangle, same dimensions as the editor).

- [x] **Right-panel empty state shows no real output example**
  `src/App.tsx` — The feature cards describe the tool's capabilities but show zero examples of what an actual exported favicon looks like in a browser tab or home screen. The user uploads completely blind.
  **Fix:** Replace or supplement the feature grid with a static mockup preview showing a realistic favicon in context (browser tab + mobile icon). "See what you get" converts better than "here's what this tool does."

- [x] **Preview section labels ("BROWSER TAB", "BOOKMARKS BAR", "MOBILE BROWSER") add visual noise**
  `src/components/previews/BrowserTabPreview.tsx`, `BookmarksPreview.tsx`, `MobileBrowserPreview.tsx` — The uppercase tracking labels are redundant; the mockups are self-explanatory. They make the right panel feel like a technical spec sheet.
  **Fix:** Remove the uppercase labels, or replace with very subtle `text-[10px] text-slate-300` inline labels inside each mockup frame.

- [x] **"Transparent" toggle button style is inconsistent with the rest of the UI**
  `src/components/Controls.tsx` — The active Transparent state uses `bg-slate-800 text-white` — a dark heavy pill that looks like a destructive action, not matching any other control style.
  **Fix:** Use the same orange selected-state pattern as shape tiles: `border-2 border-orange-400 bg-orange-50 text-orange-700` when active.

- [x] **No indicator that previews update live**
  `src/App.tsx` / preview components — The preview panels update in real time but the user has no way of knowing until they drag. No "Live" badge, no animation on first render.
  **Fix:** Add a brief pulse animation on the preview thumbnails when they first render after an image loads. Or add a small `● Live` dot next to the right-panel header.

---

### 🟢 Low

- [x] **"Or start with a free icon" label has insufficient contrast**
  `src/components/PresetIconSlider.tsx` — The label uses `text-slate-400` (~4.1:1 vs white, barely AA) and "MIT license · fully editable" uses `text-slate-300` (~2.4:1, fails WCAG AA).
  **Fix:** Bump to `text-slate-500` and `text-slate-400` respectively.

- [x] **Missing page meta description and OG tags**
  `index.html` — No `<meta name="description">`, no `<meta property="og:*">`. Zero social sharing support and no SEO description.
  **Fix:** Add `<meta name="description" content="Free favicon generator — upload a logo, edit it, export PNG + ICO + Apple Touch Icon in one click. No account needed.">` and basic OG tags.

---

## 📱 Mobile

### 🟠 High

- [ ] **Mobile empty state — bottom 65% of screen is dead space**
  `src/App.tsx` — On 390px the upload zone + icon slider fills only the top third of the screen. Everything below the icon slider to the bottom tab bar is blank white.
  **Fix:** Show the feature cards ("Browser & Bookmarks", "iOS & Android", "Live preview", "One-click export") below the icon slider in the mobile Edit tab when no image is loaded. This content exists on desktop — it just never renders on mobile.

- [ ] **Header is cramped on narrow screens**
  `src/App.tsx` — "Favicon Maker" and "✓ Free · No account needed" share one header row on 390px. The trust signal gets squeezed to ~120px and loses impact.
  **Fix:** On mobile (`md:hidden`), hide the "Free · No account needed" text from the header and place it below the upload zone instead — closer to where the user makes the upload decision.

---

### 🟢 Low

- [ ] **Icon slider button accessibility — phantom img refs in accessibility tree**
  `src/components/PresetIconSlider.tsx` — The accessibility tree snapshot shows icon buttons containing `img` refs, which may cause screen readers to double-announce button content despite `aria-hidden="true"` on the SVGs. Verify with VoiceOver and fix if needed.

---

## ✅ Completed

- [x] **JPEG modal missing Cancel on initial upload** — `UploadZone.tsx`
- [x] **Export button hidden below scroll fold** — `App.tsx`
- [x] **No export success feedback** — `ExportButton.tsx`
- [x] **Upload zone not keyboard/screen-reader accessible** — `UploadZone.tsx`
- [x] **Shape buttons missing `aria-pressed`** — `Controls.tsx`
- [x] **Slider focus ring missing** — `Controls.tsx`
- [x] **Export button has no accessible loading state** — `ExportButton.tsx`
- [x] **Shape tiles show static gray — don't reflect actual logo** — `Controls.tsx`
- [x] **Background swatch shows white when transparent is active** — `Controls.tsx`
- [x] **Zoom slider center point ≠ 100%** — `Controls.tsx`
- [x] **"Upload a different image" reads as destructive** — `App.tsx`
- [x] **Score metric bars give no improvement guidance** — `FaviconScore.tsx`
- [x] **Grade label too visually weak** — `FaviconScore.tsx`
- [x] **Empty right panel on first load** — `App.tsx`
- [x] **Two uppercase section headers stacked in right panel** — `App.tsx`
- [x] **Controls sections have no visual separation** — `Controls.tsx`
- [x] **Upload zone uses emoji icon** — `UploadZone.tsx`
- [x] **Trust signal "Free · No account needed" too small** — `App.tsx`
- [x] **Rotation slider has no snap/visual indicator at 0°** — `Controls.tsx`
- [x] **Zoom slider has no snap/visual indicator at 100%** — `Controls.tsx`
- [x] **MobileBrowserPreview constrained to w-1/2 in narrow panel** — `App.tsx`
- [x] **Color input has no accessible label** — `Controls.tsx`
- [x] **Preset icon slider below upload zone and in has-image panel** — `PresetIconSlider.tsx`, `UploadZone.tsx`, `App.tsx`
