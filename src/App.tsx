import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { queryStorage, withQueryClientEvents } from './lib'
import { useQuery, useQueryClient } from '@tanstack/react-query'

type Store = {
  count: number
  inc: () => void
}

declare global {
  var count: number
}

// Pretend this is the initial count coming from some external source
window.count = 1;

const useStore = create<Store>()(
  persist(
    (set) => ({
      count: window.count,
      inc: () => set(() => ({ count: ++window.count })),
    }),
    {
      name: 'store',
      storage: queryStorage,
    }
  )
)
withQueryClientEvents(useStore);

function ZustandCounter() {
  const { count, inc } = useStore()
  return (
    <div>
      <h2>Zustand Counter</h2>
      <p>{count}</p>
      <button onClick={inc}>one up</button>
    </div>
  )
}

function QueryCounter() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['store'], queryFn: () => {
      return { count: window.count };
    }
  })

  return (
    <div>
      <h2>Query Counter</h2>
      <p>{data?.count}</p>
      <button onClick={() => { window.count += 1; queryClient.invalidateQueries({ queryKey: ['store'] }); }}>one up</button>
    </div>
  )
}

export default function App() {
  return (
    <div>
      <h1>Zustand ↔ TanStack Query sync</h1>
      <p>
        This demo shows how to keep a Zustand store and the TanStack Query cache in sync so you can
        migrate between the two incrementally, one slice of state at a time, without a big-bang rewrite.
      </p>
      <p>
        The Zustand store uses the <code>persist</code> middleware with a custom storage adapter that
        reads and writes the Query cache instead of <code>localStorage</code>. Updates made through
        Zustand are written to the query under the same key, and updates coming from Query (a refetch,
        <code>setQueryData</code>, etc.) rehydrate the Zustand store. Both counters below read the same
        underlying value, so incrementing either one updates both.
      </p>
      <p>
        In practice this lets old code keep calling the Zustand store while new code adopts
        <code>useQuery</code> for the same data. Once nothing reads from Zustand anymore, you can delete
        the store and the adapter.
      </p>
      <p>Initial count: {window.count}</p>
      <ZustandCounter />
      <QueryCounter />
    </div>
  )
}