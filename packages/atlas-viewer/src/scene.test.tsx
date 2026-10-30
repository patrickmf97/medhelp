import { cleanup, render, waitFor } from '@testing-library/react';
import { forwardRef } from 'react';
import type { ReactNode, Ref } from 'react';
import { Mesh, MeshBasicMaterial, PerspectiveCamera, SphereGeometry, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LoadedAtlasPackage } from './types';

// scene.tsx renders a real R3F <Canvas>, which needs a real WebGL context jsdom does not provide
// (see atlas-viewer.test.tsx's own comment on this same limitation). So, like that test mocks
// three's GLTFLoader to exercise AtlasViewer without real binary GLB parsing, this file mocks
// '@react-three/fiber' and '@react-three/drei' themselves to exercise AtlasScene's wiring
// (lighting present, OrbitControls configured, camera-fit effect runs) without ever creating a
// real WebGLRenderer. This cannot and does not prove anything about actual pixels on screen — see
// this task's report for the real-browser check that covers that.

type FakeThreeState = { camera: PerspectiveCamera; size: { width: number; height: number } };

let threeState: FakeThreeState;
let orbitControlsProps: Record<string, unknown> | undefined;
let fakeControls: { target: Vector3; update: ReturnType<typeof vi.fn> };

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div data-testid="atlas-canvas">{children}</div>,
  useThree: () => threeState,
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: forwardRef((props: Record<string, unknown>, ref: Ref<unknown>) => {
    orbitControlsProps = props;
    if (typeof ref === 'function') {
      ref(fakeControls);
    } else if (ref) {
      (ref as { current: unknown }).current = fakeControls;
    }
    return <div data-testid="orbit-controls" />;
  }),
}));

// Imported after the mocks above so scene.tsx picks up the mocked modules.
const { AtlasScene } = await import('./scene');

function sphereAt(x: number, y: number, z: number): LoadedAtlasPackage['object'] {
  const mesh = new Mesh(new SphereGeometry(1, 8, 8), new MeshBasicMaterial());
  mesh.position.set(x, y, z);
  return mesh;
}

describe('AtlasScene', () => {
  afterEach(() => {
    cleanup();
    orbitControlsProps = undefined;
    vi.restoreAllMocks();
  });

  it('renders the canvas shell with ambient + directional lighting and a configured orbit control, without crashing', () => {
    threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
    fakeControls = { target: new Vector3(), update: vi.fn() };

    const { container, getByTestId } = render(<AtlasScene loaded={[]} />);

    expect(getByTestId('atlas-canvas')).toBeInTheDocument();
    expect(getByTestId('orbit-controls')).toBeInTheDocument();
    expect(container.querySelector('ambientlight')).not.toBeNull();
    expect(container.querySelector('directionallight')).not.toBeNull();
    expect(orbitControlsProps?.makeDefault).toBe(true);
    expect(orbitControlsProps?.enableDamping).toBe(true);
  });

  it('renders every loaded package as a primitive inside the scene', () => {
    threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
    fakeControls = { target: new Vector3(), update: vi.fn() };

    const loaded: LoadedAtlasPackage[] = [
      { id: 'pkg-a', object: sphereAt(0, 0, 0) },
      { id: 'pkg-b', object: sphereAt(5, 0, 0) },
    ];
    const { container } = render(<AtlasScene loaded={loaded} />);

    expect(container.querySelectorAll('primitive')).toHaveLength(2);
  });

  it('fits the camera to the loaded packages exactly once, the first time loading becomes non-empty', async () => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    threeState = { camera, size: { width: 300, height: 150 } };
    fakeControls = { target: new Vector3(), update: vi.fn() };

    const { rerender } = render(<AtlasScene loaded={[]} />);

    // A fresh PerspectiveCamera we construct ourselves (not R3F's own default-camera setup) starts
    // at the origin; nothing should move it while nothing has loaded yet.
    expect(camera.position.equals(new Vector3(0, 0, 0))).toBe(true);

    const loaded: LoadedAtlasPackage[] = [{ id: 'pkg-a', object: sphereAt(20, 0, 0) }];
    rerender(<AtlasScene loaded={loaded} />);

    await waitFor(() => {
      expect(camera.position.equals(new Vector3(0, 0, 0))).toBe(false);
    });
    expect(fakeControls.update).toHaveBeenCalled();
    expect(fakeControls.target.x).toBeCloseTo(20);

    const fittedPosition = camera.position.clone();

    // A second, very different package arriving afterwards must NOT re-trigger the fit — see the
    // CameraRig doc comment in scene.tsx for why this is a deliberate one-time fit.
    const loadedTwo: LoadedAtlasPackage[] = [...loaded, { id: 'pkg-b', object: sphereAt(-500, 0, 0) }];
    rerender(<AtlasScene loaded={loadedTwo} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(camera.position.equals(fittedPosition)).toBe(true);
  });
});
