from flask import Flask, render_template, jsonify, request
import json
import time
from datetime import datetime

app = Flask(__name__)

# Simula la lectura de datos desde el sistema
def leer_datos_pi(signal_name):
    # Esta función debe implementarse para leer datos reales.
    # Por ahora, simularemos valores.
    import random
    return random.randint(0, 100)

# Cargar las secuencias desde el JSON
with open('sequences.json', 'r') as file:
    sequences = json.load(file)

# Variables globales
sequence_state = {
    "running": False,
    "start_time": None,
    "current_states": {seq["id"]: False for seq in sequences}
}

@app.route('/')
def index():
    return render_template('index.html', sequences=sequences)

@app.route('/start', methods=['POST'])
def start_sequence():
    global sequence_state
    sequence_state["running"] = True
    sequence_state["start_time"] = datetime.now().strftime('%H:%M:%S')
    sequence_state["current_states"] = {seq["id"]: False for seq in sequences}
    return jsonify({"status": "started"})

@app.route('/stop', methods=['POST'])
def stop_sequence():
    global sequence_state
    sequence_state["running"] = False
    sequence_state["current_states"] = {seq["id"]: False for seq in sequences}
    return jsonify({"status": "stopped"})

@app.route('/check_sequence', methods=['POST'])
def check_sequence():
    global sequence_state
    if not sequence_state["running"]:
        return jsonify({"status": "stopped"})

    for seq in sequences:
        # Si la fase ya está completada, continúa con la siguiente
        if sequence_state["current_states"].get(seq["id"], False):
            continue

        # Inicializa la hora de inicio si es la primera vez
        if "start_time" not in seq:
            seq["start_time"] = datetime.now().strftime('%H:%M:%S')

        # Si la fase tiene ramas paralelas
        if "branches" in seq:
            all_branches_completed = True
            branch_values = {}

            for branch in seq["branches"]:
                branch_id = branch["id"]

                # Si la rama ya está completada, pasa a la siguiente
                if sequence_state["current_states"].get(branch_id, False):
                    continue

                # Extrae y evalúa los valores de las señales
                values = extract_signal_values(branch["formula"])
                if eval_formula(branch["formula"], values):
                    sequence_state["current_states"][branch_id] = True
                    branch_values[branch_id] = values
                else:
                    all_branches_completed = False

            # Si no todas las ramas están completas, detén el proceso aquí
            if not all_branches_completed:
                return jsonify({"branch_values": branch_values})

            # Si todas las ramas están completas, marca la fase como completada
            seq["end_time"] = datetime.now().strftime('%H:%M:%S')
            sequence_state["current_states"][seq["id"]] = True
            return jsonify({"phase_completed": seq["id"], "values": branch_values})

        # Si no tiene ramas paralelas, evalúa la fórmula directamente
        elif "formula" in seq:
            # Extrae y evalúa los valores de las señales
            values = extract_signal_values(seq["formula"])
            if eval_formula(seq["formula"], values):
                seq["end_time"] = datetime.now().strftime('%H:%M:%S')
                sequence_state["current_states"][seq["id"]] = True
                return jsonify({"phase_completed": seq["id"], "values": values})

    return jsonify({"status": "completed"})


def extract_signal_values(formula):
    """Extrae los valores actuales de las señales."""
    components = formula.split(' ')
    values = {}
    for i in range(0, len(components), 4):  # Cada bloque representa una señal
        signal_name = components[i]
        values[signal_name] = leer_datos_pi(signal_name)
    return values


def eval_formula(formula, values):
    """Evalúa la fórmula dada usando los valores proporcionados."""
    conditions = formula.split(' ')
    i = 0
    result = True

    while i < len(conditions):
        signal_name = conditions[i]
        condition = conditions[i + 1]
        ref_value = float(conditions[i + 2])
        operator = conditions[i + 3] if i + 3 < len(conditions) else None

        signal_value = values.get(signal_name, None)

        # Si no hay un valor para la señal, algo está mal
        if signal_value is None:
            raise ValueError(f"No value found for signal: {signal_name}")

        # Evaluar la condición
        if condition == "=":
            result = result and (signal_value == ref_value)
        elif condition == "!=":
            result = result and (signal_value != ref_value)
        elif condition == ">":
            result = result and (signal_value > ref_value)
        elif condition == "<":
            result = result and (signal_value < ref_value)
        elif condition == ">=":
            result = result and (signal_value >= ref_value)
        elif condition == "<=":
            result = result and (signal_value <= ref_value)

        i += 4  # Avanzar al siguiente bloque
        if operator == "OR":
            result = result or True  # Reinicia si hay un OR

    return result


if __name__ == '__main__':
    app.run(debug=True)
