import type {Node} from "prosemirror-model"
import type {EditorView, NodeView} from "prosemirror-view"

import {AddButton} from "./add_button.js"
import type {
    AddButtonLike,
    ContributorsPartOptions,
    GetPos,
    PartNodeAttrs
} from "../../types.js"

export class ContributorsPartView implements NodeView {
    node: Node
    view: EditorView
    getPos: GetPos
    options: ContributorsPartOptions
    idTypes: string[]
    dom: HTMLElement
    contentDOM: HTMLElement
    addButton?: AddButtonLike

    constructor(
        node: Node,
        view: EditorView,
        getPos: GetPos,
        options: ContributorsPartOptions = {}
    ) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.idTypes =
            (view.state?.doc?.attrs?.id_types as string[] | undefined) || []
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${(this.node.attrs as PartNodeAttrs).id}`)
        if ((this.node.attrs as PartNodeAttrs).hidden) {
            this.dom.dataset.hidden = "true"
        }

        this.contentDOM = document.createElement("span")
        this.contentDOM.classList.add("contributors-inner")
        this.contentDOM.contentEditable =
            (this.node.attrs as PartNodeAttrs).locking !== "fixed" ? "true" : "false"
        this.dom.appendChild(this.contentDOM)
        if ((this.node.attrs as PartNodeAttrs).locking !== "fixed") {
            const AddButtonClass = options.AddButton || AddButton
            this.addButton = new AddButtonClass(
                this.dom,
                () => this.getNode(),
                this.getPos,
                this.view,
                {
                    idTypes: this.idTypes,
                    onAdd: options.onAddContributor
                }
            )
            this.addButton.init()
        }

        if (
            (this.node.attrs as PartNodeAttrs).deleted &&
            options.addDeletedPartWidget
        ) {
            options.addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    stopEvent(event: Event): boolean {
        // Trap events for addButton
        if (["click", "mousedown"].includes(event.type)) {
            return false
        } else if (!this.addButton || this.node.attrs.locking === "fixed") {
            return false
        } else if (this.addButton.hasFocus() && event.type === "keydown") {
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
            // We must be in last position.
            // Activate the tag input tag editor.
            this.addButton?.focus()
        }
    }

    ignoreMutation(_record: MutationRecord | unknown): boolean {
        if (this.addButton?.hasFocus()) {
            return true
        }
        return false
    }
}
