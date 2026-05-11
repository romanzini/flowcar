'use client'

import { useEffect, useRef, useState } from 'react'

interface Point {
  x: number
  y: number
}

interface SignaturePadProps {
  onSubmit(dataUrl: string): void
  isLoading?: boolean
  error?: string | null
}

export default function SignaturePad({ onSubmit, isLoading = false, error = null }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const [hasSignature, setHasSignature] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const parentWidth = canvas.parentElement?.clientWidth ?? 600
    const ratio = window.devicePixelRatio || 1
    canvas.width = parentWidth * ratio
    canvas.height = 220 * ratio
    canvas.style.width = `${parentWidth}px`
    canvas.style.height = '220px'

    context.scale(ratio, ratio)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.lineWidth = 2.5
    context.strokeStyle = '#111827'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, parentWidth, 220)
  }, [])

  const getPoint = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()

    if ('touches' in event) {
      const touch = event.touches[0] ?? event.changedTouches[0]
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
    }

    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true
    const point = getPoint(event)
    lastPointRef.current = point
  }

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return

    if ('touches' in event) {
      event.preventDefault()
    }

    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const previousPoint = lastPointRef.current
    if (!canvas || !context || !previousPoint) return

    const currentPoint = getPoint(event)
    context.beginPath()
    context.moveTo(previousPoint.x, previousPoint.y)
    context.lineTo(currentPoint.x, currentPoint.y)
    context.stroke()

    lastPointRef.current = currentPoint
    setHasSignature(true)
  }

  const stopDrawing = () => {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const submitSignature = () => {
    if (!canvasRef.current || !hasSignature) return
    onSubmit(canvasRef.current.toDataURL('image/png'))
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={clearSignature}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Limpar
        </button>
        <button
          type="button"
          disabled={!hasSignature || isLoading}
          onClick={submitSignature}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Enviando...' : 'Assinar contrato'}
        </button>
      </div>
    </div>
  )
}
