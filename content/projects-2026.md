# Projects — 2026 (website-ready draft)

Compiled from the local project folders (`3DV`, `EXTRA`, `PLR`, `ROBOTLEARNING/so101`, `RSS`)
on 2026-07-11. Copy is written in first person, CV-bullet style, ready to paste into
`index.html` project cards and `projects/<slug>/` detail pages. Every claim below is
backed by files in the folders — nothing is invented. Open questions are flagged at the
end of each entry and collected in the checklist at the bottom.

---

## 1. Goal-Driven Adaptive-Resolution 3D Mapping with RL

**Slug:** `task-aware-3d-mapping` (already planned in CLAUDE.md — this is that project)
**Context line:** 3D Vision course project, supervised at CVG (Marc Pollefeys Lab), ETH Zürich
**Dates:** Feb – Jun 2026
**Tags:** Reinforcement Learning · 3D Reconstruction · Embodied Navigation · Habitat · PyTorch

### Card description

I extended the PEANUT object-goal navigation pipeline (Habitat, HM3D) so the robot's 3D map
spends its memory where the task needs it.

- Replaced dense fixed-resolution voxel splatting with a sparse hierarchical hash-grid map
  holding three coexisting resolutions (5 / 10 / 20 cm).
- Trained a PPO policy that adapts per-block resolution (split / keep / merge) online during
  navigation under a hard memory budget, after reformulating an intractable per-block action
  space into a two-threshold policy over a goal-path-aware block score.
- At a scarce 8 MB map budget, task-aware allocation doubled navigation success (0.25 → 0.50)
  over memory-only allocation and sharply reduced planning-route damage from coarsening
  (validation on a small set of HM3D episodes).

### Detail-page extras

The core insight: binary navigation success is a poor training signal (dominated by
segmentation errors); the clean resolution-sensitive signal is **path fidelity** — coarse
voxels bulge obstacles and close doorways, so the reward penalizes increases in planned-path
length caused by merging. Honest negative result worth keeping on the page: the naive
per-block RL formulation (MultiDiscrete over all blocks) did not learn.

**Stack:** Python, PyTorch, Habitat-Sim/Lab, Stable-Baselines3 (PPO), MMSegmentation, Hydra, SLURM, W&B.
**Media available:** `budget_linear_reward.png` plot; `docs/resolution_policy_v2.md` work log. No videos committed (episode MP4s lived on the cluster).
**Team:** 4 (with Vassili De Palma, Marco De Negri, Lorenzo Baggi).

**⚠️ Flags:** repo is under a teammate's account (`vassili-de-palma/goal-driven-map-adapt`) and
likely private — confirm link/visibility. Numbers come from small validation runs (4–8 episodes)
in the internal work log — keep the "validation" qualifier. The 135 MB supervisors' draft paper
in the folder is **not** yours to publish.

---

## 2. Knowledge Distillation for Aerial Robot (OMAV) Control

**Slug:** `aerial-knowledge-distillation` (already planned in CLAUDE.md — this is that project)
**Context line:** Perception and Learning for Robotics, Autonomous Systems Lab (Roland Siegwart), ETH Zürich
**Dates:** Feb – Jun 2026
**Tags:** Imitation Learning · DAgger · Aerial Robotics · Differentiable Simulation · PyTorch

### Card description

I distilled an expensive model-based controller for an over-actuated omnidirectional MAV
(OMAV — 5 tiltable rotor arms, 10 actuators) into lightweight recurrent policies suitable
for onboard deployment.

- Built a GPU-batched demonstration pipeline: 48,000 parallel expert rollouts (~40 hours of
  simulated flight) with multibody parameter randomization, curated velocity-reference
  regimes, and convergence filtering.
- Trained LSTM/GRU students **closed-loop through a differentiable dynamics model**, so
  gradients flow through the vehicle physics — plus an explicit DAgger loop relabeling
  student-visited states with the compiled expert.
- Benchmarked LSTM, GRU, MLP, and Transformer students against the expert in closed-loop
  simulation, selecting checkpoints by steady-state velocity-tracking error on full
  validation rollouts rather than training loss.

### Detail-page extras

**Stack:** Python, PyTorch (AOT-Inductor-compiled expert + dynamics, C++-exportable for Jetson),
PyTorch3D, Genesis simulator, TikZ poster figures.
**Media available:** strong hero image — the unified pipeline diagram
(`PLR/posterimages/output/pu_hi.png`, plus PDF variants), LSTM architecture figure, OMAV cutout photo.
**Team:** 2.

