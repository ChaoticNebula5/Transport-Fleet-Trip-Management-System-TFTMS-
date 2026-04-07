import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  visitedPages: string[]
  markVisited: (page: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      visitedPages: [],
      markVisited: (page) => {
        const visited = get().visitedPages
        if (!visited.includes(page)) {
          set({ visitedPages: [...visited, page] })
        }
      },
    }),
    { name: 'tftms-ui' }
  )
)
