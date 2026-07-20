# Growvisi UX & Perceived-Performance Standards

These are the platform-wide interaction standards every current and future
feature must follow. The goal: the shell never appears to reload, returning to a
page is near-instant, switches feel immediate, and every interaction gives
feedback in **under 50ms**. Grounded in the stack: Next.js 15 App Router,
React 19, React Query v5, Zustand, framer-motion.

---

## 1. Motion tokens

Use the shared tokens in [`apps/web/src/lib/motion.ts`](../apps/web/src/lib/motion.ts).
Never hard-code durations/easings.

| Token | Value | Use |
| --- | --- | --- |
| `MOTION.duration.fast` | 120ms | hovers, presses, small state |
| `MOTION.duration.base` | 180ms | route/content crossfade, dialogs |
| `MOTION.duration.slow` | 240ms | larger surface transitions |
| `MOTION.ease` | `[0.2, 0, 0, 1]` | standard decelerate |

All motion must respect `prefers-reduced-motion`. Use `usePrefersReducedMotion()`
(reactive) or `prefersReducedMotion()` (imperative). Buttons already downgrade
`active:scale` under `motion-reduce`.

---

## 2. Loading

Order of preference, always:

1. **Cached / stale data** (React Query `placeholderData: (prev) => prev`).
2. **Shaped skeleton** that matches the final layout 1:1.
3. Inline spinner — last resort only.

Rules:

- Never block the whole viewport for _data_. Full-screen loaders are reserved
  for pre-hydration / no-session states only.
- Inside the dashboard, use `DashboardContentLoader` (keeps sidebar mounted),
  never a `min-h-screen` loader over the shell.
- Route `loading.tsx` is for genuinely cold routes only. Warm routes render from
  the client Router Cache (`experimental.staleTimes`) without a skeleton flash.
- A route loader must match its mounted page's own skeleton — no
  route-loader → client-loader double flash.

---

## 3. Navigation

- The shell (sidebar + chrome) is **always** mounted and visible. Auth/onboarding
  gates render inside the content area only.
- Content crossfades between routes via `app/dashboard/template.tsx`
  (reduced-motion aware).
- Every sidebar route is prefetched (`<Link prefetch>` + hover data prefetch via
  `prefetchDashboardRoute`). Account-menu routes prefetch on hover.

---

## 4. Mutations — optimistic by default

Use [`useOptimisticMutation`](../apps/web/src/hooks/use-optimistic-mutation.ts).
The recipe it standardizes:

1. `optimisticUpdate` (runs in `onMutate`): cancel affected queries → snapshot →
   patch cache → return a rollback context.
2. `rollback` (runs in `onError`): restore the snapshot.
3. Errors map to customer-safe copy via `toUserMessage` and toast automatically.
4. `reconcile` (runs in `onSettled`): prefer a **targeted** `setQueryData` or a
   scoped invalidation over broad cache busting.

Never leave a control "controlled by server value" with no optimistic update —
the click must reflect immediately (selects, toggles, stage/owner/assignment).

Avoid redundant work: do not invalidate a query you just patched; do not
blanket-invalidate when a targeted patch is possible. Realtime `message.new`
patches the cache directly and does **not** re-invalidate stats on every message.

---

## 5. Buttons & controls

- Use the shared `Button` with `isLoading` for in-flight state. It shows a
  spinner, sets `aria-busy`/`data-pending`, and disables the control.
- Immediate pressed state (`active:scale-[0.98]`) is built in — feedback < 50ms.
- Never disable-without-feedback. Controlled selects update their value
  optimistically, not after a refetch.
- Feedback hierarchy: optimistic UI is the primary signal; toast is
  confirmation/error, never the only signal. No silent failures.

---

## 6. Rerender stability

- Context values must be memoized (`RealtimeProvider`).
- Subscribe to the narrowest store slice needed (`LocaleProvider` → `user.locale`
  only, not the whole `user`).
- Toasts live in an external store + portal viewport — firing a toast never
  rerenders the app tree.
- Memoize hot list items (`LeadCard`, contacts row, inbox row/message body) and
  pass **stable** callbacks (`useCallback`) + boolean flags (e.g. `dragging`)
  rather than broad objects.

---

## 7. Consistency

One `Button`, one skeleton family (`page-loading`/`loading`), one dialog and one
toast pattern, one brand loader (`GrowvisiLogoLoader`). Reuse them everywhere.

### Deliberate non-goals (documented)

- **Contacts table virtualization:** the table is server-paginated (≤50 rows per
  page), so the DOM is already bounded. Memoized rows cover the rerender cost;
  virtualization would add complexity for little gain. Revisit only if page size
  grows substantially.
- **Inbox thread virtualization:** deferred — variable-height media messages plus
  auto-scroll/anchor behavior make virtualization high-risk. The inbox list is
  already virtualized; message bodies are memoized and lazy-load media in view.

---

## Checklist for new features

- [ ] Uses `useOptimisticMutation` (or the same recipe) for every write.
- [ ] Every control gives < 50ms feedback (`Button.isLoading` / optimistic value).
- [ ] Lists use `placeholderData` so return/refilter shows prior data, not a skeleton.
- [ ] Any loader is content-area (never covers the shell) and matches the page shape.
- [ ] Motion uses `MOTION` tokens and respects reduced motion.
- [ ] Context values memoized; store selectors narrow; hot rows memoized with stable props.
- [ ] No blanket invalidation where a targeted `setQueryData` works.
