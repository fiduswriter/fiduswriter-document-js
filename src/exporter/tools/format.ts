import prettier from "prettier/standalone"
import * as htmlPlugin from "prettier/plugins/html"
import * as postcssPlugin from "prettier/plugins/postcss"
import * as xmlPluginModule from "@prettier/plugin-xml"

const xmlPlugin =
    (xmlPluginModule as {default?: typeof xmlPluginModule}).default ??
    xmlPluginModule

const baseOptions = {
    tabWidth: 4,
    printWidth: 80
}

export async function formatHtml(html: string): Promise<string> {
    return prettier.format(html, {
        parser: "html",
        plugins: [htmlPlugin],
        ...baseOptions
    })
}

export async function formatCss(css: string): Promise<string> {
    return prettier.format(css, {
        parser: "css",
        plugins: [postcssPlugin],
        ...baseOptions
    })
}

export async function formatXml(xml: string): Promise<string> {
    return prettier.format(xml, {
        parser: "xml",
        plugins: [xmlPlugin],
        xmlWhitespaceSensitivity: "ignore",
        ...baseOptions
    })
}
