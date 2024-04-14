import { pdf } from "pdf-to-img";
import sharp from "sharp";
import Tesseract from "tesseract.js";

// Perform OCR on a specific region of each page of a PDF
// Returns an object with the page number as the key and the file type as the value
async function performOcrOnPdfRegion(pdfPath, x, y, width, height) {
    const filetypes = {};

    try {
        const images = await pdf(pdfPath);
        let it = 0;

        for await (const img of images) {
            const buffer = await sharp(img)
                .extract({ left: x, top: y, width: width, height: height })
                .toBuffer();

            const result = await Tesseract.recognize(buffer, 'eng');

            let text = result.data.text.toUpperCase();

            const keywords = ['COMPLAINT', 'SUMMONS', 'APPEARANCE'];
            text = text.split(/\s+/).filter(word => keywords.includes(word)).join(' ');

            if (text) filetypes[it +1] = text;

            it++;
        }
        console.log(filetypes);
        return filetypes;
    } catch (error) {
        console.error("Error processing PDF:", error);
        throw error;
    }
}

// TODO: Remove declarations and function call
const pdfPath = "123456.pdf";
const x = 200;  // Top left x-coordinate of the region
const y = 210;  // Top left y-coordinate of the region
const width = 210;  // Width of the region
const height = 40;  // Height of the region

performOcrOnPdfRegion(pdfPath, x, y, width, height)
    .catch(console.error);
