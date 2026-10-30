import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AtlasRealViewer } from './atlas-real-viewer';

vi.mock('@medhelp/atlas-viewer', () => ({
  AtlasViewer: (props: { manifestSource: { kind: string; url?: string } }) => (
    <div data-manifest-kind={props.manifestSource.kind} data-manifest-url={props.manifestSource.url} data-testid="atlas-viewer-stub" />
  ),
}));

describe('AtlasRealViewer', () => {
  it('points the real AtlasViewer at the flat public manifest published for this demo route', () => {
    render(<AtlasRealViewer />);

    const stub = screen.getByTestId('atlas-viewer-stub');
    expect(stub).toHaveAttribute('data-manifest-kind', 'url');
    expect(stub).toHaveAttribute('data-manifest-url', '/atlas/manifest.json');
  });
});
