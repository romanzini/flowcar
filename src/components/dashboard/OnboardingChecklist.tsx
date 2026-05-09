'use client'

import { useEffect, useState } from 'react'
import { useSession } from '@/components/shared/SessionProvider'

interface OnboardingState {
  slugConfigured: boolean
  hasServiceType: boolean
  hasEmployee: boolean
}

export default function OnboardingChecklist() {
  const { authFetch } = useSession()
  const [state, setState] = useState<OnboardingState | null>(null)

  useEffect(() => {
    void authFetch('/api/onboarding/state')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setState(json.data as OnboardingState)
        }
      })
      .catch(() => null)
  }, [authFetch])

  if (!state) return null

  const allDone = state.slugConfigured && state.hasServiceType && state.hasEmployee
  if (allDone) return null

  const items = [
    { done: state.slugConfigured, label: 'Configurar slug do lava-jato', href: '/configuracoes' },
    { done: state.hasServiceType, label: 'Adicionar pelo menos um tipo de serviço', href: '/configuracoes' },
    { done: state.hasEmployee, label: 'Cadastrar pelo menos um funcionário', href: '/funcionarios' },
  ]

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
      <h3 className="text-base font-semibold text-blue-900">
        Primeiros passos — configure seu lava-jato
      </h3>
      <p className="mt-1 text-sm text-blue-700">
        Complete estas etapas para começar a usar o FlowCar.
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-3">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs font-bold ${
                item.done
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-400'
              }`}
            >
              {item.done ? '✓' : ''}
            </span>
            {item.done ? (
              <span className="text-sm text-gray-500 line-through">{item.label}</span>
            ) : (
              <a href={item.href} className="text-sm text-blue-700 hover:underline">
                {item.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
