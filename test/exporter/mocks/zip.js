import JSZip from "jszip"
import {get} from "fwtoolkit"

export class ZipFileCreator {
    constructor(
        textFiles = [],
        binaryFiles = [],
        zipFiles = [],
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
        const zipFs = new JSZip()
        if (this.mimeType !== "application/zip") {
            zipFs.file("mimetype", this.mimeType, {compression: "STORE"})
        }
        this.textFiles.forEach(textFile => {
            zipFs.file(textFile.filename, textFile.contents, {
                compression: "DEFLATE"
            })
        })
        const binaryPromises = this.binaryFiles.map(binaryFile =>
            binaryFile.blob
                ? Promise.resolve(binaryFile)
                : get(binaryFile.url).then(response =>
                      response.blob().then(blob => ({...binaryFile, blob}))
                  )
        )
        return Promise.all(binaryPromises).then(binaryFiles => {
            binaryFiles.forEach(binaryFile => {
                zipFs.file(binaryFile.filename, binaryFile.blob, {
                    binary: true,
                    compression: "DEFLATE"
                })
            })
            return zipFs.generateAsync({type: "blob", mimeType: this.mimeType})
        })
    }

    convertDataURIToBlob(_dataURI) {
        return new Blob()
    }
}

export default {ZipFileCreator}
