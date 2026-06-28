# Changelog

All notable changes to `@fiduswriter/document` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] — 2026-06-28

First stable release. Consolidates the document schema, all importers, and all
exporters into a single self-contained npm package with a full TypeScript
rewrite and a browser-runnable demo site.

### Added

- **Full TypeScript rewrite** — every source file is now `.ts`; the package
  ships with `.d.ts` declarations and source maps.
- **Exporters** (all run entirely in the browser or in Node):
  - DOCX (Office Open XML) with template support
  - ODT (OpenDocument Text) with template support
  - JATS XML (`article` and `book-part` types)
  - HTML (standalone and EPUB-compatible)
  - EPUB 3
  - LaTeX
  - Pandoc JSON
  - Native Fidus Writer (`.fidus` zip)
  - Print (via Vivliostyle)
- **Importers**:
  - DOCX
  - ODT
  - Pandoc JSON
  - Native Fidus Writer
- **Citations & bibliography** — `createCSL` helper wires up
  `citeproc-plus` with pre-compiled CSL styles; all exporters that need
  formatted citations accept a `CSL` instance.
- **Schema** — ProseMirror-compatible document schema exported as both
  TypeScript types and a `schema.json` artefact; `FW_DOCUMENT_VERSION`,
  `MIN_FW_DOCUMENT_VERSION`, and `MAX_FW_DOCUMENT_VERSION` constants exposed.
- **Demo site** at https://fiduswriter.codeberg.page/fiduswriter-document/
  — File converter (JATS, HTML, LaTeX, Pandoc JSON, EPUB, DOCX, ODT, Native),
  schema viewer, JATS bibliography generator, and import preview — all
  processing happens in the browser.
  - The file converter demo ships built-in "Classic" (DOCX) and "Free" (ODT)
    export templates; users can also upload their own.
  - The bibliography DB and document JSON are both editable in the UI.
- **Round-trip tests** — Jest suite with real DOCX/ODT fixture files; validates
  ZIP structure, XML well-formedness, and content fidelity after
  import → export cycles.
- `deploy-pages` npm script to build and push the demo site to Codeberg Pages.

### Changed

- The TypeScript migration note in the README has been updated to reflect that
  the migration is complete (not "in progress").

---

[0.1.0]: https://codeberg.org/fiduswriter/fiduswriter-document/releases/tag/v0.1.0
