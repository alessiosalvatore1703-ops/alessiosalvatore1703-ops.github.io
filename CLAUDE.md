# CLAUDE.md — Personal Website of Alessio Salvatore

Personal portfolio site for Alessio Salvatore, M.Sc. Robotics student at ETH Zürich.
Deployed as a **GitHub Pages user site** (`alessiosalvatore1703.github.io`).

## Hard constraints

- **Static only.** GitHub Pages serves files as-is: no server, no backend, no databases,
  no API keys. Everything must work as plain HTML/CSS/JS opened from the `main` branch root.
- **No build step.** No npm, no bundler, no framework CLI. The repo content *is* the site.
  If the site outgrows this, migrating to Astro is the agreed upgrade path — but do not
  introduce it without asking first.
- **Videos are never committed raw** if large. Keep any committed video under ~10 MB
  (short mp4 clips, compressed). Longer videos are hosted on YouTube/Drive and embedded
  or linked. Reports (PDFs) are committed under `assets/`.

## Stack

- Semantic HTML5 pages.
- **Tailwind CSS via Play CDN** (`<script src="https://cdn.tailwindcss.com"></script>`)
  — acceptable for a personal site with this traffic; revisit only if performance becomes
  a real complaint.
- A single small `assets/css/custom.css` for anything Tailwind can't express cleanly
  (keep it minimal).
- Vanilla JS only, in `assets/js/main.js`. No jQuery, no frameworks.

## Site structure (mirrors the CV template — this order is intentional)

The homepage (`index.html`) follows the CV top-to-bottom:

1. **Hero / About** — who Alessio is, one short paragraph + interests
   (robotics, RL, computer vision, planning, aerial robots). Photo optional. Links:
   GitHub, LinkedIn, email, "Download CV" → `assets/cv.pdf`.
2. **Projects** — the centerpiece. Two groups, matching the CV:
   - *Current Projects* (ongoing research)
   - *Past Projects*
   Each project renders as a card: title, affiliation/context line, date range,
   2–3 bullet description, tags, and links (repo / video / report / detail page).
3. **Experience** — work experience entries (JOIINT Lab, ETH Robotics Club).
4. **Education** — ETH Zürich, Politecnico di Milano, IIT Chicago exchange.
5. **Footer** — contact links repeated.

### Per-project detail pages

Every project that has media gets its own page:

```
projects/<slug>/index.html          → detail page (long description, embedded video, links)
assets/projects/<slug>/report.pdf   → committed report, linked from the page
assets/projects/<slug>/*.mp4|jpg    → small demo clips / images
```

Slugs are kebab-case: `task-aware-3d-mapping`, `aerial-knowledge-distillation`,
`mitral-valve-segmentation`, `multi-agent-planner`, `satellite-docking`.
Cards on the homepage link to the detail page when one exists; otherwise link
directly to the repo/report.

## Content — source of truth

The CV is the source of truth for content. A copy lives at `assets/cv.pdf`
(original: `~/Downloads/cvalessio (2).pdf`, May 2025 version). When the user updates
the CV, update the site content to match — never invent achievements or reword claims
into stronger ones than the CV states.

Current CV snapshot (summary):

- **About**: Italian, b. 2003. M.Sc. Robotics @ ETH Zürich (Sep 2025–). B.Sc. Automation
  Engineering @ Politecnico di Milano, 110/110 cum laude. Exchange @ Illinois Institute
  of Technology, Chicago (Aug–Dec 2024). Contact: alessiosalvatore1703@gmail.com.
- **Current projects**:
  - *Task-Aware 3D Map Generation with RL* — CVG, Marc Pollefeys Lab (Feb 2026–). RL agent
    selecting voxel resolution by task relevance; 3D reconstruction in PEANUT codebase for
    point/object-goal navigation.
  - *Knowledge Distillation for Aerial Robots Control* — ASL, Roland Siegwart Lab (Feb 2026–).
    Imitation learning (BC, DAgger) for OMAV control; neural approximation of a model-based
    controller; hardware deployment with real-flight data augmentation.
