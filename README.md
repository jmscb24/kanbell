# KanBell 1.1 · Recordatorios de fichaje para Kanlane

Horarios personales, avisos dentro de Kanlane y notificaciones del sistema mediante
una ventana auxiliar de escritorio. Cada usuario define sus horas y días. Horario
inicial editable: entrada 08:30 y salida 13:30 de lunes a viernes.

## Activar los avisos de Windows

1. Instala o actualiza el plugin en Kanlane desde su URL de GitHub Pages.
2. Abre KanBell, revisa el horario, días, sonido y modo de popup; **guarda**.
3. Pulsa **Activar avisos de Windows**. Si no se abre la ventana, permite las ventanas
   emergentes para Kanlane y repite el clic.
4. En la ventana nueva, pulsa **Permitir y activar avisos** y acepta el permiso de
   notificaciones del navegador.
5. Pulsa **Probar dentro de 5 segundos** y cambia a otro programa.
6. Deja la ventana auxiliar abierta o minimizada. Puede seguir avisando si cierras
   Kanlane, pero no si cierras también esa ventana o todo el navegador.

La notificación la muestra Windows a través de Edge/Chrome u otro navegador
compatible con Notification. Al pulsarla regresas a la ventana de KanBell, donde
puedes **Posponer 5/10/15 minutos**, **Descartar** o **Abrir fichaje**. Los botones de
posponer y descartar están en esa ventana, no en la notificación nativa.

El modo persistente solicita `requireInteraction`; el modo temporal cierra el aviso
tras unos 8 segundos. Windows y el navegador pueden imponer otra duración. La
preferencia de sonido solicita silencio o sonido del sistema mediante `silent`;
el volumen, No molestar y los ajustes del navegador y Windows tienen la última palabra.
Si no aparece la prueba, revisa permisos del sitio y notificaciones del navegador
en la configuración de Windows. Evita que el navegador suspenda esta ventana.

La ventana recibe una **copia del horario guardado**. Mientras siga abierto el panel
del plugin y su conexión se conserve, los nuevos cambios guardados se envían a la
ventana. Si cierras ese panel o cambias de proyecto, vuelve a abrir los avisos desde
KanBell para cargar el horario actualizado. Para detener y borrar sus datos, pulsa
**Detener y borrar esta sesión**. El horario copiado y las posposiciones se almacenan
solo en sessionStorage de esa ventana: una recarga los conserva, pero requiere
reactivar los avisos con el botón. Cerrar definitivamente esa sesión los elimina
(el navegador puede restaurar sesiones cerradas si se lo pides).

Los avisos internos de Kanlane y los de Windows son canales independientes. Posponer
o descartar en uno no modifica el otro. Para no ver el cuadro persistente interno y
el de Windows a la vez, puedes elegir popup temporal en KanBell. Usa una sola ventana
de avisos de Windows: cuando el navegador admite Web Locks, KanBell impide activar
una segunda ventana al mismo tiempo en el mismo origen/ruta. No coordina dispositivos.

## Funciones del plugin

- Hasta 30 recordatorios con nombre, hora local, días y activación independientes.
- Un aviso por ocurrencia y canal; solo se repite si lo pospones.
- Pausa hasta una fecha inclusive y atajos para hoy/reanudar. Hay que guardar.
- Popup persistente nativo de Kanlane o aviso temporal y sonido opcional.
- Enlace opcional http(s) al portal. Nunca abre páginas ni ficha automáticamente.
- Próximo aviso en la barra de Tareas; accesos en Calendario y Ctrl K.
- Panel con próximo aviso y registros pendientes o pospuestos de las últimas 24 h.
- Apariencia del SDK oficial: sigue tema, colores, tipografía y esquinas de Kanlane.
- Horarios personales comunes a proyectos, guardados en `wh.storage.user` de la cuenta.
- Exportación `.ics` de los próximos 90 días con alarmas y cambios de hora.

Para el popup persistente interno se usa `wh.ui.form`: Posponer y selector de minutos;
Descartar o cerrar el formulario descarta ese aviso. El enlace al portal está en el
panel porque ese formulario no admite enlaces. Para el temporal se usa `wh.ui.toast`
con tipo `important`: desaparece según la duración que fija Kanlane (unos 3,2 s),
y puedes posponerlo o descartarlo desde el panel.

Solo el iframe de segundo plano programa los avisos internos; el panel no duplica el
programador. El estado se guarda antes de mostrar el aviso: una recarga no repite
la entrega. El motor consulta cada 15 segundos; puede retrasarse si el navegador
suspende la ventana. Recupera avisos de los últimos 10 minutos al despertar y
posposiciones vencidas de hasta 24 horas, incluidas las que cruzan medianoche.

Mantén una sola pestaña activa de Kanlane para evitar duplicados internos entre
instancias: su SDK no ofrece operaciones atómicas entre pestañas o dispositivos.
Los avisos internos necesitan un proyecto abierto con el plugin instalado; instálalo
en cada proyecto donde lo quieras usar. Descartar no registra un fichaje.

## Actualizar tu repositorio existente (PowerShell)

Descarga `kanbell-windows.zip` en Descargas y usa estos comandos si tu clon sigue en
la ruta con la que hiciste la primera publicación. Extrae en una carpeta nueva o
vacía; estos comandos conservan el `.git` del repositorio existente.

