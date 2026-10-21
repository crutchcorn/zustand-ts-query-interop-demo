import { createJSONStorage, type StorageValue } from 'zustand/middleware'
import { hashKey, type QueryCacheNotifyEvent } from '@tanstack/react-query'
import {client} from './client'
import type { Mutate, StoreApi } from 'zustand'

export const convertToQueryKey = (key: string) => key.split('.').filter(Boolean)

const UPDATED_BY_ZUSTAND = 'zustand'

export const queryStorage = createJSONStorage(() => ({
    getItem: (key) => {
      const data = client.getQueryData(convertToQueryKey(key))
      // Query cache holds bare state; persist expects a `{ state, version }` envelope
      return data === undefined ? null : JSON.stringify({ state: data })
    },
    setItem: (key, value) => {
      const queryKey = convertToQueryKey(key)
      const { state } = JSON.parse(value) as StorageValue<unknown>
      const query = client.getQueryCache().build(client, { queryKey })
      const previousMeta = query.meta
      // Cache events fire synchronously, so the tag is only visible during this write
      query.setOptions({ ...query.options, meta: { ...previousMeta, updatedBy: UPDATED_BY_ZUSTAND } })
      client.setQueryData(queryKey, state)
      query.setOptions({ ...query.options, meta: previousMeta })
    },
    removeItem: (key) => {
      client.removeQueries({ queryKey: convertToQueryKey(key) })
    }
}))

type StoreWithPersist = Mutate<StoreApi<any>, [["zustand/persist", unknown]]>

export const withQueryClientEvents = (store: StoreWithPersist) => {
  const storageEventCallback = (event: QueryCacheNotifyEvent) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    if (event.query.meta?.updatedBy === UPDATED_BY_ZUSTAND) return
    const name = store.persist.getOptions().name
    if (!name) return
    const matches = event.query.queryHash === hashKey(convertToQueryKey(name))
    if (matches && event.query.state.data != null) {
      store.persist.rehydrate()
    }
  }

  return client.getQueryCache().subscribe(storageEventCallback)
}
