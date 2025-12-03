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
        defineField({ name: 'lastLogin', title: 'Last Login', type: 'datetime' }),
        defineField({
          name: 'setupToken',
          title: 'Setup Token',
          type: 'string',
          description: 'One-time token used for initial account setup'
        }),
        defineField({
          name: 'setupTokenExpiry',
          title: 'Setup Token Expiry',
          type: 'datetime',
          description: 'When the setup token expires'
        }),
        defineField({
          name: 'setupCompletedAt',
          title: 'Setup Completed At',
          type: 'datetime',
          description: 'When the vendor completed initial setup'
        }),
        defineField({
          name: 'passwordHash',
          title: 'Portal Password Hash',
          type: 'string',
          description: 'Hashed password for portal login'
        })
      ]
    }),
    defineField({
      name: 'shippingAddresses',
      title: 'Shipping Addresses',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Label', type: 'string' },
            { name: 'line1', title: 'Address Line 1', type: 'string' },
            { name: 'line2', title: 'Address Line 2', type: 'string' },
            { name: 'city', title: 'City', type: 'string' },
            { name: 'state', title: 'State/Province', type: 'string' },
            { name: 'postalCode', title: 'Postal Code', type: 'string' },
            { name: 'country', title: 'Country', type: 'string' },
            { name: 'default', title: 'Default', type: 'boolean', initialValue: false }
          ]
        }
      ]
    }),
    defineField({
      name: 'notificationPreferences',
      title: 'Notification Preferences',
      type: 'object',
      fields: [
        { name: 'emailOrders', title: 'Email: Orders', type: 'boolean', initialValue: true },
        { name: 'emailInvoices', title: 'Email: Invoices', type: 'boolean', initialValue: true },
        { name: 'emailMessages', title: 'Email: Messages', type: 'boolean', initialValue: true },
        { name: 'emailPayments', title: 'Email: Payments', type: 'boolean', initialValue: true }
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
