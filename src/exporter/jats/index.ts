import download from "downloadjs"
import pretty from "pretty"

import {shortFileTitle} from "fwtoolkit"
import type {BibDB, CSL, ExportDoc, ImageDB} from "../../types.js"
import {createSlug} from "../tools/file.js"
import {ZipFileCreator} from "../tools/zip.js"
import {JATSExporterConverter} from "./convert.js"
import {
    articleTemplate,
    bookPartWrapperTemplate,
    darManifest
} from "./templates.js"

/*
 Exporter to JATS
*/

export class JATSExporter {
    doc: ExportDoc
    docTitle: string
    bibDB: BibDB
    imageDB: ImageDB
    csl: CSL
    updated: any
    type: string

    zipFileName: string | false
    textFiles: Array<{filename: string; contents: string}>
    httpFiles: Array<{filename: string; url: string}>

    converter: any

    constructor(
        doc: ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        csl: CSL,
        updated: any,
        type: string
    ) {
        this.doc = doc
        this.docTitle = shortFileTitle(this.doc.title, this.doc.path || "")
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl
        this.updated = updated
        this.type = type // "article", "book-part-wrapper" (for documents) or "book" (for document collections)

        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
    }

    init(): Promise<void> {
        const fileFormat = this.type === "article" ? "jats" : "bits"
        this.zipFileName = `${createSlug(this.docTitle)}.${fileFormat}.zip`
        this.converter = new JATSExporterConverter(
            this.type,
            this.doc,
            this.csl,
            this.imageDB,
            this.bibDB
        )
        return this.converter
            .init()
            .then(
                ({
                    front,
                    body,
                    back,
                    imageIds
                }: {
                    front: string
                    body: string
                    back: string
                    imageIds: string[]
                }) => {
                    const jats =
                        this.type === "article"
                            ? articleTemplate({front, body, back})
                            : bookPartWrapperTemplate({front, body, back})
                    this.textFiles.push({
                        filename: "manuscript.xml",
                        contents: pretty(jats, {ocd: true})
                    })
                    const images = imageIds.map(id => {
                        const imageEntry = this.imageDB.db[id]
                        return {
                            title: imageEntry.title || "",
                            filename: imageEntry.image!.toString().split("/").pop()!,
                            url: imageEntry.image as string
                        }
                    })
                    this.textFiles.push({
                        filename: "manifest.xml",
                        contents: pretty(
                            darManifest({
                                title: this.docTitle,
                                type: this.type,
                                images
                            }),
                            {ocd: true}
                        )
                    })
                    images.forEach(image => {
                        this.httpFiles.push({
                            filename: image.filename,
                            url: image.url
                        })
                    })

                    return this.createZip()
                }
            )
    }

    createZip(): Promise<void> {
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            undefined,
            undefined,
            this.updated
        )
        return zipper.init().then(blob => this.download(blob))
    }

    download(blob: Blob): void {
        return download(blob, this.zipFileName as string, "application/zip")
    }
}
