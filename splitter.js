import {PDFDocument, StandardFonts} from 'pdf-lib'
import * as fs from "node:fs";
import * as path from "node:path";

function splitPDF(pages, pdfPath){
    fs.readFile(pdfPath, async (error, existingPdfBytes) => {
        try{
            const pdfDoc = await PDFDocument.load(existingPdfBytes)
            const terms = Object.values(pages)

            let currentSpliceDoc = null
            let splicedDocs = {}


            for (const term of terms) {
                if(!splicedDocs.hasOwnProperty(term)){
                    splicedDocs[term] = await PDFDocument.create()
                    const page = splicedDocs[term].addPage([612, 792])
                    const {width, height} = page.getSize()
                    let fontSize = 30
                    const text = term
                    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)

                    const textWidth = font.widthOfTextAtSize(text, fontSize)
                    if(textWidth > width){
                        fontSize = (width / 2) * 30 / textWidth
                    }
                    page.drawText(term, {
                        x: width / 2 - textWidth / 2,
                        y: height / 2,
                        size: fontSize,
                        font: font
                    })
                }
            }


            for(let i = 0; i < pdfDoc.getPages().length; i++){
                if(pages.hasOwnProperty(i + 1)){ //Changing document to splice to
                    currentSpliceDoc = pages[i + 1]
                }
                if(currentSpliceDoc == null){
                    continue
                }

                const doc = splicedDocs[currentSpliceDoc]

                const [copiedPage] = await doc.copyPages(pdfDoc, [i])
                doc.addPage(copiedPage)

                console.log(`${currentSpliceDoc} ${i + 1}`)
            }

            for (const key of Object.keys(splicedDocs)) {
                let path = createOutDirectoryAndReturnNewPath(pdfPath)
                console.log(path)
                path = path.replace('.pdf', `_${key}.pdf`)
                console.log(path)
                await savePDF(path, splicedDocs[key])
            }
        } catch (loadError) {
            console.error("Error loading or processing PDF document:", loadError)
        }
    })
}

function createOutDirectoryAndReturnNewPath(filePath) {
    const directoryPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    const outDirectory = path.join(directoryPath, 'out');

    // Create the /out/ directory if it doesn't exist
    fs.mkdir(outDirectory, { recursive: true }, (err) => {
        if (err) {
            console.error('Error creating /out/ directory:', err);
            return;
        }

        // Generate the new file path in the /out/ directory
        // const newFilePath = path.join(outDirectory, fileName);
    });

    return path.join(outDirectory, fileName);
}

async function savePDF(path, pdf){
    const pdfBytes = await pdf.save() // Await for saving the new document

    fs.writeFile(path, pdfBytes, (writeError) => {
        if (writeError) {
            console.error("Error writing PDF to file:", writeError)
        } else {
            console.log("PDF file saved successfully:", path)
        }
    })
}

//TODO: Remove test code and 123456.pdf
const pages = {
    1: "COMPLAINTS",
    4: "SUMMONS",
    5: "APPEARANCE"}
splitPDF(pages, "123456.pdf")
