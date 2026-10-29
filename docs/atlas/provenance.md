# Atlas 3D — Source Provenance and License Record

This record pins exactly which archive the MEDHELP Atlas pipeline is built from, how to verify
it, and the license terms that apply to the content it contains. It is the single source of
truth that `packages/atlas-pipeline/src/provenance/known-archive.ts` must stay in lockstep with.

## Source archive

| Field | Value |
| --- | --- |
| Project | Z-Anatomy — "The libre 3D atlas of anatomy" |
| Repository | https://github.com/Z-Anatomy/Models-of-human-anatomy |
| File | `Z-Anatomy.zip` |
| Acquired | 2026-10-28 |
| sha256 | `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736` |
| File size | 86,734,957 bytes |

The archive itself (and its extracted contents, including `Startup.blend`) are **never**
committed to this repository. They live outside the repo at `~/medhelp-atlas-source/` on the
machine that runs the pipeline. Only this document, the recorded hash, and the pipeline code
that validates the hash are committed. See `tools: packages/atlas-pipeline/src/provenance/` for
the strict validator (`validateSource`) that accepts a correct hash, rejects a wrong hash, and
rejects a missing/unset archive path.

Z-Anatomy's own models are, in turn, derived from the original **BodyParts3D** database:

> BodyParts3D, © The Database Center for Life Science licensed under CC Attribution-Share Alike
> 2.1 Japan. Original model: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

## License — default (CC BY-SA 4.0)

Unless flagged otherwise below, every structure in this dataset is licensed:

**Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**
License text: http://creativecommons.org/licenses/by-sa/4.0/

Required attribution, reproduced verbatim from Z-Anatomy's own `License.txt` / `Readme.md`:

> **MODELS**
> - "BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1 Japan". The original
>   model can be downloaded [here](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html).
> - "Z-Anatomy - The libre 3D atlas of anatomy - CC-BY-SA 4.0"
>
> The following models have been used as reference/included and adapted:
> - "Brainder" and "White matter" from the University of Washington
> - "Cranial Nerves and Foramina - by University of Dundee, CAHID - CC-BY 4.0"
> - "Anatomy of the Inner Ear - by University of Dundee School of Medicine - CC-BY-NC-SA 4.0"
> - "Kidney - by Lissie Cowley - CC-BY-NC 4.0"
>
> **DEFINITIONS**
> - "Wikipedia - CC-BY-SA 3.0"
>
> **AUTHORS:** Kousaku Okubo (original model "BodyParts3D"), Gauthier Kervyn (design, 3D,
> anatomy), Marcin Zielinski (Blender add-on), Lluis Vinent (Unity development), Ana Teresa
> Bigio (Portuguese translation), Carlos Torres Villar (Spanish translation), Paola Perin,
> Daniele Cossellu, Elisa Vivado (Italian translation), Jadwiga Palosz (Polish translation),
> Shariar Ahmadpour (Parsi translation).

MEDHELP's own derived/converted assets (OBJ/GLB exports, the anatomical metadata catalog) are
modifications of this database and, per the ShareAlike clause, remain under CC BY-SA 4.0 unless
they fall under one of the non-commercial exclusions below, which are excluded from MEDHELP's
commercial product entirely.

## License exclusions — NOT CC BY-SA 4.0, NOT shipped in the commercial product

These named sub-resources carry their own, incompatible-with-commercial-use licenses per
Z-Anatomy's ATTRIBUTIONS section. The pipeline (`packages/atlas-pipeline/src/metadata`) tags and
excludes every structure in the corresponding region of the scene graph — not just a node with
the literal name, but its entire subtree, since many descendant structures (e.g. "Cochlea",
"Vestibule" under "Internal ear") do not repeat the licensed resource's name themselves.

| Attributed resource | License | Scene match (case-insensitive substring, propagated down the subtree) | Status |
| --- | --- | --- | --- |
| "Anatomy of the Inner Ear" — University of Dundee School of Medicine | CC BY-NC-SA 4.0 | `inner ear` or `internal ear` | **Excluded** (`excluded: true`) |
| "Kidney" — Lissie Cowley | CC BY-NC 4.0 | `kidney` | **Excluded** (`excluded: true`) |
| "Cranial Nerves and Foramina" — University of Dundee, CAHID | CC BY 4.0 | `cranial nerve` | **Not excluded** — CC BY 4.0 has no NonCommercial or ShareAlike clause, so it is commercial-safe. Tagged `cc-by-4.0` (distinct from the CC BY-SA 4.0 default) so its simpler attribution-only requirement is tracked accurately. |

Notes on the matching:

- The scene graph has no collection literally named "Inner Ear"; the equivalent anatomical
  Terminologia Anatomica term used throughout the scene is **"Internal ear"**, which is why the
  matcher accepts both spellings. Verified by inspecting the real scene graph
  (`~/medhelp-atlas-source/extracted/Z-Anatomy/Startup.blend`, dumped via
  `dump_hierarchy.py` → `scene-dump.json`): collection `Internal ear` exists with descendants
  `Bony labyrinth`, `Membranous labyrinth`, `Cochlea`, `Vestibule`, `Semicircular canals`, etc.
- The scene has no collection named exactly "Foramina" distinct from "Cranial nerves"; only the
  `Cranial nerves` subtree (and its 12 named cranial nerve branches) could be positively
  identified as corresponding to the Dundee CAHID attribution. This is a documented limitation,
  not a silent gap: if a separately-named foramina structure is identified later, update the
  matcher in `packages/atlas-pipeline/src/metadata/license-rules.ts` and this table together.
- `Cortex of kidney lobe`, `Kidney lobe`, `Medial border of kidney`, `Renal pelvis`, `Major
  calices`, etc. are excluded as descendants of `Kidney`. Vessels that merely *supply* the
  kidney (e.g. "Renal artery", under the cardiovascular system) are **not** excluded — they are
  BodyParts3D-derived structures reused across the whole body, not part of the Cowley kidney
  model itself.

## Keeping the raw archive and heavy binary assets out of Git

`~/medhelp-atlas-source/` (archive, extracted `.blend`, exported OBJ/GLB geometry) is outside
this repository's working tree and must stay that way. `.gitignore` additionally blocks the
following patterns in case any of this ever ends up inside the repo by accident:

```
*.blend
*.blend1
Z-Anatomy.zip
```

Only hashes, this record, the pipeline source code, and small JSON reports/manifests derived
from processing the data are committed.
