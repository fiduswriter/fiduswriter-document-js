/** @type {import('jest').Config} */
export default {
    rootDir: ".",
    testEnvironment: "node",
    resolver: "ts-jest-resolver",
    extensionsToTreatAsEsm: [".ts"],
    transform: {
        "^.+\\.ts$": [
            "ts-jest",
            {
                useESM: true,
                tsconfig: {
                    module: "NodeNext",
                    moduleResolution: "NodeNext"
                }
            }
        ]
    },
    moduleDirectories: ["node_modules"],
    moduleNameMapper: {
        "^downloadjs$": "<rootDir>/test/exporter/mocks/downloadjs.js",
        "^mathlive$": "<rootDir>/test/exporter/mocks/mathlive.js",
        "^mathml2omml$": "<rootDir>/test/exporter/mocks/mathml2omml.js",
        "^@vivliostyle/print$": "<rootDir>/test/exporter/mocks/vivliostyle.js",
        "^pretty$": "<rootDir>/test/exporter/mocks/pretty.js",
        "^bibliojson$": "<rootDir>/test/exporter/mocks/bibliojson.js",
        "^mathml-to-latex$": "<rootDir>/test/importer/mocks/mathml-to-latex.js",
        "^@fiduswriter/document/citations/format$": "<rootDir>/test/exporter/mocks/citations-format.js",
        "^@fiduswriter/document/mathlive/opf_includes$": "<rootDir>/test/exporter/mocks/empty-module.js",
        "^fwtoolkit/file/zip$": "<rootDir>/test/exporter/mocks/zip.js",
        "^fwtoolkit$": "<rootDir>/test/exporter/mocks/common.js",
        "^fwtoolkit/.*": "<rootDir>/test/exporter/mocks/common.js"
    },
    testMatch: ["<rootDir>/test/**/*.test.{js,ts}"],
    setupFiles: ["<rootDir>/test/setup.js"],
    moduleFileExtensions: ["ts", "js", "mjs", "json"]
}
