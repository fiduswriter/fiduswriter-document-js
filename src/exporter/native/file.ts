import download from "downloadjs"
import {shortFileTitle} from "fwtoolkit"

import {ShrinkFidus} from "./shrink.js"
import {createSlug} from "../tools/file.js"
import {ZipFidus} from "./zip.js"

import type {BibDB, ExportDoc, ImageDB, TemplateFiles} from "../../types.js"

export class ExportFidusFile {
    doc: ExportDoc
    bibDB: BibDB
    imageDB: ImageDB
    includeTemplate: boolean
    token: string | boolean
    getTemplateFiles?: (
        docId: string | number,
        token: string | boolean
    ) => Promise<TemplateFiles>
    silent: boolean

    constructor(
        doc: ExportDoc,
        bibDB: BibDB,
        imageDB: ImageDB,
        includeTemplate = true,
        token: string | boolean = false,
        getTemplateFiles?: (
            docId: string | number,
            token: string | boolean
        ) => Promise<TemplateFiles>,
        silent = false
    ) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.includeTemplate = includeTemplate
        this.token = token
        this.getTemplateFiles = getTemplateFiles
        this.silent = silent
        return this.init() as unknown as ExportFidusFile
    }

    init(): Promise<Blob> {
        const shrinker = new ShrinkFidus(this.doc as any, this.imageDB, this.bibDB, this.silent)
        return shrinker
            .init()
            .then(({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                const zipper = new ZipFidus(
                    this.doc.id,
                    doc,
                    shrunkImageDB,
                    shrunkBibDB,
                    httpIncludes,
                    this.includeTemplate,
                    this.token,
                    this.getTemplateFiles
                )
                return zipper.init()
            })
            .then(blob => {
                this.download(blob)
                return blob
            })
    }

    download(blob: Blob): void | Promise<void> {
        const title: string = shortFileTitle(this.doc.title, this.doc.path || "") || "untitled"
        const filename = `${createSlug(title)}.fidus`
        return download(blob, filename, "application/fidus+zip")
    }
}
