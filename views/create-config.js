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
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Render the PDF page into the canvas context
        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };
        const renderTask = page.render(renderContext);

        // Inside the renderTask.promise.then() callback in the renderPage function
        renderTask.promise.then(() => {
            // Clear the container before adding new content
            container.innerHTML = '';
            // Append the canvas to the PDF viewer container
            container.appendChild(canvas);

            // Create and append the red box with a transparent interior and red border
            const redBox = document.createElement('div');
            redBox.id = 'red-box';
            redBox.style.position = 'absolute';
            redBox.style.top = '10px'; // Initial position
            redBox.style.left = '10px'; // Initial position
            redBox.style.width = '100px'; // Width of the red box
            redBox.style.height = '50px'; // Height of the red box
            redBox.style.backgroundColor = 'transparent'; // Transparent interior
            redBox.style.border = '2px solid red'; // Red border
            redBox.style.cursor = 'move';
            redBox.style.boxSizing = 'border-box';
            container.appendChild(redBox);

            // Make the red box draggable and pass the scale
            makeDraggable(redBox, scale);

            // Update the flag indicating that the page is no longer rendering
            pageIsRendering = false;

            // Check if there is a pending page to render
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        }).catch(err => {
            // Handle errors that occur during the rendering process
            console.error(err);
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

function makeDraggable(element, scale) {
    let isDragging = false;
    let offsetX, offsetY;

    // Function to update the coordinates display
    function updateCoordinates() {
        const pdfViewer = document.getElementById('pdf-viewer');
        const pdfViewerRect = pdfViewer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        // Check if scale is a valid number
        if (isNaN(scale) || scale <= 0) {
            console.error('Invalid scale value:', scale);
            return;
        }

        // Calculate the position of the red box relative to the PDF viewer container
        const relativeTopLeftX = elementRect.left - pdfViewerRect.left;
        const relativeTopLeftY = elementRect.top - pdfViewerRect.top;
        const relativeBottomRightX = relativeTopLeftX + elementRect.width;
        const relativeBottomRightY = relativeTopLeftY + elementRect.height;

        // Normalize the coordinates based on the scale of the PDF
        const normalizedTopLeftX = (relativeTopLeftX / scale).toFixed(2);
        const normalizedTopLeftY = (relativeTopLeftY / scale).toFixed(2);
        const normalizedBottomRightX = (relativeBottomRightX / scale).toFixed(2);
        const normalizedBottomRightY = (relativeBottomRightY / scale).toFixed(2);

        // Update the text elements with the normalized coordinates
        document.getElementById('top-left-coords').textContent = `Top-Left: (${normalizedTopLeftX}, ${normalizedTopLeftY})`;
        document.getElementById('bottom-right-coords').textContent = `Bottom-Right: (${normalizedBottomRightX}, ${normalizedBottomRightY})`;
    }

    element.addEventListener('mousedown', function (e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        element.style.border = '2px dashed #f00'; // Optional: solid border on drag start
        updateCoordinates(); // Update coordinates when dragging starts
    });

    document.addEventListener('mousemove', function (e) {
        if (isDragging) {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            element.style.left = (mouseX - offsetX) + 'px';
            element.style.top = (mouseY - offsetY) + 'px';
            updateCoordinates(); // Update coordinates while dragging
        }
    });

    document.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false;
            element.style.border = '2px solid #f00'; // Optional: dashed border on drag end
            updateCoordinates(); // Update coordinates when dragging ends
        }
    });

    // Initial update of the coordinates when the page loads
    updateCoordinates();
}