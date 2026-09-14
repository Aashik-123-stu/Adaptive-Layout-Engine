# Adaptive Layout Engine for Multi-Surface Ads

A layout engine that takes one ad specification and automatically
arranges it to fit different surfaces like mobile, broadcast, and kiosk.
It works with new surfaces too, without using hardcoded layouts for
specific screens.

Live Demo : https://adaptive-layout-engine-lac.vercel.app/

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for how the algorithm works
and why it generalizes to unknown surfaces.

# Project Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

```bash
npm run build      
npm run typecheck  # for strict type-check 
```

# Usage

1. The demo defines one ad spec in `src/demoSpec.ts`. It includes a
   hero image, headline, price, CTA, and logo with their role and priority.

2. Select any of the 5 surfaces to see the same ad automatically adapt.
   Its layout, size, and visible elements change based on the surface constraints.

3. Click **"+ Unknown surface"** to create a new surface with custom
   width, height, and constraints. It works without changing the code.

4. Use the **DOM / Canvas** buttons to switch between the two renderers.
   Both use the same layout output from the resolver.

5. The right panel shows the resolver result, including the chosen
   layout, dropped elements, and any warnings.


# What's implemented against the spec

- Declarative `defineAd()` spec, fully typed and independent of any surface

- `defineSurface()` with real constraints like safe area, min tap target,
  min text size, viewing distance, and touch-only

- Genuine layout algorithm using aspect ratio and priority-based
  shrink/drop logic instead of hardcoded surface layouts

- Hard constraints like `minTapTarget` and `minTextSize` are always respected

- Zero overlaps and zero clipping across all 5 surfaces

- Different layouts for different surfaces: row, column, and centered-stack

- Full TypeScript typing for specs, surfaces, and resolver output

- Demo app with a live surface picker and 4+ profiles

- 5th "unknown" surface can be created directly from the UI without code changes

- Real text measurement and wrapping using Canvas `measureText`

- Canvas renderer using the same resolver output


# AI Usage 

I used AI tools to help brainstorm the project structure, implement the initial resolver logic and text-measurement utilities, and write some documentation. All generated code was reviewed, refactored, and tested to ensure correct layout behavior, proper validation, and maintainability. I also tested the resolver across all 5 surfaces and fixed issues found during testing, so I can clearly explain the implementation in an interview.

# Some Known Limitations

1.The layout budget check mainly works in one direction. Cross-axis sizes are limited based on the surface size, but they are not fully checked for overflow.

2.Accessibility is partly supported through minimum tap-target sizes, but automatic contrast checking is not implemented.

3.The Canvas renderer loads images after rendering and redraws them when they are ready. This works for the demo, but production use could be improved by preloading images.

4.The resolver was tested on the 5 built-in surfaces and some custom surfaces created in the demo. It was not tested with extreme sizes, such as a screen that is only 1px wide.

# Time Spent

Approximately 3 days(4-5 hrs daily)
