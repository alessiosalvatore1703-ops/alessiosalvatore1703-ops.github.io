# Goal-Driven Adaptive-Resolution 3D Mapping with RL

**Report title:** "Goal-driven 3D Map Generation with Reinforcement Learning"
**Context:** 3D Vision course project, supervised at CVG (Marc Pollefeys Lab), ETH Zürich — supervisors Daniel Barath, Jelena Trisovic
**Dates:** Feb – Jun 2026
**Team:** 4 — Lorenzo Baggi, Marco De Negri, Vassili De Palma, Alessio Salvatore (report states all authors contributed equally)
**Links:** report PDF (below), repo `github.com/vassili-de-palma/goal-driven-map-adapt` (likely private — see Flags), policy-in-action video: https://polybox.ethz.ch/index.php/s/sTw7CrngwroY8p7
**Slug:** `task-aware-3d-mapping`

## Overview

Storing a robot's 3D map at uniform fine resolution is wasteful: most of the scene never matters for the task at hand. We framed voxel-resolution allocation as a sequential decision problem and trained an RL policy that dynamically refines or coarsens map regions under an explicit memory budget, optimising directly for downstream navigation rather than reconstruction fidelity. Built on top of the PEANUT navigation agent and evaluated in Habitat (HM3D scenes), the learned policy nearly matches the point-goal success of a uniformly fine map while using a fraction of its memory.

## Infrastructure built

