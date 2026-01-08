// Geometry Utilities
// Vector math, bezier curves, and spatial calculations

import type { Vector2, Bounds } from '@/types';

// ============================================
// VECTOR OPERATIONS
// ============================================

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function multiply(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function divide(v: Vector2, scalar: number): Vector2 {
  return { x: v.x / scalar, y: v.y / scalar };
}

export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function length(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function lengthSquared(v: Vector2): number {
  return v.x * v.x + v.y * v.y;
}

export function normalize(v: Vector2): Vector2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return divide(v, len);
}

export function distance(a: Vector2, b: Vector2): number {
  return length(subtract(b, a));
}

export function distanceSquared(a: Vector2, b: Vector2): number {
  return lengthSquared(subtract(b, a));
}

export function lerpVector(a: Vector2, b: Vector2, t: number): Vector2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function rotate(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function perpendicular(v: Vector2): Vector2 {
  return { x: -v.y, y: v.x };
}

export function angle(v: Vector2): number {
  return Math.atan2(v.y, v.x);
}

export function angleBetween(a: Vector2, b: Vector2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

// ============================================
// BEZIER CURVES
// ============================================

export function quadraticBezier(
  p0: Vector2,
  p1: Vector2,
  p2: Vector2,
  t: number
): Vector2 {
  const oneMinusT = 1 - t;
  return {
    x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
    y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y,
  };
}

export function cubicBezier(
  p0: Vector2,
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  t: number
): Vector2 {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x: oneMinusT3 * p0.x + 3 * oneMinusT2 * t * p1.x + 3 * oneMinusT * t2 * p2.x + t3 * p3.x,
    y: oneMinusT3 * p0.y + 3 * oneMinusT2 * t * p1.y + 3 * oneMinusT * t2 * p2.y + t3 * p3.y,
  };
}

export function bezierTangent(
  p0: Vector2,
  p1: Vector2,
  p2: Vector2,
  p3: Vector2,
  t: number
): Vector2 {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const t2 = t * t;

  return {
    x: 3 * oneMinusT2 * (p1.x - p0.x) + 6 * oneMinusT * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * oneMinusT2 * (p1.y - p0.y) + 6 * oneMinusT * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

export function calculateControlPoints(
  start: Vector2,
  end: Vector2,
  curvature: number = 0.3
): { cp1: Vector2; cp2: Vector2 } {
  const mid = lerpVector(start, end, 0.5);
  const dist = distance(start, end);
  const perpOffset = dist * curvature;

  // Create a slight curve by offsetting control points perpendicular to the line
  const direction = normalize(subtract(end, start));
  const perp = perpendicular(direction);

  // Alternate curve direction based on start/end positions
  const sign = (start.x + start.y) % 2 === 0 ? 1 : -1;

  return {
    cp1: add(lerpVector(start, mid, 0.5), multiply(perp, perpOffset * sign)),
    cp2: add(lerpVector(mid, end, 0.5), multiply(perp, perpOffset * sign)),
  };
}

export function sampleBezierPath(
  start: Vector2,
  cp1: Vector2,
  cp2: Vector2,
  end: Vector2,
  segments: number = 20
): Vector2[] {
  const points: Vector2[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(cubicBezier(start, cp1, cp2, end, t));
  }
  return points;
}

export function bezierLength(
  start: Vector2,
  cp1: Vector2,
  cp2: Vector2,
  end: Vector2,
  segments: number = 20
): number {
  let totalLength = 0;
  let prevPoint = start;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const point = cubicBezier(start, cp1, cp2, end, t);
    totalLength += distance(prevPoint, point);
    prevPoint = point;
  }

  return totalLength;
}

// ============================================
// BOUNDS & COLLISION
// ============================================

export function pointInBounds(point: Vector2, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function getBoundsCenter(bounds: Bounds): Vector2 {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function calculateBoundsFromPoints(points: Vector2[]): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// ============================================
// POINT ON PATH
// ============================================

export function getPointOnPath(
  pathPoints: Vector2[],
  startPos: Vector2,
  endPos: Vector2,
  t: number
): Vector2 {
  // If path has control points, use bezier curve
  if (pathPoints.length >= 4) {
    return cubicBezier(
      pathPoints[0],
      pathPoints[1],
      pathPoints[2],
      pathPoints[3],
      t
    );
  }
  // Otherwise use linear interpolation
  return lerpVector(startPos, endPos, t);
}

export function getPathDirection(
  pathPoints: Vector2[],
  startPos: Vector2,
  endPos: Vector2,
  t: number
): Vector2 {
  // If path has control points, use bezier tangent
  if (pathPoints.length >= 4) {
    return normalize(bezierTangent(
      pathPoints[0],
      pathPoints[1],
      pathPoints[2],
      pathPoints[3],
      t
    ));
  }
  return normalize(subtract(endPos, startPos));
}

// ============================================
// SPATIAL UTILITIES
// ============================================

export function worldToScreen(
  worldPos: Vector2,
  cameraPos: Vector2,
  zoom: number,
  screenSize: Vector2
): Vector2 {
  return {
    x: (worldPos.x - cameraPos.x) * zoom + screenSize.x / 2,
    y: (worldPos.y - cameraPos.y) * zoom + screenSize.y / 2,
  };
}

export function screenToWorld(
  screenPos: Vector2,
  cameraPos: Vector2,
  zoom: number,
  screenSize: Vector2
): Vector2 {
  return {
    x: (screenPos.x - screenSize.x / 2) / zoom + cameraPos.x,
    y: (screenPos.y - screenSize.y / 2) / zoom + cameraPos.y,
  };
}

export function findNearestPoint(
  target: Vector2,
  points: Vector2[],
  maxDistance?: number
): { point: Vector2; index: number; distance: number } | null {
  let nearest: { point: Vector2; index: number; distance: number } | null = null;

  for (let i = 0; i < points.length; i++) {
    const dist = distance(target, points[i]);
    if (maxDistance !== undefined && dist > maxDistance) continue;
    if (!nearest || dist < nearest.distance) {
      nearest = { point: points[i], index: i, distance: dist };
    }
  }

  return nearest;
}
