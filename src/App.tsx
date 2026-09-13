import { useEffect, useMemo, useRef, useState } from "react";
import { surfaces, defineSurface, SurfaceProfileError, type SurfaceProfile } from "./surfaces";
import { resolveLayout } from "./resolver";
import { renderToDom } from "./render-dom";
import { renderToCanvas } from "./render-canvas";
import { demoAdSpec } from "./demoSpec";
import "./App.css";

type RendererMode = "dom" | "canvas";

const BUILT_IN_ORDER = ["mobilePortrait", "mobileLandscape", "broadcastLowerThird", "retailKiosk", "smartwatch"];

export default function App() {
  const [customSurfaces, setCustomSurfaces] = useState<Record<string, SurfaceProfile>>({});
  const [selectedId, setSelectedId] = useState<string>("mobilePortrait");
  const [rendererMode, setRendererMode] = useState<RendererMode>("dom");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const domRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const allSurfaces = useMemo(() => ({ ...surfaces, ...customSurfaces }), [customSurfaces]);
  const activeSurface = allSurfaces[selectedId] ?? surfaces.mobilePortrait!;

  const layout = useMemo(() => resolveLayout(demoAdSpec, activeSurface), [activeSurface]);

  useEffect(() => {
    if (rendererMode === "dom" && domRef.current) {
      renderToDom(domRef.current, layout);
    }
  }, [layout, rendererMode]);


  useEffect(() => {
    if (rendererMode === "canvas" && canvasRef.current) {
      renderToCanvas(canvasRef.current, layout, () => {
        if (canvasRef.current) renderToCanvas(canvasRef.current, layout);
      });
    }
  }, [layout, rendererMode]);

// function execute when get "Unknown surfaces". form submit hone par function chalega
  function handleAddCustomSurface(formData: FormData) {
    setFormError(null);
    try {
      const id = `custom-${Date.now()}`;
      const width = Number(formData.get("width"));
      const height = Number(formData.get("height"));
      const profile = defineSurface({
        id,
        label: `Custom ${width}×${height}`,
        width,
        height,
        touchOnly: formData.get("touchOnly") === "on",
        viewingDistance: formData.get("far") === "on" ? "far" : "near",
        minTapTarget: formData.get("touchOnly") === "on" ? 44 : undefined,
        minTextSize: formData.get("far") === "on" ? 28 : undefined,
        safeArea: { top: 8, right: 8, bottom: 8, left: 8 },
      });
      setCustomSurfaces((prev) => ({ ...prev, [id]: profile }));
      setSelectedId(id);
      setFormOpen(false);
    } catch (err) {
      if (err instanceof SurfaceProfileError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong constructing that surface.");
      }
    }
  }


  return (
    <div className="shell">
      <header className="shell-header">
        <p className="eyebrow">Adaptive Layout Engine</p>
        <h1 style={{ color: "#000000", fontWeight: 500 }}>
        One ad. Five surfaces. The layout adapts automatically.
      </h1>
       <p className="subhead">
        The sneaker ad is defined once in demoSpec.ts.
        When you switch surfaces, the layout updates automatically based on the
        surface size and constraints. Nothing is hardcoded for a specific surface.
      </p>
      </header>

      <div className="controls">
        <div className="surface-picker">
          {BUILT_IN_ORDER.map((id) => {
            const s = surfaces[id];
            if (!s) return null;
            return (
              <button
                key={id}
                className={`surface-btn ${selectedId === id ? "is-active" : ""}`}
                onClick={() => setSelectedId(id)}
              >
                {s.label}
              </button>
            );
          })}

          {Object.values(customSurfaces).map((s) => (
            <button
              key={s.id}
              className={`surface-btn ${selectedId === s.id ? "is-active" : ""}`}
              onClick={() => setSelectedId(s.id)}
            >
              {s.label} ✨
            </button>
          ))}

          <button className="surface-btn surface-btn--ghost" onClick={() => setFormOpen((v) => !v)}>
            + Unknown surface
          </button>
        </div>

        <div className="renderer-toggle">
          <span>Renderer:</span>
          <button
            className={`toggle-btn ${rendererMode === "dom" ? "is-active" : ""}`}
            onClick={() => setRendererMode("dom")}
          >
            DOM
          </button>
          <button
            className={`toggle-btn ${rendererMode === "canvas" ? "is-active" : ""}`}
            onClick={() => setRendererMode("canvas")}
          >
            Canvas
          </button>
        </div>
      </div>

      {formOpen && (
        <form
          className="custom-surface-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCustomSurface(new FormData(e.currentTarget));
          }}
        >
          <p className="form-title">Define a surface the engine has never seen before</p>
          <div className="form-row">
            <label>
              Width (px)
              <input name="width" type="number" defaultValue={640} min={40} required />
            </label>
            <label>
              Height (px)
              <input name="height" type="number" defaultValue={200} min={40} required />
            </label>
          </div>
          <div className="form-row form-row--checks">
            <label className="checkbox-label">
              <input name="touchOnly" type="checkbox" /> Touch-only (enforces min tap target)
            </label>
            <label className="checkbox-label">
              <input name="far" type="checkbox" /> Far viewing distance (enforces min text size)
            </label>
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button className="btn-submit" type="submit">Resolve this surface</button>
        </form>
      )}

      <main className="stage-wrap">
        <div
          className="stage"
          style={{ width: layout.surfaceWidth, height: layout.surfaceHeight }}
        >
          {rendererMode === "dom" ? (
            <div ref={domRef} className="stage-surface" />
          ) : (
            <canvas ref={canvasRef} className="stage-surface" />
          )}
        </div>

        <aside className="inspector">
          <h2>Resolver output</h2>
          <dl>
            <dt>Surface</dt>
            <dd>{activeSurface.label} ({activeSurface.width}×{activeSurface.height})</dd>
            <dt>Composition strategy</dt>
            <dd className="mono">{layout.composition}</dd>
            <dt>Elements rendered</dt>
            <dd>{layout.elements.length} / {demoAdSpec.elements.length}</dd>
          </dl>

          {layout.droppedElementIds.length > 0 && (
            <div className="inspector-block inspector-block--dropped">
              <h3>Dropped</h3>
              <ul>
                {layout.droppedElementIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            </div>
          )}

          {layout.warnings.length > 0 && (
            <div className="inspector-block inspector-block--warn">
              <h3>Warnings</h3>
              <ul>
                {layout.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
