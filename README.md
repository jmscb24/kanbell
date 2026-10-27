# KanBell

Recordatorios personales de fichaje para [Kanlane](https://github.com/yalerooo/Kanlane).
Cada usuario define sus propios horarios. Propuesta inicial editable: 08:30 y 13:30,
de lunes a viernes. Comprueba los días de tu jornada antes de guardarlos.

## Funciones

- Hasta 30 recordatorios, con nombre, hora local, días y activación independientes.
- Aviso único; posponer 5, 10 o 15 minutos y descartar. No registra fichajes.
- Popup persistente nativo de Kanlane o aviso temporal. Los avisos temporales se
  pueden posponer o descartar abriendo el panel de KanBell.
- Sonido opcional y prueba manual. Apagado de entrada; el navegador puede bloquear
  audio en el iframe de segundo plano incluso si la prueba del panel funciona.
- Pausa hasta una fecha inclusive, atajos para hoy y reanudar. Hay que guardar.
- Enlace opcional http(s) al portal de fichaje. No abre páginas automáticamente.
- Próximo aviso en la barra de Tareas; botones en Calendario y Ctrl K.
- Panel con próximo aviso y avisos recientes (24 h), pendientes o pospuestos.
- Estilos del SDK: sigue tema, colores, tipografía y esquinas de Kanlane/Apariencia.
- Horarios en `wh.storage.user`, personales y comunes a los proyectos de esa cuenta.
- Exportación `.ics` con alarmas para los próximos 90 días, con cambios de hora.

## Instalación y publicación

Publica los archivos de esta carpeta por HTTPS. No hay compilación ni servidor
propio. No hay que modificar Kanlane ni integrar este código en Kanpad.

1. Crea un repositorio **vacío** llamado `kanbell` en tu cuenta de GitHub. No añadas
   README, licencia ni gitignore al crearlo: ya hay archivos locales.
2. Abre PowerShell dentro de esta carpeta y ejecuta:

```powershell
git init
git branch -M main
git add .
git commit -m "Crear KanBell: recordatorios de fichaje para Kanlane"
git remote add origin https://github.com/jmscb24/kanbell.git
git push -u origin main
```

Si Git pide tu identidad, configura `git config user.name` y `git config user.email`
en esta carpeta y repite el commit. Si utilizas otra cuenta, cambia `jmscb24`.

3. En el repositorio: **Settings → Pages → Deploy from a branch → main → / (root)**
   y guarda. Espera a que GitHub Pages termine de publicar.
4. La dirección será `https://jmscb24.github.io/kanbell/`.
5. En Kanlane: **Plugins → Añadir → pega esa dirección → revisa los permisos → Instalar**.
6. Abre KanBell, ajusta días y horas, guarda y pulsa **Probar aviso y sonido**.
7. Para probar la entrega real, añade un aviso para dentro de dos minutos, guarda
   y cambia a Tareas. Descarta ese aviso de prueba y elimina luego el horario.

El plugin está instalado por proyecto: para usarlo en otro, instálalo también allí.
Los horarios personales se conservan entre proyectos. No se instala automáticamente
como oficial ni puede añadir una tarjeta a la pantalla de inicio: el SDK actual no
ofrece esa ubicación. Usa su botón en Tareas para acceder al panel.

## Qué significan los avisos

**Persistente:** usa `wh.ui.form`: botón Posponer con selector 5/10/15 minutos y botón
Descartar. Cerrar/cancelar el formulario también descarta. No hay enlace clicable
al portal dentro del formulario porque el SDK no permite ese campo; el enlace está
en el panel, accesible con el botón KanBell.

**Temporal:** usa `wh.ui.toast` con tipo `important`; la duración la controla Kanlane
(actualmente unos 3,2 segundos). Desaparece sin repetir sonido ni aviso. Su registro
queda disponible durante 24 h en el panel para posponerlo o descartarlo.

La entrega se guarda **antes** de mostrar el aviso. Al recargar no vuelve a sonar.
Al despertar el equipo recupera avisos de los últimos 10 minutos; evita lanzar todos
los fichajes antiguos. Las posposiciones sobreviven a una recarga y a medianoche
(durante un máximo de 24 h desde que vencen). Se consultan los horarios cada 15 s;
el navegador puede retrasar esa consulta si suspende la pestaña.

Mantén **una sola pestaña/dispositivo activo con KanBell** para evitar avisos
simultáneos. El SDK ofrece lectura y escritura sincronizadas, pero no bloqueos
transaccionales entre pestañas o dispositivos: no se garantiza la entrega única
global si varias instancias disparan el mismo aviso a la vez. Panel y segundo plano
de la misma pestaña sí están separados: solo el segundo plano programa avisos.

Los avisos necesitan que Kanlane esté abierto en un proyecto con el plugin instalado,
el equipo esté despierto y el almacenamiento del anfitrión responda. No son una alarma
crítica ni un registro oficial de jornada.

## Con Kanlane o el navegador cerrado

El SDK no expone alarmas de sistema, Web Push ni service workers del anfitrión.
El plugin aislado no puede despertar un navegador cerrado, pedir notificaciones
nativas ni programar un push por sí solo. Kanlane tiene infraestructura de push
para eventos de tareas de equipo, pero no la ofrece como API de plugins ni como
programador de alarmas personales. No se ha modificado ese sistema.

Como alternativa disponible, pulsa **Descargar calendario (.ics)** e impórtalo en
una aplicación de calendario con avisos habilitados. Incluye eventos individuales
para los siguientes 90 días, con una alarma en su hora exacta. La aplicación de
calendario decide si respeta alarmas importadas y si suena: haz una prueba real.
No hay sincronización automática: al cambiar horarios o pausas elimina los eventos
importados anteriormente y reimporta; renueva el calendario antes de los 90 días.
Es recomendable importar en un calendario separado llamado KanBell para borrarlo
sin afectar a citas personales. Posponer o descartar en KanBell no modifica el calendario.
El sonido que configures dentro del plugin tampoco modifica el sonido del calendario.

## Privacidad y permisos

Solo pide `storage` y `ui:extend`: preferencias personales y botones/formularios
nativos. No lee tareas, contactos, contraseñas ni datos de fichaje. No hace llamadas
a servicios externos propios. Carga JS y CSS del SDK oficial desde `kanlane.com`.
Los horarios y el portal se guardan con tu cuenta mediante Kanlane; el espacio de
usuario no está cifrado como el de un proyecto cifrado. No pongas credenciales en
el enlace. No uses el plugin para guardar datos sensibles.

## Desarrollo y comprobación

Pruebas del motor sin instalar dependencias (Node 20 o superior):

```powershell
node --test tests/core.test.cjs
```

Para servir la página localmente, por ejemplo con Python:

```powershell
python -m http.server 8080
```

Instala `http://localhost:8080/` como plugin en Kanlane. Abrir la página directamente
solo muestra las instrucciones; para funcionar necesita el anfitrión.

Prueba opcional en Chromium con Playwright, SDK real y anfitrión de prueba que simula
sus mensajes (no sustituye la prueba final en una cuenta real de Kanlane):

```powershell
npm install --no-save playwright
npx playwright install chromium
git clone --depth 1 https://github.com/yalerooo/Kanlane.git ../kanlane-referencia
$env:KANLANE_SDK_ROOT = (Resolve-Path ../kanlane-referencia/plugins/sdk).Path
node tests/browser.cjs
```

La prueba de navegador cubre edición, guardado, aviso temporal, pausa, descarga ICS,
ancho móvil, disparo en segundo plano, formulario persistente, posposición y descarte.
Los tests del motor cubren semanas, validación, pausa inclusiva, recarga, posposición,
medianoche, concurrencia local, recuperación, fallos de guardado y calendario con DST.

## Referencia revisada

Implementación basada en el repositorio de Kanlane, revisión
`c9222f9c23bbe3cea258459639621964ed20447e` (consulta del 27/10/2026):

- `docs/PLUGINS.md`, `docs/NOTIFICACIONES.md`.
- `plugins/plantilla`, `plugins/temporizador`, `plugins/apariencia`.
- `plugins/sdk/workhub-plugin.js` y `.css`.
- `src/services/plugin-host.js`, `src/controllers/plugins-controller.js`,
  `src/views/toast-view.js`.

Identificador estable: `com.jmscb24.kanbell`. No lo cambies después de instalarlo:
Kanlane usa este identificador para asociar datos y permisos. El plugin usa el SDK
remoto oficial; cambios futuros incompatibles de ese SDK podrían requerir una revisión.

## Validación de esta entrega (27/10/2026)

- 12 pruebas del motor superadas con Node 24.
- 1 prueba con el SDK real de la revisión indicada, ejecutado en un contexto JS
  y un anfitrión simulado: permisos, protocolo, ejecución de fondo, descarte y
  ausencia de repetición después de recargar. Total: 13 pruebas superadas.
- Sintaxis de JavaScript comprobada.
- La prueba visual en Chromium está incluida, pero no se pudo ejecutar aquí:
  el entorno no tenía navegador y su descarga no proporcionó un ZIP válido.
- Pendientes: instalación en una cuenta real de Kanlane, apariencia en navegador,
  audio real, entrega con pestaña suspendida y alarmas del calendario elegido.

Para repetir también la comprobación de SDK después de clonar la referencia:

```powershell
$env:KANLANE_SDK_ROOT = (Resolve-Path ../kanlane-referencia/plugins/sdk).Path
node --test tests/core.test.cjs tests/sdk.test.cjs
```
