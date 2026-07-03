import {gettext} from "fwtoolkit"
import type {ImageDBEntry} from "../../types.js"

export const createSlug = (str: string): string => {
    if (str === "") {
        str = gettext("Untitled")
    }
    str = str.replace(/[^a-zA-Z0-9\s]/g, "")
    str = str.toLowerCase()
    str = str.replace(/\s/g, "-")
    return str
}

export function getImageExtension(
    fileType: string | undefined,
    blobType: string
): string {
    if (fileType) {
        return fileType.includes("/")
            ? fileType.split("/").pop() || "bin"
            : fileType
    }
    return blobType.split("/")[1] || "bin"
}

export function getImageDBEntryFilename(
    imageEntry: ImageDBEntry,
    id: string | number
): string {
    const imageValue = imageEntry.image
    if (imageValue instanceof Blob) {
        const ext = getImageExtension(imageEntry.file_type, imageValue.type)
        return `image-${id}.${ext}`
    }
    if (imageValue instanceof ArrayBuffer) {
        const ext = getImageExtension(imageEntry.file_type, "")
        return `image-${id}.${ext}`
    }
    if (typeof imageValue === "string") {
        return imageValue.split("/").pop() || `image-${id}`
    }
    return `image-${id}`
}