- **Past projects**:
  - *DINOv3 for Mitral Valve Segmentation* (12/2025, has repo) — preprocessing pipeline for
    medical video, DINO feature propagation for pseudo-labels, U-Net training.
  - *Multi-Agent Multi-Goal Collection Planner* (12/2025, PDM4AR class) — LNS task allocation
    + real-time path planning + decentralized collision avoidance under partial observability.
  - *Autonomous Satellite Docking Planner* (11–12/2025, PDM4AR class) — trajectory optimization
    via Sequential Convexification in cluttered environments.
- **Experience**: Research Intern, JOIINT Lab — Italian Institute of Technology, Bergamo
  (Feb–Jun 2025, has repo): linear actuator CAD, Arduino real-time control, MATLAB simulation.
  Partnerships Team Lead, ETH Robotics Club (Nov 2025–).

The CV marks repo links for *DINOv3 Mitral Valve* and *JOIINT Lab* — get the actual URLs
from the user before publishing; use `#` placeholders in the meantime and flag them.

## Design & tone

The design system is decided — do not re-invent it, extend it:

- **Palette** (Tailwind tokens in the inline Play-CDN config in each page's `<head>`):
  `paper #FBFBF9` (bg), `ink #0E1B2C` (text), `accent #EA5A0B` (signal orange),
  `muted #5D6B77` (meta text), `line #DDDFD9` (borders). Project cover art uses ink as
  background with `#9FB3C8`/`#5C7089`/`#3A4A5C` line work + accent highlights.
- **Type**: Archivo (variable; `.display-expanded` = font-stretch 125% for display) +
  IBM Plex Mono for all meta text (dates, tags, nav, eyebrows). Both from Google Fonts.
- **Signature element**: hero background canvas (`assets/js/main.js`) — a voxel grid that
  refines resolution near the cursor, echoing the task-aware 3D mapping research. Keep it
  subtle; it respects `prefers-reduced-motion` and falls back to a static grid.
- **Recurring motif**: `.viewfinder` corner brackets (custom.css) frame the portrait and
  project media — fiducial-marker vernacular. Use it for any new media.
- **Media slots**: every project card/feature has a `<figure>` marked `MEDIA SLOT` in a
  comment. Swap the placeholder SVG (`assets/projects/<slug>/cover.svg`) for a real image,
  or replace `<img>` with the commented `<video>` template next to it.
- Clean, minimal, academic-professional — think research-lab personal page, not a
  marketing landing page. Content first, restrained decoration.
- Typography-led hierarchy; generous whitespace; subtle hover states only. No scroll-jacking,
  no heavy animation libraries.
- Fully responsive; must read well on a phone since recruiters open links from email.
- Writing tone on the site: first person, concise, technically precise — matches the CV's
  bullet style. English only.

## Component conventions (no framework, so discipline replaces tooling)

- Repeating UI (project card, section heading, tag pill) is defined **once** as a copyable
  HTML pattern in `index.html`, marked with a comment `<!-- component: project-card -->`.
  When editing one instance, update all instances to stay identical in structure.
- Tailwind class order: layout → spacing → typography → color → state variants.
- All pages share the same `<head>` block (Tailwind CDN + inline config + custom.css +
  meta/OG tags) — when changing it, change it in every page.
- Relative links only (site lives at domain root, but keep pages portable).
- Images get `alt` text; embedded videos get a poster image and a text fallback link.

## Git discipline

- Commit after each self-contained task (one section, one page, one fix) — small commits,
  imperative messages ("Add projects section", "Fix mobile nav overflow").
- Never force-push `main`; `main` is the deployed site.
- Review with the user before the first push that makes the site publicly visible.

## Verifying work

- After visual changes, open the page in a browser (or Playwright if available) and check
  desktop + mobile widths before calling it done.
- Check that all internal links resolve and no console errors appear.
