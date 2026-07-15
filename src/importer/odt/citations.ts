import {OdtCitationsParser} from "bibliojson"

import {citationResultToNode, type CitationResult} from "../citations.js"
import type {BibDB, FidusNode} from "../../types.js"
import type {XMLElement} from "../../exporter/tools/xml.js"

/**
 * Check whether an ODT reference mark name belongs to a bibliography region
 * (Zotero ZOTERO_BIBL, Mendeley CSL_BIBLIOGRAPHY).
 */
export function isOdtBibliographyReferenceMark(markName: string): boolean {
    if (!markName) {
        return false
    }
    return OdtCitationsParser.referenceMarkBibliography(markName).isBibliography
}

/**
 * Check whether a text:section name belongs to a bibliography region
 * (Zotero, JabRef).
 */
export function isOdtBibliographySection(sectionName: string): boolean {
    if (!sectionName) {
        return false
    }
    return OdtCitationsParser.sectionBibliography(sectionName).isBibliography
}

/**
 * Check whether an ODT reference mark name belongs to a citation.
 */
export function isOdtCitationMark(markName: string): boolean {
    if (!markName) {
        return false
    }
    return OdtCitationsParser.referenceMarkCitation(markName, false).isCitation
}

/**
 * Parse a citation from an ODT reference mark name and add any new
 * bibliography entries into `bibliography`.
 */
export function parseOdtReferenceMark(
    markName: string,
    bibliography: Record<string, unknown>,
    bibDB: BibDB
): FidusNode | null {
    if (!markName) {
        return null
    }
    const result = OdtCitationsParser.referenceMarkCitation(
        markName,
        true, // retrieve
        true // retrieveMetadata
    )
    return citationResultToNode(result as CitationResult, bibliography, bibDB)
}

/**
 * Parse a citation from a LibreOffice native <text:bibliography-mark> element
 * and add any new bibliography entries into `bibliography`.
 */
export function parseOdtBibliographyMark(
    bibMarkNode: XMLElement,
    bibliography: Record<string, unknown>
): FidusNode | null {
    if (!bibMarkNode) {
        return null
    }
    const result = OdtCitationsParser.bibliographyMarkCitation(
        bibMarkNode.outerXML,
        true // retrieve
    )
    return citationResultToNode(result as CitationResult, bibliography)
}
