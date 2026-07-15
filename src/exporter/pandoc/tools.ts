import type {
    PandocElement,
    PandocInline,
    PandocMetaInlines,
    PandocSpace,
    PandocStr
} from "./types.js"

export const convertText = (text: string): PandocInline[] => {
    const textContent: Array<PandocStr | PandocSpace> = []
    if (!text.length) {
        return []
    }
    const words = text.split(" ")
    words.forEach((c, index) => {
        if (c) {
            textContent.push({
                t: "Str",
                c
            })
        }
        if (index < words.length - 1) {
            textContent.push({
                t: "Space"
            })
        }
    })
    return textContent
}

export const convertContributor = (
    contributor: Record<string, string>
): PandocMetaInlines | false => {
    const contributorContent: PandocInline[] = []
    if (contributor.firstname || contributor.lastname) {
        const nameParts: string[] = []
        if (contributor.lastname) {
            nameParts.push(contributor.lastname)
        }
        if (contributor.firstname) {
            nameParts.push(contributor.firstname)
        }
        contributorContent.push(...convertText(nameParts.join(" ")))
    } else if (contributor.institution) {
        contributorContent.push(...convertText(contributor.institution))
    }
    if (contributor.email) {
        contributorContent.push({
            t: "Note",
            c: [
                {
                    t: "Para",
                    c: convertText(contributor.email)
                }
            ]
        })
    }
    return contributorContent.length
        ? {t: "MetaInlines", c: contributorContent as PandocElement[]}
        : false
}
