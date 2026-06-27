/**
 * Core types shared across the @fiduswriter/document package.
 *
 * These types describe the JSON-shaped document tree that Fidus Writer stores
 * and exchanges with its importers/exporters. They intentionally mirror the
 * ProseMirror schema while staying serialisable.
 */

/** A generic JSON value. */
export type JSONValue =
    | string
    | number
    | boolean
    | null
    | JSONValue[]
    | {[key: string]: JSONValue}

/** Attributes that every Fidus node may carry. */
export interface NodeAttrs {
    [key: string]: unknown
    id?: string
    track?: Track[]
    hidden?: boolean
}

/** A tracked change entry attached to a node or mark. */
export interface Track {
    type: "insertion" | "deletion" | "block_change"
    user: number
    username: string
    date: number
    approved?: boolean
    before?: FidusNode
}

/** A Fidus document mark (inline formatting or annotation). */
export interface FidusMark {
    type: string
    attrs?: NodeAttrs
}

/** A node in the Fidus document tree. */
export interface FidusNode {
    type: string
    attrs?: NodeAttrs
    content?: FidusNode[]
    marks?: FidusMark[]
    text?: string
}

/** Top-level document settings stored on the `doc` node. */
export interface DocSettings {
    documentstyle?: string
    tracked?: boolean
    citationstyle?: string
    citationstyles?: string[]
    language?: string
    languages?: string[]
    papersize?: string
    papersizes?: string[]
    footnote_marks?: string[]
    footnote_elements?: string[]
    bibliography_header?: FidusNode
    metadata?: Record<string, JSONValue>
    [key: string]: unknown
}

/** The root Fidus document node. */
export interface FidusDoc {
    type: "doc"
    attrs?: DocSettings
    content: FidusNode[]
}

/** A fully populated document object passed to exporters. */
export interface ExportDoc {
    id: string | number
    title: string
    path?: string
    content: FidusNode
    settings: DocSettings
    comments?: Record<string, CommentData>
    version?: string
}

/** A document contributor extracted from a contributors_part node. */
export interface Contributor {
    firstname?: string
    lastname?: string
    institution?: string
    role?: string
    email?: string
    id_type?: string
    id_value?: string
    [key: string]: unknown
}

/** Metadata bundle assembled by exporters and passed to metadata handlers. */
export interface ExportMetadata {
    title: string
    authors: Contributor[]
    contributors: Contributor[]
    keywords: string[]
    language?: string
    citationStyle?: string
}

/** A user reference passed to importers. */
export interface User {
    id: number
    name?: string
    avatar?: string
    username?: string
}

/** A single comment thread. */
export interface CommentData {
    id?: number
    user: number
    username: string
    date: number
    resolved?: boolean
    comment: FidusNode[]
    answers?: Array<{
        id?: string
        user: number
        username: string
        date: number
        answer: FidusNode[]
    }>
}

/** A bibliographic database entry (format depends on the CSL engine). */
export interface BibDBEntry {
    entry_key?: string
    bib_type?: string
    fields?: Record<string, JSONValue>
    [key: string]: JSONValue | undefined
}

/** Flat map of bibliography entries keyed by internal ID. */
export type BibDBEntries = Record<string, BibDBEntry>

/** Bibliography database wrapper used by importers/exporters. */
export interface BibDB {
    db: BibDBEntries
    getDB?: () => Promise<void>
}

/** An entry in the image database. */
export interface ImageDBEntry {
    id: number
    title?: string
    file_type?: string
    image?: string | ArrayBuffer | Blob
    copyright?: Record<string, JSONValue>
    [key: string]: unknown
}

/** Flat map of image entries keyed by internal ID. */
export type ImageDBEntries = Record<string, ImageDBEntry>

/** Image database wrapper used by importers/exporters. */
export interface ImageDB {
    db: ImageDBEntries
}

/** A parsed CSL/CSL-M stylesheet node. */
export interface CSLStyleNode {
    name: string
    attrs?: Record<string, unknown>
    children?: CSLStyleNode[]
}

/** A parsed CSL/CSL-M stylesheet. */
export interface CSLStyle {
    children: CSLStyleNode[]
}

/** A CSL/CSL-M stylesheet reference / engine provider. */
export interface CSL {
    citationType?: string
    getStyle?: (styleId: string) => Promise<CSLStyle>
    getEngine?: (
        sys: unknown,
        styleId: string,
        lang: string
    ) => Promise<CiteprocInstance>
    getEngineSync?: (
        sys: unknown,
        styleId: string,
        lang: string
    ) => CiteprocInstance | undefined
}

