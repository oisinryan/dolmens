"""
Pure-Python 3D Mesh Exporters for Newgrange Acoustic Model
Supports:
  - Binary STL (validated watertight solids)
  - Wavefront OBJ + MTL (multi-material architectural & acoustic meshes)
  - Binary glTF 2.0 (.glb) with Y-up conversion, PBR materials, vertex normals & vertex colors
  - Compact WebGL2 binary bundle + JSON manifest for zero-overhead interactive browser loading
"""

from __future__ import annotations

import json
import os
import struct
from typing import Dict, List, Optional

import numpy as np


def compute_vertex_normals(verts: np.ndarray, faces: np.ndarray) -> np.ndarray:
    """Compute area-weighted smooth vertex normals for triangle mesh (N,3), (M,3)."""
    v0 = verts[faces[:, 0]]
    v1 = verts[faces[:, 1]]
    v2 = verts[faces[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    vn = np.zeros_like(verts, dtype=np.float64)
    np.add.at(vn, faces[:, 0], fn)
    np.add.at(vn, faces[:, 1], fn)
    np.add.at(vn, faces[:, 2], fn)
    norms = np.linalg.norm(vn, axis=1, keepdims=True)
    norms = np.where(norms < 1e-12, 1.0, norms)
    return (vn / norms).astype(np.float32)


def compute_signed_volume(verts: np.ndarray, faces: np.ndarray) -> float:
    """Compute enclosed signed volume via divergence theorem. Positive => outward normals."""
    v0 = verts[faces[:, 0]]
    v1 = verts[faces[:, 1]]
    v2 = verts[faces[:, 2]]
    return float(np.sum(np.einsum("ij,ij->i", v0, np.cross(v1, v2))) / 6.0)


def check_watertight_manifold(verts: np.ndarray, faces: np.ndarray) -> Dict[str, object]:
    """Verify strict 2-manifold watertightness (every undirected edge shared by 2 faces)."""
    e0 = np.stack([faces[:, 0], faces[:, 1]], axis=1)
    e1 = np.stack([faces[:, 1], faces[:, 2]], axis=1)
    e2 = np.stack([faces[:, 2], faces[:, 0]], axis=1)
    directed = np.concatenate([e0, e1, e2], axis=0)
    undirected = np.sort(directed, axis=1)
    # Encode pair of uint32 into uint64 for fast counting
    keys = (undirected[:, 0].astype(np.uint64) << 32) | undirected[:, 1].astype(np.uint64)
    _, counts = np.unique(keys, return_counts=True)
    boundary_edges = int(np.sum(counts == 1))
    non_manifold_edges = int(np.sum(counts > 2))

    # Check consistent orientation: every directed edge (a,b) should have opposite (b,a)
    dir_keys = (directed[:, 0].astype(np.uint64) << 32) | directed[:, 1].astype(np.uint64)
    _, dir_counts = np.unique(dir_keys, return_counts=True)
    duplicate_directed = int(np.sum(dir_counts > 1))

    vol = compute_signed_volume(verts, faces)
    return {
        "vertices": int(len(verts)),
        "triangles": int(len(faces)),
        "unique_edges": int(len(counts)),
        "boundary_edges": boundary_edges,
        "non_manifold_edges": non_manifold_edges,
        "duplicate_directed_edges": duplicate_directed,
        "signed_volume_m3": round(vol, 4),
        "is_watertight_manifold": bool(
            boundary_edges == 0 and non_manifold_edges == 0 and duplicate_directed == 0 and vol > 0.0
        ),
    }


def write_binary_stl(verts: np.ndarray, faces: np.ndarray, stl_path: str, header_text: str = "Newgrange Acoustic Model") -> None:
    """Write standard binary STL file."""
    os.makedirs(os.path.dirname(stl_path), exist_ok=True)
    v = np.asarray(verts, dtype=np.float32)
    f = np.asarray(faces, dtype=np.int32)
    v0 = v[f[:, 0]]
    v1 = v[f[:, 1]]
    v2 = v[f[:, 2]]
    fn = np.cross(v1 - v0, v2 - v0)
    nlen = np.linalg.norm(fn, axis=1, keepdims=True)
    fn = fn / np.where(nlen < 1e-12, 1.0, nlen)

    rec_dtype = np.dtype(
        [
            ("normal", "<f4", (3,)),
            ("v0", "<f4", (3,)),
            ("v1", "<f4", (3,)),
            ("v2", "<f4", (3,)),
            ("attr", "<u2"),
        ]
    )
    records = np.empty(len(f), dtype=rec_dtype)
    records["normal"] = fn.astype(np.float32)
    records["v0"] = v0
    records["v1"] = v1
    records["v2"] = v2
    records["attr"] = 0

    header = header_text.encode("ascii", errors="ignore")[:80].ljust(80, b"\x00")
    with open(stl_path, "wb") as fp:
        fp.write(header)
        fp.write(struct.pack("<I", len(f)))
        fp.write(records.tobytes())


def write_obj_mtl(
    submeshes: List[Dict[str, object]],
    obj_path: str,
    mtl_path: str,
    mtl_dict: Dict[str, Dict[str, object]],
) -> None:
    """Write multi-material Wavefront OBJ and MTL files."""
    os.makedirs(os.path.dirname(obj_path), exist_ok=True)
    mtl_filename = os.path.basename(mtl_path)

    with open(mtl_path, "w", encoding="utf-8") as fm:
        fm.write("# Newgrange Acoustic 3D Model Materials\n")
        for mname, props in mtl_dict.items():
            kd = props.get("rgb", (0.5, 0.5, 0.5))
            alpha = props.get("alpha_opacity", 1.0)
            rough = props.get("roughness", 0.85)
            ns = max(5.0, (1.0 - rough) * 120.0)
            fm.write(f"newmtl {mname}\n")
            fm.write(f"Ka {kd[0]*0.25:.4f} {kd[1]*0.25:.4f} {kd[2]*0.25:.4f}\n")
            fm.write(f"Kd {kd[0]:.4f} {kd[1]:.4f} {kd[2]:.4f}\n")
            fm.write("Ks 0.0800 0.0800 0.0800\n")
            fm.write(f"Ns {ns:.1f}\n")
            fm.write(f"d {alpha:.3f}\n\n")

    with open(obj_path, "w", encoding="utf-8") as fo:
        fo.write(f"# Newgrange Passage Tomb 3D Model (meters, Z-up)\n")
        fo.write(f"mtllib {mtl_filename}\n\n")
        v_offset = 1
        for sm in submeshes:
            name = sm["name"]
            verts = np.asarray(sm["verts"], dtype=np.float32)
            faces = np.asarray(sm["faces"], dtype=np.int32)
            norms = sm.get("normals")
            if norms is None:
                norms = compute_vertex_normals(verts, faces)
            else:
                norms = np.asarray(norms, dtype=np.float32)
            face_mats = sm.get("face_materials")
            default_mat = sm.get("material", "greywacke_orthostat")

            fo.write(f"o {name}\n")
            for vx, vy, vz in verts:
                fo.write(f"v {vx:.5f} {vy:.5f} {vz:.5f}\n")
            for nx, ny, nz in norms:
                fo.write(f"vn {nx:.5f} {ny:.5f} {nz:.5f}\n")

            if face_mats is not None:
                unique_mats = []
                seen = set()
                for m in face_mats:
                    if m not in seen:
                        seen.add(m)
                        unique_mats.append(m)
                for m in unique_mats:
                    fo.write(f"usemtl {m}\n")
                    idx_mask = [idx for idx, fm_name in enumerate(face_mats) if fm_name == m]
                    for fidx in idx_mask:
                        a, b, c = faces[fidx] + v_offset
                        fo.write(f"f {a}//{a} {b}//{b} {c}//{c}\n")
            else:
                fo.write(f"usemtl {default_mat}\n")
                for a, b, c in faces + v_offset:
                    fo.write(f"f {a}//{a} {b}//{b} {c}//{c}\n")

            v_offset += len(verts)


def write_glb(
    submeshes: List[Dict[str, object]],
    glb_path: str,
    mtl_dict: Dict[str, Dict[str, object]],
    convert_z_up_to_y_up: bool = True,
) -> None:
    """
    Write a valid binary glTF 2.0 (.glb) file supporting multiple named meshes,
    per-vertex normals, optional per-vertex COLOR_0, and PBR metallicRoughness materials.
    """
    os.makedirs(os.path.dirname(glb_path), exist_ok=True)
    bin_chunks = bytearray()
    buffer_views = []
    accessors = []
    meshes = []
    nodes = []
    materials = []
    mat_index_map: Dict[str, int] = {}

    def get_mat_index(mat_name: str) -> int:
        if mat_name in mat_index_map:
            return mat_index_map[mat_name]
        props = mtl_dict.get(mat_name, {})
        rgb = props.get("rgb", (0.5, 0.5, 0.5))
        opacity = float(props.get("alpha_opacity", 1.0))
        roughness = float(props.get("roughness", 0.88))
        metallic = float(props.get("metallic", 0.02))
        double_sided = bool(props.get("double_sided", False))
        emissive = props.get("emissive", None)
        mat_def = {
            "name": mat_name,
            "pbrMetallicRoughness": {
                "baseColorFactor": [float(rgb[0]), float(rgb[1]), float(rgb[2]), opacity],
                "metallicFactor": metallic,
                "roughnessFactor": roughness,
            },
            "doubleSided": double_sided,
        }
        if opacity < 0.999:
            mat_def["alphaMode"] = "BLEND"
        if emissive is not None:
            mat_def["emissiveFactor"] = [float(emissive[0]), float(emissive[1]), float(emissive[2])]
        idx = len(materials)
        materials.append(mat_def)
        mat_index_map[mat_name] = idx
        return idx

    def append_buffer(raw_bytes: bytes, target: Optional[int]) -> int:
        # 4-byte align
        while len(bin_chunks) % 4 != 0:
            bin_chunks.append(0)
        offset = len(bin_chunks)
        bin_chunks.extend(raw_bytes)
        bv = {"buffer": 0, "byteOffset": offset, "byteLength": len(raw_bytes)}
        if target is not None:
            bv["target"] = target
        idx = len(buffer_views)
        buffer_views.append(bv)
        return idx

    for sm in submeshes:
        name = str(sm["name"])
        verts = np.asarray(sm["verts"], dtype=np.float32).copy()
        faces = np.asarray(sm["faces"], dtype=np.uint32).copy()
        norms = sm.get("normals")
        if norms is None:
            norms = compute_vertex_normals(verts, faces)
        else:
            norms = np.asarray(norms, dtype=np.float32).copy()
        colors = sm.get("colors")

        if convert_z_up_to_y_up:
            # Z-up (x, y, z) -> Y-up (x, z, -y) (right-handed, det=+1, preserves winding)
            verts = np.stack([verts[:, 0], verts[:, 2], -verts[:, 1]], axis=1).astype(np.float32)
            norms = np.stack([norms[:, 0], norms[:, 2], -norms[:, 1]], axis=1).astype(np.float32)

        bv_pos = append_buffer(verts.tobytes(), 34962)  # ARRAY_BUFFER
        acc_pos = len(accessors)
        accessors.append(
            {
                "bufferView": bv_pos,
                "componentType": 5126,  # FLOAT
                "count": int(len(verts)),
                "type": "VEC3",
                "min": verts.min(axis=0).astype(float).tolist(),
                "max": verts.max(axis=0).astype(float).tolist(),
            }
        )

        bv_norm = append_buffer(norms.tobytes(), 34962)
        acc_norm = len(accessors)
        accessors.append(
            {
                "bufferView": bv_norm,
                "componentType": 5126,
                "count": int(len(norms)),
                "type": "VEC3",
            }
        )

        attrs = {"POSITION": acc_pos, "NORMAL": acc_norm}
        if colors is not None:
            col_arr = np.asarray(colors, dtype=np.float32)
            bv_col = append_buffer(col_arr.tobytes(), 34962)
            acc_col = len(accessors)
            accessors.append(
                {
                    "bufferView": bv_col,
                    "componentType": 5126,
                    "count": int(len(col_arr)),
                    "type": "VEC3",
                }
            )
            attrs["COLOR_0"] = acc_col

        # Split by face_materials if provided
        face_mats = sm.get("face_materials")
        primitives = []
        if face_mats is not None:
            unique_mats = list(dict.fromkeys(face_mats))
            for mname in unique_mats:
                mask = np.array([m == mname for m in face_mats], dtype=bool)
                sub_faces = faces[mask].astype(np.uint32)
                bv_idx = append_buffer(sub_faces.tobytes(), 34963)  # ELEMENT_ARRAY_BUFFER
                acc_idx = len(accessors)
                accessors.append(
                    {
                        "bufferView": bv_idx,
                        "componentType": 5125,  # UNSIGNED_INT
                        "count": int(sub_faces.size),
                        "type": "SCALAR",
                    }
                )
                primitives.append(
                    {
                        "attributes": attrs,
                        "indices": acc_idx,
                        "material": get_mat_index(mname),
                    }
                )
        else:
            bv_idx = append_buffer(faces.tobytes(), 34963)
            acc_idx = len(accessors)
            accessors.append(
                {
                    "bufferView": bv_idx,
                    "componentType": 5125,
                    "count": int(faces.size),
                    "type": "SCALAR",
                }
            )
            primitives.append(
                {
                    "attributes": attrs,
                    "indices": acc_idx,
                    "material": get_mat_index(str(sm.get("material", "greywacke_orthostat"))),
                }
            )

        mesh_idx = len(meshes)
        meshes.append({"name": name, "primitives": primitives})
        nodes.append({"name": name, "mesh": mesh_idx})

    while len(bin_chunks) % 4 != 0:
        bin_chunks.append(0)

    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "Newgrange Acoustic 3D Builder",
        },
        "scene": 0,
        "scenes": [{"name": "Newgrange", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "buffers": [{"byteLength": len(bin_chunks)}],
        "bufferViews": buffer_views,
        "accessors": accessors,
    }
    json_bytes = json.dumps(gltf_json, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunks)
    with open(glb_path, "wb") as fg:
        fg.write(struct.pack("<III", 0x46546C67, 2, total_len))
        fg.write(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        fg.write(json_bytes)
        fg.write(struct.pack("<II", len(bin_chunks), 0x004E4942))
        fg.write(bin_chunks)


def write_webgl_bundle(
    submeshes: List[Dict[str, object]],
    out_dir: str,
    mtl_dict: Dict[str, Dict[str, object]],
) -> None:
    """
    Write compact binary buffers (Z-up architectural coordinates) and scene_manifest.json
    for instant zero-parse loading in the interactive WebGL2 viewer.
    """
    os.makedirs(out_dir, exist_ok=True)
    bin_buf = bytearray()
    manifest_meshes = []

    def append_arr(arr: np.ndarray) -> Dict[str, int]:
        while len(bin_buf) % 4 != 0:
            bin_buf.append(0)
        offset = len(bin_buf)
        raw = arr.tobytes()
        bin_buf.extend(raw)
        return {"byteOffset": offset, "byteLength": len(raw)}

    for sm in submeshes:
        verts = np.asarray(sm["verts"], dtype=np.float32)
        faces = np.asarray(sm["faces"], dtype=np.uint32)
        norms = sm.get("normals")
        if norms is None:
            norms = compute_vertex_normals(verts, faces)
        else:
            norms = np.asarray(norms, dtype=np.float32)

        colors = sm.get("colors")
        if colors is None:
            rgb = mtl_dict.get(str(sm.get("material", "greywacke_orthostat")), {}).get("rgb", (0.5, 0.5, 0.5))
            colors = np.tile(np.array(rgb, dtype=np.float32), (len(verts), 1))
        else:
            colors = np.asarray(colors, dtype=np.float32)

        pos_ref = append_arr(verts)
        norm_ref = append_arr(norms)
        col_ref = append_arr(colors)
        idx_ref = append_arr(faces)

        m_props = mtl_dict.get(str(sm.get("material", "greywacke_orthostat")), {})
        manifest_meshes.append(
            {
                "name": sm["name"],
                "layer": sm.get("layer", "architecture"),
                "vertexCount": int(len(verts)),
                "indexCount": int(faces.size),
                "opacity": float(m_props.get("alpha_opacity", 1.0)),
                "roughness": float(m_props.get("roughness", 0.88)),
                "doubleSided": bool(m_props.get("double_sided", False)),
                "emissive": bool(m_props.get("emissive") is not None),
                "pos": pos_ref,
                "norm": norm_ref,
                "col": col_ref,
                "idx": idx_ref,
            }
        )

    bin_path = os.path.join(out_dir, "newgrange_scene.bin")
    with open(bin_path, "wb") as fb:
        fb.write(bin_buf)

    manifest_path = os.path.join(out_dir, "scene_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as fm:
        json.dump(
            {
                "binaryFile": "newgrange_scene.bin",
                "totalBytes": len(bin_buf),
                "meshes": manifest_meshes,
            },
            fm,
            indent=2,
        )
