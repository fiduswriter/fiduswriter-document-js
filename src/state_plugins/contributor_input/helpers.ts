import {GapCursor} from "prosemirror-gapcursor"
import {TextSelection} from "prosemirror-state"
import type {EditorState, Selection} from "prosemirror-state"
import type {ResolvedPos} from "prosemirror-model"

export const nextSelection = (
    state: EditorState,
    pos: number,
    dir: number
): Selection | undefined => {
    let newSelection: Selection | undefined
    let newPos = pos
    let $newPos

    while (!newSelection) {
        newPos += dir
        if (newPos === 0 || newPos === state.doc.nodeSize) {
            // Could not find any valid position
            break
        }
        $newPos = state.doc.resolve(newPos)
        if ($newPos.parent.inlineContent) {
            newSelection = new TextSelection($newPos)
        } else if (
            (GapCursor as unknown as {valid($pos: ResolvedPos): boolean}).valid(
                $newPos
            )
        ) {
            newSelection = new GapCursor($newPos)
        }
    }

    return newSelection
}
