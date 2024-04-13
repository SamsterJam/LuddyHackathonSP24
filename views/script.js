let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;

function renderPage(num) {
    pageIsRendering = true;

    // Get page
    pdfDoc.getPage(num).then(page => {
        const container = document.getElementById('pdf-viewer');
        container.style.display = 'flex';
        const containerWidth = container.clientWidth;

        // Calculate the scale based on the container width and the page width
        const scale = containerWidth / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render the PDF page into the canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(() => {
            container.innerHTML = '';
            container.appendChild(canvas);
            pageIsRendering = false;

            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
    });

    // Update page counters
    document.getElementById('page-num').textContent = num;
}

function queueRenderPage(num) {
    if (pageIsRendering) {
        pageNumIsPending = num;
    } else {
        renderPage(num);
    }
}

function showPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
}

function showNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
}

document.getElementById('file-input').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error(file.name, 'is not a PDF file.');
        return;
    }

    // Hide the placeholder
    document.getElementById('pdf-placeholder').style.display = 'none';

    const fileReader = new FileReader();

    fileReader.onload = function () {
        const typedarray = new Uint8Array(this.result);

        pdfjsLib.getDocument({ data: typedarray }).promise.then(pdf => {
            pdfDoc = pdf;
            document.getElementById('page-count').textContent = pdf.numPages;

            // Show the PDF viewer, navigation arrows, and page info
            document.getElementById('pdf-viewer').style.display = 'flex';
            document.querySelector('.pdf-navigation').style.display = 'flex';
            document.getElementById('page-info').style.display = 'block';

            document.getElementById('prev-page').disabled = false;
            document.getElementById('next-page').disabled = false;
            renderPage(pageNum);
        }, reason => {
            console.error(reason);
        });
    };

    fileReader.readAsArrayBuffer(file);
});

document.getElementById('pdf-placeholder').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);
document.getElementById('page-count').textContent = pdf.numPages;