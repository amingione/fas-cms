import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'vendor',
  title: 'Vendor',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (r) => r.required().regex(/@/, { name: 'valid email' })
    }),
    defineField({
      name: 'passwordHash',
      title: 'Password Hash',
      type: 'string',
      description: 'Hashed password for vendor portal access'
    }),
    defineField({
      name: 'portalAccess',
      title: 'Portal Access',
      type: 'object',
      fields: [
        defineField({ name: 'enabled', title: 'Enabled', type: 'boolean', initialValue: false }),
        defineField({
          name: 'email',
          title: 'Portal Email',
          type: 'string',
          description: 'Email used for portal login'
        }),
        defineField({
          name: 'permissions',
          title: 'Permissions',
          type: 'array',
          of: [{ type: 'string' }],
          description: 'Optional granular permissions'
        }),
        defineField({ name: 'invitedAt', title: 'Invited At', type: 'datetime' }),
        defineField({ name: 'invitedBy', title: 'Invited By', type: 'string' }),
        defineField({ name: 'lastLogin', title: 'Last Login', type: 'datetime' })
      ]
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: { list: ['Pending', 'Approved', 'Disabled'] },
      initialValue: 'Pending'
    })
  ]
});
