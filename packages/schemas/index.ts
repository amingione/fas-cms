/**
 * Shared Sanity schema definitions.
 *
 * These types should be updated to match your actual Sanity schemas.  To
 * integrate your existing documents, copy their definitions into this
 * array and export them here.  Both your Studio (`apps/fas‑sanity`) and
 * your CMS API routes (`apps/fas‑cms`) should import from this module.
 */

import { defineType, defineField } from 'sanity';

// Example customer document
const customer = defineType({
  name: 'customer',
  type: 'document',
  title: 'Customer',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      title: 'Name',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'email',
      type: 'string',
      title: 'Email',
      validation: (Rule) => Rule.required().email()
    }),
    defineField({
      name: 'userSub',
      type: 'string',
      title: 'User Sub',
      description: 'The unique subject identifier from the authentication token (JWT sub)',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'passwordHash',
      type: 'string',
      title: 'Password Hash',
      description: 'BCrypt password hash (set via Studio action or signup)',
      hidden: true
    }),
    defineField({
      name: 'status',
      type: 'string',
      title: 'Status',
      options: { list: ['Active', 'Suspended'] },
      initialValue: 'Active'
    }),
    defineField({
      name: 'addresses',
      type: 'array',
      of: [
        {
          name: 'address',
          type: 'object',
          title: 'Address',
          fields: [
            defineField({
              name: 'street1',
              type: 'string',
              title: 'Street 1',
              validation: (Rule) => Rule.required()
            }),
            defineField({ name: 'street2', type: 'string', title: 'Street 2' }),
            defineField({
              name: 'city',
              type: 'string',
              title: 'City',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'state',
              type: 'string',
              title: 'State',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'postalCode',
              type: 'string',
              title: 'Postal Code',
              validation: (Rule) => Rule.required()
            }),
            defineField({
              name: 'country',
              type: 'string',
              title: 'Country',
              validation: (Rule) => Rule.required()
            })
          ]
        }
      ]
    })
  ]
});

// Example vendor document
const vendor = defineType({
  name: 'vendor',
  type: 'document',
  title: 'Vendor',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      title: 'Name',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'email',
      type: 'string',
      title: 'Email',
      validation: (Rule) => Rule.required().email()
    }),
    defineField({
      name: 'userSub',
      type: 'string',
      title: 'User Sub',
      description: 'The unique subject identifier from the authentication token (JWT sub)',
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'passwordHash',
      type: 'string',
      title: 'Password Hash',
      description: 'BCrypt password hash',
      hidden: true
    }),
    defineField({
      name: 'passwordResetToken',
      type: 'string',
      title: 'Password Reset Token',
      hidden: true
    }),
    defineField({
      name: 'passwordResetExpires',
      type: 'datetime',
      title: 'Password Reset Expiration',
      hidden: true
    }),
    defineField({
      name: 'status',
      type: 'string',
      title: 'Status',
      options: { list: ['Pending', 'Approved', 'Rejected', 'Suspended'] },
      initialValue: 'Pending'
    }),
    defineField({ name: 'approved', type: 'boolean', title: 'Approved', initialValue: false })
  ]
});

// Example order document
const order = defineType({
  name: 'order',
  type: 'document',
  title: 'Order',
  fields: [
    defineField({
      name: 'customer',
      title: 'Customer',
      type: 'reference',
      to: [{ type: 'customer' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }]
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        {
          name: 'orderItem',
          type: 'object',
          title: 'Order Item',
          fields: [
            defineField({ name: 'productId', type: 'string', title: 'Product ID' }),
            defineField({ name: 'name', type: 'string', title: 'Name' }),
            defineField({ name: 'quantity', type: 'number', title: 'Quantity' }),
            defineField({ name: 'price', type: 'number', title: 'Price' })
          ]
        }
      ]
    }),
    defineField({ name: 'total', type: 'number', title: 'Total' }),
    defineField({ name: 'currency', type: 'string', title: 'Currency', initialValue: 'USD' }),
    defineField({ name: 'status', type: 'string', title: 'Status', initialValue: 'pending' }),
    defineField({
      name: 'createdAt',
      type: 'datetime',
      title: 'Created At',
      initialValue: () => new Date().toISOString()
    }),
    defineField({ name: 'updatedAt', type: 'datetime', title: 'Updated At' })
  ]
});

export const schemaTypes = [customer, vendor, order];
