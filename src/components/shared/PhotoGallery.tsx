'use client'

import { useState } from 'react'

interface FileRecord {
  id: string
  category: string
  objectKey: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

interface Props {
  authFetch: (url: string, options?: RequestInit) => Promise<Response>
  files: FileRecord[]
}

export default function PhotoGallery({ authFetch, files }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [lightbox, setLightbox] = useState<string | null>(null)

  const fetchPresignedUrl = async (fileId: string) => {
    if (urls[fileId]) {
      setLightbox(urls[fileId])
      return
    }

    setLoading((prev) => ({ ...prev, [fileId]: true }))
    try {
      const res = await authFetch(`/api/uploads/${fileId}/url`)
      const json = await res.json()
      if (json.success) {
        const url: string = json.data.url
        setUrls((prev) => ({ ...prev, [fileId]: url }))
        setLightbox(url)
      }
    } catch { /* ignore */ }
    finally {
      setLoading((prev) => ({ ...prev, [fileId]: false }))
    }
  }

  if (files.length === 0) {
    return <p className="text-sm text-gray-500">Nenhuma foto adicionada</p>
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {files.map((file) => (
          <button
            key={file.id}
            type="button"
            onClick={() => void fetchPresignedUrl(file.id)}
            className="relative aspect-square rounded-md border border-gray-200 bg-gray-50 overflow-hidden hover:border-blue-400 transition-colors"
            title={new Date(file.createdAt).toLocaleString('pt-BR')}
          >
            {loading[file.id] ? (
              <div className="flex h-full items-center justify-center">
                <span className="text-xs text-gray-400">…</span>
              </div>
            ) : urls[file.id] ? (
              <img
                src={urls[file.id]}
                alt="Foto do serviço"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Foto ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 text-white/70 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
      )}
    </>
  )
}
