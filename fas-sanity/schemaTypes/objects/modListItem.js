export default {
    name: 'modListItem',
    type: 'document',
    title: 'Modification Option',
    fields: [
      { name: 'name', type: 'string', title: 'Modification Name' },
      { name: 'description', type: 'text', title: 'Description' },
      {
        name: 'category',
        type: 'reference',
        to: [{ type: 'modCategory' }],
        title: 'Category',
      },
      {
        name: 'compatibleWith',
        type: 'array',
        of: [{ type: 'reference', to: [{ type: 'product' }] }],
        title: 'Compatible With',
      },
      { name: 'hpGain', type: 'number', title: 'Horsepower Gain' },
      { name: 'price', type: 'number', title: 'Price ($)' },
      { name: 'cost', type: 'number', title: 'Cost to Install ($)' },
    ],
    preview: {
      select: {
        title: 'name',
        subtitle: 'category.title',
        hp: 'hpGain',
        price: 'price',
      },
      prepare({ title, subtitle, hp, price }) {
        return {
          title,
          subtitle: `${subtitle || 'No category'} | +${hp} HP | $${price}`,
        };
      },
    },
  };