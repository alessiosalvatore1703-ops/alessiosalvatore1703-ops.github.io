# MARL Patrol Pipeline for Large-Area Autonomous Surveillance — Laelaps AI

**Slug:** `laelaps-marl-patrol`
**Context:** Work project, Robotics Engineer at Laelaps AI (professional work, not a course project)
**Dates:** Jun 2026 — Present (repo `LaelapsAI-orchestrator`, first commit 2026-06-15)
**Attribution:** sole author of the pipeline — 106 of 109 commits in the repo are mine
**Links:** none publishable — the repo is **private** (`github.com/LaelapsAI/LaelapsAI-orchestrator`)

> This file is the **source of truth for the Laelaps AI work-experience entry** in the CV,
> in tailored CVs, and on the website. It sits alongside the project files here because it
> is a project, but it is rendered under *Experience*, not *Projects*.

## Overview

I built, from scratch, a multi-agent reinforcement learning pipeline that trains teams of
robots to patrol large areas autonomously — both the patrol simulator and the MAPPO training
framework are mine. The same trained policy transfers across different maps, because the
policy encodes only each agent's **local observations**, which makes deployment easy and
straightforward. The policy is **end-to-end**, from position to velocity commands, so
integration on a robot is equally straightforward.

## What I built

- **The patrol simulator itself**, written from scratch in two mirrored implementations: a
  batched torch-native simulator (hundreds of parallel envs, GPU or CPU) as the training path,
  and a Gymnasium reference implementation for rendering, demos and cross-checks. Line-of-sight
  FOV coverage, lidar, collision sliding, and a decoupled coarse/fine coverage grid.
- **MAPPO training framework** on TorchRL — CTDE with a parameter-shared recurrent (GRU)
  actor and a centralized critic, truncation-correct GAE, chunked-BPTT recurrent minibatching,
  online observation normalization saved into the checkpoint, and continuous or binned-discrete
  action heads.
- **A deployment-ready policy interface**: the actor consumes only the agent's own local
  observations (its pose, its own sensing, one teammate term) — no global state, no map at
  inference — and outputs velocity commands end-to-end, so serving it on a robot needs no
  planner or map server in the loop.
- **Map ingestion pipeline** (separate module and environment): raw ROS occupancy map →
  morphological cleaning → agent-radius inflation and largest-reachable-region extraction →
  discretization to the training grid → a deterministic, per-map evaluation scenario suite.
  Bundles are content-hashed; evaluation refuses a checkpoint↔map mismatch.
- **Generalization across maps** via domain randomization — obstacle injection, lidar sensor
  noise, speed and idleness randomization — plus sim2real noise models.
- **Evaluation and experiment infrastructure** I treat as the actual product: a fixed
  spawn-scenario suite scored by a map-area-normalized staleness metric (never the reward
  proxy), ground-truth CSVs as the source of truth with a provably RNG-neutral W&B mirror,
  per-checkpoint failure GIFs of the *worst-scoring* scenarios, and bit-for-bit reproducible
  seeded runs on both CPU and GPU (locked in by tests).
- **Automated sweep + cloud training**: a deterministic sweep control plane, and a
  config-driven GCP launcher that reads the training config to decide what to ship, spins up
  a self-terminating GPU VM, streams metrics home and pulls the best checkpoints back.
- **3D validation stack**: an in-process ROS 2 bridge that rolls a 2D-trained checkpoint out
  on two Unitree Go2 quadrupeds in an Isaac Sim warehouse, building observations through a
  shadow copy of the training environment so parity with training is exact, plus a live
  multi-panel dashboard.
- **~90-test CPU/headless smoke suite** covering contracts, reproducibility, the cloud
  layer and the 3D bridge.

**Stack:** Python, PyTorch, TorchRL/TensorDict, Gymnasium, ROS 2, Isaac Sim, Docker,
Google Cloud (Compute Engine, GCS, Secret Manager), W&B, OpenCV, pytest.

## Flags (BINDING — read before writing any CV bullet or web copy)

- **Private employer repo.** Never publish a link, a file path, a module name, a config
  key, an internal document name, or a code snippet. Describe capabilities at
  architecture level only, as above.
- **No numbers without the user's explicit OK.** Internal validation figures exist
  (a 3D-sim coverage percentage, sweep scores, run scales) but are unreleased and
  employer-confidential — do **not** quote them in a CV, on the website, or to a
  recruiter until Alessio clears the specific number.
- **"Different maps" means map bundles + domain randomization**, validated in simulation
  on ingested real SLAM maps. It does **not** mean a fielded multi-site deployment —
  keep the "in simulation" qualifier.
- **3D validation = plumbing verified, behavior not yet judged.** A policy has been rolled
  out on 2 Go2 in Isaac Sim; do not claim validated 3D patrol *performance*, and do not
  claim real-robot deployment.
- **Two agents**, not a large fleet. Say "teams of agents" or "two cooperating agents";
  never imply swarm scale.
- **Ongoing work.** Present tense, no completion claims.

## CV / site copy (use these; re-frame by selection, never by inflation)

**Full entry (`assets/cv/main.tex`, 3 bullets):**
- Built from scratch a multi-agent reinforcement learning pipeline — both the patrol simulator
  and the MAPPO (CTDE) training framework — that trains robot teams for autonomous patrol of
  large areas.
- Kept the learned policy deployment-ready: it consumes only each agent's local observations
  and maps them end-to-end to velocity commands, and one policy transfers across different maps.
- Built the surrounding research infrastructure — batched GPU simulation, a fixed evaluation
  scenario suite, bit-for-bit reproducible runs, automated sweeps on self-terminating GCP GPU
  VMs, and a ROS 2 / Isaac Sim bridge validating 2D-trained policies on two Unitree Go2.

**One-pager (`assets/cv/onepage.tex`, 1 bullet):** the one-pager is full — measured
2026-08-19, this entry has room for exactly **one ~110-character line** before the page
breaks, so it carries only: "Built from scratch a MARL pipeline (simulator + MAPPO) for
autonomous patrol of large areas, map-agnostic." A longer version needs space freed
elsewhere first; always re-check `pdfinfo cv.pdf | grep Pages` after touching it.

**Site experience blurb (one sentence):** Building a multi-agent reinforcement learning
pipeline from scratch — simulator and MAPPO training framework — that trains robot teams to
patrol large areas autonomously, from each agent's local observations straight to velocity
commands, and transfers across different maps.

**Tailoring angles (per application):** RL/learning roles → lead with MAPPO, recurrent CTDE,
reward and observation-space design; the simulator being mine is the differentiator. Infrastructure/MLOps roles → lead with reproducibility,
sweep automation, cloud training and the test suite. Robotics/field roles → lead with map
ingestion from SLAM, sim2real noise, ROS 2 and the Go2 / Isaac Sim validation stack.
