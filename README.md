# KanBell 1.2.0 · Recordatorios de fichaje para Kanlane

Recordatorios personales con horarios semanales, avisos internos y notificaciones del sistema a través de Kanlane. Horario inicial editable: entrada 08:30 y salida 13:30 de lunes a viernes.

## Actualizar

1. Sustituye los archivos publicados del plugin por los de esta versión y publica los cambios en GitHub Pages.
2. Actualiza o recarga Kanlane. Revisa los permisos de KanBell y aprueba **Notificaciones** además de los permisos de almacenamiento e integración de interfaz. Si no aparece el nuevo permiso, actualiza el plugin desde su URL en Kanlane.
3. Abre KanBell y pulsa **Probar notificación del sistema**. Permite las notificaciones de Kanlane en el navegador si te lo solicita. Si ya estaban permitidas, se reutiliza ese permiso.
4. Guarda tus horarios y mantén Kanlane abierto y KanBell cargado.

Esta versión requiere una versión de Kanlane con `wh.ui.notify()` y el permiso `notifications`. El manifiesto mantiene el identificador `com.jmscb24.kanbell` para conservar los horarios almacenados en la cuenta. Si hay una ventana auxiliar de una versión anterior abierta, ciérrala para evitar avisos duplicados. Los archivos antiguos `desktop.html` y `desktop.js` pueden eliminarse del alojamiento: ya no se utilizan.

## Cómo avisa

El motor en segundo plano comprueba cada 15 segundos los horarios y las posposiciones. Usa `wh.ui.notify()` para enviar la notificación a través de Kanlane, sin abrir otra ventana ni solicitar permisos para GitHub Pages. Después muestra el aviso interno, persistente o temporal según la preferencia. En KanBell puedes posponer 5, 10 o 15 minutos, descartar o abrir tu portal de fichaje. Descartar no registra un fichaje.

Los avisos usan la hora local del dispositivo. Un recordatorio se recupera durante los 10 minutos posteriores a su hora si el motor vuelve a ejecutarse. Cada aviso se registra antes de enviarse para evitar repetirlo al recargar. Solo vuelve a avisar si se pospone. No hay exclusión atómica entre varias pestañas o dispositivos.

Kanlane y el plugin deben seguir abiertos y cargados; los temporizadores pueden retrasarse si el navegador suspende la pestaña o el equipo. Cerrar el panel de KanBell conserva el motor en segundo plano mediante `ui:extend`. Cerrar Kanlane detiene las comprobaciones del plugin. No se han añadido avisos push con Kanlane cerrado.

Si se deniega el permiso o falla la notificación del sistema, el aviso interno sigue disponible. Kanlane limita las notificaciones de cada instancia a 6 por minuto. La duración y el sonido del aviso del sistema dependen de Kanlane, el navegador y Windows, incluidos sus ajustes de No molestar. Las preferencias de sonido y popup de KanBell se aplican al aviso interno.

## Calendario y datos

Puedes exportar los próximos 90 días como `.ics` para usar las alarmas de tu calendario fuera de Kanlane. Si cambias el horario, elimina la importación anterior y vuelve a importar. Los horarios se guardan en el almacenamiento personal de Kanlane y son comunes a tus proyectos. El plugin no ficha automáticamente ni almacena credenciales del portal.

## Comprobaciones de desarrollo

```sh
KANLANE_SDK_ROOT=/ruta/Kanlane/plugins/sdk npm test
```

Las pruebas usan el SDK real con un anfitrión simulado y comprueban el calendario, envío de `ui.notify`, ausencia de duplicados tras recargar y respaldo interno con permiso denegado. No verifican la entrega real de Windows. Las pruebas opcionales de panel necesitan `linkedom`; las de navegador, `playwright`.
