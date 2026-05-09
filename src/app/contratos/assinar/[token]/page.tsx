import DOMPurify from 'isomorphic-dompurify'
import { getContractByToken } from '@/server/services/contract.service'
import PublicContractSigningClient from '@/components/contracts/PublicContractSigningClient'

interface PageProps {
  params: Promise<{ token: string }>
}

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'td', 'th']
const ALLOWED_ATTR = ['colspan', 'rowspan']

export default async function ContractSigningPage({ params }: PageProps) {
  const { token } = await params
  const contract = await getContractByToken(token)

  if (!contract) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-4 py-10">
        <div className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Link indisponível</h1>
          <p className="mt-3 text-sm text-gray-600">
            Este link é inválido, expirou ou já foi utilizado para assinar o contrato.
          </p>
        </div>
      </div>
    )
  }

  const sanitizedContent = DOMPurify.sanitize(contract.contentHtml, {
    ALLOWED_TAGS: [...ALLOWED_TAGS],
    ALLOWED_ATTR: [...ALLOWED_ATTR],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  })

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl bg-white p-8 shadow-sm">
          <p className="text-sm font-medium text-blue-600">Contrato {contract.number}</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">{contract.title}</h1>
          <p className="mt-3 text-sm text-gray-600">
            Cliente: <span className="font-medium text-gray-900">{contract.customer.name}</span>
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm">
          <div className="prose max-w-none prose-headings:text-gray-900 prose-p:text-gray-700">
            <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Assinatura digital</h2>
          <p className="mt-2 text-sm text-gray-600">
            Revise o conteúdo acima e assine no campo abaixo para concluir.
          </p>
          <div className="mt-6">
            <PublicContractSigningClient token={token} />
          </div>
        </div>
      </div>
    </div>
  )
}
