# Autonomous Exploration on a Unitree A2 Quadruped — ETH Robotics Summer School 2026

**Slug:** `unitree-a2-exploration`
**Context:** ETH Robotics Summer School 2026 (ETHZ-RobotX), Team Sim2Win
**Dates:** Jun 2026 (team repo commits 2026-06-21 → 2026-06-25)
**Team:** ~10 contributors (git shortlog shows 12+ author identities; I created and
administered the team repo and set up its branch workflow)
**Links:**
- Team repo: https://github.com/alessiosalvatore1703-ops/RSS_sim2win
- Upstream course stack: https://github.com/ETHZ-RobotX/a2_ros

## Overview

At the ETH Robotics Summer School, our team deployed a full autonomous search-and-explore
mission on a real Unitree A2 quadruped (Hesai LiDAR + RGB camera) across three field
sites — commits track parameter tuning "for site1", "site 2", and "final params for
site3". The robot explored autonomously (TARE coverage planner over the CMU
terrain-analysis / local-planner stack, DLIO or RESPLE LiDAR-inertial odometry), detected
artifacts with YOLOv5, and logged them in the map frame — the artifact log was the
mission's scored output, alongside the LiDAR maps saved on the robot.

## Infrastructure built

The team repo forks the ETHZ-RobotX `a2_ros` course stack (ROS 2 Jazzy, Zenoh RMW,
Docker, MuJoCo simulation of the A2 with an RL locomotion policy) and adds the
mission-specific pieces on top. My contributions, verified in git:

- **Created and administered the team repo** — initial commit and the branch-per-member
  collaboration workflow ("Please create and work on a branch with your name, we will
  than merge on the main") are mine; team branches were merged into `main` from there.
- **Artifact-mapping node** (`src/artifact_collector/`, my commit `9e7108a` "test 1
  artifacts collector node", 257 lines + package/launch/config): subscribes to the
  `ObjectDetectionInfoArray` on `/detection_info` from the YOLOv5 object-detection node,
  looks up the TF2 transform into the `map` frame (one lookup per detection array), and
  accumulates each detection into a deduplicated artifact map. My original design merged
  same-class detections within a `cluster_distance` radius (0.5 m) into running-mean
  `Artifact` clusters (position, count, mean confidence, min camera distance) and applied
  write-time heuristics — `min_observations: 3`, `max_estimated_distance: 8.0 m`, optional
  confidence floor — before dumping a CSV (`class_id, x, y, z`, optionally with stats
  columns). The CSV autosaves every 10 s, on a `dump_artifacts` Trigger service, and on
  shutdown, so the scored deliverable always exists. During the field days teammates
  reworked the node to record all raw detections and moved filtering offline
  (`scripts/filter_detections.py`); the clustering/dedup heuristics survive in the config
  (`artifact_collector.yaml`) and my original node in the git history.
- **Exploration-stack integration and field tuning (team effort I took part in):** the
  repo pins TARE planner, FAR planner, the CMU navigation stack (`terrain_analysis`,
  `local_planner`/`pathFollower`), DLIO and RESPLE as submodules, and
  `master_mission.launch.py` composes odometry (`mode: dlio|resple|sim`), exploration,
  object detection, and the artifact collector into one mission launch with a timeout and
  save-map-on-exit. Tuning across the three sites (speed limits, TARE/FAR params, DLIO
  settings, mission timeout 300 s → 600 s) was spread across the team's commits, with
  per-planner tuning notes kept in `docs/CONFIG_TUNING_*.md`.
- **Open3D point-cloud post-processing pipeline** (`map_cleaning/`): a staged `.pcd`
  cleaning tool for the DLIO/RESPLE SLAM maps pulled off the robot NUC — voxel
  downsampling, statistical outlier removal (k=15, std ratio 1.5 defaults), radius
  outlier removal (r=0.75 m, min 3 points), optional RANSAC ground removal / ROI crop /
  ICP refinement, then a DBSCAN clustering pass (eps=1, min_points=5) that discards
  isolated noise clusters, with a README documenting the full robot-to-final-map
  workflow. (See Flags on attribution: these files were committed under a teammate's
  account.)

## Results achieved

- The mission ran on the real A2 across three field sites; site-specific parameter sets
  ("Tune parameters for site1", "final params for site3") and post-real-robot-test
  updates are in the history.
- The artifact CSV — map-frame class + 3D position per detected object — was produced as
  the mission's scored output, written continuously by the collector node.
- Cleaned LiDAR maps were delivered: `maps/` holds `dlio_map.pcd`, a
  dynamic-points-removed variant, and `clean_map.pcd` (the save summary records 187,139
  raw → 13,679 points at a 0.2 m voxel leaf); `map_cleaning/` holds the RESPLE map and
  its cleaned `map_clean.pcd` / `map_final.pcd` outputs.
- No scores, rankings, or success percentages are recorded in the repo — do not state any.

## Deliverables

- Team repo (created/administered by me) forking the course stack with the mission
  launch system.
- `artifact_collector` ROS 2 package: map-frame artifact logging with clustering,
  dedup, and filtering heuristics (my original node; simplified raw-recording version on
  `main`).
- `map_cleaning/` Open3D post-processing pipeline + README.
- Cleaned `.pcd` LiDAR maps of the sites (`maps/`, `map_cleaning/`).

## Stack

- ROS 2 Jazzy with Zenoh RMW (`rmw_zenoh_cpp`), CycloneDDS fallback
- Python (rclpy, tf2_geometry_msgs)
- Docker / docker-compose dev + robot environments
- MuJoCo simulation with an RL locomotion policy (ONNX)
- YOLOv5 object detection (ONNX runtime variant in the course package)
- Open3D (voxel filter, SOR, radius filter, DBSCAN)
- Foxglove Studio (committed `rss26_layout.json` dashboard)
- Unitree A2 quadruped, Hesai LiDAR, RGB camera (gscam2 + debayer)

## Flags

- ⚠️ ~10 contributors — phrase individual vs. team carefully. Safely mine (git-verified):
  repo creation/administration and the original artifact-collector node. The exploration
  stack integration/tuning was distributed across the team.
- ⚠️ The clustering/dedup logic in my artifact node was later simplified by teammates
  (raw recording + offline filtering). Credit my original version accurately, but don't
  imply the final fielded node was mine alone.
- ⚠️ Attribution nuance on the map-cleaning pipeline: the prior compiled entry
  (`content/projects-2026.md` §4) credits it to Alessio, but the `map_cleaning/` commits
  are authored by a teammate's GitHub account (hamnamalik12) and `scripts/filter_map.py`
  by another (Khairul). Confirm with Alessio how to phrase this before publishing it as
  an individual contribution.
- ⚠️ No own photos/videos in the project folder; the site card cover
  (`assets/projects/unitree-a2-exploration/cover.jpeg`) is the only media. The A2 photo
  in the repo README is upstream course material. Cleaned `.pcd` maps could be rendered
  to an image for the detail page.
- ⚠️ No mission scores or metrics exist in the repo — never invent any.
