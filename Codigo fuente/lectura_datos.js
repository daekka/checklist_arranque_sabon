const usuario_pi = "uf183530";
const password_pi = "nov2024";
const servidor_pi = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/";
const peticion_actual = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streamsets/";
const peticion_interpolado = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streams/";
const peticion_recorded = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/streams/";
const peticion_info_tag = "https://azpgenpivisio01.intranet.gasnaturalfenosa.com/piwebapi/points/";


// leer_datos
export function leer_datos_pi(requiredSignals = null) {
    console.log ("Señales PI:");
    console.log (requiredSignals);
    // let valor_actual = obtenerDatosPI_actual (requiredSignals);
    // Valores simulados de señales
    let valores = {};
    window.contador_tiempo += 1000;

    // Si se especifican señales requeridas, solo generar esas
    if (requiredSignals) {
        requiredSignals.forEach(signal => {
            valores[signal] = Math.floor(Math.random() * 11); // Genera valores entre 0 y 10
            valores[signal] = findByTime (window.contador_tiempo, "SAB:"+signal);
        });
    } else {
        // Si no hay señales requeridas, generar algunas por defecto
        valores = {

        };
    }
    
    window.signalValues = valores;
    return valores;
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



// Especifica el nombre o ruta del archivo CSV aquí
const csvFilePath = './datos_simulacion_arranque.csv'; // Cambia esto al nombre o ruta del archivo

// Carga fichero simulacion
export async function loadCSV_simulacion(filePath) {
    try {
        // Espera la respuesta del fetch
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`Error al cargar el archivo: ${response.statusText}`);
        }

        // Espera a que el texto sea leído
        const csvData = await response.text();

        // Divide las líneas y procesa los datos
        const rows = csvData.split('\n'); // Divide las líneas
        const headers = rows[0].split(',').map(header => header.trim());
        const data = rows.slice(1).map(row => {
            const values = row.split(',');
            const record = {};
            headers.forEach((header, index) => {
                if (header === 'Timestamp') {
                    // Convierte el campo Timestamp a un objeto Date
                    record[header] = parseTimestamp(values[index]);
                } else {
                    record[header] = values[index]?.trim();
                }
            });
            return record;
        });

        //console.log(data); // Verifica la estructura en la consola
        // Guarda los datos procesados en memoria global (o maneja según sea necesario)
        window.processedData = data;

        return data; // Retorna los datos si necesitas usarlos directamente
    } catch (error) {
        console.error('Error al leer el archivo CSV:', error);
        document.getElementById('output').textContent = 'Error al cargar el archivo CSV. Verifica la consola.';
        throw error; // Lanza el error si necesitas manejarlo a nivel superior
    }
}


// Función para convertir el Timestamp al objeto Date
function parseTimestamp(timestamp) {
    // Elimina el carácter "T" y reemplaza por un espacio
    const cleanedTimestamp = timestamp?.replace('T', ' ').trim();
    return new Date(cleanedTimestamp);
}


export function findByTime(offsetMs, signalName) {
    const data = window.processedData;
    if (!data || data.length === 0) {
        console.error('No hay datos procesados disponibles.');
        return [];
    }

    // Obtén el valor inicial del Timestamp
    const startTime = data[0].Timestamp;
    if (!(startTime instanceof Date)) {
        console.error('El campo Timestamp no es válido en el primer dato.');
        return [];
    }

    const targetTime = new Date(startTime.getTime() + offsetMs - 50);
    const targetTime_2 = new Date(startTime.getTime() + offsetMs + 50);
    // console.log(targetTime);
    // Filtra los datos que coincidan
    const results = data.filter(record => {
        if (record.Timestamp instanceof Date) {
            return record.Timestamp>=targetTime && record.Timestamp <= targetTime_2;
        }
        return false;
    });

    // Devuelve los valores de la señal especificada
    const signalValues = results.map(record => ({
        Timestamp: record.Timestamp.toISOString(),
        Value: record[signalName]
    }));
    let valor = signalValues[0].Value;
    console.log(`Resultados encontrados para la señal "${signalName}":`, valor);
    return parseFloat(valor).toFixed(1);
}