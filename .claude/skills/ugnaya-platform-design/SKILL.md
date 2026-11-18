---
name: ugnaya-platform-design
description: "UGNAYA's platform design rules: iOS 26 Liquid Glass on the control layer, the same iPhone look on Android with frosted surfaces, solid content. Use whenever building or changing UI (buttons, headers, tab bar, cards, sheets, floating surfaces, camera/photo screens) so each platform gets its look and the shared components are used, or built once, correctly."
---

# Platform design: Liquid Glass on iOS, the iPhone look on Android

Adapted from Pawfetti, CarMind and Ulamin. Each rule came from a real bug or design review there. The
shared rules (fonts, icons, color tokens, props) are in CLAUDE.md's Design section; this skill
covers how each platform renders them.

**Decisions already made for UGNAYA** (same as Pawfetti, CarMind and Ulamin; change only if the owner does):
- Android gets the **same iPhone design**, with frosted surfaces where iOS has glass. No Material 3
  top bars, bottom nav, or square buttons.
- **Material Symbols** on both platforms, from one icon component; SF Symbols only in system-drawn
  iOS surfaces (widgets, the app icon's quick-action menu).
- **Brand and tokens: `docs/BRAND_AND_DESIGN_SYSTEM.md`** (owner's brief, 2026-11-06). Deep Navy `#1E2A78` primary, Purple `#7C3AED` accent and links, Orange `#FF6B35` reward, Yellow `#FFC247` points, Teal `#14B8A6` success. **Orange, yellow and teal carry dark ink text, never white, and are never body text on a light page** (use the `*-text` shades); `packages/ui-tokens/src/contrast.test.ts` enforces it. Tokens live in `packages/ui-tokens`; no hex in components.
- **Logo and icons:** the official brand board is the source of truth; the vector recreation, every layout and tone, and the app icons are in `packages/brand` (use `<Logo>` on the web, `packages/brand/assets/png/expo` for Expo). Never use the board image itself, never redraw the wordmark in a font, never recolour the ribbon.
- **Typefaces:** Montserrat for the wordmark, hero/display/title/heading styles and the wallet balance (never below 18 px, never for data); **Inter** for everything else (body, forms, buttons, tables, changing numbers with tabular digits). This departs from the shared playbook's "Inter everywhere" on purpose (owner's brief for UGNAYA).

**Build each shared component once in the app's `src/components/ui/`, then reuse.** Ulamin has working,
tested versions of everything named below (`~/Projects/ulamin/src/components/ui/`). Port from there
rather than writing a new one, strip anything Ulamin-specific (strings, features, data), and check
the APIs against the Expo SDK docs for the version in the app's `package.json`.

## iOS (26+): Liquid Glass on the control layer

Apple's rule: **glass is for controls and things that float over content, not for the content itself.**

| Element | Use | Notes |
|---|---|---|
| Tab bar | Expo Router `NativeTabs` (`src/components/app-tabs.tsx`) | The system draws the glass bar. Never replace it with an app-drawn bar. |
| In-page header actions (help, settings) | `GlassIconButton` | A round glass icon button. |
| Buttons in a native stack header (`headerRight`) | A plain icon button, no background | iOS 26 already wraps bar buttons in glass; a glass button inside shows twice. |
| Primary actions | `Button` (variant `primary`) | A primary-tinted glass capsule on iOS 26. |
| Things floating over content (pills on a photo, a tip above the tab bar) | `GlassSurface` | Give it a `fallbackStyle` (solid fill and border) for systems without glass. |
| Over a photo or the camera (dark in both themes) | Dark appearance on the glass components | White glyphs and text; a fixed accent where needed. |
| Content cards, list rows, settings groups, forms | **Solid** | Readable and fast to scroll; the glass controls stand out above them. |
| Filter and option chips, pickers inside content | **Solid** tonal | CarMind tried glass here and reverted it. |
| A guided tour or coach-mark card | Solid | It sits on a dark scrim, where glass turns murky gray. |

### Rules for glass
- **Gate on availability.** Glass exists only on iOS 26+, and some iOS 26 betas lacked the API:
  check `isLiquidGlassAvailable() && isGlassEffectAPIAvailable()` (`expo-glass-effect`) once, in the
  shared components, and fall back to solid surfaces. Screens never call `GlassView` directly.
- **Never clip glass** with `overflow: 'hidden'`. It cuts off the rim and shading. Corners come from
  `borderRadius` on the glass view itself.
- **Don't wrap neighbors in `GlassContainer`** unless they should melt into one shape: it merges
  glass closer than its `spacing` (it once fused a tab capsule and a separate camera button).
- **Keep text readable.** Theme-colored text on light glass; white text on dark glass over photos.
- **Reduce Transparency** is handled by the system for `GlassView`. Don't add translucency on top.

## Android: the iPhone design, frosted

Apply it through the shared components, never per screen.

| Element | Use |
|---|---|
| Tab bar | A floating frosted capsule like iOS 26's (icons only, the selected tab on a round capsule) in `app-tabs.android.tsx`. A live blur through expo-blur's `BlurTargetView` when the build has it, else a near-opaque page-color fill. |
| Header actions | Frosted circle: see-through card fill, hairline rim, soft shadow. One `frostedSurface()` helper (`frosted.ts`) shared by every frosted control. |
| Buttons | Capsules (full pill radius), the same shape as iOS 26's glass buttons. |
| Switches | The iPhone's switch, drawn: one `Toggle` primitive (`toggle.tsx` is the system `Switch`, `toggle.android.tsx` a wide track with a white pill thumb animated by Reanimated). Never the raw `Switch` in screens: on Android it's Material. |
| Stack headers | Centered titles (`headerTitleAlign: 'center'`) and a frosted back-chevron circle, set once in the root Stack. |
| Content | The same solid cards, lists and grouped settings as iOS. |
| Forms and editors | iOS's native page sheet; on Android a form sheet of the same shape (rounded top, dimmed screen behind, drag down or Back to close) with a `SheetHeader`, since Android sheets have none. |
| Full-screen modals (camera, photo, paywall) | No swipe-to-dismiss, so each keeps a visible close button. |

### Android gotchas (each one cost a debugging session)
- **Blur needs a target:** wrap what should be blurred in `BlurTargetView` and pass its ref as
  `blurTarget`. Android's blur ignores `borderRadius`, so clip it in a parent with
  `overflow: 'hidden'`. Check `globalThis.expo?.getViewConfig?.('ExpoBlur', 'ExpoBlurTargetView')`
  first: builds made before expo-blur was added don't have it, and rendering it there crashes.
- **Frosted controls in a native header** need a wrapper with padding and `collapsable={false}`:
  Android clips each header slot to its content (cutting shadows off square) and merges away a
  padding-only view unless `collapsable={false}`.
- **Rounded corners need a background from the start:** a view that gains a `backgroundColor` later
  (e.g. on selection) keeps square corners. Mount a separate view with its color instead.
- **Launcher and shortcut icons:** adaptive icons (background color plus a centered glyph layer);
  a plain icon gets shrunk inside the launcher's own white circle.
- **Text that wraps inside a flex row with `numberOfLines`** can be measured as one line and
  clipped. Prefer labels short enough for one line.
- **expo-router/ui `TabList asChild`** passes its child's style through a Slot, which rejects style
  arrays: flatten with `StyleSheet.flatten`.

## Swipe to remove (rows and cards)
Swipe left reveals **Remove** (never "Delete"), like iOS Mail. Use one shared row, `SwipeableRow`
(`swipeable-row.tsx`) with `useGuardedPress` (`swipe-press-guard.ts`), ported from Ulamin. Never
hand-roll a swipe, and don't leave a bin button on every card.
- **The red sits behind the row:** `containerStyle` gets the danger fill and
  `childrenContainerStyle` the row's own surface. On a card, put the swipe inside the card (its
  `overflow: 'hidden'` rounds it) or pass `radius`; a swipe wrapped around a card looks detached.
