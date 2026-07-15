import {describe, expect, it} from "@jest/globals"
import {readFileSync} from "node:fs"
import {dirname, join} from "node:path"
import {fileURLToPath} from "node:url"

import {parseCSL} from "../../src/citations/csl_xml_parser.js"

const FIXTURES_DIR = join(
    dirname(dirname(fileURLToPath(import.meta.url))),
    "fixtures",
    "csl"
)

const STYLES = ["apa", "chicago-author-date", "ieee"]

describe("parseCSL", () => {
    it("parses a minimal style", () => {
        const style = parseCSL(
            `<?xml version="1.0" encoding="utf-8"?>
            <style xmlns="http://purl.org/net/xbiblio/csl" version="1.0">
                <citation>
                    <layout prefix="(" suffix=")" delimiter="; "/>
                </citation>
            </style>`
        )
        expect(style.name).toBe("style")
        expect(style.attrs).toMatchObject({
            xmlns: "http://purl.org/net/xbiblio/csl",
            version: "1.0"
        })
        const citation = (
            style.children as Array<{
                name: string
                children: Array<{name: string; attrs: Record<string, string>}>
            }>
        ).find(child => child.name === "citation")
        expect(citation).toBeDefined()
        const layout = citation.children.find(
            child => child.name === "layout"
        )
        expect(layout.attrs).toMatchObject({
            prefix: "(",
            suffix: ")"
        })
        expect(layout.attrs.delimiter).toMatch(/^;\s*/)
    })

    it.each(STYLES)("parses %s.csl into a valid style object", name => {
        const xml = readFileSync(join(FIXTURES_DIR, `${name}.csl`), "utf8")
        const style = parseCSL(xml)
        expect(style.name).toBe("style")
        expect(style.attrs).toHaveProperty("version", "1.0")
        expect(Array.isArray(style.children)).toBe(true)
        const children = style.children as Array<{name: string}>
        expect(children.some(child => child.name === "citation")).toBe(true)
        expect(children.some(child => child.name === "bibliography")).toBe(true)
    })
})
