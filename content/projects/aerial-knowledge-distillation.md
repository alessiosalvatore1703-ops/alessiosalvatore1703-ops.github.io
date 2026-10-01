# Knowledge Distillation for Aerial Robot (OMAV) Control

**Report title:** "Knowledge Distillation for Aerial Robots Control"
**Context:** Perception and Learning for Robotics course, Autonomous Systems Lab (Roland Siegwart), ETH Zürich — supervisors Dr. Eugenio Cuniato, Dr. Thomas Stastny
**Dates:** Feb – Jun 2026
**Team:** 2 — Alessio Salvatore, Angelo Stefanini
**Links:** report PDF (below); code is a fork of `ethz-asl/omav_sim` — lab-internal, no public link (see Flags)
**Slug:** `aerial-knowledge-distillation`

## Overview

Overactuated tilt-rotor aerial vehicles (OMAVs — 5 independently tiltable propeller arms, 10 actuators) can exert forces independently of their attitude. Their model-based controllers can use disturbance observers to handle model mismatch and external forces, but observer bandwidth, noisy velocity/force measurements, and tuning limit how fast they adapt to changing dynamics. We distilled a *family* of parameter-matched model-based expert controllers — each tuned to a different randomized simulated plant — into a single recurrent LSTM policy, trained closed-loop through differentiable vehicle dynamics. In simulation the distilled controller outperforms the nominal model-based controller in both tracking accuracy and robustness to model mismatch while approaching the parameter-matched teachers, exhibits emergent system identification in its hidden state, and transfers zero-shot to the real OMAV.

## Infrastructure built

All in the `omav_models` package of the `omav_sim` fork (`/Users/AndreaBlumer/Desktop/ETH/PLR/omav_sim/omav_models`), pure PyTorch in float64.

- **GPU-batched demonstration pipeline** (`data_generation/data_generation.py`) — massively parallel rollouts of the compiled teacher stack: default batch of **48,000 simultaneous trajectories** on GPU, 1,050 steps at 5 ms (~5.25 s each). Per-trajectory multibody-parameter randomization (mass, inertia, geometry, aerodynamic coefficients — report Appendix Table I), seven curated velocity-reference regimes (isolated/coupled linear and angular commands, report Table II) plus a stress subset, and convergence filtering that drops divergent rollouts before saving. The report's final expert dataset: **30,000 randomized OMAV configurations**, each controlled by its parameter-matched model-based teacher for 5 s at 200 Hz — **~42 h of simulated flight**, recording the 57-dim controller input, 10-dim actuator command, and 6-dim tracking error per step.
- **Differentiable closed-loop training** (`src/omav_models/networks/train/train_lstm.py` and variants) — the student is unrolled in closed loop through an AOT-compiled differentiable dynamics network: its own predicted commands drive the next state it sees, and backpropagation-through-time flows through both the LSTM memory and the vehicle dynamics. Loss combines command imitation with velocity-tracking behavior matching (report Eq. 10, λ_u = 1/6, λ_y = 10); windows of T = 50 steps, batch 2048, 20 epochs, Gaussian input noise σ = 0.01, Adam with cosine LR annealing 10⁻⁶→10⁻⁷; full training ~1 day on an NVIDIA RTX 4000.
- **DAgger loop** (`data_generation/dagger.py`, `dagger/serial_dagger.py`) — rolls the current student out on sampled plants, queries the plant-matched compiled teacher at every student-visited state, and merges the relabeled samples into the dataset; `serial_dagger.py` automates generate→train iterations.
- **Architecture benchmark harness** (`src/omav_models/networks/test.py` + per-model training scripts) — MLP, MLP-with-10-step-history, GRU, LSTM, and Transformer students all trainable and evaluable under identical closed-loop conditions (same dataset, objective, rollout settings), with per-episode transient and steady-state linear/angular tracking-error metrics and automated report/figure generation (`reports/`).
- **Checkpoint selection by closed-loop tracking error** — instead of training loss, `train_lstm.py` runs full closed-loop validation rollouts through the dynamics network every epoch and saves the checkpoint with the best steady-state (last 20% of the window) linear + angular velocity-tracking error.
- **Deployment path** — `scripts/export_network.py` compiles control and dynamics networks to C++-compatible `.pt2` modules via AOT Inductor (repo `compiled/` holds exported variants, incl. `lstm_control_network.pt2`); the package targets the OMAV's onboard Jetson.

## Results achieved

All numbers from the final report (`ReportPLR_Salvatore_Stefanini.pdf`; replaced 2026-10-01 with the revised version — abstract/intro reframed around disturbance-observer limits and Figs. 3–4 captions rewritten, every number unchanged); simulation results are on a test set of **2,000 paired 5 s closed-loop rollouts** over perturbed OMAV configurations and varied velocity references, comparing the distilled LSTM against the nominal model-based controller (MBC) and the parameter-matched MBC.

