# Hanzi Vault

La aplicación incorpora las 432 palabras y 111 frases de las hojas actuales de `Vocabulario Frases Chino.xlsx`, además de conservar la biblioteca anterior.

El panel Mi progresión reproduce la hoja Estado: Reconozco, Recuerdo con ayuda, Puedo utilizarlo y Lo utilizo. Las filas sin estado aparecen como Por conocer. Los círculos de las fichas permiten cambiar de grado. El borde sigue siendo gris, amarillo o verde según el dominio.

El objetivo cuenta Puedo utilizarlo + Lo utilizo: inicialmente 110 de 3.500 palabras y 15 de 1.200 frases. Puedes alternar entre Mi Excel actual y Toda mi biblioteca. Las pronunciaciones orientativas del Excel aparecen separadas del chino y del pinyin. El historial registra los cambios futuros; no se inventan fechas anteriores.

La importación se aplica una sola vez por versión, conserva las entradas anteriores y no vuelve a sobrescribir los cambios al recargar. `Frases old` queda representada por la biblioteca histórica, sin volver a importarla.

Para actualizar la fuente, ejecuta `python import-workbook.py "ruta/al/archivo.xlsx"` con openpyxl instalado y asigna una nueva versión en el importador. El script lee el Excel sin modificarlo y genera `workbook-seed.js`.

En GitHub Pages, los cambios persisten en el navegador. Para trasladarlos a otro equipo usa Importar / Exportar; para compartir automáticamente la misma base utiliza el servidor descrito abajo.

## Abrir con persistencia compartida

1. Ejecuta `python server.py` desde esta carpeta.
2. Abre `http://localhost:4173` en este ordenador.
3. Para usarla desde otro dispositivo de la misma red, abre la dirección `Otro dispositivo` que aparece en la terminal.

Los cambios se guardan en `data.json` y aparecen en todos los dispositivos que accedan al mismo servidor. La terminal debe permanecer abierta mientras usas la aplicación. En Windows puede ser necesario permitir Python en el firewall de red privada.

El selector de palabras consulta las 125.000 entradas de CC-CEDICT cuando la aplicación se abre mediante `server.py`. Escribe el pinyin sin tonos, por ejemplo `shui`, para ver primero todas las pronunciaciones exactas y después palabras más largas relacionadas.

## Abrir sin servidor

También puedes abrir `index.html` directamente. En ese modo los cambios persisten al refrescar, pero quedan guardados solo en ese navegador y el selector por pinyin utiliza únicamente las coincidencias locales.

## Atajos

- `Ctrl/Cmd + K`: enfocar el buscador.
- `Ctrl/Cmd + Enter`: añadir una palabra.
