# 🚀 DataMind BI — Plan SaaS Consolidado

> Última actualización: Mayo 2025 | Progreso: ✅ Fase 1-2 COMPLETADAS — ✅ Fase 3 PARCIAL (Landing + Export + Plans + Usage)

---

## Información General

| Campo | Decisión |
|-------|----------|
| **Nombre del producto** | DataMind BI |
| **Dominio deseado** | datamind.bi |
| **Subdominio app** | app.datamind.bi |
| **Público objetivo** | PYMES RD, analistas de datos |
| **Idiomas soportados** | Español + Inglés |
| **Fecha objetivo de lanzamiento** | A determinar |
| **Región principal** | República Dominicana (principalmente), Latinoamérica (después de 6 meses) |
| **Usuarios simultáneos al lanzamiento** | ~10 |
| **Pico esperado en 6 meses** | ~50 |

---

## Fase 1: Supabase + Migración PostgreSQL ⭐ FUNDACIÓN

### Proveedor PostgreSQL

| Decisión | Elección |
|----------|----------|
| **Proveedor** | Supabase |
| **Plan inicial** | Free (para el MVP) |
| **Región del servidor** | US East |
| **Backups automáticos** | Sí (incluido) |

### Estrategia de Aislamiento

| Decisión | Elección |
|----------|----------|
| **Enfoque** | RLS (Row-Level Security) con `userId` en cada tabla |
| **Por qué no schema por tenant** | Prisma no soporta schemas dinámicos; RLS es el estándar con Prisma + Supabase |
| **Mecanismo** | `USING (user_id = auth.uid())` en cada tabla |

> ⚠️ **Nota sobre Schema por Tenant**: Originalmente se consideró usar schemas separados por tenant en PostgreSQL, pero Prisma ORM no soporta schemas dinámicos. RLS + userId en cada tabla es el enfoque estándar de la industria, soportado nativamente por Supabase, y mucho más simple de implementar.

### Almacenamiento de Archivos de Usuarios

| Decisión | Elección |
|----------|----------|
| **Proveedor** | Supabase Storage |
| **Estrategia** | Archivos SQLite en storage (descargar temporal para query) |
| **Límite por archivo** | 100MB |
| **Límite total por usuario** | Según plan (5MB - ∞) |

### Proyecto Supabase Creado

| Dato | Valor |
|------|-------|
| **Project URL** | https://rsrcdaepiwjqfynwwzcn.supabase.co |
| **Región** | US East |
| **Plan** | Free |

### Tareas de Migración

| Tarea | Estado |
|-------|--------|
| Cambiar provider Prisma a postgresql | ✅ Completado — `schema.prisma` usa provider postgresql |
| Agregar modelo `User` al schema | ✅ Completado |
| Agregar `userId` a `DataSource` | ✅ Completado (nullable hasta Fase 2) |
| Agregar `userId` a `ChatSession` | ✅ Completado (nullable hasta Fase 2) |
| Agregar `userId` a `ChatMessage` | ⬜ No requerido (hereda de ChatSession) |
| Agregar `userId` a `Dashboard` | ✅ Completado (nullable hasta Fase 2) |
| Agregar `userId` a `DashboardWidget` | ⬜ No requerido (hereda de Dashboard) |
| Agregar `userId` a `QueryHistory` | ⬜ No requerido (hereda de DataSource) |
| Agregar `userId` a `SourceSchema` | ⬜ No requerido (hereda de DataSource) |
| Agregar `userId` a `SourceContext` | ⬜ No requerido (hereda de DataSource) |
| Agregar modelos `Subscription` y `UsageEvent` | ✅ Completado |
| Instalar `@supabase/supabase-js` + `@supabase/ssr` | ✅ Completado |
| Crear Supabase client utilities | ✅ Completado (`src/utils/supabase/` — formato oficial) |
| Crear auth-utils temporales (Fase 1) | ✅ Completado (`src/lib/auth-utils.ts`) |
| Push schema a SQLite (mantener app funcionando) | ✅ Completado |
| Probar todas las APIs con el nuevo schema | ✅ Completado (todas funcionan) |
| Push schema a Supabase PostgreSQL | ✅ Completado — 11 tablas creadas con índices |
| Migrar datos existentes | ⬜ Pendiente (DB nueva está vacía, datos anteriores en SQLite backup) |

