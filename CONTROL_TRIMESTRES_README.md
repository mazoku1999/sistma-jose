# Sistema de Control de Trimestres por Profesor

## 📋 Descripción

Este sistema permite al administrador habilitar o deshabilitar trimestres individuales para cada profesor, controlando cuándo pueden subir notas al sistema.

## 🎯 Funcionalidades Implementadas

### 1. **Base de Datos**
- ✅ Nueva tabla `profesores_trimestres_habilitados` creada
- ✅ Relación con profesores, gestiones académicas y usuarios
- ✅ Control por trimestre (1, 2, 3) y por gestión académica
- ✅ Registro de quién habilitó y cuándo

### 2. **Backend API**

#### **Admin - Gestión de Trimestres**
- `GET /api/admin/profesores/[id]/trimestres`
  - Consulta trimestres habilitados para un profesor
  - Solo accesible por administradores
  
- `POST /api/admin/profesores/[id]/trimestres`
  - Habilita/deshabilita trimestres individuales
  - Registra quién realizó el cambio y cuándo

#### **Profesor - Consulta de Permisos**
- `GET /api/profesores/trimestres-habilitados`
  - El profesor consulta sus propios trimestres habilitados
  - Retorna estado para cada trimestre (1, 2, 3)

#### **Validación en Guardado de Notas**
- `POST /api/aulas/[id]/notas` - **MODIFICADO**
  - Valida que el profesor tenga el trimestre habilitado antes de guardar
  - Retorna error 403 si el trimestre está bloqueado
  - Los tutores no tienen restricciones (pueden guardar en cualquier trimestre)

### 3. **Interfaz de Administrador**

**Ubicación:** `/app/(auth)/admin/profesores/page.tsx`

**Características:**
- ✅ Sección "Control de Trimestres" en el formulario de edición de profesor
- ✅ Solo visible para profesores (no para admin o administrativo)
- ✅ Switch para cada trimestre con indicadores visuales:
  - 🟢 Verde: Trimestre habilitado
  - ⚪ Gris: Trimestre deshabilitado
- ✅ Información de períodos (Feb-May, May-Ago, Sep-Dic)
- ✅ Actualización en tiempo real con feedback al usuario

### 4. **Interfaz del Profesor**

**Ubicación:** `/app/(auth)/aulas/[id]/notas/page.tsx`

**Características:**
- ✅ Alerta visual cuando el trimestre no está habilitado
- ✅ Botón "Guardar Notas" deshabilitado si el trimestre está bloqueado
- ✅ Tooltip explicativo al pasar el mouse sobre el botón
- ✅ Validación adicional al intentar guardar
- ✅ Los tutores NO tienen restricciones (pueden trabajar con todos los trimestres)

## 🚀 Instalación

### 1. Ejecutar Migration Script

Para bases de datos **NUEVAS**:
```bash
# Ya incluido en bd.sql
```

Para bases de datos **EXISTENTES**:
```bash
mysql -u tu_usuario -p sis_escolar < scripts/add-profesor-trimestres-control.sql
```

### 2. Habilitar Trimestres por Defecto (Opcional)

Si quieres que todos los profesores existentes tengan todos los trimestres habilitados:

```sql
-- Descomentar en el script de migración o ejecutar manualmente:
INSERT INTO profesores_trimestres_habilitados (id_profesor, id_gestion, trimestre, habilitado, fecha_habilitacion, habilitado_por)
SELECT 
  p.id_profesor,
  ga.id_gestion,
  t.trimestre,
  TRUE,
  NOW(),
  1 -- ID del usuario admin
FROM profesores p
CROSS JOIN gestiones_academicas ga
CROSS JOIN (SELECT 1 as trimestre UNION SELECT 2 UNION SELECT 3) t
WHERE ga.activa = TRUE
ON DUPLICATE KEY UPDATE habilitado = TRUE;
```

## 📖 Uso del Sistema

### Como Administrador

1. Ir a **Gestión de Usuarios**
2. Editar un profesor existente
3. Desplazarse a la sección **"Control de Trimestres"**
4. Activar/desactivar los trimestres según necesidad
5. Los cambios se aplican inmediatamente

