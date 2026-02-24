# Frontend Design Suggestions

Design audit of RadWordle's frontend components with prioritized improvement suggestions.

## 1. Typography — Trim the Font Stack

We load **5 fonts** (Geist Sans, Geist Mono, Fredoka, Baloo 2, Poppins) but Baloo 2 does almost all the heavy lifting. Fredoka appears registered but unused. Poppins shows up rarely.

**Suggestion:** Drop Fredoka entirely. Consider dropping Poppins too — use Baloo 2 at weight 700 where Poppins is currently used. This saves ~100-200KB of font downloads and reduces layout shift. Two fonts is the sweet spot: **Baloo 2** for display/UI and **Geist Sans** for body text.

## 2. Color System — Formalize It

Colors are scattered as raw hex values across every component (`#1a2e5a`, `#3d4d68`, `#407763`, etc.). This makes consistency fragile.

**Suggestion:** Define semantic CSS variables or Tailwind `@theme` tokens:

- `--color-surface` for the slate blue buttons (`#3d4d68`)
- `--color-surface-hover` (`#4a5b7a`)
- `--color-success`, `--color-warning`, `--color-error` for the feedback triad
- `--color-accent` for amber CTAs

This would make it trivial to adjust the palette globally and prevent the drift that already exists (e.g., `bg-green-500` in toasts vs `bg-[#407763]` in stats — these are different greens for the same semantic meaning "correct").

## 3. Feedback Color Inconsistency

This is the biggest design coherence issue. The same semantic meaning ("correct", "partial", "incorrect") uses different colors in different places:

| Context | Correct | Partial | Incorrect |
|---------|---------|---------|-----------|
| Hints/borders | `#407763` (muted green) | `#f6d656` (warm yellow) | `#9e4a4a` (muted red) |
| Toasts | `bg-green-500` (Tailwind) | `bg-yellow-500` (Tailwind) | `bg-red-500` (Tailwind) |
| Stats bars | `bg-[#407763]` / `bg-gray-400` | — | — |
| Archive badges | `bg-green-600` (Tailwind) | — | `bg-red-600` (Tailwind) |

**Suggestion:** Pick ONE set of feedback colors and use them everywhere. The custom palette (`#407763`/`#f6d656`/`#9e4a4a`) is more distinctive and fits the dark navy theme better than generic Tailwind greens. Use these for toasts, badges, and bars too.

## 4. Button Sizing — Create a System

At least 4 button size patterns exist:

- `px-2 sm:px-4 py-1.5 sm:py-2` (header nav buttons)
- `px-4 sm:px-8 py-3 sm:py-4` (submit button)
- `px-6 py-2` (view results)
- `px-6 py-3` (modal buttons)

**Suggestion:** Define 2-3 button sizes (small, medium, large) as reusable class groupings or a `<Button>` component. Header buttons are "small", submit/share are "large", modal actions are "medium". This removes guesswork and makes the UI feel more intentional.

## 5. Modal Duplication

`StatsModal` and `ResultsModal` (inside GameClient) share ~80% identical markup: same backdrop, same card gradient, same stats grid, same guess distribution, same "How You Compare" section. They've drifted slightly — StatsModal uses `bg-gradient-to-r from-blue-500 to-indigo-600` for the comparison section, while ResultsModal uses `bg-[#3d4d68]`.

**Suggestion:** Extract a shared `<ModalShell>` component for the backdrop + card chrome, and a `<StatsSection>` component for the repeated stats/distribution/comparison blocks. This isn't just a code quality play — it eliminates visual drift between the two modals.

## 6. Background Noise — The Decorative Images

The three decorative medical images (`placeholder-xray.png`, `placeholder-scan.png`, `placeholder-ct.png`) at 20-40% opacity behind the radial vignette are effectively invisible in most situations and add DOM complexity + potential performance cost. They also render differently on desktop vs mobile (two separate layout trees for the same decorative effect).

**Suggestion:** Either make them more visible and intentional (e.g., a single subtle watermark-style image), or remove them. A subtle CSS noise/grain texture or a single radial gradient would give atmosphere without the overhead. Alternatively, a subtle animated gradient mesh would feel more modern.

## 7. Micro-interactions — Low-Hanging Wins

Currently there are only three animations: toast slide-in, cookie consent slide-up, and stats recovery slide-down. The game itself has no animation when:

- A hint is revealed (it just appears)
- The image border color changes
- A guess is submitted
- The results modal opens

**Suggestions:**

- **Hint reveal:** Fade-in + slight upward slide (0.3s) when a new hint appears. This is the core game moment and deserves emphasis.
- **Image border:** The ring color change already has `transition-all duration-300` — adding a brief scale pulse (`scale-[1.01]` for 200ms) when the border first appears would make the feedback feel more alive.
- **Modal entrance:** Add a subtle scale-up from 95% + fade-in. Right now modals just pop into existence.
- **Guess distribution bars:** They have `transition-all duration-300` but only animate on re-render, not on initial paint. Animating width from 0 on mount would create a satisfying "fill" effect.

## 8. Mobile Input Area — Polish the Fixed Bar

The mobile fixed input bar (`GameClient.tsx:347`) uses `bg-gradient-to-t from-[#0f1c2e] via-[#0f1c2e]/80 to-transparent`. This gradient works but the transparent-to-dark transition can look harsh depending on what's scrolling behind it — content partially shows through the semi-transparent middle zone.

**Suggestions:**

- Add `backdrop-blur-sm` to the fixed container so content scrolling behind it blurs into a frosted-glass effect rather than awkwardly showing through the gradient.
- Round the top corners (`rounded-t-xl`) to make the input area feel like a deliberate "tray" or "dock" sitting at the bottom, rather than a gradient painted over the page edge.

## 9. Archive Browser — Visual Hierarchy

The archive list is a flat list of identical-looking rows. At 50+ days, it becomes a wall of same-colored rectangles.

**Suggestions:**

- Add visual grouping by month (small sticky headers like "January 2026").
- Make the "TODAY" row stand out more — currently it's the same `bg-[#3d4d68]` as every other row with just a tiny yellow badge. Consider a subtle border or different background tint.
- Use the game feedback colors (`#407763`/`#9e4a4a`/`#6b89b8`) for WON/LOST/PLAY badges instead of generic Tailwind `green-600`/`red-600`/`gray-600`, to tie them back to the core palette.

## 10. The Vignette Overlay — Too Heavy?

The radial vignette reaches **90% black** at the edges:

```
transparent 0% → transparent 45% → 0.3 black 70% → 0.75 black 88% → 0.9 black 100%
```

This is quite aggressive. The edges of the screen are nearly black, which can make the gradient background feel more like a solid dark color, especially on larger screens.

**Suggestion:** Soften it — cap at around 0.5-0.6 opacity at the edges. This lets more of the blue gradient breathe while still providing focus on the center content.

---

## Priority Matrix

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Unify feedback colors (toasts/badges/hints use same palette) | Low | High — coherence |
| 2 | Add hint reveal animation | Low | High — game feel |
| 3 | Extract color tokens to CSS variables | Medium | High — maintainability |
| 4 | Drop unused fonts (Fredoka, maybe Poppins) | Low | Medium — performance |
| 5 | Add modal entrance animation | Low | Medium — polish |
| 6 | Standardize button sizes | Medium | Medium — coherence |
| 7 | Extract shared modal components | Medium | Medium — prevents drift |
| 8 | Archive month grouping + TODAY emphasis | Medium | Medium — UX |
| 9 | Soften vignette overlay | Low | Low-Medium — aesthetics |
| 10 | Replace decorative bg images with CSS texture | Medium | Low — performance/simplicity |
