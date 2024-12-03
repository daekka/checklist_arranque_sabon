const fileInput = document.getElementById('jsonFileInput');
const fileLabel = document.querySelector('.file-label');
const fileName = document.querySelector('.file-name');

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileName.textContent = file.name;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                sequences = JSON.parse(e.target.result);
                resetSequences();
                renderSequences();
            } catch (error) {
                alert('Error al leer el archivo JSON. Asegúrate de que el formato sea correcto.');
            }
        };
        reader.readAsText(file);
    }
});

// Soporte para drag and drop
fileLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileLabel.classList.add('drag-over');
});

fileLabel.addEventListener('dragleave', () => {
    fileLabel.classList.remove('drag-over');
});

fileLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    fileLabel.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        const event = new Event('change');
        fileInput.dispatchEvent(event);
    }
}); 