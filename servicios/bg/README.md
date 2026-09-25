# Comparación local de ISNet

Esta prueba compara el mismo `isnet-general-use` en CPU, primero normal y después con alpha matting. Cada modo corre en un proceso Python nuevo para medir su propia RAM antes y después de cargar el modelo. Ambos procesan exactamente las mismas imágenes en el mismo orden, con **tres repeticiones consecutivas por imagen**. Sólo la primera ejecución de cada proceso es `cold`; todas las siguientes son `warm`.

Acepta JPG/PNG de hasta 15 MB. Usa dos hilos CPU por defecto; puedes cambiarlo con `OMP_NUM_THREADS=4` antes del comando.

## Instalar y ejecutar

Requiere Python 3.11–3.13. Desde `kustto-api/servicios/bg`:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python main.py /ruta/a/imagen1.jpg /ruta/a/imagen2.png --output /ruta/a/resultados
```

Para más repeticiones por imagen:

```bash
python main.py /ruta/a/imagen.jpg --output /ruta/a/resultados --repetitions 5
```

Con una imagen se guardan `normal.png` y `alpha-matting.png` en la carpeta de salida. Con varias imágenes, cada una tiene una subcarpeta numerada con esos mismos dos archivos. También se guardan `results.json`, `normal-results.json` y `alpha-matting-results.json`.

La primera carga puede incluir la descarga del modelo ONNX. Repite el comando si quieres medir un cold start con el modelo ya presente en disco. Las dos variantes usan el mismo archivo ONNX.
El segundo proceso puede aprovechar la caché de disco del primero; compara la carga inicial con esa salvedad y usa las ejecuciones warm para estimar el costo adicional de alpha matting.

Para usar la interfaz, inicia `pnpm dev` en `kustto-web` y abre `http://localhost:3000/bg`. La página muestra los resultados y permite descargar los dos PNG. Sólo funciona en desarrollo local.

## Parámetros de alpha matting

Se usan explícitamente los valores de referencia de `rembg` como punto de partida:

- `foreground_threshold=240`
- `background_threshold=10`
- `erode_size=10`

Los tres valores aparecen en el reporte JSON y en la interfaz para que la comparación sea reproducible.

## Métricas

- RAM antes y después de `new_session()`: RSS del proceso Python, incluyendo las dependencias importadas.
- Pico por ejecución: RSS muestreado cada 5 ms desde la lectura de la imagen hasta guardar el PNG. El pico del proceso completo es el máximo que registra el sistema operativo.
- Carga: duración de `new_session()`; el tamaño del modelo son los bytes del archivo ONNX.
- Inferencia: duración de `predict()`, que incluye preparación ONNX y escalado de la máscara.
- Postprocesado: desde el fin de `predict()` hasta terminar el PNG. Incluye alpha matting cuando se activa, composición y escritura en disco.
- Total cold: importación de dependencias + carga del modelo + primera ejecución. Total warm: lectura, inferencia, postprocesado y escritura. El total cold no incluye el arranque previo del intérprete Python.

La comparación visual sirve para decidir si el detalle ganado en cabello, bordes y transparencias compensa el costo observado. No modifica el editor ni producción.
