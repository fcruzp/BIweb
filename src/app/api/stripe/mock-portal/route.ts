import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { PLANS } from '@/lib/plans'

/**
 * Derive the public origin URL from request headers.
 * Handles reverse proxies (Caddy, Nginx, Cloudflare) that set
 * X-Forwarded-Host / X-Forwarded-Proto headers.
 */
function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const host = request.headers.get('host')

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`
  }
  if (forwardedHost) {
    return `https://${forwardedHost}`
  }
  if (host) {
    const proto = host.startsWith('localhost') ? 'http' : 'https'
    return `${proto}://${host}`
  }
  return new URL(request.url).origin
}

/**
 * GET /api/stripe/mock-portal
 *
 * Mock Stripe Customer Portal page. In live mode, this is never called.
 * Simulates the Stripe Billing Portal experience with a simple HTML page.
 */
export async function GET(request: NextRequest) {
  // Verify the user is authenticated
  try {
    await requireAuth()
  } catch {
    const origin = getPublicOrigin(request)
    return NextResponse.redirect(new URL('/?auth=required', origin))
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id') ?? 'mock'

  // Get current subscription info
  let planId = 'free'
  let status = 'active'
  let cancelAtPeriodEnd = false
  let currentPeriodEnd = ''

  try {
    const user = await requireAuth()
    const subscription = await db.subscription.findUnique({ where: { userId: user.id } })
    if (subscription) {
      planId = subscription.plan
      status = subscription.status
      cancelAtPeriodEnd = subscription.cancelAtPeriodEnd
      currentPeriodEnd = subscription.currentPeriodEnd?.toLocaleDateString('es') ?? ''
    }
  } catch {
    // Use defaults
  }

  const plan = PLANS[planId as keyof typeof PLANS] ?? PLANS.free
  const planName = plan?.nameEs ?? planId

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataMind BI - Portal de Facturación</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      padding: 40px;
      max-width: 480px;
      width: 90%;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo h1 {
      font-size: 24px;
      font-weight: 700;
      color: #10b981;
    }
    .mock-badge {
      display: inline-block;
      background: #f59e0b;
      color: #000;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .section {
      margin-bottom: 24px;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid #2a2a2a;
      border-radius: 10px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .plan-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .plan-name {
      font-size: 20px;
      font-weight: 600;
      color: #10b981;
    }
    .plan-status {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
    }
    .status-active { background: rgba(16,185,129,0.15); color: #10b981; }
    .status-cancelled { background: rgba(239,68,68,0.15); color: #ef4444; }
    .status-cancelling { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      color: #aaa;
      border-bottom: 1px solid #1f1f1f;
    }
    .detail-row:last-child { border-bottom: none; }
    .detail-value { color: #fff; font-weight: 500; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
      transition: background 0.2s;
    }
    .btn-primary { background: #10b981; color: #fff; }
    .btn-primary:hover { background: #059669; }
    .btn-danger { background: transparent; border: 1px solid #ef4444; color: #ef4444; }
    .btn-danger:hover { background: rgba(239,68,68,0.1); }
    .btn-secondary { background: transparent; border: 1px solid #333; color: #888; }
    .btn-secondary:hover { border-color: #555; color: #aaa; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .test-info {
      margin-top: 20px;
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 8px;
      font-size: 12px;
      color: #f59e0b;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <h1>🧠 DataMind BI</h1>
    </div>
    <div style="text-align:center">
      <span class="mock-badge">MODO PRUEBA</span>
    </div>

    <div class="section">
      <div class="section-title">Plan Actual</div>
      <div class="plan-info">
        <span class="plan-name">${planName}</span>
        <span class="plan-status ${status === 'active' && !cancelAtPeriodEnd ? 'status-active' : cancelAtPeriodEnd ? 'status-cancelling' : 'status-cancelled'}">
          ${cancelAtPeriodEnd ? 'Cancelación programada' : status === 'active' ? 'Activo' : 'Cancelado'}
        </span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Detalles</div>
      <div class="detail-row">
        <span>Precio</span>
        <span class="detail-value">${plan?.priceDisplay ?? '$0'}/mes</span>
      </div>
      ${currentPeriodEnd ? `<div class="detail-row">
        <span>Próxima facturación</span>
        <span class="detail-value">${currentPeriodEnd}</span>
      </div>` : ''}
    </div>

    <div class="section">
      <div class="section-title">Acciones</div>
      ${planId !== 'free' && !cancelAtPeriodEnd ? `
        <button class="btn btn-danger" onclick="cancelSubscription()">Cancelar suscripción</button>
      ` : cancelAtPeriodEnd ? `
        <button class="btn btn-primary" onclick="reactivateSubscription()">Reactivar suscripción</button>
      ` : ''}
      <button class="btn btn-secondary" onclick="goBack()">Volver a la aplicación</button>
    </div>

    <div class="test-info">
      ⚠️ Esto es un portal de prueba. Los cambios se reflejarán en tu cuenta, pero no se realizarán cobros reales.
    </div>
  </div>

  <script>
    async function cancelSubscription() {
      try {
        const res = await fetch('/api/usage', { method: 'GET' });
        const data = await res.json();
        const userId = data?.plan?.id;

        await fetch('/api/stripe/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'customer.subscription.deleted',
          }),
        });

        window.location.href = '/?billing=cancelled';
      } catch (err) {
        alert('Error al cancelar. Intenta de nuevo.');
      }
    }

    async function reactivateSubscription() {
      try {
        await fetch('/api/stripe/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'customer.subscription.updated',
            reactivate: true,
          }),
        });

        window.location.href = '/?billing=reactivated';
      } catch (err) {
        alert('Error al reactivar. Intenta de nuevo.');
      }
    }

    function goBack() {
      window.location.href = '/';
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
