document.getElementById('sliceBtn').addEventListener('click', () => {
    const configFileInput = document.getElementById('configFile');
    const pdfFileInput = document.getElementById('pdfFile');
    const outputDirInput = document.getElementById('outputDir');

    if (configFileInput.files.length === 0 || pdfFileInput.files.length === 0 || outputDirInput.files.length === 0) {
        alert('Please select a config file, a PDF file, and an output directory.');
        return;
    }

    const configFile = configFileInput.files[0].path;
    const pdfFile = pdfFileInput.files[0].path;
    const outputDir = outputDirInput.files[0].path;

    window.electronAPI.slicePdf({ configFile, pdfFile, outputDir }).then((response) => {
        console.log(response);
        alert('PDF slicing completed!');
    }).catch((error) => {
        console.error(error);
        alert('An error occurred while slicing the PDF.');
    });
});