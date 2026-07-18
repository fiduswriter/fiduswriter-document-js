import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {Schema} from "prosemirror-model"
import {EditorState, NodeSelection, TextSelection} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import type {Node, NodeSpec} from "prosemirror-model"
import type {Command, Transaction} from "prosemirror-state"

import {nextSelection, submitTag} from "./helpers.js"
import {pastePlugin, placeholderPlugin} from "./tag_editor_plugins.js"
import type {CreateTagEditor, GetNode, GetPos, TagInputRefs} from "../../types.js"

// WeakMap to store tag input references for access from the plugin
export const tagInputReferences = new WeakMap<HTMLElement, TagInputRefs>()

const doc: NodeSpec = {content: "tag"},
    tag: NodeSpec = {
        content: "inline*",
        parseDOM: [{tag: "div.tag-input-editor"}],
        toDOM() {
            return [
                "div",
                {
                    class: "tag-input-editor"
                },
                0
            ]
        }
    },
    text: NodeSpec = {group: "inline"}

const schema = new Schema({
    nodes: {doc, tag, text},
    marks: {}
})

const ArrowLeft = (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    getNode: GetNode,
    view: EditorView,
    getPos: GetPos
): boolean => {
    // If we're at the leftmost position (position 1), stopEvent will handle moving out of the tag
    if (state.selection.to > 1) {
        // Inside the tag input, move caret left normally
        const tr = state.tr.setSelection(
            TextSelection.create(
                state.doc,
                state.selection.from - 1,
                state.selection.to - 1
            )
        )
        dispatch(tr)
        return true
    } else {
        const node = getNode()
        // Exit tag input to the left
        if (node.nodeSize > 2) {
            // At least one tag
            const startPos = (getPos() as number) + node.nodeSize - 2
            view.dispatch(
                view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, startPos)
                )
            )
            view.focus()
            return true
        } else {
            // There is no tag
            return ArrowUp(state, dispatch, getNode, view, getPos)
        }
    }
}

const ArrowUp = (
    _state: EditorState,
    _dispatch: (tr: Transaction) => void,
    _getNode: GetNode,
    view: EditorView,
    getPos: GetPos
): boolean => {
    // We jump to the section before this one.
    const startPos = getPos() as number

    const newSelection = nextSelection(view.state, startPos, -1)

    if (!newSelection) {
        return false
    }

    view.dispatch(view.state.tr.setSelection(newSelection))
    view.focus()
    return true
}

const ArrowRight = (
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    getNode: GetNode,
    view: EditorView,
    getPos: GetPos
): boolean => {
    const docSize = state.doc.nodeSize - 3
    // If we're at the rightmost position, stopEvent will handle moving out of the tag
    if (state.selection.from < docSize) {
        // Inside the tag input, move caret right normally
        const tr = state.tr.setSelection(
            TextSelection.create(
                state.doc,
                state.selection.from + 1,
                state.selection.from + 1
            )
        )
        dispatch(tr)
        return true
    } else {
        return ArrowDown(state, dispatch, getNode, view, getPos)
    }
}

const ArrowDown = (
    _state: EditorState,
    _dispatch: (tr: Transaction) => void,
    getNode: GetNode,
    view: EditorView,
    getPos: GetPos
): boolean => {
    // We are at the end of the tag input. Move the cursor beyond
    const node = getNode()
    const startPos = getPos() as number,
        pos = startPos + node.nodeSize + 1

    const newSelection = nextSelection(view.state, pos, 1)

    if (!newSelection) {
        return false
    }

    view.dispatch(view.state.tr.setSelection(newSelection))
    view.focus()
    return true
}

export const createTagEditor: CreateTagEditor = (view, getPos, getNode) => {
    const dom = document.createElement("div")
    dom.classList.add("tag-input")
    dom.setAttribute("contenteditable", "false")
    const node = getNode()

    const tagInputView = new EditorView(dom, {
        state: EditorState.create({
            schema,
            doc: schema.nodeFromJSON({
                type: "doc",
                content: [
                    {
                        type: "tag",
                        content: []
                    }
                ]
            }),
            plugins: [
                history(),
                placeholderPlugin((node.attrs as {item_title: string}).item_title),
                pastePlugin(view),
                keymap({
                    "Mod-z": undo,
                    "Mod-shift-z": undo,
                    "Mod-y": redo,
                    Enter: ((
                        _state: EditorState,
                        _dispatch: (tr: Transaction) => void,
                        tagInputView: EditorView
                    ) =>
                        submitTag(
                            tagInputView,
                            view,
                            getPos
                        )) as unknown as Command,
                    ArrowLeft: ((state, dispatch, _tagInputView) =>
                        ArrowLeft(
                            state,
                            dispatch as (tr: Transaction) => void,
                            getNode,
                            view,
                            getPos
                        )) as Command,
                    ArrowRight: ((state, dispatch, _tagInputView) =>
                        ArrowRight(
                            state,
                            dispatch as (tr: Transaction) => void,
                            getNode,
                            view,
                            getPos
                        )) as Command,
                    ArrowUp: ((state, dispatch, _tagInputView) =>
                        ArrowUp(
                            state,
                            dispatch as (tr: Transaction) => void,
                            getNode,
                            view,
                            getPos
                        )) as Command,
                    ArrowDown: ((state, dispatch, _tagInputView) =>
                        ArrowDown(
                            state,
                            dispatch as (tr: Transaction) => void,
                            getNode,
                            view,
                            getPos
                        )) as Command
                })
            ]
        }),
        handleDOMEvents: {
            blur: (tagInputView, event) => {
                // Handle blur event
                event.preventDefault()
                // Set a timeout so that change of focus can take place first
                window.setTimeout(() => {
                    // Check if getPos still returns a valid position
                    const pos = getPos()
                    if (pos !== undefined && pos !== null) {
                        submitTag(tagInputView, view, getPos)
                    }
                }, 1)
            },
            focus: (tagInputView, _event) => {
                const startPos = getPos() as number,
                    pos =
                        startPos +
                        (view.state.doc.nodeAt(startPos) as Node).nodeSize -
                        1,
                    $pos = view.state.doc.resolve(pos)
                view.dispatch(
                    view.state.tr.setSelection(new TextSelection($pos))
                )
                tagInputView.focus()
            }
        },
        handleTextInput: (_view, _from, _to, text): boolean | void => {
            if ([",", ".", ";"].includes(text)) {
                submitTag(tagInputView, view, getPos)
                return true
            }
        },
        dispatchTransaction: tr => {
            const newState = tagInputView.state.apply(tr)
            tagInputView.updateState(newState)
        }
    })

    // Store references in WeakMap for access from the plugin
    tagInputReferences.set(dom, {
        tagInputView,
        mainView: view,
        getPos
    })

    return [dom, tagInputView]
}
