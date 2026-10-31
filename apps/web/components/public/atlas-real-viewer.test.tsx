import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AtlasRealViewer } from './atlas-real-viewer';

type StubbedManifestSource = { kind: string; url?: string; manifest?: { packages: { id: string; groupKey: string }[] } };
type StubbedViewerProps = {
  manifestSource: StubbedManifestSource;
  visibleGroupKeys?: Set<string>;
  onStructureSelected?: (packageId: string) => void;
  pinnedStructureIds?: string[];
  renderStructureCallout?: (packageId: string) => ReactNode;
};

let lastViewerProps: StubbedViewerProps | undefined;
let viewerRenderCount = 0;
const manifestSourceIdentities = new Set<StubbedManifestSource>();

// Stubs the real @medhelp/atlas-viewer package entirely (its own real click→selection and
// screen-anchored callout rendering are covered by that package's own scene.test.tsx/
// selection.test.ts/anchors.test.ts — real raycasting and real screen projection both need a
// real browser anyway, see this task's report). This stub renders each `pinnedStructureIds`
// entry's `renderStructureCallout(id)` content directly into the DOM (skipping all 3D
// positioning) so this file can test AtlasRealViewer's own pin/unpin/prune state logic and the
// real label text it resolves, independent of the 3D anchoring.
vi.mock('@medhelp/atlas-viewer', () => ({
  AtlasViewer: (props: StubbedViewerProps) => {
    lastViewerProps = props;
    viewerRenderCount += 1;
    manifestSourceIdentities.add(props.manifestSource);
    return (
      <div
        data-manifest-kind={props.manifestSource.kind}
        data-manifest-url={props.manifestSource.url}
        data-testid="atlas-viewer-stub"
        data-visible-group-keys={props.visibleGroupKeys ? [...props.visibleGroupKeys].join(',') : undefined}
      >
        {(props.pinnedStructureIds ?? []).map((id) => (
          <div data-package-id={id} data-testid="pinned-callout" key={id}>
            {props.renderStructureCallout?.(id)}
          </div>
        ))}
      </div>
    );
  },
}));

function makeManifestResponse() {
  return {
    schemaVersion: 1,
    source: {
      name: 'Test fixture',
      license: 'cc-by-sa-4.0',
      licenseUrl: 'https://example.com/license',
      modificationNotes: 'synthetic test fixture, not real content',
    },
    packages: [
      { id: 'femur-0', groupKey: '1: Skeletal system', byteSize: 100, hash: 'h1', structureIds: [], label: 'Fêmur' },
      { id: 'femur-1', groupKey: '1: Skeletal system', byteSize: 100, hash: 'h2', structureIds: [], label: 'Fêmur' },
      { id: 'biceps-0', groupKey: '4: Muscular system', byteSize: 100, hash: 'h3', structureIds: [], label: 'Bíceps braquial' },
    ],
    structures: [],
  };
}

