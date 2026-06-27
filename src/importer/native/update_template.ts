import {updateDoc} from "../../schema/convert.js"

import type {FidusNode, JSONValue} from "../../types.js"

/**
 * Update a template definition that has been read from a fidus/template file
 * to the current document schema version.
 */
export function updateTemplateFile(
    title: string,
    content: FidusNode,
    exportTemplates: Array<Record<string, JSONValue>>,
    documentStyles: Array<Record<string, JSONValue>>,
    filetypeVersion: number
): {
    title: string
    content: FidusNode
    exportTemplates: Array<Record<string, JSONValue>>
    documentStyles: Array<Record<string, JSONValue>>
} {
    const oldDoc = {
        content,
        diffs: [],
        bibliography: {},
        comments: {},
        title,
        version: 1,
        id: 1
    }
    const doc = updateDoc(oldDoc, filetypeVersion)
    return {title, content: doc.content as FidusNode, exportTemplates, documentStyles}
}
