import { defineType, defineField } from 'sanity';

export default defineType({
    name: 'modCategory',
    title: 'Modification Category',
    type: 'document',
    fields: [
      defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        options: { source: 'title', maxLength: 96 },
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'description',
        title: 'Description',
        type: 'text',
        rows: 3,
      }),
    ],
    preview: {
      select: {
        title: 'title',
        subtitle: 'slug.current',
        description: 'description',
      },
      prepare({ title, subtitle, description }) {
        return {
          title,
          subtitle: `/${subtitle}`,
          description,
        };
      },
    },
  });