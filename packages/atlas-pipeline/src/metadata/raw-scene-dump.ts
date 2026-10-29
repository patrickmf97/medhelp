import type { SceneDump } from './types';

/**
 * Shape written by the Blender inspection script (dump_hierarchy.py) that runs OUTSIDE this
 * repo, under the memory watchdog, against the real Startup.blend scene. Field names mirror the
 * Python script's `json.dump(...)` output verbatim (snake_case), which this module adapts into
 * the camelCase `SceneDump` shape the rest of the pipeline works with.
 */
export type RawSceneCollection = {
  name: string;
  children: string[];
  object_names: string[];
};

export type RawSceneObject = {
  name: string;
  type: string;
  vert_count?: number;
  poly_count?: number;
};

export type RawSceneDump = {
  scene_root_children: string[];
  collections: Record<string, RawSceneCollection>;
  objects: RawSceneObject[];
  totals: { objects: number; meshes: number; collections: number };
};

export function adaptSceneDump(raw: RawSceneDump): SceneDump {
  const collections: SceneDump['collections'] = {};
  for (const [name, collection] of Object.entries(raw.collections)) {
    collections[name] = {
      name: collection.name,
      children: [...collection.children],
      objectNames: [...collection.object_names],
    };
  }

  return {
    sceneRootChildren: [...raw.scene_root_children],
    collections,
  };
}
