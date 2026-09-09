# Sincronización entre dispositivos

El proyecto Hanzi Vault ya está creado y configurado en Supabase, con plan gratuito y región Europa (Irlanda). GitHub Pages sirve la web; Supabase guarda la biblioteca privada de cada cuenta. Referencia del proyecto: `uycuaysfcdaliilgxbih`.

## Conectar el portátil y el móvil

1. Abre https://lozpastor.github.io/Hanzi-Vault/ en el dispositivo cuyo progreso quieras usar como referencia.
2. Pulsa Conectar mi cuenta, o entra en Cuenta / Importar y Exportar.
3. Introduce tu correo y abre el enlace recibido en ese mismo dispositivo.
4. Pulsa Combinar y activar sincronización. Se guarda una copia previa local.
5. Repite con el mismo correo en el otro dispositivo y combina también su biblioteca. Se incorporan sus fichas adicionales; para IDs repetidos se mantiene inicialmente el estado de la nube.
6. Espera a ver Sincronizado. Las siguientes altas, cambios y borrados se comparten automáticamente.

Recargar sin iniciar sesión no combina bibliotecas. No borres los datos del navegador antes de completar estos pasos: allí están las palabras que todavía no se han subido.

El correo predeterminado de Supabase puede limitar los destinatarios a los miembros de la organización. Para uso personal, utiliza el correo de tu cuenta Supabase. Para habilitar otros destinatarios, configura un proveedor SMTP en Authentication / Email; no se ha contratado ningún proveedor de pago.

## Reproducir la configuración

1. Crea un proyecto en https://supabase.com/dashboard.
2. Ejecuta `supabase-schema.sql` en el editor SQL del proyecto. Activa RLS y restringe el acceso a la biblioteca del usuario autenticado.
3. En Authentication / URL Configuration, configura Site URL y Redirect URLs con `https://lozpastor.github.io/Hanzi-Vault/`. Si utilizas un dominio diferente, añade su dirección exacta.
4. En `supabase-config.js`, introduce Project URL en `url` y la clave **publishable** (o la clave antigua **anon**) en `publishableKey`. Son configuración pública. Nunca publiques una clave secret, service_role ni la contraseña de la base de datos.
5. Sube esa configuración a main. En Importar / Exportar, introduce tu correo y abre el enlace de acceso en ese dispositivo. Repite con el mismo correo en el móvil.
6. En cada dispositivo, pulsa Combinar y activar sincronización. Se guarda una copia previa en ese navegador y se incorporan las entradas que aún no estén en la cuenta. Para fichas con el mismo identificador prevalece inicialmente la nube. Empieza por el dispositivo cuyo progreso quieras conservar como referencia.

Después, los cambios se suben automáticamente y se consultan cada 15 segundos, al volver a la pestaña o al recuperar conexión. Los cambios sin conexión permanecen guardados localmente hasta poder sincronizar. También puedes pulsar Sincronizar ahora.

Las versiones y el bloqueo en la base evitan sobrescribir una biblioteca con una copia antigua. Se combinan los cambios independientes y las eliminaciones. Si dos dispositivos editan el mismo campo, se conserva la versión de la nube y se guarda una copia local descargable para recuperar el otro valor. Un borrado remoto prevalece ante una edición local antigua. Las entradas se identifican por ID; altas independientes del mismo término pueden aparecer como dos fichas.

Se ha comprobado el servicio real: lectura y escritura autenticadas, bloqueo anónimo, separación entre dos usuarios, conflictos de versión y dos navegadores con la misma cuenta. La prueba combinó sus bibliotecas, igualó los recuentos y propagó una nueva palabra. Las cuentas temporales se eliminaron después. El envío del enlace a tu buzón requiere que inicies sesión con tu correo.

Referencias: https://supabase.com/docs/guides/auth y https://supabase.com/docs/guides/database/postgres/row-level-security.
