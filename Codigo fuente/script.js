const signals = {}; // Almacén de señales con sus valores actuales
const refreshInterval = 5000; // Intervalo de actualización en milisegundos

// Simula la función "lee_datos_PI"
function lee_datos_PI(signalName) {
  // Aquí deberías implementar la lógica real para leer señales desde el sistema.
  // Este ejemplo devuelve un valor aleatorio para simular las actualizaciones.
  return Math.random() * 100;
}

// Actualiza las señales periódicamente
function actualizarSenales() {
  for (const signalName in signals) {
    signals[signalName] = lee_datos_PI(signalName);
  }
}

// Inicializa las señales en el almacén
function inicializarSenales(sequence) {
  sequence.forEach(step => {
    if (step.conditions) {
      step.conditions.forEach(condition => {
        if (!signals[condition.signal]) {
          signals[condition.signal] = lee_datos_PI(condition.signal);
        }
      });
    }

    if (step.parallel) {
      step.parallel.flat().forEach(branchStep => {
        branchStep.conditions.forEach(condition => {
          if (!signals[condition.signal]) {
            signals[condition.signal] = lee_datos_PI(condition.signal);
          }
        });
      });
    }
  });
}

// Comprueba condiciones en función de las señales actualizadas
function checkCondition(signalName, condition) {
  const value = signals[signalName];
  const { operator, target } = condition;
  switch (operator) {
    case '>': return value > target;
    case '<': return value < target;
    case '>=': return value >= target;
    case '<=': return value <= target;
    case '==': return value === target;
    case '!=': return value !== target;
    default: throw new Error(`Operador no soportado: ${operator}`);
  }
}

// Renderiza las condiciones de un paso
function renderConditions(conditions) {
  return conditions
    .map(condition => `${condition.signal} ${condition.operator} ${condition.target}`)
    .join(', ');
}

// Renderiza un paso individual
function renderStep(step, container) {
  const stepElement = document.createElement('div');
  stepElement.className = 'step';

  const title = document.createElement('h3');
  title.textContent = step.name;
  stepElement.appendChild(title);

  const conditions = document.createElement('div');
  conditions.className = 'conditions';
  conditions.textContent = `Condiciones: ${renderConditions(step.conditions || [])}`;
  stepElement.appendChild(conditions);

  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = 'Pendiente';
  step.statusElement = status;
  step.stepElement = stepElement; // Vincula el elemento del paso al objeto
  stepElement.appendChild(status);

  container.appendChild(stepElement);
}

// Renderiza un conjunto de pasos paralelos
function renderParallel(steps, container) {
  const parallelContainer = document.createElement('div');
  parallelContainer.className = 'parallel-container';

  steps.forEach(branch => {
    const branchContainer = document.createElement('div');
    branchContainer.className = 'branch';

    branch.forEach(step => renderStep(step, branchContainer));
    parallelContainer.appendChild(branchContainer);
  });

  container.appendChild(parallelContainer);
}

// Ejecuta un paso individual
async function runSingleStep(step) {
  const { conditions, duration } = step;

  // Evalúa las condiciones en función de las señales actuales
  const conditionsMet = conditions.every(condition =>
    checkCondition(condition.signal, condition)
  );

  if (conditionsMet) {
    const startTime = new Date();
    step.statusElement.textContent = `Inicio: ${startTime.toLocaleTimeString()}`;
    step.stepElement.style.backgroundColor = 'green'; // Cambia el color de fondo a verde

    // Simula duración del paso
    await new Promise(resolve => setTimeout(resolve, duration));

    const endTime = new Date();
    step.statusElement.textContent = `Completado: ${endTime.toLocaleTimeString()}`;
  } else {
    step.statusElement.textContent = 'No cumplido';
    step.stepElement.style.backgroundColor = ''; // Restaura el color original
  }
}

// Ejecuta pasos paralelos
async function runParallel(steps) {
  const branchPromises = steps.map(branch =>
    branch.reduce(async (previous, step) => {
      await previous;
      return runSingleStep(step);
    }, Promise.resolve())
  );

  await Promise.all(branchPromises);
}

// Procesa y ejecuta pasos en la secuencia principal
async function runSequence(sequence) {
  for (const step of sequence) {
    if (step.parallel) {
      await runParallel(step.parallel);
    } else {
      await runSingleStep(step);
    }
  }
}

// Renderiza todos los pasos de la secuencia
function renderSequence(sequence, container) {
  sequence.forEach(step => {
    if (step.parallel) {
      renderParallel(step.parallel, container);
    } else {
      renderStep(step, container);
    }
  });
}

// Carga las secuencias desde un archivo o fuente
async function loadSequences() {
  const response = await fetch('sequences.json');
  const sequences = await response.json();
  return sequences;
}

// Inicializa la visualización
async function init() {
  const sequences = await loadSequences();
  const container = document.getElementById('sequence-container');

  sequences.forEach(sequence => {
    const sequenceContainer = document.createElement('div');
    sequenceContainer.className = 'sequence';

    const title = document.createElement('h2');
    title.textContent = sequence.name;
    sequenceContainer.appendChild(title);

    renderSequence(sequence.steps, sequenceContainer);
    container.appendChild(sequenceContainer);

    inicializarSenales(sequence.steps); // Inicializa las señales
    runSequence(sequence.steps); // Ejecuta la secuencia
  });

  // Configura el intervalo para actualizar señales
  setInterval(actualizarSenales, refreshInterval);
}

init();
