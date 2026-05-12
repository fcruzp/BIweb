# DataMind BI — Análisis de Infraestructura para Monetización

> Fecha: 2025-01-12 | Versión actual: 0.3.9

## Situación Actual

| Componente | Ahora | Problema |
|-----------|-------|----------|
| **App** | Hostinger VPS + Coolify | ✅ Funciona |
| **Base de datos** | Supabase Free Tier | ⚠️ 500MB límite, dependencia de terceros |
| **Auth** | Supabase Auth | ✅ Funciona bien, se mantiene |
| **Dominio** | `datamind.mooo.com` | ❌ No es profesional para cobrar |

## Estrategia de Dos VPS

| Ambiente | VPS | Dominio | Propósito |
|----------|-----|---------|-----------|
| **Staging** | VPS actual (Hostinger) | `datamind.mooo.com` | Pruebas, desarrollo, QA |
| **Producción** | VPS nuevo | `datamind.bi` (por comprar) | Clientes reales, pagos Stripe |

### Flujo de trabajo

```
Desarrollo local → Push a GitHub → Staging (auto-deploy) → Testing → Producción (manual deploy)
```

- Staging se actualiza automáticamente con cada push (Coolify webhook)
- Producción solo se actualiza cuando se verifica en staging

---

## Arquitectura por Ambiente

### Staging (VPS actual)

```
VPS Hostinger (Coolify)
├── DataMind BI App (Next.js)       ← datamind.mooo.com
├── PostgreSQL (Coolify service)     ← Datos de prueba
└── Supabase Auth (SaaS free tier)  ← Auth compartido
```

### Producción (VPS nuevo)

```
VPS Nuevo (Coolify)
├── DataMind BI App (Next.js)       ← datamind.bi
├── PostgreSQL (Coolify service)     ← Datos reales de clientes
└── Supabase Auth (SaaS free tier)  ← Mismo Auth, misma cuenta
```

**Auth es compartido** — Supabase Auth funciona para ambos dominios (configurar como additional domain en Supabase Dashboard). Un usuario creado en staging funciona en producción y viceversa.

**PostgreSQL es independiente** — Cada VPS tiene su propia base de datos. Datos de prueba en staging, datos reales en producción.

---

## Fase 4 Revisada: PostgreSQL Local + Stripe Mock

### 4.0 — Migrar a PostgreSQL local (en VPS actual/staging)

**Objetivo**: Dejar de depender de Supabase como base de datos. Solo usar Supabase para Auth.

#### Pasos:

1. **Instalar PostgreSQL como servicio en Coolify** (VPS actual)
2. **Actualizar Prisma** — Cambiar provider y connection string
3. **Crear la base de datos** — `bun run db push` contra PostgreSQL local
4. **Migrar datos existentes** — Exportar de Supabase PostgreSQL → Importar a local
5. **Actualizar variables de entorno** en Coolify:
   - `DATABASE_URL=postgresql://user:pass@localhost:5432/datamind`
   - Mantener `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (para Auth)
6. **Verificar** — Todo funciona igual pero con DB local
7. **Redeploy** en Coolify

#### Lo que NO cambia:

- `src/utils/supabase/` — Client helpers siguen funcionando (solo para Auth)
- `src/components/auth/` — AuthProvider, AuthModal, UserMenu intactos
- `src/middleware.ts` — Sesión sigue con Supabase Auth
- Google OAuth — Sigue funcionando

#### Lo que SÍ cambia:

- `prisma/schema.prisma` — `provider = "postgresql"` (ya lo es, pero apunta a DB local)
- `DATABASE_URL` — Apunta a PostgreSQL local en vez de Supabase
- Datos ahora viven en el VPS, no en Supabase

#### Rollback plan:

Si algo falla, solo hay que cambiar `DATABASE_URL` de vuelta a Supabase y redeployear. La DB en Supabase sigue existiendo hasta que confirmemos que todo funciona.

---

### 4.1 a 4.6 — Stripe Mock (según STRIPE-PLAN.md)

Una vez PostgreSQL local esté funcionando, se procede con la integración Stripe en modo mock.

---

## Fases Pendientes del Roadmap (Actualizado)

| Fase | Nombre | Status | Notas |
|------|--------|--------|-------|
| **3 (cierre)** | Onboarding + Redirect | ⬜ Pendiente | Rápido, 1-2 sesiones |
| **4.0** | PostgreSQL Local (Staging) | ⬜ Pendiente | Migrar DB a Coolify PostgreSQL, Auth sigue en Supabase |
| **4.1-4.6** | Stripe Mock | ⬜ Pendiente | UI completa, sin llamadas reales a Stripe |
| **5** | Usage Dashboard + Métricas | ⬜ Pendiente | |
| **6** | Admin Panel | ⬜ Pendiente | |
| **7** | VPS Nuevo + Dominio Producción | ⬜ Pendiente | Comprar VPS + `datamind.bi`, configurar Coolify |
| **7.5** | Stripe Live | ⬜ Pendiente | Activar Stripe real en producción |
| **8** | Seguridad + Legal | ⬜ Pendiente | ToS, Privacidad, GDPR, cookies |
| **9** | Onboarding + UX Polish | ⬜ Pendiente | Tutorial, demo data, animaciones |

---

## Checklist para Producción

Cuando el VPS nuevo y dominio estén listos:

- [ ] Comprar VPS nuevo
- [ ] Comprar dominio `datamind.bi`
- [ ] Instalar Coolify en VPS nuevo
- [ ] Configurar PostgreSQL como servicio
- [ ] Configurar Supabase Auth para dominio `datamind.bi` (additional redirect URL)
- [ ] Crear cuenta Stripe Live
- [ ] Configurar productos/precios en Stripe Dashboard
- [ ] Setear `STRIPE_MODE=live` en VPS nuevo
- [ ] Configurar webhook Stripe → `https://datamind.bi/api/billing/webhook`
- [ ] Deploy DataMind BI en VPS nuevo
- [ ] Verificar flujo completo end-to-end
- [ ] DNS: apuntar `datamind.bi` al VPS nuevo
- [ ] SSL: Let's Encrypt via Coolify/Traefik

---

## Conclusión

La estrategia de dos VPS (staging + producción) con PostgreSQL local y Supabase Auth ofrece:

1. **Control total de datos** — PostgreSQL propio en cada VPS
2. **Auth sin fricción** — Supabase Auth funciona para ambos ambientes
3. **Testing seguro** — Staging para probar antes de production
4. **Migración incremental** — Primero PostgreSQL local en staging, luego VPS nuevo para producción
5. **Rollback fácil** — Si PostgreSQL local falla, volver a Supabase DB es solo cambiar `DATABASE_URL`
