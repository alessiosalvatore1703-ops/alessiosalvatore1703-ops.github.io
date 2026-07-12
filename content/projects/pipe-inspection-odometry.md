# Channel Position Estimation from Pipe-Inspection Video — Physical AI Hackathon

**Context:** Physical AI Hackathon — Channel Position Detection challenge (main task + bonus inspection task)
**Dates:** May 2026 (presentation dated May 5, 2026)
**Team:** 3 — Alessio Salvatore, Matteo Rubini, Alessandro Pirini
**Link:** https://github.com/MatteoR1103/PhysicalAI-Hackathon (teammate's account)
**Slug:** `pipe-inspection-odometry`

## Overview

From sewer-inspection videos of a probe traveling out and back through a channel of known length, the system estimates the per-frame **absolute 1D position** (in meters, clipped to `[0, channel_length]`), the **turning-point frame** where the probe reverses, and the **per-frame movement direction** (+1 / −1 / 0). The design targets stated in the presentation: CPU-only, no neural network and no GPU for the core task, ~1000 frames in < 8 s (≈ 6 s typical, dominated by I/O), robust to the outdoor setup phase, reflections, and motion blur, with a graceful fallback (linear triangle path) if OpenCV is unavailable. The key idea, per the slides: combine three independent cheap visual signals and gate them *before* integration, so no single noisy signal drives the final position estimate.

## Infrastructure built

**Layered visual-odometry pipeline** (`mySolution/MovementPathEstimator.py`, ~976 lines):

- **Sparse KLT visual odometry at reduced resolution** — frames converted to grayscale and downscaled to 25% (1080p → ~480×270), temporal stride 8 (only every 8th frame is a keyframe, linear interpolation between keyframes). Shi–Tomasi corners (up to 240 points, quality 0.008, min-distance 6 px) tracked with pyramidal Lucas–Kanade (3-level pyramid, 25×25 window, ≤ 25 iterations) via OpenCV `goodFeaturesToTrack` + `calcOpticalFlowPyrLK`. Slides quote ~2–4 ms per flow call and ≈ 32× fewer evaluations than dense full-resolution flow.
- **MAD-filtered motion signals** — flow speed excludes points within 5% of the image center (radial flow ≈ 0 on the optical axis), keeps inliers with |m − median| ≤ 4·MAD + 1.0, and takes the median of inlier magnitudes per frame gap ("double-median": characterize, then summarize). A signed **radial flow direction** signal (expansion = forward, contraction = reverse) uses the same MAD inlier set and serves as a physically motivated turning-event proxy.
- **Triple scene-gating before integration** — three sequential gates remove non-pipe frames before any distance can accumulate: (1) a *pipe-interval mask* from a color-heuristic pipe-likeness score (score = 2.0·p_pipe + 0.8·p_dark − 1.0·p_blue on 256×192 thumbnails; the sky penalty suppresses the outdoor setup phase), smoothed with a 41-frame moving average; (2) *startup/end masks* from normalized cross-correlation against a median image built from up to 600 sampled frames — the gate releases at the first run of ≥ 100 frames whose NCC exceeds max(P5, 0.7·median), mirrored at the end; (3) a *speed gate with noise floor* — 31-frame moving average, re-masking after smoothing, and zeroing speeds below 0.4·P10 of positive speeds so slow baseline drift cannot accumulate into spurious displacement.
- **Scale-free dual-leg normalization** — gated speed is integrated into cumulative motion; the outbound leg is stretched to map 0 → L up to the turning point and the inbound leg L → 0 after it. This removes dependence on the unknown sensor-to-wall distance and lens focal length — the absolute pixel scale of optical flow becomes irrelevant.
- **Two-stage turning-point detection** — coarse: the frame where cumulative motion first reaches 50% of the total (maximum likelihood under a symmetric round-trip). Refined: still-flow evidence — pause segments where a joint proxy max(ŝ, |d̂|) stays below an adaptive threshold θ ∈ [0.03, 0.35] for ≥ 5 frames, scored as still_strength · length_bonus · (1 − 0.35·dist_penalty), accepted iff score > 0.08 with minimum length and median constraints. Fallback: radial-direction sign change in a narrower window, scored by left/right-median contrast.

