import {escapeText} from "fwtoolkit"

import {PandocConvert} from "./convert.js"
import {NativeImporter} from "../native/importer.js"

import type {
    BibDBEntry,
    E2EEOptions,
    FidusNode,
    NativeImporterBackend,
    User
} from "../../types.js"

interface PandocImporterOptions {
    getTemplate: (importId: string | number | null) => Promise<Record<string, unknown>>
    importBibliography: (bibString: string) => Promise<Record<string, BibDBEntry>>
    nativeBackend: NativeImporterBackend
    e2eeOptions?: E2EEOptions | null
}

export class PandocImporter {
    file: Blob
    user: User
    path: string
    importId: string | number | null
    additionalFiles: Record<string, any>
    e2eeOptions: E2EEOptions | null
    getTemplate: (importId: string | number | null) => Promise<Record<string, unknown>>
    importBibliography: (bibString: string) => Promise<Record<string, BibDBEntry>>
    nativeBackend: NativeImporterBackend

    template: Record<string, unknown> | null = null
    output: {
        ok: boolean
        statusText: string
        doc: Record<string, unknown> | null
        docInfo: Record<string, unknown> | null
    } = {
        ok: false,
        statusText: "",
        doc: null,
        docInfo: null
    }
    title = "Untitled"

    constructor(
        file: Blob,
        user: User,
        path: string,
        importId: string | number | null,
        options: PandocImporterOptions
    ) {
        this.file = file
        this.user = user
        this.path = path
        this.importId = importId
        this.additionalFiles = (options as PandocImporterOptions & {files?: Record<string, any>}).files || {}
        this.e2eeOptions = options.e2eeOptions ?? null
        this.getTemplate = options.getTemplate
        this.importBibliography = options.importBibliography
        this.nativeBackend = options.nativeBackend
    }

    async init(): Promise<typeof this.output> {
        await this.getTemplate(this.importId)
            .then(template => {
                this.template = template
            })
            .catch(error => {
                this.output.statusText = error.message
            })
        if (this.output.statusText) {
            return this.output
        }
        const text = await this.file.text()
        return this.handlePandocJson(
            text,
            this.additionalFiles?.images,
            this.additionalFiles?.bibliography
        )
    }

    handlePandocJson(
        jsonString: string,
        images: Record<string, Blob> = {},
        bibString = ""
    ): Promise<typeof this.output> {
        let pandocJson
        try {
            pandocJson = JSON.parse(jsonString)
        } catch (error: any) {
            this.output.statusText = error.message
            return Promise.resolve(this.output)
        }

        return this.importBibliography(bibString)
            .then(bibliography => {
                const converter = new PandocConvert(
                    pandocJson,
                    this.importId as string,
                    this.template as {content: any},
                    bibliography
                )

                let convertedDoc
                try {
                    convertedDoc = converter.init()
                } catch (error: any) {
                    this.output.statusText = error.message
                    console.error(error)
                    return this.output
                }
                const firstText =
                    (convertedDoc.content as FidusNode).content?.[0].content?.[0]
                        .text
                if (["", "Untitled"].includes(firstText || "")) {
                    ;(
                        (convertedDoc.content as FidusNode).content![0]
                            .content![0] as any
                    ).text = this.title
                } else {
                    this.title = firstText || this.title
                }

                const nativeImporter = new NativeImporter(
                    {
                        content: convertedDoc.content,
                        title: this.title,
                        comments: {},
                        settings: convertedDoc.settings
                    },
                    bibliography,
                    converter.images as any,
                    Object.entries(images).map(([filename, blob]) => ({
                        filename,
                        content: blob
                    })),
                    this.user,
                    this.nativeBackend,
                    {
                        importId: null,
                        requestedPath: this.path + this.title,
                        template: null,
                        e2eeOptions: this.e2eeOptions
                    }
                )

                return nativeImporter
                    .init()
                    .then(({doc, docInfo}) => {
                        this.output.ok = true
                        this.output.doc = doc
                        this.output.docInfo = docInfo
                        this.output.statusText = `${escapeText(
                            doc.title as string
                        )} successfully imported.`
                        return this.output
                    })
                    .catch(error => {
                        this.output.statusText = error.message
                        console.error(error)
                        return this.output
                    })
            })
            .catch(error => {
                this.output.statusText = error.message
                console.error(error)
                return this.output
            })
    }
}
