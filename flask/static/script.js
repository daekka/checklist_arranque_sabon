document.getElementById('start-btn').addEventListener('click', async () => {
    const button = document.getElementById('start-btn');
    button.style.backgroundColor = 'green'; // Cambia el color del botón
    await fetch('/start', { method: 'POST' });
});

document.getElementById('stop-btn').addEventListener('click', async () => {
    const button = document.getElementById('start-btn');
    button.style.backgroundColor = ''; // Restaura el color original del botón
    await fetch('/stop', { method: 'POST' });
});

setInterval(async () => {
    const response = await fetch('/check_sequence', { method: 'POST' });
    const data = await response.json();

    if (data.phase_completed) {
        const phaseId = data.phase_completed;
        const values = data.values;

        const seqBox = document.getElementById(`seq-${phaseId}`);
        seqBox.classList.add('completed');
        seqBox.querySelector('.status').textContent = 'Completado';
        seqBox.querySelector('.end-time').textContent = new Date().toLocaleTimeString();

        // Mostrar los valores finales de las señales
        const signalsContainer = seqBox.querySelector('.signals');
        signalsContainer.innerHTML = Object.entries(values)
            .map(([signal, value]) => `<p>${signal}: ${value}</p>`)
            .join('');
    }
}, 1000);
