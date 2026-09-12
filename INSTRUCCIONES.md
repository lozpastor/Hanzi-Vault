# Hanzi Vault

La aplicación incorpora las 432 palabras y 111 frases de las hojas actuales de `Vocabulario Frases Chino.xlsx`, además de conservar la biblioteca anterior.

El panel Mi progresión reproduce la hoja Estado: Reconozco, Recuerdo con ayuda, Puedo utilizarlo y Lo utilizo. Las filas sin estado aparecen como Por conocer. Los círculos de las fichas permiten cambiar de grado. El borde sigue siendo gris, amarillo o verde según el dominio.

El objetivo cuenta Puedo utilizarlo + Lo utilizo: inicialmente 110 de 3.500 palabras y 15 de 1.200 frases. Puedes alternar entre Mi Excel actual y Toda mi biblioteca. Las pronunciaciones orientativas del Excel aparecen separadas del chino y del pinyin. El historial registra los cambios futuros; no se inventan fechas anteriores.

La importación se aplica una sola vez por versión, conserva las entradas anteriores y no vuelve a sobrescribir los cambios al recargar. `Frases old` queda representada por la biblioteca histórica, sin volver a importarla.

Para actualizar la fuente, ejecuta `python import-workbook.py "ruta/al/archivo.xlsx"` con openpyxl instalado y asigna una nueva versión en el importador. El script lee el Excel sin modificarlo y genera `workbook-seed.js`.

En GitHub Pages, inicia sesión con el mismo correo y contraseña de Hanzi Vault en todos tus dispositivos. La biblioteca se guarda por cuenta en Supabase. El perfil y el estado de sincronización aparecen arriba a la derecha.

Supabase ya está configurado con sincronización Realtime. El acceso está bloqueado hasta recuperar tu biblioteca; las altas y cambios se comparten automáticamente. Las cuentas nuevas empiezan vacías. Si el navegador conserva una biblioteca antigua sin cuenta asociada, podrás confirmar su importación desde Cuenta. No borres los datos locales antes de recuperarlos. Consulta [SUPABASE.md](SUPABASE.md).

## Repasar y explorar

Repasar muestra el chino junto al pinyin antes de descubrir la traducción. Los filtros permiten seleccionar varios estados a la vez (En proceso y Por conocer por defecto), palabras y/o frases y sesiones de 10, 20, 40 o 100 fichas. La respuesta es una autoevaluación: no se interpreta ni puntúa tu voz. La valoración actualiza el grado de dominio y programa el próximo repaso.

Añadir permite buscar pinyin sin tonos, caracteres chinos o significados ingleses, como `football`. Ofrece `足球` (fútbol) y `踢足球` (jugar al fútbol). Las definiciones generales provienen de CC-CEDICT en inglés. La carga y búsqueda del diccionario se realizan en segundo plano al buscar por primera vez.

El mapa es una esfera tridimensional de toda la biblioteca, con agrupaciones por categoría. Arrastra para girar, usa rueda o pellizco para acercar, y busca para seleccionar una palabra. Permite pausar, cambiar entre chino/pinyin y filtrar categorías. Cada conexión indica si une palabras de una categoría, caracteres compartidos o una relación guardada; las relaciones automáticas no implican sinonimia.

## Abrir con persistencia compartida

1. Ejecuta `python server.py` desde esta carpeta.
2. Abre `http://localhost:4173` en este ordenador.
3. Para usarla desde otro dispositivo de la misma red, abre la dirección `Otro dispositivo` que aparece en la terminal.

Con Supabase configurado, este servidor sirve la web y las bibliotecas siguen vinculadas a la cuenta en la nube. El almacenamiento en `data.json` es únicamente una alternativa local de desarrollo sin Supabase; no tiene aislamiento por usuarios y no debe exponerse a Internet. En Windows puede ser necesario permitir Python en el firewall de red privada.

El selector de palabras consulta las 125.000 entradas de CC-CEDICT cuando la aplicación se abre mediante `server.py`. Escribe el pinyin sin tonos, por ejemplo `shui`, para ver primero todas las pronunciaciones exactas y después palabras más largas relacionadas.

## Abrir sin servidor

Para usar cuentas y redirecciones de recuperación, utiliza GitHub Pages o localhost, no abras `index.html` como archivo. El modo local sin Supabase es solo para desarrollo y no comparte datos entre cuentas o dispositivos.

## Atajos

- `Ctrl/Cmd + K`: enfocar el buscador.
- `Ctrl/Cmd + Enter`: añadir una palabra.
