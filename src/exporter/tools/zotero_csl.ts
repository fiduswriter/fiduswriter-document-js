/**
 * Helper functions for creating Zotero-compatible citation data.
 * Uses CSLExporter from biblatex-csl-converter to convert Fidus Writer's
 * internal BibLaTeX format to CSL-JSON.
 */

import {CSLExporter} from "biblatex-csl-converter"

import type {BibDB} from "../../types.js"

interface CitationReference {
    id: number
    locator?: string
    prefix?: string
    item?: Record<string, unknown>
}

interface ZoteroCitationItem {
    id: number
    uris: string[]
    itemData: Record<string, unknown>
    locator?: string
    prefix?: string
}

/**
 * Generate a random citation ID similar to Zotero's format.
 * Zotero uses 8-10 character alphanumeric IDs.
 */
function generateCitationId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let id = ""
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
}

/**
 * Convert bibliography entries to CSL-JSON format.
 * @param bibDB - The bibliography database
 * @param ids - Array of entry IDs to convert
 * @returns Object mapping IDs to CSL-JSON entries
 */
function convertToCSL(bibDB: BibDB, ids: number[]): Record<string, unknown> {
    const exporter = new CSLExporter(bibDB.db as Record<string, any>, ids as unknown as string[])
    return exporter.parse()
}

/**
 * Create a Zotero citation JSON object.
 * @param references - Array of {id, prefix?, locator?} from citation node
 * @param bibDB - Bibliography database
 * @param formattedCitation - Pre-formatted citation text from citeproc
 * @param citationId - Optional citation ID (generated if not provided)
 * @returns Zotero citation JSON object
 */
export function createZoteroCitation(
    references: CitationReference[],
    bibDB: BibDB,
    formattedCitation: string,
    citationId: string | null = null
): Record<string, unknown> {
    const citationID = citationId || generateCitationId()

    // Get the IDs of all referenced items
    const ids = references.map(ref => ref.id)

    // Convert to CSL-JSON
    const _cslData = convertToCSL(bibDB, ids)
    const citationItems = references
        .map(ref => {
            const entry = bibDB.db[ref.id]

            if (!entry) {
                return null
            }
            const citationKey = entry.entry_key || String(ref.id)
            const item: ZoteroCitationItem = {
                id: ref.id,
                uris: [],
                itemData: {
                    ...ref.item,
                    id: citationKey
                }
            }

            if (ref.locator) {
                item.locator = ref.locator
            }

            if (ref.prefix) {
                item.prefix = ref.prefix
            }

            return item
        })
        .filter((item): item is ZoteroCitationItem => item !== null)

    return {
        citationID,
        properties: {
            formattedCitation,
            plainCitation: formattedCitation,
            noteIndex: 0
        },
        citationItems,
        schema: "https://github.com/citation-style-language/schema/raw/master/csl-citation.json"
    }
}
