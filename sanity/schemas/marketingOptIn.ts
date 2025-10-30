import { defineArrayMember, defineField, defineType } from 'sanity';

export default defineType({
  name: 'marketingOptIn',
  title: 'Marketing Opt-in',
  type: 'document',
  fields: [
    defineField({
      name: 'formName',
      title: 'Form Name',
      type: 'string',
      validation: (rule) => rule.required()
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.required().email()
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string'
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string'
    }),
    defineField({
      name: 'pageUrl',
      title: 'Page URL',
      type: 'string'
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })]
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      validation: (rule) => rule.required()
    }),
    defineField({
      name: 'fields',
      title: 'Additional Fields',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'field',
          title: 'Field',
          type: 'object',
          fields: [
            defineField({
              name: 'key',
              title: 'Key',
              type: 'string',
              validation: (rule) => rule.required()
            }),
            defineField({
              name: 'value',
              title: 'Value',
              type: 'text',
              validation: (rule) => rule.required()
            })
          ]
        })
      ]
    })
  ],
  preview: {
    select: {
      title: 'email',
      subtitle: 'submittedAt'
    }
  }
});
