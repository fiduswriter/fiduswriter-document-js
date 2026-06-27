import {Schema} from "prosemirror-model"
import {marks} from "prosemirror-schema-basic"

import {smallcaps, sub, sup, text} from "./common.js"

const doc: import("prosemirror-model").NodeSpec = {content: "cslbib"}

const cslbib: import("prosemirror-model").NodeSpec = {
    content: "cslentry*",
    parseDOM: [{tag: "div.csl-bib-body"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-bib-body"
            },
            0
        ]
    }
}

const cslentry: import("prosemirror-model").NodeSpec = {
    content: "block*",
    parseDOM: [{tag: "div.csl-entry"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-entry"
            },
            0
        ]
    }
}

// This block doesn't actually appear in the HTML output, but because the schema
// system doesn't allow for the mixing of inline and block content, it "imagines"
// that this block exists. This---rather than other blocks---is chosen, because
// it's the first in the list.
const cslinline: import("prosemirror-model").NodeSpec = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: "div.csl-inline"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-inline"
            },
            0
        ]
    }
}

const cslblock: import("prosemirror-model").NodeSpec = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: "div.csl-block"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-block"
            },
            0
        ]
    }
}

const cslleftmargin: import("prosemirror-model").NodeSpec = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: "div.csl-left-margin"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-left-margin"
            },
            0
        ]
    }
}

const cslrightinline: import("prosemirror-model").NodeSpec = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: "div.csl-right-inline"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-right-inline"
            },
            0
        ]
    }
}

const cslindent: import("prosemirror-model").NodeSpec = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: "div.csl-indent"}],
    toDOM() {
        return [
            "div",
            {
                class: "csl-indent"
            },
            0
        ]
    }
}

// A schema to express the citeproc HTML bibliography output
export const cslBibSchema = new Schema({
    nodes: {
        doc,
        cslbib,
        cslentry,
        cslinline,
        cslblock,
        cslleftmargin,
        cslrightinline,
        cslindent,
        text
    },
    marks: {
        em: marks.em,
        strong: marks.strong,
        smallcaps,
        sup,
        sub
    }
})
