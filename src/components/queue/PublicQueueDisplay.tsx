import QueueCard from './QueueCard'

interface PublicQueueItem {
  orderNumber: string
  maskedPlate: string
  status: 'AGUARDANDO' | 'EM_ANDAMENTO'
  position: number | null
  estimatedMinutes: number | null
}

interface PublicQueueDisplayProps {
  inService: PublicQueueItem[]
  waiting: PublicQueueItem[]
}

export default function PublicQueueDisplay({ inService, waiting }: PublicQueueDisplayProps) {
  const isEmpty = inService.length === 0 && waiting.length === 0

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-muted-foreground">Nenhum veículo na fila no momento</p>
        <p className="text-sm text-muted-foreground mt-1">A fila está vazia.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {inService.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Em Atendimento</h2>
          <div className="space-y-3">
            {inService.map((item) => (
              <QueueCard
                key={item.orderNumber}
                orderNumber={item.orderNumber}
                maskedPlate={item.maskedPlate}
                status="EM_ANDAMENTO"
                position={item.position}
                estimatedMinutes={item.estimatedMinutes}
              />
            ))}
          </div>
        </section>
      )}

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">Aguardando na Fila</h2>
          <div className="space-y-3">
            {waiting.map((item) => (
              <QueueCard
                key={item.orderNumber}
                orderNumber={item.orderNumber}
                maskedPlate={item.maskedPlate}
                status="AGUARDANDO"
                position={item.position}
                estimatedMinutes={item.estimatedMinutes}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
