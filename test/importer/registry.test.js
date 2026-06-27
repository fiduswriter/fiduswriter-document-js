import {describe, expect, it} from "@jest/globals"

const {ImporterRegistry} = await import(
    "../../src/importer/registry.js"
)

describe("ImporterRegistry", () => {
    it("selects the correct importer by file extension", () => {
        const registry = new ImporterRegistry()
        registry.register([["DOCX", ["docx"]]], class DocxImporter {})
        registry.register([["ODT", ["odt"]]], class OdtImporter {})

        expect(registry.getImporter("docx").description).toBe("DOCX")
        expect(registry.getImporter("odt").description).toBe("ODT")
    })

    it("analyzes a ZIP and returns the matching importer", async () => {
        const {default: JSZip} = await import("jszip")
        const zip = new JSZip()
        zip.file("document.docx", "fake docx content")

        const registry = new ImporterRegistry()
        const FakeDocxImporter = class DocxImporter {}
        registry.register([["DOCX", ["docx"]]], FakeDocxImporter)

        const result = registry.getZipImporter(zip)
        expect(result).not.toBeNull()
        expect(result.importer).toBe(FakeDocxImporter)
    })
})
