const usuario_pi = "uf183530";
const password_pi = "nov2024";
const servidor_pi = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/";
const peticion_actual = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streamsets/";
const peticion_interpolado = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streams/";
const peticion_recorded = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streams/";
const peticion_info_tag = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/points/";


let sequences = [];
let signalValues = {}; // Valores actuales de las señales
let signalUpdateInterval; // Intervalo para actualizar señales
let currentSequenceIndex = 0;

// Configuración para la actualización periódica
const signalUpdateFrequency = 5000; // Frecuencia de actualización (ms)

// Cargar el sonido de beep
const beepSound = new Audio('beep.mp3'); // Asegúrate de tener un archivo de sonido en esta ruta
const errorSound = new Audio('error_2.wav'); // Asegúrate de tener un archivo de sonido en esta ruta

// Simular lectura de señales del hardware
function leer_datos_pi(requiredSignals = null) {
    console.log ("Señales PI:");
    console.log (requiredSignals);
    valor_actual = obtenerDatosPI_actual (requiredSignals);
    // Valores simulados de señales
    let valores = {};
    
    // Si se especifican señales requeridas, solo generar esas
    if (requiredSignals) {
        requiredSignals.forEach(signal => {
            valores[signal] = Math.floor(Math.random() * 11); // Genera valores entre 0 y 10
        });
    } else {
        // Si no hay señales requeridas, generar algunas por defecto
        valores = {

        };
    }
    
    signalValues = valores;
    return valores;
}

// Nueva función para extraer señales de una fórmula
function extractSignalsFromFormula(formula) {
    const signals = formula.match(/[\w.]+(?=\s*(>=|<=|=|!=|>|<))/g) || [];
    return [...new Set(signals)]; // Eliminar duplicados
}



// Parse the formula and evaluate the condition
function evaluateFormula(formula, frozenValues = null) {
    const valuesToUse = frozenValues || signalValues;
    const conditions = formula.split(/(AND|OR)/);
    let result = null;

    // Evaluar cada condición individual
    for (let i = 0; i < conditions.length; i += 2) {
        const condition = conditions[i].trim();
        const [signal, operator, value] = condition.match(/([\w.]+)\s*(>=|<=|=|!=|>|<)\s*(\d+)/).slice(1);

        const signalValue = valuesToUse[signal];
        let conditionResult = false;

        switch (operator) {
            case '=': conditionResult = signalValue == value; break;
            case '!=': conditionResult = signalValue != value; break;
            case '>': conditionResult = signalValue > value; break;
            case '<': conditionResult = signalValue < value; break;
            case '>=': conditionResult = signalValue >= value; break;
            case '<=': conditionResult = signalValue <= value; break;
        }


        // Actualizar el icono de estado y el valor actual
        const conditionElements = document.querySelectorAll(`.condition[data-signal="${signal}"][data-operator="${operator}"][data-value="${value}"]`);
        conditionElements.forEach(element => {
            const statusIcon = element.querySelector('.status-icon');
            statusIcon.textContent = `${conditionResult ? '✅' : '❌'} (${signalValue})`;
        });

        if (i === 0) {
            result = conditionResult;
        } else {
            const operatorLogic = conditions[i - 1].trim();
            result = operatorLogic === 'AND' ? result && conditionResult : result || conditionResult;
        }
    }

    return result;
}

// Load sequences from a JSON file
async function loadSequences(jsonFile = null) {
    try {
        if (jsonFile) {
            // Cargar desde archivo subido
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    sequences = JSON.parse(e.target.result);
                    renderSequences();
                } catch (error) {
                    alert('Error al parsear el archivo JSON: ' + error.message);
                }
            };
            reader.readAsText(jsonFile);
        } else {
            // Limpiar secuencias si no hay archivo
            sequences = [];
            renderSequences();
        }
    } catch (error) {
        console.error('Error al cargar secuencias:', error);
        sequences = [];
        renderSequences();
    }
}

