import { useEffect, useRef, useState } from 'react'

interface BokehEmbedProps {
  configUrl: string
  containerId: string
  className?: string
}

export function BokehEmbed({ configUrl, containerId, className }: BokehEmbedProps) {
  const loadedUrl = useRef<string | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (loadedUrl.current === configUrl) return
    loadedUrl.current = configUrl
    setHasError(false)

    const load = async () => {
      try {
        const res = await fetch(configUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const el = document.getElementById(containerId)
        if (el) el.innerHTML = ''
        await window.Bokeh.embed.embed_item(data, containerId)
      } catch {
        setHasError(true)
        loadedUrl.current = null
      }
    }
    load()
  }, [configUrl, containerId])

  if (hasError) {
    return (
      <div className={`flex items-center justify-center h-40 text-sm text-slate-400 ${className ?? ''}`}>
        No data available.
      </div>
    )
  }

  return <div id={containerId} className={className} />
}
