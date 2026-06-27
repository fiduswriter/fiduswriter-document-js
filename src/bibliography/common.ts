import type {MarkSpec, NodeSpec} from "prosemirror-model"

export const text: NodeSpec = {
    group: "inline"
}

export const literal: NodeSpec = {
    content: "inline*",
    marks: "_",
    parseDOM: [{tag: "div.literal"}],
    toDOM() {
        return [
            "div",
            {
                class: "literal"
            },
            0
        ]
    }
}

export const variable: NodeSpec = {
    inline: true,
    group: "inline",
    attrs: {
        variable: {default: ""}
    },
    parseDOM: [
        {
            tag: "span[data-variable]",
            getAttrs(dom) {
                const element = dom as Element
                return {
                    variable: element.getAttribute("data-variable")
                }
            }
        }
    ],
    toDOM(node) {
        return [
            "span",
            {"data-variable": node.attrs.variable as string},
            node.attrs.variable as string
        ]
    }
}

export const sup: MarkSpec = {
    parseDOM: [
        {tag: "sup"},
        {style: "vertical-align", getAttrs: value => value == "super" && null}
    ],
    toDOM() {
        return ["sup"]
    }
}

export const sub: MarkSpec = {
    parseDOM: [
        {tag: "sub"},
        {style: "vertical-align", getAttrs: value => value == "sub" && null}
    ],
    toDOM() {
        return ["sub"]
    }
}

export const smallcaps: MarkSpec = {
    parseDOM: [
        {tag: "span.smallcaps"},
        {
            style: "font-variant",
            getAttrs: value => value == "small-caps" && null
        }
    ],
    toDOM() {
        return ["span", {class: "smallcaps"}]
    }
}

// Currently unsupported

export const url: MarkSpec = {
    parseDOM: [{tag: "span.url"}],
    toDOM() {
        return ["span", {class: "url"}]
    }
}

export const enquote: MarkSpec = {
    parseDOM: [{tag: "span.enquote"}],
    toDOM() {
        return ["span", {class: "enquote"}]
    }
}
