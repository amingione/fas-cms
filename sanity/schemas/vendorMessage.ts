import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'vendorMessage',
  title: 'Vendor Message',
  type: 'document',
  fields: [
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({ name: 'subject', title: 'Subject', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['open', 'replied', 'closed'] },
      initialValue: 'open'
    }),
    defineField({
      name: 'priority',
      title: 'Priority',
      type: 'string',
      options: { list: ['low', 'normal', 'high', 'urgent'] },
      initialValue: 'normal'
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: { list: ['order', 'payment', 'product', 'technical', 'general'] }
    }),
    defineField({ name: 'relatedOrder', title: 'Related Order', type: 'reference', to: [{ type: 'purchaseOrder' }] }),
    defineField({ name: 'relatedInvoice', title: 'Related Invoice', type: 'reference', to: [{ type: 'invoice' }] }),
    defineField({ name: 'attachments', title: 'Attachments', type: 'array', of: [{ type: 'file' }] }),
    defineField({
      name: 'replies',
      title: 'Replies',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'reply',
          fields: [
            { name: 'message', title: 'Message', type: 'text', validation: (Rule) => Rule.required() },
            { name: 'author', title: 'Author', type: 'string' },
            { name: 'authorEmail', title: 'Author Email', type: 'string' },
            {
              name: 'timestamp',
              title: 'Timestamp',
              type: 'datetime',
              initialValue: () => new Date().toISOString()
            },
            { name: 'isStaff', title: 'Is Staff', type: 'boolean', initialValue: false },
            { name: 'attachments', title: 'Attachments', type: 'array', of: [{ type: 'file' }] }
          ]
        }
      ]
    }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({ name: 'lastReplyAt', title: 'Last Reply At', type: 'datetime' })
  ]
});
