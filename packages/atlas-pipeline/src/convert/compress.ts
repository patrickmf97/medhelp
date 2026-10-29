import type { Document } from '@gltf-transform/core';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { draco, meshopt } from '@gltf-transform/functions';
import { createDecoderModule, createEncoderModule } from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

export type CompressionMethod = 'none' | 'meshopt' | 'draco';

// draco3dgltf's createDecoderModule()/createEncoderModule() each instantiate a fresh WASM module
// on every call — unlike meshoptimizer's MeshoptEncoder/MeshoptDecoder, which are already
// module-level singletons gated by a `.ready` promise. Processing thousands of meshes (this
// pipeline's real workload — see cli/convert.ts) through compressWithDraco()/readGlb() must not
// pay that instantiation cost per mesh, so the modules are memoized here the same way.
let dracoEncoderModulePromise: Promise<unknown> | null = null;
function getDracoEncoderModule(): Promise<unknown> {
  dracoEncoderModulePromise ??= createEncoderModule();
  return dracoEncoderModulePromise;
}

let dracoDecoderModulePromise: Promise<unknown> | null = null;
function getDracoDecoderModule(): Promise<unknown> {
  dracoDecoderModulePromise ??= createDecoderModule();
  return dracoDecoderModulePromise;
}

/**
 * Reads a GLB produced by any of this module's compressors (or the uncompressed baseline from
 * convertMesh()) back into a glTF-Transform Document, registering whichever codec the caller
 * says the buffer was encoded with. `method: 'none'` reads a plain, uncompressed GLB.
 *
 * Note for callers inspecting vertex positions afterwards: the `meshopt()` transform quantizes
 * vertex data via `KHR_mesh_quantization` and bakes the remaining scale/offset into the mesh
 * node's local transform, so a *raw* POSITION accessor array read back is in normalized,
 * node-relative space, not world space. `Accessor.getElement()` already decodes the
 * normalization, and `getBounds()` (from `@gltf-transform/functions`) additionally applies the
 * node's world matrix — use one of those rather than a raw `getArray()` when comparing
 * world-space positions/bounds across compression methods (see benchmark.ts).
 */
export async function readGlb(glb: Uint8Array, method: CompressionMethod): Promise<Document> {
  const io = new NodeIO();

  if (method === 'meshopt') {
    await MeshoptDecoder.ready;
    io.registerExtensions([EXTMeshoptCompression]).registerDependencies({
      'meshopt.decoder': MeshoptDecoder,
    });
  } else if (method === 'draco') {
    io.registerExtensions([KHRDracoMeshCompression]).registerDependencies({
      'draco3d.decoder': await getDracoDecoderModule(),
    });
  }

  return io.readBinary(glb);
}

/**
 * Re-encodes an uncompressed GLB (as produced by convertMesh()) with Meshopt compression
 * (EXT_meshopt_compression). Meshopt is lossy only through its quantization step (positions,
 * normals), not through any topology change, and decodes fast — see docs/atlas/compression-benchmark.md
 * for the real numbers behind picking a default.
 */
export async function compressWithMeshopt(glb: Uint8Array): Promise<Uint8Array> {
  await MeshoptEncoder.ready;

  const document = await new NodeIO().readBinary(glb);
  await document.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));

  const io = new NodeIO().registerExtensions([EXTMeshoptCompression]).registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
  });
  return io.writeBinary(document);
}

/**
 * Re-encodes an uncompressed GLB (as produced by convertMesh()) with Draco compression
 * (KHR_draco_mesh_compression). Draco typically compresses further than Meshopt but decodes
 * slower (WASM entropy decode) — see docs/atlas/compression-benchmark.md for the real numbers
 * behind picking a default.
 */
export async function compressWithDraco(glb: Uint8Array): Promise<Uint8Array> {
  const document = await new NodeIO().readBinary(glb);
  await document.transform(draco({ method: 'edgebreaker' }));

  const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
    'draco3d.encoder': await getDracoEncoderModule(),
  });
  return io.writeBinary(document);
}
