import {convertLatexToMathMl} from "mathlive"

function update() {
    const latex = (document.getElementById("latex") as HTMLTextAreaElement)
        .value
    let mathml = ""
    try {
        mathml = convertLatexToMathMl(latex)
    } catch (error) {
        mathml = String(error)
    }
    document.getElementById("output")!.textContent = mathml
    document.getElementById("rendered")!.innerHTML = mathml
}

document.getElementById("convert")!.addEventListener("click", update)
update()
