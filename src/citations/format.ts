import {escapeText} from "fwtoolkit"

import type {
    BibDB,
    BibliographyResult,
    CiteprocInstance,
    CSL
} from "../types.js"
import {citeprocSys} from "./citeproc_sys.js"

export interface CitationInfo {
    format: string
    references: Array<{id: number; [key: string]: unknown}>
}

/**
 * Use CSL and bibDB to format all citations for the given ProseMirror JSON citation nodes.
 */
export class FormatCitations {
    csl: CSL
    allCitationInfos: CitationInfo[]
    citationStyle: string
    bibliographyHeader: string
    bibDB: BibDB
    synchronous: boolean
    lang: string

    bibliography: BibliographyResult | false
    citations: Array<{citationItems: unknown[]; properties: {noteIndex: number}}>
    bibFormats: string[]
    citationTexts: string[]
    citationType: string

    constructor(
        csl: CSL,
        allCitationInfos: CitationInfo[],
        citationStyle: string | object,
        bibliographyHeader: string,
        bibDB: BibDB,
        synchronous = false,
        lang = "en-US"
    ) {
        this.csl = csl
        this.allCitationInfos = allCitationInfos
        this.citationStyle = citationStyle
        this.bibliographyHeader = bibliographyHeader
        this.bibDB = bibDB
        this.synchronous = synchronous
        this.lang = lang

        this.bibliography = false
        this.citations = []
        this.bibFormats = []
        this.citationTexts = []
        this.citationType = ""
    }

    init(): boolean | Promise<void> {
        this.bibliography = false
        this.citations = []
        this.bibFormats = []
        this.citationTexts = []
        this.citationType = ""
        this.formatAllCitations()
        return this.getFormattedCitations()
    }

    formatAllCitations(): void {
        this.allCitationInfos.forEach(cInfo => {
            this.bibFormats.push(cInfo.format)
            this.citations.push({
                citationItems: cInfo.references,
                properties: {
                    noteIndex: this.bibFormats.length
                }
            })
        })
    }

    get bibHTML(): string {
        if (!this.bibliography || !this.bibliography[0].entry_ids.length) {
            return ""
        }
        const bib = this.bibliography,
            bibHTML = bib[0].bibstart + bib[1].join("") + bib[0].bibend
        return `<h1 class="doc-bibliography-header">${escapeText(this.bibliographyHeader)}</h1>${bibHTML}`
    }

    // CSS
    get bibCSS(): string {
        if (!this.bibliography || !this.bibliography[0].entry_ids.length) {
            return ""
        }
        const bibInfo = this.bibliography[0]
        let css = "\n"
        css += `.csl-entry {padding-bottom: ${bibInfo.entryspacing + 1}em;}\n`
        css += `.csl-bib-body {line-height: ${bibInfo.linespacing};}\n`
        if (bibInfo.hangingindent) {
            css += `
                    .csl-entry {
                        text-indent: -0.5in;
                        padding-left: 0.5in;
                    }\n`
        } else if (bibInfo["second-field-align"] === "margin") {
            css += `
                    .csl-left-margin {
                        text-indent: -${bibInfo.maxoffset}ch;
                        width: ${bibInfo.maxoffset}ch;
                    }
                `
        } else if (bibInfo["second-field-align"] === "flush") {
            css += `
                    .csl-left-margin {
                        width: ${bibInfo.maxoffset}ch;
                    }
                `
        }
        return css
    }

    reloadCitations(missingItems: string[]): Promise<void> {
        // Not all citations could be found in the database.
        // Reload the database if possible, but don't cycle if no new matches are found.
        if (!this.bibDB.getDB) {
            return Promise.resolve()
        }

        return this.bibDB.getDB().then(() => {
            if (missingItems.some(item => this.bibDB.db.hasOwnProperty(item))) {
                return this.init() as Promise<void>
            } else {
                return Promise.resolve()
            }
        })
    }

    getFormattedCitations(): boolean | Promise<void> {
        const citeprocConnector = new citeprocSys(this.bibDB)
        if (this.synchronous) {
            if (!this.csl.getEngineSync) {
                return false
            }
            const citeprocInstance = this.csl.getEngineSync(
                citeprocConnector,
                this.citationStyle,
                this.lang
            )
            if (!citeprocInstance) {
                return false
            }
            this.process(citeprocInstance)
            return true
        } else {
            if (!this.csl.getEngine) {
                return Promise.resolve()
            }
            return this.csl
                .getEngine(citeprocConnector, this.citationStyle, this.lang)
                .then(citeprocInstance => {
                    this.process(citeprocInstance)
                    if (citeprocConnector.missingItems.length > 0) {
                        return this.reloadCitations(
                            citeprocConnector.missingItems
                        )
                    } else {
                        return Promise.resolve()
                    }
                })
        }
    }

    process(citeprocInstance: CiteprocInstance): void {
        const allIds: string[] = []
        this.citations.forEach(cit =>
            cit.citationItems.forEach(item => allIds.push(String((item as {id: number}).id)))
        )
        citeprocInstance.updateItems(allIds)

        const inText = citeprocInstance.cslXml.dataObj.attrs.class === "in-text"
        const len = this.citations.length
        for (let i = 0; i < len; i++) {
            const citation = this.citations[i],
                citationTexts = citeprocInstance.appendCitationCluster(
                    citation,
                    true
                )
            if (inText && "textcite" == this.bibFormats[i]) {
                const items = citation.citationItems as Array<{
                    id: number
                    locator?: string
                    prefix?: string
                }>
                let newCiteText = ""

                for (let j = 0; j < items.length; j++) {
                    const onlyNameOption: Array<{
                        id: number
                        "author-only": number
                        locator?: string
                        prefix?: string
                    }> = [
                        {
                            id: items[j].id,
                            "author-only": 1
                        }
                    ]

                    const onlyDateOption: Array<{
                        id: number
                        "suppress-author": number
                        locator?: string
                        prefix?: string
                    }> = [
                        {
                            id: items[j].id,
                            "suppress-author": 1
                        }
                    ]

                    if (items[j].locator) {
                        onlyDateOption[0].locator = items[j].locator
                    }

                    if (items[j].prefix) {
                        onlyDateOption[0].prefix = items[j].prefix
                    }

                    if (0 < j) {
                        newCiteText +=
                            citeprocInstance.citation.opt.layout_delimiter ||
                            "; "
                    }
                    newCiteText += `${citeprocInstance.makeCitationCluster(onlyNameOption)} ${citeprocInstance.makeCitationCluster(onlyDateOption)}`
                }
                const target = citationTexts.find(
                    citationText => citationText[0] === i
                )
                if (target) {
                    target[1] = newCiteText
                }
            }
            citationTexts.forEach(
                ([index, citationText]) =>
                    (this.citationTexts[index] = citationText)
            )
        }
        this.citationType = citeprocInstance.cslXml.dataObj.attrs.class
        this.bibliography = citeprocInstance.makeBibliography() as BibliographyResult
    }
}
