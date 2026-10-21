# Zustand ↔ TanStack Query interop demo

A small proof of concept showing how to keep a [Zustand](https://zustand.docs.pmnd.rs/) store and the [TanStack Query](https://tanstack.com/query) cache in sync, so you can migrate from one to the other **incrementally** instead of all at once.

## The problem

Lots of apps keep server data in a hand-rolled Zustand store. Moving that data to TanStack Query is usually the right call, but a big-bang rewrite is risky: every component that reads the store has to change at the same time.

## The idea

Make the two talk to each other so they always hold the same value:

- Zustand's `persist` middleware normally writes to `localStorage`. Here it's given a custom storage adapter that reads and writes the **Query cache** instead, using the store's `name` as the query key.
- A small listener subscribes to the Query cache. When the matching query changes for any reason (a refetch, `setQueryData`, etc.), it tells the Zustand store to rehydrate from it.

The result: old code can keep calling `useStore()`, new code can call `useQuery()` for the same data, and either side updating the value updates both. Once nothing reads from Zustand anymore, delete the store and the adapter.

## What the demo shows

Two counters render the same number. One reads from Zustand, the other from `useQuery`. Clicking "one up" on either counter increments both.

## How it works

Everything interesting lives in [`src/lib.ts`](src/lib.ts):

- `queryStorage` is the `persist` storage adapter. It unwraps `persist`'s `{ state, version }` envelope so the query cache holds plain data, and re-wraps it on read.
- `withQueryClientEvents(store)` subscribes to the `QueryCache` and calls `store.persist.rehydrate()` when the store's query gets new data.
- Writes coming from Zustand briefly tag the query's `meta` with `updatedBy: 'zustand'` so the listener can ignore them and avoid a feedback loop.

[`src/App.tsx`](src/App.tsx) wires it up:

```ts
const useStore = create<Store>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'store', storage: queryStorage },
  ),
)
withQueryClientEvents(useStore)
```

## Running it

```sh
pnpm install
pnpm dev
```

## Caveats

This is a POC, not a library. Things to be aware of before borrowing it:

- The store's `name` doubles as the query key (`'a.b'` becomes `['a', 'b']`).
- `persist`'s `version` is not stored in the query cache, so `migrate` won't run.
- Zustand's `partialize` applies as usual; anything not JSON-serializable is dropped.
- A refetch will overwrite whatever Zustand last wrote, so the query's `queryFn` needs to be the source of truth.
