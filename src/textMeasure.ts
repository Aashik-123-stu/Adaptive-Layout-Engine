/**
textMeasure.ts —Text kitni jagah lega decide here
Ye ek helper hai jo REAL text ka width naapta hai (browser ke canvas tool se), 
taaki engine ko pata chale ki 'ye headline is font size par kitni jagah lega, 
aur kitni lines mein wrap hoga'. Agar text jagah se zyada bada hai, ye use '...' (ellipsis) 
laga kar cut karta hai — exact measurement se, guess se nahi.
 */

const FONT_FAMILY = "'Inter', 'Segoe UI', sans-serif";

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D {
  if (measureCtx) return measureCtx;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("textMeasure: 2D canvas context unavailable in this environment.");
  }
  measureCtx = ctx;
  return ctx;
}

export function measureTextWidth(text: string, fontSizePx: number, fontWeight: number = 400): number {
  const ctx = getMeasureContext();
  ctx.font = `${fontWeight} ${fontSizePx}px ${FONT_FAMILY}`;
  return ctx.measureText(text).width;
}

export interface WrapResult {
  lines: string[];
  truncated: boolean;
}

/**
Breaks the text into lines that fit the given width.
If the text is too long, it limits the number of lines and adds "..."
 */
export function wrapText(
  text: string,
  fontSizePx: number,
  maxWidthPx: number,
  maxLines: number,
  fontWeight: number = 400
): WrapResult {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureTextWidth(candidate, fontSizePx, fontWeight) <= maxWidthPx || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const consumedAllWords =
    lines.join(" ").split(/\s+/).filter(Boolean).length >= words.length;

  if (!consumedAllWords && lines.length > 0) {
    // Truncate the final line with an ellipsis until it actually fits.
    let lastLine = lines[lines.length - 1] ?? "";
    while (lastLine.length > 1 && measureTextWidth(`${lastLine}…`, fontSizePx, fontWeight) > maxWidthPx) {
      lastLine = lastLine.slice(0, -1);
    }
    lines[lines.length - 1] = `${lastLine.trimEnd()}…`;
    return { lines, truncated: true };
  }

  return { lines, truncated: false };
}
