import type {Node} from "prosemirror-model"
import type {EditorView, NodeView} from "prosemirror-view"

import {createTagEditor} from "./tag_editor.js"
import type {GetPos, PartNodeAttrs, TagsPartOptions} from "../../types.js"

export class TagsPartView implements NodeView {
    node: Node
    view: EditorView
    getPos: GetPos
    options: TagsPartOptions
    dom: HTMLElement
    contentDOM: HTMLElement
    tagInputView?: EditorView

    constructor(
        node: Node,
        view: EditorView,
        getPos: GetPos,
        options: TagsPartOptions = {}
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${(this.node.attrs as PartNodeAttrs).id}`)
        if ((this.node.attrs as PartNodeAttrs).hidden) {
            this.dom.dataset.hidden = "true"
        }

        this.contentDOM = document.createElement("span")
        this.contentDOM.classList.add("tags-inner")
        this.contentDOM.contentEditable =
            (this.node.attrs as PartNodeAttrs).locking !== "fixed" ? "true" : "false"
        this.dom.appendChild(this.contentDOM)
        if ((this.node.attrs as PartNodeAttrs).locking !== "fixed") {
            const createTagEditorFn =
                options.createTagEditor || createTagEditor
            const [tagInputDOM, tagInputView] = createTagEditorFn(
                view,
                getPos,
                () => this.getNode()
            )
            this.tagInputView = tagInputView
            this.dom.appendChild(tagInputDOM)
        }

        if (
            (this.node.attrs as PartNodeAttrs).deleted &&
            options.addDeletedPartWidget
        ) {
            options.addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    stopEvent(event: Event): boolean {
        // Trap events for tagInputView
        if (["click", "mousedown"].includes(event.type)) {
            return false
        } else if (!this.tagInputView || this.node.attrs.locking === "fixed") {
            return false
        } else if (event.type === "keydown" && this.tagInputView.hasFocus()) {
            return true
        } else {
            return false
        }
    }

    update(
        node: Node,
        _decorations?: readonly unknown[],
        _innerDecorations?: unknown
    ): boolean {
        this.node = node
        if ((this.node.attrs as PartNodeAttrs).hidden) {
            this.dom.dataset.hidden = "true"
        } else {
            delete this.dom.dataset.hidden
        }
        return true
    }

    getNode(): Node {
        return this.node
    }

    setSelection(anchor: number, head: number, _root?: Document | ShadowRoot): void {
        if (anchor === head && this.view.hasFocus()) {
            // Check if we should prevent refocusing (e.g., user just clicked on a tag)
            const shouldPreventTagInputFocus =
                this.options.shouldPreventTagInputFocus || (() => false)
            if (shouldPreventTagInputFocus()) {
                return
            }
            // We must be in last position.
            // Activate the tag input tag editor.
            this.tagInputView?.focus()
        }
    }

    ignoreMutation(_record: MutationRecord | unknown): boolean {
        if (this.tagInputView?.hasFocus()) {
            return true
        }
        return false
    }
}
