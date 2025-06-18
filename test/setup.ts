import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import React from 'react'

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock window.ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods
  // log: vi.fn(),
  // debug: vi.fn(),
  // info: vi.fn(),
  // warn: vi.fn(),
  // error: vi.fn(),
}

// Setup test environment variables
process.env.NODE_ENV = 'test'
process.env.VITE_SUPABASE_URL = 'https://test.supabase.co'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => Promise.resolve({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn(() => Promise.resolve({
        getTextContent: vi.fn(() => Promise.resolve({ items: [] }))
      }))
    })
  })),
  GlobalWorkerOptions: {
    workerSrc: '/pdf.worker.js'
  },
  version: '3.0.0-mock'
}))

// Mock lucide-react with comprehensive icon set
vi.mock('lucide-react', () => {
  // Factory to create a simple div representing an icon
  const createMockIcon = (name: string) => (props: any) =>
    React.createElement('div', { 'data-testid': `${name.toLowerCase()}-icon`, ...props }, name)

  // Pre-define the icons we know are heavily used so tests can rely on stable testIds
  const presetIcons = {
    // Charts / reports
    Target: createMockIcon('Target'),
    Calendar: createMockIcon('Calendar'),
    TrendingUp: createMockIcon('TrendingUp'),
    TrendingDown: createMockIcon('TrendingDown'),
    BarChart3: createMockIcon('BarChart3'),
    LineChart: createMockIcon('LineChart'),
    PieChart: createMockIcon('PieChart'),

    // Dashboard & common UI
    LayoutDashboard: createMockIcon('LayoutDashboard'),
    CreditCard: createMockIcon('CreditCard'),
    Settings: createMockIcon('Settings'),
    LogOut: createMockIcon('LogOut'),
    BookOpenText: createMockIcon('BookOpenText'),
    ChevronDown: createMockIcon('ChevronDown'),
    ChevronUp: createMockIcon('ChevronUp'),
    ChevronsUpDown: createMockIcon('ChevronsUpDown'),
    Plus: createMockIcon('Plus'),
    Minus: createMockIcon('Minus'),
    Edit: createMockIcon('Edit'),
    Trash: createMockIcon('Trash'),
    Download: createMockIcon('Download'),
    Upload: createMockIcon('Upload'),

    // Alerts / info / loaders
    AlertCircle: createMockIcon('AlertCircle'),
    Info: createMockIcon('Info'),
    Clock: createMockIcon('Clock'),
    Loader2: createMockIcon('Loader2'),

    // Notifications / others
    Bell: createMockIcon('Bell'),
    BellIcon: createMockIcon('BellIcon'),
    XIcon: createMockIcon('XIcon'),
    ChevronDownIcon: createMockIcon('ChevronDownIcon'),
    ChevronUpIcon: createMockIcon('ChevronUpIcon'),
    Heart: createMockIcon('Heart'),
    X: createMockIcon('X'),
    Mic: createMockIcon('Mic'),
    FileUp: createMockIcon('FileUp'),
  }

  // Use a Proxy so any icon not explicitly listed still resolves to a mock component
  return new Proxy(presetIcons, {
    get(target, prop: string) {
      if (!(prop in target)) {
        // lazily create & cache unknown icons
        target[prop] = createMockIcon(prop)
      }
      // @ts-ignore – dynamic prop
      return target[prop]
    }
  })
})