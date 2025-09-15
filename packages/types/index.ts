export type UserRole = 'customer' | 'vendor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  vendorId?: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  shippingAddress?: Address;
}

export interface Customer {
  _id: string;
  name: string;
  email: string;
  userId: string;
  passwordHash?: string;
  status?: 'Active' | 'Suspended';
  addresses?: Address[];
  createdAt?: string;
}

export interface Vendor {
  _id: string;
  name: string;
  email: string;
  userId: string;
  passwordHash?: string;
  status?: 'Pending' | 'Approved' | 'Rejected' | 'Suspended';
  approved?: boolean;
  createdAt?: string;
}
