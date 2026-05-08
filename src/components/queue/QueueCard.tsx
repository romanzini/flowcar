interface QueueCardProps {
  orderNumber: string
  maskedPlate: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO'
  position?: number | null
  estimatedMinutes?: number | null
}

export default function QueueCard({
  orderNumber,
  maskedPlate,
  status,
  position,
  estimatedMinutes,
}: QueueCardProps) {
  const isInService = status === 'EM_ANDAMENTO'

  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-4">
        {position != null && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {position}
          </span>
        )}
        <div>
          <p className="font-semibold text-card-foreground">{maskedPlate}</p>
          <p className="text-xs text-muted-foreground">{orderNumber}</p>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isInService
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
        >
          {isInService ? 'Em Atendimento' : 'Aguardando'}
        </span>
        {!isInService && estimatedMinutes != null && estimatedMinutes > 0 && (
          <span className="text-xs text-muted-foreground">~{estimatedMinutes} min</span>
        )}
      </div>
    </div>
  )
}
