import {
  combineReducers,
  configureStore,
  createListenerMiddleware,
  isAnyOf,
} from '@reduxjs/toolkit'
import { toast } from 'react-toastify'
import { logger } from '../../utils/logger'

import { makerApi } from '../../slices/makerApi/makerApi.slice.ts'
import { pairsSlice } from '../../slices/makerApi/pairs.slice.ts'
import { dcaSlice } from '../../slices/dcaSlice'
import { limitOrderSlice } from '../../slices/limitOrderSlice'
import {
  addListing,
  licexSlice,
  mintLicenseListing,
} from '../../slices/licex/licex.slice'
import { publishMarketplaceListing } from '../../services/licexNostrMarketplace'
import { nodeReducer } from '../../slices/node/node.slice'
import { nodeApi } from '../../slices/nodeApi/nodeApi.slice'
import { nodeSettingsSlice } from '../../slices/nodeSettings/nodeSettings.slice.ts'
import { priceApi } from '../../slices/priceApi/priceApi.slice'
import { settingsSlice } from '../../slices/settings/settings.slice'
import { uiSlice } from '../../slices/ui/ui.slice'

const rootReducer = combineReducers({
  [nodeApi.reducerPath]: nodeApi.reducer,
  [makerApi.reducerPath]: makerApi.reducer,
  [priceApi.reducerPath]: priceApi.reducer,
  dca: dcaSlice.reducer,
  licex: licexSlice.reducer,
  limitOrders: limitOrderSlice.reducer,
  node: nodeReducer,
  nodeSettings: nodeSettingsSlice.reducer,
  pairs: pairsSlice.reducer,
  settings: settingsSlice.reducer,
  ui: uiSlice.reducer,
})

const marketplaceRelayListener =
  createListenerMiddleware<ReturnType<typeof rootReducer>>()
marketplaceRelayListener.startListening({
  effect: async (action, listenerApi) => {
    let listing
    if (addListing.match(action)) {
      listing = action.payload
    } else if (mintLicenseListing.match(action)) {
      listing = listenerApi
        .getState()
        .licex.listings.find((item) => item.id === action.payload.id)
    }
    if (!listing) return

    try {
      const eventId = await publishMarketplaceListing(listing)
      if (eventId) toast.success('Inserzione pubblicata sui Nostr Relay')
    } catch (error) {
      logger.warn('[LICEX Marketplace] Relay publish failed:', error)
      toast.warning(
        'Inserzione salvata localmente; pubblicazione relay fallita'
      )
    }
  },
  matcher: isAnyOf(addListing, mintLicenseListing),
})

export const store = configureStore({
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .prepend(marketplaceRelayListener.middleware)
      .concat(nodeApi.middleware)
      .concat(makerApi.middleware)
      .concat(priceApi.middleware),
  reducer: rootReducer,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
