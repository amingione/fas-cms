// /src/components/BuildPageWrapper.jsx
import React, { useState } from 'react';
import BuildComponent from './BuildComponent';
import GarageDashboard from './GarageDashboard';

const BuildPageWrapper = () => {
  const [savedBuilds, setSavedBuilds] = useState([]);

  const handleSubmit = async (quote) => {
    console.log('Form submitted with data:', quote);
    try {
      const res = await fetch('/api/save-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quote),
      });
      if (!res.ok) throw new Error('Failed to save quote');
      setSavedBuilds((prev) => [...prev, quote]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <BuildComponent onSubmit={handleSubmit} />
      <GarageDashboard savedBuilds={savedBuilds} />
    </>
  );
};

export default BuildPageWrapper;