import { defineType, defineField, defineArrayMember } from 'sanity';

export default defineType({
  name: 'quoteRequest',
  title: 'Quote Request',
  type: 'document',
  fields: [
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required()
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          { title: 'Build Configurator', value: 'build-configurator' },
          { title: 'Belak Wheels', value: 'belak-wheel-quote' },
          { title: 'JTX Wheels', value: 'jtx-wheel-quote' },
          { title: 'Other', value: 'other' }
        ]
      },
      validation: (rule) => rule.required()
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'new',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'In Progress', value: 'in-progress' },
          { title: 'Quoted', value: 'quoted' },
          { title: 'Won', value: 'won' },
          { title: 'Lost', value: 'lost' }
        ],
        layout: 'dropdown'
      }
    }),
    defineField({
      name: 'customerName',
      title: 'Customer Name',
      type: 'string'
    }),
    defineField({
      name: 'customerEmail',
      title: 'Customer Email',
      type: 'string',
      validation: (rule) => rule.email().warning('Enter a valid email')
    }),
    defineField({
      name: 'customerPhone',
      title: 'Customer Phone',
      type: 'string'
    }),
    defineField({
      name: 'vehicle',
      title: 'Vehicle Details',
      type: 'string'
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'text',
      rows: 3
    }),
    defineField({
      name: 'subtotal',
      title: 'Subtotal (USD)',
      type: 'number'
    }),
    defineField({
      name: 'items',
      title: 'Requested Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'quoteItem',
          fields: [
            defineField({ name: 'name', title: 'Name', type: 'string' }),
            defineField({ name: 'quantity', title: 'Qty', type: 'number' }),
            defineField({ name: 'price', title: 'Price', type: 'number' }),
            defineField({ name: 'total', title: 'Line Total', type: 'number' }),
            defineField({ name: 'notes', title: 'Notes', type: 'text' })
          ]
        })
      ]
    }),
    defineField({
      name: 'notes',
      title: 'Customer Notes',
      type: 'text'
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text'
    }),
    defineField({
      name: 'linkedQuote',
      title: 'Related Wheel Quote',
      type: 'reference',
      to: [{ type: 'wheelQuote' }],
      weak: true
    }),
    defineField({
      name: 'meta',
      title: 'Raw Payload (debug)',
      type: 'text',
      readOnly: true,
      hidden: true
    })
  ],
  preview: {
    select: {
      title: 'customerName',
      subtitle: 'source',
      date: 'submittedAt'
    },
    prepare(selection) {
      const { title, subtitle, date } = selection;
      const when = date ? new Date(date).toLocaleString() : '';
      return {
        title: title || 'Quote Request',
        subtitle: [subtitle, when].filter(Boolean).join(' • ')
      };
    }
  }
});
