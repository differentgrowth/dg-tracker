interface RankingPositionSource {
  avgPosition: number | null;
  position: number | null;
  source?: string | null;
}

export function getRankingPosition(
  snapshot: RankingPositionSource | null | undefined
): number | null {
  if (!snapshot) {
    return null;
  }

  if (snapshot.source === "gsc") {
    return snapshot.avgPosition;
  }

  return snapshot.position ?? snapshot.avgPosition;
}

export function formatRankingPosition(position: number | null): string {
  if (position === null) {
    return "—";
  }

  return Number.isInteger(position) ? String(position) : position.toFixed(1);
}
