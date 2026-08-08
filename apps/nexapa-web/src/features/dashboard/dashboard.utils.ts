import type { ChartPeriod } from "./dashboard.types";

export function getPeriodDayCount(period: ChartPeriod): number {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
  }
}

export function generateEmptyGridPoints(
  days: number,
  width: number,
  height: number,
  padding: { top: number; bottom: number; left: number; right: number },
): Array<{ x: number; y: number; label: string }> {
  const usableWidth = width - padding.left - padding.right;
  const points: Array<{ x: number; y: number; label: string }> = [];

  for (let i = 0; i < days; i++) {
    const x = padding.left + (i / Math.max(days - 1, 1)) * usableWidth;
    const y = height - padding.bottom;
    const dayNum = i + 1;
    points.push({ x, y, label: `Day ${dayNum}` });
  }

  return points;
}

export function buildLinePath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export function buildAreaPath(
  points: Array<{ x: number; y: number }>,
  baselineY: number,
): string {
  if (points.length === 0) return "";
  const line = buildLinePath(points);
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  return `${line} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
}
