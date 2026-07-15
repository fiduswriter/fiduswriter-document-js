import {DOMParser, DOMSerializer} from "prosemirror-model"

import {cslBibSchema} from "@fiduswriter/bibliography-manager/schema/csl_bib"
import {FormatCitations} from "../../citations/format.js"
import {fnSchema} from "../../schema/footnotes.js"
import type {BibDB, CSL, DocSettings, FidusNode} from "../../types.js"
import type {CitationInfo} from "../../citations/format.js"
import {descendantNodes} from "../tools/doc_content.js"
import type {XMLElement} from "../tools/xml.js"
import type {XmlZip} from "../tools/xml_zip.js"

export class DOCXExporterCitations {
    docContent: FidusNode
    settings: DocSettings
    bibDB: BibDB
    csl: CSL
    xml: XmlZip
    origCitInfos: CitationInfo[]

    citInfos: CitationInfo[]
    citationTexts: string[]
    pmCits: FidusNode[]
    citFm: FormatCitations | false
    pmBib: FidusNode | false
    styleXML: XMLElement | null
    styleFilePath: string

    constructor(docContent: FidusNode, settings: DocSettings, bibDB: BibDB, csl: CSL, xml: XmlZip, origCitInfos: CitationInfo[] = []) {
        this.docContent = docContent
        this.settings = settings
        this.bibDB = bibDB
        this.csl = csl
        this.xml = xml
        this.origCitInfos = origCitInfos

        this.citInfos = []
        this.citationTexts = []
        this.pmCits = []
        this.citFm = false
        this.pmBib = false
        this.styleXML = null
        this.styleFilePath = "word/styles.xml"
    }

    init(): Promise<void> {
        return this.xml
            .getXml(this.styleFilePath)
            .then(styleXML => {
                this.styleXML = styleXML
                return Promise.resolve()
            })
            .then(() => this.formatCitations())
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations(): Promise<void> {
        if (this.origCitInfos.length) {
            // Initial citInfos are taken from a previous run to include in bibliography,
            // and they are removed before spitting out the citation entries for the given document.
            // That way the bibliography should contain information from both.
            this.citInfos = this.citInfos.concat(this.origCitInfos)
        }

        descendantNodes(this.docContent).forEach(node => {
            if (node.type === "citation" && node.attrs) {
                this.citInfos.push(JSON.parse(JSON.stringify(node.attrs)) as CitationInfo)
            }
        })
        const citFm = new FormatCitations(
            this.csl,
            this.citInfos,
            this.settings.citationstyle || "",
            "",
            this.bibDB,
            false,
            this.settings.language
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
        let citationsHTML = ""
        this.citationTexts.forEach(ct => {
            citationsHTML += `<p>${ct}</p>`
        })

        if (citationsHTML.length) {
            // We create a standard body footnotecontainer node, add the citations into it, and parse it back.
            const fnNode = fnSchema.nodeFromJSON({type: "footnotecontainer"})

            const serializer = DOMSerializer.fromSchema(fnSchema)
            const dom = serializer.serializeNode(fnNode)
            ;(dom as HTMLElement).innerHTML = citationsHTML
            this.pmCits = DOMParser.fromSchema(fnSchema)
                .parse(dom, {topNode: fnNode})
                .toJSON().content as FidusNode[]
        }

        // Now we do the same for the bibliography.
        const cslBib = this.citFm!.bibliography
        if (cslBib && cslBib[1].length > 0) {
            this.addReferenceStyle(cslBib[0])
            const bibNode = cslBibSchema.nodeFromJSON({type: "cslbib"})
            const cslSerializer = DOMSerializer.fromSchema(cslBibSchema)
            const dom = cslSerializer.serializeNode(bibNode)
            ;(dom as HTMLElement).innerHTML = cslBib[1].join("")
            this.pmBib = DOMParser.fromSchema(cslBibSchema)
                .parse(dom, {topNode: bibNode})
                .toJSON() as FidusNode
        }
    }

    addReferenceStyle(bibInfo: {
        linespacing: number
        entryspacing: number
        hangingindent?: boolean
        maxoffset: number
        "second-field-align"?: "margin" | "flush"
    }): void {
        const stylesEl = this.styleXML!.query("w:styles")
        if (
            !this.styleXML!.query("w:style", {
                "w:styleId": "BibliographyHeading"
            })
        ) {
            // There is no style definition for the bibliography heading. We have to add it.
            const headingStyleDef = `
                <w:style w:type="paragraph" w:styleId="BibliographyHeading">
                    <w:name w:val="Bibliography Heading"/>
                    <w:basedOn w:val="Heading"/>
                    <w:pPr>
                        <w:suppressLineNumbers/>
                        <w:ind w:left="0" w:hanging="0"/>
                    </w:pPr>
                    <w:rPr>
                        <w:b/>
                        <w:bCs/>
                        <w:sz w:val="32"/>
                        <w:szCs w:val="32"/>
                    </w:rPr>
                </w:style>`
            stylesEl?.appendXML(headingStyleDef)
        }
        // The style called "Bibliography" will override any previous style
        // of the same name.
        const stylesParStyle = this.styleXML!.query("w:style", {
            "w:styleId": "Bibliography"
        })
        if (stylesParStyle) {
            stylesParStyle.parentElement!.removeChild(stylesParStyle)
        }

        const lineHeight = 240 * bibInfo.linespacing
        const marginBottom = 240 * bibInfo.entryspacing
        let marginLeft = 0,
            hangingIndent = 0,
            tabStops = ""

        if (bibInfo.hangingindent) {
            marginLeft = 720
            hangingIndent = 720
        } else if (bibInfo["second-field-align"]) {
            // We calculate 120 as roughly equivalent to one letter width.
            const firstFieldWidth = (bibInfo.maxoffset + 1) * 120
            if (bibInfo["second-field-align"] === "margin") {
                hangingIndent = firstFieldWidth
                tabStops =
                    '<w:tabs><w:tab w:val="left" w:pos="0" w:leader="none"/></w:tabs>'
            } else {
                hangingIndent = firstFieldWidth
                marginLeft = firstFieldWidth
                tabStops = `<w:tabs><w:tab w:val="left" w:pos="${firstFieldWidth}" w:leader="none"/></w:tabs>`
            }
        }
        const styleDef = `
            <w:style w:type="paragraph" w:styleId="Bibliography">
                <w:name w:val="Bibliography"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    ${tabStops}
                    <w:spacing w:lineRule="atLeast" w:line="${lineHeight}" w:before="0" w:after="${marginBottom}"/>
                    <w:ind w:left="${marginLeft}" w:hanging="${hangingIndent}"/>
                </w:pPr>
                <w:rPr></w:rPr>
            </w:style>`

        stylesEl?.appendXML(styleDef)
    }
}
