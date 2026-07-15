import {CSLExporter} from "bibliojson"
import type {BibDB as BibliojsonBibDB} from "bibliojson"

import {FormatCitations} from "../../citations/format.js"
import type {CitationInfo} from "../../citations/format.js"

import type {BibDB, CSL, CSLNode, ExportDoc} from "../../types.js"
import {jatsBib} from "./bibliography.js"
import type {CSLItem} from "./bibliography.js"

interface CitationLayout {
    prefix?: string
    suffix?: string
    delimiter?: string
}

interface CSLStyleChild {
    name: string
    children?: CSLStyleChild[]
    attrs?: Record<string, unknown>
}

export class JATSExporterCitations {
    doc: ExportDoc
    bibDB: BibDB
    csl: CSL

    citationTexts: string[]
    citFm: FormatCitations | false
    jatsBib: string
    jatsIdConvert: Record<string, number>
    citInfos: Record<string, unknown>[]

    constructor(doc: ExportDoc, bibDB: BibDB, csl: CSL) {
        this.doc = doc
        this.bibDB = bibDB
        this.csl = csl

        this.citationTexts = []
        this.citFm = false
        this.jatsBib = ""
        this.jatsIdConvert = {}
        this.citInfos = []
    }

    init(citInfos: Record<string, unknown>[]): Promise<void> {
        this.citInfos = citInfos
        if (!citInfos.length) {
            return Promise.resolve()
        }
        return this.formatCitations()
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    // We disregard the styling of the bibliography and instead create our own, JATS-specific bibliography.
    formatCitations(): Promise<void> {
        if (!this.csl.getStyle) {
            return Promise.resolve()
        }
        return this.csl
            .getStyle(this.doc.settings.citationstyle || "")
            .then(citationstyle => {
                const modStyle = JSON.parse(JSON.stringify(citationstyle)) as {
                    children: CSLStyleChild[]
                }
                const citationLayout = modStyle.children
                    .find(section => section.name === "citation")!
                    .children!.find(section => section.name === "layout")!.attrs as CitationLayout
                const origCitationLayout = JSON.parse(
                    JSON.stringify(citationLayout)
                ) as CitationLayout
                citationLayout.prefix = "{{prefix}}"
                citationLayout.suffix = "{{suffix}}"
                citationLayout.delimiter = "{{delimiter}}"
                const citFm = new FormatCitations(
                    this.csl,
                    this.citInfos as unknown as CitationInfo[],
                    modStyle as unknown as CSLNode,
                    "",
                    this.bibDB,
                    false,
                    this.doc.settings.language
                )
                this.citFm = citFm
                return Promise.all([
                    Promise.resolve(origCitationLayout),
                    citFm.init() as Promise<void>
                ])
            })
            .then(([origCitationLayout]) => {
                if (!this.citFm) {
                    return Promise.resolve()
                }
                const citFm = this.citFm
                // We need to add xref-links to the bibliography items. And there may be more than one work cited
                // so we need to first split, then add the links and eventually put the citation back together
                // again.
                // The IDs used in the jats bibliography are 1 and up in this order
                const bibliography = citFm.bibliography
                if (!bibliography) {
                    return Promise.resolve()
                }
                const entryIds = bibliography[0].entry_ids.map(id => String(id))
                const cslItems = new CSLExporter(
                    this.bibDB.db as unknown as BibliojsonBibDB,
                    entryIds
                ).parse() as Record<string, Record<string, unknown>>
                bibliography[0].entry_ids.forEach((id, index) => {
                    this.jatsIdConvert[id] = index + 1
                    this.jatsBib += jatsBib(
                        (cslItems[String(id)] || {}) as CSLItem,
                        index + 1
                    )
                })
                this.citationTexts = citFm.citationTexts.map(
                    (ref, index) => {
                        const content = ref
                            .split("{{delimiter}}")
                            .map((citationText, conIndex) => {
                                const prefixSplit =
                                    citationText.split("{{prefix}}")
                                const prefix =
                                    prefixSplit.length > 1
                                        ? prefixSplit.shift()! +
                                          (origCitationLayout.prefix || "")
                                        : ""
                                citationText = prefixSplit[0]
                                const suffixSplit =
                                    citationText.split("{{suffix}}")
                                const suffix =
                                    suffixSplit.length > 1
                                        ? (origCitationLayout.suffix || "") +
                                          suffixSplit.pop()!
                                        : ""
                                citationText = suffixSplit[0]
                                const sortedItems = ((citFm.citations[index] as unknown as {sortedItems: Array<[unknown, {id: string}]>}).sortedItems)
                                const citId = sortedItems[conIndex][1].id
                                const jatsId = this.jatsIdConvert[citId]
                                return `${prefix}<xref ref-type="bibr" rid="ref-${jatsId}">${citationText}</xref>${suffix}`
                            })
                            .join(origCitationLayout.delimiter || "")
                        return content
                            .replace(/<b>/g, "<bold>")
                            .replace(/<\/b>/g, "</bold>")
                            .replace(/<i>/g, "<italic>")
                            .replace(/<\/i>/g, "</italic>")
                            .replace(
                                /<span style="font-variant:small-caps;">/g,
                                "<sc>"
                            )
                            .replace(/<\/span>/g, "</sc>")
                    }
                )
                return Promise.resolve()
            })
    }
}