**⚠️ Flags:** no report PDF or final numbers survive locally (result folders are empty) —
get the poster/report from Overleaf before claiming quantitative results. The repo forks
`ethz-asl/omav_sim` (lab-internal) — confirm whether the fork can be linked publicly.

---

## 3. Vision-Language-Action Policies on an SO-101 Arm

**Slug suggestion:** `vla-so101`
**Context line:** Robot Learning course, ETH Zürich — group project
**Dates:** May 2026
**Tags:** VLA · Imitation Learning · LeRobot · SmolVLA · Real Hardware

### Card description

I fine-tuned SmolVLA vision-language-action policies for language-conditioned pick-and-place
on an SO-101 arm, across three tasks of increasing difficulty — from color-conditioned
commands to compositional instructions (ordinal, relative, and negated references) to
grounding celebrity portraits, with generalization to identities never seen in training.

- Built the LeRobot data pipeline: prompt relabeling (~5 phrasings per episode), brightness
  augmentation, and an automated celebrity face-swap augmentation to multiply identity
  coverage; refined policies with DAgger-style corrective demonstrations.
- Benchmarked small VLMs (SmolVLM 256M/500M) on spatial grounding — chance-level accuracy
  motivated training a frozen-backbone action expert (8–16 VLM layers) instead of unfreezing
  the VLM.
- Automated H100 cloud training with checkpoint streaming to the Hugging Face Hub;
  ran inference on-robot at 10 FPS.

### Detail-page extras

**Stack:** Python, PyTorch, LeRobot, SmolVLA, Hugging Face Hub, W&B, OpenCV; SO-101 arm;
Brev/Nebius H100 instances.
**Media available (portfolio-ready GIFs):**
`VLA-robotlearning/docs/eval3_coke_michael_jackson.gif` (out-of-distribution identity — strongest asset),
`eval3_coke_obama_1.gif`, `eval3_coke_obama_2.gif`.
**Links:** repo `https://github.com/alessiosalvatore1703-ops/VLA-robotlearning`;
HF org `https://huggingface.co/ETHrobotlearning`.
**Team:** ~5; I authored the majority of commits (augmentation pipeline, face-swap,
training orchestration, dataset utilities, README).

**⚠️ Flags:** no quantitative success rates exist in the repo — don't state percentages.
Exact course name/code isn't in the files — confirm it.

---

## 4. Autonomous Exploration on a Unitree A2 Quadruped

**Slug suggestion:** `unitree-a2-exploration`
**Context line:** ETH Robotics Summer School 2026 (ETHZ-RobotX), Team Sim2Win
**Dates:** Jun 2026
**Tags:** ROS 2 · Legged Robots · SLAM · Exploration · Field Deployment

### Card description

At the ETH Robotics Summer School, our team deployed a full autonomous search-and-explore
mission on a real Unitree A2 quadruped (Hesai LiDAR, RGB camera) across three field sites.

- Developed the team's artifact-mapping node: fused YOLO detections with TF2 transforms into
  a map-frame artifact log (object class + 3D position + confidence), with clustering and
  deduplication of repeated detections — the mission's scored output.
- Integrated and field-tuned the exploration stack (TARE planner, FAR planner, CMU local
  planner, DLIO/RESPLE LiDAR-inertial odometry) for real-robot deployment in tight spaces.
- Built an Open3D point-cloud post-processing pipeline (voxel filtering, statistical/radius
  outlier removal, DBSCAN) to clean LiDAR SLAM maps captured on the robot.

### Detail-page extras

**Stack:** ROS 2 Jazzy (Zenoh RMW), Python, Docker, MuJoCo sim, YOLOv5/ONNX, Open3D,
Foxglove Studio; Unitree A2 hardware.
**Links:** team repo `https://github.com/alessiosalvatore1703-ops/RSS_sim2win`
(I created and administered it); upstream `https://github.com/ETHZ-RobotX/a2_ros`.
**Media available:** cleaned `.pcd` LiDAR maps (could be rendered to an image); robot photo
is upstream course material. No photos/videos in the folder.
**Team:** ~10 contributors — phrase as team effort with the artifact node as your contribution.

**⚠️ Flags:** need your own photos/videos from the summer school for the page. Note the
clustering logic was later simplified by a teammate — the bullet above credits your original
version accurately, but keep individual-vs-team phrasing careful.

