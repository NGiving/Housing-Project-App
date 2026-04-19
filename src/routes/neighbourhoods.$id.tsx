import { createFileRoute } from '@tanstack/react-router'

const snapshots = import.meta.glob('../assets/snapshots/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const Route = createFileRoute('/neighbourhoods/$id')({
  component: Neighbourhoods_ID,
})

function Neighbourhoods_ID() {
  const { id } = Route.useParams()
  const snapshotSrc = snapshots[`../assets/snapshots/${id}.svg`]

  return !snapshotSrc ?
    <div className="container max-w-5xl mx-auto px-8 py-6">
      <h1 className="text-center">Neighbourhood not found</h1>
    </div>
    :
    <div className="max-w-5xl mx-auto px-8 py-6">
      <img src={snapshotSrc} alt={id} className="w-full h-auto" />
    </div>
}
