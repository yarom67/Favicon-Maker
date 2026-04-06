# Favicon Maker — UI/UX Task List

Ordered by urgency: Critical → High → Medium → Low.
All issues sourced from full UX/accessibility audit (April 2026).

---

## 🔴 Critical

- [x] **JPEG modal missing Cancel on initial upload**
  `src/components/UploadZone.tsx` — JPEG color picker modal has no Cancel button. If user drops the wrong JPEG, they're stuck and must click Continue. The replace-image flow already has Cancel — mirror that pattern here.

- [x] **Export button hidden below scroll fold**
  `src/App.tsx` — ExportButton sits at bottom of a scrollable 440px left panel after Upload + 400px Editor + Controls. Primary CTA is invisible on most viewport heights. Pin it with `sticky bottom-0` + white fade gradient, or move it into the header.

- [x] **No export success feedback**
  `src/components/ExportButton.tsx` — After ZIP downloads, button silently resets to "↓ Export ZIP". Users often think it failed. Add a brief "✓ Downloaded!" state for ~2s before resetting.

---

## 🟠 High

- [x] **Upload zone not keyboard/screen-reader accessible**
  `src/components/UploadZone.tsx:129` — Clickable div has no `role="button"`, no `aria-label`, no `tabIndex`, no keyboard handler. Screen readers skip it entirely. Add `role="button"`, `aria-label="Upload image — PNG, JPEG, or SVG"`, `tabIndex={0}`, and Enter/Space `onKeyDown`.

- [x] **Shape buttons missing `aria-pressed`**
  `src/components/Controls.tsx:131` — Toggle buttons don't set `aria-pressed`. Screen readers cannot announce which shape is active. Add `aria-pressed={state.shapeMask === value}` to each shape button.

- [x] **Slider focus ring missing**
  `src/components/Controls.tsx:41` — `appearance-none` suppresses browser focus ring with no replacement. Keyboard users get no visual feedback when navigating sliders. Add `[&:focus-visible]:ring-2 [&:focus-visible]:ring-orange-400 [&:focus-visible]:ring-offset-2`.

- [x] **Export button has no accessible loading state**
  `src/components/ExportButton.tsx:37` — Spinner is visual only. Screen readers get no feedback. Add `aria-busy={isExporting}` to button and an `aria-live="polite"` region announcing start/completion.

- [x] **Shape tiles show static gray — don't reflect actual logo**
  `src/components/Controls.tsx:23` — Preview tiles use hardcoded `bg-slate-700` regardless of user's image. Replace with a tiny 32px favicon thumbnail (via `useFaviconDataUrl`) rendered inside each shape tile. Turns abstract into real previews.

- [x] **Background swatch shows white when transparent is active**
  `src/components/Controls.tsx:104` — `value={state.bgColor || '#ffffff'}` makes the color input show white even when bgColor is `''` (transparent). Misleads user into thinking they've set a white background. Show a checkerboard swatch pattern or hide the color picker entirely when transparent is active.

---

## 🟡 Medium

- [x] **Zoom slider center point ≠ 100%**
  `src/components/Controls.tsx:61` — Linear range `0.25–4` puts the slider midpoint at ~2.1x, not 1x. Hard to intuitively land on natural zoom. Use a logarithmic scale or split the track so 1x sits visually at center.

- [x] **"Upload a different image" reads as destructive**
  `src/App.tsx:136` — Tiny `text-slate-400` link. Wording "different image" implies edits will be wiped. Rename to "Replace image", give it a small icon, and style as a pill button so it reads as safe/secondary — not a scary action.

- [x] **Score metric bars give no improvement guidance**
  `src/components/FaviconScore.tsx` — "Simplicity 43" in red with no context. Add a tooltip/info icon per metric: one-sentence explanation of what it means and how to improve it.

- [x] **Grade label too visually weak**
  `src/components/FaviconScore.tsx:203` — "Pixel perfect" / "Needs some love" uses `text-xs text-slate-400`, same weight as all other secondary text. This is the emotional summary — should be `text-sm font-medium` in the score's color (emerald/orange/red).

- [x] **Empty right panel on first load**
  `src/App.tsx` — Right panel shows blank beige box with "LIVE PREVIEW" before any image is uploaded. Show greyed-out placeholder preview cards or a brief explainer so users understand what they'll get before uploading.

- [x] **Two uppercase section headers stacked in right panel**
  `src/App.tsx:237` + `src/components/FaviconScore.tsx:191` — "LIVE PREVIEW" and "FAVICON QUALITY" are both `uppercase tracking-wide` labels directly adjacent. Visual noise. Remove "LIVE PREVIEW" from App.tsx — the previews speak for themselves.

- [x] **Controls sections have no visual separation**
  `src/components/Controls.tsx:51` — Zoom, Rotation, Background, Shape sit in flat `gap-6` with no dividers. Hard to scan sections at a glance. Add `border-t border-slate-100 pt-6` between sections or wrap each in a subtle card.

---

## 🟢 Low

- [x] **Upload zone uses emoji icon**
  `src/components/UploadZone.tsx:143` — `🖼️` emoji renders inconsistently across OS/browser, can't be styled or themed. Replace with an SVG icon (e.g. Lucide `ImagePlus` or `Upload`).

- [x] **Trust signal "Free · No account needed" too small**
  `src/App.tsx:226` — `text-xs text-slate-400` at top-right corner. Highest-value conversion signal buried. Bump to `text-sm text-slate-500` and consider adding a checkmark icon or placing a copy below the upload zone.

- [ ] **Rotation slider has no snap/visual indicator at 0°**
  `src/components/Controls.tsx:72` — No center mark. Hard to land back on exactly 0° by dragging. Add a subtle tick mark at center of the track, or snap-to-zero when within ±2° of center.

- [x] **MobileBrowserPreview constrained to w-1/2 in narrow panel**
  `src/App.tsx:163` — On smaller desktop viewports (1024px), the right panel is ~560px and the preview is capped at ~140px wide, looking oddly tiny. Either allow full-width or set a sensible `min-w` / `max-w` instead.

- [x] **Color input has no accessible label**
  `src/components/Controls.tsx:103` — Background `<input type="color">` has no associated `<label>` element with `htmlFor`. Screen readers won't announce what this color picker controls.

---

## Notes

- Accessibility issues (🟠 High) should be batched and addressed together — they share the same effort pattern.
- Shape tiles improvement (🟠) has the highest UX visibility payoff per effort.
- Export feedback (🔴) is a 5-minute fix with outsized trust impact — do this first.
