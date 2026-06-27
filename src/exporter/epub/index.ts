import pretty from "pretty"

import {HTMLExporter} from "../html/index.js"
import type {BibDB, CSL, ExportDoc, ImageDB} from "../../types.js"

import {
    containerTemplate,
    navTemplate,
    ncxTemplate,
    opfTemplate
} from "./templates.js"
import {
    buildHierarchy,
    getFontMimeType,
    getImageMimeType,
    getTimestamp
} from "./tools.js"

export class EpubExporter extends HTMLExporter {
    documentFileName: string
    lang: string
    shortLang: string

    constructor(
        doc: ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        csl: CSL,
        updated: any,
        documentStyles: Array<{
            slug: string
            contents: string
            documentstylefile_set: Array<[string, string]>
        }>
    ) {
        super(doc, bibDB, imageDB, csl, updated, documentStyles, {
            xhtml: true,
            epub: true
        })
        // Overriden properties
        this.documentFileName = "document.xhtml"
        this.fileEnding = "epub"
        this.mimeType = "application/epub+zip"
        this.lang = doc.settings.language || "en-US"
        this.shortLang = this.lang.split("-")[0]
    }

    createZip(): Promise<void> {
        this.prefixFiles()
        this.createEPUBFiles()
        return super.createZip()
    }

    prefixFiles(): void {
        // prefix all files with "EPUB/"
        this.textFiles = this.textFiles.map(file =>
            Object.assign({}, file, {filename: `EPUB/${file.filename}`})
        )
        this.httpFiles = this.httpFiles.map(file =>
            Object.assign({}, file, {filename: `EPUB/${file.filename}`})
        )
        this.includeZips = this.includeZips.map(file =>
            Object.assign({}, file, {directory: `EPUB/${file.directory}`})
        )
    }

    createEPUBFiles(): void {
        // Generate the required EPUB-specific files using the converted content
        this.textFiles.push(
            {
                filename: "META-INF/container.xml",
                contents: pretty(containerTemplate(), {ocd: true})
            },
            {
                filename: "EPUB/document.opf",
                contents: pretty(this.createOPF(), {ocd: true})
            },
            {
                filename: "EPUB/document.ncx",
                contents: pretty(this.createNCX(), {ocd: true})
            },
            {
                filename: "EPUB/document-nav.xhtml",
                contents: pretty(this.createNav(), {ocd: true})
            }
        )
    }

    createOPF(): string {
        const timestamp = getTimestamp(this.updated)
        const images = this.httpFiles
            .map(file =>
                Object.assign({mimeType: getImageMimeType(file.filename)}, file)
            )
            .filter(image => image.mimeType) as Array<
            {filename: string; url: string; mimeType: string}
        >

        const fontFiles = this.httpFiles
            .map(file =>
                Object.assign({mimeType: getFontMimeType(file.filename)}, file)
            )
            .filter(file => file.mimeType) as Array<
            {filename: string; url: string; mimeType: string}
        >

        const styleSheets = this.textFiles.filter(file =>
            file.filename.endsWith(".css")
        )

        // Extract authors and keywords from metaData
        const rawAuthors = this.converter.metaData.authors.map(
            ({attrs: author}: any) => {
                if (author.firstname || author.lastname) {
                    const nameParts: string[] = []
                    if (author.firstname) {
                        nameParts.push(author.firstname)
                    }
                    if (author.lastname) {
                        nameParts.push(author.lastname)
                    }
                    return nameParts.join(" ")
                } else if (author.institution) {
                    return author.institution
                }
            }
        )
        const authors = rawAuthors.filter(
            (author: any): author is string => typeof author === "string"
        )
        return opfTemplate({
            language: this.lang,
            title: this.docTitle,
            authors,
            keywords: this.converter.metaData.keywords,
            idType: "fidus",
            id: String(this.doc.id),
            date: timestamp.slice(0, 10),
            modified: timestamp,
            styleSheets,
            math: this.converter.features.math,
            images,
            fontFiles,
            copyright: this.doc.settings.copyright as
                | {holder?: string; year?: number}
                | undefined
        })
    }

    createNCX(): string {
        return ncxTemplate({
            shortLang: this.shortLang,
            title: this.docTitle,
            idType: "fidus",
            id: String(this.doc.id),
            toc: buildHierarchy(this.converter.metaData.toc)
        })
    }

    createNav(): string {
        const styleSheets = this.textFiles.filter(file =>
            file.filename.endsWith(".css")
        )
        return navTemplate({
            shortLang: this.shortLang,
            toc: buildHierarchy(this.converter.metaData.toc),
            styleSheets
        })
    }
}
