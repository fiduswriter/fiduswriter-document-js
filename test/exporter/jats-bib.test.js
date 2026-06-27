import {beforeAll, describe, expect, it, jest} from "@jest/globals"

jest.unstable_mockModule("fwtoolkit", () => ({
    escapeText: str =>
        String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
}))

const {jatsBib} = await import("../../src/exporter/jats/bibliography.js")

describe("jatsBib", () => {
    it("renders a journal article with plain-text authors and title", () => {
        const bib = {
            bib_type: "article-journal",
            fields: {
                title: "My title",
                journaltitle: "My journal",
                author: [
                    {family: "Doe", given: "John"},
                    {family: "Smith", given: "Jane"}
                ],
                date: "2012",
                volume: "7",
                issue: "3",
                pages: [["1", "10"]]
            }
        }
        const xml = jatsBib(bib, 1)
        expect(xml).toContain("My title")
        expect(xml).toContain("My journal")
        expect(xml).toContain("Doe")
        expect(xml).toContain("John")
        expect(xml).toContain("Smith")
        expect(xml).toContain("Jane")
        expect(xml).toContain('<ref id="ref-1">')
    })

    it("renders a string literal author", () => {
        const bib = {
            bib_type: "book",
            fields: {
                title: "A book",
                author: [{literal: "Acme Corporation"}]
            }
        }
        const xml = jatsBib(bib, 2)
        expect(xml).toContain("A book")
        expect(xml).toContain("Acme Corporation")
    })

    it("handles missing fields gracefully", () => {
        const bib = {
            bib_type: "misc",
            fields: {}
        }
        const xml = jatsBib(bib, 3)
        expect(xml).toContain('<ref id="ref-3">')
    })
})
