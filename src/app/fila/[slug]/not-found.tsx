export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-4xl font-bold">404</h1>
      <h2 className="text-xl font-semibold text-muted-foreground">Lava-jato não encontrado</h2>
      <p className="text-muted-foreground max-w-sm">
        O endereço informado não corresponde a nenhum lava-jato cadastrado na plataforma.
      </p>
    </div>
  )
}
