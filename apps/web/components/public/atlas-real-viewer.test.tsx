import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AtlasRealViewer } from './atlas-real-viewer';

type StubbedManifestSource = { kind: string; url?: string; manifest?: { packages: { id: string; groupKey: string }[] } };

let lastViewerProps: { manifestSource: StubbedManifestSource; visibleGroupKeys?: Set<string> } | undefined;
let viewerRenderCount = 0;
const manifestSourceIdentities = new Set<StubbedManifestSource>();

vi.mock('@medhelp/atlas-viewer', () => ({
  AtlasViewer: (props: { manifestSource: StubbedManifestSource; visibleGroupKeys?: Set<string> }) => {
    lastViewerProps = props;
    viewerRenderCount += 1;
    manifestSourceIdentities.add(props.manifestSource);
    return (
      <div
        data-manifest-kind={props.manifestSource.kind}
        data-manifest-url={props.manifestSource.url}
        data-testid="atlas-viewer-stub"
        data-visible-group-keys={props.visibleGroupKeys ? [...props.visibleGroupKeys].join(',') : undefined}
      />
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
      { id: 'femur-0', groupKey: '1: Skeletal system', byteSize: 100, hash: 'h1', structureIds: [] },
      { id: 'femur-1', groupKey: '1: Skeletal system', byteSize: 100, hash: 'h2', structureIds: [] },
      { id: 'biceps-0', groupKey: '4: Muscular system', byteSize: 100, hash: 'h3', structureIds: [] },
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
});
