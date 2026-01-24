/**
 * Unit tests for TransactionsAPI client-side filtering and transformation logic
 */

import { TransactionsAPIImpl } from './TransactionsAPI'

// Mock GraphQL client
const createMockGraphqlClient = (mockResponse: any) => ({
  query: jest.fn().mockResolvedValue(mockResponse),
  mutation: jest.fn().mockResolvedValue(mockResponse)
})

describe('TransactionsAPI', () => {
  describe('getMerchants', () => {
    const mockMerchantsResponse = {
      merchants: [
        { id: '1', name: 'Amazon', transactionCount: 50, logoUrl: 'https://logo.com/amazon.png' },
        { id: '2', name: 'Walmart', transactionCount: 30, logoUrl: 'https://logo.com/walmart.png' },
        { id: '3', name: 'Target', transactionCount: 20, logoUrl: null },
        { id: '4', name: 'Amazon Fresh', transactionCount: 10, logoUrl: 'https://logo.com/amazonfresh.png' },
        { id: '5', name: 'Costco', transactionCount: 15, logoUrl: null },
      ]
    }

    it('should return all merchants when no options provided', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants()

      expect(result).toHaveLength(5)
      expect(result[0]).toEqual({
        id: '1',
        name: 'Amazon',
        transactionCount: 50,
        totalAmount: 0,
        logoUrl: 'https://logo.com/amazon.png'
      })
    })

    it('should filter merchants by search term (case-insensitive)', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ search: 'amazon' })

      expect(result).toHaveLength(2)
      expect(result.map(m => m.name)).toEqual(['Amazon', 'Amazon Fresh'])
    })

    it('should filter merchants by search term with mixed case', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ search: 'WALMART' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Walmart')
    })

    it('should apply limit to results', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ limit: 3 })

      expect(result).toHaveLength(3)
      expect(result.map(m => m.name)).toEqual(['Amazon', 'Walmart', 'Target'])
    })

    it('should handle limit=0 correctly (return empty array)', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ limit: 0 })

      expect(result).toHaveLength(0)
    })

    it('should apply both search and limit together', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ search: 'amazon', limit: 1 })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Amazon')
    })

    it('should return empty array when search matches nothing', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ search: 'nonexistent' })

      expect(result).toHaveLength(0)
    })

    it('should handle empty merchant list from API', async () => {
      const mockClient = createMockGraphqlClient({ merchants: [] })
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants()

      expect(result).toHaveLength(0)
    })

    it('should not apply limit when limit is greater than result count', async () => {
      const mockClient = createMockGraphqlClient(mockMerchantsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getMerchants({ limit: 100 })

      expect(result).toHaveLength(5)
    })
  })

  describe('getRecurringStreams', () => {
    const mockStreamsResponse = {
      recurringTransactionStreams: [
        {
          stream: {
            id: 'stream-1',
            reviewStatus: 'approved',
            frequency: 'monthly',
            amount: -50.00,
            baseDate: '2026-01-15',
            dayOfTheMonth: 15,
            isApproximate: false,
            name: 'Netflix',
            logoUrl: 'https://logo.com/netflix.png',
            recurringType: 'subscription',
            merchant: { id: 'merchant-1', name: 'Netflix' }
          }
        },
        {
          stream: {
            id: 'stream-2',
            reviewStatus: 'pending',
            frequency: 'weekly',
            amount: -25.00,
            baseDate: '2026-01-20',
            dayOfTheMonth: null,
            isApproximate: true,
            name: 'Grocery Store',
            logoUrl: null,
            recurringType: 'expense',
            merchant: { id: 'merchant-2', name: 'Safeway' }
          }
        }
      ]
    }

    it('should return flat array of streams (unwrapped)', async () => {
      const mockClient = createMockGraphqlClient(mockStreamsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getRecurringStreams()

      expect(result).toHaveLength(2)
      // Verify it's unwrapped (stream object directly, not { stream: ... })
      expect(result[0].id).toBe('stream-1')
      expect(result[0].name).toBe('Netflix')
      expect(result[1].id).toBe('stream-2')
      expect(result[1].frequency).toBe('weekly')
    })

    it('should pass includeLiabilities option to query', async () => {
      const mockClient = createMockGraphqlClient(mockStreamsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      await api.getRecurringStreams({ includeLiabilities: false })

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        { includeLiabilities: false }
      )
    })

    it('should default includeLiabilities to true', async () => {
      const mockClient = createMockGraphqlClient(mockStreamsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      await api.getRecurringStreams()

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.any(String),
        { includeLiabilities: true }
      )
    })

    it('should handle empty streams response', async () => {
      const mockClient = createMockGraphqlClient({ recurringTransactionStreams: [] })
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getRecurringStreams()

      expect(result).toHaveLength(0)
    })

    it('should handle null/undefined streams response', async () => {
      const mockClient = createMockGraphqlClient({ recurringTransactionStreams: null })
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getRecurringStreams()

      expect(result).toHaveLength(0)
    })

    it('should preserve all stream fields in transformation', async () => {
      const mockClient = createMockGraphqlClient(mockStreamsResponse)
      const api = new TransactionsAPIImpl(mockClient as any)

      const result = await api.getRecurringStreams()

      const stream = result[0]
      expect(stream).toEqual({
        id: 'stream-1',
        reviewStatus: 'approved',
        frequency: 'monthly',
        amount: -50.00,
        baseDate: '2026-01-15',
        dayOfTheMonth: 15,
        isApproximate: false,
        name: 'Netflix',
        logoUrl: 'https://logo.com/netflix.png',
        recurringType: 'subscription',
        merchant: { id: 'merchant-1', name: 'Netflix' }
      })
    })
  })
})
