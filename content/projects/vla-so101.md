# Vision-Language-Action Policies on an SO-101 Arm

**Slug:** `vla-so101`
**Context:** Robot Learning course, ETH Zürich — group project
**Dates:** May 2026 (commits 2026-05-06 → 2026-05-27)
**Team:** 5 (Alessio + 4 teammates); Alessio authored the majority of commits (18 of 24)
**Links:**
- Repo: https://github.com/alessiosalvatore1703-ops/VLA-robotlearning
- HF org (all datasets + checkpoints): https://huggingface.co/ETHrobotlearning

## Overview

Fine-tuned SmolVLA vision-language-action policies for language-conditioned pick-and-place
on an SO-101 arm, across three tasks of increasing difficulty in what the language must
do: color-conditioned commands ("place the banana in the red bowl"), compositional
instructions (ordinal, relative, and negated bowl references), and grounding celebrity
portraits ("place the coke on Barack Obama") — including generalization to
out-of-distribution identities never seen in training. Each rollout runs autonomously
on the physical arm under a 20-second limit.

## Infrastructure built

Alessio built most of the data/training infrastructure around LeRobot:

- **LeRobot data pipeline** (`datasets/utils/`, ~20 transform scripts): episode relabeling,
  dataset merging, trimming of leading/trailing frozen-action frames so the policy isn't
  taught to sit still, FPS downsampling, video re-encoding, and metadata repair —
  recomputing `meta/stats.json` normalization stats and episode `splits`, because SmolVLA
  silently trains unnormalized (or hides episodes) when those are wrong. Plus a
  `lerobot-doctor` diagnostics tool and `validation/` dataset checks.
- **Prompt relabeling** (`augmentation/text_augment.py`, `relabel_*` scripts): existing
  episodes are relabeled into new prompt families with the trajectory fixed — a ~20-template
  paraphrase library for Task 1, and for Task 2 ordinal→color, color→negation, and
  ordinal→relative rewrites (bowl order is encoded in config names like
  `config1-red-blue-green`). Each episode ends up with ~5 prompt formulations at near-zero
  collection cost.
- **Brightness augmentation** (`augmentation/augment_brightness_push.py`): splits a dataset
  into contiguous slices and applies a different brightness multiplier to each, in place —
  no duplicated episodes, only pixel changes — for lighting robustness.
- **Celebrity face-swap augmentation** (`augmentation/celebrity_swap/`): detects the three
  portrait cards in each frame, identifies which quad is which training identity, and
  composites different celebrity faces onto them with occlusion-aware blending
  (multiprocessing per-episode workers), multiplying identity coverage so the Task 3
  policy can generalize to celebrities it never physically saw.
- **DAgger-style refinement as a curriculum**: roll out a first policy, collect corrective
  demonstrations for the observed failure cases, fold them back in, and continue training
  from the previous checkpoint (`--policy.pretrained_path`).
- **VLM spatial-grounding benchmark** (`benchmarks/celebrity_recognition/`,
  `run_benchmark.py`): four celebrity cards in a 2×2 grid; the VLM is asked which quadrant
  contains a named person. Used to test whether a small VLM could serve as a standalone
  grounding oracle.
- **Frozen-backbone action-expert training** (`training/training_smolvla.py`): vision
  encoder and VLM backbone kept frozen (`--policy.freeze_vision_encoder`,
  `--policy.train_expert_only`); model capacity right-sized per task via
  `--policy.num_vlm_layers` — 8 VLM layers for Task 1, 16 for Tasks 2 and 3.
- **Automated H100 cloud training** (`training/orchestrate.py`): provisions a Brev H100 SXM
  instance (Nebius, 80 GB, $3.54/hr), drives training over SSH, streams each checkpoint to
  the Hugging Face Hub as it's written (freeing the local copy), optional W&B logging, and
  deletes the instance on completion, failure, or Ctrl-C so a crashed run never bills idle.
- **On-robot evaluation**: per-task rollout scripts (`run_eval_1/2/3.sh`) load checkpoints
  from the Hub and run SO-101 rollouts at 10 FPS (`POLICY_DEVICE=mps` by default), taking
  a custom prompt as the first argument.

## Results achieved

No quantitative success rates were recorded — results are qualitative, as the repo
documents them:

- All three policies run autonomously on the real arm; the README's rollout GIFs show
  Task 3 successes for "Put the coke can on Barack Obama" (in-distribution) and
  "Put the coke can on Michael Jackson" — an identity **never in the training set**
  (training identities: Taylor Swift, Barack Obama, Yann LeCun), demonstrating OOD
  identity generalization enabled by the face-swap augmentation.
- The VLM benchmark found `SmolVLM-256M-Instruct` and `SmolVLM-500M-Instruct` both at
  chance level (25% on 20 samples of a 4-way task) with fixed positional biases and no
  celebrity understanding — the finding that justified training a frozen-backbone action
  expert rather than asking the VLM to reason explicitly. Unfreezing the VLM on Task 3
  was tested and showed no clear improvement, so it was reverted.
- Final policies on the Hub: `ETHrobotlearning/task1-dagger_038000` (8 layers, DAgger),
  `ETHrobotlearning/smolvla_task2_colors_dagger_lr2e-5-step2000` (16 layers, ~5
  prompts/episode, brightness aug, DAgger), `Alessio03/smolvla-task3-50k` (16 layers,
  face-swap aug, 50k steps).

## Deliverables

- Repo: https://github.com/alessiosalvatore1703-ops/VLA-robotlearning (source-only; all
  datasets/checkpoints re-pullable from the Hub) with a design-decisions README.
- HF models + datasets on https://huggingface.co/ETHrobotlearning (e.g. datasets
  `tv-task1-clean-4prompts-fixed`, `tv-task2-clean-aug5p-fixed`, `task3-TOY-clean`).
- Demo GIFs in `docs/`: `eval3_coke_michael_jackson.gif` (OOD identity — strongest asset),
  `eval3_coke_obama_1.gif`, `eval3_coke_obama_2.gif`.
- Side exploration kept for reference: MolmoAct2 (Ai2) fine-tuning + remote policy server
  as an alternative Task 3 backbone (`training/*molmoact2*`, `inference/`).

## Stack

- Python, PyTorch, LeRobot, SmolVLA (frozen VLM + action expert)
- Hugging Face Hub (datasets + checkpoint streaming), Weights & Biases (optional)
- OpenCV, torchvision (face-swap compositing pipeline)
- SO-101 arm; Brev/Nebius H100 cloud instances; macOS MPS inference at 10 FPS
- SmolVLM 256M/500M (benchmark); MolmoAct2 (exploration)

## Flags

- ⚠️ **No quantitative success rates** exist anywhere in the repo — never state
  percentages for task success (the only number is the VLM benchmark's 25% chance-level
  accuracy, which is a negative finding about SmolVLM, not a policy result).
- ⚠️ Exact course name/code unconfirmed — "Robot Learning course, ETH Zürich" is inferred
  from the folder (`ROBOTLEARNING/ethz-course-2026`); confirm with the user.
- Task 3's final checkpoint lives under a personal HF account (`Alessio03/smolvla-task3-50k`),
  not the ETHrobotlearning org — fine to link, just be aware.
