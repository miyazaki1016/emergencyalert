export interface WatchTarget {
  schemaVersion: 1;
  id: string;
  ownerId: string;
  label: string;
  latitude: number;
  longitude: number;
  enabled: boolean;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewWatchTarget = Omit<
  WatchTarget,
  "schemaVersion" | "id" | "createdAt" | "updatedAt"
>;

export function validateNewWatchTarget(input: NewWatchTarget): void {
  if (!input.ownerId.trim()) throw new Error("ownerId is required");
  if (!input.label.trim()) throw new Error("label is required");
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }
}
