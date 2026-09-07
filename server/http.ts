export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error inesperado.'
}
