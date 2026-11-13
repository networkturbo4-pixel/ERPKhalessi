import type { Tenant } from '../types/settings';

/** Coordinate pair in GeoJSON order: [longitude, latitude] */
export type GeoPoint = [number, number];

export interface BranchCoverageResult {
  tenantId: string;
  covered: boolean;
  matchType: 'polygon' | 'radius' | 'outside';
  distanceKm: number;
  maxRadiusKm: number;
}

export interface BestBranchMatch {
  matchedTenant: Tenant | null;
  evaluations: Map<string, BranchCoverageResult>;
  anyCovered: boolean;
}

export function calculateHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Ray-casting algorithm to determine if a [lng, lat] point lies inside a polygon.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (!Array.isArray(polygon) || polygon.length < 3) return false;
  const [px, py] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Evaluates whether a customer coordinate [lng, lat] is covered by a branch,
 * prioritizing custom coveragePolygon if configured (>= 3 vertices), otherwise deliveryRadiusKm.
 */
export function evaluateBranchCoverage(
  point: GeoPoint,
  tenant: Tenant
): BranchCoverageResult {
  const [lng, lat] = point;
  const branchLat = tenant.operations?.latitude ?? -11.93605;
  const branchLng = tenant.operations?.longitude ?? -77.05432;
  const maxRadiusKm = tenant.operations?.deliveryRadiusKm ?? 5;
  const distanceKm = calculateHaversineKm(lat, lng, branchLat, branchLng);

  const polygon = tenant.operations?.coveragePolygon;
  if (Array.isArray(polygon) && polygon.length >= 3) {
    const inPoly = isPointInPolygon(point, polygon);
    return {
      tenantId: tenant.id,
      covered: inPoly,
      matchType: inPoly ? 'polygon' : 'outside',
      distanceKm,
      maxRadiusKm,
    };
  }

  const inRadius = distanceKm <= maxRadiusKm;
  return {
    tenantId: tenant.id,
    covered: inRadius,
    matchType: inRadius ? 'radius' : 'outside',
    distanceKm,
    maxRadiusKm,
  };
}

/**
 * Finds the best branch covering the given [lng, lat] point.
 * Prefers open branches, then smallest distanceKm among covering branches.
 */
export function findBestBranchForPoint(
  point: GeoPoint,
  tenants: Tenant[]
): BestBranchMatch {
  const evaluations = new Map<string, BranchCoverageResult>();
  const coveredCandidates: Array<{ tenant: Tenant; evalResult: BranchCoverageResult }> = [];

  for (const tenant of tenants) {
    const evalResult = evaluateBranchCoverage(point, tenant);
    evaluations.set(tenant.id, evalResult);
    if (evalResult.covered) {
      coveredCandidates.push({ tenant, evalResult });
    }
  }

  if (coveredCandidates.length === 0) {
    return {
      matchedTenant: null,
      evaluations,
      anyCovered: false,
    };
  }

  coveredCandidates.sort((a, b) => {
    const aClosed = a.tenant.status === 'closed' ? 1 : 0;
    const bClosed = b.tenant.status === 'closed' ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;
    return a.evalResult.distanceKm - b.evalResult.distanceKm;
  });

  return {
    matchedTenant: coveredCandidates[0].tenant,
    evaluations,
    anyCovered: true,
  };
}

/**
 * Generates an approximate regular polygon ([lng, lat][]) around a branch center
 * for quick geofence initialization in the admin panel.
 */
export function buildRegularPolygonAroundPoint(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  sides = 8
): GeoPoint[] {
  const safeRadius = Math.max(0.5, radiusKm || 5);
  const latDelta = safeRadius / 111.32;
  const lngDelta = safeRadius / (111.32 * Math.cos((centerLat * Math.PI) / 180) || 1);
  const points: GeoPoint[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    const lng = Number((centerLng + lngDelta * Math.cos(angle)).toFixed(6));
    const lat = Number((centerLat + latDelta * Math.sin(angle)).toFixed(6));
    points.push([lng, lat]);
  }

  return points;
}
