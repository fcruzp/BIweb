import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth-utils';
import { getPlan, USAGE_EVENT_TYPES, type PlanId } from '@/lib/plans';

// GET /api/usage/invoice?month=2025-06&format=pdf
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // Format: YYYY-MM
    const format = searchParams.get('format'); // 'pdf' or null

    // Determine the billing period
    let year: number;
    let month: number; // 0-indexed for JS Date

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split('-').map(Number);
      year = y;
      month = m - 1; // JS months are 0-indexed
    } else {
      // Default to current month
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    // Period start and end
    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 1);

    // Get user's subscription/plan
    const subscription = await db.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true, currentPeriodStart: true, currentPeriodEnd: true },
    });

    const planId = (subscription?.plan || 'free') as PlanId;
    const plan = getPlan(planId);

    // Get usage stats for the billing period
    const [
      queryCount,
      fileUploadCount,
      dashboardCreatedCount,
      exportCount,
      storageResult,
      dataSourceCount,
    ] = await Promise.all([
      db.usageEvent.count({
        where: {
          userId: user.id,
          eventType: USAGE_EVENT_TYPES.QUERY_EXECUTED,
          createdAt: { gte: periodStart, lt: periodEnd },
        },
      }),
      db.usageEvent.count({
        where: {
          userId: user.id,
          eventType: USAGE_EVENT_TYPES.FILE_UPLOADED,
          createdAt: { gte: periodStart, lt: periodEnd },
        },
      }),
      db.usageEvent.count({
        where: {
          userId: user.id,
          eventType: USAGE_EVENT_TYPES.DASHBOARD_CREATED,
          createdAt: { gte: periodStart, lt: periodEnd },
        },
      }),
      db.usageEvent.count({
        where: {
          userId: user.id,
          eventType: USAGE_EVENT_TYPES.EXPORT_DOWNLOADED,
          createdAt: { gte: periodStart, lt: periodEnd },
        },
      }),
      db.dataSource.aggregate({
        where: { userId: user.id },
        _sum: { fileSize: true },
      }),
      db.dataSource.count({
        where: { userId: user.id },
      }),
    ]);

    const storageUsedMB = (storageResult._sum.fileSize || 0) / (1024 * 1024);

    // Detect locale from Accept-Language header
    const acceptLang = request.headers.get('accept-language') || '';
    const locale = acceptLang.includes('es') ? 'es' : user.preferredLang || 'es';

    // Format helpers
    const monthNamesEs = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const monthNamesEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const monthNames = locale === 'es' ? monthNamesEs : monthNamesEn;

    const isEs = locale === 'es';

    // Invoice number: INV-YYYYMM
    const invoiceNumber = `INV-${year}${String(month + 1).padStart(2, '0')}`;

    // Period display
    const periodDisplay = isEs
      ? `${monthNames[month]} ${year}`
      : `${monthNames[month]} ${year}`;

    // Invoice date: 1st of the billing period
    const invoiceDate = isEs
      ? `1 de ${monthNames[month].toLowerCase()} de ${year}`
      : `${monthNames[month]} 1, ${year}`;

    // Plan name in user's locale
    const planName = isEs ? plan.nameEs : plan.name;

    // Format price
    const planPrice = plan.price;
    const planPriceDisplay = `$${planPrice.toFixed(2)}`;

    // Format storage
    const storageDisplay = storageUsedMB >= 1
      ? `${storageUsedMB.toFixed(1)} MB`
      : `${(storageUsedMB * 1024).toFixed(0)} KB`;

    // Table rows for the invoice
    const planLabel = isEs ? 'Plan' : 'Plan';
    const periodLabel = periodDisplay;
    const planRow = isEs
      ? `${planLabel} ${planName} - ${periodLabel}`
      : `${planLabel} ${planName} - ${periodLabel}`;

    const queriesLabel = isEs ? 'Consultas ejecutadas' : 'Queries executed';
    const storageLabel = isEs ? 'Almacenamiento utilizado' : 'Storage used';
    const uploadsLabel = isEs ? 'Archivos subidos' : 'Files uploaded';
    const dashboardsLabel = isEs ? 'Dashboards creados' : 'Dashboards created';
    const exportsLabel = isEs ? 'Exportaciones' : 'Exports';
    const totalLabel = isEs ? 'Total' : 'Total';
    const descriptionLabel = isEs ? 'Descripción' : 'Description';
    const quantityLabel = isEs ? 'Cantidad' : 'Quantity';
    const amountLabel = isEs ? 'Monto' : 'Amount';

    // Build table rows HTML
    const tableRows = `
      <tr>
        <td>${planRow}</td>
        <td>1</td>
        <td class="amount">${planPriceDisplay}</td>
      </tr>
      <tr>
        <td>${queriesLabel}</td>
        <td>${queryCount}</td>
        <td class="amount">-</td>
      </tr>
      <tr>
        <td>${storageLabel}</td>
        <td>${storageDisplay}</td>
        <td class="amount">-</td>
      </tr>
      ${fileUploadCount > 0 ? `
      <tr>
        <td>${uploadsLabel}</td>
        <td>${fileUploadCount}</td>
        <td class="amount">-</td>
      </tr>` : ''}
      ${dashboardCreatedCount > 0 ? `
      <tr>
        <td>${dashboardsLabel}</td>
        <td>${dashboardCreatedCount}</td>
        <td class="amount">-</td>
      </tr>` : ''}
      ${exportCount > 0 ? `
      <tr>
        <td>${exportsLabel}</td>
        <td>${exportCount}</td>
        <td class="amount">-</td>
      </tr>` : ''}
      <tr class="total-row">
        <td colspan="2"><strong>${totalLabel}</strong></td>
        <td class="amount"><strong>${planPriceDisplay}</strong></td>
      </tr>`;

    // Invoice labels
    const fromLabel = isEs ? 'De' : 'From';
    const toLabel = isEs ? 'Para' : 'To';
    const dateLabel = isEs ? 'Fecha' : 'Date';
    const periodHeaderLabel = isEs ? 'Período' : 'Period';

    const footerText = isEs
      ? 'DataMind BI — datamind.bi — Esta factura es generada automáticamente'
      : 'DataMind BI — datamind.bi — This invoice was generated automatically';

    const userDisplayName = user.name || user.email.split('@')[0];
    const planLabelShort = isEs ? 'Plan' : 'Plan';

    // Build HTML
    const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <title>DataMind BI - Factura ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 700; color: #059669; }
    .logo span { color: #1a1a1a; }
    .invoice-info { text-align: right; font-size: 13px; color: #666; }
    .invoice-number { font-size: 20px; font-weight: 600; margin-bottom: 4px; color: #1a1a1a; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .detail-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #059669; margin-bottom: 8px; }
    .detail-box p { margin: 2px 0; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead { background: #f8faf8; }
    th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
    .total-row { font-weight: 600; background: #f8faf8; }
    .total-row td { border-bottom: 2px solid #059669; }
    .amount { text-align: right; font-variant-numeric: tabular-nums; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 30px; }
    .summary-card { background: #f8faf8; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e5e7eb; }
    .summary-card .value { font-size: 24px; font-weight: 700; color: #059669; }
    .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Data<span>Mind</span> BI</div>
    <div class="invoice-info">
      <div class="invoice-number">${isEs ? 'Factura' : 'Invoice'} ${invoiceNumber}</div>
      <div>${dateLabel}: ${invoiceDate}</div>
      <div>${periodHeaderLabel}: ${periodDisplay}</div>
    </div>
  </div>

  <div class="details">
    <div class="detail-box">
      <h3>${fromLabel}</h3>
      <p><strong>DataMind BI</strong></p>
      <p>datamind.bi</p>
      <p>contacto@datamind.bi</p>
    </div>
    <div class="detail-box">
      <h3>${toLabel}</h3>
      <p><strong>${userDisplayName}</strong></p>
      <p>${user.email}</p>
      <p>${planLabelShort}: ${planName}</p>
    </div>
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${queryCount}</div>
      <div class="label">${queriesLabel}</div>
    </div>
    <div class="summary-card">
      <div class="value">${dataSourceCount}</div>
      <div class="label">${isEs ? 'Fuentes de datos' : 'Data sources'}</div>
    </div>
    <div class="summary-card">
      <div class="value">${storageDisplay}</div>
      <div class="label">${storageLabel}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${descriptionLabel}</th>
        <th>${quantityLabel}</th>
        <th class="amount">${amountLabel}</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div class="footer">
    ${footerText}
  </div>
  ${format === 'pdf' ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
