/**
 surfaces.ts — Kis screen ke liye banana hai
 Describes where the ad will be shown and its basic constraints.
 It only defines the rules; the resolver decides the actual layout.
 New surfaces can be added without changing the resolver.
 */

export type ViewingDistance = "near" | "far";

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SurfaceProfile {
  id: string;
  label: string;
  width: number;
  height: number;
  /** Space from the edges that should be kept empty. */
  safeArea?: SafeArea;
  /** Minimum size for buttons or other clickable elements. */
  minTapTarget?: number;
  /** Minimum font size allowed for text. */
  minTextSize?: number;
  /** Tells us how far the viewer is from the screen. */
  viewingDistance?: ViewingDistance;
  /** If true, all clickable elements must follow minTapTarget. */
  touchOnly?: boolean;
}

export class SurfaceProfileError extends Error {
  constructor(message: string) {
    super(`[SurfaceProfile] ${message}`);
    this.name = "SurfaceProfileError";
  }
}

/* Checks the surface profile and returns it if it is valid.Works for both built-in and newly created surfaces.*/

export function defineSurface(profile: SurfaceProfile): SurfaceProfile {
  if (!profile.id) {
    throw new SurfaceProfileError("Surface profile requires a non-empty id.");
  }
  if (!Number.isFinite(profile.width) || profile.width <= 0) {
    throw new SurfaceProfileError(`Surface "${profile.id}" has invalid width (${profile.width}). Must be > 0.`);
  }
  if (!Number.isFinite(profile.height) || profile.height <= 0) {
    throw new SurfaceProfileError(`Surface "${profile.id}" has invalid height (${profile.height}). Must be > 0.`);
  }
  if (profile.minTapTarget !== undefined && profile.minTapTarget <= 0) {
    throw new SurfaceProfileError(`Surface "${profile.id}" has invalid minTapTarget (${profile.minTapTarget}).`);
  }
  if (profile.minTextSize !== undefined && profile.minTextSize <= 0) {
    throw new SurfaceProfileError(`Surface "${profile.id}" has invalid minTextSize (${profile.minTextSize}).`);
  }
  return profile;
}

export const surfaces: Record<string, SurfaceProfile> = {
  mobilePortrait: defineSurface({
    id: "mobilePortrait",
    label: "Mobile Interstitial — Portrait",
    width: 320,
    height: 480,
    safeArea: { top: 16, right: 16, bottom: 24, left: 16 },
    minTapTarget: 44,
    touchOnly: true,
    viewingDistance: "near",
  }),

  mobileLandscape: defineSurface({
    id: "mobileLandscape",
    label: "Mobile Interstitial — Landscape",
    width: 480,
    height: 270,
    safeArea: { top: 8, right: 16, bottom: 8, left: 16 },
    minTapTarget: 44,
    touchOnly: true,
    viewingDistance: "near",
  }),

  broadcastLowerThird: defineSurface({
    id: "broadcastLowerThird",
    label: "Broadcast Lower-Third",
    width: 1920,
    height: 250,
    safeArea: { top: 0, right: 64, bottom: 0, left: 64 },
    minTextSize: 32,
    viewingDistance: "far",
  }),

  retailKiosk: defineSurface({
    id: "retailKiosk",
    label: "Retail Kiosk — Square",
    width: 1080,
    height: 1080,
    safeArea: { top: 24, right: 24, bottom: 24, left: 24 },
    minTapTarget: 60,
    touchOnly: true,
    viewingDistance: "near",
  }),

/** Small screen with less space.Branding will be removed first when space is low.
 */
  smartwatch: defineSurface({
    id: "smartwatch",
    label: "Smartwatch Face — Tight",
    width: 198,
    height: 198,
    safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
    minTapTarget: 40,
    touchOnly: true,
    viewingDistance: "near",
  }),
};
