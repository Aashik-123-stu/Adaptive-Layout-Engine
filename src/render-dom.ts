/**
  render-dom.ts-Numbers ko screen par showw  krna

  Not a React component. It only takes the LayoutResult and creates the required DOM elements.
  It reuses existing elements by id instead of creating them again,so changing surfaces can have smooth CSS transitions.
 */

import type { LayoutResult, ResolvedElementLayout } from "./resolver";

const TRANSITION = "left 320ms ease, top 320ms ease, width 320ms ease, height 320ms ease, font-size 320ms ease, opacity 200ms ease";

export function renderToDom(container: HTMLElement, layout: LayoutResult): void {
  container.style.position = "relative";
  container.style.width = `${layout.surfaceWidth}px`;
  container.style.height = `${layout.surfaceHeight}px`;
  container.style.overflow = "hidden";

  const currentIds = new Set(layout.elements.map((el) => el.id));

// Remove elements that are no longer needed with a short fade-out effect.
  for (const child of Array.from(container.children)) {
    const id = child.getAttribute("data-el-id");
    if (id && !currentIds.has(id)) {
      const el = child as HTMLElement;
      el.style.opacity = "0";
      window.setTimeout(() => el.remove(), 220);
    }
  }

  for (const el of layout.elements) {
    let node = container.querySelector<HTMLElement>(`[data-el-id="${el.id}"]`);
    if (!node) {
      node = createNode(el);
      node.style.transition = TRANSITION;
      node.style.opacity = "0";
      container.appendChild(node);
      // Force layout so the subsequent opacity change actually animates.
      void node.offsetWidth;
    }
    applyBox(node, el);
    updateContent(node, el);
    node.style.opacity = "1";
  }
}

function createNode(el: ResolvedElementLayout): HTMLElement {
  const node = document.createElement(el.type === "button" ? "button" : el.type === "image" ? "figure" : "div");
  node.setAttribute("data-el-id", el.id);
  node.setAttribute("data-role", el.role);
  node.style.position = "absolute";
  node.style.margin = "0";
  node.style.boxSizing = "border-box";
  return node;
}

function applyBox(node: HTMLElement, el: ResolvedElementLayout): void {
  node.style.left = `${el.x}px`;
  node.style.top = `${el.y}px`;
  node.style.width = `${el.width}px`;
  node.style.height = `${el.height}px`;
  if (el.fontSize) node.style.fontSize = `${el.fontSize}px`;
}

function updateContent(node: HTMLElement, el: ResolvedElementLayout): void {
  if (el.type === "text") {
    node.innerHTML = "";
    node.style.color = "#F1EFE5";
    node.style.fontFamily = "'Inter', sans-serif";
    node.style.fontWeight = el.role === "primary" ? "700" : "500";
    node.style.lineHeight = "1.3";
    for (const line of el.lines ?? []) {
      const p = document.createElement("div");
      p.textContent = line;
      node.appendChild(p);
    }
  } else if (el.type === "button") {
    node.textContent = el.label ?? "";
    node.style.background = "#E8C468";
    node.style.color = "#1E2B24";
    node.style.border = "none";
    node.style.borderRadius = "999px";
    node.style.fontWeight = "700";
    node.style.fontFamily = "'Inter', sans-serif";
    node.style.cursor = "pointer";
  } else if (el.type === "image") {
    node.innerHTML = "";
    const img = document.createElement("img");
    img.src = el.src ?? "";
    img.alt = el.alt ?? "";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = el.role === "hero" ? "cover" : "contain";
    img.style.borderRadius = el.role === "hero" ? "8px" : "4px";
    img.style.display = "block";
    node.appendChild(img);
  }
}
