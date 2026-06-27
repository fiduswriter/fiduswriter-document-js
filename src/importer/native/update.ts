import {updateDoc} from "../../schema/convert.js"

import type {FidusDoc, ImageDBEntries} from "../../types.js"

export function updateFile(
    doc: FidusDoc,
    filetypeVersion: number,
    bibliography: Record<string, unknown>,
    images: ImageDBEntries
): {doc: FidusDoc; bibliography: Record<string, unknown>; images: ImageDBEntries} {
    // update bibliography -- currently not needed
    // bibliography = updateBib(bibliography)
    if (filetypeVersion < 3.2) {
        Object.values(images).forEach(
            image =>
                (image.copyright = {
                    holder: false,
                    year: false,
                    freeToRead: true,
                    licenses: []
                })
        )
    }
    const docRecord = doc as unknown as Record<string, unknown>
    if (filetypeVersion < 3.3) {
        docRecord.content = docRecord.contents
        delete docRecord.contents
    }
    if (filetypeVersion < 2.0) {
        // Before 2.0, version numbers of the doc and of the file differed.
        doc = updateDoc(doc, (docRecord.settings as Record<string, unknown>)["doc_version"] as number, bibliography as any) as FidusDoc
    } else {
        doc = updateDoc(doc, filetypeVersion, bibliography as any) as FidusDoc
    }

    return {doc, bibliography, images}
}
