"""
3D Vectorized Acoustic Ray Tracer with Diffuse Scattering & ISO 9613-1 Air Absorption
(250 Hz - 20 kHz Octave Bands)

Operates directly on the watertight 3D triangle mesh `newgrange_acoustic_interior`.
Features:
  - 2D (X, Y) grid DDA spatial acceleration (~60-180 triangles/cell) for exact closest hits
  - Vectorized Moller-Trumbore ray-triangle intersection in NumPy
  - 8-octave-band (63..8000 Hz) energy tracking with ISO 9613-1 air absorption
  - Stochastic specular + Lambertian cosine-weighted diffuse scattering per surface material
  - Absorption & radiation escape at entrance doorway & roof-box slit
  - Covers up to 300 bounces (~2.3+ s physical propagation) for clean ISO 3382 T20/T30 decay
  - Exports top 45 multi-bounce 3D ray trajectories for interactive WebGL2 visualization
"""

from __future__ import annotations

import json
import math
import os
import time
from typing import Dict, List, Tuple

import numpy as np

from build_mesh import build_acoustic_interior_mesh
from geometry_spec import (
    ACOUSTIC_STATIONS,
    AIR_PROPS,
    ENTRANCE_DOOR_Z,
    MATERIALS,
    ROOFBOX_SLIT_X_HALF,
    ROOFBOX_SLIT_Z_MAX,
    ROOFBOX_SLIT_Z_MIN,
    SPEED_OF_SOUND,
)


def _fibonacci_sphere(n: int, rng: np.random.Generator) -> np.ndarray:
    """Generate n quasi-uniform isotropic unit vectors on the sphere with slight jitter."""
    indices = np.arange(n, dtype=np.float64) + 0.5
    phi = np.arccos(1.0 - 2.0 * indices / n)
    theta = math.pi * (1.0 + math.sqrt(5.0)) * indices + rng.uniform(-0.02, 0.02, size=n)
    x = np.sin(phi) * np.cos(theta)
    y = np.sin(phi) * np.sin(theta)
    z = np.cos(phi)
    dirs = np.stack([x, y, z], axis=1)
    dirs /= np.linalg.norm(dirs, axis=1, keepdims=True)
    return dirs


