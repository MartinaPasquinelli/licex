import { describe, expect, it } from 'vitest'

import {
  addWishlistGroup,
  addWishlistItem,
  licexSlice,
  removeWishlistItem,
} from './licex.slice'

function addRequest(id: string) {
  return addWishlistItem({
    budget: null,
    budgetFiat: null,
    category: 'CAD / 3D',
    consentToAggregation: true,
    description: `CAD request ${id}`,
    id,
    platforms: ['Windows'],
    requirements: [`DWG support ${id}`],
    title: `CAD request ${id}`,
    useCase: 'CAD conversion',
  })
}

describe('wishlist demand groups', () => {
  it('merges matching requests into groups and removes deleted members', () => {
    let state = licexSlice.reducer(undefined, { type: 'init' })
    state = licexSlice.reducer(state, addRequest('group-test-one'))
    state = licexSlice.reducer(state, addRequest('group-test-two'))
    state = licexSlice.reducer(
      state,
      addWishlistGroup({
        id: 'group-one',
        matches: [
          {
            reason: 'Shared CAD requirements.',
            relation: 'similar',
            requestId: 'group-test-one',
          },
        ],
        requestId: 'group-test-two',
        source: 'local-model',
        summary: 'CAD opportunity',
      })
    )
    state = licexSlice.reducer(state, addRequest('group-test-three'))
    state = licexSlice.reducer(
      state,
      addWishlistGroup({
        id: 'group-two',
        matches: [
          {
            reason: 'Adds a compatible export workflow.',
            relation: 'complementary',
            requestId: 'group-test-two',
          },
        ],
        requestId: 'group-test-three',
        source: 'local-model',
        summary: 'Expanded CAD opportunity',
      })
    )

    expect(state.wishlistGroups).toHaveLength(1)
    expect(state.wishlistGroups[0].requestIds).toEqual(
      expect.arrayContaining([
        'group-test-one',
        'group-test-two',
        'group-test-three',
      ])
    )
    expect(state.wishlistGroups[0].summary).toBe('Expanded CAD opportunity')
    expect(state.wishlistGroups[0].combinedRequirements).toEqual(
      expect.arrayContaining([
        'DWG support group-test-one',
        'DWG support group-test-two',
        'DWG support group-test-three',
      ])
    )
    expect(state.wishlistGroups[0].platforms).toEqual(['Windows'])

    state = licexSlice.reducer(state, removeWishlistItem('group-test-three'))
    expect(state.wishlistGroups).toHaveLength(1)
    expect(state.wishlistGroups[0].requestIds).not.toContain('group-test-three')
    expect(state.wishlistGroups[0].combinedRequirements).not.toContain(
      'DWG support group-test-three'
    )

    state = licexSlice.reducer(state, removeWishlistItem('group-test-two'))
    expect(state.wishlistGroups).toHaveLength(0)
  })
})
