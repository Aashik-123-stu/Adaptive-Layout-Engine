# Architecture

# The Pipeline

```text
AdSpec + SurfaceProfile
          ↓
      resolver.ts
          ↓
      LayoutResult
       ↙      ↘
render-dom   render-canvas
   (DOM)        (Canvas)


# Each file has a clear responsibility:

spec.ts → Defines what the ad contains.
surfaces.ts → Defines screen size and constraints.
resolver.ts → Calculates the best layout.
render-dom.ts → Displays the layout using HTML/CSS.
render-canvas.ts → Displays the same layout on Canvas.

The resolver only produces layout data. It does not know about
DOM, React, or Canvas. This allows us to add another renderer without
changing the resolver.

# How the Resolver Adapts

The resolver never checks the surface name or ID.
Instead, it uses values such as:

const box = contentBox(surface);
const aspect = box.width / box.height;
const isTouch = !!surface.touchOnly;
const isFar = surface.viewingDistance === "far";

The aspect ratio decides the main composition:

Aspect Ratio	Layout
>= 1.6	Row
<= 0.72	Column
Otherwise	Centered Stack

This means a new surface can be added without changing the resolver.
Its size and constraints are enough for the engine to choose a layout.

# Priority and Degradation

When there is not enough space, the resolver reduces elements in
priority order:

Shrink less important elements first.
If they still do not fit, remove them.
Keep priority-1 elements whenever possible.
If the surface is still too small, shrink priority-1 elements
toward their minimum size.
If the layout still cannot fit, return a warning instead of
overflowing or crashing.

This ensures that important content stays visible while lower-priority
content can be removed when needed.

# Hard Constraints

Some rules cannot be broken:

minTapTarget → Minimum size for clickable elements.
minTextSize → Minimum font size for text.
safeArea → Keeps content away from screen edges.

Priority only decides which element is affected first.
Hard constraints are always respected.

# Text Handling

Text is measured using Canvas measureText() instead of guessing
the width.

Long text is wrapped into lines and truncated with ... when it
cannot fit within the allowed space.

# Verified Surfaces
The layout was tested on all five built-in surfaces:

Surface	Layout	Elements
Mobile Portrait	Column	4 / 5
Mobile Landscape	Row	3 / 5
Broadcast	Row	5 / 5
Retail Kiosk	Centered Stack	5 / 5
Smartwatch	Centered Stack	3 / 5

All tested layouts have zero overlaps and no elements outside the
surface bounds.

# Extensibility
New Surface : Add a new surface with its size and constraints. No changes are needed
in resolver.ts.

New Renderer : A new renderer only needs to consume LayoutResult. The resolver does
not need to change.

New Element Role : Add the role to the spec and define how the resolver should size and
prioritize it.

# Known Limitations

Cross-axis overflow is controlled but not formally checked like the
main axis.
Accessibility support is basic.
Text measurement depends on the Inter font being loaded correctly.

