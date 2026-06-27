const numberToRoman = (number: number): string => {
    let roman = ""
    const romanNumList: Record<string, number> = {
        M: 1000,
        CM: 900,
        D: 500,
        CD: 400,
        C: 100,
        XC: 90,
        L: 50,
        XL: 40,
        X: 10,
        IX: 9,
        V: 5,
        IV: 4,
        I: 1
    }
    let a: number
    for (const key in romanNumList) {
        a = Math.floor(number / romanNumList[key])
        if (a >= 0) {
            for (let i = 0; i < a; i++) {
                roman += key
            }
        }
        number = number % romanNumList[key]
    }
    return roman
}

const numberToAlpha = (number: number): string => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    let alpha = ""
    let a: number
    for (let i = 0; i < number; i++) {
        a = i % 26
        alpha += alphabet[a]
    }
    return alpha
}

export const displayNumber = (
    number: number,
    system?: string
): string | number => {
    if (system === "roman") {
        return numberToRoman(number)
    }
    if (system === "alpha") {
        return numberToAlpha(number)
    }
    return number
}
