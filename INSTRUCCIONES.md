# Hanzi Vault

La aplicación incluye las 731 entradas válidas de `Vocabulario Frases Chino.xls`, organizadas por bloque y estado.

El contenido está separado entre palabras y frases. Los tres círculos de estado permiten marcar rápidamente cada entrada como por conocer, en proceso o aprendida. El mapa permite alternar entre caracteres chinos y pinyin.

## Abrir con persistencia compartida

1. Ejecuta `python server.py` desde esta carpeta.
2. Abre `http://localhost:4173` en este ordenador.
3. Para usarla desde otro dispositivo de la misma red, abre la dirección `Otro dispositivo` que aparece en la terminal.

Los cambios se guardan en `data.json` y aparecen en todos los dispositivos que accedan al mismo servidor. La terminal debe permanecer abierta mientras usas la aplicación. En Windows puede ser necesario permitir Python en el firewall de red privada.

## Abrir sin servidor

También puedes abrir `hanzi-vault.html` directamente. En ese modo los cambios persisten al refrescar, pero quedan guardados solo en ese navegador.

## Atajos

- `Ctrl/Cmd + K`: enfocar el buscador.
- `Ctrl/Cmd + Enter`: añadir una palabra.
