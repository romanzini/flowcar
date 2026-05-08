import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'

// ─── Base error class ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Recurso não encontrado') {
    super(message, 404)
    this.name = 'NotFoundError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Acesso não autorizado') {
    super(message, 403)
    this.name = 'ForbiddenError'
  }
}

export class UnprocessableError extends ApiError {
  constructor(message: string) {
    super(message, 422)
    this.name = 'UnprocessableError'
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Não autenticado') {
    super(message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(message = 'Muitas requisições. Tente novamente mais tarde.') {
    super(message, 429)
    this.name = 'TooManyRequestsError'
  }
}

// ─── Route Handler wrapper ────────────────────────────────────────────────────

type RouteHandler<T> = () => Promise<NextResponse<ApiResponse<T>>>

export function withErrorHandler<T>(handler: RouteHandler<T>) {
  return async (): Promise<NextResponse<ApiResponse<T> | ApiResponse<never>>> => {
    try {
      return await handler()
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.statusCode }
        ) as NextResponse<ApiResponse<never>>
      }

      console.error('[UnhandledError]', error)
      return NextResponse.json(
        { success: false, error: 'Erro interno do servidor' },
        { status: 500 }
      ) as NextResponse<ApiResponse<never>>
    }
  }
}