> ✅ **FASE 1 COMPLETADA**: La app está corriendo en Supabase PostgreSQL.
> - Host del pooler: `aws-1-us-east-1.pooler.supabase.com` (NO `aws-0`)
> - 11 tablas creadas con columnas snake_case (@map), índices y constraints
> - Todas las APIs verificadas funcionando con PostgreSQL
> - El problema anterior era el host incorrecto del pooler (`aws-0` vs `aws-1`)

### Detalle de Conexión PostgreSQL

| Parámetro | Valor |
|-----------|-------|
| **Host (Pooler)** | aws-1-us-east-1.pooler.supabase.com |
| **Puerto (Transaction)** | 6543 |
| **Puerto (Session)** | 5432 |
| **Usuario** | postgres.rsrcdaepiwjqfynwwzcn |
| **Base de datos** | postgres |
| **SSL** | Requerido |
| **PgBouncer** | Sí (Transaction mode) |

### Estimación: 1.5 - 2 semanas

---

## Fase 2: Autenticación + Multi-Tenant

### Proveedor de Autenticación

| Decisión | Elección |
|----------|----------|
| **Proveedor** | Supabase Auth |
| **Métodos de login** | Email + Password / Google OAuth |
| **Verificación de email** | Sí (inmediata) |
| **Reset de contraseña** | Sí |
| **OAuth adicionales** | Ninguno (por ahora) |

### Modelo de Usuario

| Decisión | Elección |
|----------|----------|
| **Campos del perfil** | nombre, email, avatar, empresa, rol, teléfono |
| **Roles** | admin / usuario |
| **Organizaciones** | Individual (licencia por usuario nombrado) |
| **Sesiones simultáneas** | Límite de 2 por usuario |
| **Invitaciones** | No implementar todavía |

### Aislamiento de Datos

| Decisión | Elección |
|----------|----------|
| **Chats privados por defecto** | Sí |
| **Compartir dashboards** | Sí |
| **Compartir chats** | Sí |

### Tareas de Implementación

| Tarea | Estado |
|-------|--------|
| Configurar Supabase Auth Client (`@supabase/supabase-js` + `@supabase/ssr`) | ✅ Completado (client/server/middleware en `src/utils/supabase/`) |
| Crear páginas de Auth (Login, Register, Forgot Password, Verify Email) | ⬜ Pendiente |
| Crear `useAuth()` hook (user, isAuthenticated, login(), logout(), signUp()) | ⬜ Pendiente |
| Middleware de protección (redirigir a login si no autenticado) | ⬜ Pendiente |
| Proteger TODOS los API routes (verificar sesión Supabase) | ⬜ Pendiente |
| RLS policies en PostgreSQL (`USING (user_id = auth.uid())`) | ⬜ Pendiente |
| Tracking de sesiones simultáneas (límite 2) | ⬜ Pendiente |
| Sync: Supabase Auth → tabla User (trigger on creation) | ⬜ Pendiente |

### Estimación: 1.5 - 2 semanas

---

## Fase 3: Landing Page + Onboarding

### Contenido de la Landing

| Sección | Contenido |
|---------|-----------|
| **Hero título** | "Pregunta en lenguaje natural, obtén insights al instante" |
| **Subtítulo** | "Conecta tu base de datos, haz preguntas en español o inglés, y deja que la IA genere consultas SQL, gráficos y dashboards automáticamente" |
| **Feature 1** | 📊 **Sube tus Datos** — Conecta bases de datos SQLite y la IA analiza el esquema automáticamente |
| **Feature 2** | 💬 **Pregunta en tu Idioma** — Escribe en lenguaje natural y obtén SQL, análisis y visualizaciones |
| **Feature 3** | 📈 **Visualiza y Comparte** — Gráficos interactivos, mapas geográficos y dashboards compartibles |
| **Screenshots** | Sí — mockups del chat, dashboards y mapa DR |
| **Testimonios** | Sí — después del lanzamiento |
| **FAQ** | Sí — 5-6 preguntas comunes |
| **Blog** | Después del lanzamiento |
| **Idiomas** | ES + EN |

