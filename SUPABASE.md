# Sincronización entre dispositivos

El proyecto Hanzi Vault ya está creado y configurado en Supabase, con plan gratuito y región Europa (Irlanda). GitHub Pages sirve la web; Supabase guarda la biblioteca privada de cada cuenta. Referencia del proyecto: `uycuaysfcdaliilgxbih`.

## Conectar el portátil y el móvil

1. Abre https://lozpastor.github.io/Hanzi-Vault/ en el dispositivo cuyo progreso quieras usar como referencia.
2. Pulsa Conectar mi cuenta, o entra en Cuenta / Importar y Exportar.
3. Introduce tu correo y abre el enlace recibido en ese mismo dispositivo.
4. La biblioteca se combina automáticamente al abrir el enlace. Se guarda una copia previa local.
5. Repite con el mismo correo en el otro dispositivo Su biblioteca también se combina automáticamente. Se incorporan sus fichas adicionales; para IDs repetidos se mantiene inicialmente el estado de la nube.
6. Espera a ver Sincronizado. Las siguientes altas, cambios y borrados se comparten automáticamente.

Recargar sin iniciar sesión no combina bibliotecas. No borres los datos del navegador antes de completar estos pasos: allí están las palabras que todavía no se han subido.

El correo predeterminado de Supabase puede limitar los destinatarios a los miembros de la organización. Para uso personal, utiliza el correo de tu cuenta Supabase. Para habilitar otros destinatarios, configura un proveedor SMTP en Authentication / Email; no se ha contratado ningún proveedor de pago.

## Reproducir la configuración

### Error «email rate limit exceeded»

El proyecto usa el servicio de correo integrado: 2 envíos por hora para todo el proyecto y al menos 60 segundos entre solicitudes. Recargar o cambiar de dispositivo no restablece la cuota. La web explica el error y limita el reenvío durante 60 segundos, también tras recargar; esa espera local no garantiza que el cupo horario ya esté disponible. Revisa el último correo y utiliza el enlace solo si sigue vigente y no se ha utilizado. Si necesitas uno nuevo, espera a que se libere el cupo.

La solución de producción es conectar un proveedor SMTP propio en Supabase. No se ha configurado ni contratado ninguno. No desactives la confirmación de correo para intentar solucionar este límite. Referencias: https://supabase.com/docs/guides/auth/rate-limits y https://supabase.com/docs/guides/auth/auth-smtp.

1. Crea un proyecto en https://supabase.com/dashboard.
2. Ejecuta `supabase-schema.sql` en el editor SQL del proyecto. Activa RLS y restringe el acceso a la biblioteca del usuario autenticado.
3. En Authentication / URL Configuration, configura Site URL y Redirect URLs con `https://lozpastor.github.io/Hanzi-Vault/`. Si utilizas un dominio diferente, añade su dirección exacta.
4. En `supabase-config.js`, introduce Project URL en `url` y la clave **publishable** (o la clave antigua **anon**) en `publishableKey`. Son configuración pública. Nunca publiques una clave secret, service_role ni la contraseña de la base de datos.
5. Sube esa configuración a main. En Importar / Exportar, introduce tu correo y abre el enlace de acceso en ese dispositivo. Repite con el mismo correo en el móvil.
6. La primera sesión activa la sincronización sin pulsar ningún botón. Se guarda una copia previa en ese navegador y se incorporan las entradas que aún no estén en la cuenta. Para fichas con el mismo identificador prevalece inicialmente la nube. Empieza por el dispositivo cuyo progreso quieras conservar como referencia.

Después, los cambios se suben automáticamente y se consultan cada 15 segundos, al volver a la pestaña o al recuperar conexión. Los cambios sin conexión permanecen guardados localmente hasta poder sincronizar. El botón Comprobar sincronización es opcional. Muestra el progreso, los recuentos y el último resultado; los errores mantienen una advertencia y se reintentan al recuperar conexión.

Las versiones y el bloqueo en la base evitan sobrescribir una biblioteca con una copia antigua. Se combinan los cambios independientes y las eliminaciones. Si dos dispositivos editan el mismo campo, se conserva la versión de la nube y se guarda una copia local descargable para recuperar el otro valor. Un borrado remoto prevalece ante una edición local antigua. Las entradas se identifican por ID; altas independientes del mismo término pueden aparecer como dos fichas.

Se ha comprobado el servicio real: lectura y escritura autenticadas, bloqueo anónimo, separación entre dos usuarios, conflictos de versión y dos navegadores con la misma cuenta. La prueba combinó sus bibliotecas, igualó los recuentos y propagó una nueva palabra. Las cuentas temporales se eliminaron después. El envío del enlace a tu buzón requiere que inicies sesión con tu correo.

Referencias: https://supabase.com/docs/guides/auth y https://supabase.com/docs/guides/database/postgres/row-level-security.

La sesión del panel de administración de Supabase no inicia sesión en Hanzi Vault. Introducir el correo solo envía el enlace: debes abrirlo en el mismo navegador donde usas la web. Al cambiar de cuenta se conserva una copia local separada, sin subir la biblioteca de la cuenta anterior a la nueva. Al volver a la cuenta anterior se recupera su copia y su historial de sincronización.
