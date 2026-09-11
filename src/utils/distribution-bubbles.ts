import type { DistributionPoint } from "@/types/analytics";
import { resolveDistributionQuadrant, type DistributionQuadrant } from "@/utils/distribution-scale";

export type DistributionBubblePoint = {
  id: string;
  x: number;
  y: number;
  count: number;
  labels: string[];
  details: string[];
  xRatio: number;
  yRatio: number;
  quadrant: DistributionQuadrant;
};

export type DistributionBubbleScale = {
  points: DistributionBubblePoint[];
  xMinimum: number;
  xMaximum: number;
  yMinimum: number;
  yMaximum: number;
};

type BubbleGroup = {
  x: number;
  y: number;
  labels: string[];
  details: string[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createLogScale(values: number[], inset: number) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const minimumLog = Math.log1p(Math.max(0, minimum));
  const maximumLog = Math.log1p(Math.max(0, maximum));
  const span = maximumLog - minimumLog;

  return {
    minimum,
    maximum,
    ratio(value: number) {
      if (span === 0) return 0.5;
      const normalized = (Math.log1p(Math.max(0, value)) - minimumLog) / span;
      return inset + normalized * (1 - inset * 2);
    },
  };
}

export function buildDistributionBubbles(points: DistributionPoint[]): DistributionBubbleScale {
  if (!points.length) {
    return { points: [], xMinimum: 0, xMaximum: 0, yMinimum: 0, yMaximum: 0 };
  }

  const grouped = new Map<string, BubbleGroup>();
  for (const point of points) {
    const x = Number(point.x || 0);
    const y = Number(point.y || 0);
    const key = JSON.stringify([x, y]);
    const current = grouped.get(key);

    if (current) {
      current.labels.push(point.label);
      current.details.push(...point.details);
    } else {
      grouped.set(key, { x, y, labels: [point.label], details: [...point.details] });
    }
  }

  const groups = Array.from(grouped.values());
  const xScale = createLogScale(groups.map((group) => group.x), 0.035);
  const yScale = createLogScale(groups.map((group) => group.y), 0.09);

  return {
    xMinimum: xScale.minimum,
    xMaximum: xScale.maximum,
    yMinimum: yScale.minimum,
    yMaximum: yScale.maximum,
    points: groups
      .map((group, index) => {
        const xRatio = xScale.ratio(group.x);
        const yRatio = yScale.ratio(group.y);
        const labels = unique(group.labels);
        return {
          id: `distribution-bubble-${index}-${group.x}-${group.y}`,
          x: group.x,
          y: group.y,
          count: group.labels.length,
          labels,
          details: unique(group.details),
          xRatio,
          yRatio,
          quadrant: resolveDistributionQuadrant(xRatio, yRatio),
        };
      })
      .sort((a, b) => b.count - a.count || b.x - a.x || b.y - a.y),
  };
}

export function resolveBubbleRadius(count: number) {
  return Math.min(21, 5 + Math.sqrt(Math.max(0, count - 1)) * 1.7);
}