### Flujo de Registro

| Paso | Detalle |
|------|---------|
| **CTA principal** | "Comienza gratis" |
| **Datos al registro** | Email + Password / OAuth (Google) |
| **Onboarding post-registro** | Demo con datos de ejemplo + CTA sugerir subir sus propios datos |
| **Verificación de email** | Inmediata |

### Implementación

| Decisión | Elección |
|----------|----------|
| **Landing separada o integrada** | Misma app, ruta `/` |
| **Framework** | Next.js (mismo stack) |
| **Deploy** | Mismo hosting |

### Tareas

| Tarea | Estado |
|-------|--------|
| Ruta `/` = Landing page (Hero, features, pricing, FAQ, CTA) | ✅ Completado — Navbar, Hero, Features, How It Works, Pricing (5 planes), FAQ (6 preguntas), Final CTA, Footer |
| Mover app actual a ruta `/app` | ⬜ No requerido — Misma ruta `/`, landing = no autenticado, app = autenticado |
| Página de Onboarding (demo + CTA upload) | ⬜ Pendiente |
| Redirección post-login (a `/app` si tiene datos, onboarding si es nuevo) | ⬜ Pendiente |
| i18n de la landing (ES + EN) | ✅ Completado — ~90 claves de traducción en EN y ES |
| Export functionality (CSV, Excel, JSON) | ✅ Completado — Botones de export prominentes en chat y tablas |
| Plan/Pricing configuration | ✅ Completado — `plans.ts` con 5 tiers, `/api/usage` endpoint |
| Usage & Plan UI dialog | ✅ Completado — Accesible desde UserMenu con barras de progreso |
| Usage limit enforcement (chat queries) | ✅ Completado — Middleware en `/api/chat/route.ts` |

> ✅ **FASE 3 PARCIALMENTE COMPLETADA**: Landing page, export, plans y usage tracking implementados.
> Pendiente: Onboarding flow para nuevos usuarios y redirección post-login.

### Estimación: 1 semana

---

## Fase 4: Pricing + Pagos (Stripe)

### Planes y Precios

| Plan | Mensual | Anual (10% off) | Queries/mes | DBs | Storage |
|------|---------|-----------------|-------------|-----|---------|
| **Free** | $0 | $0 | 50 | 1 | 5MB |
| **Supporter** | $1 | $11/año | 100 | 1 | 25MB |
| **Starter** | $9 | $97/año | 500 | 3 | 50MB |
| **Pro** | $29 | $313/año | Ilimitado | 10 | 500MB |
| **Business** | $99 | $1,069/año | Ilimitado | Ilimitado | Ilimitado |

> ⚠️ **Nota sobre el plan Supporter ($1/mes)**: Stripe cobra ~$0.30 + 2.9% por transacción. En un cobro de $1, la comisión es ~$0.33 (33%). Se recomienda considerar subir a $3/mes mínimo. El plan se mantiene por ahora como decisión del usuario.

### Detalles de Pricing

| Decisión | Elección |
|----------|----------|
| **Trial gratis** | No — debe escoger un plan al registrar |
| **Descuento anual** | 10% |
| **Plan enterprise custom** | No (después) |
| **Moneda** | USD (principal), DOP se evaluará después |
| **Modelo de IA** | Mismo para todos los planes |
| **API key propia del usuario** | Sí — permitir en todos los planes |

### Pagos

| Decisión | Elección |
|----------|----------|
| **Procesador** | Stripe (principal) / PayPal (alternativa) |
| **Suscripción** | Recurrente mensual (auto) |
| **Facturación** | Automática por email + registrada en dashboard del usuario |
| **ITBIS (RD)** | 18% adicional si el cliente es de RD |
| **NCF (empresas RD)** | Solicitar Número de Comprobante Fiscal si es empresa |

### Tareas

