import DOMPurify from 'isomorphic-dompurify'

interface ContractData {
  number: string
  title: string
  contentHtml: string
}

interface CustomerData {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

interface SignatureData {
  signedAt: string | Date
  signedIp: string
  signatureDataUrl: string
}

const CONTRACT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
] as const

const CONTRACT_ALLOWED_ATTR = ['colspan', 'rowspan'] as const

function esc(value: string | null | undefined): string {
  if (!value) return ''
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

export function sanitizeContractHtml(contentHtml: string): string {
  return DOMPurify.sanitize(contentHtml, {
    ALLOWED_TAGS: [...CONTRACT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...CONTRACT_ALLOWED_ATTR],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  })
}

export function maskSignedIp(ip: string): string {
  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.xxx.xxx.${parts[3]}`
  }
  return ip
}

export function renderContractHTML(
  contract: ContractData,
  customer: CustomerData,
  signature: SignatureData
): string {
  const sanitizedContentHtml = sanitizeContractHtml(contract.contentHtml)
  const signedAtLabel = new Date(signature.signedAt).toLocaleString('pt-BR')
  const maskedIp = maskSignedIp(signature.signedIp)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrato ${esc(contract.number)}</title>
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
    .info-label { font-weight: bold; color: #6b7280; min-width: 110px; }
    .content { line-height: 1.6; color: #374151; }
    .content h1, .content h2, .content h3, .content h4 { margin: 14px 0 8px; color: #111827; }
    .content p, .content ul, .content ol, .content table { margin: 10px 0; }
    .content ul, .content ol { padding-left: 20px; }
    .content table { width: 100%; border-collapse: collapse; }
    .content th, .content td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    .content th { background: #f3f4f6; }
    .signature-block { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: center; }
    .signature-image { border: 1px solid #d1d5db; border-radius: 4px; padding: 8px; min-height: 120px; display: flex; align-items: center; justify-content: center; background: #fff; }
    .signature-image img { max-width: 100%; max-height: 100px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Contrato ${esc(contract.number)}</h1>
    <div class="subtitle">${esc(contract.title)}</div>
  </div>

  <div class="section">
    <h2>Dados do Contrato</h2>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Número:</span> <span>${esc(contract.number)}</span></div>
      <div class="info-row"><span class="info-label">Título:</span> <span>${esc(contract.title)}</span></div>
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

  <div class="section">
    <h2>Conteúdo</h2>
    <div class="content">${sanitizedContentHtml}</div>
  </div>

  <div class="section">
    <h2>Assinatura Digital</h2>
    <div class="signature-block">
      <div class="signature-image">
        <img src="${signature.signatureDataUrl}" alt="Assinatura digital do cliente" />
      </div>
      <div>
        <div class="info-row"><span class="info-label">Assinado em:</span> <span>${esc(signedAtLabel)}</span></div>
        <div class="info-row"><span class="info-label">IP:</span> <span>${esc(maskedIp)}</span></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Contrato assinado em ${esc(signedAtLabel)} • FlowCar</p>
  </div>
</body>
</html>`
}
