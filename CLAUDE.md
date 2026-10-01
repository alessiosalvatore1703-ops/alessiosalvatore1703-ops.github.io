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
- Plain CSS in a single `assets/css/custom.css` (no Tailwind since the 2026-10-01
  redesign — keep it minimal).
- Vanilla JS in `assets/js/main.js`. No jQuery, no frameworks, no libraries. The user
  previews by opening `index.html` directly over `file://`, so no ES modules.

## Site structure (mirrors the CV template — this order is intentional)

The homepage (`index.html`) follows the CV top-to-bottom:

1. **Sidebar + About** — profile sidebar (photo, name, role, links, "Download CV" →
   `assets/cv.pdf`) and a short first-person About Me.
2. **Experience** — work experience entries, reverse-chronological (Laelaps AI,
   ETH Robotics Club, JOIINT Lab). Moved above Projects on 2026-08-19 at the user's
   request, now that the Laelaps MARL patrol work leads the CV — the CV's
   `\section*{Work Experience}` sits first in `main.tex`/`onepage.tex` for the same
   reason. Keep the CV files and the site in sync.
3. **Projects** — the centerpiece. Two groups, matching the CV:
   - *Current Projects* (ongoing research)
   - *Past Projects*
   Each project renders as a card: title, affiliation/context line, date range,
   2–3 bullet description, tags, and links (repo / video / report / detail page).
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

Three sources, in priority order:

1. **`content/projects/`** — one file per project/entry, compiled from the local project
   folders and reports; `content/projects/README.md` is its index and declares precedence
   and result supersessions. Each file's `## Flags` section is a **binding** constraint on
   what may be claimed. **`content/projects/laelaps-marl-patrol.md` is the source of truth
   for the Laelaps AI work-experience entry** (CV `.tex`, tailored CVs, and the site's
   Experience section) — read it every time that entry is touched; it is employer-
   confidential work, so no repo links, no internal numbers, architecture level only.
2. **`content/projects-2026.md`** — website-ready copy for the six 2026 projects, compiled
   from the local project folders. **Read its ⚠️ flags before editing project copy**: some
   repos are private or lab-internal (MapAdapt, OMAV fork — no public links), some numbers
   must keep their "validation" qualifier, and some quantitative claims are forbidden
   (VLA success rates, OMAV final numbers). Its bottom checklist tracks what's still
   needed from the user.
