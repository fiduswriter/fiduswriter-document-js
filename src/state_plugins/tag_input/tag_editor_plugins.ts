import {Plugin} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import type {EditorView} from "prosemirror-view"

export const placeholderPlugin = (nodeTitle: string): Plugin<null> =>
    new Plugin<null>({
        props: {
            decorations: (state): DecorationSet | undefined => {
                const doc = state.doc
                if (
                    doc.childCount === 1 &&
                    doc.firstChild?.isTextblock &&
                    doc.firstChild.content.size === 0
                ) {
                    const placeHolder = document.createElement("span")
                    placeHolder.classList.add("fw-placeholder")
                    // There is only one field, so we know the selection is there
                    placeHolder.classList.add("fw-selected")
                    placeHolder.setAttribute(
                        "data-placeholder",
                        `${gettext("Add")} ${nodeTitle.toLowerCase()}...`
                    )
                    return DecorationSet.create(doc, [
                        Decoration.widget(1, placeHolder)
                    ])
                }
                return undefined
            }
        }
    })

export const pastePlugin = (editorView: EditorView): Plugin<null> => {
    return new Plugin<null>({
        props: {
            handleDOMEvents: {
                paste(_view, event) {
                    const clipboardEvent = event as ClipboardEvent
                    const clipboardData = clipboardEvent.clipboardData as DataTransfer
                    const html = clipboardData.getData("text/html"),
                        text = clipboardData.getData("text/plain"),
                        slice = text
                            .split(/[,;.]/)
                            .map(item => item.trim())
                            .filter(item => item.length)
                    let tags: string[]
                    if (text && !html) {
                        tags = slice
                    } else {
                        // Make a paste DOM document
                        const clipboardDoc =
                            document.implementation.createHTMLDocument(
                                "paste document"
                            )
                        const pasteHTML = document.createElement("body")
                        clipboardDoc.body.appendChild(pasteHTML)
                        pasteHTML.innerHTML = html
                        tags = Array.from(
                            pasteHTML.querySelectorAll("span.tag")
                        ).map(tag => tag.textContent as string)
                    }
                    if (!tags.length) {
                        return
                    }
                    const pos = editorView.state.selection.from
                    const tr = editorView.state.tr
                    tags.reverse().forEach(tag => {
                        const node = editorView.state.schema.nodes.tag.create({
                            tag
                        })
                        tr.insert(pos, node)
                    })
                    editorView.dispatch(tr)
                    return true
                }
            }
        }
    })
}
