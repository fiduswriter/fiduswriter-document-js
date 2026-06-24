# @fiduswriter/document

This package contains the Fidus Writer document schema, importers and exporters.

## Usage

```javascript
import {docSchema, FW_DOCUMENT_VERSION} from "@fiduswriter/document/schema"
import {DocxConvert} from "@fiduswriter/document/importer/docx/convert.js"
import {ExportFidusFile} from "@fiduswriter/document/exporter/native/file.js"
```

## Dependencies

- `fwtoolkit` — shared utilities (text helpers, network helpers, etc.)

## Schema JSON

A JSON serialization of the schema is exported as `schema.json` and regenerated
by the `prepare` / `prepublishOnly` scripts.