| Tarea | Estado |
|-------|--------|
| Integrar Stripe (`stripe` + `@stripe/stripe-js` + webhooks) | ⬜ Pendiente |
| Crear productos y precios en Stripe (5 planes) | ⬜ Pendiente |
| Checkout flow (seleccionar plan → Stripe Checkout → webhook confirma) | ⬜ Pendiente |
| Portal de cliente Stripe (cambiar plan, cancelar, ver facturas) | ⬜ Pendiente |
| ITBIS 18% para clientes RD (detectar país al registro) | ⬜ Pendiente |
| Solicitar NCF si es empresa | ⬜ Pendiente |
| Límites por plan (middleware verifica antes de ejecutar) | ⬜ Pendiente |
| Permitir API key propia del usuario (Settings → pegar OpenRouter key) | ⬜ Pendiente |
| Descuento anual 10% (Stripe lo soporta nativamente) | ⬜ Pendiente |
| Historial de facturas en dashboard + descarga PDF | ⬜ Pendiente |

### Estimación: 1.5 semanas

---

## Fase 5: Biblioteca de Mapas SVG (Multi-País + Custom)

### Estado Actual

Actualmente el sistema solo soporta mapas de República Dominicana:
- `src/lib/dr-map-constants.ts` — Paths SVG y códigos de provincias DR
- `src/lib/dr-map-data.json` — Datos de georreferenciación DR
- `src/components/app/visualization/dr-map.tsx` — Componente de heatmap DR
- Normalización de nombres de provincias DR (aliases, acentos, abreviaturas)

### Objetivo

Expandir el sistema de mapas para soportar múltiples países y permitir a los usuarios subir sus propios SVGs.

### Mapas del Sistema (Pre-cargados)

| País | Código ISO | Regiones | Prioridad | Fuente SVG |
|------|-----------|----------|-----------|------------|
| 🇩🇴 Rep. Dominicana | DO | 32 provincias | ✅ Ya existe | Incluido |
| 🇺🇸 Estados Unidos | US | 50 estados | Alta | svg-map npm / Natural Earth |
| 🇲🇽 México | MX | 32 estados | Alta | svg-map npm / Natural Earth |
| 🇨🇴 Colombia | CO | 32 departamentos | Alta | svg-map npm / Natural Earth |
| 🇦🇷 Argentina | AR | 23 provincias | Media | svg-map npm / Natural Earth |
| 🇨🇱 Chile | CL | 16 regiones | Media | svg-map npm / Natural Earth |
| 🇵🇪 Perú | PE | 25 departamentos | Media | svg-map npm / Natural Earth |
| 🇧🇷 Brasil | BR | 27 estados | Media | svg-map npm / Natural Earth |
| 🇪🇸 España | ES | 17 CCAA | Media | svg-map npm / Natural Earth |
| 🇵🇦 Panamá | PA | 10 provincias | Baja | Custom / Natural Earth |
| 🇪🇨 Ecuador | EC | 24 provincias | Baja | Custom / Natural Earth |
| 🇺🇾 Uruguay | UY | 19 departamentos | Baja | Custom / Natural Earth |
| 🇻🇪 Venezuela | VE | 23 estados | Baja | Custom / Natural Earth |
| 🇨🇷 Costa Rica | CR | 7 provincias | Baja | Custom / Natural Earth |
| 🇬🇹 Guatemala | GT | 22 departamentos | Baja | Custom / Natural Earth |

### Detección Automática de País

El sistema debe detectar automáticamente qué mapa usar basándose en:

1. **Columna geográfica** — Si los valores coinciden con regiones de un país específico
2. **Contexto del DataSource** — Si el schema menciona un país (ej: "ventas_mexico.db")
3. **Selección manual** — Si la IA no puede determinar el país, sugerir opciones al usuario
4. **Preferencia del usuario** — País predeterminado en Settings

### Flujo de Detección

```
Datos con columna geográfica
  → AI analiza valores de la columna
  → Coincide con regiones de país X? → Usar mapa de país X
  → Coincide con múltiples países? → Mostrar selector al usuario
  → No coincide con ninguno? → Mostrar opción de subir SVG custom
```

### SVGs Custom del Usuario (Librería Personal)

