import { useState, useEffect } from 'react'

export interface ModelOption {
  id: string
  name: string
}

let cachedModels: ModelOption[] | null = null
let lastFetchTime = 0
const MODEL_CACHE_TTL = 10 * 60 * 1000

export function useOpenRouterModels(): ModelOption[] {
  const [models, setModels] = useState<ModelOption[]>(cachedModels || [])

  useEffect(() => {
    const now = Date.now()
    if (cachedModels && now - lastFetchTime < MODEL_CACHE_TTL) {
      setModels(cachedModels)
      return
    }
    window.api.chatFetchModels().then((fetched) => {
      if (fetched.length > 0) {
        cachedModels = fetched
        lastFetchTime = Date.now()
        setModels(fetched)
      }
    })
  }, [])

  return models
}
