import {addAlert, gettext} from "fwtoolkit"

import {docSchema} from "../../schema/document/index.js"
import {toMiniJSON} from "../../schema/mini_json.js"
import type {BibDB, FidusNode, ImageDB} from "../../types.js"

interface ShrinkDoc {
    content: FidusNode
    [key: string]: unknown
}

interface ShrinkResult {
    doc: Record<string, unknown>
    shrunkImageDB: Record<string, Record<string, unknown>>
    shrunkBibDB: Record<string, Record<string, unknown>>
    httpIncludes: Array<{url: string; filename: string}>
}

// Generate a copy of the fidus doc, imageDB and bibDB with all clutter removed.
export class ShrinkFidus {
    doc: ShrinkDoc
    imageDB: ImageDB
    bibDB: BibDB
    silent: boolean
    imageList: (number | string)[]
    citeList: (number | string)[]

    /**
     * @param doc      - Full document object.
     * @param imageDB  - Image database wrapper, e.g. {db: {...}}.
     * @param bibDB    - Bibliography database wrapper, e.g. {db: {...}}.
     * @param silent   - When true, suppresses the
     *   "File export has been initiated" info alert.  Pass true when
     *   shrinking multiple documents in a loop (e.g. one per book chapter)
     *   and the caller already shows its own progress notification.
     */
    constructor(doc: ShrinkDoc, imageDB: ImageDB, bibDB: BibDB, silent = false) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.silent = silent
        this.imageList = []
        this.citeList = []
    }

    init(): Promise<ShrinkResult> {
        const shrunkImageDB: Record<string, Record<string, unknown>> = {},
            httpIncludes: Array<{url: string; filename: string}> = []

        if (!this.silent) {
            addAlert("info", gettext("File export has been initiated."))
        }

        this.walkTree(this.doc.content)

        this.imageList = [...new Set(this.imageList)] // unique values

        this.imageList.forEach(itemId => {
            const key = String(itemId)
            shrunkImageDB[key] = Object.assign(
                {},
                this.imageDB.db[key]
            ) as Record<string, unknown>
            // Remove parts that are connected to a particular user/server
            delete shrunkImageDB[key].cats
            delete shrunkImageDB[key].thumbnail
            delete shrunkImageDB[key].pk
            delete shrunkImageDB[key].added
            const imageUrl = shrunkImageDB[key].image as string
            let filename: string
            if (imageUrl.startsWith("blob:")) {
                // Blob URL produced by decrypting an E2EE image client-side.
                // The URL itself carries no useful file extension, so derive
                // one from the image entry's MIME type instead.  Without this
                // the server rejects the upload because get_encrypted_file_path
                // requires a recognised extension.
                const mime =
                    (shrunkImageDB[key].file_type as string) || "image/png"
                const mimeExtMap: Record<string, string> = {
                    "image/png": "png",
                    "image/jpeg": "jpg",
                    "image/jpg": "jpg",
                    "image/webp": "webp",
                    "image/svg+xml": "svg",
                    "image/gif": "gif",
                    "image/avif": "avif"
                }
                const ext = mimeExtMap[mime] || "png"
                filename = `images/${key}.${ext}`
            } else {
                filename = `images/${imageUrl.split("/").pop()}`
            }
            shrunkImageDB[key].image = filename
            httpIncludes.push({
                url: imageUrl,
                filename
            })
        })

        this.citeList = [...new Set(this.citeList)] // unique values

        const shrunkBibDB: Record<string, Record<string, unknown>> = {}
        this.citeList.forEach(itemId => {
            const key = String(itemId)
            shrunkBibDB[key] = Object.assign(
                {},
                this.bibDB.db[key]
            ) as Record<string, unknown>
            // Remove the cats, as it is only a list of IDs for one
            // particular user/server.
            delete shrunkBibDB[key].cats
        })

        const docCopy = Object.assign({}, this.doc)

        // Remove items that aren't needed.
        delete docCopy.rights
        delete docCopy.version
        delete docCopy.comment_version
        delete docCopy.owner
        delete docCopy.id
        delete docCopy.is_owner
        delete docCopy.added
        delete docCopy.updated
        delete docCopy.revisions

        docCopy.content = toMiniJSON(
            docSchema.nodeFromJSON(docCopy.content as unknown as Record<string, unknown>)
        ) as unknown as FidusNode

        return new Promise(resolve =>
            resolve({
                doc: docCopy,
                shrunkImageDB,
                shrunkBibDB,
                httpIncludes
            })
        )
    }

    walkTree(node: FidusNode): void {
        switch (node.type) {
            case "citation":
                this.citeList = this.citeList.concat(
                    (node.attrs?.references as Array<{id: number | string}>).map(
                        ref => ref.id
                    )
                )
                break
            case "image":
                if (node.attrs && node.attrs.image !== false) {
                    this.imageList.push(node.attrs.image as number | string)
                }
                break
            case "footnote":
                if (node.attrs?.footnote) {
                    ;(node.attrs.footnote as FidusNode[]).forEach(childNode =>
                        this.walkTree(childNode)
                    )
                }
                break
        }
        if (node.content) {
            node.content.forEach(childNode => this.walkTree(childNode))
        }
    }
}