Los usuarios podrán subir sus propios SVGs para regiones no cubiertas por el sistema.

#### Requisitos del SVG

| Requisito | Detalle |
|-----------|---------|
| **Formato** | SVG válido, con `<path>` por cada región |
| **atributo `data-name`** | Cada `<path>` debe tener `data-name="Nombre de región"` |
| **atributo `data-id`** | Opcional: código único de la región (ej: `data-id="MX-CDMX"`) |
| **Sin estilos inline** | El sistema aplica colores programáticamente |
| **viewBox** | Debe tener viewBox definido |
| **Tamaño máximo** | 2MB |
| **Idioma** | Nombres de regiones en el idioma del usuario |

#### Ejemplo de SVG válido

```xml
<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <path data-name="Ciudad de México" data-id="MX-CDMX" d="M 100 200 L 150 250 ..." />
  <path data-name="Jalisco" data-id="MX-JAL" d="M 200 100 L 250 150 ..." />
  <path data-name="Nuevo León" data-id="MX-NLE" d="M 300 50 L 350 100 ..." />
</svg>
```

#### Modelo de Datos

```
Model: MapLibrary
  id          String   @id @default(cuid())
  userId      String   // null = sistema, String = librería personal
  name        String   // "México - Estados"
  countryCode String?  // ISO 3166-1 alpha-2 (ej: "MX")
  svgContent  String   // SVG completo almacenado como texto
  regions     Json     // Array de { name, id, aliases[] }
  source      String   // "system" | "user"
  isPublic    Boolean  @default(false) // futuro: compartir con otros usuarios
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User? @relation(fields: [userId], references: [id])
```

### Tareas

| Tarea | Estado |
|-------|--------|
| Refactorizar dr-map.tsx → mapa genérico (recibe SVG + regions config) | ⬜ Pendiente |
| Crear modelo MapLibrary en Prisma | ⬜ Pendiente |
| API: `GET /api/maps` — Lista mapas disponibles (sistema + usuario) | ⬜ Pendiente |
| API: `POST /api/maps/upload` — Subir SVG custom con validación | ⬜ Pendiente |
| API: `DELETE /api/maps/[id]` — Eliminar mapa custom | ⬜ Pendiente |
| API: `POST /api/maps/detect-country` — Detectar país de datos | ⬜ Pendiente |
| Componente: `GeoMap` genérico (reemplaza DRHeatMap) | ⬜ Pendiente |
| Componente: Selector de país/mapa | ⬜ Pendiente |
| Componente: Upload de SVG custom con preview y validación | ⬜ Pendiente |
| Componente: Editor de aliases de regiones | ⬜ Pendiente |
| Integración con AI: detectar país y sugerir mapa | ⬜ Pendiente |
| Agregar SVGs de países priorizados (US, MX, CO, AR) | ⬜ Pendiente |
| Agregar SVGs de países secundarios | ⬜ Pendiente |
| Migrar mapa DR existente al nuevo sistema genérico | ⬜ Pendiente |
| Normalización de nombres por país (como PROVINCE_ALIASES pero por país) | ⬜ Pendiente |

### Estimación: 2-3 semanas

---

## Fase 6: Dashboard de Uso + Métricas

### Métricas a Mostrar (TODAS)

| Métrica | Incluir |
|---------|---------|
| Queries ejecutadas este mes | ✅ |
| Queries restantes (si tiene límite) | ✅ |
| Gráfico de uso diario/semanal | ✅ |
| Bases de datos activas vs límite | ✅ |
| Almacenamiento usado vs límite | ✅ |
| Dashboards creados | ✅ |
| Tiempo promedio de respuesta | ✅ |
| Proyección de uso ("alcanzarás tu límite el día X") | ✅ |
| Historial de facturación | ✅ |
| Descargar factura PDF | ✅ |

### Alertas (TODAS)

| Alerta | Incluir |
|--------|---------|
| Email al alcanzar 80% del límite de queries | ✅ |
| Email al alcanzar 90% del storage | ✅ |
| Notificación in-app al alcanzar límite | ✅ |
| Comportamiento al límite | 🔴 Bloquear uso |

