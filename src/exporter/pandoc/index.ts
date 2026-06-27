import {BibLatexExporter} from "biblatex-csl-converter"
import download from "downloadjs"

import {shortFileTitle} from "fwtoolkit"
import type {BibDB, CSL, ExportDoc, FidusNode, ImageDB} from "../../types.js"
import {fixTables, removeHidden} from "../tools/doc_content.js"
import {createSlug} from "../tools/file.js"
import {ZipFileCreator} from "../tools/zip.js"
import {PandocExporterCitations} from "./citations.js"
import {PandocExporterConvert} from "./convert.js"
import {readMe} from "./readme.js"

/*
 Exporter to Pandoc JSON
*/

export class PandocExporter {
    doc: ExportDoc
    docTitle: string
    bibDB: BibDB
    imageDB: ImageDB
    csl: CSL
    updated: any

    docContent: any
    zipFileName: string
    textFiles: Array<{filename: string; contents: string}>
    httpFiles: Array<{filename: string; url: string}>

    constructor(
        doc: ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        csl: CSL,
        updated: any
    ) {
        this.doc = doc
        this.docTitle = shortFileTitle(this.doc.title, this.doc.path || "")
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl
        this.updated = updated

        this.docContent = false
        this.zipFileName = ""
        this.textFiles = []
        this.httpFiles = []
    }

    init(): Promise<void> {
        //this.docContent = removeHidden(this.doc.content) //
        this.docContent = fixTables(removeHidden(this.doc.content) as FidusNode)
        const citations = new PandocExporterCitations(
            this,
            this.bibDB,
            this.csl,
            this.docContent
        )
        const converter = new PandocExporterConvert(
            this,
            this.imageDB,
            this.bibDB,
            this.doc.settings
        )
        return citations.init().then(() => {
            this.conversion = converter.init(this.docContent)
            if (Object.keys(this.conversion.usedBibDB).length > 0) {
                const bibExport = new BibLatexExporter(
                    this.conversion.usedBibDB
                )
                this.textFiles.push({
                    filename: "bibliography.bib",
                    contents: bibExport.parse()
                })
            }

            this.conversion.imageIds.forEach((id: string) => {
                const imageUrl = this.imageDB.db[id].image as string
                this.httpFiles.push({
                    filename: imageUrl.split("/").pop()!,
                    url: imageUrl
                })
            })
            return this.createExport()
        })
    }

    conversion: any

    createExport(): Promise<void> {
        // Override this function if adding a conversion-through-pandoc step.
        this.textFiles.push({
            filename: "document.json",
            contents: JSON.stringify(this.conversion.json, null, 4)
        })
        this.textFiles.push({filename: "README.txt", contents: readMe})
        this.zipFileName = `${createSlug(this.docTitle)}.pandoc.json.zip`
        return this.createDownload()
    }

    createDownload(): Promise<void> {
        // This creates a ZIP file with JSON sources included and then returns a promise for the download of the file.
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            undefined,
            undefined,
            this.updated
        )

        return zipper
            .init()
            .then(blob => download(blob, this.zipFileName, "application/zip"))
    }
}
