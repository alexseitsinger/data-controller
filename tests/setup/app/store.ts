import { createLocationsMiddleware } from "@alexseitsinger/redux-locations"
import {
  applyMiddleware,
  compose,
  createStore as createReduxStore,
  Store,
} from "redux"
import thunk from "redux-thunk"

import createRootReducer, { ReducerState } from "./reducer"

export type StoreType = Store<ReducerState>

export default (preloadedState = {}): StoreType => {
  const rootReducer = createRootReducer()
  const middleware = [thunk, createLocationsMiddleware()]
  const storeEnhancers = compose(applyMiddleware(...middleware))
  const store = createReduxStore(rootReducer, preloadedState, storeEnhancers)
  return store
}