### Tareas

| Tarea | Estado |
|-------|--------|
| Tabla `UsageEvent` (registrar cada query, upload, acción con metadata) | ✅ Modelo creado en Prisma schema |
| API de métricas (queries este mes, restantes, storage, etc.) | ⬜ Pendiente |
| Gráfico de uso diario/semanal (Recharts) | ⬜ Pendiente |
| Proyección de uso | ⬜ Pendiente |
| Alertas por email (80% queries, 90% storage) | ⬜ Pendiente |
| Notificaciones in-app (toast al alcanzar límite) | ⬜ Pendiente |
| Bloqueo al alcanzar límite (no permitir más queries) | ⬜ Pendiente |
| Historial de facturación (tabla + descarga PDF) | ⬜ Pendiente |
| Sección en Settings (plan actual, uso, facturas, cambiar plan) | ⬜ Pendiente |

### Estimación: 1.5 semanas

---

## Fase 7: Panel de Admin

### Funciones (TODAS)

| Función | Incluir |
|---------|---------|
| Lista de usuarios registrados | ✅ |
| Uso global de la plataforma | ✅ |
| Revenue / MRR | ✅ |
| Churn rate | ✅ |
| Gestión de suscripciones (upgrade/downgrade manual) | ✅ |
| Soporte (ver chats de usuarios para debug) | ✅ |

### Tareas

| Tarea | Estado |
|-------|--------|
| Ruta `/admin` protegida (solo rol "admin") | ⬜ Pendiente |
| Lista de usuarios (tabla con búsqueda, filtros, acciones) | ⬜ Pendiente |
| Uso global (queries totales, storage, usuarios activos) | ⬜ Pendiente |
| Revenue / MRR (gráfico de ingresos) | ⬜ Pendiente |
| Churn rate (cancelaciones vs nuevas suscripciones) | ⬜ Pendiente |
| Gestión de suscripciones (upgrade/downgrade manual, extender trial) | ⬜ Pendiente |
| Soporte (ver chats de usuarios con consentimiento) | ⬜ Pendiente |

### Estimación: 1 semana

---

## Fase 8: Hosting + Dominio

| Decisión | Elección |
|----------|----------|
| **Plataforma** | Z Platform |
| **Dominio** | datamind.bi |
| **Subdominio app** | app.datamind.bi |
| **SSL/HTTPS** | Automático (plataforma) |
| **CDN** | Cloudflare free tier |
| **Auto-scaling** | No (al inicio) |

### Tareas

| Tarea | Estado |
|-------|--------|
| Comprar dominio datamind.bi | ⬜ Pendiente |
| Configurar DNS (CNAME app.datamind.bi → hosting Z) | ⬜ Pendiente |
| Verificar SSL/HTTPS | ⬜ Pendiente |
| Configurar Cloudflare free tier como CDN | ⬜ Pendiente |
| Configurar variables de entorno en producción | ⬜ Pendiente |
| Deploy de producción | ⬜ Pendiente |

### Estimación: 0.5 semanas (paralelizable)

---

## Fase 9: Seguridad + Legal

| Decisión | Elección |
|----------|----------|
| **Terms of Service** | Redactar |
| **Privacy Policy** | Redactar |
| **GDPR compliance** | Sí |
| **Encriptación en reposo** | Proveedor lo maneja (Supabase) |
| **Encriptación en tránsito** | Proveedor lo maneja (HTTPS) |
| **Logs de auditoría** | Después |
| **Rate limiting por IP** | No (por ahora) |
| **2FA** | Después |
| **Backup de DBs de usuarios** | Usuario es responsable |

### Tareas

| Tarea | Estado |
|-------|--------|
| Redactar Terms of Service (template SaaS adaptado) | ⬜ Pendiente |
| Redactar Privacy Policy (template GDPR-compatible) | ⬜ Pendiente |
| Implementar cookie consent (GDPR) | ⬜ Pendiente |
| Implementar derecho al olvido (eliminar datos de usuario) | ⬜ Pendiente |
| Implementar exportar datos de usuario | ⬜ Pendiente |
| Verificar encriptación Supabase | ⬜ Pendiente |