/** A minimal citeproc-js engine interface. */
export interface CiteprocInstance {
    updateItems: (ids: string[]) => void
    appendCitationCluster: (
        citation: unknown,
        flag?: boolean
    ) => Array<[number, string]>
    makeCitationCluster: (items: unknown[]) => string
    cslXml: {dataObj: {attrs: {class: string}}}
    citation: {opt: {layout_delimiter?: string}}
    makeBibliography: () => BibliographyResult
    sys?: unknown
}

/** citeproc-js makeBibliography() result tuple. */
export interface BibliographyResult extends Array<unknown> {
    0: {
        entry_ids: string[]
        bibstart: string
        bibend: string
        entryspacing: number
        linespacing: number
        hangingindent?: boolean
        maxoffset: number
        "second-field-align"?: "margin" | "flush"
    }
    1: string[]
}

/** Common constructor options for exporters. */
export interface ExporterOptions {
    doc: ExportDoc
    templateUrl?: string
    bibDB?: BibDB
    imageDB?: ImageDB
    csl?: CSL
}

/** JSON representation of a DOM node used by the native exporter. */
export interface NativeDomNode {
    t?: string
    co?: string
    nn?: string
    a?: Array<[string, string]>
    c?: NativeDomNode[]
}

/** A document template extracted from document content. */
export interface Template {
    content: FidusNode
    exportTemplates: Array<Record<string, JSONValue>>
    documentStyles: Array<Record<string, JSONValue>>
    files?: Array<{filename: string; content: Blob | ArrayBuffer | string}>
}

/** Files bundled with a document template. */
export interface TemplateFiles {
    textFiles: Array<{filename: string; contents: string}>
    httpFiles: Array<{url: string; filename: string}>
}

/** Backend callbacks used by the generic NativeImporter. */
export interface NativeImporterBackend {
    createDoc: (
        template: Template,
        importId: string | number | null,
        requestedPath: string,
        e2eeOptions: E2EEOptions | null,
        files: Record<string, File[]>
    ) => Promise<{id: number; path: string; e2ee?: boolean}>
    saveImages: (
        images: ImageDB,
        docId: number,
        e2eeOptions: E2EEOptions | null
    ) => Promise<Record<number | string, number>>
    saveDocument: (
        saveData: Record<string, unknown>,
        e2eeOptions: E2EEOptions | null
    ) => Promise<{added: number; updated: number}>
    extractTemplate?: (doc: FidusNode) => Template
    decryptBufferToBase64?: (base64: string, key: CryptoKey) => Promise<string>
    encryptImage?: (file: Blob, key: CryptoKey) => Promise<Blob>
    encryptObject?: (obj: unknown, key: CryptoKey) => Promise<unknown>
    encrypt?: (text: string, key: CryptoKey) => Promise<unknown>
    storeKeyInSession?: (docId: number, key: CryptoKey) => void
}

/** E2EE options used during import/export/copy. */
export interface E2EEOptions {
    enabled?: boolean
    key?: CryptoKey
    sourceKey?: CryptoKey
    targetE2EE?: boolean
    targetPassword?: string
    salt?: string
    iterations?: number
}

/** Callback that uploads a native revision blob. */
export type UploadRevision = (blob: Blob, doc: Record<string, unknown>) => unknown

/** E2EE helper object used by SaveCopy. */
export interface SaveCopyE2EE {
    decryptObject: (encrypted: unknown, key: CryptoKey) => Promise<unknown>
    encryptObject: (obj: unknown, key: CryptoKey) => Promise<unknown>
    encrypt: (text: string, key: CryptoKey) => Promise<unknown>
    encryptImage: (file: Blob, key: CryptoKey) => Promise<Blob>
    generateSalt: () => Uint8Array
    deriveKey: (password: string, salt: Uint8Array, iterations: number) => Promise<CryptoKey>
}

/** Callback used by SaveCopy to import a copied document. */
export type ImportDocument = (
    doc: Record<string, unknown>,
    bibDB: BibDB,
    imageDB: ImageDB,
    httpIncludes: Array<{url: string; filename: string}>,
    options: Record<string, unknown>
) => Promise<{doc: Record<string, unknown>; docInfo: Record<string, unknown>}>