def _cosine_hemisphere(normals: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Sample cosine-weighted Lambertian random directions in hemisphere around each normal."""
    n = len(normals)
    u1 = rng.uniform(0.0, 1.0, size=n)
    u2 = rng.uniform(0.0, 2.0 * math.pi, size=n)
    r = np.sqrt(u1)
    lx = r * np.cos(u2)
    ly = r * np.sin(u2)
    lz = np.sqrt(np.maximum(0.0, 1.0 - u1))

    ref = np.where(np.abs(normals[:, 2:3]) < 0.9, np.array([[0.0, 0.0, 1.0]]), np.array([[1.0, 0.0, 0.0]]))
    t = np.cross(ref, normals)
    t /= np.maximum(np.linalg.norm(t, axis=1, keepdims=True), 1e-12)
    b = np.cross(normals, t)
    dirs = lx[:, None] * t + ly[:, None] * b + lz[:, None] * normals
    dirs /= np.maximum(np.linalg.norm(dirs, axis=1, keepdims=True), 1e-12)
    return dirs


class MeshRayTracer:
    def __init__(self, acoustic_mesh: Dict[str, object]) -> None:
        self.verts = np.asarray(acoustic_mesh["verts"], dtype=np.float64)
        self.faces = np.asarray(acoustic_mesh["faces"], dtype=np.int32)
        face_mats_str: List[str] = list(acoustic_mesh["face_materials"])

        self.v0 = self.verts[self.faces[:, 0]]
        self.v1 = self.verts[self.faces[:, 1]]
        self.v2 = self.verts[self.faces[:, 2]]
        self.e1 = self.v1 - self.v0
        self.e2 = self.v2 - self.v0

        # Mesh normals point OUT of air cavity; inward normal into cavity is -cross(e1, e2)
        fn = -np.cross(self.e1, self.e2)
        fn_len = np.linalg.norm(fn, axis=1, keepdims=True)
        self.inward_normals = fn / np.maximum(fn_len, 1e-12)

        mat_names = list(MATERIALS.keys())
        name_to_idx = {name: i for i, name in enumerate(mat_names)}
        self.tri_mat_idx = np.array([name_to_idx[m] for m in face_mats_str], dtype=np.int32)
        self.mat_names = mat_names
        self.mat_refl = np.stack([1.0 - MATERIALS[m].alpha for m in mat_names], axis=0)
        self.mat_scatter = np.array([float(np.mean(MATERIALS[m].scatter[2:7])) for m in mat_names], dtype=np.float64)
        self.mat_is_open = np.array([m in ("entrance_portal", "roofbox_slit") for m in mat_names], dtype=bool)
        self.m_air = np.asarray(AIR_PROPS["air_attenuation_energy_np_per_m"], dtype=np.float64)

        # Build 2D (X, Y) grid spatial index: 8 x 26 = 208 cells
        self.x0 = -3.60
        self.dx = 0.95
        self.nx_g = 8
        self.y0 = -0.25
        self.dy = 0.96
        self.ny_g = 26

        tx0 = np.minimum(self.v0[:, 0], np.minimum(self.v1[:, 0], self.v2[:, 0]))
        tx1 = np.maximum(self.v0[:, 0], np.maximum(self.v1[:, 0], self.v2[:, 0]))
        ty0 = np.minimum(self.v0[:, 1], np.minimum(self.v1[:, 1], self.v2[:, 1]))
        ty1 = np.maximum(self.v0[:, 1], np.maximum(self.v1[:, 1], self.v2[:, 1]))

        self.cell_tris: List[np.ndarray] = []
        for ix in range(self.nx_g):
            xlo = self.x0 + ix * self.dx - 1e-3
            xhi = self.x0 + (ix + 1) * self.dx + 1e-3
            x_mask = (tx1 >= xlo) & (tx0 <= xhi)
            for iy in range(self.ny_g):
                ylo = self.y0 + iy * self.dy - 1e-3
                yhi = self.y0 + (iy + 1) * self.dy + 1e-3
                idx = np.where(x_mask & (ty1 >= ylo) & (ty0 <= yhi))[0].astype(np.int32)
                self.cell_tris.append(idx)

    def _intersect_tris(
        self, orig: np.ndarray, dirs: np.ndarray, t_ids: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Vectorized Moller-Trumbore intersection of R rays against triangle subset t_ids."""
        n_rays = len(orig)
        if len(t_ids) == 0 or n_rays == 0:
            return np.full(n_rays, np.inf), np.full(n_rays, -1, dtype=np.int32)

        v0 = self.v0[t_ids]
        e1 = self.e1[t_ids]
        e2 = self.e2[t_ids]

        best_t = np.full(n_rays, np.inf, dtype=np.float64)
        best_tri = np.full(n_rays, -1, dtype=np.int32)
        chunk_r = 256
        for rs in range(0, n_rays, chunk_r):
            re = min(rs + chunk_r, n_rays)
            ro = orig[rs:re, None, :]
            rd = dirs[rs:re, None, :]

            h = np.cross(rd, e2[None, :, :])
            a = np.sum(e1[None, :, :] * h, axis=2)
            valid = np.abs(a) > 1e-10
            inv_a = np.where(valid, 1.0 / np.where(valid, a, 1.0), 0.0)

            s_vec = ro - v0[None, :, :]
            u = inv_a * np.sum(s_vec * h, axis=2)
            valid &= (u >= -1e-6) & (u <= 1.0 + 1e-6)

            q = np.cross(s_vec, e1[None, :, :])
            v = inv_a * np.sum(rd * q, axis=2)
            valid &= (v >= -1e-6) & (u + v <= 1.0 + 1e-6)

            t = inv_a * np.sum(e2[None, :, :] * q, axis=2)
            valid &= t > 1e-4

            t_masked = np.where(valid, t, np.inf)
            local_min_idx = np.argmin(t_masked, axis=1)
            local_min_t = t_masked[np.arange(re - rs), local_min_idx]
            hit_mask = np.isfinite(local_min_t)
            best_t[rs:re] = np.where(hit_mask, local_min_t, np.inf)
            best_tri[rs:re] = np.where(hit_mask, t_ids[local_min_idx], -1)

        return best_t, best_tri

    def _trace_batch_step(
        self, orig: np.ndarray, dirs: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Exact global closest-hit via 2D (X, Y) grid DDA traversal."""
        n = len(orig)
        best_t = np.full(n, np.inf, dtype=np.float64)
        best_tri = np.full(n, -1, dtype=np.int32)

        ix_cell = np.clip(np.floor((orig[:, 0] - self.x0) / self.dx).astype(np.int32), 0, self.nx_g - 1)
        iy_cell = np.clip(np.floor((orig[:, 1] - self.y0) / self.dy).astype(np.int32), 0, self.ny_g - 1)
        searching = np.ones(n, dtype=bool)
        dir_x = dirs[:, 0]
        dir_y = dirs[:, 1]

        for _ in range(self.nx_g + self.ny_g + 2):
            if not np.any(searching):
                break
            cell_id = ix_cell * self.ny_g + iy_cell
            active_cells = np.unique(cell_id[searching])
            for cid in active_cells:
                mask = searching & (cell_id == cid)
                if not np.any(mask):
                    continue
                t_hit, tri_hit = self._intersect_tris(orig[mask], dirs[mask], self.cell_tris[int(cid)])

                cx = int(cid) // self.ny_g
                cy = int(cid) % self.ny_g
                dx_sub = dir_x[mask]
                dy_sub = dir_y[mask]
                ox_sub = orig[mask, 0]
                oy_sub = orig[mask, 1]

                x_plane = np.where(dx_sub >= 0.0, self.x0 + (cx + 1) * self.dx, self.x0 + cx * self.dx)
                y_plane = np.where(dy_sub >= 0.0, self.y0 + (cy + 1) * self.dy, self.y0 + cy * self.dy)
                tx = np.where(np.abs(dx_sub) > 1e-9, (x_plane - ox_sub) / np.where(np.abs(dx_sub) > 1e-9, dx_sub, 1.0), np.inf)
                ty = np.where(np.abs(dy_sub) > 1e-9, (y_plane - oy_sub) / np.where(np.abs(dy_sub) > 1e-9, dy_sub, 1.0), np.inf)
                t_exit = np.minimum(tx, ty)

                found = t_hit <= t_exit + 1e-4
                idx_global = np.where(mask)[0]
                hit_global = idx_global[found]
                best_t[hit_global] = t_hit[found]
                best_tri[hit_global] = tri_hit[found]
                searching[hit_global] = False

                miss_global = idx_global[~found]
                step_x = tx[~found] <= ty[~found]
                nx_next = ix_cell[miss_global] + np.where(step_x, np.where(dx_sub[~found] >= 0.0, 1, -1), 0)
                ny_next = iy_cell[miss_global] + np.where(~step_x, np.where(dy_sub[~found] >= 0.0, 1, -1), 0)
                oob = (nx_next < 0) | (nx_next >= self.nx_g) | (ny_next < 0) | (ny_next >= self.ny_g)
                searching[miss_global[oob]] = False
                ix_cell[miss_global[~oob]] = nx_next[~oob]
                iy_cell[miss_global[~oob]] = ny_next[~oob]

        return best_t, best_tri

    def trace_station_group(
        self,
        src_pos: Tuple[float, float, float],
        receivers: Dict[str, Tuple[Tuple[float, float, float], float]],
        n_rays: int = 5000,
        max_bounces: int = 300,
        exterior_source: bool = False,
        record_paths_count: int = 0,
        seed: int = 3200,
    ) -> Tuple[Dict[str, Dict[str, np.ndarray]], List[Dict[str, object]]]:
        """
        Trace n_rays from src_pos, detecting crossings of all receiver spheres in `receivers`.
        Returns per-receiver hit arrays {times, energies (K,8), dirs (K,3)} and optional 3D ray paths.
        """
        rng = np.random.default_rng(seed)
        dirs = _fibonacci_sphere(n_rays, rng)
        orig = np.tile(np.array(src_pos, dtype=np.float64), (n_rays, 1))
        energies = np.ones((n_rays, 8), dtype=np.float64)
        dist_accum = np.zeros(n_rays, dtype=np.float64)

        if exterior_source:
            forward = dirs[:, 1] > 1e-3
            t_y0 = np.where(forward, -orig[:, 1] / np.where(forward, dirs[:, 1], 1.0), -1.0)
            p_y0 = orig + dirs * t_y0[:, None]
            in_door = (np.abs(p_y0[:, 0]) <= 0.48) & (p_y0[:, 2] >= 0.02) & (p_y0[:, 2] <= ENTRANCE_DOOR_Z - 0.02)
            in_slit = (
                (np.abs(p_y0[:, 0]) <= ROOFBOX_SLIT_X_HALF)
                & (p_y0[:, 2] >= ROOFBOX_SLIT_Z_MIN)
                & (p_y0[:, 2] <= ROOFBOX_SLIT_Z_MAX)
            )
            entered = forward & (t_y0 > 0.0) & (in_door | in_slit)
            orig = p_y0[entered] + dirs[entered] * 0.02
            dirs = dirs[entered]
            t_ent = t_y0[entered] + 0.02
            dist_accum = t_ent
            energies = np.exp(-self.m_air[None, :] * t_ent[:, None]) * np.ones((len(orig), 8), dtype=np.float64)

        n_active = len(orig)
        alive = np.ones(n_active, dtype=bool)

        rec_names = list(receivers.keys())
        hits_t: Dict[str, List[np.ndarray]] = {k: [] for k in rec_names}
        hits_e: Dict[str, List[np.ndarray]] = {k: [] for k in rec_names}
        hits_d: Dict[str, List[np.ndarray]] = {k: [] for k in rec_names}

        n_track = min(record_paths_count, n_active)
        track_sel = np.linspace(0, max(0, n_active - 1), n_track, dtype=np.int32) if n_track > 0 else np.array([], dtype=np.int32)
        tracked_points: Dict[int, List[List[float]]] = {int(i): [orig[i].tolist()] for i in track_sel}
        tracked_mats: Dict[int, List[str]] = {int(i): [] for i in track_sel}
        tracked_times: Dict[int, List[float]] = {int(i): [0.0] for i in track_sel}
        tracked_energies: Dict[int, List[float]] = {int(i): [1.0] for i in track_sel}
        track_set = set(int(i) for i in track_sel)

        for bounce in range(max_bounces):
            cur_ids = np.where(alive)[0]
            if len(cur_ids) == 0:
                break

            o_sub = orig[cur_ids]
            d_sub = dirs[cur_ids]
            t_hit, tri_hit = self._trace_batch_step(o_sub, d_sub)

            valid_hit = (tri_hit >= 0) & np.isfinite(t_hit)
            alive[cur_ids[~valid_hit]] = False

            cur_ids = cur_ids[valid_hit]
            if len(cur_ids) == 0:
                break
            o_sub = o_sub[valid_hit]
            d_sub = d_sub[valid_hit]
            t_hit = t_hit[valid_hit]
            tri_hit = tri_hit[valid_hit]

            e_sub = energies[cur_ids]
            da_sub = dist_accum[cur_ids]
            for rname in rec_names:
                rpos, r_det = receivers[rname]
                r_arr = np.array(rpos, dtype=np.float64)
                oc = r_arr[None, :] - o_sub
                proj = np.sum(oc * d_sub, axis=1)
                d2 = np.sum(oc * oc, axis=1) - proj * proj
                crosses = (proj > 0.02) & (proj < t_hit - 0.01) & (d2 <= r_det * r_det)
                if np.any(crosses):
                    seg_d = proj[crosses]
                    tot_d = da_sub[crosses] + seg_d
                    t_arr = tot_d / SPEED_OF_SOUND
                    geom_w = 4.0 / (float(n_rays) * (r_det * r_det))
                    e_det = e_sub[crosses] * np.exp(-self.m_air[None, :] * seg_d[:, None]) * geom_w
                    hits_t[rname].append(t_arr)
                    hits_e[rname].append(e_det)
                    hits_d[rname].append(d_sub[crosses])

            hit_pts = o_sub + d_sub * t_hit[:, None]
            m_idx = self.tri_mat_idx[tri_hit]
            air_att = np.exp(-self.m_air[None, :] * t_hit[:, None])
            new_e = e_sub * air_att * self.mat_refl[m_idx]

            if bounce < 16 and len(track_set) > 0:
                for loc_k, gid in enumerate(cur_ids):
                    igid = int(gid)
                    if igid in track_set:
                        tracked_points[igid].append([round(float(v), 3) for v in hit_pts[loc_k]])
                        tracked_mats[igid].append(self.mat_names[int(m_idx[loc_k])])
                        tracked_times[igid].append(round(float((da_sub[loc_k] + t_hit[loc_k]) / SPEED_OF_SOUND), 5))
                        tracked_energies[igid].append(round(float(np.mean(new_e[loc_k, 2:6])), 4))

            # Terminate rays hitting open portals, exceeding 2.8 s, or below -65 dB energy
            escaped = (
                self.mat_is_open[m_idx]
                | (np.max(new_e, axis=1) < 3.0e-7)
                | (((da_sub + t_hit) / SPEED_OF_SOUND) > 2.8)
            )
            alive[cur_ids[escaped]] = False

            surv = ~escaped
            if not np.any(surv):
                break

            s_ids = cur_ids[surv]
            n_in = self.inward_normals[tri_hit[surv]]
            dot_nd = np.sum(d_sub[surv] * n_in, axis=1)
            n_in = np.where(dot_nd[:, None] > 0.0, -n_in, n_in)

            scat_p = self.mat_scatter[m_idx[surv]]
            is_diff = rng.uniform(0.0, 1.0, size=len(s_ids)) < scat_p
            d_spec = d_sub[surv] - 2.0 * np.sum(d_sub[surv] * n_in, axis=1, keepdims=True) * n_in
            d_spec /= np.maximum(np.linalg.norm(d_spec, axis=1, keepdims=True), 1e-12)

            d_next = d_spec.copy()
            if np.any(is_diff):
                d_next[is_diff] = _cosine_hemisphere(n_in[is_diff], rng)

            orig[s_ids] = hit_pts[surv] + n_in * 1.5e-3
            dirs[s_ids] = d_next
            energies[s_ids] = new_e[surv]
            dist_accum[s_ids] = da_sub[surv] + t_hit[surv]

        out_rec: Dict[str, Dict[str, np.ndarray]] = {}
        for k in rec_names:
            if len(hits_t[k]) > 0:
                t_all = np.concatenate(hits_t[k], axis=0)
                e_all = np.concatenate(hits_e[k], axis=0)
                d_all = np.concatenate(hits_d[k], axis=0)
                order = np.argsort(t_all)
                out_rec[k] = {"times": t_all[order], "energies": e_all[order], "dirs": d_all[order]}
            else:
                out_rec[k] = {
                    "times": np.zeros(0, dtype=np.float64),
                    "energies": np.zeros((0, 8), dtype=np.float64),
                    "dirs": np.zeros((0, 3), dtype=np.float64),
                }

        paths_out: List[Dict[str, object]] = []
        if record_paths_count > 0:
            cand = []
            for gid in track_sel:
                pts = tracked_points[int(gid)]
                if len(pts) >= 5:
                    y_span = max(p[1] for p in pts) - min(p[1] for p in pts)
                    cand.append((y_span + 0.3 * len(pts), int(gid)))
            cand.sort(reverse=True)
            for _, gid in cand[:45]:
                paths_out.append(
                    {
                        "points": tracked_points[gid],
                        "materials": tracked_mats[gid],
                        "times_s": tracked_times[gid],
                        "energies": tracked_energies[gid],
                    }
                )

        return out_rec, paths_out


def run_all_raytracing(out_dir: str, acoustic_mesh: Dict[str, object] | None = None) -> Dict[str, object]:
    """Execute full 3D ray-tracing across all 5 source-receiver stations and save echograms."""
    os.makedirs(out_dir, exist_ok=True)
    t0 = time.time()
    if acoustic_mesh is None:
        acoustic_mesh = build_acoustic_interior_mesh()

    rt = MeshRayTracer(acoustic_mesh)

    t1 = time.time()
    rec_1, ray_paths = rt.trace_station_group(
        ACOUSTIC_STATIONS["chamber_center"]["src"],
        {
            "chamber_center": (ACOUSTIC_STATIONS["chamber_center"]["rec"], 0.42),
            "chamber_to_passage": (ACOUSTIC_STATIONS["chamber_to_passage"]["rec"], 0.33),
            "chamber_to_entrance": (ACOUSTIC_STATIONS["chamber_to_entrance"]["rec"], 0.33),
        },
        n_rays=5000,
        max_bounces=300,
        record_paths_count=160,
        seed=3201,
    )
    print(
        f"[RayTrace] Run 1 (Chamber Center -> 3 stations) in {time.time() - t1:.2f} s | hits: "
        + ", ".join(f"{k}={len(v['times'])}" for k, v in rec_1.items())
    )

    t2 = time.time()
    rec_2, _ = rt.trace_station_group(
        ACOUSTIC_STATIONS["east_to_west"]["src"],
        {"east_to_west": (ACOUSTIC_STATIONS["east_to_west"]["rec"], 0.42)},
        n_rays=4500,
        max_bounces=300,
        seed=3202,
    )
    print(f"[RayTrace] Run 2 (East -> West) in {time.time() - t2:.2f} s | hits: {len(rec_2['east_to_west']['times'])}")

    t3 = time.time()
    rec_3, _ = rt.trace_station_group(
        ACOUSTIC_STATIONS["outside_to_chamber"]["src"],
        {"outside_to_chamber": (ACOUSTIC_STATIONS["outside_to_chamber"]["rec"], 0.48)},
        n_rays=30000,
        max_bounces=300,
        exterior_source=True,
        seed=3203,
    )
    print(
        f"[RayTrace] Run 3 (Exterior -> Chamber) in {time.time() - t3:.2f} s | hits: {len(rec_3['outside_to_chamber']['times'])}"
    )

    all_rec = {**rec_1, **rec_2, **rec_3}
    npz_kwargs = {}
    summary = {}
    for st_key, data in all_rec.items():
        npz_kwargs[f"{st_key}_times"] = data["times"]
        npz_kwargs[f"{st_key}_energies"] = data["energies"]
        npz_kwargs[f"{st_key}_dirs"] = data["dirs"]
        summary[st_key] = {
            "num_hits": int(len(data["times"])),
            "first_arrival_ms": round(float(data["times"][0] * 1000.0), 2) if len(data["times"]) > 0 else None,
            "max_time_s": round(float(data["times"][-1]), 3) if len(data["times"]) > 0 else None,
        }

    np.savez_compressed(os.path.join(out_dir, "raytrace_echograms.npz"), **npz_kwargs)
    with open(os.path.join(out_dir, "ray_paths.json"), "w", encoding="utf-8") as fp:
        json.dump({"source": ACOUSTIC_STATIONS["chamber_center"]["src"], "paths": ray_paths}, fp)

    print(f"[RayTrace] Total time: {time.time() - t0:.2f} s | Saved {len(ray_paths)} 3D trajectories")
    return summary


if __name__ == "__main__":
    print(run_all_raytracing("/Users/lightsource/.gemini/antigravity/scratch/newgrange-acoustic-model/acoustics"))
