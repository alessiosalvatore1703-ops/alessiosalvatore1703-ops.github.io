"""Sample real robot meshes into point clouds for the site hero.

Outputs assets/js/hero-shapes.js: base64-encoded Int16 xyz triplets per shape,
normalized to the hero stage (y-up, meters-ish, ground at y=0).

Sources (all permissively licensed, credited in the site footer):
- Agibot X2 humanoid    — Gautam1704/Agibot-X2-Humanoid (Apache-2.0), URDF zero pose = standing
- SO-101 arm            — TheRobotStudio/SO-ARM100 (Apache-2.0), Simulation/SO101 URDF posed mid-reach
- Unitree A2 quadruped  — unitreerobotics/unitree_ros (BSD-3), MuJoCo a2.xml posed standing
- ETH ASL RotorS Firefly hexacopter — ethz-asl/rotors_simulator (Apache-2.0)
"""
import base64
import numpy as np
import trimesh

SP = "WORKDIR"  # set to a dir containing clones of unitree_ros (sparse: robots/a2_description), rotors_simulator (as "rotors"), Agibot-X2-Humanoid (as "x2repo"), and SO-ARM100
N = 12000

def mujoco_posed_mesh(xml_path, qpos_map):
    """Load an MJCF, set joint angles, return concatenated posed visual mesh."""
    import mujoco
    model = mujoco.MjModel.from_xml_path(xml_path)
    data = mujoco.MjData(model)
    mujoco.mj_resetData(model, data)
    for name, val in qpos_map.items():
        jid = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT, name)
        adr = model.jnt_qposadr[jid]
        data.qpos[adr] = val
    mujoco.mj_forward(model, data)

    meshes = []
    for g in range(model.ngeom):
        if model.geom_type[g] != mujoco.mjtGeom.mjGEOM_MESH:
            continue
        mid = model.geom_dataid[g]
        va, vn = model.mesh_vertadr[mid], model.mesh_vertnum[mid]
        fa, fn = model.mesh_faceadr[mid], model.mesh_facenum[mid]
        verts = model.mesh_vert[va:va + vn].copy()
        faces = model.mesh_face[fa:fa + fn].copy()
        R = data.geom_xmat[g].reshape(3, 3)
        p = data.geom_xpos[g]
        meshes.append(trimesh.Trimesh(vertices=verts @ R.T + p, faces=faces, process=False))
    return trimesh.util.concatenate(meshes)

def firefly_mesh():
    """RotorS firefly body + 6 propellers on a hexagon (per firefly.xacro)."""
    def load_dae(p):
        m = trimesh.load(p, force='scene')
        return m.to_mesh() if hasattr(m, 'to_mesh') else m
    body = load_dae(f"{SP}/rotors/rotors_description/meshes/firefly.dae")
    parts = [body]
    arm, rz = 0.215, 0.037   # arm length / rotor_offset_top from firefly.xacro
    for k in range(6):
        a = np.deg2rad(30 + 60 * k)
        prop = load_dae(f"{SP}/rotors/rotors_description/meshes/propeller_{'ccw' if k % 2 else 'cw'}.dae")
        prop.apply_scale(0.1)  # radius_rotor 0.1: mesh blade is unit length
        # vary blade azimuth per rotor so the hexagon doesn't look combed
        rot = trimesh.transformations.rotation_matrix(np.deg2rad(35 * k), [0, 0, 1])
        prop.apply_transform(rot)
        prop.apply_translation([arm * np.cos(a), arm * np.sin(a), rz])
        parts.append(prop)
    return trimesh.util.concatenate(parts)

def sample_norm(mesh, n, z_up=True):
    pts, _ = trimesh.sample.sample_surface(mesh, n)
    pts = np.asarray(pts, dtype=np.float64)
    if z_up:  # urdf/mjcf z-up -> three.js y-up
        pts = pts[:, [0, 2, 1]] * np.array([1.0, 1.0, -1.0])
    return pts