// Render sequences to the DOM
function renderSequences() {
    const container = document.getElementById('sequence-container');
    container.innerHTML = '';

    sequences.forEach((sequence, seqIndex) => {
        const branchesHtml = sequence.branches.map((branch, branchIndex) => `
            <div class="branch" data-branch="${branchIndex}">
                <h3>${branch.id}</h3>
                ${branch.sequences.map((subSequence, subIndex) => {
                    // Dividir la fórmula en condiciones individuales
                    const conditions = subSequence.formula.split(/(AND|OR)/).map(part => part.trim());
                    const formulaHtml = conditions.map((condition, idx) => {
                        if (condition === 'AND' || condition === 'OR') {
                            return `<div class="operator">${condition}</div>`;
                        } else {
                            const [signal, operator, value] = condition.match(/([\w.]+)\s*(=|!=|>|<|>=|<=)\s*(\d+)/).slice(1);
                            return `
                                <div class="condition" data-signal="${signal}" data-operator="${operator}" data-value="${value}">
                                    <span class="status-icon">🕓</span> <!-- Se actualizará dinámicamente -->
                                    ${signal} ${operator} ${value}
                                </div>
                            `;
                        }
                    }).join('');

                    return `
                        <div class="sub-sequence" data-subsequence="${subIndex}">
                            <div class="formula-container">
                                ${formulaHtml}
                            </div>
                            <button class="complete-button" style="display: none;">Completar manualmente</button>
                            <div class="timestamp-container" id="timestamp-${seqIndex}-${branchIndex}-${subIndex}">
                                <div class="timestamp-line">Inicio: --</div>
                                <div class="timestamp-line">Fin: --</div>
                                <div class="timestamp-line">Duración: --</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `).join('');

        const box = `
            <div class="sequence-box" data-index="${seqIndex}">
                <h2>${sequence.id}</h2>
                <div class="branch-container">
                    ${branchesHtml}
                </div>
            </div>
        `;

        container.innerHTML += box;
    });
}

let isUpdatingSignals = false; // Variable de bloqueo

function updateSignalValues(requiredSignals = null) {
    if (isUpdatingSignals) return;
    isUpdatingSignals = true;
    //console.log("Actualizando señales");
    //console.log(requiredSignals);
    
    // Solo leer las señales requeridas
    if (requiredSignals) {
        leer_datos_pi(requiredSignals);
    }

    isUpdatingSignals = false;
}


// Iniciar la ejecución de la secuencia
function startSequence() {
    if (currentSequenceIndex >= sequences.length) return;

    const sequence = sequences[currentSequenceIndex];
    const branches = sequence.branches;

    let completedBranches = 0;
    
    branches.forEach((branch, branchIndex) => {
        let currentSubSequenceIndex = 0;
        
        function processSubSequence() {
            if (currentSubSequenceIndex >= branch.sequences.length) {
                completedBranches++;
                if (completedBranches === branches.length) {
                    const sequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"]`);
                    sequenceBox.classList.add('complete');
                    currentSequenceIndex++;
                    // Reproducir beep si la condición se cumple
                    beepSound.play(); // Reproducir el sonido

                    startSequence();
                }
                return;
            }

            const subSequence = branch.sequences[currentSubSequenceIndex];
            const subSequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"] .branch[data-branch="${branchIndex}"] .sub-sequence[data-subsequence="${currentSubSequenceIndex}"]`);
            const timestamp = document.getElementById(`timestamp-${currentSequenceIndex}-${branchIndex}-${currentSubSequenceIndex}`);
            const completeButton = subSequenceBox.querySelector('.complete-button');
            
            // Mostrar el botón para la subsecuencia actual
            completeButton.style.display = 'block';
            
            const startTime = new Date();
            timestamp.children[0].textContent = `Inicio: ${startTime.toLocaleTimeString()}`;
            timestamp.children[1].textContent = 'Fin: --';
            timestamp.children[2].textContent = 'Duración: --';

            let frozenValues = null;
            const interval = setInterval(() => {
                const requiredSignals = extractSignalsFromFormula(subSequence.formula);
                updateSignalValues(requiredSignals);
                
                const formulaResult = evaluateFormula(subSequence.formula, frozenValues);
                
                // Verificar el tiempo de ejecución en tiempo real
                const currentTime = new Date();
                const timeDiff = formatTimeDifference(startTime, currentTime);
                const timeDiffSeconds = (currentTime - startTime)/1000;
                const expectedDuration = subSequence.tiempo_alarma; // Asegúrate de que el JSON tenga esta propiedad

                // Actualizar el campo de duración
                timestamp.children[2].textContent = `Duración: ${timeDiff}`;

                // Comprobar si el tiempo de ejecución supera el tiempo del JSON
                console.log (expectedDuration, timeDiffSeconds);
                if (timeDiffSeconds > expectedDuration) {
                    
                    // Esta condición verifica si el tiempo de duración esperado es mayor que el tiempo de duración real.
                    const warningMessage = document.createElement('span');
                    warningMessage.textContent = '⚠️ Advertencia: Tiempo de ejecución excedido';
                    warningMessage.style.color = 'red';

                    // Limpiar mensajes de advertencia anteriores
                    const existingWarning = timestamp.children[2].querySelector('span');
                    if (existingWarning) {
                        existingWarning.remove();
                    }

                    timestamp.children[2].appendChild(warningMessage);
                    errorSound.play(); // Reproducir el sonido
                } else {
                    // Limpiar mensaje de advertencia si el tiempo es aceptable
                    const existingWarning = timestamp.children[2].querySelector('span');
                    if (existingWarning) {
                        existingWarning.remove();
                    }
                }

                if (formulaResult) {
                    completeSubSequence();
                }
            }, 5000);

            // Función para completar la subsecuencia
            function completeSubSequence(isManual = false) {
                if (!frozenValues) {
                    frozenValues = { ...signalValues };
                    clearInterval(interval);
                    
                    completeButton.style.display = 'none';
                    
                    setTimeout(() => {
                        const endTime = new Date();
                        const timeDiff = formatTimeDifference(startTime, endTime);
                        const completionType = isManual ? '[Completado manualmente]' : '';
                        timestamp.children[0].textContent = `Inicio: ${startTime.toLocaleTimeString()}`;
                        timestamp.children[1].textContent = `Fin: ${endTime.toLocaleTimeString()}`;
                        timestamp.children[2].textContent = `Duración: ${timeDiff} ${completionType}`;
                        subSequenceBox.classList.add('complete');
                        if (isManual) {
                            subSequenceBox.classList.add('manual-complete');
                        }

                        // Comprobar si el tiempo de ejecución supera el tiempo del JSON
                        const expectedDuration = subSequence.tiempo_alarma; // Asegúrate de que el JSON tenga esta propiedad
                        if (expectedDuration && timeDiff > expectedDuration) {
                            const warningMessage = document.createElement('span');
                            warningMessage.textContent = '⚠️ Advertencia: Tiempo de ejecución excedido';
                            warningMessage.style.color = 'red';
                            timestamp.children[2].appendChild(warningMessage);
                        }

                        currentSubSequenceIndex++;
                        processSubSequence();
                    }, subSequence.delay);
                }
            }

            // Agregar el evento click al botón
            completeButton.onclick = () => {
                completeSubSequence(true);
            };
        }

        processSubSequence();
    });
}


