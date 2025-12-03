import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'vendorReturn',
  title: 'Vendor Return / RMA',
  type: 'document',
  fields: [
    defineField({ name: 'rmaNumber', title: 'RMA Number', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'reference',
      to: [{ type: 'purchaseOrder' }]
    }),
    defineField({
      name: 'reason',
      title: 'Reason',
      type: 'string',
      options: {
        list: [
          { title: 'Defective', value: 'defective' },
          { title: 'Wrong Item', value: 'wrong_item' },
          { title: 'Damaged', value: 'damaged' },
          { title: 'Not as Described', value: 'not_as_described' },
          { title: 'Other', value: 'other' }
        ]
      }
    }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineField({
          type: 'object',
          fields: [
            { name: 'product', title: 'Product', type: 'reference', to: [{ type: 'product' }] },
            { name: 'quantity', title: 'Quantity', type: 'number' },
            { name: 'reason', title: 'Reason', type: 'string' }
          ]
        })
      ]
    }),
    defineField({ name: 'photos', title: 'Photos', type: 'array', of: [{ type: 'image' }] }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: ['pending', 'approved', 'rejected', 'received', 'refunded']
      },
      initialValue: 'pending'
    }),
    defineField({ name: 'refundAmount', title: 'Refund Amount', type: 'number' }),
    defineField({ name: 'refundMethod', title: 'Refund Method', type: 'string' }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime', initialValue: () => new Date().toISOString() }),
    defineField({ name: 'resolvedAt', title: 'Resolved At', type: 'datetime' })
  ]
});
