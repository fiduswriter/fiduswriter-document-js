import {DOMParser, DOMSerializer, Schema} from "prosemirror-model"

import {cslBibSpec} from "bibliojson"
import {FormatCitations, CitationInfo} from "../../citations/format.js"
import {fnSchema} from "../../schema/footnotes.js"

const cslBibSchema = new Schema(cslBibSpec)
import type {BibDB, CSL, ExportDoc, FidusNode} from "../../types.js"
import {descendantNodes} from "../tools/doc_content.js"

export class PandocExporterCitations {
    exporter: {doc: ExportDoc}
    bibDB: BibDB
    csl: CSL
    docContent: FidusNode
    origCitInfos: Record<string, unknown>[]
    citInfos: Record<string, unknown>[]
    citationTexts: string[]
    pmCits: FidusNode[]
    citFm: FormatCitations | false
    pmBib: FidusNode | false

    constructor(exporter: {doc: ExportDoc}, bibDB: BibDB, csl: CSL, docContent: FidusNode, origCitInfos: Record<string, unknown>[] = []) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.csl = csl
        this.docContent = docContent
        // If citInfos were found in a previous run, they are stored here
        // (for example: first citations in main document, then in footnotes)
        this.origCitInfos = origCitInfos
        this.citInfos = []
        this.citationTexts = []
        this.pmCits = []
        this.citFm = false
        this.pmBib = false
    }

    init(): Promise<void> {
        return this.formatCitations()
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations(): Promise<void> {
        if (this.origCitInfos.length) {
            // Initial citInfos are taken from a previous run to include in
            // bibliography, and they are removed before spitting out the
            // citation entries for the given document.
            // That way the bibliography should contain information from both.
            this.citInfos = this.citInfos.concat(this.origCitInfos)
        }
        descendantNodes(this.docContent).forEach(node => {
            if (node.type === "citation" && node.attrs) {
                this.citInfos.push(JSON.parse(JSON.stringify(node.attrs)))
            }
        })
        const citFm = new FormatCitations(
            this.csl,
            this.citInfos as unknown as CitationInfo[],
            this.exporter.doc.settings.citationstyle || "",
            "",
            this.bibDB,
            false,
            this.exporter.doc.settings.language
        )
        this.citFm = citFm
        return (citFm.init() as Promise<void>).then(() => {
            this.citationTexts = citFm.citationTexts
            if (this.origCitInfos.length) {
                // Remove all citation texts originating from original starting citInfos
                this.citationTexts.splice(0, this.origCitInfos.length)
            }
            this.convertCitations()
            return Promise.resolve()
        })
    }

    convertCitations(): void {
        if (!this.citFm) {
            return
        }
        // There could be some formatting in the citations, so we parse them through the PM schema for final formatting.
        // We need to put the citations each in a paragraph so that it works with
        // the fiduswriter schema and so that the converter doesn't mash them together.
        if (this.citationTexts.length) {
            let citationsHTML = ""
            this.citationTexts.forEach(ct => {
                citationsHTML += `<p>${ct}</p>`
            })

            // We create a standard footnote container DOM node,
            // add the citations into it, and parse it back.
            const fnNode = fnSchema.nodeFromJSON({type: "footnotecontainer"})
            const serializer = DOMSerializer.fromSchema(fnSchema)
            const dom = serializer.serializeNode(fnNode)
            ;(dom as HTMLElement).innerHTML = citationsHTML
            this.pmCits = DOMParser.fromSchema(fnSchema)
                .parse(dom, {topNode: fnNode})
                .toJSON().content as FidusNode[]
        } else {
            this.pmCits = []
        }

        // Now we do the same for the bibliography.
        const cslBib = this.citFm!.bibliography
        if (cslBib && cslBib[1].length > 0) {
            const bibNode = cslBibSchema.nodeFromJSON({type: "cslbib"})
            const serializer = DOMSerializer.fromSchema(cslBibSchema)
            const dom = serializer.serializeNode(bibNode)
            ;(dom as HTMLElement).innerHTML = cslBib[1].join("")
            this.pmBib = DOMParser.fromSchema(cslBibSchema)
                .parse(dom, {topNode: bibNode})
                .toJSON() as FidusNode
        }
    }
}
