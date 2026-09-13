/**
 spec.ts - ADs content define here once- Ad mein kya show krna hai
 Defines what content an ad has.Each element has a role and priority, which tells us how important it is. This file only describes the ad content.
 It does not decide where or how the elements should be placed.
 */

export type ElementRole = "primary"|"hero"|"action"|"branding"|"secondary";
export type ElementType = "text"|"image"|"button";

interface BaseElement {
  /*Unique within a single AdSpec. */
  id: string;
  type: ElementType;
  role: ElementRole;
  priority: number; /*1 = highest priority, never dropped, degraded last*/
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  maxLines?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  alt: string;
  aspectRatio?: number;
}

export interface ButtonElement extends BaseElement {
  type: "button";
  label: string;
}

export type AdElement = TextElement|ImageElement|ButtonElement;

export interface AdSpec {
  id: string;
  elements: AdElement[];
}

/** Thrown when defineAd() receives an invalid ad spec.
  Helps clearly identify spec errors using `instanceof`.
 */
export class AdSpecError extends Error {
  constructor(message: string) {
    super(`[AdSpec] ${message}`);
    this.name = "AdSpecError";
  }
}

const VALID_ROLES: ReadonlySet<ElementRole> = new Set([
  "primary",
  "hero",
  "action",
  "branding",
  "secondary",
]);

/**
 Creates and validates the AdSpec once.
 After this, the resolver can safely use the valid spec.
 */
export function defineAd(input: { id?: string; elements: AdElement[] }): AdSpec {
  const id = input.id ?? `ad-${Math.random().toString(36).slice(2, 9)}`;
  const seenIds = new Set<string>();

  if (input.elements.length === 0) {
    throw new AdSpecError("An ad spec must contain at least one element.");
  }

  for (const el of input.elements) {
    if (!el.id || typeof el.id !== "string") {
      throw new AdSpecError(`Every element needs a non-empty string id. Received: ${JSON.stringify(el)}`);
    }
    if (seenIds.has(el.id)) {
      throw new AdSpecError(`Duplicate element id "${el.id}". Element ids must be unique within a spec.`);
    }
    seenIds.add(el.id);

    if (!VALID_ROLES.has(el.role)) {
      throw new AdSpecError(
        `Element "${el.id}" has invalid role "${el.role}". Valid roles: ${[...VALID_ROLES].join(", ")}.`
      );
    }

    if (!Number.isInteger(el.priority) || el.priority < 1) {
      throw new AdSpecError(
        `Element "${el.id}" has invalid priority (${el.priority}). Priority must be a positive integer, where 1 = highest priority (never dropped).`
      );
    }

    if (el.type === "text" && el.content.trim() === "") {
      throw new AdSpecError(`Text element "${el.id}" has empty content.`);
    }

    if (el.type === "image") {
      if (!el.src) {
        throw new AdSpecError(`Image element "${el.id}" is missing a src.`);
      }
      if (el.aspectRatio !== undefined && el.aspectRatio <= 0) {
        throw new AdSpecError(`Image element "${el.id}" has invalid aspectRatio (${el.aspectRatio}). Must be > 0.`);
      }
    }

    if (el.type === "button" && el.label.trim() === "") {
      throw new AdSpecError(`Button element "${el.id}" has empty label.`);
    }
  }

  return { id, elements: input.elements };
}
