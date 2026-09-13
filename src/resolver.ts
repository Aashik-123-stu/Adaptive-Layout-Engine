/**
 resolver.ts - This is the main part of the layout engine.

 1. Checks the screen size and decides whether elements should be placed in a row, column, or stack.
 2. Finds the ideal size for each element.
 3. If space is less, smaller-priority elements are first reduced
    or removed until everything fits.

Priority-1 elements are kept as much as possible.

*/

import type { AdElement, AdSpec } from "./spec";
import type { SurfaceProfile } from "./surfaces";
import { measureTextWidth, wrapText } from "./textMeasure";

export type Composition = "row" | "column" | "centered-stack";

export interface ResolvedElementLayout {
  id: string;
  type: AdElement["type"];
  role: AdElement["role"];
  x: number;
  y: number;
  width: number;
  height: number;
  /** Present for text/button elements. */
  fontSize?: number;
  /** Wrapped lines, for text elements. */
  lines?: string[];
  truncated?: boolean;
  /** Aspect ratio to preserve when drawing an image inside its box. */
  aspectRatio?: number;
  label?: string; // button label passthrough for renderers
  src?: string; // image src passthrough
  alt?: string;
}

export interface LayoutResult {
  surfaceId: string;
  surfaceWidth: number;
  surfaceHeight: number;
  composition: Composition;
  /** Only elements that survived degradation, each with a final box. */
  elements: ResolvedElementLayout[];
  droppedElementIds: string[];
  warnings: string[];
}

// Temporary element data used while creating the layout.
// It keeps the original element and its current size/state separate from the final layout output.
interface WorkingElement {
  spec: AdElement;
  /** 0 = full size, 1 = fully shrunk to floor. Interpolates ideal -> floor. */
  shrink: number;
  dropped: boolean;
}

const ROLE_ORDER: Record<AdElement["role"], number> = {
  hero: 0,
  primary: 1,
  secondary: 2,
  action: 3,
  branding: 4,
};

function contentBox(surface: SurfaceProfile) {
  const inset = surface.safeArea ?? { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    x: inset.left,
    y: inset.top,
    width: surface.width - inset.left - inset.right,
    height: surface.height - inset.top - inset.bottom,
  };
}

/**
 Decides the layout style using the screen's aspect ratio.
 Works for any surface without checking its ID.
 */
function chooseComposition(width: number, height: number): Composition {
  const aspect = width / height;
  if (aspect >= 1.6) return "row"; // wide: side-by-side hero + content
  if (aspect <= 0.72) return "column"; // tall: stacked top-to-bottom
  return "centered-stack"; // square-ish: centered vertical stack
}

function baseFontSize(role: AdElement["role"], box: { width: number; height: number }, surface: SurfaceProfile): number {
  const scaleBasis = Math.min(box.width, box.height);
  const raw =
    role === "primary"
      ? scaleBasis * 0.16
      : role === "secondary"
      ? scaleBasis * 0.1
      : role === "action"
      ? scaleBasis * 0.11
      : scaleBasis * 0.09;

  const floor = surface.minTextSize ?? 11;
  const ceiling = surface.viewingDistance === "far" ? 96 : 48;
  return Math.min(ceiling, Math.max(floor, raw));
}

function floorFontSize(surface: SurfaceProfile): number {
  return surface.minTextSize ?? 11;
}

/** Reduces a value from its ideal size to its minimum size as it shrinks. */
function lerpDown(ideal: number, floor: number, shrink: number): number {
  return ideal - (ideal - floor) * shrink;
}

