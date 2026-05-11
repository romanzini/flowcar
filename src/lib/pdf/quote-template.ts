import DOMPurify from 'isomorphic-dompurify'

interface QuoteItemData {
  description: string
  quantity: string | number
  unitPrice: string | number
  discountAmount: string | number
  subtotal: string | number
  serviceType?: { name: string } | null
}

interface CustomerData {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

interface VehicleData {
  plate: string
  brand?: string | null
  model?: string | null
  year?: number | null
}

interface QuoteData {
  number: string
  validUntil: string | Date
  totalAmount: string | number
  status: string
}

/**
 * SEC-002: All user-supplied fields are escaped via isomorphic-dompurify before
 * interpolation to prevent HTML injection in the rendered PDF.
 */
function esc(value: string | null | undefined): string {
  if (!value) return ''
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

function fmt(value: string | number, decimals = 2): string {
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function renderQuoteHTML(
  quote: QuoteData,
  items: QuoteItemData[],
  customer: CustomerData,
  vehicle?: VehicleData | null
): string {
  const validUntilStr = new Date(quote.validUntil).toLocaleDateString('pt-BR')

  const itemRows = items
    .map((item, i) => {
      const discount = Number(item.discountAmount)
      return `
      <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
        <td>${esc(item.description)}</td>
        <td class="center">${fmt(item.quantity, 3)}</td>
        <td class="right">R$ ${fmt(item.unitPrice)}</td>
        <td class="right">${discount > 0 ? `R$ ${fmt(discount)}` : '-'}</td>
        <td class="right">R$ ${fmt(item.subtotal)}</td>
      </tr>`
    })
    .join('\n')

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unitPrice), 0)
  const totalDiscount = items.reduce((s, i) => s + Number(i.discountAmount), 0)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orçamento ${esc(quote.number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; }
    .header { background: #1e40af; color: white; padding: 20px; margin-bottom: 20px; }
    .header h1 { font-size: 22px; }
    .header .subtitle { font-size: 14px; opacity: 0.9; margin-top: 4px; }
    .section { margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 4px; }
    .section h2 { font-size: 13px; font-weight: bold; color: #374151; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .info-row { display: flex; gap: 8px; }
    .info-label { font-weight: bold; color: #6b7280; min-width: 80px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f3f4f6; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #6b7280; }
    td { padding: 8px; border-bottom: 1px solid #f3f4f6; }
    tr.odd td { background: #fafafa; }
    .center { text-align: center; }
    .right { text-align: right; }
    .totals { margin-top: 12px; text-align: right; }
    .totals table { width: auto; margin-left: auto; }
    .totals td { padding: 4px 8px; border: none; }
    .totals .total-row { font-weight: bold; font-size: 14px; color: #1e40af; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Orçamento ${esc(quote.number)}</h1>
    <div class="subtitle">FlowCar — Sistema de Gestão de Lava-Jato</div>
  </div>

  <div class="section">
    <h2>Dados do Orçamento</h2>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Número:</span> <span>${esc(quote.number)}</span></div>
      <div class="info-row"><span class="info-label">Válido até:</span> <span>${validUntilStr}</span></div>
      <div class="info-row"><span class="info-label">Status:</span> <span>${esc(quote.status)}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>Cliente</h2>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Nome:</span> <span>${esc(customer.name)}</span></div>
      <div class="info-row"><span class="info-label">Telefone:</span> <span>${esc(customer.phone)}</span></div>
      ${customer.email ? `<div class="info-row"><span class="info-label">E-mail:</span> <span>${esc(customer.email)}</span></div>` : ''}
      ${customer.address ? `<div class="info-row"><span class="info-label">Endereço:</span> <span>${esc(customer.address)}</span></div>` : ''}
    </div>
  </div>

  ${vehicle ? `
  <div class="section">
    <h2>Veículo</h2>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Placa:</span> <span>${esc(vehicle.plate)}</span></div>
      <div class="info-row"><span class="info-label">Veículo:</span> <span>${esc(vehicle.brand)} ${esc(vehicle.model)}${vehicle.year ? ` (${vehicle.year})` : ''}</span></div>
    </div>
  </div>` : ''}

  <div class="section">
    <h2>Itens do Orçamento</h2>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th class="center">Qtd</th>
          <th class="right">Preço Unit.</th>
          <th class="right">Desconto</th>
          <th class="right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr><td>Subtotal:</td><td class="right">R$ ${fmt(subtotal)}</td></tr>
        ${totalDiscount > 0 ? `<tr><td>Descontos:</td><td class="right">- R$ ${fmt(totalDiscount)}</td></tr>` : ''}
        <tr class="total-row"><td><strong>Total:</strong></td><td class="right"><strong>R$ ${fmt(quote.totalAmount)}</strong></td></tr>
      </table>
    </div>
  </div>

  <div class="footer">
    <p>Orçamento gerado em ${new Date().toLocaleString('pt-BR')} • FlowCar</p>
  </div>
</body>
</html>`
}
