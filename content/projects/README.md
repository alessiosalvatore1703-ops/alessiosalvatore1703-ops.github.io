# Project overviews — CV hub index

One file per project, compiled 2026-07-12 by reading the local project folders and the
committed report PDFs. Every claim in these files is backed by a source file (code, report,
slides, or git history) — nothing invented. These are the **source of truth for results and
deliverables**; `../projects-2026.md` holds the older website-ready card copy and is
superseded where the two disagree (differences are flagged inside each file).

## Research / course projects (2026)

- [task-aware-3d-mapping.md](task-aware-3d-mapping.md) — RL voxel-resolution allocation on
  PEANUT/Habitat. Final report numbers: point-goal SR 0.80 at 3.9 MB vs 1.00 at 31.1 MB
  uniform-fine (20 unseen episodes) — supersedes the old 0.25→0.50 validation claim. Honest
  negative object-goal result kept. Repo on a teammate's account, likely private.
- [aerial-knowledge-distillation.md](aerial-knowledge-distillation.md) — OMAV controller
  distillation into an LSTM through differentiable dynamics. Report provides the first
  publishable numbers: beats nominal MBC in tracking (p < 10⁻¹⁰, 2,000 paired rollouts),
  divergence 41.5% → 24.0% at ±30% plant randomization, hidden-state probe R² = 0.967.
  Zero-shot real-OMAV flight confirmed but qualitative only. Repo lab-internal.
- [vla-so101.md](vla-so101.md) — SmolVLA language-conditioned pick-and-place on a real
  SO-101 arm; face-swap augmentation, H100 cloud training, 10 FPS on-robot. No success
  percentages exist — results stay qualitative. Alessio authored 18 of 24 commits.

## Hackathons / field deployments (2026)

- [unitree-a2-exploration.md](unitree-a2-exploration.md) — ETH Robotics Summer School,
  Unitree A2 autonomous search-and-explore across three field sites. Git-verified own work:
  team repo creation + the original artifact-mapping node. ⚠️ Open3D map-cleaning pipeline
  was committed by a teammate — confirm attribution before claiming it individually.
- [agibot-x2-person-following.md](agibot-x2-person-following.md) — RoboHack 2026, real-time
  person following on the Agibot X2 humanoid (YOLOv8 + SGBM depth, Ruckig head tracking,
  safety-first state machine). Demo video committed. Arm assist is time-triggered, not
  head-pat-triggered (corrects the old card copy).
- [pipe-inspection-odometry.md](pipe-inspection-odometry.md) — Physical AI Hackathon,
  CPU-only visual odometry for sewer-probe position (~1000 frames < 8 s). No accuracy
  metrics exist anywhere — do not quote error numbers. Repo on a teammate's account.

## Background

- [eth-coursework.md](eth-coursework.md) — compact sweep of graded AML / PAI / IAACV
  projects (tabular regression, mitral-valve segmentation, GPs, SWAG, actor-critic RL,
  classical CV). No grades recorded in the files.
