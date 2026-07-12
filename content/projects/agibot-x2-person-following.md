# Person Following on the Agibot X2 Humanoid — RoboHack 2026

**Slug:** `agibot-x2-person-following`
**Context:** RoboHack 2026 hackathon — deployed on a real Agibot X2 humanoid
**Dates:** May 2026, hackathon weekend (commits 2026-05-08 → 2026-05-09)
**Team:** 2
**Links:**
- Repo: https://github.com/alessiosalvatore1703-ops/robohack2026

## Overview

Real-time person detection and follow-me behavior for the Agibot X2 humanoid, built in a
hackathon weekend as two ROS 2 Humble packages running on the robot's onboard computer:
`robot_vision` (stereo YOLO detection + depth) and `robot_motion` (head tracking, base
following, arm assist pose). The two halves talk over a single perception contract — the
closest person's 3D position on `/stereo_person/target_point` — and the whole pipeline was
brought up on the real robot through a staged dry-run → gantry → off-gantry procedure.
The demo scenario is a "chair assist": the robot walks to a person, stops at a set
distance, and raises its arms into an assist pose.

## Infrastructure built

- **Stereo perception node** (`robot_vision/stereo_detector_node.py`, node
  `stereo_final_annotator`): subscribes to the head's compressed stereo pair
  (`/aima/hal/sensor/stereo_head_front_{left,right}/rgb_image/compressed`, best-effort QoS),
  runs Ultralytics YOLOv8 (yolov8n) person detection on the left image (downscaled to
  512 px width, 320 px inference size, processing capped at 6 fps by default), timestamp-
  matches the right frame from a 20-message buffer within a 0.10 s slop, and publishes the
  closest detected person as a `geometry_msgs/PointStamped` on `/stereo_person/target_point`,
  plus an annotated JPEG stream and per-frame inference time (`/stereo_person/inference_time`).
  A separate `view_stereo` node is an OpenCV laptop viewer for the annotated stream.
- **Stereo depth estimation**: rectification maps built from both `CameraInfo` topics
  (fisheye-aware, with sane fallback intrinsics/baseline if CameraInfo is unusable), OpenCV
  `StereoSGBM` (96 disparities, block 7, 3-way mode) on the grayscale pair, then per-person
  depth from the disparity inside a 50%-shrunk bounding-box ROI: requires ≥80 valid
  disparity pixels and takes the 70th-percentile disparity — deliberately nearer-biased,
  because background leakage inside a person ROI otherwise overestimates distance (a safety
  choice, commented as such in the code). Depth is gated to [0.3, 8.0] m and back-projected
  to a metric (x, y, z) in the left camera frame.
- **Ruckig head tracking** (`robot_motion/head_tracker_node.py`, node `head_tracker`):
  converts the target point to a bearing and slews the head yaw joint toward it with a
  jerk-limited Ruckig online trajectory (500 Hz control loop; max velocity 1.0 rad/s,
  acceleration 1.0 rad/s², jerk 25 rad/s³; ±20° soft limit; velocity-limited fallback if
  Ruckig is unavailable), publishing `JointCommandArray` on `/aima/hal/joint/head/command`.
  Holds the last pose when the target is lost (0.5 s target timeout).
- **Locomotion state-machine supervisor** (`robot_motion/body_follower_node.py`, node
  `body_follower`): a 20 Hz control loop that classifies each tick into
  APPROACH / ALIGN / STOP_BAND / TOO_CLOSE / NO_TARGET / INVALID_DEPTH states.
  Proportional forward speed on distance error (default gain 0.25, capped at 0.12 m/s)
  toward a configurable target distance (0.75 m default) with a [0.45, 1.0] m stop band;
  proportional yaw on bearing (4° deadzone, 0.25 rad/s cap); forward motion only allowed
  when the person is within a 10° bearing cone (ALIGN turns in place otherwise). Commands
  go as high-level `McLocomotionVelocity` messages after the node registers itself as an
  MC input source (`stereo_person_follow`, priority 40, 1 s source timeout) and optionally
  walks the robot into Stable Stand itself via `SetMcAction`.
- **Arm assist pose** (`robot_motion/arm_pose_node.py`, node `arm_pose`): on first arrival
  in the stop band the supervisor fires a one-shot trigger (`/x2/assist/raise_arms_trigger`
  Bool, or alternatively an MC preset motion), and the arm node smoothstep-interpolates all
  14 arm joints into a forearms-forward assist pose (10° shoulder pitch, 90° elbow bend,
  3 s move) and holds it; a Bool on the trigger/head-pat topics releases it. In the final
  integrated flow the supervisor uses a timed assist wait (default 7 s) and deliberately
  stops publishing velocity during it, letting its MC input source time out so the arm
  preset motion is accepted — then re-registers the source and resumes following.
- **Safety layer**: `dry_run` and `follow_dry_run` modes (nodes log computed commands but
  publish nothing); a documented three-stage bring-up (dry run → gantry with straps →
  off-gantry with reduced speed caps); a 0.5 s target timeout that zeros velocity when the
  perception stream goes stale, backed by the MC's own 1 s input-source timeout;
  runtime enable/disable via `/stereo_person/follow/enable` without killing the launch;
  and a SIGINT/SIGTERM handler that publishes a zero-velocity stop on shutdown.
- **Fallback follower** (`robot_motion/person_follow_node.py`, node `person_follow`,
  own launch file `person_follow_lidar.launch.py`): a self-contained alternative that runs
  its own YOLO on the left camera image and takes distance from the chest LiDAR point
  cloud (`/aima/hal/sensor/lidar_chest_front/lidar_pointcloud`) instead of stereo depth —
  greets the person via the robot's TTS service, turns, walks toward them, and stops about
  one meter away.

## Results achieved

- The full pipeline ran on the real Agibot X2: YOLOv8 person detection with stereo depth
  publishing the target at the perception loop rate, head tracking, and the follow
  behavior — walk toward the person, hold the configured stop distance, raise the arms
  on arrival. A demo video of the working behavior is committed at
  `assets/projects/agibot-x2-person-following/demo.mp4`.
- The README's deployment guide records the staged real-robot bring-up with the concrete
  parameter sets used: gantry runs at 0.15 m/s max forward / 0.85 m target distance, then
  off-gantry at 0.10 m/s / 0.90 m with a two-operator E-stop protocol.
- The repo is written as a deployable artifact, not a prototype dump: install/build
  instructions for the robot, topic contract tables, troubleshooting section, and a
  migration guide from the packages' earlier names.

## Deliverables

- Repo: https://github.com/alessiosalvatore1703-ops/robohack2026 (two colcon packages,
  three launch files, README deployment guide)
- Demo video: `assets/projects/agibot-x2-person-following/demo.mp4` (committed, 2.2 MB)

## Stack

- Python
- ROS 2 Humble (rclpy, launch files, QoS profiles)
- Ultralytics YOLOv8 (yolov8n)
- OpenCV (SGBM stereo matching, rectification, annotation)
- Ruckig online trajectory generation
- Agibot `aimdk` SDK messages/services (locomotion velocity, joint commands, MC input
  sources, preset motions, TTS)

## Flags

- ⚠️ The event's official name and organizer are unconfirmed — only the repo name says
  "robohack2026". Confirm with Alessio before publishing an event name on the site.