- **Tracking:** the recurrent student consistently reduces mean linear and angular velocity-tracking errors compared with the nominal MBC across the whole reference-velocity range, while approaching the performance of the parameter-matched MBC. The improvement is statistically significant for both linear and angular tracking (paired Wilcoxon signed-rank tests with Holm correction, p < 10⁻¹⁰), and is largest in the angular components.
- **Robustness to model mismatch** (divergent-trajectory rate under increasing plant-parameter randomization, report Fig. 6): at ±15% randomization 2.5% of student rollouts diverge vs 11.0% for the nominal MBC; at ±20%: 9.0% vs 20.5%; at ±25%: 15.0% vs 32.0%; at ±30%: 24.0% vs 41.5%.
- **Emergent system identification:** a linear probe trained on the LSTM hidden state predicts the plant's thrust-to-weight ratio with **R² = 0.967 on held-out data** and converges to the correct value rapidly within a rollout — the policy never observes plant parameters, so it implicitly identifies the controlled plant.
- **Architecture comparison** (report Fig. 8): the LSTM achieves the best overall tracking among LSTM, memoryless MLP, MLP-with-history, and GRU students, with the largest gap to the memoryless MLP — evidence that temporal information is important under unobserved plant parameters.
- **Zero-shot hardware transfer:** the policy trained purely in simulation was deployed on the real OMAV without fine-tuning; despite unmodeled delays and actuator imperfections it runs on constrained onboard hardware while maintaining stable closed-loop velocity tracking and performing complex SE(3) maneuvers. The report qualifies this as *preliminary* evidence — no quantitative hardware numbers are given, and extensive real-world validation is stated as future work.
- **Data efficiency:** the student is trained with **less than 2 days of simulated flight data**, vs 87 days of simulated interaction reported by prior end-to-end RL work for OMAV control.
- **Sensitivity analysis** (report Appendix): perturbing 12 multibody-parameter groups by up to ±20% on a quasi-Monte Carlo ensemble of 16,359 plants shows the nominal controller's tracking cost is dominated by the static-thrust coefficient (~74% of attributed variance) and base mass (~21%).

## Deliverables

- **Report PDF:** `/Users/AndreaBlumer/Desktop/ETH/alessiosalvatore1703-ops.github.io/assets/projects/aerial-knowledge-distillation/ReportPLR_Salvatore_Stefanini.pdf` (6 pages, IEEE format, with real-flight photos in Figs. 1 and 9).
- **Code:** fork of `ethz-asl/omav_sim` at `/Users/AndreaBlumer/Desktop/ETH/PLR/omav_sim` (remote `alessiosalvatore1703-ops/omav_sim`, upstream `ethz-asl/omav_sim`) — lab-internal, do not link publicly.
- **Poster figures** (TikZ, `/Users/AndreaBlumer/Desktop/ETH/PLR/posterimages/output/`): unified pipeline diagram `pu_hi.png` (+ `pu_full.png`, PDF variants), `training_pipeline.png`, `lstm_architecture.pdf`, `main.png`.
- **Site media already committed:** `assets/projects/aerial-knowledge-distillation/demo.mp4` (card cover) and `pipeline.png`.

## Stack

- Python, PyTorch (float64 throughout; AOT Inductor `.pt2` compilation for teacher, dynamics, and student networks; C++-exportable for the onboard Jetson)
- PyTorch3D (rotation transforms)
- Genesis simulator (`omav_sim_genesis` package, visual/simulation side)
- NVIDIA GPUs (dataset generation batched at 48k trajectories; training ~1 day on RTX 4000)
- matplotlib benchmark reports; TikZ/LaTeX poster figures

## Flags

- **Repo is lab-internal.** The code forks `ethz-asl/omav_sim`; do not publish a repo link without explicit clearance from ASL.
- **Hardware results stay qualitative.** The report claims only stable velocity tracking and SE(3) maneuvers as *preliminary* zero-shot evidence — never attach numbers to the real-platform deployment.
- **Transformer caveat.** A Transformer student exists in the codebase and benchmark harness, but the report's architecture comparison covers only LSTM/MLP/MLP-history/GRU — don't claim Transformer benchmark results.
- **Dataset numbers: use the report's.** The earlier card copy said "48,000 parallel rollouts, ~40 h" (the code's generation batch size); the report states the training dataset as 30,000 configurations / ~42 h of simulated flight. "48,000 parallel trajectories" is correct only as the pipeline's GPU batch capability.
- **Fig. 6 divergence percentages** are read from the printed bar labels in the report figure; keep them tied to their randomization ranges as listed above.
- The supervisors' related paper/materials in the project folder are not Alessio's to publish (per `projects-2026.md`).