---

## 5. Person Following on the Agibot X2 Humanoid — RoboHack 2026

**Slug suggestion:** `agibot-x2-person-following`
**Context line:** RoboHack 2026 hackathon — deployed on a real Agibot X2 humanoid
**Dates:** May 2026 (hackathon weekend)
**Tags:** ROS 2 · Humanoid Robots · Stereo Vision · YOLOv8 · Real-Time Control

### Card description

In a hackathon weekend, a teammate and I built real-time person detection and follow-me
behavior on the Agibot X2 humanoid, running on the robot's onboard computer.

- Perception: YOLOv8 person detection on the head stereo cameras with SGBM disparity-based
  depth inside the detected bounding box, publishing the closest person's 3D position at
  frame rate.
- Motion: Ruckig-based head tracking, a state-machine locomotion supervisor
  (approach / stop-band / align) that walks to the person and holds a configured distance,
  and a triggered arm "assist pose" released by a head-pat signal.
- Safety-first deployment: dry-run and gantry test modes, a 0.5 s velocity watchdog, runtime
  enable/disable, and an alternative YOLO + LiDAR follower needing no stereo depth.

### Detail-page extras

**Stack:** Python, ROS 2 Humble, Ultralytics YOLOv8, OpenCV (SGBM), Ruckig via the robot's SDK.
**Links:** repo `https://github.com/alessiosalvatore1703-ops/robohack2026`.
**Media available:** none committed — the `VIDEOS` folder is empty.
**Team:** 2.

**⚠️ Flags:** confirm the event's official name/organizer (only the repo name says
"robohack2026"). Demo footage needed from you — this project badly wants a video clip.

---

## 6. Channel Position Estimation from Pipe-Inspection Video — Physical AI Hackathon

**Slug suggestion:** `pipe-inspection-odometry`
**Context line:** Physical AI Hackathon — Channel Position Detection challenge, team of 3
**Dates:** May 2026
**Tags:** Computer Vision · Optical Flow · Classical CV · Zero-Shot Detection

### Card description

From sewer-inspection videos of a probe traveling out and back through a channel of known
length, we estimated per-frame absolute 1D position, the turning-point frame, and movement
direction — CPU-only, no neural network for the core task.

- Designed a layered visual-odometry pipeline: sparse KLT optical flow, MAD-filtered motion
  signals, and triple scene-gating before integration — processing ~1000 frames in under
  8 s on CPU.
- Introduced scale-free dual-leg normalization (outbound 0→L, inbound L→0) removing
  dependence on unknown lens focal length and camera-to-wall distance, plus two-stage
  turning-point detection refined by still-flow evidence.
- Built a complementary diagnostics analyzer: rule-based visibility classification plus
  zero-shot YOLO-World defect detection (roots, gravel, deposits, cracks) fused into a
  four-level pipe-condition report.

### Detail-page extras

**Stack:** Python 3.11, OpenCV, NumPy/SciPy, Ultralytics YOLO-World (bonus task only), ffmpeg, uv.
**Media available:** 11-slide technical presentation
(`EXTRA/PhysicalAI-Hackathon/presentationPhysicalAI.pdf`, 326 KB — good to commit under
`assets/projects/`) and a results figure
(`ChannelPositionDetection/assets/results.jpeg`) showing estimated vs. measured position.
**Links:** repo `https://github.com/MatteoR1103/PhysicalAI-Hackathon` (teammate's account).
**Team:** 3 (with Matteo Rubini, Alessandro Pirini).

---

## Not recommended as a project card

- **MARL book exercises** (`EXTRA/marl-book-exercises`): textbook self-study (one IQL
  exercise implementation, uncommitted). At most a one-line "currently studying multi-agent
  RL" mention in the About section.

## Open checklist before publishing

- [ ] 3DV: confirm repo URL/visibility (teammate's account, likely private).
- [ ] PLR: get the final poster/report from Overleaf (no numbers survive locally); confirm
      whether the `omav_sim` fork can be linked publicly.
- [ ] SO-101: confirm the exact course name/code.
- [ ] RSS: provide photos/videos from the summer school week.
- [ ] RoboHack: confirm official event name; provide demo footage.
- [ ] Copy media into the site: SO-101 GIFs, PLR pipeline diagram, Physical AI presentation
      PDF + results figure (all under the ~10 MB video rule; GIFs should be checked for size
      or converted to short mp4s).