def finalize(pts, target_height=None, target_span=None, ground=0.0, hover=None):
    mn, mx = pts.min(0), pts.max(0)
    # center x/z
    pts[:, 0] -= (mn[0] + mx[0]) / 2
    pts[:, 2] -= (mn[2] + mx[2]) / 2
    if target_height is not None:
        s = target_height / (mx[1] - mn[1])
    else:
        span = max(mx[0] - mn[0], mx[2] - mn[2])
        s = target_span / span
    pts *= s
    mn2 = pts[:, 1].min()
    if hover is not None:
        pts[:, 1] += hover - (pts[:, 1].min() + pts[:, 1].max()) / 2
    else:
        pts[:, 1] += ground - mn2
    return pts

def encode(pts):
    """Int16 quantized (x1000 = mm) -> base64."""
    q = np.clip(np.round(pts * 1000), -32767, 32767).astype('<i2')
    return base64.b64encode(q.tobytes()).decode()

shapes = {}

# --- Agibot X2 humanoid (URDF zero pose is standing) ---
import yourdfpy
def scene_mesh(scene):
    return scene.to_mesh() if hasattr(scene, 'to_mesh') else scene.dump(concatenate=True)

x2_root = f"{SP}/x2repo/src/humanoid_urdf"
x2 = yourdfpy.URDF.load(f"{x2_root}/urdf/x2_hand.urdf",
                        filename_handler=lambda fname, **kw: fname.replace("./meshes", f"{x2_root}/meshes"))
pts = sample_norm(scene_mesh(x2.scene), N)
shapes['x2'] = finalize(pts, target_height=1.35, ground=0.0)

# --- SO-101 arm: upper arm up, elbow ~90°, forearm level, gripper open wide ---
so = yourdfpy.URDF.load(f"{SP}/SO-ARM100/Simulation/SO101/so101_new_calib.urdf")
so.update_cfg(dict(shoulder_pan=0.0, shoulder_lift=-1.05, elbow_flex=1.15,
                   wrist_flex=-0.35, wrist_roll=0.0, gripper=1.6))
pts = sample_norm(scene_mesh(so.scene), N)
pts = finalize(pts, target_height=0.95, ground=0.0)
# counter the hero's BASE_YAW (0.5 rad) so the arm shows its profile at rest
c, s = np.cos(-0.5), np.sin(-0.5)
shapes['arm'] = pts @ np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]]).T

# --- Unitree A2 quadruped, standing pose ---
stand = {}
for leg in ['FL', 'FR', 'RL', 'RR']:
    stand[f'{leg}_hip_joint'] = 0.0
    stand[f'{leg}_thigh_joint'] = 0.75
    stand[f'{leg}_calf_joint'] = -1.5
a2_mesh = mujoco_posed_mesh(f"{SP}/unitree_ros/robots/a2_description/a2.xml", stand)
pts = sample_norm(a2_mesh, N)
shapes['dog'] = finalize(pts, target_height=0.78, ground=0.0)

# --- RotorS Firefly hexacopter, hovering ---
pts = sample_norm(firefly_mesh(), N)
shapes['drone'] = finalize(pts, target_span=1.15, hover=0.95)

for k, v in shapes.items():
    mn, mx = v.min(0), v.max(0)
    print(f"{k}: y [{mn[1]:.2f},{mx[1]:.2f}] x [{mn[0]:.2f},{mx[0]:.2f}] z [{mn[2]:.2f},{mx[2]:.2f}]")

js = "// Auto-generated by tools/sample_hero_shapes.py — real robot meshes sampled to points.\n"
js += "// Sources: Unitree A2 (unitreerobotics/unitree_ros, BSD-3-Clause),\n"
js += "// ETH ASL RotorS Firefly (ethz-asl/rotors_simulator, Apache-2.0),\n"
js += "// Agibot X2 (Gautam1704/Agibot-X2-Humanoid URDF, Apache-2.0),\n"
js += "// SO-101 arm (TheRobotStudio/SO-ARM100, Apache-2.0).\n"
js += "// Format: base64 little-endian int16 xyz triplets, millimeters.\n"
js += "window.HERO_SHAPES = {\n"
for k, v in shapes.items():
    js += f'  {k}: "{encode(v)}",\n'
js += "};\n"

out = "../assets/js/hero-shapes.js"  # run from tools/
open(out, "w").write(js)
print("wrote", out, len(js) // 1024, "KB")
