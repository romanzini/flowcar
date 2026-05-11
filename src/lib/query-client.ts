import { QueryClient } from '@tanstack/react-query'

const FIVE_MINUTES = 5 * 60 * 1000

let queryClient: QueryClient | undefined

export function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: FIVE_MINUTES,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    })
  }
  return queryClient
}