```powershell
cd "$HOME\Downloads"
Expand-Archive -Path .\kanbell-windows.zip -DestinationPath .\kanbell-actualizacion-windows
Copy-Item -Path .\kanbell-actualizacion-windows\kanbell\* -Destination .\kanbell-extraido\kanbell\ -Recurse -Force
cd .\kanbell-extraido\kanbell
git status --short
git add .
git commit -m "Añadir notificaciones de Windows a KanBell"
git push
```

Espera a que GitHub Pages publique los cambios. Recarga Kanlane (Ctrl+F5) y vuelve a
abrir KanBell; no cambia ni el ID ni los permisos, y se conservan los horarios de la
cuenta. Si hay una ventana auxiliar de una versión previa, ciérrala y vuelve a
abrirla desde el plugin actualizado. El sitio de Pages sigue siendo:

`https://jmscb24.github.io/kanbell/`

## Instalación nueva

Publica esta carpeta por HTTPS. No tiene compilación ni servidor propio. Crea un
repositorio vacío en GitHub y, desde la carpeta de los archivos:

```powershell
git init
git branch -M main
git add .
git commit -m "Crear KanBell"
git remote add origin https://github.com/jmscb24/kanbell.git
git push -u origin main
```

En el repositorio, activa Settings → Pages → Deploy from a branch → main → / (root).
En Kanlane → Plugins → Añadir, pega la URL publicada y aprueba `storage` y `ui:extend`.
No es necesario modificar el código de Kanlane ni Kanpad.

## Portal DASStime de IBAI

La página pública `https://ibai.dasstime.dorlet.com/` redirige por user agent:

- Dispositivos iPhone/iPod/Android/BlackBerry → `/m/`.
- El resto → `/web/`.

Puedes abrir directamente `https://ibai.dasstime.dorlet.com/m/` desde PC para probar
la versión móvil o `https://ibai.dasstime.dorlet.com/web/` para la versión de escritorio.
Ambas páginas públicas cargaban al comprobarlas el 27/10/2026. No se ha iniciado
sesión ni realizado fichajes. La disponibilidad del fichaje depende de la cuenta,
su configuración y los requisitos de ubicación. Configura el enlace elegido en
«Portal de fichaje» del plugin. No se almacena ni automatiza el inicio de sesión.

## Con todo el navegador cerrado

La ventana auxiliar necesita seguir abierta y el equipo despierto. No se ha añadido
un servidor de push ni un programa residente de Windows. Para avisos con todo el
navegador cerrado, exporta `.ics` e impórtalo en una aplicación de calendario con
alarmas habilitadas. La aplicación decide si respeta las alarmas importadas: haz
una prueba. No sincroniza cambios; usa un calendario separado y elimina/reimporta
si cambias el horario. Renueva la exportación antes de los 90 días.

El SDK actual de Kanlane ejecuta el plugin en un marco aislado sin allow-same-origin;
no permite pedir notificaciones desde allí. Por eso el permiso se pide desde la
ventana auxiliar de primer nivel y solo tras pulsar su botón. No se han cambiado
los permisos del sandbox ni la infraestructura de push de Kanlane.

## Privacidad

Solo solicita `storage` y `ui:extend`. No lee tareas, contactos ni contraseñas. No
envía horarios a servicios propios. El SDK y CSS se cargan desde kanlane.com.
El horario del plugin se guarda con tu cuenta en Kanlane; su espacio de usuario no
se cifra como el de un proyecto cifrado. La ventana auxiliar guarda su copia y
estados en sessionStorage. No pongas credenciales en el enlace de fichaje.

La comunicación con la ventana auxiliar comprueba su referencia de ventana, origen
y un token aleatorio de sesión. La auxiliar solo acepta configuración del opener
original con ese token. Los horarios no se incluyen en la URL.

## Desarrollo y verificación

Node 20 o superior, sin dependencias para el motor y las pruebas de escritorio:

```powershell
npm test
```

Prueba de comunicación con el SDK real (después de clonar Kanlane como referencia):

```powershell
git clone --depth 1 https://github.com/yalerooo/Kanlane.git ../kanlane-referencia
$env:KANLANE_SDK_ROOT = (Resolve-Path ../kanlane-referencia/plugins/sdk).Path
node --test tests/core.test.cjs tests/desktop.test.cjs tests/sdk.test.cjs
```

Prueba visual opcional del panel con un anfitrión simulado:

```powershell
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

Para servirlo localmente: `python -m http.server 8080` e instala la URL localhost en
Kanlane. La página index fuera de Kanlane solo muestra instrucciones. desktop.html
necesita recibir el horario desde el botón del panel.

Validación de la entrega 1.1, 27/10/2026:

- 12 pruebas del calendario/motor, 6 pruebas de escritorio y 1 prueba del SDK real:
  **19 pruebas superadas**. Las pruebas de escritorio simulan la API Notification,
  el DOM y Web Locks para verificar permisos, autenticidad de mensajes, silencio,
  popup, posposición, descarte y bloqueo de una segunda ventana.
- Sintaxis de los archivos JavaScript comprobada.
- Pendiente: prueba visual y de entrega real en Windows con la cuenta de Kanlane.
  Este entorno no dispone de navegador y su descarga no estuvo disponible. Los
  tests no demuestran que Windows muestre un aviso o reproduzca sonido: usa la
  prueba de cinco segundos en tu equipo.

Base revisada de Kanlane: `c9222f9c23bbe3cea258459639621964ed20447e`, con sus guías
PLUGINS/NOTIFICACIONES, plantilla, temporizador, apariencia, SDK, plugin-host,
plugins-controller y toast-view. El SDK remoto puede cambiar en futuras versiones.
Identificador estable del plugin: `com.jmscb24.kanbell`. No lo cambies tras instalar.