describe('AtlasRealViewer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    lastViewerProps = undefined;
    viewerRenderCount = 0;
    manifestSourceIdentities.clear();
  });

  it('points AtlasViewer at the manifest URL (not a pre-resolved object), so its own package-GLB URL resolution stays correct', async () => {
    // Regression: AtlasViewer resolves each package's GLB URL relative to manifestSource.url
    // when given `{ kind: 'url' }`, but falls back to the *page's* URL when given
    // `{ kind: 'manifest' }` — which silently breaks on this route (confirmed as a real 404
    // against a real dev server: /explorar/atlas resolves relative package URLs to
    // /explorar/<id>.glb instead of /atlas/<id>.glb). This component must keep handing
    // AtlasViewer a `{ kind: 'url' }` source despite fetching its own copy of the manifest for
    // the navigation panel below.
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() }));
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('atlas-viewer-stub')).toHaveAttribute('data-manifest-kind', 'url');
    });

    expect(screen.getByTestId('atlas-viewer-stub')).toHaveAttribute('data-manifest-url', '/atlas/manifest.json');
  });

  it('keeps manifestSource at a stable identity across re-renders (e.g. toggling a system), so AtlasViewer never resets its whole loaded scene on a toggle', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() })) as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByText('Sistema muscular')).toBeInTheDocument();
    });

    const muscularCheckbox = screen.getByText('Sistema muscular').closest('label')?.querySelector('input');
    muscularCheckbox!.click();

    await waitFor(() => {
      expect(viewerRenderCount).toBeGreaterThan(1);
    });

    // Every render of AtlasViewer (across the toggle) saw the exact same manifestSource object
    // reference — not a fresh literal each time.
    expect(manifestSourceIdentities.size).toBe(1);
  });

  it('renders a real system-name checklist derived from the manifest\'s groupKey field, with real counts', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() })) as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByText('Sistema esquelético')).toBeInTheDocument();
    });
    expect(screen.getByText('Sistema muscular')).toBeInTheDocument();

    // Skeletal system has 2 packages, muscular has 1, in the fixture manifest above.
    const skeletalRow = screen.getByText('Sistema esquelético').closest('label');
    expect(skeletalRow).toHaveTextContent('2');
    const muscularRow = screen.getByText('Sistema muscular').closest('label');
    expect(muscularRow).toHaveTextContent('1');
  });

  it('defaults to showing only the skeletal system, not every system and not none', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() })) as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByTestId('atlas-viewer-stub')).toHaveAttribute('data-manifest-kind', 'url');
    });

    expect(lastViewerProps?.visibleGroupKeys).toEqual(new Set(['1: Skeletal system']));

    const skeletalCheckbox = screen.getByText('Sistema esquelético').closest('label')?.querySelector('input');
    const muscularCheckbox = screen.getByText('Sistema muscular').closest('label')?.querySelector('input');
    expect(skeletalCheckbox).toBeChecked();
    expect(muscularCheckbox).not.toBeChecked();
  });

  it('toggling a system checkbox updates visibleGroupKeys passed to AtlasViewer', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() })) as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByText('Sistema muscular')).toBeInTheDocument();
    });

    const muscularCheckbox = screen.getByText('Sistema muscular').closest('label')?.querySelector('input');
    expect(muscularCheckbox).toBeDefined();
    muscularCheckbox!.click();

    await waitFor(() => {
      expect(lastViewerProps?.visibleGroupKeys).toEqual(new Set(['1: Skeletal system', '4: Muscular system']));
    });

    muscularCheckbox!.click();

    await waitFor(() => {
      expect(lastViewerProps?.visibleGroupKeys).toEqual(new Set(['1: Skeletal system']));
    });
  });

  it('surfaces a manifest fetch failure as an alert instead of throwing', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 404, statusText: 'Not Found', json: async () => ({}) })) as unknown as typeof fetch;

    render(<AtlasRealViewer />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch atlas manifest');
    });
  });

  describe('pinned structure labels (click-to-label for a student building up a figure)', () => {
    async function renderReady() {
      global.fetch = vi.fn(async () => ({ ok: true, json: async () => makeManifestResponse() })) as unknown as typeof fetch;
      const result = render(<AtlasRealViewer />);
      await waitFor(() => {
        expect(screen.getByTestId('atlas-viewer-stub')).toBeInTheDocument();
      });
      return result;
    }

    it('pins a structure (with its real Portuguese label) on the first click, reported via onStructureSelected', async () => {
      await renderReady();

      expect(lastViewerProps?.pinnedStructureIds).toEqual([]);

      lastViewerProps!.onStructureSelected!('femur-0');

      await waitFor(() => {
        expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']);
      });
      expect(screen.getByTestId('pinned-callout')).toHaveTextContent('Fêmur');
    });

    it('unpins that same structure on a second click of the same package id', async () => {
      await renderReady();

      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']));

      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual([]));
    });

    it('builds up several pinned labels at once, each with its own real label, in click order', async () => {
      await renderReady();

      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']));

      lastViewerProps!.onStructureSelected!('biceps-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0', 'biceps-0']));

      const callouts = screen.getAllByTestId('pinned-callout');
      expect(callouts).toHaveLength(2);
      expect(callouts[0]).toHaveTextContent('Fêmur');
      expect(callouts[1]).toHaveTextContent('Bíceps braquial');

      // Unpinning the first must not disturb the second.
      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['biceps-0']));
    });

    it("the callout's own close button unpins it, same as clicking the structure again", async () => {
      await renderReady();

      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(screen.getByTestId('pinned-callout')).toBeInTheDocument());

      screen.getByRole('button', { name: /Remover marcação de Fêmur/i }).click();

      await waitFor(() => {
        expect(lastViewerProps?.pinnedStructureIds).toEqual([]);
      });
    });

    it('drops a pinned label whose system was just toggled off, so it does not resurrect on a later re-toggle', async () => {
      await renderReady();

      // femur-0/femur-1 belong to "1: Skeletal system", which starts visible by default.
      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']));

      const skeletalCheckbox = screen.getByText('Sistema esquelético').closest('label')?.querySelector('input');
      skeletalCheckbox!.click();

      await waitFor(() => {
        expect(lastViewerProps?.pinnedStructureIds).toEqual([]);
      });

      // Toggling the same system back on must not silently bring the old pin back.
      skeletalCheckbox!.click();
      await waitFor(() => {
        expect(lastViewerProps?.visibleGroupKeys).toEqual(new Set(['1: Skeletal system']));
      });
      expect(lastViewerProps?.pinnedStructureIds).toEqual([]);
    });

    it('leaves an unrelated pinned label alone when a different system is toggled off', async () => {
      await renderReady();

      lastViewerProps!.onStructureSelected!('femur-0');
      await waitFor(() => expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']));

      // Muscular system starts off, so turning it "off" again is a no-op toggle-on/off pair —
      // use a toggle-on then toggle-off to exercise the real "was visible, now isn't" prune path.
      const muscularCheckbox = screen.getByText('Sistema muscular').closest('label')?.querySelector('input');
      muscularCheckbox!.click();
      await waitFor(() => expect(lastViewerProps?.visibleGroupKeys?.has('4: Muscular system')).toBe(true));

      muscularCheckbox!.click();
      await waitFor(() => expect(lastViewerProps?.visibleGroupKeys?.has('4: Muscular system')).toBe(false));

      expect(lastViewerProps?.pinnedStructureIds).toEqual(['femur-0']);
    });
  });
});
