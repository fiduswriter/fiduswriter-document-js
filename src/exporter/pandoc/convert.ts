import type {BibDB, BibDBEntry, DocSettings, ExportDoc, FidusNode, ImageDB, NodeAttrs} from "../../types.js"
import type {CitationReference} from "../../schema/common/citation.js"
import type {PandocExporterCitations} from "./citations.js"
import {getImageDBEntryFilename} from "../tools/file.js"
import {convertContributor, convertText} from "./tools.js"
import type {
    PandocAttr,
    PandocElement,
    PandocJson,
    PandocMetaInlines,
    PandocMetaValue,
    PandocCitation
} from "./types.js"

interface ConvertOptions {
    inFootnote: boolean
    inCode: boolean
}

interface PandocExporterLike {
    citations: PandocExporterCitations
    doc: ExportDoc
}

interface PandocConversion {
    json: PandocJson
    imageIds: string[]
    usedBibDB: Record<string, BibDBEntry>
}

export class PandocExporterConvert {
    exporter: PandocExporterLike
    settings: DocSettings
    imageDB: ImageDB
    bibDB: BibDB
    imageIds: string[]
    usedBibDB: Record<string, BibDBEntry>

    internalLinks: string[]
    categoryCounter: Record<string, number>

    metaData: {toc: PandocElement[]}

    constructor(exporter: PandocExporterLike, imageDB: ImageDB, bibDB: BibDB, settings: DocSettings) {
        this.exporter = exporter
        this.settings = settings
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.imageIds = []
        this.usedBibDB = {}

        this.internalLinks = []
        this.categoryCounter = {} // counters for each type of figure (figure/table/photo)

        this.metaData = {
            toc: []
        }
    }

    init(doc: FidusNode): PandocConversion {
        this.preWalkJson(doc)
        const meta: Record<string, PandocMetaValue> = {
            lang: {
                t: "MetaInlines",
                c: [{t: "Str", c: this.settings.language.split("-")[0]}]
            }
        }
        const json: PandocJson = {
            "pandoc-api-version": [1, 23, 1],
            meta,
            blocks: this.convertContent(doc.content, meta)
        }
        const returnObject = {
            json,
            imageIds: this.imageIds,
            usedBibDB: this.usedBibDB
        }
        return returnObject
    }

    // Find information for meta tags in header
    preWalkJson(node: FidusNode): void {
        switch (node.type) {
            case "heading1":
            case "heading2":
            case "heading3":
            case "heading4":
            case "heading5":
            case "heading6": {
                const level = Number.parseInt(node.type.slice(-1))
                this.metaData.toc.push({
                    t: "Header",
                    c: [
                        level,
                        [node.attrs.id || "", [], []],
                        this.convertContent(node.content || [], {})
                    ]
                })
                break
            }
            default:
                break
        }
        if (node.content) {
            node.content.forEach(child => this.preWalkJson(child))
        }
    }

