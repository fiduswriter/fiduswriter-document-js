import {beforeAll, describe, expect, it} from "@jest/globals"

import {DOCXExporterCitations} from "../../src/exporter/docx/citations.js"
import {ODTExporterCitations} from "../../src/exporter/odt/citations.js"

describe("Citation ordering with footnotes", () => {
    let mockCsl, mockBibDB, mockSettings, mockStyles

    beforeAll(() => {
        mockCsl = {
            getEngine: () =>
                Promise.resolve({
                    cslXml: {dataObj: {attrs: {class: "in-text"}}},
                    updateItems: () => {},
                    appendCitationCluster: citation => {
                        const index = citation.properties.noteIndex - 1
                        return [[index, `(Citation ${index})`]]
                    },
                    makeCitationCluster: () => "",
                    makeBibliography: () => false
                })
        }
        mockBibDB = {}
        mockSettings = {citationstyle: "apa", language: "en-US"}
        mockStyles = {addReferenceStyle: () => {}}
    })

    it("splices citInfos parallel to citationTexts for ODT footnote citations", async () => {
        const docContent = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {type: "citation", attrs: {references: [{id: 1}]}},
                        {type: "citation", attrs: {references: [{id: 2}]}}
                    ]
                },
                {
                    type: "footnote",
                    attrs: {
                        footnote: [
                            {type: "citation", attrs: {references: [{id: 3}]}}
                        ]
                    }
                }
            ]
        }

        const bodyCitations = new ODTExporterCitations(
            docContent,
            mockSettings,
            mockStyles,
            mockBibDB,
            mockCsl
        )
        bodyCitations.convertCitations = () => {}
        await bodyCitations.init()

        expect(bodyCitations.citInfos.map(c => c.references[0].id)).toEqual([
            1, 2
        ])
        expect(bodyCitations.citationTexts.length).toBe(2)

        const footnoteDocContent = {
            type: "doc",
            content: [
                {
                    type: "footnotecontainer",
                    content: [
                        {type: "citation", attrs: {references: [{id: 3}]}}
                    ]
                }
            ]
        }

        const fnCitations = new ODTExporterCitations(
            footnoteDocContent,
            mockSettings,
            mockStyles,
            mockBibDB,
            mockCsl,
            bodyCitations.citInfos
        )
        fnCitations.convertCitations = () => {}
        await fnCitations.init()

        expect(fnCitations.citInfos.map(c => c.references[0].id)).toEqual([3])
        expect(fnCitations.citationTexts.length).toBe(1)
        expect(fnCitations.citInfos.length).toBe(
            fnCitations.citationTexts.length
        )
    })

    it("splices citInfos parallel to citationTexts for DOCX footnote citations", async () => {
        const docContent = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [
                        {type: "citation", attrs: {references: [{id: 1}]}},
                        {type: "citation", attrs: {references: [{id: 2}]}}
                    ]
                },
                {
                    type: "footnote",
                    attrs: {
                        footnote: [
                            {type: "citation", attrs: {references: [{id: 3}]}}
                        ]
                    }
                }
            ]
        }

        const mockXml = {
            getXml: () =>
                Promise.resolve({
                    query: () => null
                })
        }

        const bodyCitations = new DOCXExporterCitations(
            docContent,
            mockSettings,
            mockBibDB,
            mockCsl,
            mockXml
        )
        bodyCitations.convertCitations = () => {}
        await bodyCitations.init()

        expect(bodyCitations.citInfos.map(c => c.references[0].id)).toEqual([
            1, 2
        ])
        expect(bodyCitations.citationTexts.length).toBe(2)

        const footnoteDocContent = {
            type: "doc",
            content: [
                {
                    type: "footnotecontainer",
                    content: [
                        {type: "citation", attrs: {references: [{id: 3}]}}
                    ]
                }
            ]
        }

        const fnCitations = new DOCXExporterCitations(
            footnoteDocContent,
            mockSettings,
            mockBibDB,
            mockCsl,
            mockXml,
            bodyCitations.citInfos
        )
        fnCitations.convertCitations = () => {}
        await fnCitations.init()

        expect(fnCitations.citInfos.map(c => c.references[0].id)).toEqual([3])
        expect(fnCitations.citationTexts.length).toBe(1)
        expect(fnCitations.citInfos.length).toBe(
            fnCitations.citationTexts.length
        )
    })
})
