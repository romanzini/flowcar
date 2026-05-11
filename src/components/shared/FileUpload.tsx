'use client'

import { useState, useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024

type FileCategory = 'FOTO_VEICULO' | 'FOTO_SERVICO' | 'LOGOTIPO'

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  category: FileCategory
  serviceOrderId?: string
  onSuccess?: () => void
}

export default function FileUpload({ authFetch, category, serviceOrderId, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setError(null)
    setSuccess(false)
    setFile(null)
    setPreview(null)

    if (!selected) return

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError('Tipo não permitido. Use JPG, PNG ou WEBP.')
      return
    }

    if (selected.size > MAX_SIZE) {
      setError('Arquivo excede 10 MB.')
      return
    }

    setFile(selected)
    const url = URL.createObjectURL(selected)
    setPreview(url)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setProgress(10)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)
      if (serviceOrderId) formData.append('serviceOrderId', serviceOrderId)

      setProgress(50)
      const res = await authFetch('/api/uploads', { method: 'POST', body: formData })
      setProgress(90)

      const json = await res.json()
      if (!json.success) {
        setError(json.error ?? 'Erro ao fazer upload')
        return
      }

      setProgress(100)
      setSuccess(true)
      setFile(null)
      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      onSuccess?.()
    } catch {
      setError('Erro de conexão')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
      />

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-600">Upload realizado com sucesso!</p>
      )}

      {preview && (
        <div className="space-y-2">
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-auto rounded-md border border-gray-200 object-cover"
          />
          {uploading && (
            <div className="h-1.5 w-full rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleUpload()}
            disabled={uploading}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Enviando…' : 'Enviar foto'}
          </button>
        </div>
      )}
    </div>
  )
}
