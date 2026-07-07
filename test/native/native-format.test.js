import {beforeAll, describe, expect, it} from "@jest/globals"

const {ShrinkFidus} = await import("../../src/exporter/native/shrink.js")
const {GetImages} = await import("../../src/importer/native/get_images.js")
const {updateFile} = await import("../../src/importer/native/update.js")

beforeAll(() => {
    // GetImages uses window.Blob when reading image entries from a zip.
    global.window = globalThis
})

const minimalNativeDoc = {
    type: "doc",
    content: [
        {
            type: "title",
            content: [{type: "text", text: "Native format test"}]
        },
        {
            type: "paragraph",
            content: [
                {type: "text", text: "A paragraph with "},
                {
                    type: "citation",
                    attrs: {
                        references: [{id: 1}]
                    }
                },
                {type: "text", text: " and an image "},
                {
                    type: "image",
                    attrs: {
                        image: "sample-image-1"
                    }
                }
            ]
        }
    ]
}

const fullDoc = {
    id: "native-test",
    title: "Native format test",
    content: minimalNativeDoc,
    version: "3.5",
    rights: "admin",
    owner: 1,
    is_owner: true,
    added: 123,
    updated: 456,
    revisions: []
}

const imageDB = {
    db: {
        "sample-image-1": {
            id: 1,
            image: "images/sample-image-1.png",
            file_type: "image/png",
            thumbnail: "thumb.png",
            cats: [],
            pk: 1,
            added: 1
        }
    }
}

const bibDB = {
    db: {
        "1": {
            entry_key: "doe2024",
            title: "Example reference",
            cats: []
        }
    }
}

describe("Native Fidus format shrink/export", () => {
    it("Shrinks a full native doc, imageDB and bibDB", async () => {
        const shrinker = new ShrinkFidus(fullDoc, imageDB, bibDB)
        const result = await shrinker.init()

        expect(result.doc.id).toBeUndefined()
        expect(result.doc.version).toBeUndefined()
        expect(result.doc.rights).toBeUndefined()
        expect(result.doc.owner).toBeUndefined()
        expect(result.doc.content).toBeDefined()

        expect(result.shrunkImageDB["sample-image-1"]).toBeDefined()
        expect(result.shrunkImageDB["sample-image-1"].image).toBe(
            "images/sample-image-1.png"
        )
        expect(result.shrunkImageDB["sample-image-1"].thumbnail).toBeUndefined()
        expect(result.shrunkImageDB["sample-image-1"].pk).toBeUndefined()

        expect(result.shrunkBibDB["1"]).toBeDefined()
        expect(result.shrunkBibDB["1"].entry_key).toBe("doe2024")
        expect(result.shrunkBibDB["1"].cats).toBeUndefined()

        expect(result.httpIncludes).toHaveLength(1)
        expect(result.httpIncludes[0].filename).toBe(
            "images/sample-image-1.png"
        )
        expect(result.httpIncludes[0].url).toBe("images/sample-image-1.png")
    })
})

describe("Native Fidus format image import", () => {
    it("GetImages attaches blobs from zip entries", async () => {
        const images = {
            db: {
                "sample-image-1": {
                    id: 1,
                    image: "images/sample-image-1.png",
                    file_type: "image/png"
                }
            }
        }
        const entries = [
            {
                filename: "images/sample-image-1.png",
                content: Buffer.from([0x89, 0x50, 0x4e, 0x47])
            }
        ]
        const getter = new GetImages(images, entries)
        await getter.init()
        expect(images.db["sample-image-1"].file).toBeInstanceOf(Blob)
    })

    it("GetImages attaches blobs from URL entries", async () => {
        const images = {
            db: {
                "sample-image-1": {
                    id: 1,
                    image: "images/sample-image-1.png",
                    file_type: "image/png"
                }
            }
        }
        const entries = [
            {
                filename: "images/sample-image-1.png",
                url: "images/sample-image-1.png"
            }
        ]
        const getter = new GetImages(images, entries)
        await getter.init()
        expect(images.db["sample-image-1"].file).toBeInstanceOf(Blob)
    })
})

describe("Native Fidus format updateFile", () => {
    it("keeps a current document unchanged", () => {
        const images = {
            "1": {
                id: 1,
                image: "images/sample.png",
                copyright: {holder: "Jane", year: 2024, licenses: []}
            }
        }
        const result = updateFile(minimalNativeDoc, 3.5, {}, images)
        expect(result.doc.type).toBe("doc")
        expect(result.images["1"].copyright.holder).toBe("Jane")
    })

    it("adds default copyright to old images when filetypeVersion < 3.2", () => {
        const images = {
            "1": {
                id: 1,
                image: "images/sample.png"
            }
        }
        const result = updateFile(minimalNativeDoc, 3.1, {}, images)
        expect(result.images["1"].copyright).toEqual({
            holder: false,
            year: false,
            freeToRead: true,
            licenses: []
        })
    })

    it("renames contents to content for filetypeVersion < 3.3", () => {
        const oldDoc = {
            type: "doc",
            contents: [
                {
                    type: "paragraph",
                    content: [{type: "text", text: "Old format"}]
                }
            ]
        }
        const result = updateFile(oldDoc, 3.2, {}, {})
        expect(result.doc.content).toBeDefined()
        expect(result.doc.contents).toBeUndefined()
    })
})
