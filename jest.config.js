export default {
    rootDir: ".",
    testEnvironment: "node",
    transform: {},
    moduleDirectories: ["node_modules"],
    moduleNameMapper: {
        "^downloadjs$": "<rootDir>/test/exporter/mocks/downloadjs.js",
        "^mathlive$": "<rootDir>/test/exporter/mocks/mathlive.js",
        "^mathml2omml$": "<rootDir>/test/exporter/mocks/mathml2omml.js",
        "^@vivliostyle/print$": "<rootDir>/test/exporter/mocks/vivliostyle.js",
        "^pretty$": "<rootDir>/test/exporter/mocks/pretty.js",
        "^biblatex-csl-converter$": "<rootDir>/test/exporter/mocks/biblatex-csl-converter.js",
        "^jszip$": "<rootDir>/test/importer/mocks/jszip.js",
        "^mathml-to-latex$": "<rootDir>/test/importer/mocks/mathml-to-latex.js",
        "^fwtoolkit$": "<rootDir>/test/exporter/mocks/common.js",
        "^fwtoolkit/.*": "<rootDir>/test/exporter/mocks/common.js",
        "^@fiduswriter/document/citations/format$": "<rootDir>/test/exporter/mocks/citations-format.js",
        "^@fiduswriter/document/bibliography/csl_bib$": "<rootDir>/test/exporter/mocks/csl-bib-schema.js",
        "^@fiduswriter/document/mathlive/opf_includes$": "<rootDir>/test/exporter/mocks/empty-module.js"
    },
    testMatch: ["<rootDir>/test/**/*.test.js"],
    setupFiles: ["<rootDir>/test/setup.js"],
    moduleFileExtensions: ["js", "mjs", "json"]
}
