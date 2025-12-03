import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'vendorDocument',
  title: 'Vendor Document',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'description', title: 'Description', type: 'text' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          'contract',
          'terms',
          'price_list',
          'catalog',
          'marketing',
          'compliance',
          'other'
        ]
      }
    }),
    defineField({ name: 'file', title: 'File', type: 'file', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }],
      hidden: ({ parent }) => Boolean(parent?.sharedWithAllVendors)
    }),
    defineField({
      name: 'sharedWithAllVendors',
      title: 'Shared with All Vendors',
      type: 'boolean',
      initialValue: false
    }),
    defineField({ name: 'version', title: 'Version', type: 'string' }),
    defineField({
      name: 'uploadedAt',
      title: 'Uploaded At',
      type: 'datetime',
      initialValue: () => new Date().toISOString()
    }),
    defineField({ name: 'uploadedBy', title: 'Uploaded By', type: 'string' })
  ]
});