**Diagnostics analyzer for the bonus task** (`mySolution/BonusVideoAnalyzer.py` + `mySolution/yolo_analyzer.py`):

- **Rule-based visibility classification** — 10 features on 256×144 thumbnails (brightness, contrast, Laplacian sharpness, edge density, feature count, saturation, glare, dark ratio, color cast, Δframe) combined into a clarity score (0.35e + 0.30f + 0.20s + 0.15c), mapped to 5 states (*clear, low_visibility, lens_covered, splash_water, under_water*) with label-flip smoothing and min-duration filtering (0.5 s transient / 1.0 s persistent). Handles non-spatial states (blur, submersion, flat darkness) where an object detector would see no edges; at stride 10 it processes ~300 samples of a 3000-frame video in < 3 s on CPU (per slides).
- **Zero-shot YOLO-World defect detection** — open-vocabulary prompts, no task-specific fine-tuning (default weights `yolov8x-worldv2.pt` via Ultralytics): 10 defect classes (roots, gravel, rocks, lime deposit, sludge, sand, grease, concrete, blockage, cracks) plus 4 visibility/setup prompts, stride 25, same-class events within 2-stride frames merged. A constrained `not_in_pipe_yet` event may appear only once near the start. Prompt wording matters (slides: "thin roots growing into a sewer pipe" beats "roots" for reducing false positives).
- **Fusion into a four-level condition report** — both analyzers write JSON event reports and combine into a video-level `pipeline_condition` taxonomy: *clear* (no obstruction event) / *dirty* (exactly one obstruction type) / *possibly_problematic* (two or more types with usable visibility) / *unusable* (camera fully obstructed, or multiple types under partially obstructed visibility).

## Results achieved

- **Runtime:** the presentation states the pipeline processes "~1000 frames in < 8 s (≈ 6 s typical, dominated by I/O)" on CPU with no neural network or GPU for the main task; ~2–4 ms per flow call; the bonus visibility analyzer covers a 3000-frame video in < 3 s on CPU at stride 10.
- **Estimated-vs-measured position figure** (`results.jpeg`, the repo README's "Final Representative Output Results for the Main Task"): 11 subplots of estimated (Schätzung) vs measured (Messung) distance in meters over frames. On the 8 videos with public ground-truth labels the estimated triangle profiles track the measured curves closely across channels of ~40–100 m; 3 videos have estimate-only curves (labels withheld by the organizers).
- **No numeric accuracy figures are stated in the slides or stored in the repo.** The challenge scoring framework (`EstimationRater.py`) evaluates mean absolute error of the movement path in meters and absolute turning-point error in frames, but no computed values are saved in the project files — do not quote accuracy numbers on the site.

## Deliverables

- Repository: https://github.com/MatteoR1103/PhysicalAI-Hackathon — challenge framework preserved; custom work concentrated in `ChannelPositionDetection/mySolution/` (`MovementPathEstimator.py`, `BonusVideoAnalyzer.py`, `yolo_analyzer.py`).
- 11-slide technical presentation, "Channel Position Estimation via Optical Flow — A CPU-only, Layered Approach to Robust Sensor Localization" (`presentationPhysicalAI.pdf`, May 5, 2026).
- Results figure (`ChannelPositionDetection/assets/results.jpeg`): 11-panel estimated-vs-measured position grid.
- Committed site assets in `assets/projects/pipe-inspection-odometry/`: `slides.pdf` (326 KB, the presentation), `results.jpeg` (121 KB), `demo.mp4` (2.5 MB, card cover).

## Stack

- Python 3.11
- OpenCV (frame loading, Shi–Tomasi + pyramidal Lucas–Kanade optical flow, visibility features)
- NumPy / SciPy (numerical processing, smoothing, scoring support); Matplotlib for plots
- Ultralytics YOLO-World (`yolov8x-worldv2.pt`) + PyTorch — bonus task only
- ffmpeg (video-to-frame extraction)
- uv (optional environment management via `pyproject.toml` + `uv.lock`)

## Flags

- ⚠️ **Repo lives under a teammate's GitHub account** (`MatteoR1103`), not Alessio's — link it as a team repository, not a personal one.
- ⚠️ No accuracy numbers exist in any source — the only quantitative claims allowed are the runtime figures quoted above and the qualitative results figure. Do not invent error metrics.
