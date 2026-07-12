---
name: tailor-cv
description: Create a tailored, compiled one-page CV PDF for a specific job or research application. Use when the user shares a job posting, role description, lab/research project description, or asks to tailor/adapt the CV for an application. Accepts the description as pasted text, a file path, or a URL.
---

# Tailor CV

Produce `applications/<slug>/cv.pdf` — a one-page XeLaTeX CV tailored to one specific
role, built from this repo's verified content only. Tailoring means **selection and
re-framing**, never keyword-stuffing and never new claims.

## 0. Intake

- Get the job/research description: pasted text, a file path (Read it), or a URL
  (WebFetch it).
- Derive a slug: `<company-or-lab>-<role>` in kebab-case, e.g.
  `anybotics-perception-intern`. Everything goes in `applications/<slug>/`.
- Target length is 1 page unless the user says otherwise (academic/research
  applications sometimes want the full detail — ask only if the description suggests it).
- `applications/` is gitignored by design. Never commit anything under it.

## 1. Research (read before writing anything)

Extract the role's 3–5 core needs **in your own words**: domains, stacks,
hardware/simulation, research topics, seniority signals. Then read the content
sources, in this precedence order:

1. `content/projects/README.md` — declares precedence rules and result supersessions.
2. `content/projects/<slug>.md` for every candidate project — **the `## Flags`
   sections are BINDING constraints on what may be claimed.**
3. `assets/cv/main.tex` — the full master CV; canonical wording for Education, Work
   Experience, and pre-2026 projects not covered by the content bank (DINOv3
   mitral-valve, PDM4AR planners, satellite docking, JOIINT Lab).
4. `content/projects-2026.md` — background only; where it disagrees with a
   per-project file, the per-project file wins.

Where a selected project has a public repo, optionally fetch its README for extra
technical detail worth surfacing for this role.

## 2. Selection & angle analysis — CHECKPOINT (mandatory)

Before writing ANY file, present to the user and WAIT for approval:

- **Role reading** — the 3–5 things this role actually selects for.
- **Selection table** — every entry of the master CV (`main.tex`) → keep / condense /
  drop, with a one-line positioning angle for each kept entry (which facet leads,
  which bullet survives).
- **Constraint notes** — flags that limit claims for the selected entries.
- **Open questions** — e.g. which of two equally relevant projects to feature.

Do not create the application folder or any .tex until the user approves or amends
this analysis.

## 3. Write

- `mkdir -p applications/<slug>/`.
- Copy `assets/cv/preamble.tex` into the folder **unchanged**.
- Create `cv.tex` starting from a copy of `assets/cv/onepage.tex`, then apply the
  approved selection and re-framing. Read `references/writing-rules.md` before
  rewording any bullet.
- Hard rules (non-negotiable):
  - No invented achievements. No numbers that are absent from the sources.
  - Qualifiers stay attached to their claims ("in simulation", "validation",
    "qualitative only", episode counts).
  - Team work stays phrased as team work; individually-attributed work follows the
    content bank's attribution notes.
  - No links to private or lab-internal repos (3D-mapping teammate repo, omav_sim
    fork — check the flags).
- Also write `applications/<slug>/notes.md`: the job description (verbatim), today's
  date, the approved selection table, and any claims deliberately left out and why.

## 4. Compile loop

- `cd applications/<slug> && latexmk -xelatex -interaction=nonstopmode cv.tex`
  (XeLaTeX is required by the arimo/fontspec preamble).
- Check pages: `pdfinfo cv.pdf | grep Pages`. Iterate until the agreed length.
- Overflow trimming order: shorten the weakest bullet → merge bullets → drop the
  least relevant entry. **Never** shrink below 10pt font or 0.6in margins.
- Visually check the PDF (Read it) before delivering.
- `latexmk -c` afterwards to clear aux files.

## 5. Deliver

Report to the user:
- the absolute path to `cv.pdf` and its page count;
- a delta summary vs `onepage.tex`: entries dropped/added/reworded and the angle used;
- a reminder that the folder is gitignored and stays local.
