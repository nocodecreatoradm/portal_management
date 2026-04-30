# Documentación del Sistema: Gestión de Artes Sole (Auditoría I+D)

## 1. Arquitectura de Datos (Database Schema)

El sistema utiliza una estructura de datos normalizada para gestionar el ciclo de vida de los artes.

### Entidades Principales

#### Product
Representa el producto base según el maestro de SAP.
- `id`: Identificador único.
- `codigoSAP`: Referencia principal de SAP.
- `descripcionSAP`: Nombre del producto.
- `artworks`: Array de objetos `Artwork` (Versionamiento).
- `linea`: Categoría de producto (Agua Caliente, Línea Blanca, etc.).

#### Artwork
Representa una versión específica de un diseño (V1, V2, V3...).
- `version`: Número correlativo.
- `files`: Lista de archivos (PDF/Imagen) que componen la versión.
- `pdfComments`: Array de `PDFComment`.
- `idApproval / mktApproval / planApproval / provApproval`: Estados de aprobación de cada área.

#### PDFComment
Observaciones técnicas realizadas sobre el diseño.
- `page`: Número de página donde se realizó la observación.
- `x / y`: Coordenadas porcentuales sobre el canvas.
- `text`: Descripción técnica del hallazgo.
- `resolved`: Estado de la corrección.

---

## 2. Vistas y Aplicación

### Dashboard (Lienzo Principal)
Centraliza todos los proyectos activos de la Gerencia de Innovación y Calidad.
- **Reportería**: Widgets superiores con conteos automáticos de estados.
- **Grid**: Cards con visualización del último arte aprobado y progreso de inspección.

### PDF Reviewer (Motor Power Apps V4)
Herramienta avanzada de inspección técnica.
- **Renderizado**: Basado en `react-pdf` para soportar archivos pesados con paginación.
- **Interacción**: Sistema de pines vinculados a la bitácora lateral.
- **Control**: Barra superior con zoom, cambio de página y descarga nativa.

---

## 3. Flujo de Estados

| Estado | Significado | Visual en UI |
| :--- | :--- | :--- |
| `pending` | Esperando revisión inicial. | Badge Gris / Reloj |
| `approved` | El área valida que el arte cumple los requisitos. | Badge Verde / Check |
| `rejected` | Se encontraron hallazgos críticos que requieren nueva versión. | Badge Rojo / X |

---

## 4. Acciones de Usuario

1. **Nueva Auditoría**: Al hacer clic en un proyecto, se abre el modal de detalle con el historial.
2. **Inspección Técnica**: Al abrir el PDF, el auditor marca puntos específicos.
3. **Validación**: Los comentarios se marcan como "Resueltos" cuando el diseñador sube una corrección.
4. **Cierre de Proyecto**: Solo se permite cuando los 4 pilares están en `approved`.

---

## 5. Próximos Pasos (Escalabilidad)
- **Integración Firebase**: Transición hacia almacenamiento persistente y autenticación real.
- **Notificaciones**: Avisos por correo automáticos al proveedor ante rechazos.
- **OCR**: Extracción automática de textos legales para validación automática.
