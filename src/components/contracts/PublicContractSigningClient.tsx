'use client'

import { useEffect, useState } from 'react'
import SignaturePad from '@/components/shared/SignaturePad'

interface Props {
  token: string
}

export default function PublicContractSigningClient({ token }: Props) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const loadCsrf = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/contratos/publico/${token}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        })
        const json = await res.json()
        if (res.ok && json.success) {
          setCsrfToken(json.data.csrfToken)
        } else {
          setError(json.error ?? 'Não foi possível preparar a assinatura')
        }
      } catch {
        setError('Erro ao preparar a assinatura')
      } finally {
        setLoading(false)
      }
    }

    void loadCsrf()
  }, [token])

  const handleSubmit = async (signatureDataUrl: string) => {
    if (!csrfToken) {
      setError('Token CSRF indisponível')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/contratos/publico/${token}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ signatureDataUrl }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setSuccess(true)
      } else {
        setError(json.error ?? 'Não foi possível concluir a assinatura')
      }
    } catch {
      setError('Erro ao enviar assinatura')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Preparando assinatura...</p>
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
        Contrato assinado com sucesso.
      </div>
    )
  }

  return <SignaturePad onSubmit={handleSubmit} isLoading={submitting} error={error} />
}
