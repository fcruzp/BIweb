# DataMind BI — Plan de Integración Stripe (Fase 4)

> Fecha: 2025-01-12 | Versión: 0.3.9 → 0.4.x

## Estrategia: Stripe Cascaron (Mock)

**Principio**: Construir toda la UI y lógica de flujo de pago, pero **sin llamadas reales a la API de Stripe**. Se simula que el pago fue exitoso. Cuando el VPS y dominio estén listos, se reemplaza el mock por la integración real.

### ¿Por qué cascaron primero?

- No tener VPS/dominio propio significa no poder configurar webhooks de Stripe
- No se puede probar el flujo completo sin HTTPS y dominio verificado
- Pero sí podemos construir y probar toda la UI, navegación, y lógica de estado
- Cuando se active de verdad, solo se cambia la capa de API — el frontend queda intacto

---

## Plan de Implementación

### 4.1 — Modelo de datos para suscripciones
- [ ] Actualizar modelo `Subscription` en Prisma (ya existe, verificar campos necesarios)
- [ ] Campos clave: `plan`, `status`, `currentPeriodStart`, `currentPeriodEnd`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`
- [ ] Ejecutar `db push`

### 4.2 — API Routes (Mock)
- [ ] `POST /api/billing/checkout` — Simula creación de Stripe Checkout Session, devuelve URL mock
- [ ] `POST /api/billing/portal` — Simula Stripe Customer Portal, devuelve URL mock
- [ ] `GET /api/billing/subscription` — Retorna estado actual de suscripción del usuario
- [ ] `POST /api/billing/webhook` — Endpoint vacío (sin validación real),预留 para cuando Stripe llame
- [ ] `POST /api/billing/simulate-success` — **Solo en mock** — Simula webhook `checkout.session.completed`, actualiza DB

### 4.3 — Frontend: Flujo de Upgrade
- [ ] Botón "Upgrade" / "Elegir Plan" en Usage & Plan dialog → llama `/api/billing/checkout`
- [ ] Página de redirección `/billing/success` — Muestra confirmación de pago exitoso
- [ ] Página de redirección `/billing/cancel` — Muestra que el pago fue cancelado
- [ ] En modo mock: el botón simula el checkout y redirige a `/billing/success` directamente

### 4.4 — Frontend: Customer Portal
- [ ] Botón "Manage Subscription" en Usage & Plan dialog → llama `/api/billing/portal`
- [ ] En modo mock: muestra un dialog local con opciones (cambiar plan, cancelar)
- [ ] En modo real: redirige al Stripe Customer Portal

### 4.5 — Protección de rutas por plan
- [ ] Middleware/validación: verificar `subscription.plan` antes de permitir acciones premium
- [ ] Integrar con el sistema de usage limits existente
- [ ] Mostrar upgrade prompt cuando se excede el límite del plan

### 4.6 — Toggle Mock ↔ Real
- [ ] Variable de entorno `STRIPE_MODE=mock|live`
- [ ] Cuando `mock`: todas las APIs usan simulación
- [ ] Cuando `live`: usan `stripe` SDK con `STRIPE_SECRET_KEY`
- [ ] Archivo `src/lib/billing/stripe-client.ts` — Factory que devuelve mock o real según env
- [ ] Archivo `src/lib/billing/stripe-mock.ts` — Toda la lógica mock
- [ ] Archivo `src/lib/billing/stripe-live.ts` — Toda la lógica real (vacía por ahora, se llena después)

---

## Estructura de Archivos

```
src/
├── lib/
│   └── billing/
│       ├── index.ts              # Export principal
│       ├── plans.ts              # Ya existe (PLANS, PLAN_ORDER)
│       ├── stripe-client.ts      # Factory: mock vs live
│       ├── stripe-mock.ts        # Implementación mock
│       └── stripe-live.ts        # Implementación real (placeholder)
├── app/
│   ├── api/
│   │   └── billing/
│   │       ├── checkout/route.ts
│   │       ├── portal/route.ts
│   │       ├── subscription/route.ts
│   │       ├── webhook/route.ts
│   │       └── simulate-success/route.ts  # Solo mock
│   └── billing/
│       ├── success/page.tsx
│       └── cancel/page.tsx
└── components/
    └── app/
        └── billing/
            ├── upgrade-button.tsx
            ├── billing-dialog.tsx     # Portal mock local
            └── plan-comparison.tsx    # Reutilizar del usage-plan-dialog existente
```

---

## Criterios de Aceptación (Mock)

1. ✅ Usuario puede hacer click en "Elegir Plan" → ve pantalla de confirmación
2. ✅ Al "pagar" (mock), su plan se actualiza en la DB
3. ✅ El Usage & Plan dialog refleja el nuevo plan
4. ✅ Los límites del plan se aplican correctamente
5. ✅ Usuario puede "cancelar suscripción" → vuelve a Free
6. ✅ No hay llamadas reales a Stripe en ningún momento
7. ✅ Console no muestra errores de API key faltante
8. ✅ Toggle `STRIPE_MODE=mock` funciona sin configuración adicional

## Criterios de Aceptación (Live — futuro)

1. Stripe Checkout real con tarjeta
2. Webhooks recibidos y validados (signature)
3. Customer Portal funcional
4. ITBIS (18%) incluido en precios
5. NCF en facturas
6. Factura PDF generada

---

## Activación a Producción (Checklist futuro)

Cuando el VPS y dominio estén listos:

- [ ] Crear cuenta Stripe Live
- [ ] Configurar productos y precios en Stripe Dashboard
- [ ] Setear `STRIPE_SECRET_KEY` y `STRIPE_PUBLISHABLE_KEY` en Coolify env
- [ ] Setear `STRIPE_MODE=live`
- [ ] Configurar webhook endpoint en Stripe Dashboard → `https://datamind.bi/api/billing/webhook`
- [ ] Probar flujo completo con tarjeta de prueba
- [ ] Implementar `stripe-live.ts` con SDK real
- [ ] Quitar `simulate-success` route
- [ ] Desplegar y verificar

---

## Versionado

| Versión | Contenido |
|---------|-----------|
| 0.4.0 | Modelo Subscription + API routes mock + factory toggle |
| 0.4.1 | Frontend: Upgrade flow + success/cancel pages |
| 0.4.2 | Frontend: Customer Portal mock + plan limits enforcement |
| 0.4.3 | QA + polish + documentación |
