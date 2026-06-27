import {jatsBib} from "../../dist/exporter/jats/bibliography.js"

interface CSLName {
    family?: string
    given?: string
}

function parseAuthors(text: string): CSLName[] {
    return text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            const parts = line.split(",").map(part => part.trim())
            return {
                family: parts[0] || "",
                given: parts.slice(1).join(", ") || ""
            }
        })
}

function update() {
    const type = (document.getElementById("ref-type") as HTMLSelectElement)
        .value
    const title = (document.getElementById("ref-title") as HTMLInputElement)
        .value
    const container = (
        document.getElementById("ref-container") as HTMLInputElement
    ).value
    const authors = parseAuthors(
        (document.getElementById("ref-authors") as HTMLTextAreaElement).value
    )
    const year = (document.getElementById("ref-year") as HTMLInputElement)
        .value
    const volume = (document.getElementById("ref-volume") as HTMLInputElement)
        .value
    const issue = (document.getElementById("ref-issue") as HTMLInputElement)
        .value
    const pages = (document.getElementById("ref-pages") as HTMLInputElement)
        .value

    const bib: Record<string, unknown> = {type, title, author: authors}
    if (container) {
        bib["container-title"] = container
    }
    if (year) {
        bib.issued = {"date-parts": [[Number.parseInt(year) || year]]}
    }
    if (volume) {
        bib.volume = volume
    }
    if (issue) {
        bib.issue = issue
    }
    if (pages) {
        bib.page = pages
    }

    const output = jatsBib(bib as any, 1)
    document.getElementById("output")!.textContent = output
}

document.getElementById("generate")!.addEventListener("click", update)
update()
