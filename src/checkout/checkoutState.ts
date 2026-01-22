export type CheckoutStatus =
  | 'CART_READY'
  | 'CHECKOUT_ADDRESS_REQUIRED'
  | 'ADDRESS_VALID'
  | 'RATES_LOADING'
  | 'RATES_READY'
  | 'RATE_SELECTED'
  | 'PAYMENT_CREATING'
  | 'PAYMENT_REDIRECTING'
  | 'ERROR'

export type CheckoutRate = {
  id: string
  provider: 'easypost'
  carrier: string
  service: string
  amountCents: number
  currency: string
  estDays?: number
}

export type CheckoutAddress = {
  name?: string
  phone?: string
  email?: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export type CheckoutState = {
  status: CheckoutStatus
  address: CheckoutAddress
  rates: CheckoutRate[]
  selectedRate: CheckoutRate | null
  error: string | null
  lastSafeStatus: CheckoutStatus
}

export type CheckoutEvent =
  | { type: 'START_CHECKOUT' }
  | { type: 'ADDRESS_UPDATED'; payload: CheckoutAddress }
  | { type: 'ADDRESS_VALIDATED_OK' }
  | { type: 'ADDRESS_VALIDATED_FAIL'; payload: { message: string } }
  | { type: 'REQUEST_RATES' }
  | { type: 'RATES_SUCCESS'; payload: { rates: CheckoutRate[] } }
  | { type: 'RATES_FAIL'; payload: { message: string } }
  | { type: 'SELECT_RATE'; payload: CheckoutRate }
  | { type: 'CREATE_PAYMENT_SESSION' }
  | { type: 'PAYMENT_SESSION_SUCCESS' }
  | { type: 'PAYMENT_SESSION_FAIL'; payload: { message: string } }
  | { type: 'RESET_ERROR' }

const INITIAL_ADDRESS: CheckoutAddress = {
  line1: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
}

const SAFE_STATUSES: Set<CheckoutStatus> = new Set([
  'CART_READY',
  'CHECKOUT_ADDRESS_REQUIRED',
  'ADDRESS_VALID',
  'RATES_READY',
  'RATE_SELECTED',
  'PAYMENT_REDIRECTING',
])

export const initialCheckoutState: CheckoutState = {
  status: 'CART_READY',
  address: INITIAL_ADDRESS,
  rates: [],
  selectedRate: null,
  error: null,
  lastSafeStatus: 'CART_READY',
}

function withSafeStatus(state: CheckoutState, nextStatus: CheckoutStatus): CheckoutState {
  const next: CheckoutState = {
    ...state,
    status: nextStatus,
    error: null,
  }
  if (SAFE_STATUSES.has(nextStatus)) {
    next.lastSafeStatus = nextStatus
  }
  return next
}

export function validateAddress(address: CheckoutAddress): boolean {
  if (!address) return false
  const required = [address.line1, address.city, address.state, address.postalCode, address.country]
  return required.every((value) => typeof value === 'string' && value.trim().length > 0)
}

export function checkoutReducer(state: CheckoutState, event: CheckoutEvent): CheckoutState {
  switch (event.type) {
    case 'START_CHECKOUT':
      return {
        ...state,
        status: 'CHECKOUT_ADDRESS_REQUIRED',
        error: null,
        lastSafeStatus: 'CHECKOUT_ADDRESS_REQUIRED',
        rates: [],
        selectedRate: null,
      }
    case 'ADDRESS_UPDATED':
      return {
        ...state,
        address: {...event.payload},
        status: 'CHECKOUT_ADDRESS_REQUIRED',
        rates: [],
        selectedRate: null,
        error: null,
        lastSafeStatus: 'CHECKOUT_ADDRESS_REQUIRED',
      }
    case 'ADDRESS_VALIDATED_OK':
      return withSafeStatus(state, 'ADDRESS_VALID')
    case 'ADDRESS_VALIDATED_FAIL':
      return {
        ...state,
        status: 'ERROR',
        error: event.payload.message,
      }
    case 'REQUEST_RATES':
      if (state.status !== 'ADDRESS_VALID') return state
      return {
        ...state,
        status: 'RATES_LOADING',
        error: null,
      }
    case 'RATES_SUCCESS':
      return withSafeStatus({
        ...state,
        rates: event.payload.rates,
        status: 'RATES_READY',
      }, 'RATES_READY')
    case 'RATES_FAIL':
      return {
        ...state,
        status: 'ERROR',
        error: event.payload.message,
      }
    case 'SELECT_RATE':
      if (state.status !== 'RATES_READY') return state
      return withSafeStatus({
        ...state,
        selectedRate: event.payload,
        status: 'RATE_SELECTED',
      }, 'RATE_SELECTED')
    case 'CREATE_PAYMENT_SESSION':
      if (state.status !== 'RATE_SELECTED') return state
      return {
        ...state,
        status: 'PAYMENT_CREATING',
        error: null,
      }
    case 'PAYMENT_SESSION_SUCCESS':
      return withSafeStatus({
        ...state,
        status: 'PAYMENT_REDIRECTING',
      }, 'PAYMENT_REDIRECTING')
    case 'PAYMENT_SESSION_FAIL':
      return {
        ...state,
        status: 'ERROR',
        error: event.payload.message,
      }
    case 'RESET_ERROR':
      return {
        ...state,
        status: state.lastSafeStatus,
        error: null,
      }
    default:
      return state
  }
}
