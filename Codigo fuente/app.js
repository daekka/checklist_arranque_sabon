let sequences = [];
let signalValues = {}; // Valores actuales de las señales
let signalUpdateInterval; // Intervalo para actualizar señales
let currentSequenceIndex = 0;

// Configuración para la actualización periódica
const signalUpdateFrequency = 5000; // Frecuencia de actualización (ms)

// Simular lectura de señales del hardware
function leer_datos_pi(requiredSignals = null) {
    // Valores simulados de señales
    let valores = {};
    
    // Si se especifican señales requeridas, solo generar esas
    if (requiredSignals) {
        requiredSignals.forEach(signal => {
            if (signal.startsWith('signal')) {
                // Generar valores aleatorios según el tipo de señal
                if (signal === 'signal1') {
                    valores[signal] = Math.random() > 0.5 ? 1 : 0;
                } else {
                    valores[signal] = Math.floor(Math.random() * 10);
                }
            }
        });
    } else {
        // Si no hay señales requeridas, generar todas
        valores = {
            signal1: Math.random() > 0.5 ? 1 : 0,
            signal2: Math.floor(Math.random() * 10),
            signal3: Math.floor(Math.random() * 10)
        };
    }
    
    signalValues = valores;
    return valores;
}

// Nueva función para extraer señales de una fórmula
function extractSignalsFromFormula(formula) {
    const signals = formula.match(/\w+(?=\s*[=><!])/g) || [];
    return [...new Set(signals)]; // Eliminar duplicados
}


// Parse the formula and evaluate the condition
function evaluateFormula(formula, frozenValues = null) {
    // const valuesToUse = frozenValues || signalValues; // Use frozen values or current values
    const valuesToUse = signalValues;
    const conditions = formula.split(/(AND|OR)/);
    let result = null;

    for (let i = 0; i < conditions.length; i += 2) {
        const [signal, operator, value] = conditions[i].trim().match(/(\w+)\s*(=|!=|>|<)\s*(\d+)/).slice(1);

        const signalValue = valuesToUse[signal];
        console.log (valuesToUse);
        console.log (signalValue);
        let conditionResult = false;

        switch (operator) {
            case '=': conditionResult = signalValue == value; break;
            case '!=': conditionResult = signalValue != value; break;
            case '>': conditionResult = signalValue > value; break;
            case '<': conditionResult = signalValue < value; break;
        }
        console.log (conditionResult);
        if (i === 0) {
            result = conditionResult;
        } else {
            const operatorLogic = conditions[i - 1].trim();
            result = operatorLogic === 'AND' ? result && conditionResult : result || conditionResult;
        }
    }
    console.log ("------------------------------");
    return result;
}

// Load sequences from a JSON file
async function loadSequences() {
    const response = await fetch('sequences.json');
    sequences = await response.json();
    renderSequences();
}