- **Guard every press inside it:** on Android a press still fires when the finger lifts after a
  swipe, and tapping an open row must only close it. A pressable rendered by the parent of the swipe
  sits outside the guard's context: move it into a small child component.
- **Ask first only when it can't be undone** ("Remove …?" with a Remove button); otherwise remove at once.
- **Accessibility:** the row carries a `remove` accessibility action labeled with the item's name.
- **Test on Android** with a slow swipe and a quick flick: the flick must not tap the row.

## Platform-specific code
- When markup differs by platform, use `name.ios.tsx` / `name.android.tsx` files behind one shared
  props type (`name.types.ts`), not `Platform.OS` branches through the JSX. Small style or prop
  differences can stay inline.
- **Gotcha:** after adding a new `.ios.tsx` / `.android.tsx` file next to an existing one, Metro
  keeps serving the old resolution. Restart with `npx expo start -c` and confirm the served bundle
  has the new code before judging the result.

## Verify on both
- **iOS:** an iOS 26+ simulator or device: the glass really renders (content refracts behind it),
  not a flat fallback.
- **Android:** the tab bar, capsule buttons, centered titles, and no glass-only styling leaving
  something invisible or unstyled.
- Use the simulators the owner already has open; never boot another.
- Then `npx expo lint`, `npx tsc --noEmit`, `npm test`.
