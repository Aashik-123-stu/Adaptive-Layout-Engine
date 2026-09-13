/**
 render-canvas.ts- Numbers ko screen par showw  krna
 
  A another renderer that uses the same Layout result as the DOM renderer.
  This shows that the resolver does not depend on DOM.
  Images are loaded and drawn when ready.
 */

import type { LayoutResult, ResolvedElementLayout } from "./resolver";

const imageCache = new Map<string, HTMLImageElement>();

function getImage(src: string, onLoad: () => void): HTMLImageElement {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const img = new Image();
  img.src = src;
  img.onload = onLoad;
  imageCache.set(src, img);
  return img;
}

export function renderToCanvas(canvas: HTMLCanvasElement, layout: LayoutResult, onAsyncRedraw?: () => void): void {
  canvas.width = layout.surfaceWidth;
  canvas.height = layout.surfaceHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1E2B24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const el of layout.elements) {
    drawElement(ctx, el, onAsyncRedraw);
  }
}

function drawElement(ctx: CanvasRenderingContext2D, el: ResolvedElementLayout, onAsyncRedraw?: () => void): void {
  if (el.type === "text") {
    ctx.fillStyle = "#F1EFE5";
    ctx.font = `${el.role === "primary" ? 700 : 500} ${el.fontSize ?? 16}px Inter, sans-serif`;
    ctx.textBaseline = "top";
    (el.lines ?? []).forEach((line, i) => {
      ctx.fillText(line, el.x, el.y + i * (el.fontSize ?? 16) * 1.3);
    });
  } else if (el.type === "button") {
    ctx.fillStyle = "#E8C468";
    roundRect(ctx, el.x, el.y, el.width, el.height, el.height / 2);
    ctx.fill();
    ctx.fillStyle = "#1E2B24";
    ctx.font = `700 ${el.fontSize ?? 16}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(el.label ?? "", el.x + el.width / 2, el.y + el.height / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  } else if (el.type === "image" && el.src) {
    const img = getImage(el.src, () => onAsyncRedraw?.());
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, el.x, el.y, el.width, el.height);
    } else {
      ctx.fillStyle = "rgba(241, 239, 229, 0.12)";
      ctx.fillRect(el.x, el.y, el.width, el.height);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
