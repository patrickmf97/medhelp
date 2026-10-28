import { describe, expect, it } from 'vitest';

import { adaptSceneDump } from './raw-scene-dump';
import type { RawSceneDump } from './raw-scene-dump';

describe('adaptSceneDump', () => {
  it('converts snake_case Blender dump fields into the camelCase SceneDump shape', () => {
    const raw: RawSceneDump = {
      scene_root_children: ['1: Skeletal system'],
      collections: {
        '1: Skeletal system': { name: '1: Skeletal system', children: ['Head'], object_names: [] },
        Head: { name: 'Head', children: [], object_names: ['Head.mesh'] },
      },
      objects: [{ name: 'Head.mesh', type: 'MESH', vert_count: 10, poly_count: 4 }],
      totals: { objects: 1, meshes: 1, collections: 2 },
    };

    expect(adaptSceneDump(raw)).toEqual({
      sceneRootChildren: ['1: Skeletal system'],
      collections: {
        '1: Skeletal system': { name: '1: Skeletal system', children: ['Head'], objectNames: [] },
        Head: { name: 'Head', children: [], objectNames: ['Head.mesh'] },
      },
    });
  });
});
