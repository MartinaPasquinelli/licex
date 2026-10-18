import '@testing-library/jest-dom'

// Node 22 introduced an experimental globalThis.localStorage that throws without --localstorage-file
// Provide a robust in-memory Storage implementation for test runner
const createStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    clear: () => {
      store = {}
    },
    getItem: (key: string) => store[key] ?? null,
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
  }
}

const mockStorage = createStorageMock()
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
})
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
    writable: true,
  })
}
