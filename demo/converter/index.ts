import JSZip from "jszip"

import {JATSExporter} from "../../dist/exporter/jats/index.js"
import {HTMLExporter} from "../../dist/exporter/html/index.js"
import {LatexExporter} from "../../dist/exporter/latex/index.js"
import {PandocExporter} from "../../dist/exporter/pandoc/index.js"
import {EpubExporter} from "../../dist/exporter/epub/index.js"

import sampleDoc from "../sample-doc.json"

const docJsonEl = document.getElementById("doc-json") as HTMLTextAreaElement
docJsonEl.value = JSON.stringify(sampleDoc, null, 2)

const logEl = document.getElementById("log")!

function getDoc() {
    return JSON.parse(docJsonEl.value)
}

function log(msg: string) {
    logEl.textContent = msg
}

const emptyBibDB = {db: {}}
const emptyImageDB = {db: {}}
const nullCSL = {
    getStyle: () => Promise.resolve(null)
}

document.getElementById("export-jats")!.addEventListener("click", () => {
    const exporter = new JATSExporter(
        getDoc(),
        emptyBibDB,
        emptyImageDB,
        nullCSL,
        new Date(),
        "article"
    )
    exporter.init().then(() => log("JATS export downloaded."))
})

document.getElementById("export-html")!.addEventListener("click", () => {
    const exporter = new HTMLExporter(
        getDoc(),
        emptyBibDB,
        emptyImageDB,
        nullCSL,
        new Date(),
        []
    )
    exporter.init().then(() => log("HTML export downloaded."))
})

document.getElementById("export-latex")!.addEventListener("click", () => {
    const exporter = new LatexExporter(
        getDoc(),
        emptyBibDB,
        emptyImageDB,
        new Date()
    )
    exporter.init().then(() => log("LaTeX export downloaded."))
})

document.getElementById("export-pandoc")!.addEventListener("click", () => {
    const exporter = new PandocExporter(
        getDoc(),
        emptyBibDB,
        emptyImageDB,
        nullCSL,
        new Date()
    )
    exporter.init().then(() => log("Pandoc JSON export downloaded."))
})

document.getElementById("export-epub")!.addEventListener("click", () => {
    const exporter = new EpubExporter(
        getDoc(),
        emptyBibDB,
        emptyImageDB,
        nullCSL,
        new Date(),
        []
    )
    exporter.init().then(() => log("EPUB export downloaded."))
})

document.getElementById("export-native")!.addEventListener("click", () => {
    const doc = getDoc()
    const zip = new JSZip()
    zip.file("document.json", JSON.stringify(doc))
    zip.file("bibliography.json", "{}")
    zip.file("images.json", "{}")
    zip.generateAsync({type: "blob"}).then(blob => {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = "document.fidus"
        a.click()
        log("Native Fidus export downloaded.")
    })
})
