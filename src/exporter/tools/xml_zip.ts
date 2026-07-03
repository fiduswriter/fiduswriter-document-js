import {get} from "fwtoolkit"

import {xmlDOM, XMLElement} from "./xml.js"

// Handle a zip file containing XML files. Make sure files are only opened once,
// and provide a mechanism to save the file.

export class XmlZip {
    url: string
    mimeType: string
    docs: Record<string, XMLElement>
    extraFiles: Record<string, unknown>
    rawFile: Blob | false
    zip: any
    loadedBlob: Blob | undefined

    constructor(url: string, mimeType: string, loadedBlob?: Blob) {
        this.url = url
        this.mimeType = mimeType
        this.docs = {}
        this.extraFiles = {}
        this.rawFile = false
        this.loadedBlob = loadedBlob
    }

    init() {
        return import("jszip")
            .then(({default: JSZip}) => {
                this.zip = new JSZip()
                if (this.loadedBlob) {
                    return this.blobToArrayBuffer(this.loadedBlob).then(ab => {
                        this.rawFile = new Blob([ab])
                        return this.loadZip(ab)
                    })
                }
                return this.downloadZip().then(() => this.loadZip())
            })
    }

    blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
        if (blob instanceof Blob && typeof blob.arrayBuffer === "function") {
            return blob.arrayBuffer()
        }
        if (blob instanceof ArrayBuffer) {
            return Promise.resolve(blob)
        }
        return Promise.reject(new Error("Cannot convert to ArrayBuffer"))
    }

    downloadZip() {
        return get(this.url)
            .then(response => response.blob())
            .then(blob => (this.rawFile = blob))
    }

    loadZip(data?: ArrayBuffer | Blob) {
        return this.zip.loadAsync(data || this.rawFile)
    }

    // Open file at filePath from zip file and parse it as XML.
    getXml(filePath: string, defaultContents?: string): Promise<XMLElement> {
        if (this.docs[filePath]) {
            // file has been loaded already.
            return Promise.resolve(this.docs[filePath])
        } else if (this.zip.files[filePath]) {
            return this.zip
                .file(filePath)
                .async("string")
                .then((string: string) => {
                    this.docs[filePath] = xmlDOM(string)
                    return Promise.resolve(this.docs[filePath])
                })
        } else if (defaultContents) {
            return Promise.resolve(defaultContents).then(string => {
                this.docs[filePath] = xmlDOM(string)
                return Promise.resolve(this.docs[filePath])
            })
        } else {
            // File couldn't be found and there was no default value.
            return Promise.reject(new Error("File not found"))
        }
    }

    // Add an xml file at filepath without checking for previous version
    addXmlFile(filePath: string, xmlContents: XMLElement): void {
        this.docs[filePath] = xmlContents
    }

    // Add extra file to be saved in zip later.
    addExtraFile(filePath: string, fileContents: unknown): void {
        this.extraFiles[filePath] = fileContents
    }

    // Put all currently open XML files into zip.
    allXMLToZip(): void {
        for (const fileName in this.docs) {
            this.xmlToZip(fileName)
        }
    }

    // Put all extra files into zip.
    async allExtraToZip(): Promise<void> {
        for (const fileName in this.extraFiles) {
            let contents = this.extraFiles[fileName]
            // JSZip 3.x cannot consume a Node.js Blob, so convert Blobs to
            // ArrayBuffers before adding them. Browser Blobs work with
            // ArrayBuffer as well, so this is safe everywhere.
            if (contents instanceof Blob) {
                contents = await contents.arrayBuffer()
            }
            this.zip.file(fileName, contents)
        }
    }

    // Put the xml identified by filePath into zip.
    xmlToZip(filePath: string): void {
        const string = this.docs[filePath].toString()
        this.zip.file(filePath, string)
    }

    async prepareBlob(): Promise<Blob> {
        this.allXMLToZip()
        await this.allExtraToZip()

        return this.zip.generateAsync({type: "blob", mimeType: this.mimeType})
    }
}
