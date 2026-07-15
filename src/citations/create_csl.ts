/**
 * createCSL — build a CSL instance ready for use with @fiduswriter/document
 * exporters in both browser and Node.js contexts.
 *
 * Usage (browser, pre-imported JSON):
 *   import apaStyle from "./apa.csl.json"
 *   const csl = await createCSL({ apa: apaStyle })
 *
 * Usage (Node.js, local file paths):
 *   const csl = await createCSL({ apa: "/path/to/apa.csl.json" })
 */

import {CSL} from "citeproc-plus/dist/index.js"

interface CompactCslNode {
    n?: string
    a?: Record<string, unknown>
    c?: Array<string | CompactCslNode>
}

interface ExpandedCslNode {
    name: string
    attrs: Record<string, unknown>
    children: Array<string | ExpandedCslNode>
}

/**
 * Expand a compact CSL node ({ n, a, c } format) to the full format
 * ({ name, attrs, children }) expected by citeproc-js.
 * Mirrors the private e() function inside citeproc-plus.
 */
function expandCslNode(node: CompactCslNode | ExpandedCslNode): ExpandedCslNode {
    if ("name" in node) {
        return node as ExpandedCslNode
    }
    const compact = node as CompactCslNode
    const result: ExpandedCslNode = {
        name: compact.n || "",
        attrs: compact.a ?? {},
        children: []
    }
    if (compact.c) {
        result.children = compact.c.map(child =>
            typeof child === "string" ? child : expandCslNode(child)
        )
    } else if (compact.n === "term") {
        result.children = [""]
    }
    return result
}

interface CSLInstance {
    styles: Record<string, object>
    getStyle: (nameOrStyle: string | object) => Promise<object | null>
    getLocale: (
        style: {attrs?: Record<string, unknown>} | undefined,
        lang: string,
        forceLocale?: string
    ) => Promise<object>
}

/**
 * Map of citation style name to either:
 * - a pre-loaded JSON style object (works in browser and Node.js), or
 * - a local file-system path string to a CSL JSON file (Node.js only).
 */
export type StyleMap = Record<string, object | string>

/**
 * Build a CSL instance configured with the provided citation styles.
 *
 * In Node.js the instance's `getLocale` is also overridden so that locale
 * data is read directly from the citeproc-plus asset files on disk.
 * citeproc-plus's default `getLocale` dynamically imports its locales bundle,
 * which in turn uses static `import` statements for `.csljson` files that
 * Node.js cannot load as ES modules (unknown file extension).
 */
export async function createCSL(
    styles: StyleMap = {}
): Promise<InstanceType<typeof CSL>> {
    const csl = new CSL()

    // ── Resolve styles ────────────────────────────────────────────────────────
    // String values are treated as file-system paths (Node.js only).
    const resolvedStyles: Record<string, object> = {}
    await Promise.all(
        Object.entries(styles).map(async ([name, value]) => {
            if (typeof value === "string") {
                const {readFile} = await import("fs/promises")
                resolvedStyles[name] = JSON.parse(await readFile(value, "utf8"))
            } else {
                resolvedStyles[name] = value
            }
        })
    )

    Object.assign((csl as CSLInstance).styles, resolvedStyles)

    // Override getStyle to serve from our resolved map, bypassing the
    // citeproc-plus CDN / bundle fetch.  When the argument is already a style
    // object (passed through by JATS / HTML exporters that clone and mutate
    // the style before handing it to FormatCitations) return it as-is,
    // mirroring the passthrough in citeproc-plus's own getStyle.
    ;(csl as CSLInstance).getStyle = (
        nameOrStyle: string | object
    ): Promise<object | null> => {
        if (typeof nameOrStyle === "object") {
            return Promise.resolve(nameOrStyle)
        }
        return Promise.resolve(
            (csl as CSLInstance).styles[nameOrStyle] ?? null
        )
    }

    // ── Node.js locale override ───────────────────────────────────────────────
    // The citeproc-plus ESM locales bundle uses static `import` statements for
    // `.csljson` asset files.  Node.js rejects these with "Unknown file
    // extension", so we replace getLocale with a loader that reads the asset
    // files directly from disk using fs.
    if (typeof process !== "undefined" && process.versions?.node) {
        try {
            const {readFile, readdir} = await import("fs/promises")
            const {dirname, resolve} = await import("path")
            const {fileURLToPath} = await import("url")

            // Locate the citeproc-plus dist directory.
            const distUrl = import.meta.resolve("citeproc-plus/dist/index.js")
            const distDir = dirname(fileURLToPath(distUrl))

            // Locate the locales bundle (filename contains a content hash).
            const distFiles = await readdir(distDir)
            const bundleFile = distFiles.find(
                f => f.startsWith("locales-") && f.endsWith(".js")
            )
            if (!bundleFile) {
                throw new Error("citeproc-plus locales bundle not found in " + distDir)
            }

            const bundleSrc = await readFile(resolve(distDir, bundleFile), "utf8")

            // Extract  import varName from "./assets/HASH.csljson"  entries.
            const varToFile: Record<string, string> = {}
            for (const m of bundleSrc.matchAll(
                /import (\w+) from"\.\/assets\/([\w.]+)"/g
            )) {
                varToFile[m[1]] = m[2]
            }

            // Extract the  "locale-name": varName  pairs from the export object.
            // The object ends just before the semicolon+export, e.g.:
            //   const rs={...};export{rs as locales}
            const exportMatch = bundleSrc.match(/\{([^}]+)\};export\{/)
            if (!exportMatch) {
                throw new Error("Cannot parse citeproc-plus locales bundle export")
            }
            const localeToVar: Record<string, string> = {}
            for (const m of exportMatch[1].matchAll(/"([^"]+)":(\w+)/g)) {
                localeToVar[m[1]] = m[2]
            }

            const assetsDir = resolve(distDir, "assets")
            const localeCache: Record<string, object> = {}

            const loadLocale = async (name: string): Promise<object> => {
                if (localeCache[name]) {
                    return localeCache[name]
                }
                // Fall back to en-US if the requested locale is not bundled.
                const effectiveName = localeToVar[name] ? name : "en-US"
                const varName = localeToVar[effectiveName]
                const filename = varToFile[varName]
                if (!filename) {
                    throw new Error(
                        `Locale "${effectiveName}" not found in citeproc-plus assets`
                    )
                }
                const filePath = resolve(assetsDir, filename)
                const bytes = await readFile(filePath)
                let text: string
                // citeproc-plus 1.0.0+ ships locale assets gzip-compressed.
                if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
                    const {gunzip} = await import("node:zlib")
                    text = await new Promise<string>((resolveText, reject) => {
                        gunzip(bytes, (err, buf) => {
                            if (err) {
                                reject(err)
                            } else {
                                resolveText(buf.toString("utf8"))
                            }
                        })
                    })
                } else {
                    text = bytes.toString("utf8")
                }
                const raw = JSON.parse(text)
                localeCache[effectiveName] = expandCslNode(raw)
                return localeCache[effectiveName]
            }

            ;(csl as CSLInstance).getLocale = (
                style: {attrs?: Record<string, unknown>} | undefined,
                lang: string,
                forceLocale?: string
            ): Promise<object> => {
                const name =
                    forceLocale ??
                    (style?.attrs?.["default-locale"] as string | undefined) ??
                    lang ??
                    "en-US"
                return loadLocale(name)
            }
        } catch (err) {
            // If locale override setup fails, leave the default getLocale in
            // place and let it attempt its normal fetch-based loading.
            console.warn("createCSL: could not install Node.js locale loader:", err)
        }
    }

    return csl
}