3. **The CV** — LaTeX sources live in `assets/cv/` (XeLaTeX, Arimo font):
   `preamble.tex` (shared packages/layout/header — the `\cvheader` macro),
   `main.tex` (full 2-page master CV → built to `assets/cv-full.pdf`, committed but not
   linked on the site), and `onepage.tex` (general 1-page CV → built to `assets/cv.pdf`,
   what the site's "Download CV" links). The `.github/workflows/build-cv.yml` GitHub
   Action recompiles **both** on any push touching `assets/cv/**`. Edit the `.tex`, never
   the PDFs. Entries are **intentionally duplicated** between `main.tex` and `onepage.tex`
   (different projections, not shared macros) — when editing an entry, check the sibling
   file. Use `main.tex` for About/Experience/Education and the 2025 projects.
   Section order in both is **Work Experience → Education → Projects** (since 2026-08-19).
   `onepage.tex` is at its exact 1-page limit (regenerated 2026-09-03 from the
   `uzh-rpg-aerobatic-grasping` tailored CV): the two Research Projects get a
   problem-bullet + solution-and-metrics-bullet pair, everything else is a single
   inline statement, and the Laelaps entry fits exactly two bullets. There is no slack
   left — always re-check `pdfinfo` after editing it.
   Per-application tailored CVs are generated by the `/tailor-cv` skill
   (`.claude/skills/tailor-cv/`) into `applications/<slug>/` — gitignored, never committed.

Never invent achievements or reword claims into stronger ones than the sources state.
GitHub username confirmed: `alessiosalvatore1703-ops`. Real media already in the site:

- `vla-so101/demo.mp4` — card cover (converted Jul 2026 from the original `demo.gif`,
  which was then deleted; it lives in git history)
- `aerial-knowledge-distillation/demo.mp4` — card cover (transcoded from the user's 8K
  original with ffmpeg, 1280px CRF26; the 194 MB original was deleted after transcoding —
  user's own copy is on their phone/source device, not this machine). `pipeline.png` for a
  future detail page.
- `agibot-x2-person-following/demo.mp4`, `pipe-inspection-odometry/demo.mp4` +
  `slides.pdf` + `results.jpeg`, `unitree-a2-exploration/cover.jpeg` — card covers.

Project rows with real media use
`<video loop muted playsinline preload="none" poster="…/poster.jpg" data-autoplay>`
(or img) as the thumbnail, no overlays. Every video has a committed `poster.jpg` next to
it; `main.js` plays/pauses `[data-autoplay]` videos as they enter/leave the viewport, so
they are always running while visible (mobile perf pass, Jul 2026 — do not put a bare
`autoplay` attribute back, it defeats `preload="none"`). Below-fold `<img>`s get
`loading="lazy" decoding="async"`. `main.js` holds the small site-wide bits (footer year,
video autoplay).

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

The design was reset on 2026-10-01 at the user's request ("more sober, really standard"),
modelled on the academic pages https://renezurbruegg.github.io/ and
https://mgomezandreu.github.io/personal/. The user compared three mockups and picked the
**academic sidebar** layout — extend it, do not re-invent it:

- **Layout**: two columns (`.layout`, max 1100px). Left: sticky `.profile` sidebar —
  round portrait, name, role, ETH / Laelaps affiliation, obfuscated email, text links
  (Email, GitHub, LinkedIn, X), outlined "Download CV" button. Right: `About Me`,
  `Experience`, `Research Projects`, `Other Projects`, `Education`, small footer.
  Below 820px the sidebar stacks on top and project rows stack thumbnail-over-text.
- **Palette** (CSS vars on `:root` in custom.css): `--ink #222`, `--muted #666`,
  `--line #e5e5e5`, `--link #1f4e8c` (navy — user explicitly chose to keep coloured
  links), `--bg #fff`. The old strict-monochrome rule no longer applies.
- **Type**: Lato (Google Fonts) everywhere; ui-monospace only for the email line.
- **Project rows** (`.project`): 200px 8:5 `.thumb` on the left, vertically centered
  against the text (user request), then title, meta line (context · date),
  description, small outlined `.btn` links (Report / Code / Video / Slides / HF Hub).
  **No badges/labels on thumbnails** (user rejected them). Photos crop (`cover`);
  plots and diagrams use `.thumb-fit` (contain on white), the pipe video
  `.thumb-fit .thumb-dark` (contain on black).
- **Videos always play** (user request): see the media conventions above — loop while
  on-screen, no hover/click needed.
- **Removed on 2026-10-01**: the three.js hero point cloud (`hero.js`, `hero-shapes.js`,
  `tools/sample_hero_shapes.py` — all in git history), Tailwind, Archivo/IBM Plex Mono,
  viewfinder brackets, tag pills, the scroll-reveal/magnetic/load-fade motion layer,
  and the card grid. Do not bring them back without asking. Project covers carry no
  hover overlays.
- **Media slots**: every project row has a `<figure>` marked `MEDIA SLOT` in a comment.
- Clean, minimal, academic-professional — a research-lab personal page, not a
  marketing landing page. No animation beyond the looping project videos.
- Fully responsive; must read well on a phone since recruiters open links from email.
- Writing tone on the site: first person, concise, technically precise — matches the CV's
  bullet style. English only.

## Component conventions (no framework, so discipline replaces tooling)

- Repeating UI (project row, timeline entry) is defined **once** as a copyable HTML
  pattern in `index.html`, marked with a comment `<!-- component: project-row -->` /
  `<!-- component: timeline-entry -->`. When editing one instance, update all instances
  to stay identical in structure.
- Styling is plain CSS classes in `assets/css/custom.css` — no utility framework.
- All pages share the same `<head>` block (Lato font + custom.css + meta/OG tags) — when
  changing it, change it in every page.
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
