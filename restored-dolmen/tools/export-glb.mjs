// Writes dolmen-restored.glb: the assembled model at the design point, for Blender or any glTF viewer.
//
//   npm run glb
import { writeFileSync } from "node:fs";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { buildDolmen } from "../src/model.js";
import { DESIGN } from "../src/acoustics.js";

// GLTFExporter reads its output through FileReader, which Node lacks
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = b;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((b) => {
      this.result = `data:${blob.type};base64,${Buffer.from(b).toString("base64")}`;
      this.onloadend?.();
    });
  }
};

const { root } = buildDolmen(DESIGN);
root.getObjectByName("ground").removeFromParent();
root.updateMatrixWorld(true);
let meshes = 0;
root.traverse((o) => o.isMesh && meshes++);

const glb = await new GLTFExporter().parseAsync(root, { binary: true });
writeFileSync(new URL("../dolmen-restored.glb", import.meta.url), Buffer.from(glb));
console.log(`dolmen-restored.glb: ${meshes} meshes, ${(glb.byteLength / 1024).toFixed(0)} KB`);
