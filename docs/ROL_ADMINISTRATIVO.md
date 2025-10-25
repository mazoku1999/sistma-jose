# Rol ADMINISTRATIVO - Documentación

## Descripción
Se ha agregado un nuevo rol **ADMINISTRATIVO** al sistema que tiene acceso restringido únicamente a:
- **Central de Notas**: `/admin/central`
- **Reportes**: `/admin/reportes/*`

Este rol es ideal para personal administrativo que necesita acceder a información académica sin tener permisos completos de administración.

## Credenciales de Usuario de Prueba
```
Usuario: administrativo
Password: admin123
Email: administrativo@sistema.com
```

## Archivos Modificados

### 1. Base de Datos
**Archivo**: `scripts/bd.sql`
- Se agregó el rol `ADMINISTRATIVO` en la tabla `roles`
- Se creó un usuario de ejemplo con rol administrativo
- Se asignó el rol al usuario mediante `usuario_roles`

**Script de migración**: `scripts/add-administrativo-role.sql`
- Script SQL para agregar el rol en bases de datos existentes
- Incluye validaciones para evitar duplicados

### 2. Middleware
**Archivo**: `middleware.ts`
- Se actualizó la validación de acceso a rutas `/admin`
- Se permite acceso a usuarios con rol `ADMIN` o `ADMINISTRATIVO`
- Se restringe a usuarios `ADMINISTRATIVO` solo a rutas permitidas:
  - `/admin/central`
  - `/admin/reportes/*`
- Si un usuario `ADMINISTRATIVO` intenta acceder a otras rutas admin, es redirigido a `/admin/central`

### 3. Layout / Navegación
**Archivo**: `components/teacher-layout.tsx`
- Se agregó la constante `isAdministrativo` para detectar usuarios con este rol
- Se creó una sección de navegación específica para usuarios `ADMINISTRATIVO` que muestra:
  - **Académico**: Central de Notas
  - **Reportes**: 
    - Mejores Estudiantes
    - Asistencia General
    - Rendimiento por Materias
    - Estadísticas Generales

### 4. Permisos en Central de Notas
**Archivo**: `app/(auth)/admin/central/page.tsx`
- Se actualizó `canCentralize` para permitir acceso a usuarios con rol `ADMINISTRATIVO`
- Ahora verifica: `ADMIN` OR `ADMINISTRATIVO`

### 5. Gestión de Usuarios
**Archivo**: `app/(auth)/admin/profesores/page.tsx`
- Se agregó `ADMINISTRATIVO` como opción de rol en el formulario
- Se actualizó el tipo de `formData.role` para incluir `"ADMINISTRATIVO"`
- Se modificó la lógica de detección de rol al editar usuarios
- Se agregó Badge de color azul para usuarios administrativos
- Se agregó la opción en el selector de roles del formulario

## Diferencias entre Roles

### ADMIN (Administrador)
- ✅ Acceso completo al sistema
- ✅ Gestión de colegios, usuarios, materias, gestiones
- ✅ Asignación de docentes y estudiantes
- ✅ Central de notas
- ✅ Todos los reportes
- ✅ Configuraciones del sistema

### ADMINISTRATIVO (Personal Administrativo)
- ❌ Sin acceso a gestión de usuarios
- ❌ Sin acceso a configuraciones
- ❌ Sin acceso a asignaciones
- ✅ **Solo** Central de notas
- ✅ **Solo** Reportes
- ℹ️ Acceso de solo lectura/visualización

### PROFESOR
- ✅ Gestión de sus aulas asignadas
- ✅ Registro de asistencia y notas
- ✅ Reportes de sus aulas
- ❌ Sin acceso a funciones administrativas

## Cómo Usar

### Aplicar en Base de Datos Nueva
Si estás configurando el sistema desde cero:
1. Ejecuta el script `scripts/bd.sql` (ya incluye el nuevo rol)

### Aplicar en Base de Datos Existente
Si ya tienes el sistema en producción:
1. Ejecuta el script: `scripts/add-administrativo-role.sql`
   ```bash
   mysql -u usuario -p nombre_base_datos < scripts/add-administrativo-role.sql
   ```

### Crear Nuevos Usuarios Administrativos
1. Ve a **Administración** → **Usuarios**
2. Crea un nuevo usuario
3. Selecciona **Rol principal**: `Administrativo`
4. Guarda

### Convertir Usuario Existente a Administrativo
1. Ve a **Administración** → **Usuarios**
2. Edita el usuario deseado
3. Cambia el **Rol principal** a `Administrativo`
4. Guarda

## Navegación del Usuario Administrativo

Cuando un usuario con rol `ADMINISTRATIVO` inicia sesión, verá en el menú lateral:

```
📊 Dashboard
   ├─ 📋 Académico
   │   └─ Central de Notas
   │
   └─ 📊 Reportes
       ├─ Mejores Estudiantes
       ├─ Asistencia General
       ├─ Rendimiento por Materias
       └─ Estadísticas Generales
```

## Seguridad

### Protección a Nivel de Middleware
- Las rutas están protegidas en `middleware.ts`
- Cualquier intento de acceder a rutas no permitidas redirige a `/admin/central`

### Protección a Nivel de UI
- El menú de navegación solo muestra opciones permitidas
- Los usuarios no ven opciones administrativas completas

### Protección a Nivel de API
⚠️ **Importante**: Asegúrate de que las APIs también validen los permisos del usuario.

## Consideraciones

1. **Permisos de Solo Lectura**: Los usuarios administrativos pueden ver la central de notas y reportes, pero considera si deberían poder centralizar notas o solo visualizar.

2. **Personalización Futura**: Si necesitas dar más o menos permisos, modifica:
   - `middleware.ts`: Array `allowedPaths`
   - `teacher-layout.tsx`: Sección de menú para `isAdministrativo`

3. **Auditoría**: Considera agregar logs de auditoría para acciones de usuarios administrativos.

## Próximos Pasos Recomendados

1. **Permisos Granulares**: Implementar permisos específicos por módulo en la base de datos
2. **API Protection**: Validar roles en cada endpoint de API
3. **Logs de Auditoría**: Registrar acciones de usuarios administrativos
4. **Dashboard Personalizado**: Crear un dashboard específico para usuarios administrativos
