import React from 'react';

export default function BuildVisualizer({ vehicle }) {
  // Define a default or fallback URL for the iframe
  const modelUrl = vehicle ? `https://my.spline.design/${vehicle}-model-id/embed` : "https://my.spline.design/default-model-id/embed";

  return (
    <div className="w-full h-[300px] bg-black bg-opacity-20 rounded-xl flex items-center justify-center text-white">
      <div className="flex flex-col items-center">
        {/* Spline 3D Model Embed */}
        <iframe
          src={modelUrl} // Use the dynamic model URL
          frameBorder="0"
          width="100%"
          height="300px"
          allow="autoplay; fullscreen"
        />
        <p className="text-xl mt-4">Visualizer coming soon for the selected model.</p>
      </div>
    </div>
  );
}