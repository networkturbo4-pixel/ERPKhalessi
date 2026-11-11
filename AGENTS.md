# Reglas de Arquitectura y UI — Khalessi Pizza ERP

## 1. Prohibición Estricta de Avisos Nativos o Genéricos (`NO_NATIVE_DIALOGS`)
- **NUNCA** utilices funciones nativas del navegador como `window.alert()`, `alert()`, `window.confirm()`, `confirm()`, `window.prompt()` o `prompt()`.
- **NUNCA** renderices cuadros de aviso genéricos sin identidad visual del sistema.
- **Uso Obligatorio:**
  - Para confirmaciones, advertencias operativas, validaciones críticas o acciones destructivas, invoca siempre `openNoticeModal(...)` del `SettingsContext` (renderizado mediante `<dialog>` nativo accesible en `SystemNoticeModal.tsx` respetando el `modalStyle` configurado: `halo`, `frost`, `executive` o `minimalist`).
  - Para notificaciones de estado efímeras o alertas en segundo plano, utiliza `dispatchToast(...)` con apilamiento inteligente 3D (`ToastContainer.tsx`), evitando saturar la pantalla con filas largas de alertas.

## 2. Regla Tipográfica y de Botones en Modales (`SINGLE_LINE_MODAL_ACTIONS`)
- Todo botón de acción dentro de cualquier modal (`Cancelar`, `Seguir Editando`, `Descartar`, `Guardar y Continuar`, `Confirmar`, etc.) **DEBE** mantenerse en **una sola línea** usando `whitespace-nowrap shrink-0`.
- El contenedor del modal debe contar con ancho suficiente (`max-w-lg` o superior cuando tenga 3 acciones) para que el texto de los botones jamás se divida en dos renglones.

## 3. Persistencia y Multisucursal
- Todo cambio de configuración, RBAC, usuarios o sedes debe sincronizarse de inmediato con el almacenamiento persistente (`localStorage` / backend PostgreSQL) para que recargar el navegador (`F5`) nunca reinicie el estado a cero.
- Todas las vistas operativas deben respetar el contexto de sucursal activa (`activeTenant` o vista `consolidated`).
