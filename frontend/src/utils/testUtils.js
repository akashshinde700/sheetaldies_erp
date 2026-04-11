/**
 * Testing Utilities for Frontend Components
 * Mock data, test helpers, API mocks for development/testing
 */

/**
 * Mock Data Generators
 */

export const mockJobcard = (overrides = {}) => ({
  id: 1,
  jobcardNo: 'JC-00001',
  partyName: 'Test Party',
  description: 'Test Job Card',
  status: 'pending',
  date: new Date().toISOString().split('T')[0],
  amount: 5000,
  ...overrides,
});

export const mockParty = (overrides = {}) => ({
  id: 1,
  name: 'Test Party',
  gstin: '36AABCT1205H1Z0',
  pan: 'AAACR5055K',
  contactPerson: 'John Doe',
  phone: '9876543210',
  email: 'john@example.com',
  address: '123 Main St',
  city: 'Delhi',
  state: 'DL',
  pincode: '110001',
  ...overrides,
});

export const mockInvoice = (overrides = {}) => ({
  id: 1,
  invoiceNo: 'INV-00001',
  partyName: 'Test Party',
  amount: 10000,
  status: 'draft',
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  items: [
    {
      id: 1,
      description: 'Service 1',
      quantity: 1,
      rate: 10000,
      amount: 10000,
    },
  ],
  ...overrides,
});

export const mockUser = (overrides = {}) => ({
  id: 1,
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  createdAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Mock Data Arrays
 */

export const mockJobcards = (count = 10) =>
  Array.from({ length: count }, (_, i) =>
    mockJobcard({
      id: i + 1,
      jobcardNo: `JC-${String(i + 1).padStart(5, '0')}`,
      partyName: `Party ${i + 1}`,
      status: ['pending', 'in-progress', 'completed'][i % 3],
    })
  );

export const mockParties = (count = 10) =>
  Array.from({ length: count }, (_, i) =>
    mockParty({
      id: i + 1,
      name: `Party ${i + 1}`,
      gstin: `36${String(i + 1).padStart(14, '0')}`,
      pan: `AAACR${String(i + 1).padStart(5, '0')}`,
    })
  );

export const mockInvoices = (count = 10) =>
  Array.from({ length: count }, (_, i) =>
    mockInvoice({
      id: i + 1,
      invoiceNo: `INV-${String(i + 1).padStart(5, '0')}`,
      amount: (i + 1) * 1000,
      status: ['draft', 'sent', 'paid'][i % 3],
    })
  );

/**
 * Test Helpers
 */

/**
 * Wait helper for async tests
 * @example
 * await waitFor(() => expect(element).toBeInTheDocument());
 */
export const waitFor = async (callback, options = {}) => {
  const { timeout = 3000, interval = 50 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      callback();
      return;
    } catch (err) {
      await new Promise((r) => setTimeout(r, interval));
    }
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
};

/**
 * Mock localStorage
 */
export const createMockLocalStorage = () => {
  const store = {};

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => {
        delete store[key];
      });
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] || null,
  };
};

/**
 * Mock API Client
 */
export const createMockApiClient = () => {
  return {
    get: jest.fn((url) => {
      const urlPath = url.split('?')[0];

      if (urlPath.includes('/jobcards')) {
        return Promise.resolve({ data: mockJobcards() });
      }
      if (urlPath.includes('/parties')) {
        return Promise.resolve({ data: mockParties() });
      }
      if (urlPath.includes('/invoices')) {
        return Promise.resolve({ data: mockInvoices() });
      }

      return Promise.resolve({ data: null });
    }),
    post: jest.fn(() => Promise.resolve({ data: { success: true } })),
    patch: jest.fn(() => Promise.resolve({ data: { success: true } })),
    delete: jest.fn(() => Promise.resolve({ data: { success: true } })),
    upload: jest.fn(() => Promise.resolve({ data: { success: true } })),
    download: jest.fn(() => Promise.resolve()),
  };
};

/**
 * Test utility to simulate user interaction
 */
export const simulateUserInteraction = async (callback, delay = 0) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  callback();
};

/**
 * Test utility to check if element is visible
 */
export const isElementVisible = (element) => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetHeight > 0 &&
    element.offsetWidth > 0
  );
};

/**
 * Test data validator
 * Checks if mock data matches expected shape
 */
export const validateMockData = (data, expectedFields) => {
  if (!data) return false;

  return expectedFields.every((field) => {
    if (field.type === 'array') {
      return Array.isArray(data[field.name]);
    }
    if (field.type === 'object') {
      return typeof data[field.name] === 'object';
    }
    return typeof data[field.name] === field.type;
  });
};

/**
 * API Response Mock Factory
 */
export const createMockResponse = (status = 200, data = {}, message = 'Success') => ({
  status,
  ok: status >= 200 && status < 300,
  data: {
    success: status < 400,
    message,
    data,
    code: status === 200 ? 'SUCCESS' : 'ERROR',
  },
});

/**
 * Snapshot test data generator
 */
export const createTestSnapshot = (component, props = {}) => {
  return {
    component,
    props,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Performance test helper
 */
export const measurePerformance = async (callback) => {
  const start = performance.now();
  const result = await callback();
  const end = performance.now();

  return {
    result,
    duration: end - start,
    metricsGood: end - start < 1000, // Good if under 1 second
  };
};

/**
 * Form validation test data
 */
export const formTestData = {
  validParty: {
    name: 'Valid Party',
    gstin: '36AABCT1205H1Z0',
    pan: 'AAACR5055K',
    email: 'party@example.com',
    phone: '9876543210',
  },
  invalidParty: {
    name: '',
    gstin: 'INVALID',
    pan: 'INVALID',
    email: 'not-an-email',
    phone: '123',
  },
  validInvoice: {
    invoiceNo: 'INV-001',
    partyId: 1,
    amount: 1000,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [
      {
        description: 'Item 1',
        quantity: 1,
        rate: 1000,
      },
    ],
  },
  invalidInvoice: {
    invoiceNo: '',
    partyId: null,
    amount: -100,
    items: [],
  },
};

/**
 * Test event generators
 */
export const createKeyboardEvent = (key, type = 'keydown') => {
  return new KeyboardEvent(type, {
    key,
    code: key.toUpperCase(),
    bubbles: true,
  });
};

export const createChangeEvent = (value) => {
  const event = new Event('change', { bubbles: true });
  Object.defineProperty(event, 'target', {
    value: { value },
    enumerable: true,
  });
  return event;
};

export const createSubmitEvent = () => {
  return new Event('submit', { bubbles: true, cancelable: true });
};

export default {
  // Mock data
  mockJobcard,
  mockParty,
  mockInvoice,
  mockUser,
  mockJobcards,
  mockParties,
  mockInvoices,

  // Test helpers
  waitFor,
  isElementVisible,
  validateMockData,
  measurePerformance,

  // Mocks
  createMockLocalStorage,
  createMockApiClient,
  createMockResponse,

  // Form data
  formTestData,

  // Event generators
  createKeyboardEvent,
  createChangeEvent,
  createSubmitEvent,
};