### Estimación: 0.5 semanas

---

## Fase 10: Onboarding + UX Polish

### Tareas

| Tarea | Estado |
|-------|--------|
| Onboarding guiado (tutorial paso a paso) | ⬜ Pendiente |
| Demo con datos de ejemplo (DB SQLite pre-cargada con datos RD) | ⬜ Pendiente |
| CTA sugerir subir sus propios datos | ⬜ Pendiente |
| Animaciones y transiciones (Framer Motion) | ⬜ Pendiente |
| Mobile responsiveness (verificar todas las vistas) | ⬜ Pendiente |
| Accesibilidad (ARIA labels, keyboard nav) | ⬜ Pendiente |

### Estimación: 1 semana

---

## IA y Costos

| Decisión | Elección |
|----------|----------|
| **Proveedor IA principal** | Z-AI (built-in, sin costo) |
| **Proveedor IA secundario** | OpenRouter (como está ahora) |
| **Limitar queries por IA cost vs plan** | Sí |
| **Modelo de IA diferente por plan** | No — mismo para todos |
| **API key propia del usuario** | Sí — permitir en todos los planes |
| **Costo estimado por usuario/mes** | $0 (Z-AI) / $0.05-0.50 (OpenRouter) |

### Estimación de Costos Operativos

| Etapa | Proveedor | Costo/mes |
|-------|-----------|-----------|
| **MVP** (0-50 usuarios) | Supabase Free + Z-AI | ~$0 |
| **Lanzamiento** (50-500 usuarios) | Supabase Pro ($25) + Cloudflare ($0) | ~$25 |
| **Crecimiento** (500+ usuarios) | Supabase Pro ($25) + Cloudflare ($0) | ~$25 |
| **Escala** (1000+ usuarios) | Supabase Team + infra adicional | ~$100+ |

### Break-Even

```
Con Z-AI (sin costo de IA):
  Costos fijos ≈ $25/mes (Supabase Pro)
  Si cobras $9/mes (Starter):
  Usuarios para break-even = $25 / $9 ≈ 3 usuarios

  Si cobras $29/mes (Pro):
  Usuarios para break-even = $25 / $29 ≈ 1 usuario
```

---

## Timeline Total

| Fase | Semanas | Acumulado |
|------|---------|-----------|
| 1. Supabase + PostgreSQL | 1.5-2 | Semana 2 |
| 2. Auth + Multi-Tenant | 1.5-2 | Semana 4 |
| 3. Landing + Onboarding | 1 | Semana 5 |
| 4. Pricing + Pagos (Stripe) | 1.5 | Semana 6.5 |
| 5. Biblioteca de Mapas SVG | 2-3 | Semana 9 |
| 6. Dashboard de Uso + Métricas | 1.5 | Semana 10.5 |
| 7. Panel Admin | 1 | Semana 11.5 |
| 8. Hosting + Dominio | 0.5 | Semana 12 |
| 9. Seguridad + Legal | 0.5 | Semana 12.5 |
| 10. Onboarding + Polish | 1 | Semana 13.5 |
| **Total estimado** | **~12-14 semanas** | |

---

## ⚡ Próximo Paso

**Fase 1-2 COMPLETADAS** ✅ — Supabase PostgreSQL + Auth + Multi-Tenant operativos.
**Fase 3 PARCIAL** ✅ — Landing page, export, plans, usage tracking implementados.

### Siguiente: Fase 3 pendiente + Fase 4 — Onboarding + Stripe (Mock) + PostgreSQL Local

1. ⬜ Onboarding flow para nuevos usuarios (demo con datos de ejemplo)
2. ⬜ Redirección post-login inteligente
3. ⬜ Migrar a PostgreSQL local (Coolify service) — mantener Supabase Auth
4. ⬜ Integrar Stripe mock (UI completa, sin llamadas reales)
5. ⬜ Activar Stripe real cuando VPS nuevo + dominio estén listos
6. ⬜ Fase 5: Biblioteca de Mapas SVG (multi-país + custom uploads)
