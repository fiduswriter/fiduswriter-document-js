import {docSchema} from "../../dist/schema/document/index.js"

const nodesEl = document.getElementById("nodes")!
const marksEl = document.getElementById("marks")!

document.getElementById("top-node")!.textContent = docSchema.topNodeType.name

function renderSpec(name: string, spec: Record<string, unknown>): string {
    const parts: string[] = []
    if (spec.group) {
        parts.push(`group: ${spec.group}`)
    }
    if (spec.content) {
        parts.push(`content: ${spec.content}`)
    }
    if (spec.inline) {
        parts.push("inline")
    }
    if (spec.atom) {
        parts.push("atom")
    }
    if (spec.selectable) {
        parts.push("selectable")
    }
    if (spec.draggable) {
        parts.push("draggable")
    }
    if (spec.defining) {
        parts.push("defining")
    }
    if (spec.isolating) {
        parts.push("isolating")
    }
    if (spec.attrs && Object.keys(spec.attrs as object).length > 0) {
        parts.push(`attrs: ${Object.keys(spec.attrs as object).join(", ")}`)
    }
    return parts.length ? parts.join(" · ") : "no extra spec"
}

docSchema.nodes.forEach((type, name) => {
    const item = document.createElement("div")
    item.className = "schema-item"
    item.innerHTML = `<code>${name}</code><p>${renderSpec(
        name,
        type.spec as Record<string, unknown>
    )}</p>`
    nodesEl.appendChild(item)
})

docSchema.marks.forEach((type, name) => {
    const item = document.createElement("div")
    item.className = "schema-item"
    item.innerHTML = `<code>${name}</code><p>${renderSpec(
        name,
        type.spec as Record<string, unknown>
    )}</p>`
    marksEl.appendChild(item)
})
