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
      inc: () => set((state) => ({ count: state.count + 1 })),
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
      <span>{count}</span>
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
      <span>{data?.count}</span>
      <button onClick={() => { window.count += 1; queryClient.invalidateQueries({ queryKey: ['store'] }); }}>one up</button>
    </div>
  )
}

export default function App() {
  return (
    <div>
      <ZustandCounter />
      <QueryCounter />
    </div>
  )
}