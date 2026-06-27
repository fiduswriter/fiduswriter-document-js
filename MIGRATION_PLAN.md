# @fiduswriter/document JS → TS Migration Plan

## Goal
Convert every remaining JavaScript source file under `src/` to TypeScript, delete
the original `.js` files once their replacements are green, and add at least one
new real-file round-trip test for an additional format.

Final validation must pass:
- `npm run typecheck`
- `npm run build`
- `npm run build-schema`
- `npm test`

## Work cadence
For each phase/group:
1. Rename files to `.ts` and add real types (keep `.js` extensions in imports).
2. Run `npm run typecheck`.
3. Run `npm test`.
4. Delete the old `.js` files only when the group is green.
5. Commit the group.

## Status

### ✅ Completed and committed

| Phase | Commit | Notes |
|-------|--------|-------|
| Phase 0 | `a86c289` | Added migration plan, `src/modules.d.ts`, updated shared types |
| Phase 1 | `b4c3203` | Leaf/helper modules (bibliography, citations, mathlive, small exporter utilities, shrink, encryptor, get_images) |
| Phase 2 | `57c9b40` | Format-specific core converters/renderers (docx/odt comments/images/rels/metadata/lists/tables/citations/footnotes/styles, jats bib/citations, html/pandoc citations, print) |
| Phase 3 | `9477455` | Large importers (docx parse/omml2mathml/citations/convert, odt convert, pandoc convert) |

All committed phases pass `npm run typecheck`, `npm run build`, `npm run build-schema`, and `npm test` (139 tests).

### ✅ Phase 4 — Converted and committed

The remaining exporter entry points and large converters have been converted to
TypeScript and the original `.js` files removed.

Converted files:
- `src/exporter/docx/index.ts`
- `src/exporter/docx/render.ts`
- `src/exporter/docx/richtext.ts`
- `src/exporter/odt/index.ts`
- `src/exporter/odt/render.ts`
- `src/exporter/odt/richtext.ts`
- `src/exporter/html/index.ts`
- `src/exporter/html/convert.ts`
- `src/exporter/jats/index.ts`
- `src/exporter/jats/convert.ts`
- `src/exporter/latex/index.ts`
- `src/exporter/latex/convert.ts`
- `src/exporter/pandoc/index.ts`
- `src/exporter/pandoc/convert.ts`
- `src/exporter/epub/index.ts`

Also adjusted during the conversion:
- `src/exporter/epub/tools.ts`
- `src/exporter/jats/citations.ts`
- `src/exporter/print/index.ts`
- `src/schema/i18n.ts`
- `src/types.ts`

Phase 4 passes `npm run typecheck`, `npm run build`, `npm run build-schema`, and
`npm test` (139 tests), and `find src -name '*.js'` returns no source files.

## Definition of done
- No `.js` source files remain in `src/`.
- `npm run typecheck`, `npm run build`, `npm run build-schema`, and `npm test` pass.
- At least one new real-file round-trip test is present and passing.
- All changes are committed in the `fiduswriter-document` repository.

## Conventions used so far

- Keep `.js` extensions in all `import`/`export` paths (NodeNext resolution maps
  them to `.ts`).
- Import `gettext`, `interpolate`, and `staticUrl` from `fwtoolkit` rather than
  relying on globals.
- Use types from `src/types.ts` for `BibDB`, `ImageDB`, `FidusNode`, `FidusDoc`,
  `ExportDoc`, `DocSettings`, `CSL`, etc.
- Import XML helper types as needed:
  - `import type {XMLElement} from "../tools/xml.js"`
  - `import type {XmlZip} from "../tools/xml_zip.js"`
- `XMLElement.getAttribute()` returns `unknown`; cast with `String(...)` when
  using string methods.
- `allowJs: true` remains enabled in `tsconfig.json`, so imports from any
  not-yet-converted `.js` module resolve as `any`. There should be no remaining
  `.js` imports after Phase 4 is committed.

## Definition of done
- No `.js` source files remain in `src/`.
- `npm run typecheck`, `npm run build`, `npm run build-schema`, and `npm test` pass.
- At least one new real-file round-trip test is present and passing.
- All changes are committed in the `fiduswriter-document` repository.
