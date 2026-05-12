import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/stripe/mock-checkout
 *
 * Mock Stripe checkout page. In live mode, this is never called.
 * Simulates the Stripe Checkout experience with a simple HTML page.
 *
 * Flow: "Suscribirme" → calls /api/stripe/success (has auth cookies) →
 *        server processes checkout + redirects to /?billing=success
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const planId = searchParams.get('plan') ?? 'starter'
  const period = searchParams.get('period') ?? 'monthly'
  const price = searchParams.get('price') ?? '900'
  const sessionId = searchParams.get('session_id') ?? 'mock'

  const planNames: Record<string, string> = {
    free: 'Free',
    supporter: 'Supporter',
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
  }

  const planName = planNames[planId] ?? planId
  const priceFormatted = `$${(Number(price) / 100).toFixed(Number(price) % 100 === 0 ? 0 : 2)}/${period === 'yearly' ? 'año' : 'mes'}`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DataMind BI - Checkout</title>
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
      max-width: 420px;
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
    .plan {
      text-align: center;
      margin-bottom: 32px;
      padding: 20px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
    }
    .plan-name {
      font-size: 20px;
      font-weight: 600;
      color: #10b981;
      margin-bottom: 4px;
    }
    .plan-price {
      font-size: 28px;
      font-weight: 700;
    }
    .plan-period {
      font-size: 14px;
      color: #888;
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
    .btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 24px;
      transition: background 0.2s;
    }
    .btn:hover { background: #059669; }
    .btn-cancel {
      background: transparent;
      border: 1px solid #333;
      color: #888;
      margin-top: 12px;
    }
    .btn-cancel:hover { border-color: #555; color: #aaa; }
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
    .error-msg {
      margin-top: 12px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: #ef4444;
      display: none;
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
    <div class="plan">
      <div class="plan-name">${planName}</div>
      <div class="plan-price">${priceFormatted}</div>
    </div>
    <button class="btn" id="payBtn" onclick="completeCheckout()">
      Suscribirme
    </button>
    <button class="btn btn-cancel" onclick="cancelCheckout()">
      Cancelar
    </button>
    <div id="errorMsg" class="error-msg"></div>
    <div class="test-info">
      ⚠️ Esto es un checkout de prueba. No se realizará ningún cobro real.
      Al hacer clic en "Suscribirme", tu plan se actualizará inmediatamente.
    </div>
  </div>
  <script>
    async function completeCheckout() {
      const btn = document.getElementById('payBtn');
      const errEl = document.getElementById('errorMsg');
      btn.textContent = 'Procesando...';
      btn.disabled = true;
      errEl.style.display = 'none';

      try {
        // Call the success endpoint which has auth context (cookies)
        // It will process the checkout and redirect us
        const params = new URLSearchParams({
          session_id: '${sessionId}',
          plan: '${planId}',
          period: '${period}',
        });
        window.location.href = '/api/stripe/success?' + params.toString();
      } catch (err) {
        errEl.textContent = 'Error al procesar. Intenta de nuevo.';
        errEl.style.display = 'block';
        btn.textContent = 'Suscribirme';
        btn.disabled = false;
      }
    }

    function cancelCheckout() {
      window.location.href = '/?billing=cancelled';
    }
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
