import assert from "node:assert/strict";
import test from "node:test";

import {
  formatRankingPosition,
  getRankingPosition,
} from "@/lib/ranking-position";

test("getRankingPosition prefers GSC avgPosition over exact position", () => {
  assert.equal(
    getRankingPosition({ source: "gsc", avgPosition: 4.25, position: null }),
    4.25
  );
  assert.equal(
    getRankingPosition({ source: "serp", avgPosition: null, position: 3 }),
    3
  );
});

test("formatRankingPosition keeps integers compact and averages to one decimal", () => {
  assert.equal(formatRankingPosition(null), "—");
  assert.equal(formatRankingPosition(3), "3");
  assert.equal(formatRankingPosition(3.27), "3.3");
});