// Render sequences to the DOM
function renderSequences() {
    const container = document.getElementById('sequence-container');
    container.innerHTML = '';

    sequences.forEach((sequence, seqIndex) => {
        const branchesHtml = sequence.branches.map((branch, branchIndex) => `
            <div class="branch" data-branch="${branchIndex}">
                <h3>Rama ${branch.id}</h3>
                ${branch.sequences.map((subSequence, subIndex) => `
                    <div class="sub-sequence" data-subsequence="${subIndex}">
                        <div class="signal">Fórmula: ${subSequence.formula}</div>
                        <div id="signals-${seqIndex}-${branchIndex}-${subIndex}" class="signal-values">
                            <!-- Valores de señales -->
                        </div>
                        <div class="timestamp" id="timestamp-${seqIndex}-${branchIndex}-${subIndex}">Inicio: -- | Fin: --</div>
                    </div>
                `).join('')}
            </div>
        `).join('');

        const box = `
            <div class="sequence-box" data-index="${seqIndex}">
                <h2>Secuencia ${sequence.id}</h2>
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
    console.log("Actualizando señales");
    console.log(requiredSignals);
    
    // Solo leer las señales requeridas
    if (requiredSignals) {
        leer_datos_pi(requiredSignals); // Pasar las señales requeridas como parámetro
    }

    sequences.forEach((sequence, seqIndex) => {
        sequence.branches.forEach((branch, branchIndex) => {
            branch.sequences.forEach((subSequence, subIndex) => {
                const signalContainer = document.getElementById(`signals-${seqIndex}-${branchIndex}-${subIndex}`);
                const signals = requiredSignals || subSequence.formula.match(/\w+(?=\s*[=><!])/g);
                const signalValuesToDisplay = signals.map(signal => `${signal}: ${signalValues[signal]}`);

                if (!signalContainer.dataset.fixed) {
                    signalContainer.innerHTML = signalValuesToDisplay.map(value => `<div>${value}</div>`).join('');
                }
            });
        });
    });

    isUpdatingSignals = false;
}



// Start the sequence execution
function startSequence_old() {
    if (currentSequenceIndex >= sequences.length) return;

    const sequence = sequences[currentSequenceIndex];
    const branches = sequence.branches;

    const branchPromises = branches.map((branch, branchIndex) => {
        return new Promise(resolveBranch => {
            let currentSubSequenceIndex = 0;

            function processSubSequence() {
                if (currentSubSequenceIndex >= branch.sequences.length) {
                    resolveBranch(); // Rama completada
                    return;
                }

                const subSequence = branch.sequences[currentSubSequenceIndex];
                const subSequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"] .branch[data-branch="${branchIndex}"] .sub-sequence[data-subsequence="${currentSubSequenceIndex}"]`);
                const timestamp = document.getElementById(`timestamp-${currentSequenceIndex}-${branchIndex}-${currentSubSequenceIndex}`);
                const signalContainer = document.getElementById(`signals-${currentSequenceIndex}-${branchIndex}-${currentSubSequenceIndex}`);

                const startTime = new Date();
                timestamp.textContent = `Inicio: ${startTime.toLocaleTimeString()} | Fin: --`;

                const frozenValues = { ...signalValues }; // Congelar valores actuales
                const interval = setInterval(() => {

                    updateSignalValues();
                    if (evaluateFormula(subSequence.formula, frozenValues)) {
                        clearInterval(interval);

                        // Marcar contenedor como fijo
                        signalContainer.dataset.fixed = true;
                        const fixedSignalValues = Object.keys(frozenValues).map(signal => `${signal}: ${frozenValues[signal]}`);
                        signalContainer.innerHTML = fixedSignalValues.map(value => `<div>${value}</div>`).join('');

                        setTimeout(() => {
                            const endTime = new Date();
                            timestamp.textContent = `Inicio: ${startTime.toLocaleTimeString()} | Fin: ${endTime.toLocaleTimeString()}`;
                            subSequenceBox.classList.add('complete');
                            currentSubSequenceIndex++;
                            processSubSequence(); // Procesar siguiente subsecuencia
                        }, subSequence.delay);
                    }
                }, 10000); // Control estricto del intervalo
            }

            processSubSequence(); // Inicia la primera subsecuencia
        });
    });

    Promise.all(branchPromises).then(() => {
        const sequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"]`);
        sequenceBox.classList.add('complete');
        currentSequenceIndex++;
        startSequence();
    });
}


// Iniciar la ejecución de la secuencia
function startSequence() {
    if (currentSequenceIndex >= sequences.length) return;

    const sequence = sequences[currentSequenceIndex];
    const branches = sequence.branches;

    let completedBranches = 0;
    console.log(branches);
    branches.forEach((branch, branchIndex) => {
        let currentSubSequenceIndex = 0;
        console.log(branch);
        function processSubSequence() {
            if (currentSubSequenceIndex >= branch.sequences.length) {
                completedBranches++;
                if (completedBranches === branches.length) {
                    const sequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"]`);
                    sequenceBox.classList.add('complete');
                    currentSequenceIndex++;
                    startSequence();
                }
                return;
            }

            const subSequence = branch.sequences[currentSubSequenceIndex];
            const subSequenceBox = document.querySelector(`.sequence-box[data-index="${currentSequenceIndex}"] .branch[data-branch="${branchIndex}"] .sub-sequence[data-subsequence="${currentSubSequenceIndex}"]`);
            const timestamp = document.getElementById(`timestamp-${currentSequenceIndex}-${branchIndex}-${currentSubSequenceIndex}`);
            const signalContainer = document.getElementById(`signals-${currentSequenceIndex}-${branchIndex}-${currentSubSequenceIndex}`);

            const startTime = new Date();
            timestamp.textContent = `Inicio: ${startTime.toLocaleTimeString()} | Fin: --`;

            const frozenValues = { ...signalValues }; // Congelar valores actuales
            const interval = setInterval(() => {
                console.log(subSequence);
                const requiredSignals = extractSignalsFromFormula(subSequence.formula);
                console.log("Señales requeridas:", requiredSignals);
                updateSignalValues(requiredSignals);
                if (evaluateFormula(subSequence.formula, frozenValues)) {
                    clearInterval(interval);

                    // Marcar contenedor como fijo
                    signalContainer.dataset.fixed = true;
                    const fixedSignalValues = Object.keys(frozenValues).map(signal => `${signal}: ${frozenValues[signal]}`);
                    signalContainer.innerHTML = fixedSignalValues.map(value => `<div>${value}</div>`).join('');

                    setTimeout(() => {
                        const endTime = new Date();
                        timestamp.textContent = `Inicio: ${startTime.toLocaleTimeString()} | Fin: ${endTime.toLocaleTimeString()}`;
                        subSequenceBox.classList.add('complete');
                        currentSubSequenceIndex++;
                        processSubSequence(); // Procesar siguiente subsecuencia
                    }, subSequence.delay);
                }
            }, 5000); // Control estricto del intervalo
        }

        processSubSequence(); // Inicia la primera subsecuencia
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
    startSequence();
    startSignalUpdate();
});
document.getElementById('reset').addEventListener('click', resetSequences);

// Load sequences on page load
loadSequences();
