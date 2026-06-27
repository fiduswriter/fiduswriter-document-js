import {ZipAnalyzer} from "./zip_analyzer.js"

interface ImporterEntry {
    importer: any
    description: string
}

export class ImporterRegistry {
    importers: Map<string, ImporterEntry>

    constructor() {
        this.importers = new Map()
    }

    register(
        fileTypes: Array<[string, Array<string>]>,
        importer: any
    ): void {
        fileTypes.forEach(([description, types]) => {
            types.forEach(extension =>
                this.importers.set(extension, {importer, description})
            )
        })
    }

    getZipImporter(zip: any): {
        importer: any
        getContents: () => ReturnType<ZipAnalyzer["getContents"]>
    } | null {
        const analyzer = new ZipAnalyzer(zip, this.getAllFormats())
        const analysis = analyzer.analyze()

        if (analysis.hasConvertible && analysis.format) {
            return {
                importer: this.getImporter(analysis.format)["importer"],
                getContents: () => analyzer.getContents()
            }
        }

        return null
    }

    getImporter(format: string): ImporterEntry {
        return this.importers.get(format) as ImporterEntry
    }

    getAllFormats(): string[] {
        return Array.from(this.importers.keys())
    }

    getAllDescriptions(): Record<string, string[]> {
        return Array.from(this.importers).reduce(
            (acc, [extension, {description}]) => {
                ;(acc[description] = acc[description] || []).push(extension)
                return acc
            },
            {} as Record<string, string[]>
        )
    }
}

export const importerRegistry = new ImporterRegistry()

export function registerImporter(
    fileTypes: Array<[string, Array<string>]>,
    importer: any
): void {
    importerRegistry.register(fileTypes, importer)
}
