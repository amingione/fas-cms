import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'emailCampaign',
  title: 'Email Campaign',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required()
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required()
    }),
    defineField({
      name: 'subject',
      title: 'Subject',
      type: 'string',
      validation: (r) => r.required()
    }),
    defineField({
      name: 'from',
      title: 'From',
      type: 'string',
      description: 'Override from address (optional)'
    }),
    defineField({
      name: 'previewText',
      title: 'Preview Text',
      type: 'string'
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{ type: 'block' }]
    })
  ]
});
