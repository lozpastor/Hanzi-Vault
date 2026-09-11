# Hanzi-Vault

El buscador completo por pinyin utiliza datos de
[CC-CEDICT](https://cc-cedict.org/), distribuidos bajo licencia
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
# Actualización de cuenta y progresión (septiembre 2026)

El acceso por enlace de correo activa automáticamente la combinación y sincronización. La cuenta muestra operación en curso, resultado, recuentos y errores recuperables. La sesión de administración de Supabase es independiente del acceso a esta web. Consulta `SUPABASE.md`.

Repasar actualiza la ficha original: En proceso = Reconozco; Con ayuda = Recuerdo con ayuda; Aprendida = Puedo utilizarlo (conserva Lo utilizo si ya estaba en ese estado). Registra el cambio de dominio y programa el siguiente repaso a 1, 3 o 7 días.

El Dashboard reproduce los cuadros de texto de la hoja Estado del Excel: HSK 1–4 con 500/1000/2000/3500 palabras y 200/400/800/1200 frases utilizables. Son metas personales, no requisitos oficiales ni certificación. El índice superior 0–160 mide ese itinerario sobre la biblioteca completa, no una puntuación Duolingo.

`hsk-reference.js` contiene la correspondencia léxica del [listado oficial HSK 2.0 de 2015](https://old.chinesetest.cn/userfiles/file/HSK/HSK-2015.xlsx). Los niveles existentes se conservan. Las palabras nuevas y las que carecían de nivel se clasifican por coincidencia exacta; fuera del listado se usa una estimación por caracteres, o HSK 6 provisional si no hay información, señalada con ≈ y editable. No equivale al nuevo HSK 3.0.

Pruebas: `node verify-account-journey.cjs`, `node verify-progress.cjs`, `node verify-sync.cjs`, `node verify-experience.cjs`. La prueba opcional `node verify-supabase-live.cjs` usa el token local ignorado para crear y eliminar cuentas temporales y comprobar el servicio real.
