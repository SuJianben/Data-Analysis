import type { DistributionPoint } from "@/types/analytics";

export type DistributionQuadrant = "high-high" | "low-high" | "high-low" | "low-low";

export type RankedDistributionPoint = DistributionPoint & {
  index: number;
  xRank: number;
  yRank: number;
  quadrant: DistributionQuadrant;
};

function buildPercentileRanks(values: number[]): number[] {
  if (values.length <= 1) return values.map(() => 0.5);

  const sorted = values.map(Number).sort((a, b) => a - b);
  const rankByValue = new Map<number, number>();

  for (let start = 0; start < sorted.length;) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1] === sorted[start]) end += 1;
    rankByValue.set(sorted[start], ((start + end) / 2) / (sorted.length - 1));
    start = end + 1;
  }

  return values.map((value) => rankByValue.get(Number(value)) ?? 0.5);
}

export function resolveDistributionQuadrant(xRank: number, yRank: number): DistributionQuadrant {
  if (xRank >= 0.5) return yRank >= 0.5 ? "high-high" : "high-low";
  return yRank >= 0.5 ? "low-high" : "low-low";
}

export function rankDistributionPoints(points: DistributionPoint[]): RankedDistributionPoint[] {
  const xRanks = buildPercentileRanks(points.map((point) => point.x));
  const yRanks = buildPercentileRanks(points.map((point) => point.y));

  return points.map((point, index) => ({
    ...point,
    index,
    xRank: xRanks[index],
    yRank: yRanks[index],
    quadrant: resolveDistributionQuadrant(xRanks[index], yRanks[index]),
  }));
}
