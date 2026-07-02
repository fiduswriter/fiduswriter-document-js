import type {MarkSpec} from "prosemirror-model"

export interface Track {
    type: "insertion" | "deletion" | "block_change"
    user: number
    username: string
    date: number
    approved?: boolean
    before?: unknown
}

export function parseTracks(str: string | undefined): Track[] {
    if (!str) {
        return []
    }
    let tracks: unknown
    try {
        tracks = JSON.parse(str)
    } catch (_error) {
        return []
    }
    if (!Array.isArray(tracks)) {
        return []
    }
    return tracks.filter(
        (track): track is Track =>
            typeof track === "object" &&
            track !== null &&
            Object.prototype.hasOwnProperty.call(track, "user") &&
            Object.prototype.hasOwnProperty.call(track, "username") &&
            Object.prototype.hasOwnProperty.call(track, "date")
    )
}

export function addTracks(node: {attrs: {track?: Track[]}}, attrs: Record<string, unknown>): void {
    if (node.attrs.track?.length) {
        attrs["data-track"] = JSON.stringify(node.attrs.track)
    }
}

export const deletion = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ""
        },
        date: {
            default: 0
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.deletion",
            getAttrs(dom: HTMLElement) {
                return {
                    user: Number.parseInt(dom.dataset.user || "0"),
                    username: dom.dataset.username || "",
                    date: Number.parseInt(dom.dataset.date || "0")
                }
            }
        }
    ],
    toDOM(node) {
        return [
            "span",
            {
                class: `deletion user-${node.attrs.user}`,
                "data-user": node.attrs.user,
                "data-username": node.attrs.username,
                "data-date": node.attrs.date
            }
        ]
    }
} satisfies MarkSpec

function parseFormatList(str: string | undefined): string[] {
    if (!str) {
        return []
    }
    let formatList: unknown
    try {
        formatList = JSON.parse(str)
    } catch (_error) {
        return []
    }
    if (!Array.isArray(formatList)) {
        return []
    }
    return formatList.filter((format): format is string => typeof format === "string")
}

export const format_change = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ""
        },
        date: {
            default: 0
        },
        before: {
            default: []
        },
        after: {
            default: []
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.format-change",
            getAttrs(dom: HTMLElement) {
                return {
                    user: Number.parseInt(dom.dataset.user || "0"),
                    username: dom.dataset.username || "",
                    date: Number.parseInt(dom.dataset.date || "0"),
                    before: parseFormatList(dom.dataset.before),
                    after: parseFormatList(dom.dataset.after)
                }
            }
        }
    ],
    toDOM(node) {
        return [
            "span",
            {
                class: `format-change user-${node.attrs.user}`,
                "data-user": node.attrs.user,
                "data-username": node.attrs.username,
                "data-date": node.attrs.date,
                "data-before": JSON.stringify(node.attrs.before),
                "data-after": JSON.stringify(node.attrs.after)
            }
        ]
    }
} satisfies MarkSpec

export const insertion = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ""
        },
        date: {
            default: 0
        },
        approved: {
            default: true
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.insertion",
            getAttrs(dom: HTMLElement) {
                return {
                    user: Number.parseInt(dom.dataset.user || "0"),
                    username: dom.dataset.username || "",
                    date: Number.parseInt(dom.dataset.date || "0"),
                    inline: true,
                    approved: false
                }
            }
        },
        {
            tag: "span.approved-insertion",
            getAttrs(dom: HTMLElement) {
                return {
                    user: Number.parseInt(dom.dataset.user || "0"),
                    username: dom.dataset.username || "",
                    date: Number.parseInt(dom.dataset.date || "0"),
                    inline: true,
                    approved: true
                }
            }
        }
    ],
    toDOM(node) {
        return [
            "span",
            {
                class: node.attrs.approved
                    ? "approved-insertion"
                    : `insertion user-${node.attrs.user}`,
                "data-user": node.attrs.user,
                "data-username": node.attrs.username,
                "data-date": node.attrs.date
            }
        ]
    }
} satisfies MarkSpec
