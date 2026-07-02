interface PandocText {
    t: "Str"
    c: string
}

interface PandocSpace {
    t: "Space"
}

interface PandocNote {
    t: "Note"
    c: Array<{t: "Para"; c: Array<PandocText | PandocSpace>}>
}

interface PandocMetaInlines {
    t: "MetaInlines"
    c: Array<PandocText | PandocSpace | PandocNote>
}

type _PandocInline = PandocText | PandocSpace | PandocNote | PandocMetaInlines

export const convertText = (text: string): Array<PandocText | PandocSpace> => {
    const textContent: Array<PandocText | PandocSpace> = []
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
    const contributorContent: Array<PandocText | PandocSpace | PandocNote> = []
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
        ? {t: "MetaInlines", c: contributorContent}
        : false
}
