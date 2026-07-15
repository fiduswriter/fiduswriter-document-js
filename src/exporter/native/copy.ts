import {gettext, longFilePath} from "fwtoolkit"

import {ShrinkFidus} from "./shrink.js"
import type {ShrinkDoc} from "./shrink.js"

import type {
    BibDB,
    BibDBEntries,
    E2EEOptions,
    FidusNode,
    ImageDB,
    ImageDBEntries,
    ImportDocument,
    JSONValue,
    SaveCopyE2EE,
    User
} from "../../types.js"
import type {ProgressCallback} from "./shrink.js"

interface SaveCopyOptions {
    importId?: string | number | null
    e2eeOptions?: E2EEOptions | null
    e2ee?: SaveCopyE2EE
    importDocument: ImportDocument
    progressCallback?: ProgressCallback
}

export class SaveCopy {
    doc: Record<string, unknown>
    bibDB: BibDB
    imageDB: ImageDB
    newUser: User
    importId: string | number | null
    e2eeOptions: E2EEOptions | null
    e2ee?: SaveCopyE2EE
    importDocument: ImportDocument
    progressCallback?: ProgressCallback

    constructor(
        doc: Record<string, unknown>,
        bibDB: BibDB,
        imageDB: ImageDB,
        newUser: User,
        options: SaveCopyOptions
    ) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.newUser = newUser
        this.importId = options.importId ?? null
        this.e2eeOptions = options.e2eeOptions ?? null
        this.e2ee = options.e2ee
        this.importDocument = options.importDocument
        this.progressCallback = options.progressCallback
    }

    private _requestedPath(): string {
        return longFilePath(
            (this.doc.title as string) || "copy",
            (this.doc.path as string) || "",
            `${gettext("Copy of")} `
        )
    }

    init(): Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}> {
        this.progressCallback?.(gettext("Creating copy..."), 0)
        let shrinkerPromise: Promise<{
            doc: Record<string, unknown>
            shrunkImageDB: Record<string, Record<string, unknown>>
            shrunkBibDB: Record<string, Record<string, unknown>>
            httpIncludes: Array<{url: string; filename: string}>
        }>
        if (this.doc.e2ee) {
            shrinkerPromise = this._decryptDocument().then(decryptedDoc => {
                const shrinker = new ShrinkFidus(
                    decryptedDoc as unknown as ShrinkDoc,
                    this.imageDB,
                    this.bibDB,
                    this.progressCallback
                )
                return shrinker.init()
            })
        } else {
            const shrinker = new ShrinkFidus(
                this.doc as unknown as ShrinkDoc,
                this.imageDB,
                this.bibDB,
                this.progressCallback
            )
            shrinkerPromise = shrinker.init()
        }
        return shrinkerPromise
            .then(({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                this.progressCallback?.(gettext("Importing copy..."), 80)
                let targetE2EEPromise: Promise<{
                    doc: Record<string, unknown>
                    e2eeOptions: E2EEOptions | null
                }>
                if (this.e2eeOptions?.targetE2EE) {
                    targetE2EEPromise = this._setupTargetE2EE(doc, shrunkImageDB)
                } else {
                    targetE2EEPromise = Promise.resolve({
                        doc,
                        e2eeOptions: null
                    })
                }
                return targetE2EEPromise.then(
                    ({doc: encryptedDoc, e2eeOptions}) => {
                        const importerE2EEOptions = e2eeOptions || {}
                        if (this.e2eeOptions?.sourceKey) {
                            ;(importerE2EEOptions as E2EEOptions).sourceKey =
                                this.e2eeOptions.sourceKey
                        }
                        return this.importDocument(
                            encryptedDoc,
                            {
                                db: shrunkBibDB as unknown as BibDBEntries
                            } as BibDB,
                            {
                                db: shrunkImageDB as unknown as ImageDBEntries
                            } as ImageDB,
                            httpIncludes,
                            {
                                user: this.newUser,
                                importId: this.importId,
                                requestedPath: this._requestedPath(),
                                e2eeOptions: importerE2EEOptions
                            }
                        ).then(result => {
                            this.progressCallback?.(
                                gettext("Copy created."),
                                100
                            )
                            return result
                        })
                    }
                )
            })
    }

    async _decryptDocument(): Promise<Record<string, unknown>> {
        const key = this.e2eeOptions?.sourceKey
        if (!key) {
            throw new Error("Missing source E2EE key for decryption")
        }
        if (!this.e2ee) {
            throw new Error("Missing E2EE helper")
        }
        const decryptedDoc = Object.assign({}, this.doc)
        if (typeof decryptedDoc.content === "string") {
            decryptedDoc.content = (await this.e2ee.decryptObject(
                decryptedDoc.content,
                key
            )) as FidusNode
        }
        if (typeof decryptedDoc.comments === "string") {
            decryptedDoc.comments = await this.e2ee.decryptObject(
                decryptedDoc.comments,
                key
            )
        }
        if (typeof decryptedDoc.bibliography === "string") {
            decryptedDoc.bibliography = await this.e2ee.decryptObject(
                decryptedDoc.bibliography,
                key
            )
        }
        if (this.bibDB && typeof this.bibDB.db === "string") {
            this.bibDB.db = decryptedDoc.bibliography as BibDBEntries
        }
        if (this.imageDB && this.imageDB.db) {
            await Promise.all(
                Object.values(this.imageDB.db).map(async imageEntry => {
                    const copyright = imageEntry.copyright as
                        | string
                        | Record<string, unknown>
                        | undefined
                    if (
                        typeof copyright === "string" &&
                        copyright.length > 0
                    ) {
                        try {
                            imageEntry.copyright =
                                (await this.e2ee!.decryptObject(
                                    copyright,
                                    key
                                )) as Record<string, JSONValue>
                        } catch (_e) {
                            // If decryption fails, leave as-is
                        }
                    }
                })
            )
        }
        return decryptedDoc
    }

    async _setupTargetE2EE(
        doc: Record<string, unknown>,
        shrunkImageDB: Record<string, Record<string, unknown>>
    ): Promise<{doc: Record<string, unknown>; e2eeOptions: E2EEOptions}> {
        const password = (this.e2eeOptions as E2EEOptions & {targetPassword?: string})
            .targetPassword
        if (!password) {
            throw new Error("Missing target E2EE password")
        }
        if (!this.e2ee) {
            throw new Error("Missing E2EE helper")
        }
        const salt = this.e2ee.generateSalt()
        const saltBase64 = btoa(String.fromCharCode(...salt))
        const iterations = 600000
        const key = await this.e2ee.deriveKey(password, salt, iterations)

        const plainDoc = Object.assign({}, doc)

        if (shrunkImageDB) {
            await Promise.all(
                Object.values(shrunkImageDB).map(async imageEntry => {
                    if (imageEntry.file) {
                        try {
                            const encryptedFile = await this.e2ee!.encryptImage(
                                imageEntry.file as Blob,
                                key
                            )
                            imageEntry.file = encryptedFile
                            imageEntry.original_file_type = imageEntry.file_type
                            imageEntry.file_type = "application/octet-stream"
                        } catch (_e) {
                            // If encryption fails, keep original file
                        }
                    }
                    if (imageEntry.copyright) {
                        try {
                            imageEntry.copyright = await this.e2ee!.encryptObject(
                                imageEntry.copyright,
                                key
                            )
                        } catch (_e) {
                            // If encryption fails, keep original
                        }
                    }
                })
            )
        }

        return {
            doc: plainDoc,
            e2eeOptions: {
                enabled: true,
                key,
                salt: saltBase64,
                iterations
            }
        }
    }
}
