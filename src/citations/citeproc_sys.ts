/* Connects Fidus Writer citation system with citeproc */
import {CSLExporter} from "bibliojson"

import type {BibDB} from "../types.js"

export class citeprocSys {
    bibDB: BibDB
    abbreviations: Record<string, Record<string, Record<string, string>>>
    abbrevsname: string
    // We cache values retrieved once.
    items: Record<string, Record<string, unknown>>
    missingItems: string[]

    constructor(bibDB: BibDB) {
        this.bibDB = bibDB
        this.abbreviations = {
            default: {}
        }
        this.abbrevsname = "default"
        this.items = {}
        this.missingItems = []
    }

    retrieveItem(id: string): Record<string, unknown> {
        if (!this.items[id]) {
            if (this.bibDB.db[id]) {
                const cslGetter = new CSLExporter(
                    this.bibDB.db as Record<string, Record<string, unknown>>,
                    [id]
                )
                const cslOutput = cslGetter.parse() as Record<
                    string,
                    Record<string, unknown>
                >
                Object.assign(this.items, cslOutput)
            } else {
                this.missingItems.push(id)
                this.items[id] = {author: [{literal: ""}], type: "article", id}
            }
        }
        return this.items[id]
    }

    getAbbreviation(
        _dummy: string,
        obj: Record<string, Record<string, Record<string, string>>>,
        _jurisdiction: string,
        vartype: string,
        key: string
    ): void {
        try {
            if (this.abbreviations[this.abbrevsname][vartype][key]) {
                obj["default"][vartype][key] =
                    this.abbreviations[this.abbrevsname][vartype][key]
            } else {
                obj["default"][vartype][key] = ""
            }
        } catch (_error) {
            // There is breakage here that needs investigating.
        }
    }
}
