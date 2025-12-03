import { defineField, defineType } from 'sanity';

export default defineType({
  name: 'vendorAuthToken',
  title: 'Vendor Auth Token',
  type: 'document',
  fields: [
    defineField({
      name: 'vendor',
      title: 'Vendor',
      type: 'reference',
      to: [{ type: 'vendor' }],
      validation: (r) => r.required()
    }),
    defineField({
      name: 'tokenHash',
      title: 'Token Hash',
      type: 'string',
      validation: (r) => r.required()
    }),
    defineField({
      name: 'tokenType',
      title: 'Token Type',
      type: 'string',
      options: { list: ['invitation', 'password-reset'] },
      validation: (r) => r.required()
    }),
    defineField({ name: 'expiresAt', title: 'Expires At', type: 'datetime' }),
    defineField({ name: 'usedAt', title: 'Used At', type: 'datetime' }),
    defineField({ name: 'invitedBy', title: 'Invited By', type: 'string' }),
    defineField({ name: 'createdAt', title: 'Created At', type: 'datetime' })
  ]
});
