# DataMind BI — Análisis de Infraestructura para Monetización

> Fecha: 2025-01-12 | Versión actual: 0.3.9

## Situación Actual

| Componente | Ahora | Problema |
|-----------|-------|----------|
| **App** | Hostinger VPS + Coolify | ✅ Funciona |
| **Base de datos** | Supabase Free Tier | ⚠️ 500MB límite, dependencia de terceros |
| **Auth** | Supabase Auth | ⚠️ Atado al ecosistema Supabase |
| **Dominio** | `datamind.mooo.com` | ❌ No es profesional para cobrar |

## Opciones Evaluadas

### Opción A: Supabase Free + VPS actual
- **Costo**: ~$5-10/mes (solo VPS)
- **Pros**: Ya funciona, sin cambios
- **Contras**: Dominio no profesional, límite 500MB DB, dependencia total de Supabase

### Opción B: Supabase Pro + VPS nuevo
- **Costo**: ~$35/mes ($25 Supabase + $10 VPS)
- **Pros**: Soporte oficial, más recursos
- **Contras**: Caro para empezar sin clientes, sigue siendo dependencia

### Opción C: PostgreSQL propio + Supabase Auth free (RECOMENDADA)
- **Costo**: ~$10-15/mes (VPS nuevo)
- **Pros**: Dueño de tus datos, sin límites artificiales, auth gratis (50K MAU), dominio propio
- **Contras**: Migración de DB necesaria, Supabase Auth sigue siendo externo

### Opción D: Todo self-hosted (PostgreSQL + NextAuth)
- **Costo**: ~$10-15/mes (VPS nuevo)
- **Pros**: Máximo control, cero dependencias externas
- **Contras**: Reescribir auth = semanas de trabajo, Google OAuth más complejo

## Arquitectura Recomendada (Opción C)

```
Nuevo VPS (Coolify)
├── DataMind BI App (Next.js)
├── PostgreSQL (Coolify service)    ← Tus datos aquí
└── Supabase Auth (SaaS free tier)  ← Solo auth, sigue gratis
```

- **PostgreSQL propio** para los datos de negocio (Prisma solo necesita cambiar `DATABASE_URL`)
- **Supabase Auth** sigue manejando login/registro/Google OAuth (free tier cubre 50K MAU)
- Así **eres dueño de tus datos** sin reescribir el auth

## Plan de Migración

1. **Consigue el VPS nuevo + dominio propio** (`datamind.bi` o similar)
2. **Instala Coolify + PostgreSQL como servicio**
3. **Migra la base de datos** (cambiar `DATABASE_URL` en Prisma, correr `db push`)
4. **Mantén Supabase Auth** en modo free (solo para login, sin datos de negocio ahí)
5. **Configura Stripe** sobre la nueva infraestructura

## Notas sobre Auth

El auth con Supabase está profundamente integrado en el proyecto:

- `src/middleware.ts` — Middleware de sesión
- `src/utils/supabase/` — Client helpers (client, server, middleware)
- `src/components/auth/` — AuthProvider, AuthModal, UserMenu
- `src/app/api/auth/` — Sync y user endpoints
- `src/hooks/use-auth.ts` — Hook de autenticación
- Google OAuth configurado

Reescribir todo esto a NextAuth/self-hosted es posible pero representa semanas de trabajo. Conviene hacerlo cuando haya revenue entrando, no antes.

## Fases Pendientes del Roadmap

| Fase | Nombre | Status | Prioridad |
|------|--------|--------|-----------|
| 3 (cierre) | Onboarding + Redirect | ⬜ Pendiente | Alta — rápido, 1-2 sesiones |
| 4 | Stripe Payments | ⬜ Pendiente | Alta — clave para monetizar |
| 5 | Usage Dashboard + Métricas | ⬜ Pendiente | Media |
| 6 | Admin Panel | ⬜ Pendiente | Media |
| 7 | Hosting + Dominio | ⬜ Pendiente | Alta — credibilidad para cobrar |
| 8 | Seguridad + Legal | ⬜ Pendiente | Alta — necesario antes de vender |
| 9 | Onboarding + UX Polish | ⬜ Pendiente | Baja — iterar con feedback |

## Conclusión

El enfoque híbrido (PostgreSQL propio + Supabase Auth free) ofrece el mejor equilibrio entre control, costo y tiempo de implementación. Permite empezar a cobrar rápido con dominio profesional, siendo dueño de los datos de negocio, sin retrasarse semanas reescribiendo autenticación. La migración completa a self-hosted auth queda como tarea futura cuando haya revenue que la justifique.
