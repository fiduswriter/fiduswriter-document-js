/**
 * Minimal TypeScript shapes for the subset of Pandoc's JSON AST that the
 * Fidus Writer Pandoc exporter produces. These types are intentionally
 * permissive in nested content arrays because the same conversion function is
 * reused for both block-level and inline-level contexts.
 */

export type PandocAttr = [string, string[], [string, string][]]

export type PandocTarget = [string, string]

export interface PandocCitation {
    citationId: string
    citationPrefix: PandocElement[]
    citationSuffix: PandocElement[]
    citationMode: {t: "AuthorInText" | "NormalCitation"}
    citationNoteNum: number
    citationHash: number
}

export interface PandocStr {
    t: "Str"
    c: string
}

export interface PandocSpace {
    t: "Space"
}

export interface PandocSoftBreak {
    t: "SoftBreak"
}

export interface PandocLineBreak {
    t: "LineBreak"
}

export interface PandocEmph {
    t: "Emph"
    c: PandocElement[]
}

export interface PandocStrong {
    t: "Strong"
    c: PandocElement[]
}

export interface PandocUnderline {
    t: "Underline"
    c: PandocElement[]
}

export interface PandocSuperscript {
    t: "Superscript"
    c: PandocElement[]
}

export interface PandocSubscript {
    t: "Subscript"
    c: PandocElement[]
}

export interface PandocCode {
    t: "Code"
    c: [PandocAttr, string]
}

export interface PandocLink {
    t: "Link"
    c: [PandocAttr, PandocElement[], PandocTarget]
}

export interface PandocSpan {
    t: "Span"
    c: [PandocAttr, PandocElement[]]
}

export interface PandocMath {
    t: "Math"
    c: [{t: "InlineMath"} | {t: "DisplayMath"}, string]
}

export interface PandocNote {
    t: "Note"
    c: PandocElement[]
}

export interface PandocImage {
    t: "Image"
    c: [PandocAttr, PandocElement[], PandocTarget]
}

export interface PandocCite {
    t: "Cite"
    c: [PandocCitation[], PandocElement[]]
}

export interface PandocPara {
    t: "Para"
    c: PandocElement[]
}

export interface PandocPlain {
    t: "Plain"
    c: PandocElement[]
}

export interface PandocBlockQuote {
    t: "BlockQuote"
    c: PandocElement[]
}

export interface PandocBulletList {
    t: "BulletList"
    c: PandocElement[][]
}

export interface PandocOrderedList {
    t: "OrderedList"
    c: [
        [number, {t: "DefaultStyle"}, {t: "DefaultDelim"}],
        PandocElement[][]
    ]
}

export interface PandocCodeBlock {
    t: "CodeBlock"
    c: [PandocAttr, string]
}

export interface PandocHeader {
    t: "Header"
    c: [number, PandocAttr, PandocElement[]]
}

export interface PandocHorizontalRule {
    t: "HorizontalRule"
    c: [PandocAttr, []]
}

export interface PandocDiv {
    t: "Div"
    c: [PandocAttr, PandocElement[]]
}

export interface PandocFigure {
    t: "Figure"
    c: [PandocAttr, [null, PandocElement[]], PandocElement[]]
}

export interface PandocTable {
    t: "Table"
    c: unknown[]
}

export type PandocBlock =
    | PandocPara
    | PandocPlain
    | PandocBlockQuote
    | PandocBulletList
    | PandocOrderedList
    | PandocCodeBlock
    | PandocHeader
    | PandocHorizontalRule
    | PandocDiv
    | PandocFigure
    | PandocTable

export type PandocInline =
    | PandocStr
    | PandocSpace
    | PandocSoftBreak
    | PandocLineBreak
    | PandocEmph
    | PandocStrong
    | PandocUnderline
    | PandocSuperscript
    | PandocSubscript
    | PandocCode
    | PandocLink
    | PandocSpan
    | PandocMath
    | PandocNote
    | PandocImage
    | PandocCite

export type PandocElement = PandocBlock | PandocInline

export interface PandocMetaInlines {
    t: "MetaInlines"
    c: PandocElement[]
}

export interface PandocMetaBlocks {
    t: "MetaBlocks"
    c: PandocElement[]
}

export interface PandocMetaList {
    t: "MetaList"
    c: PandocMetaValue[]
}

export type PandocMetaValue = PandocMetaInlines | PandocMetaBlocks | PandocMetaList

export interface PandocJson {
    "pandoc-api-version": [number, number, number]
    meta: Record<string, PandocMetaValue>
    blocks: PandocElement[]
}
