import {describe, expect, it} from "@jest/globals"

import {DOCXExporterRichtext} from "../../src/exporter/docx/richtext.js"
import {xmlDOM} from "../../src/exporter/tools/xml.js"
import type {BibDB, ExportDoc, FidusNode} from "../../src/types.js"

describe("DOCX exporter citation XML escaping", () => {
    it("escapes XML chars in Zotero citation field instructions", () => {
        const citationNode: FidusNode = {
            type: "citation",
            attrs: {
                references: [
                    {
                        id: 1,
                        item: {
                            title: "Test with <jats:p>tag</jats:p> content",
                            abstract: "Less than < 2 and more > 1"
                        }
                    }
                ]
            }
        }

        const bibDB: BibDB = {
            db: {
                "1": {entry_key: "test2024"}
            }
        }

        const doc: ExportDoc = {
            id: 1,
            title: "Test",
            content: citationNode,
            settings: {},
            comments: {}
        }

        const richtext = new DOCXExporterRichtext(
            doc,
            {language: "en-US"},
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {
                pmCits: [citationNode],
                citInfos: [citationNode.attrs],
                citationTexts: ["(Author 2024)"],
                bibDB
            } as any,
            {} as any
        )

        const output = richtext.run(citationNode, {citationType: "author-date"})

        // The output must not contain raw XML-like tags inside the instruction JSON.
        expect(output).not.toMatch(/<jats:p>/)
        expect(output).not.toMatch(/< 2/)
        // The JSON special characters must be escaped as XML entities.
        expect(output).toMatch(/&lt;jats:p&gt;/)
        expect(output).toMatch(/&lt; 2/)
        // fast-xml-parser must be able to parse the generated fragment.
        expect(() => xmlDOM(output)).not.toThrow()
    })
})
