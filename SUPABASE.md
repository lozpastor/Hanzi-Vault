# Cuenta privada y sincronización

La web publicada exige correo y contraseña antes de mostrar la biblioteca. Supabase guarda los datos por identificador de usuario; RLS impide que una cuenta lea o modifique la biblioteca de otra. La pantalla de acceso no sustituye estas comprobaciones del servidor.

## Entrar desde varios dispositivos

1. Abre https://lozpastor.github.io/Hanzi-Vault/ e inicia sesión con el mismo correo y contraseña de Hanzi Vault en cada dispositivo.
2. Si antes entrabas por enlace y conservas una sesión, abre Cuenta y establece una contraseña. Si no conservas la sesión, usa Crear o recuperar contraseña en la pantalla de acceso.
3. La contraseña del panel de administración de Supabase es independiente: no se copia automáticamente a esta aplicación.
4. Espera a que se recupere tu biblioteca. Arriba a la derecha aparece tu correo junto al estado de sincronización.
5. Las altas, modificaciones y borrados se suben automáticamente. Los otros dispositivos reciben avisos Realtime; hay una comprobación de respaldo cada 15 segundos y al recuperar conexión.

Una sesión válida se recuerda en ese navegador. En un equipo compartido, cierra sesión al terminar. Al cerrar sesión se bloquea la interfaz y se vacía la biblioteca en memoria; se conservan copias locales separadas por cuenta para no perder cambios pendientes. Estas copias no están cifradas: no protegen frente a alguien con acceso al perfil o las herramientas de desarrollo de tu navegador.

## Bibliotecas anteriores

Las copias locales que ya estaban asociadas a una cuenta se recuperan y combinan únicamente con esa cuenta. Una copia anterior sin propietario se conserva aparte: desde Cuenta, su propietario puede confirmar «Importar mi biblioteca anterior de este navegador». No se incorpora automáticamente a una cuenta nueva. Una cuenta nueva empieza vacía; no recibe los datos personales del Excel.

No borres los datos de los navegadores hasta sincronizar o exportar sus entradas pendientes. Los archivos de vocabulario estático del repositorio siguen siendo públicos; esta protección se refiere a las bibliotecas y al progreso guardados por cuenta.

## Contraseñas y correo

El acceso normal con contraseña no envía correos. Crear una cuenta requiere confirmar el correo. Recuperar una contraseña requiere un enlace de recuperación. El servicio de correo integrado tiene un límite de 2 mensajes por hora para todo el proyecto; producción requiere un proveedor SMTP propio. No se ha contratado ni configurado ninguno, ni se ha desactivado la confirmación de correo.

Las contraseñas se envían directamente a Supabase y no se guardan en la biblioteca, el repositorio ni los registros de la aplicación. El cliente utiliza solamente la clave pública publishable; las claves administrativas permanecen fuera del código publicado.

## Consistencia y fallos de conexión

La comparación de documentos ignora el orden de campos que cambia Postgres JSONB. Esto evita escrituras continuas y conflictos falsos. Las revisiones y el bloqueo de la función SQL evitan sobrescribir cambios independientes. Si el mismo campo cambia a la vez, prevalece la nube y se conserva una copia anterior para esa cuenta. Las entradas se identifican por ID: dos altas independientes del mismo término pueden generar dos fichas.

Los cambios hechos sin conexión durante una sesión abierta quedan pendientes en la copia local de esa cuenta. Una apertura nueva no permite editar hasta recuperar la biblioteca del servidor. Se informa de los errores; no se muestra una biblioteca distinta como sustituto.

## Configuración y pruebas

Proyecto: uycuaysfcdaliilgxbih. Región: Europa (Irlanda). Plan gratuito.

- Esquema y permisos: ejecutar supabase-schema.sql.
- Realtime: ejecutar supabase-realtime.sql. Es idempotente y mantiene RLS.
- Auth: correo habilitado, confirmación de correo activa, URL del sitio y redirecciones autorizadas para GitHub Pages y localhost.
- Configuración pública: supabase-config.js. Nunca incluir secret, service_role ni contraseña de la base.
- Pruebas locales: node verify-account-journey.cjs y node verify-sync.cjs.
- Prueba del servicio real: node verify-supabase-live.cjs crea cuentas temporales, prueba login con contraseña, RLS, altas/estados/borrados Realtime y ausencia de escrituras sin cambios; elimina las cuentas al finalizar. No envía correos.

Referencias: https://supabase.com/docs/guides/auth/passwords, https://supabase.com/docs/guides/auth/rate-limits y https://supabase.com/docs/guides/realtime/postgres-changes.
