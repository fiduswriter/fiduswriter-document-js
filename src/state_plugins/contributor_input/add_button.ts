import {keyName} from "w3c-keyname"

import {NodeSelection} from "prosemirror-state"
import type {Node} from "prosemirror-model"
import type {EditorView} from "prosemirror-view"

import {nextSelection} from "./helpers.js"
import type {AddButtonOptions, GetNode, GetPos} from "../../types.js"

export class AddButton {
    dom: HTMLElement
    getNode: GetNode
    getPos: GetPos
    view: EditorView
    idTypes: string[]
    onAdd: (node: Node, view: EditorView, idTypes: string[]) => void
    button: HTMLElement | null

    constructor(
        dom: HTMLElement,
        getNode: GetNode,
        getPos: GetPos,
        view: EditorView,
        options: AddButtonOptions = {}
    ) {
        this.dom = dom
        this.getNode = getNode
        this.getPos = getPos
        this.view = view

        this.idTypes = options.idTypes || []
        this.onAdd = options.onAdd || (() => {})

        this.button = null
    }

    init(): void {
        const node = this.getNode()
        const nodeTitle = (node.attrs as {item_title: string}).item_title
        this.dom.insertAdjacentHTML(
            "beforeend",
            `<button class="fw-button fw-light">${gettext("Add")} ${nodeTitle.toLowerCase()}...</button>`
        )
        this.button = this.dom.lastElementChild as HTMLElement
        this.button.addEventListener("click", event =>
            this.handleActivation(event)
        )
        this.button.addEventListener("keydown", event =>
            this.handleKeyDown(event)
        )
    }

    handleKeyDown(event: KeyboardEvent): void {
        const key = keyName(event)
        switch (key) {
            case "Enter":
            case " ":
                this.handleActivation(event)
                break
            case "ArrowRight":
            case "ArrowDown":
                if (this.handleArrowDown()) {
                    event.preventDefault()
                }
                break
            case "ArrowLeft":
                if (this.handleArrowLeft()) {
                    event.preventDefault()
                }
                break
            case "ArrowUp":
                if (this.handleArrowUp()) {
                    event.preventDefault()
                }
                break
            default:
                break
        }
    }

    handleActivation(event: Event): void {
        event.preventDefault()
        this.onAdd(this.getNode(), this.view, this.idTypes)
    }

    handleArrowLeft(): boolean {
        const node = this.getNode()
        if (node.nodeSize > 2) {
            // At least one contributor
            const startPos = (this.getPos() as number) + node.nodeSize - 2
            this.view.dispatch(
                this.view.state.tr.setSelection(
                    NodeSelection.create(this.view.state.doc, startPos)
                )
            )
            this.view.focus()
            return true
        } else {
            // There is no tag
            return this.handleArrowUp()
        }
    }

    handleArrowUp(): boolean {
        // We jump to the section before this one.
        const startPos = this.getPos() as number

        const newSelection = nextSelection(this.view.state, startPos, -1)

        if (!newSelection) {
            return false
        }

        this.view.dispatch(this.view.state.tr.setSelection(newSelection))
        this.view.focus()
        return true
    }

    handleArrowDown(): boolean {
        // Move the cursor beyond the contributors part
        const node = this.getNode()
        const pos = (this.getPos() as number) + node.nodeSize + 1

        const newSelection = nextSelection(this.view.state, pos, 1)

        if (!newSelection) {
            return false
        }

        this.view.dispatch(this.view.state.tr.setSelection(newSelection))
        this.view.focus()
        return true
    }

    hasFocus(): boolean {
        return this.button === window.document.activeElement
    }

    focus(): void {
        if (this.button) {
            this.button.focus()
        }
    }
}