### Como Profesor

1. Al ingresar a **Ingreso de Notas** de un aula
2. Si el trimestre actual NO está habilitado:
   - Verás una alerta roja en la parte superior
   - El botón "Guardar Notas" estará deshabilitado
   - Podrás visualizar pero no modificar notas
3. Si el trimestre SÍ está habilitado:
   - Podrás guardar notas normalmente

### Tutores

Los profesores marcados como **tutores** NO tienen restricciones:
- Pueden subir notas en cualquier trimestre
- No ven alertas de bloqueo
- Tienen acceso completo siempre

## 🔒 Reglas de Negocio

1. **Por defecto**, los trimestres están DESHABILITADOS para nuevos profesores
2. El **administrador** debe habilitar explícitamente cada trimestre
3. La habilitación es **por profesor** y **por gestión académica**
4. Los **tutores** siempre tienen acceso completo (sin restricciones)
5. Los **administradores** pueden ver y modificar las restricciones pero no las sufren
6. La validación ocurre tanto en **frontend** (UX) como en **backend** (seguridad)

## 🗂️ Archivos Modificados/Creados

### Nuevos Archivos
- `scripts/add-profesor-trimestres-control.sql` - Script de migración
- `app/api/admin/profesores/[id]/trimestres/route.ts` - API admin
- `app/api/profesores/trimestres-habilitados/route.ts` - API profesor

### Archivos Modificados
- `scripts/bd.sql` - Tabla agregada
- `app/(auth)/admin/profesores/page.tsx` - UI de control
- `app/(auth)/aulas/[id]/notas/page.tsx` - Alertas y validación
- `app/api/aulas/[id]/notas/route.ts` - Validación backend

## 🧪 Pruebas Sugeridas

1. **Test Admin:**
   - Crear un profesor
   - Habilitar solo el trimestre 1
   - Verificar que los trimestres 2 y 3 estén deshabilitados

2. **Test Profesor:**
   - Iniciar sesión como profesor
   - Intentar subir notas en trimestre deshabilitado
   - Verificar mensaje de error
   - Cambiar a trimestre habilitado
   - Verificar que funciona correctamente

3. **Test Tutor:**
   - Iniciar sesión como tutor
   - Verificar que puede subir notas en cualquier trimestre
   - No debe ver alertas de bloqueo

4. **Test API:**
   - Intentar POST a `/api/aulas/[id]/notas` con trimestre bloqueado
   - Verificar respuesta 403
   - Verificar con trimestre habilitado
   - Debe retornar 200 OK

## 🔧 Configuración Adicional

### Cambiar comportamiento por defecto

Editar en `scripts/add-profesor-trimestres-control.sql`:
```sql
habilitado BOOLEAN DEFAULT FALSE  -- Cambiar a TRUE si quieres habilitar por defecto
```

### Personalizar períodos de trimestres

Editar en `app/(auth)/admin/profesores/page.tsx`:
```tsx
{trimestre === 1 && "Feb - May"}  // Personalizar según calendario escolar
```

## ⚠️ Consideraciones Importantes

1. Los cambios en trimestres son **inmediatos** - no requieren reiniciar sesión
2. La validación es **por gestión académica** - cambios de gestión pueden requerir reconfiguración
3. Los **administradores SIEMPRE pueden ver** el estado de trimestres de cualquier profesor
4. No hay **auditoría completa** - solo se registra la última modificación

## 🐛 Troubleshooting

### Problema: Profesor no puede guardar notas
**Solución:** Verificar que el administrador haya habilitado el trimestre actual

### Problema: Cambios no se reflejan
**Solución:** Recargar la página del profesor (F5)

### Problema: Admin no puede habilitar trimestres
**Solución:** Verificar que el usuario tenga rol ADMIN en la base de datos

### Problema: Error 403 al guardar
**Solución:** El trimestre está bloqueado, contactar al administrador

## 📞 Soporte

Para soporte adicional o reportar problemas:
- Revisar logs del servidor
- Verificar tablas de base de datos
- Consultar este README

---

**Implementado:** Octubre 2025
**Versión:** 1.0
**Estado:** ✅ Funcional
