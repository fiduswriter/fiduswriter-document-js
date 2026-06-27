import {ShrinkFidus} from "./shrink.js"
import {ZipFidus} from "./zip.js"

import type {
    BibDB,
    ExportDoc,
    ImageDB,
    TemplateFiles,
    UploadRevision
} from "../../types.js"

export class SaveRevision {
    doc: ExportDoc
    imageDB: ImageDB
    bibDB: BibDB
    note: string
    uploadRevision: UploadRevision
    token: string | boolean
    getTemplateFiles?: (
        docId: string | number,
        token: string | boolean
    ) => Promise<TemplateFiles>
    onError?: (error: unknown) => void

    constructor(
        doc: ExportDoc,
        imageDB: ImageDB,
        bibDB: BibDB,
        note: string,
        uploadRevision: UploadRevision,
        options: {
            token?: string | boolean
            getTemplateFiles?: (
                docId: string | number,
                token: string | boolean
            ) => Promise<TemplateFiles>
            onError?: (error: unknown) => void
        } = {}
    ) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.note = note
        this.uploadRevision = uploadRevision
        this.token = options.token ?? false
        this.getTemplateFiles = options.getTemplateFiles
        this.onError = options.onError
    }

    init(): Promise<unknown> {
        const shrinker = new ShrinkFidus(this.doc as any, this.imageDB, this.bibDB)

        return shrinker
            .init()
            .then(({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                const zipper = new ZipFidus(
                    this.doc.id,
                    doc,
                    shrunkImageDB,
                    shrunkBibDB,
                    httpIncludes,
                    true,
                    this.token,
                    this.getTemplateFiles
                )
                return zipper.init()
            })
            .then(blob => this.uploadRevision(blob, this.doc as any))
            .catch(error => {
                if (this.onError) {
                    this.onError(error)
                }
                throw error
            })
    }
}
