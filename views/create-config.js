let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
let activeWord = null;

const words = {};
let currentScale = 1; // Add this global variable

function renderPage(num) {
    pageIsRendering = true;

    // Get page
    pdfDoc.getPage(num).then(page => {
        const container = document.getElementById('pdf-viewer');
        container.style.display = 'flex';
        const containerWidth = container.clientWidth;

        // Calculate the scale based on the container width and the page width
        currentScale = containerWidth / page.getViewport({ scale: 1 }).width; // Update the scale here
        const viewport = page.getViewport({ scale: currentScale });
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

            // Draw the bounding box for the active word
            if (activeWord) {
                drawBoundingBox(context);
            }

            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });
    });

    // Update page counters
    document.getElementById('page-num').textContent = num;
}

function drawBoundingBox(context) {
    if (!activeWord || !words[activeWord]) {
        return;
    }
    const boundingBox = words[activeWord];

    // Adjust the bounding box coordinates based on the current scale
    const scaledX = boundingBox[0] * currentScale;
    const scaledY = boundingBox[1] * currentScale;
    const scaledWidth = (boundingBox[2] - boundingBox[0]) * currentScale;
    const scaledHeight = (boundingBox[3] - boundingBox[1]) * currentScale;

    context.beginPath();
    context.rect(scaledX, scaledY, scaledWidth, scaledHeight);
    context.strokeStyle = 'red';
    context.lineWidth = 2;
    context.stroke();
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
    
            // Add event listener for the "ADD" button here
            document.getElementById('add-word').addEventListener('click', addWordToList);
        }, reason => {
            console.error(reason);
        });
    };

    fileReader.readAsArrayBuffer(file);
});

document.getElementById('pdf-placeholder').addEventListener('click', () => {
    document.getElementById('file-input').click();
});

function addWordToList() {
    const wordInput = document.getElementById('word-input');
    const word = wordInput.value.trim();
    if (word === '') {
        alert('Please enter a word.');
        return;
    }

    const wordList = document.getElementById('word-list');
    const wordItem = document.createElement('div');
    wordItem.className = 'word-item';

    const wordText = document.createElement('span');
    wordText.className = 'word-text';
    wordText.textContent = word;

    const wordActions = document.createElement('div');
    wordActions.className = 'word-actions';

    const editButton = document.createElement('button');
    editButton.textContent = 'EDIT';
    editButton.addEventListener('click', () => editWord(wordItem, wordText));

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#128465;'; // Trashcan icon
    deleteButton.className = 'delete-button';
    deleteButton.addEventListener('click', () => deleteWord(wordItem));

    wordActions.appendChild(editButton);
    wordActions.appendChild(deleteButton);

    wordItem.appendChild(wordText);
    wordItem.appendChild(wordActions);

    wordList.appendChild(wordItem);

    // Add a static bounding box for debug
    words[word] = [0, 0, 50, 50];

    wordItem.addEventListener('click', () => {
        setActiveWord(word, wordItem);
    });

    wordInput.value = ''; // Clear the input field
}

function setActiveWord(word, wordItem) {
    // Deselect any previously active word items
    const wordList = document.getElementById('word-list');
    Array.from(wordList.getElementsByClassName('word-item')).forEach(item => {
        item.classList.remove('active');
    });

    // Set the active word item
    wordItem.classList.add('active');
    activeWord = word;

    // Redraw the current page to show the bounding box
    renderPage(pageNum);
}

function deleteWord(wordItem) {
    if (confirm('Are you sure you want to delete this word?')) {
        const wordText = wordItem.querySelector('.word-text').textContent;
        delete words[wordText]; // Remove the bounding box data
        if (activeWord === wordText) {
            activeWord = null; // Clear the active word
        }
        wordItem.remove();
        renderPage(pageNum); // Redraw the page without the bounding box
    }
}

function editWord(wordItem, wordText) {
    const newWord = prompt('Edit the word:', wordText.textContent);
    if (newWord !== null && newWord.trim() !== '') {
        wordText.textContent = newWord.trim();
    }
}


document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);
document.getElementById('page-count').textContent = pdf.numPages;
document.getElementById('add-word').addEventListener('click', addWordToList);