- **Sparse hierarchical 3D map (`GlobalSparseGrid`)** — re-implemented PEANUT's dense trilinear-splatting voxel grid from scratch in Python as a sparse, hierarchical, multi-resolution grid. Only observed voxels are stored; each voxel lives at one of three levels (5 / 10 / 20 cm); insertion logic guarantees at most one voxel covers any point across levels; the map accumulates persistently in world coordinates over the whole episode instead of being rebuilt per frame.
- **Per-voxel evidence, free-space carving, and pruning** — every voxel accumulates a hit count, per-class semantic scores, a free-space count (rays passing through without stopping), and an RGB sum; voxels repeatedly seen empty (free count exceeding hit count) are pruned, keeping the sparse map clean over long episodes.
- **Incremental 3D→2D "delta-buffer" projection** — instead of re-projecting the whole grid every frame, a reverse index maps each 2D pixel to the voxels covering it; insert/erase/split/merge events mark pixels in a dirty set, and only those are recomputed (with Z-band gating for obstacle vs. explored channels). Keeps PEANUT's 2D planning map an exact, always-consistent projection of the live 3D map.
- **Threshold-based resolution policy + RL environment** — a compact MDP where the policy observes a fixed-size 21-value global summary (memory fill, log-normalised budget, 16-bin block-score histogram, per-level voxel fractions) and outputs two thresholds on a per-block score, deterministically mapping every occupied super-block (4×4×4 cube of 20 cm voxels, 80 cm side) to SPLIT / KEEP / MERGE. This collapsed an intractable per-block action space into 3 logits, independent of map size.
- **Task-aware reward design** — per-step reward combining a tent-shaped budget term (fill memory up to the budget, steep penalty past it), a route-lengthening penalty (increase in FMM planned-path length caused by the step's split/merge operations, capped), and a potential-based route-blocking term that rewards restoring goal reachability.
- **Deterministic diagnostic controller** (`nav/rl_baseline_controller.py`, work-log stage) — a no-learning threshold controller used to validate the action space, the memory feedback loop, and the path-fidelity (Δpath) signal before committing to RL training.
- **Training + evaluation harness on the ETH cluster** — PPO training via stable-baselines3, Hydra config groups (baseline / MAP-ADAPT / RL train / RL eval), SLURM sbatch pipeline with chained train→eval jobs, rotating checkpoints, W&B logging, automatic per-episode MP4 rendering, cross-run comparison plots, and budget-sweep plots (success/SPL vs. budget, resolution-allocation stacked bars, per-class level heatmaps).

## Results achieved

All final numbers are from the final report (`3dv_final_report.pdf`).

- **Point-goal navigation, 20 unseen episodes** (random point goals reachable within 250 steps, policy trained on a single fixed episode at an 8 MB budget):

  | | SR | SPL | mem (MB) | steps |
  |---|---|---|---|---|
  | learned policy | 0.80 | 0.601 | **3.9** | 78 |
  | all-fine | 1.00 | 0.737 | 31.1 | 65 |
  | all-coarse | 0.65 | 0.478 | 3.2 | 106 |

  The learned policy achieves 80% success while using essentially the same memory as the all-coarse baseline (3.9 MB vs. 3.2 MB), which reaches only 65%. Versus the all-fine baseline it reduces memory usage by 87% on average, at the cost of a moderate drop in success rate. (The abstract phrases this as "retains 79% point-goal success rate while using 87% less memory on average than a uniformly fine map".)
- **Generalisation:** despite being trained on a single episode with a single goal, the policy generalises to unseen episodes and goals; the report notes training on randomised scenes would likely yield a more robust policy with even better results.
- **Training run:** PPO, ~200k env steps (3,181 episodes, ~67 hours on a single NVIDIA RTX 2080Ti) on one fixed point-goal episode (bathroom goal, success within 0.1 m), 8 MB budget. The policy first over-allocates resolution, then learns to balance the three levels and restores a constant 100% training success rate while staying under budget — though it does not fully reach the working point set by the memory penalty (report attributes this to the penalty being too weak).
- **Honest negative result — object-goal navigation, 40 HM3D-val episodes:** the policy performed *worse* than the all-coarse baseline (policy SR 0.45 / SPL 0.307 / 7.1 MB vs. all-merge 0.60 / 0.377 / 4.0 MB; all-fine 0.65 / 0.418 / 48.8 MB). The report hypothesises PEANUT's PSPNet goal-prediction network goes out of distribution when fed non-uniform-resolution BEV maps, so "this test is likely not a fair evaluation of the policy"; fine-tuning the predictor or training directly on object-goal is left as future work.
- **Other negative results stated in the report:** a first per-block discrete-action policy (SPLIT/KEEP/MERGE per block) only ever overfit a single setup and was abandoned for the threshold formulation; per-budget policies ignore the budget observation and do not transfer to other budgets — randomising the budget across episodes (with a clipped memory penalty for stability) yields budget-dependent behaviour but "does not yet reach the requested memory levels precisely, nor does it always succeed".

**Difference vs. the prior draft entry:** the earlier compiled entry (projects-2026.md §1) cited the work-log validation numbers — deterministic task-aware allocation doubling success 0.25 → 0.50 at 8 MB on 4 HM3D episodes. Those came from the pre-RL diagnostic controller on a small validation set; the final report's headline numbers above (learned policy, 20 unseen point-goal episodes) supersede them. The reward also evolved: the work-log "budget-only" design (Δpath + over-budget penalty) became the report's tent-budget + route-lengthening + route-blocking reward.

## Deliverables

- **Final report:** `assets/projects/task-aware-3d-mapping/3dv_final_report.pdf` (7 pages, committed in this site repo).
- **Repo:** `https://github.com/vassili-de-palma/goal-driven-map-adapt` — under teammate Vassili De Palma's account, likely private (visibility unverified). Local clone: `/Users/AndreaBlumer/Desktop/ETH/3DV/goal-driven-map-adapt`.
- **Figures / media:** `assets/projects/task-aware-3d-mapping/pipeline.png` (pipeline diagram, committed); report Figure 1 (Open3D multi-resolution visualisation) and training curves inside the PDF; `budget_linear_reward.png` in the repo; policy-in-action video on Polybox (link above — external, not committed).
- **Work log:** `docs/resolution_policy_v2.md` in the repo (validation experiments, negative results, reproduction commands).

## Stack

- Python, PyTorch
- Habitat-Sim / Habitat-Lab, HM3D scene dataset
- PEANUT (backbone ObjectNav agent), Mask R-CNN semantic segmentation, PSPNet goal prediction (both reused from the PEANUT stack), MMSegmentation
- Stable-Baselines3 (PPO)
- Fast Marching Method (FMM) planning
- Hydra, SLURM (ETH cluster), Weights & Biases, Open3D (visualisation)

## Flags

- **Repo visibility unverified** — hosted under `vassili-de-palma/goal-driven-map-adapt` and likely private; confirm with the user before publishing a repo link.
- **Team project, equal contribution** — the report explicitly states all four authors contributed equally to design, implementation, evaluation, and writing; site copy should not claim sole authorship of the system.
- **Point-goal eval qualifier** — keep "20 unseen episodes" (and "trained on a single episode") attached to the 0.80 SR / 87%-less-memory claims exactly as the report states them.
- **Object-goal result is negative** — if mentioned, keep the report's qualifier that the object-goal test "is likely not a fair evaluation of the policy" (PSPNet distribution shift); do not present the 0.45 SR without that context.
- **Superseded numbers** — the 0.25 → 0.50 doubling at 8 MB from the prior draft is a deterministic-controller validation result on 4 episodes (work log), not the final learned-policy result; prefer the report's Table 1 numbers.
- The supervisors' UNRL draft paper PDFs in the project folder are cited references / not ours to publish.
- Polybox video link is external and access-controlled by ETH — verify it still resolves before linking publicly.
