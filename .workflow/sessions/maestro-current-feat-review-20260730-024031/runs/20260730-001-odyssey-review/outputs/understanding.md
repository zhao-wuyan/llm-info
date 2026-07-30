# Review Understanding

## Scope

Read-only review of `319ffe3` and `2cc7854` (`HEAD~2..HEAD`). No source changes were made.

## Verdict

`BLOCK` for implementation as-is. The seven requested changes are valid as product work, and three additional correctness defects should be included before implementation.

## Findings

### F1 - P1 - Leaderboard matching both misses and misassigns variants

Anchors: `src/model-index/match.js:3`, `src/model-index/match.js:38`, `src/model-index/match.js:75`, `src/model-index/build.js:31`.

The universal matcher drops `base`, `instruct`, and `thinking`, accepts owner prefixes, and prefers exact text even when its owner conflicts with the board organization. This causes actual cross-variant and cross-owner score assignment. At the same time, parenthetical effort suffixes such as `gpt-5 (high)` are not removed and remain unmapped.

Recommendation: introduce board-specific normalization. Collapse only recognized benchmark effort annotations such as `(high|medium|low|xhigh)` and thinking-token budgets; preserve semantic architecture variants. When organization evidence exists, reject incompatible owners. Prefer official/direct canonical evidence. `buildModelIndex` already keeps the highest score after variants map to one canonical ID.

### F2 - P1 - Generated model index is stale relative to the catalog

Anchors: `src/model-index/build.js:69`, `src/model-index/build.js:83`, `scripts/validate-model-index.js:5`.

The index declares an older `catalogGeneratedAt` than `models.json.generatedAt`, and validation does not compare the two files. The second commit adds 44 canonical IDs relative to its parent, so a stale index can omit newly matchable models.

Recommendation: regenerate both files together and make `validate:index` load `models.json`, require exact snapshot equality, and reject stale output.

### F3 - P1 - One deprecated provider contaminates canonical lifecycle

Anchors: `lib/lifecycle.ts:37`, `app/models/page.tsx:58`.

Canonical lifecycle takes the worst status across all channels. The current data has 65 canonical IDs with mixed active and deprecated/sunset channels. Enabling `onlyActive` removes the whole canonical model even where other channels remain active.

Recommendation: confirm lifecycle ownership. Prefer official model lifecycle where available; otherwise keep canonical availability active when at least one channel is active and expose channel-specific deprecation separately.

### F4 - P2 - Compare sorting rerenders an unbounded table

Anchors: `app/compare/page.tsx:75`, `app/compare/page.tsx:85`, `app/compare/page.tsx:95`, `app/compare/page.tsx:187`.

Every header click causes a server navigation, recomputes sorting/maxima, and renders all 402 mapped rows. The dominant cost is the full response/DOM, not `Array.sort` alone.

Recommendation: paginate after sorting the full filtered set, preserve URL state, and precompute one row view-model with board and price values once per request. Do not move the full dataset into a client bundle merely to hide latency.

### F5 - P2 - Requested model defaults do not match the registry

Anchor: `lib/model-columns.ts:28`.

Current model defaults are 12 columns. Requested defaults are exactly: released, context, ability, input, output, cacheRead, cacheWrite, weights, parameters.

### F6 - P2 - Column choices are URL-only and cannot represent empty selection

Anchors: `components/column-picker.tsx:22`, `components/column-picker.tsx:49`, `lib/model-columns.ts:77`.

There is no browser persistence. If every box is unchecked, the form emits no `cols` and parsing restores defaults. Use page-specific persisted keys and an explicit empty sentinel. Reset columns must clear only that table's key; reset filters must preserve column preferences.

## Requested Items

1. Confirmed as unmet: the three boolean filters remain separate controls. This is a requirement change because the current pricing-filter spec explicitly calls for a checkbox.
2. Confirmed as unmet: change model defaults only to the requested nine columns; leave other table defaults unchanged.
3. Confirmed as unmet: add browser persistence across navigation and refresh, with explicit reset-columns behavior.
4. Confirmed as unmet: `reset` remains `清除` / `Clear` on models, compare, providers, and sources and uses the same text-button style.
5. Confirmed: use pagination plus request-local row precomputation; sorting itself is not the primary bottleneck.
6. Confirmed and broader than reported: effort variants miss, while semantic variants and owners can be incorrectly merged. Apply typed normalization and official canonical preference.
7. Confirmed as unmet: remove the top `evidence-banner`; retain the source cards below. The footer already carries mapped/column counts.

## Security

No new credential exposure or untrusted-code execution was found in the two workflow changes. External data is generated in a read-only job and the privileged publish job only copies generated JSON.
