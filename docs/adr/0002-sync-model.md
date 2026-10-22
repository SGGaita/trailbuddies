# ADR 0002: Progress as an append-only event log, synced through an outbox

**Status:** accepted · 22 Oct 2026

## Context
Children play offline on shared tablets, phones and laptops. A child can play on two devices before either syncs. Overwriting "the latest progress" would lose work or double-count treasures.

## Decision
- Progress changes are **events** (`lesson_completed`, `item_answered`, `treasure_earned`, `treasure_spent`, `badge_awarded`) with **ULID** ids created on the device.
- Events go to a local **outbox** first (Dexie on web, op-sqlite on mobile, behind the `OutboxAdapter` interface in `packages/sync`) and are sent to `POST /sync/events` in batches; the server returns events from other devices since a cursor.
- **Derived state** (stars, wallet, badges) is always recomputed from events with `deriveState()`. Best stars per lesson win; the wallet is earned minus spent and never goes below zero.
- Grown-up-edited records (profiles, custom lessons, settings) use last-write-wins with server timestamps.

## Consequences
- Merging is set union by id: no conflicts for progress.
- Spends are re-checked against the server balance; a rare overspend is rolled back with a friendly message.
- Sprint 0 keeps the demo family in browser storage; Sprint 2 switches screens to events without changing their props.
