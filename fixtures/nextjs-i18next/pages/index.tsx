import React from 'react';

interface Props {
  user?: {
    name: string;
  };
}

export default function HomePage({ user = { name: 'Alex' } }: Props) {
  const t = (key: string, _options?: Record<string, unknown>) => key;

  return (
    <main>
      <h1>{t('welcome')}</h1>
      <p>{t('items_count', { count: 3 })}</p>
      <span>{t('missing_feature')}</span>
      <p>{"Hello " + user.name}</p>
      <button>Submit</button>
    </main>
  );
}
