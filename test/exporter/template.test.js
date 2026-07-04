import {describe, expect, it} from "@jest/globals"
import JSZip from "jszip"

import {generateDocxTemplate, generateOdtTemplate} from "../../src/exporter/template/index.js"

describe("Exporter templates", () => {
    const docContent = {
        content: [
            {type: "title"},
            {type: "richtext_part", attrs: {id: "body", title: "Body"}}
        ],
        attrs: {papersize: "A4"}
    }

    it("generates an ODT template with all required ODF namespaces", async () => {
        const blob = await generateOdtTemplate(docContent)
        const arrayBuffer = await blob.arrayBuffer()
        const zip = await JSZip.loadAsync(arrayBuffer)
        const contentXml = await zip.file("content.xml").async("string")
        expect(contentXml).toContain('xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"')
        expect(contentXml).toContain('xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"')
        expect(contentXml).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"')
        expect(contentXml).toContain('xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"')
    })

    it("generates a DOCX template with the WordprocessingML namespace", async () => {
        const blob = await generateDocxTemplate(docContent)
        const arrayBuffer = await blob.arrayBuffer()
        const zip = await JSZip.loadAsync(arrayBuffer)
        const documentXml = await zip.file("word/document.xml").async("string")
        expect(documentXml).toContain('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"')
    })
})
