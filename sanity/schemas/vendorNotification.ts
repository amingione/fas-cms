import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'vendorNotification',
  title: 'Vendor Notification',
  type: 'document',
  fields: [
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }],
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: { list: ['order', 'invoice', 'payment', 'message', 'system'] }
    }),
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'message', title: 'Message', type: 'text' }),
    defineField({ name: 'link', title: 'Link', type: 'string' }),
    defineField({ name: 'read', title: 'Read', type: 'boolean', initialValue: false }),
    defineField({
      name: 'createdAt',
      title: 'Created At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    })
  ]
});
