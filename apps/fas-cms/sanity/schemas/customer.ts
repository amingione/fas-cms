import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'customer',
  title: 'Customer',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string' }),
    defineField({ name: 'email', title: 'Email', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'phone', title: 'Phone', type: 'string' }),
    defineField({ name: 'notes', title: 'Notes', type: 'text' }),
    defineField({ name: 'address', title: 'Address', type: 'text' })
  ]
});

