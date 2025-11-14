export const ADD_TO_CART_SUCCESS_EVENT = 'fas:add-to-cart-success';

export type AddToCartToastDetail = {
  name?: string;
};

export function emitAddToCartSuccess(detail?: AddToCartToastDetail) {
  if (typeof window === 'undefined') return;

  try {
    window.dispatchEvent(
      new CustomEvent<AddToCartToastDetail>(ADD_TO_CART_SUCCESS_EVENT, {
        detail: detail ?? {}
      })
    );
  } catch {
    window.dispatchEvent(new Event(ADD_TO_CART_SUCCESS_EVENT));
  }
}
