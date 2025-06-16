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
  // Create a mock component factory
  const createMockIcon = (name: string) => (props: any) => 
    React.createElement('div', { 'data-testid': `icon-${name.toLowerCase()}`, ...props }, name)

  return {
    // Charts and Reports icons
    Target: createMockIcon('Target'),
    Calendar: createMockIcon('Calendar'),
    TrendingUp: createMockIcon('TrendingUp'),
    TrendingDown: createMockIcon('TrendingDown'),
    BarChart3: createMockIcon('BarChart3'),
    LineChart: createMockIcon('LineChart'),
    PieChart: createMockIcon('PieChart'),
    
    // Dashboard sidebar icons
    LayoutDashboard: createMockIcon('LayoutDashboard'),
    CreditCard: createMockIcon('CreditCard'),
    Settings: createMockIcon('Settings'),
    LogOut: createMockIcon('LogOut'),
    BookOpenText: createMockIcon('BookOpenText'),
    
    // Common UI icons
    ChevronDown: createMockIcon('ChevronDown'),
    ChevronUp: createMockIcon('ChevronUp'),
    Plus: createMockIcon('Plus'),
    Minus: createMockIcon('Minus'),
    Edit: createMockIcon('Edit'),
    Trash: createMockIcon('Trash'),
    Download: createMockIcon('Download'),
    Upload: createMockIcon('Upload'),
    
    // Notification icons
    Bell: createMockIcon('Bell'),
    BellIcon: createMockIcon('BellIcon'),
    XIcon: createMockIcon('XIcon'),
    ChevronDownIcon: createMockIcon('ChevronDownIcon'),
    ChevronUpIcon: createMockIcon('ChevronUpIcon'),
    
    // Support banner icons  
    Heart: createMockIcon('Heart'),
    X: createMockIcon('X'),
    
    // Transaction modal icons
    Mic: createMockIcon('Mic'),
    FileUp: createMockIcon('FileUp'),

    // Install prompt icons are already covered above (Download, X)
  }
})