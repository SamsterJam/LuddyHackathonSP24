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

    wordInput.value = ''; // Clear the input field
}

function editWord(wordItem, wordText) {
    const newWord = prompt('Edit the word:', wordText.textContent);
    if (newWord !== null && newWord.trim() !== '') {
        wordText.textContent = newWord.trim();
    }
}

function deleteWord(wordItem) {
    if (confirm('Are you sure you want to delete this word?')) {
        wordItem.remove();
    }
}

document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);
document.getElementById('page-count').textContent = pdf.numPages;
document.getElementById('add-word').addEventListener('click', addWordToList);