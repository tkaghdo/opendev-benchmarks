import assert from "node:assert/strict";
import test from "node:test";
import { selectUpdatedInWindow } from "./window";

test("keeps nodes newer than cutoff and last ingest, ordered updated desc", () => {
  const cutoff = new Date("2025-01-01T00:00:00Z");
  const last = new Date("2026-08-01T00:00:00Z");
  const nodes = [
    { updatedAt: "2026-08-17T00:00:00Z" },
    { updatedAt: "2026-08-02T00:00:00Z" },
    { updatedAt: "2026-07-01T00:00:00Z" },
    { updatedAt: "2024-01-01T00:00:00Z" },
  ];
  const { inWindow, reachedEnd } = selectUpdatedInWindow(nodes, cutoff, last);
  assert.equal(inWindow.length, 2);
  assert.equal(reachedEnd, true);
});

test("stops at cutoff when there is no prior ingest", () => {
  const cutoff = new Date("2025-08-17T00:00:00Z");
  const nodes = [
    { updatedAt: "2026-01-01T00:00:00Z" },
    { updatedAt: "2025-01-01T00:00:00Z" },
  ];
  const { inWindow, reachedEnd } = selectUpdatedInWindow(nodes, cutoff, null);
  assert.equal(inWindow.length, 1);
  assert.equal(reachedEnd, true);
});
