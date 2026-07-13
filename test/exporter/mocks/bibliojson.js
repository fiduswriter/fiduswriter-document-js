// Mock for bibliojson

function emptyCheck() {
    return {isCitation: false, isBibliography: false}
}

export class CSLExporter {
    constructor() {
        this.items = []
    }
    addEntry(entry) {
        this.items.push(entry)
    }
}

export class BibLatexExporter {
    constructor() {
        this.items = []
    }
}

export class DocxCitationsParser {
    static fieldCitation() {
        return emptyCheck()
    }
    static fieldBibliography() {
        return emptyCheck()
    }
    static sdtCitation() {
        return emptyCheck()
    }
    static sdtBibliography() {
        return emptyCheck()
    }
}

export class OdtCitationsParser {
    static referenceMarkBibliography() {
        return emptyCheck()
    }
    static sectionBibliography() {
        return emptyCheck()
    }
    static referenceMarkCitation() {
        return emptyCheck()
    }
    static bibliographyMark() {
        return emptyCheck()
    }
}

export function parseCSL() {
    return {}
}

export default {CSLExporter, BibLatexExporter, DocxCitationsParser, OdtCitationsParser, parseCSL}