// Main entry point
export function resolveLayout(spec: AdSpec, surface: SurfaceProfile): LayoutResult {
  const box = contentBox(surface);
  const composition = chooseComposition(box.width, box.height);
  const warnings: string[] = [];

  const working: WorkingElement[] = spec.elements
    .slice()
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
    .map((el) => ({ spec: el, shrink: 0, dropped: false }));


// ---- 1. Keep reducing elements until everything fits ----
// First, shrink the least important elements.
// If they still do not fit, remove them completely.
  const dropPhaseCandidates = working
    .filter((w) => w.spec.priority > 1)
    .sort((a, b) => b.spec.priority - a.spec.priority);

// Last step: priority-1 elements are never removed.
// If space is still not enough, shrink them instead of letting them overflow.
  const shrinkRolePreference: Record<AdElement["role"], number> = {
    hero: 0,
    secondary: 1,
    primary: 2,
    action: 3,
    branding: 4,
  };
  const lastResortCandidates = working
    .filter((w) => w.spec.priority === 1)
    .sort((a, b) => shrinkRolePreference[a.spec.role] - shrinkRolePreference[b.spec.role]);

  let guard = 0; // safety valve against any unforeseen infinite loop
  while (guard++ < 400) {
    const measured = measureAll(working, box, surface, composition);
    if (fitsBudget(measured, box, composition)) break;

    const nextToShrink = dropPhaseCandidates.find((w) => !w.dropped && w.shrink < 1);
    if (nextToShrink) {
      nextToShrink.shrink = Math.min(1, nextToShrink.shrink + 0.2);
      continue;
    }

    const nextToDrop = dropPhaseCandidates.find((w) => !w.dropped);
    if (nextToDrop) {
      nextToDrop.dropped = true;
      warnings.push(
        `Dropped "${nextToDrop.spec.id}" (role: ${nextToDrop.spec.role}, priority: ${nextToDrop.spec.priority}) — surface "${surface.id}" has no room for it even at minimum size.`
      );
      continue;
    }

    // Every priority>1 element is gone. Last resort: shrink priority-1
    const lastResort = lastResortCandidates.find((w) => w.shrink < 1);
    if (lastResort) {
      lastResort.shrink = Math.min(1, lastResort.shrink + 0.2);
      continue;
    }

    warnings.push(
      `Surface "${surface.id}" cannot fit this spec's priority-1 elements even at minimum size. Rendering at computed minimums — this surface may be fundamentally too small for this content.`
    );
    break;
  }

  // ---- 2. Compute final concrete positions for survivors ----
  const survivors = working.filter((w) => !w.dropped);
  const elements = layoutSurvivors(survivors, box, surface, composition);

  return {
    surfaceId: surface.id,
    surfaceWidth: surface.width,
    surfaceHeight: surface.height,
    composition,
    elements,
    droppedElementIds: working.filter((w) => w.dropped).map((w) => w.spec.id),
    warnings,
  };
}

// Calculates the size of each element before deciding its position.
// Uses the same size calculation for both fit checking and final layout.
interface MeasuredElement extends WorkingElement {
  width: number;
  height: number;
  fontSize?: number;
  lines?: string[];
  truncated?: boolean;
}

function measureAll(
  working: WorkingElement[],
  box: { width: number; height: number },
  surface: SurfaceProfile,
  composition: Composition
): MeasuredElement[] {
  const mainAxisSpan = composition === "row" ? box.width : box.height;

  return working
    .filter((w) => !w.dropped)
    .map((w) => {
      const el = w.spec;

      if (el.type === "image") {
        const idealFraction = el.role === "hero" ? 0.55 : 0.18;
        const floorFraction = el.role === "hero" ? 0.3 : 0.08;
        const fraction = lerpDown(idealFraction, floorFraction, w.shrink);
        const mainSize = mainAxisSpan * fraction;
        const aspect = el.aspectRatio ?? 1;
        const crossLimit = composition === "row" ? box.height * 0.8 : box.width * 0.8;

        let width: number;
        let height: number;
        if (composition === "row") {
          width = mainSize;
          height = Math.min(crossLimit, width / aspect);
          width = height * aspect;
        } else {
          height = mainSize;
          width = Math.min(crossLimit, height * aspect);
          height = width / aspect;
        }
        return { ...w, width, height };
      }

      if (el.type === "button") {
        const ideal = baseFontSize(el.role, box, surface);
        const floor = floorFontSize(surface);
        const fontSize = lerpDown(ideal, floor, w.shrink * 0.5); // buttons shrink less aggressively
        const paddingX = fontSize * 1.1;
        const paddingY = fontSize * 0.7;
        const textWidth = measureTextWidth(el.label, fontSize, 600);
        const width = Math.max(textWidth + paddingX * 2, surface.minTapTarget ?? 0);
        const height = Math.max(fontSize + paddingY * 2, surface.minTapTarget ?? 0);
        return { ...w, width, height, fontSize };
      }

      // text
      const ideal = baseFontSize(el.role, box, surface);
      const floor = floorFontSize(surface);
      const fontSize = lerpDown(ideal, floor, w.shrink);
      const maxWidth = composition === "row" ? box.width * 0.45 : box.width * 0.92;
      const maxLines = el.maxLines ?? (el.role === "primary" ? 3 : 2);
      const { lines, truncated } = wrapText(el.content, fontSize, maxWidth, maxLines, el.role === "primary" ? 700 : 400);
      const width = Math.max(...lines.map((l) => measureTextWidth(l, fontSize, el.role === "primary" ? 700 : 400)), 1);
      const height = lines.length * fontSize * 1.3;
      return { ...w, width, height, fontSize, lines, truncated };
    });
}

