let pdfDoc = null;
let pageNum = 1;
let pageIsRendering = false;
let pageNumIsPending = null;
let activeWord = null;

let pageWidth = 0;
let pageHeight = 0;

const words = {};
let currentScale = 1;

function renderPage(num) {
    pageIsRendering = true;

    // Get page
    pdfDoc.getPage(num).then(page => {
        const container = document.getElementById('pdf-viewer');
        container.style.display = 'flex';
        const containerWidth = container.clientWidth;

        // Calculate the scale based on the container width and the page width
        // Update the scale here
        const viewport = page.getViewport({ scale: currentScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Store the page dimensions
        pageWidth = viewport.width;
        pageHeight = viewport.height;

        // Render the PDF page into the canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        const renderTask = page.render(renderContext);

        currentScale = containerWidth / page.getViewport({ scale: 1 }).width;

        // Store the unscaled page dimensions
        pageWidth = page.getViewport({ scale: 1 }).width;
        pageHeight = page.getViewport({ scale: 1 }).height;

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


function updateBoundingBox(event) {
    const slider = event.target;
    const word = slider.dataset.word;
    const id = slider.id.split('-')[0]; // 'x1', 'y1', 'x2', or 'y2'
    const value = parseInt(slider.value, 10);

    if (!words[word]) {
        words[word] = [0, 0, 50, 50]; // Default bounding box if not set
    }

    const index = { 'x1': 0, 'y1': 1, 'x2': 2, 'y2': 3 }[id];
    words[word][index] = value * currentScale;

    if (activeWord === word) {
        renderPage(pageNum); // Redraw the page with the updated bounding box
    }
}

function drawBoundingBox(context) {
    if (!activeWord || !words[activeWord]) {
        return;
    }
    const boundingBox = words[activeWord];

    // Adjust the bounding box coordinates based on the current scale
    const scaledX = boundingBox[0] * currentScale;
    const scaledY = boundingBox[1] * currentScale; // Use the stored Y value directly
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

    window.electronAPI.setInputFile(file.path).then((response) => {
        console.log(response);
    }).catch((error) => {
        console.error(error);
        alert('An error occurred while saving the config.');
    });

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

    const deleteButton = document.createElement('button');
    deleteButton.innerHTML = '&#128465;'; // Trashcan icon
    deleteButton.className = 'delete-button';
    deleteButton.addEventListener('click', () => deleteWord(wordItem));

    wordActions.appendChild(deleteButton);

    wordItem.appendChild(wordText);

    const sliders = document.createElement('div');
    sliders.className = 'word-sliders';

    const createSlider = (id, min, max, value) => {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';

        const sliderLabel = document.createElement('label');
        sliderLabel.className = 'slider-label';
        sliderLabel.textContent = id.toUpperCase() + ': ';
        sliderLabel.setAttribute('for', id + '-slider'); // Associate the label with the slider

        const slider = document.createElement('input');
        slider.className = 'slider-input'; // Add class for styling
        slider.type = 'range';
        slider.id = id + '-slider';
        slider.min = min;
        slider.max = max;
        slider.value = value;
        slider.dataset.word = word;
        slider.addEventListener('input', updateBoundingBox);

        sliderContainer.appendChild(sliderLabel);
        sliderContainer.appendChild(slider);
        return sliderContainer;
    };


    // Initialize the bounding box with the new dimensions and position
    const centerX = pageWidth * 0.5;
    const centerY = pageHeight * 0.5;
    const boxWidth = pageWidth * 0.5; // Half the width of the page
    const boxHeight = pageHeight * 0.1; // A tenth of the height of the page
    words[word] = [
        centerX - boxWidth / 2, // x1
        centerY - boxHeight / 2, // y1
        centerX + boxWidth / 2, // x2
        centerY + boxHeight / 2, // y2
    ];

    // Use the unscaled PDF page dimensions for the sliders, adjusted by the current scale
    sliders.appendChild(createSlider('x1', 0, pageWidth / currentScale, (words[word][0] / currentScale)));
    sliders.appendChild(createSlider('y1', 0, pageHeight / currentScale, (words[word][1] / currentScale)));
    sliders.appendChild(createSlider('x2', 0, pageWidth / currentScale, (words[word][2] / currentScale)));
    sliders.appendChild(createSlider('y2', 0, pageHeight / currentScale, (words[word][3] / currentScale)));

    wordItem.appendChild(sliders);

    wordItem.appendChild(wordActions);

    wordList.appendChild(wordItem);

    setActiveWord(word, wordItem);

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


function onWindowResize() {
    // Only re-render the page if a PDF document has been loaded
    if (pdfDoc) {
        renderPage(pageNum);
    }
}

// Event handler for the "Generate Config" button
document.getElementById('generate-config').addEventListener('click', () => {
    window.electronAPI.saveBounds(words).then((response) => {
        console.log(response);
        alert('Config Saved!');
    }).catch((error) => {
        console.error(error);
        alert('An error occurred while saving the config.');
    });
});

document.getElementById('prev-page').addEventListener('click', showPrevPage);
document.getElementById('next-page').addEventListener('click', showNextPage);
document.getElementById('page-count').textContent = pdf.numPages;
document.getElementById('add-word').addEventListener('click', addWordToList);
window.addEventListener('resize', onWindowResize);