    // Function to convert Fidus Writer content to Pandoc format
    convertContent(
        docContent: FidusNode[],
        meta: Record<string, PandocMetaValue>,
        options: ConvertOptions = {inFootnote: false, inCode: false}
    ): PandocElement[] {
        const pandocContent: PandocElement[] = []
        for (const node of docContent) {
            switch (node.type) {
                case "doc":
                    // We only handle doc children
                    break
                case "blockquote": {
                    pandocContent.push({
                        t: "BlockQuote",
                        c: this.convertContent(node.content, meta, options)
                    })
                    break
                }
                case "bullet_list": {
                    const c: PandocElement[][] = []
                    pandocContent.push({
                        t: "BulletList",
                        c
                    })
                    if (node.content) {
                        node.content.forEach(listItem =>
                            c.push(
                                this.convertContent(
                                    listItem.content || [],
                                    meta,
                                    options
                                )
                            )
                        )
                    }
                    break
                }
                case "citation": {
                    if (options.inFootnote) {
                        // TODO: handle citations in footnotes
                        break
                    }
                    const cit = this.exporter.citations.pmCits.shift()
                    if (!cit) {
                        break
                    }

                    const references = (node.attrs?.references || []) as CitationReference[]
                    const pandocReferences = references
                        .map((reference): PandocCitation | false => {
                            const bibDBEntry = this.bibDB.db[String(reference.id)]
                            if (!bibDBEntry) {
                                // Not present in bibliography database, skip it.
                                return false
                            }
                            if (!this.usedBibDB[String(reference.id)]) {
                                const citationKey =
                                    this.createUniqueCitationKey(
                                        bibDBEntry.entry_key
                                    )
                                this.usedBibDB[String(reference.id)] = Object.assign(
                                    {},
                                    bibDBEntry
                                )
                                this.usedBibDB[String(reference.id)].entry_key =
                                    citationKey
                            }

                            return {
                                citationId:
                                    this.usedBibDB[String(reference.id)].entry_key,
                                citationPrefix: convertText(
                                    reference.prefix || ""
                                ),
                                citationSuffix: convertText(
                                    reference.locator || ""
                                ),
                                citationMode: {
                                    t:
                                        node.attrs.format === "textcite"
                                            ? "AuthorInText"
                                            : "NormalCitation"
                                },
                                citationNoteNum: 1,
                                citationHash: 0
                            }
                        })
                        .filter((reference): reference is PandocCitation =>
                            Boolean(reference)
                        )
                    if (!pandocReferences.length) {
                        break
                    }
                    const pandocRendering = this.convertContent(
                        cit.content || [],
                        meta,
                        options
                    )
                    const pandocElement: PandocCite = {
                        t: "Cite",
                        c: [pandocReferences, pandocRendering]
                    }
                    if (node.content) {
                        this.convertContent(
                            node.content,
                            meta,
                            options
                        ).forEach(el => pandocElement.c[1].push(el))
                    }
                    pandocContent.push(pandocElement)
                    break
                }
                case "code_block": {
                    options = Object.assign({}, options)
                    options.inCode = true
                    const classes = node.attrs.language
                        ? [node.attrs.language]
                        : []
                    const keyValuePairs: [string, string][] = []

                    // Add caption if title is present
                    if (node.attrs.title) {
                        keyValuePairs.push(["caption", node.attrs.title])
                    }

                    // Add category as custom attribute for round-trip fidelity
                    if (node.attrs.category) {
                        keyValuePairs.push(["category", node.attrs.category])
                    }

                    // Use id if present, otherwise empty string
                    const id = node.attrs.id || ""
                    const attrs = [id, classes, keyValuePairs]

                    pandocContent.push({
                        t: "CodeBlock",
                        c: [
                            attrs,
                            this.convertContent(node.content, meta, options)
                                .map(item => {
                                    if (item.t === "Str") {
                                        return item.c
                                    } else if (item.t === "Space") {
                                        return " "
                                    } else if (
                                        item.t === "SoftBreak" ||
                                        item.t === "LineBreak"
                                    ) {
                                        return "\n"
                                    }
                                    return ""
                                })
                                .join("")
                        ]
                    })
                    break
                }
                case "contributor":
                    // dealt with in contributors_part
                    break
                case "contributors_part": {
                    if (!node.content || !node.content.length) {
                        break
                    }
                    if (node.attrs?.metadata === "authors") {
                        if (!meta.author) {
                            meta.author = {t: "MetaList", c: []}
                        }
                        const convertedContributors = node.content
                            .map(contributor =>
                                convertContributor(
                                    contributor.attrs as unknown as Record<string, string>
                                )
                            )
                            .filter(
                                (convertedContributor): convertedContributor is PandocMetaInlines =>
                                    Boolean(convertedContributor)
                            )
                        convertedContributors.forEach(contributor =>
                            meta.author!.c.push(contributor)
                        )
                    } else {
                        pandocContent.push({
                            t: "Div",
                            c: [
                                [
                                    node.attrs?.id || "",
                                    [
                                        "doc-part",
                                        "doc-contributors",
                                        node.attrs?.id
                                            ? `doc-${node.attrs.id}`
                                            : "doc-div",
                                        `doc-${node.attrs?.metadata || "other"}`
                                    ],
                                    []
                                ],
                                [
                                    {
                                        t: "Para",
                                        c: convertText(
                                            node.content
                                                .map(
                                                    contributor =>
                                                        `${contributor.attrs?.firstname || ""} ${contributor.attrs?.lastname || ""}, ${contributor.attrs?.institution || ""}, ${contributor.attrs?.email || ""}`
                                                )
                                                .join("; ")
                                        )
                                    }
                                ]
                            ]
                        })
                    }
                    break
                }
                case "cross_reference": {
                    // TODO: use real cross reference instead of link.
                    pandocContent.push({
                        t: "Link",
                        c: [
                            ["", ["reference"], []],
                            convertText(String(node.attrs?.title || "MISSING TARGET")),
                            [`#${node.attrs?.id || ""}`, ""]
                        ]
                    })
                    break
                }
                case "heading_part": {
                    if (!node.content || !node.content.length) {
                        break
                    }
                    if (node.attrs?.metadata === "subtitle" && !meta.subtitle) {
                        if (node.content?.length && node.content[0].content) {
                            meta.subtitle = {
                                t: "MetaInlines",
                                c: this.convertContent(
                                    node.content[0].content,
                                    meta,
                                    options
                                )
                            }
                        }
                    } else {
                        const pandocElement: PandocHeader = {
                            t: "Header",
                            c: [2, [String(node.attrs?.metadata || ""), [], []]]
                        }
                        if (node.content) {
                            this.convertContent(
                                node.content,
                                meta,
                                options
                            ).forEach(el => pandocElement.c[2].push(el))
                        }
                        pandocContent.push({
                            t: "Div",
                            c: [
                                [
                                    node.attrs?.id || "",
                                    [
                                        "doc-part",
                                        "doc-heading",
                                        node.attrs?.id
                                            ? `doc-${node.attrs.id}`
                                            : "doc-div",
                                        `doc-${node.attrs?.metadata || "other"}`
                                    ],
                                    []
                                ],
                                [pandocElement]
                            ]
                        })
                    }
                    break
                }
                case "equation": {
                    pandocContent.push({
                        t: "Span",
                        c: [
                            ["", ["equation"], []],
                            [
                                {
                                    t: "Math",
                                    c: [{t: "InlineMath"}, node.attrs.equation]
                                }
                            ]
                        ]
                    })
                    break
                }
                case "figure": {
                    const image =
                        (node.content.find(child => child.type === "image")
                            ?.attrs?.image as string | undefined) || false
                    const caption = node.attrs?.caption
                        ? (node.content.find(
                              child => child.type === "figure_caption"
                          )?.content || [])
                        : []
                    const equation = node.content.find(
                        child => child.type === "figure_equation"
                    )?.attrs?.equation as string | undefined
                    if (image !== false) {
                        this.imageIds.push(image)
                        const imageDBEntry = this.imageDB.db[image]
                        const copyright = imageDBEntry?.copyright
                        const imageFilename = getImageDBEntryFilename(
                            imageDBEntry,
                            image
                        )
                        if (
                            node.attrs?.category === "none" &&
                            imageFilename &&
                            !caption.length &&
                            (!copyright || !(copyright.holder as string))
                        ) {
                            pandocContent.push({
                                t: "Plain",
                                c: [
                                    {
                                        t: "Image",
                                        c: [
                                            [
                                                node.attrs?.id || "",
                                                [],
                                                [
                                                    [
                                                        "data-width",
                                                        String(node.attrs?.width)
                                                    ],
                                                    [
                                                        "width",
                                                        `${String(node.attrs?.width)}%`
                                                    ]
                                                ]
                                            ],
                                            [],
                                            [imageFilename, ""]
                                        ]
                                    }
                                ]
                            })
                        } else {
                            pandocContent.push({
                                t: "Figure",
                                c: [
                                    [
                                        node.attrs?.id || "",
                                        [
                                            `aligned-${String(node.attrs?.aligned)}`,
                                            `image-width-${String(node.attrs?.width)}`
                                        ],
                                        [
                                            ["aligned", String(node.attrs?.aligned)],
                                            [
                                                "data-width",
                                                String(node.attrs?.width)
                                            ],
                                            ["width", `${String(node.attrs?.width)}%`],
                                            ["category", String(node.attrs?.category)]
                                        ]
                                    ],
                                    [
                                        null,
                                        caption.length
                                            ? [
                                                  {
                                                      t: "Para",
                                                      c: this.convertContent(
                                                          caption,
                                                          meta,
                                                          options
                                                      )
                                                  }
                                              ]
                                            : []
                                    ],
                                    [
                                        {
                                            t: "Plain",
                                            c: [
                                                {
                                                    t: "Image",
                                                    c: [
                                                        [
                                                            "",
                                                            [],
                                                            [
                                                                [
                                                                    "width",
                                                                    `${String(node.attrs?.width)}%`
                                                                ]
                                                            ]
                                                        ],
                                                        [],
                                                        [imageFilename, ""]
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                ]
                            })
                        }
                    } else if (equation) {
                        pandocContent.push({
                            t: "Figure",
                            c: [
                                [
                                    node.attrs?.id || "",
                                    [
                                        `aligned-${String(node.attrs?.aligned)}`,
                                        `image-width-${String(node.attrs?.width)}`
                                    ],
                                    [
                                        ["aligned", String(node.attrs?.aligned)],
                                        [
                                            "data-width",
                                            String(node.attrs?.width)
                                        ],
                                        ["width", `${String(node.attrs?.width)}%`],
                                        ["category", String(node.attrs?.category)]
                                    ]
                                ],
                                [
                                    null,
                                    caption.length
                                        ? [
                                              {
                                                  t: "Para",
                                                  c: this.convertContent(
                                                      caption,
                                                      meta,
                                                      options
                                                  )
                                              }
                                          ]
                                        : []
                                ],
                                [
                                    {
                                        t: "Math",
                                        c: [
                                            {t: "DisplayMath"},
                                            equation
                                        ]
                                    }
                                ]
                            ]
                        })
                    }
                    // TODO: figure attributes like copyright info etc.
                    break
                }
                case "figure_caption":
                case "figure_equation":
                    // Dealt with in figure
                    break
                case "footnote": {
                    options = Object.assign({}, options)
                    options.inFootnote = true
                    pandocContent.push({
                        t: "Note",
                        c: this.convertContent(
                            node.attrs.footnote,
                            meta,
                            options
                        )
                    })
                    break
                }
                case "footnotecontainer":
                    // Dealt with in footnote
                    break
                case "hard_break":
                    pandocContent.push({t: "LineBreak"})
                    break
                case "heading1":
                case "heading2":
                case "heading3":
                case "heading4":
                case "heading5":
                case "heading6": {
                    const level = Number.parseInt(node.type.slice(-1))
                    pandocContent.push({
                        t: "Header",
                        c: [
                            level,
                            [node.attrs.id || "", [], []],
                            this.convertContent(
                                node.content || [],
                                meta,
                                options
                            )
                        ]
                    })
                    break
                }
                case "image":
                    // Handled by figure
                    break
                case "list_item":
                    // handled by ordered_list and bullet_list
                    break
                case "ordered_list": {
                    const c: PandocElement[][] = []
                    pandocContent.push({
                        t: "OrderedList",
                        c: [
                            [
                                Number(node.attrs?.order) || 1,
                                {t: "DefaultStyle"},
                                {t: "DefaultDelim"}
                            ], // list attributes
                            c
                        ]
                    })

                    if (node.content) {
                        node.content.forEach(listItem =>
                            c.push(
                                this.convertContent(
                                    listItem.content || [],
                                    meta,
                                    options
                                )
                            )
                        )
                    }
                    break
                }
                case "paragraph": {
                    pandocContent.push({
                        t: "Para",
                        c: node.content
                            ? this.convertContent(node.content, meta, options)
                            : []
                    })
                    break
                }
                case "richtext_part": {
                    if (!node.content || !node.content.length) {
                        break
                    }
                    if (node.attrs?.metadata === "abstract" && !meta.abstract) {
                        meta.abstract = {
                            t: "MetaBlocks",
                            c: this.convertContent(
                                node.content,
                                meta,
                                options
                            )
                        }
                    } else {
                        pandocContent.push({
                            t: "Div",
                            c: [
                                [
                                    node.attrs.id || "",
                                    [
                                        "doc-part",
                                        "doc-richtext",
                                        node.attrs.id
                                            ? `doc-${node.attrs.id}`
                                            : "doc-div",
                                        `doc-${node.attrs.metadata || "other"}`
                                    ],
                                    []
                                ],
                                this.convertContent(
                                    node.content,
                                    meta,
                                    options
                                )
                            ]
                        })
                    }
                    break
                }
                case "separator_part":
                    pandocContent.push({
                        t: "HorizontalRule",
                        c: [
                            [
                                node.attrs.id || "",
                                [
                                    "doc-part",
                                    "doc-separator",
                                    node.attrs.id
                                        ? `doc-${node.attrs.id}`
                                        : "doc-hr",
                                    `doc-${node.attrs.metadata || "other"}`
                                ],
                                []
                            ],
                            []
                        ]
                    })
                    break
                case "tag":
                    // Handled by tags_part
                    break
                case "tags_part": {
                    if (!node.content || !node.content.length) {
                        break
                    }
                    pandocContent.push({
                        t: "Div",
                        c: [
                            [
                                node.attrs?.id || "",
                                [
                                    "doc-part",
                                    "doc-tags",
                                    node.attrs?.id
                                        ? `doc-${node.attrs.id}`
                                        : "doc-div",
                                    `doc-${node.attrs?.metadata || "other"}`
                                ],
                                []
                            ],
                            [
                                {
                                    t: "Para",
                                    c: convertText(
                                        node.content
                                            .map(tag => String(tag.attrs?.tag))
                                            .join("; ")
                                    )
                                }
                            ]
                        ]
                    })
                    break
                }
                case "table": {
                    // Tables seem to have this structure in pandoc json:
                    // If table has no rows with content, skip.
                    const tableBodyNode = node.content.find(
                        childNode =>
                            childNode.type === "table_body" &&
                            childNode.content &&
                            childNode.content.length
                    )
                    const tableFirstRow = tableBodyNode
                        ? tableBodyNode.content.find(
                              childNode =>
                                  childNode.type === "table_row" &&
                                  childNode.content &&
                                  childNode.content.length
                          )
                        : undefined
                    if (!tableFirstRow) {
                        break
                    }

                    const c: PandocTable["c"] = []
                    pandocContent.push({
                        t: "Table",
                        c
                    })
                    // child 0: attributes of the table.
                    c.push([
                        node.attrs?.id || "",
                        [
                            `table-${String(node.attrs?.width)}`,
                            `table-${String(node.attrs?.aligned)}`,
                            `table-${String(node.attrs?.layout)}`
                        ],
                        [
                            ["data-width", String(node.attrs?.width)],
                            ["width", `${String(node.attrs?.width)}%`],
                            ["aligned", String(node.attrs?.aligned)],
                            ["layout", String(node.attrs?.layout)],
                            ["category", String(node.attrs?.category)]
                        ]
                    ])
                    // child 1: table caption
                    const tableCaptionNode = node.content.find(
                        childNode =>
                            childNode.type === "table_caption" &&
                            childNode.content &&
                            childNode.content.length
                    )
                    if (tableCaptionNode) {
                        c.push([
                            null,
                            [
                                {
                                    t: "Plain",
                                    c: this.convertContent(
                                        tableCaptionNode.content,
                                        meta,
                                        options
                                    )
                                }
                            ]
                        ])
                    } else {
                        c.push([null, []])
                    }
                    // child 2: settings for each column
                    c.push(
                        tableFirstRow.content.map(_column => [
                            {t: "AlignDefault"},
                            {t: "ColWidthDefault"}
                        ])
                    )
                    // child 3: ?
                    c.push([["", [], []], []])
                    // child 4: Each child represents one table row
                    const tableHead: unknown[] = []
                    const tableBody: unknown[] = []
                    c.push([["", [], []], 0, tableHead, tableBody])
                    let currentTablePart: unknown[] = tableHead

                    this.convertContent(
                        tableBodyNode!.content,
                        meta,
                        options
                    ).forEach((row, index) => {
                        if (
                            currentTablePart === tableHead &&
                            tableBodyNode!.content[index].content?.find(
                                cell => cell.type === "table_cell"
                            )
                        ) {
                            // If at least one regular table cell is found in the row, we assume the table header hs finished.
                            currentTablePart = tableBody
                        }
                        currentTablePart.push(row)
                    })
                    // last child: Unclear meaning
                    c.push([["", [], []], []])
                    // Don't process content as we do that by calling convertContent above already.
                    //processContent = false
                    break
                }
                case "table_body":
                case "table_caption":
                    // Handled directly through table tag.
                    break
                case "table_cell":
                case "table_header": {
                    if (node.content) {
                        pandocContent.push([
                            ["", [], []],
                            {t: "AlignDefault"},
                            node.attrs?.rowspan || 1,
                            node.attrs?.colspan || 1,
                            this.convertContent(node.content, meta, options)
                        ])
                    }
                    break
                }
                case "table_part":
                    pandocContent.push({
                        t: "Div",
                        c: [
                            [
                                node.attrs.id || "",
                                [
                                    "doc-part",
                                    "doc-table",
                                    node.attrs.id
                                        ? `doc-${node.attrs.id}`
                                        : "doc-div",
                                    `doc-${node.attrs.metadata || "other"}`
                                ],
                                []
                            ],
                            this.convertContent(node.content, meta, options)
                        ]
                    })
                    break
                case "table_of_contents": {
                    pandocContent.push({
                        t: "Div",
                        c: [
                            [
                                node.attrs.id || "",
                                [
                                    "doc-part",
                                    "doc-table-of-contents",
                                    node.attrs.id
                                        ? `doc-${node.attrs.id}`
                                        : "doc-div",
                                    `doc-${node.attrs.metadata || "other"}`
                                ],
                                []
                            ],
                            [
                                {
                                    t: "Header",
                                    c: [
                                        1,
                                        ["", ["toc"], []],
                                        convertText(node.attrs.title)
                                    ]
                                }
                            ].concat(this.metaData.toc)
                        ]
                    })
                    break
                }
                case "table_row": {
                    pandocContent.push([
                        ["", [], []],
                        this.convertContent(node.content, meta, options)
                    ])
                    break
                }
                case "text": {
                    if (node.text) {
                        let containerContent: PandocElement[] = pandocContent
                        let strong: FidusMark | undefined,
                            em: FidusMark | undefined,
                            underline: FidusMark | undefined,
                            hyperlink: FidusMark | undefined,
                            anchor: FidusMark | undefined,
                            sup: FidusMark | undefined,
                            sub: FidusMark | undefined,
                            code: FidusMark | undefined
                        if (node.marks) {
                            strong = node.marks.find(
                                mark => mark.type === "strong"
                            )
                            em = node.marks.find(mark => mark.type === "em")
                            underline = node.marks.find(
                                mark => mark.type === "underline"
                            )
                            hyperlink = node.marks.find(
                                mark => mark.type === "link"
                            )
                            anchor = node.marks.find(
                                mark => mark.type === "anchor"
                            )
                            sup = node.marks.find(mark => mark.type === "sup")
                            sub = node.marks.find(mark => mark.type === "sub")
                            code = node.marks.find(mark => mark.type === "code")
                        }
                        if (em) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Emph",
                                c
                            })
                            containerContent = c
                        }
                        if (strong) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Strong",
                                c
                            })
                            containerContent = c
                        }
                        if (underline) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Underline",
                                c
                            })
                            containerContent = c
                        }
                        if (sup) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Superscript",
                                c
                            })
                            containerContent = c
                        }
                        if (sub) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Subscript",
                                c
                            })
                            containerContent = c
                        }
                        if (code && !options.inCode) {
                            containerContent.push({
                                t: "Code",
                                c: [["", [], []], node.text]
                            })
                            break
                        }
                        if (hyperlink) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Link",
                                c: [["", [], []], c, [hyperlink.attrs!.href as string, ""]]
                            })
                            containerContent = c
                        }
                        if (anchor) {
                            const c: PandocElement[] = []
                            containerContent.push({
                                t: "Span",
                                c: [[anchor.attrs!.id as string, [], []], c]
                            })
                            containerContent = c
                        }

                        if (options.inCode) {
                            containerContent.push({
                                t: "Code",
                                c: [["", [], []], node.text]
                            })
                        } else {
                            containerContent.push(
                                ...convertText(node.text || "")
                            )
                        }
                    }
                    break
                }
                case "title": {
                    if (!node.content || !node.content.length) {
                        break
                    }
                    if (!meta.title) {
                        meta.title = {
                            t: "MetaInlines",
                            c: this.convertContent(node.content, meta, options)
                        }
                    } else {
                        const pandocElement: PandocHeader = {
                            t: "Header",
                            c: [1, ["title", [], []]]
                        }
                        if (node.content) {
                            this.convertContent(
                                node.content,
                                meta,
                                options
                            ).forEach(el => pandocElement.c[2].push(el))
                        }
                        pandocContent.push(pandocElement)
                    }
                    break
                }
                default: {
                    console.warn(`Not handled: ${node.type}`, {node})
                    break
                }
            }
        }
        return pandocContent
    }

    createUniqueCitationKey(suggestedKey: string | undefined): string {
        suggestedKey = suggestedKey || "key"
        const usedKeys = Object.keys(this.usedBibDB).map(
            key => this.usedBibDB[key].entry_key
        )
        if (usedKeys.includes(suggestedKey)) {
            suggestedKey += "X"
            return this.createUniqueCitationKey(suggestedKey)
        } else {
            return suggestedKey
        }
    }
}
