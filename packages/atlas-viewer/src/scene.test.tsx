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

type Point3 = { x: number; y: number; z: number };

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
  // Real positioning (screen-space projection that tracks the live camera every frame) is drei's
  // own job, not testable under jsdom's fake camera/no-WebGL setup — see this task's report. This
  // stub only lets scene.test.tsx verify AtlasScene's own wiring: which pinned id got rendered,
  // with which content, anchored at which computed 3D point.
  Html: ({ children, position }: { children: ReactNode; position: Point3 }) => (
    <div data-testid="html-label" data-position={`${position.x},${position.y},${position.z}`}>
      {children}
    </div>
  ),
  Line: ({ points }: { points: Point3[] }) => (
    <div data-testid="leader-line" data-points={points.map((p) => `${p.x},${p.y},${p.z}`).join('|')} />
  ),
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

  it('renders the canvas shell with a cheap three-point lighting rig and a configured orbit control, without crashing', () => {
    threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
    fakeControls = { target: new Vector3(), update: vi.fn() };

    const { container, getByTestId } = render(<AtlasScene loaded={[]} />);

    expect(getByTestId('atlas-canvas')).toBeInTheDocument();
    expect(getByTestId('orbit-controls')).toBeInTheDocument();
    expect(container.querySelector('ambientlight')).not.toBeNull();

    // Key + fill: two directional lights, not one, with different intensities (the key light is
    // the brighter of the two) — see scene.tsx's lighting-rig doc comment.
    const directionalLights = container.querySelectorAll('directionallight');
    expect(directionalLights).toHaveLength(2);
    const intensities = Array.from(directionalLights)
      .map((el) => Number(el.getAttribute('intensity')))
      .sort((a, b) => a - b);
    expect(intensities[0]).toBeGreaterThan(0);
    expect(intensities[1]).toBeGreaterThan(intensities[0]!);

    expect(orbitControlsProps?.makeDefault).toBe(true);
    expect(orbitControlsProps?.enableDamping).toBe(true);
  });

  it('does not render any shadow-casting setup (deliberately cheap — see scene.tsx)', () => {
    threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
    fakeControls = { target: new Vector3(), update: vi.fn() };

    const { container } = render(<AtlasScene loaded={[]} />);

    expect(container.querySelector('[castshadow]')).toBeNull();
    expect(container.querySelector('[receiveshadow]')).toBeNull();
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

  describe('pinned structure callouts', () => {
    it('renders a leader line + the host-supplied content for each pinned id that is loaded', () => {
      threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
      fakeControls = { target: new Vector3(), update: vi.fn() };

      const loaded: LoadedAtlasPackage[] = [
        { id: 'femur-l', object: sphereAt(10, 0, 0) },
        { id: 'femur-r', object: sphereAt(-10, 0, 0) },
      ];

      const { container, getByText } = render(
        <AtlasScene
          loaded={loaded}
          pinnedStructureIds={['femur-l']}
          renderStructureCallout={(id) => <span>Label for {id}</span>}
        />,
      );

      expect(container.querySelectorAll('[data-testid="leader-line"]')).toHaveLength(1);
      expect(container.querySelectorAll('[data-testid="html-label"]')).toHaveLength(1);
      expect(getByText('Label for femur-l')).toBeInTheDocument();
    });

    it('renders one callout per pinned id, each with its own content', () => {
      threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
      fakeControls = { target: new Vector3(), update: vi.fn() };

      const loaded: LoadedAtlasPackage[] = [
        { id: 'femur-l', object: sphereAt(10, 0, 0) },
        { id: 'femur-r', object: sphereAt(-10, 0, 0) },
      ];

      const { getByText } = render(
        <AtlasScene
          loaded={loaded}
          pinnedStructureIds={['femur-l', 'femur-r']}
          renderStructureCallout={(id) => <span>Label for {id}</span>}
        />,
      );

      expect(getByText('Label for femur-l')).toBeInTheDocument();
      expect(getByText('Label for femur-r')).toBeInTheDocument();
    });

    it('renders no callout for a pinned id whose package is not (or no longer) loaded', () => {
      threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
      fakeControls = { target: new Vector3(), update: vi.fn() };

      const loaded: LoadedAtlasPackage[] = [{ id: 'femur-l', object: sphereAt(10, 0, 0) }];

      const { container, queryByText } = render(
        <AtlasScene
          loaded={loaded}
          pinnedStructureIds={['femur-l', 'some-unloaded-package']}
          renderStructureCallout={(id) => <span>Label for {id}</span>}
        />,
      );

      expect(container.querySelectorAll('[data-testid="html-label"]')).toHaveLength(1);
      expect(queryByText('Label for some-unloaded-package')).not.toBeInTheDocument();
    });

    it('renders no callouts at all when pinnedStructureIds is empty/undefined, or renderStructureCallout is missing', () => {
      threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
      fakeControls = { target: new Vector3(), update: vi.fn() };
      const loaded: LoadedAtlasPackage[] = [{ id: 'femur-l', object: sphereAt(10, 0, 0) }];

      const noPins = render(<AtlasScene loaded={loaded} renderStructureCallout={(id) => <span>{id}</span>} />);
      expect(noPins.container.querySelectorAll('[data-testid="html-label"]')).toHaveLength(0);
      noPins.unmount();

      const noRenderer = render(<AtlasScene loaded={loaded} pinnedStructureIds={['femur-l']} />);
      expect(noRenderer.container.querySelectorAll('[data-testid="html-label"]')).toHaveLength(0);
    });

    it('anchors the leader line on the real structure and lifts the label above it', () => {
      threeState = { camera: new PerspectiveCamera(75, 1, 0.1, 1000), size: { width: 300, height: 150 } };
      fakeControls = { target: new Vector3(), update: vi.fn() };

      const object = sphereAt(10, 5, -3);
      object.updateMatrixWorld(true);
      const loaded: LoadedAtlasPackage[] = [{ id: 'femur-l', object }];

      const { container } = render(
        <AtlasScene loaded={loaded} pinnedStructureIds={['femur-l']} renderStructureCallout={() => <span>Fêmur</span>} />,
      );

      const line = container.querySelector('[data-testid="leader-line"]')!;
      const [start, end] = line.getAttribute('data-points')!.split('|').map((p) => p.split(',').map(Number));

      // The line starts on the real structure (its world position)...
      expect(start![0]).toBeCloseTo(10);
      expect(start![1]).toBeCloseTo(5);
      expect(start![2]).toBeCloseTo(-3);
      // ...and ends lifted straight up from it (same x/z, greater y) — see interaction/anchors.ts.
      expect(end![0]).toBeCloseTo(10);
      expect(end![1]).toBeGreaterThan(start![1]!);
      expect(end![2]).toBeCloseTo(-3);

      const label = container.querySelector('[data-testid="html-label"]')!;
      const [labelX, labelY, labelZ] = label.getAttribute('data-position')!.split(',').map(Number);
      expect(labelX).toBeCloseTo(end![0]!);
      expect(labelY).toBeCloseTo(end![1]!);
      expect(labelZ).toBeCloseTo(end![2]!);
    });
  });
});