// Reset sequences
function resetSequences() {
    clearInterval(signalUpdateInterval); // Detener la actualización de señales
    currentSequenceIndex = 0;
    renderSequences();
    startSignalUpdate(); // Reiniciar la actualización de señales
}

// Start updating signals periodically
function startSignalUpdate() {
    updateSignalValues(); // Llamar inmediatamente para actualizar la primera vez
    //signalUpdateInterval = setInterval(updateSignalValues, signalUpdateFrequency);
}

// Event listeners
document.getElementById('start').addEventListener('click', () => {
    // Cambiar el color del botón a verde
    const startButton = document.getElementById('start');
    startButton.style.backgroundColor = 'green'; // Cambiar color a verde
    startButton.textContent = 'Arrancado'; // Cambiar el texto a "Arrancado"

    if (sequences.length === 0) {
        alert('Por favor, carga un archivo de secuencias primero');
        return;
    }
    startSequence();
    startSignalUpdate();
});
document.getElementById('reset').addEventListener('click', resetSequences);
document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadSequences(file);
    }
});

// Load sequences on page load
loadSequences();

// Función auxiliar para formatear la diferencia de tiempo
function formatTimeDifference(startTime, endTime) {
    const diff = endTime - startTime;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
        return `${seconds} segundos`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} minutos ${remainingSeconds} segundos`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours} horas ${minutes} minutos ${remainingSeconds} segundos`;
    }
}



async function obtenerDatosPI_actual(tag) {
    console.log("Lanza petición a PIWEBAPI - Recorded");
    console.log (tag);
    const tagName = btoa("?PÏUWGEPI\\SAB:" + tag);
    console.log (tagName);
    try {
        
        //https://pvgenpiweb01.intranet.gasnaturalfenosa.com/piwebapi/streams/P1DPVVdHRVBJXFNBQjpTMS5TU0ZWX09VVA==/recorded'
        //console.log(`${peticion_recorded}${tagName}/recorded?filterexpression=${filterexpression}?startTime=${startTime}&endTime=${endTime}`);
        //const response = await fetch(`${peticion_recorded}${tagName}/recorded?filterexpression=${filterexpression}&startTime=${startTime}&endTime=${endTime}`, {
            
        //https://MyPIWebAPIServer/piwebapi/streamsets/value?webid=xxx&webid=yyy...

        //const response = await fetch(`${peticion_actual}${tagName}/value`, {
        const response = await fetch(`${peticion_actual}/value?webid=${tagName}`, {
            method: 'GET',
            headers: {
                'Authorization': 'Basic ' + btoa(usuario_pi + ':' + password_pi),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error en la solicitud a PI Web API:', error);
        }
        
        const data = await response.json();

        const resultados = data.Items.map(item => ({
            //timestamp: item.Timestamp,
            value: item.Value,
            //fechahora: item.Timestamp.split('T')[0] + " " + item.Timestamp.split('T')[1].split('.')[0]
        }));
        console.log("Consulta resuelta");
        
        console.log(resultados[0].value.Value);
        return resultados[0].value.Value;

    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}
