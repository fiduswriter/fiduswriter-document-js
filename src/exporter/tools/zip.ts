import {convertDataURIToBlob as convertDataURIToBlobFn, get} from "fwtoolkit"

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === "function") {
        return blob.arrayBuffer()
    }
    return Promise.reject(new Error("Cannot convert blob to ArrayBuffer"))
}

export interface ZipTextFile {
    filename: string
    contents: string
}

export interface ZipBinaryFile {
    url: string
    filename: string
    blob?: Blob
}

export interface ZipIncludeFile {
    url: string
    directory: string
    blob?: Blob
}

/** Creates a zip file.
 * @function zipFileCreator
 * @param textFiles A list of files in plain text format.
 * @param binaryFiles A list fo files that have to be downloaded from the internet before being included.
 * @param includeZips A list of zip files to be merged into the output zip file.
 * @param mimeType The mimetype of the file that is to be created.
 */

export class ZipFileCreator {
    textFiles: ZipTextFile[]
    binaryFiles: ZipBinaryFile[]
    zipFiles: ZipIncludeFile[]
    mimeType: string
    date: Date
    zipFs: any

    constructor(
        textFiles: ZipTextFile[] = [],
        binaryFiles: ZipBinaryFile[] = [],
        zipFiles: ZipIncludeFile[] = [],
        mimeType = "application/zip",
        date = new Date()
    ) {
        this.textFiles = textFiles
        this.binaryFiles = binaryFiles
        this.zipFiles = zipFiles
        this.mimeType = mimeType
        this.date = date
    }

    init() {
        return import("jszip").then(({default: JSZip}) => {
            ;(JSZip as any).defaults.date = this.date
            this.zipFs = new JSZip()
            if (this.mimeType !== "application/zip") {
                this.zipFs.file("mimetype", this.mimeType, {
                    compression: "STORE"
                })
            }

            return this.includeZips()
        })
    }

    includeZips() {
        const getZipBlobs = this.zipFiles.map(zipFile => {
            if (zipFile.blob) {
                return blobToArrayBuffer(zipFile.blob).then(ab => (zipFile.blob = new Blob([ab])))
            }
            return get(zipFile.url)
                .then(response => response.blob())
                .then(blob => (zipFile.blob = blob))
        })
        return Promise.all(getZipBlobs)
            .then(() => {
                return this.zipFiles.map(zipFile => {
                    const zipDir =
                        zipFile.directory === ""
                            ? this.zipFs
                            : this.zipFs.folder(zipFile.directory)
                    if (zipFile.blob && typeof zipFile.blob.arrayBuffer === "function") {
                        return zipFile.blob.arrayBuffer().then(ab => zipDir.loadAsync(ab))
                    }
                    return zipDir.loadAsync(zipFile.blob)
                })
            })
            .then(() => this.createZip())
    }

    createZip() {
        this.textFiles.forEach(textFile => {
            this.zipFs.file(textFile.filename, textFile.contents, {
                compression: "DEFLATE"
            })
        })
        const blobPromises = this.binaryFiles.map(binaryFile => {
            if (binaryFile.blob) {
                return blobToArrayBuffer(binaryFile.blob).then(ab =>
                    Promise.resolve({data: ab, filename: binaryFile.filename})
                )
            }
            return get(binaryFile.url)
                .then(response => response.blob())
                .then(blob =>
                    Promise.resolve({blob, filename: binaryFile.filename})
                )
        })
        return Promise.all(blobPromises).then(promises => {
            promises.forEach(promise => {
                const data = "data" in promise ? promise.data : promise.blob
                this.zipFs.file(promise.filename, data, {
                    binary: true,
                    compression: "DEFLATE"
                })
            })
            return this.zipFs.generateAsync({
                type: "blob",
                mimeType: this.mimeType
            })
        })
    }

    // Legacy - remove in 3.12. Can be sued directly from function in common/blob.js
    convertDataURIToBlob(dataURI: string): Blob {
        return convertDataURIToBlobFn(dataURI)
    }
}
