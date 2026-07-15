import download from "downloadjs"

import {gettext, shortFileTitle} from "fwtoolkit"
import type {BibDB, CSL, ExportDoc, ExportMetadata, Contributor, FidusNode, ImageDB} from "../../types.js"
import type {ProgressCallback} from "../tools/progress.js"
import {fixTables, removeHidden, textContent} from "../tools/doc_content.js"
import {createSlug} from "../tools/file.js"
import type {XmlZip} from "../tools/xml_zip.js"
import {XmlZip as XmlZipImpl} from "../tools/xml_zip.js"
import {DOCXExporterCitations} from "./citations.js"
import {DOCXExporterComments} from "./comments.js"
import {DOCXExporterFootnotes} from "./footnotes.js"
import {DOCXExporterImages} from "./images.js"
import {DOCXExporterLists} from "./lists.js"
import {DOCXExporterMath} from "./math.js"
import {DOCXExporterMetadata} from "./metadata.js"
import {DOCXExporterRels} from "./rels.js"
import {DOCXExporterRender} from "./render.js"
import {DOCXExporterRichtext} from "./richtext.js"
import {DOCXExporterTables} from "./tables.js"
import {moveFootnoteComments} from "./tools.js"

/*
Exporter to Office Open XML docx (Microsoft Word)
*/

/*
TODO:
* - Remove comments
* - Export document language
* - Templating of tag/contributor output
*/

export class DOCXExporter {
    doc: ExportDoc
    templateUrl: string
    bibDB: BibDB
    imageDB: ImageDB
    csl: CSL
    templateBlob?: Blob

    docTitle: string
    mimeType: string
    docContent: FidusNode
    progressCallback?: ProgressCallback

    constructor(
        doc: ExportDoc,
        templateUrl: string,
        bibDB: BibDB,
        imageDB: ImageDB,
        csl: CSL,
        templateBlob?: Blob,
        progressCallback?: ProgressCallback
    ) {
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl
        this.templateBlob = templateBlob
        this.progressCallback = progressCallback

        this.docTitle = shortFileTitle(this.doc.title, this.doc.path || "")
        this.mimeType =
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        this.docContent = moveFootnoteComments(
            fixTables(removeHidden(this.doc.content) as FidusNode)
        )
    }

    init(): Promise<void> {
        this.progressCallback?.(gettext("Exporting to DOCX..."), 0)
        const xml: XmlZip = new XmlZipImpl(this.templateUrl, this.mimeType, this.templateBlob)

        const tables = new DOCXExporterTables(xml)
        const math = new DOCXExporterMath(xml)
        const render = new DOCXExporterRender(xml)
        const rels = new DOCXExporterRels(xml, "document")
        const metadata = new DOCXExporterMetadata(
            xml,
            this.getBaseMetadata(),
            this.csl
        )

        const images = new DOCXExporterImages(
            this.docContent,
            this.imageDB,
            xml,
            rels
        )
        const lists = new DOCXExporterLists(this.docContent, xml, rels)
        const citations = new DOCXExporterCitations(
            this.docContent,
            this.doc.settings,
            this.bibDB,
            this.csl,
            xml
        )

        const footnotes = new DOCXExporterFootnotes(
            this.doc,
            this.docContent,
            this.doc.settings,
            this.imageDB,
            this.bibDB,
            xml,
            citations,
            this.csl,
            lists,
            math,
            tables,
            rels
        )

        const richtext = new DOCXExporterRichtext(
            this.doc,
            this.doc.settings,
            lists,
            footnotes,
            math,
            tables,
            rels,
            citations,
            images
        )

        const comments = new DOCXExporterComments(
            this.docContent,
            this.doc.comments || {},
            xml,
            rels,
            richtext
        )

        return xml
            .init()
            .then(() => citations.init())
            .then(() => metadata.init())
            .then(() => tables.init())
            .then(() => math.init())
            .then(() => render.init())
            .then(() => rels.init())
            .then(() => {
                this.progressCallback?.(gettext("Rendering document..."), 50)
                return images.init()
            })
            .then(() => comments.init())
            .then(() => lists.init())
            .then(() => footnotes.init())
            .then(() => {
                const pmBib = footnotes.pmBib || citations.pmBib
                render.render(
                    this.docContent,
                    pmBib,
                    this.doc.settings,
                    richtext,
                    citations
                )
                return xml.prepareBlob()
            })
            .then(blob => {
                this.progressCallback?.(gettext("Export to DOCX complete."), 100)
                return this.download(blob)
            })
    }

    download(blob: Blob): void | Promise<void> {
        return download(
            blob,
            createSlug(this.docTitle) + ".docx",
            this.mimeType
        )
    }

    getBaseMetadata(): ExportMetadata {
        const contributors = (this.docContent.content || []).reduce(
            (contributors: Contributor[], part: FidusNode) => {
                if (
                    part.type === "contributors_part" &&
                    part.attrs?.metadata &&
                    part.content
                ) {
                    return contributors.concat(
                        part.content.map(node => ({
                            ...(node.attrs || {}),
                            role: part.attrs?.metadata
                        })) as Contributor[]
                    )
                } else {
                    return contributors
                }
            },
            []
        )
        return {
            authors: contributors.filter((c: Contributor) => c.role === "authors"),
            contributors,
            keywords: (this.docContent.content || []).reduce(
                (keywords: string[], part: FidusNode) => {
                    if (
                        part.type === "tags_part" &&
                        part.attrs?.metadata === "keywords" &&
                        part.content
                    ) {
                        return keywords.concat(
                            part.content.map(keywordNode =>
                                String(keywordNode.attrs?.tag)
                            )
                        )
                    } else {
                        return keywords
                    }
                },
                []
            ),
            title: textContent(this.docContent.content?.[0] || {type: "paragraph"}),
            language: this.doc.settings.language,
            citationStyle: this.doc.settings.citationstyle
        }
    }
}
