import {useEffect} from 'react'

type HistoryUpdate =
  | {type: 'push'; url: string}
  | {type: 'replace'; url: string}
  | {type: 'pop'}

type HistoryAdapter = {
  subscribe: (navigate: (update: HistoryUpdate) => void) => () => void
  update: (update: HistoryUpdate) => void
}

type DisableVisualEditing = () => void

type VisualEditingBridgeProps = {
  enabled: boolean
  projectId?: string
  dataset?: string
  studioUrl?: string
  enableLive?: boolean
  includeDrafts?: boolean
  autoRefresh?: boolean
  autoRefreshDelay?: number
  zIndex?: number
}

const DEFAULT_REFRESH_DELAY = 750

const createHistoryAdapter = (): HistoryAdapter => ({
  subscribe: (navigate) => {
    const handlePopState = () => {
      navigate({
        type: 'push',
        url: `${location.pathname}${location.search}${location.hash}`,
      })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  },
  update: (update) => {
    switch (update.type) {
      case 'push':
        window.history.pushState(null, '', update.url)
        break
      case 'replace':
        window.history.replaceState(null, '', update.url)
        break
      case 'pop':
        window.history.back()
        break
      default:
        break
    }
  },
})

type OverlaysModule = {
  enableVisualEditing: (options: {
    history: HistoryAdapter
    zIndex?: number
  }) => DisableVisualEditing
}

const loadOverlays = async (): Promise<OverlaysModule | null> => {
  try {
    // Keep the bare specifier literal so Vite rewrites it into a browser-resolvable chunk.
    const mod = (await import('@sanity/overlays')) as OverlaysModule
    return mod
  } catch (err) {
    console.warn('[sanity] Failed to load @sanity/overlays:', err)
    return null
  }
}

export default function VisualEditingBridge({
  enabled,
  projectId,
  dataset,
  studioUrl,
  enableLive = false,
  includeDrafts = false,
  autoRefresh = true,
  autoRefreshDelay = DEFAULT_REFRESH_DELAY,
  zIndex,
}: VisualEditingBridgeProps) {
  useEffect(() => {
    if (!enabled || !projectId || !dataset) {
      return
    }

    if (typeof window === 'undefined') {
      return
    }

    let disableOverlays: DisableVisualEditing | undefined
    let liveCleanup: (() => void) | undefined
    let disposed = false

    ;(async () => {
      const overlays = await loadOverlays()
      if (!overlays || disposed) {
        return
      }

      try {
        disableOverlays = overlays.enableVisualEditing({
          history: createHistoryAdapter(),
          zIndex,
        })
      } catch (err) {
        console.error('[sanity] Failed to enable visual editing overlays:', err)
      }
    })()

    if (enableLive) {
      ;(async () => {
        try {
          const {createClient} = await import('@sanity/client')
          if (disposed) return

          const client = createClient({
            projectId,
            dataset,
            apiVersion: '2023-01-01',
            useCdn: false,
            perspective: includeDrafts ? 'previewDrafts' : 'published',
          })

          const events = client.live.events({
            includeDrafts,
            tag: 'sanity-visual-editing',
          })

          let refreshTimer: ReturnType<typeof setTimeout> | undefined

          const subscription = events.subscribe((event) => {
            window.dispatchEvent(
              new CustomEvent('sanity:live-event', {
                detail: {event, projectId, dataset, studioUrl},
              }),
            )

            if (!autoRefresh || event.type !== 'message') {
              return
            }

            if (refreshTimer) {
              clearTimeout(refreshTimer)
            }

            refreshTimer = window.setTimeout(() => {
              if (document.visibilityState === 'visible') {
                window.location.reload()
              }
            }, autoRefreshDelay)
          })

          if (disposed) {
            subscription.unsubscribe()
            return
          }

          liveCleanup = () => {
            if (refreshTimer) {
              clearTimeout(refreshTimer)
            }
            subscription.unsubscribe()
          }
        } catch (err) {
          console.error('[sanity] Live content subscription failed:', err)
        }
      })()
    }

    return () => {
      disposed = true
      if (typeof disableOverlays === 'function') {
        disableOverlays()
      }
      liveCleanup?.()
    }
  }, [
    enabled,
    projectId,
    dataset,
    enableLive,
    includeDrafts,
    autoRefresh,
    autoRefreshDelay,
    zIndex,
    studioUrl,
  ])

  return null
}

