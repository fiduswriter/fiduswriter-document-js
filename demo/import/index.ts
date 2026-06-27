import JSZip from "jszip"

const dropzone = document.getElementById("dropzone")!
const fileInput = document.getElementById("file-input") as HTMLInputElement
const result = document.getElementById("result")!

async function readFile(file: File) {
    const zip = await JSZip.loadAsync(file)
    const files = ["document.json", "bibliography.json", "images.json"]
    const parts: string[] = []
    for (const name of files) {
        const entry = zip.file(name)
        if (!entry) {
            continue
        }
        const text = await entry.async("string")
        const preview = text.length > 2000 ? text.slice(0, 2000) + "\n…" : text
        parts.push(`<h2>${name}</h2><pre class="demo-output">${escapeHtml(
            preview
        )}</pre>`)
    }
    if (parts.length === 0) {
        result.innerHTML =
            '<p class="demo-output">No Fidus JSON files found in this archive.</p>'
        return
    }
    result.innerHTML = parts.join("")
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

dropzone.addEventListener("click", () => fileInput.click())
dropzone.addEventListener("dragover", event => {
    event.preventDefault()
    dropzone.classList.add("dragover")
})
dropzone.addEventListener("dragleave", () =>
    dropzone.classList.remove("dragover")
)
dropzone.addEventListener("drop", event => {
    event.preventDefault()
    dropzone.classList.remove("dragover")
    const file = event.dataTransfer?.files[0]
    if (file) {
        readFile(file)
    }
})
fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0]
    if (file) {
        readFile(file)
    }
})
