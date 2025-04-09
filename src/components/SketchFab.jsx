import React from 'react';

const BuildVisualizer = () => (
  <div className="visualizer-container">
    <h2>Select a Car Model</h2>
    <iframe
      width="600"
      height="400"
      src="https://sketchfab.com/models/your_model_id/embed"
      frameBorder="0"
      allow="autoplay; fullscreen; vr"
      allowFullScreen
    />
  </div>
);

export default BuildVisualizer;