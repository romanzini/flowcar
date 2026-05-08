'use client'

import { useEffect, useRef, useState } from 'react'

interface QueueRefreshTimerProps {
  onRefresh: () => void
  intervalSeconds?: number
}

export default function QueueRefreshTimer({
  onRefresh,
  intervalSeconds = 30,
}: QueueRefreshTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    setSecondsLeft(intervalSeconds)

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          onRefreshRef.current()
          setLastUpdated(new Date())
          return intervalSeconds
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdown)
  }, [intervalSeconds])

  const formatted = lastUpdated.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span>Atualizado às {formatted}</span>
      <span className="text-xs bg-muted px-2 py-1 rounded-full">
        Atualiza em {secondsLeft}s
      </span>
    </div>
  )
}