/**
  Checks how much space the flowing elements need.
  It also keeps space reserved for branding so nothing overlaps.
  Only the main direction (row/column) is checked because the other
 */
function fitsBudget(measured: MeasuredElement[], box: { width: number; height: number }, composition: Composition): boolean {
  const gap = Math.min(box.width, box.height) * 0.04;
  const mainSpan = composition === "row" ? box.width : box.height;

  const branding = measured.find((m) => m.spec.role === "branding");
  const flowing = measured.filter((m) => m.spec.role !== "branding");

  const brandingReservation = branding
    ? (composition === "row" ? branding.width : branding.height) + gap
    : 0;

  const flowTotal =
    flowing.reduce((sum, m) => sum + (composition === "row" ? m.width : m.height), 0) +
    gap * Math.max(0, flowing.length - 1);

  return flowTotal + brandingReservation <= mainSpan;
}


// Final step: give each element its exact x/y position.
// Branding stays in a corner, while other elements are placed
function layoutSurvivors(
  survivors: WorkingElement[],
  box: { x: number; y: number; width: number; height: number },
  surface: SurfaceProfile,
  composition: Composition
): ResolvedElementLayout[] {
  const measured = measureAll(survivors, box, surface, composition);
  const gap = Math.min(box.width, box.height) * 0.04;

  const branding = measured.filter((m) => m.spec.role === "branding");
  const flowing = measured.filter((m) => m.spec.role !== "branding");

// Keep space for the branding before placing other elements, so they never overlap.
// In a row, branding uses the right side.In a column/stack, branding uses the bottom space.
  const brandingEl = branding[0];
  const flowBox = { ...box };
  if (brandingEl) {
    if (composition === "row") {
      flowBox.width = Math.max(0, box.width - brandingEl.width - gap);
    } else {
      flowBox.height = Math.max(0, box.height - brandingEl.height - gap);
    }
  }

  const results: ResolvedElementLayout[] = [];

  if (composition === "row") {
    const totalMain = flowing.reduce((s, m) => s + m.width, 0) + gap * Math.max(0, flowing.length - 1);
    let cursor = flowBox.x + Math.max(0, (flowBox.width - totalMain) / 2);
    for (const m of flowing) {
      const y = flowBox.y + (flowBox.height - m.height) / 2;
      results.push(toResolved(m, cursor, y));
      cursor += m.width + gap;
    }
  } else {
    // column + centered-stack both flow top-to-bottom on the main axis
    const totalMain = flowing.reduce((s, m) => s + m.height, 0) + gap * Math.max(0, flowing.length - 1);
    let cursor = flowBox.y + Math.max(0, (flowBox.height - totalMain) / 2);
    for (const m of flowing) {
      const x = flowBox.x + (flowBox.width - m.width) / 2;
      results.push(toResolved(m, x, cursor));
      cursor += m.height + gap;
    }
  }

  // Branding anchors bottom-right, inside the strip reserved for it above.
  if (brandingEl) {
    const x = box.x + box.width - brandingEl.width;
    const y = box.y + box.height - brandingEl.height;
    results.push(toResolved(brandingEl, x, y));
  }

  return results;
}

function toResolved(m: MeasuredElement, x: number, y: number): ResolvedElementLayout {
  const base: ResolvedElementLayout = {
    id: m.spec.id,
    type: m.spec.type,
    role: m.spec.role,
    x,
    y,
    width: m.width,
    height: m.height,
    fontSize: m.fontSize,
    lines: m.lines,
    truncated: m.truncated,
  };
  if (m.spec.type === "image") {
    base.src = m.spec.src;
    base.alt = m.spec.alt;
    base.aspectRatio = m.spec.aspectRatio ?? 1;
  }
  if (m.spec.type === "button") {
    base.label = m.spec.label;
  }
  return base;
}
