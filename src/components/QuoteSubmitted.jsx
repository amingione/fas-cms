import React from 'react';
import Button from './Button.jsx';

export default function QuoteSubmitted() {
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4">Quote Submitted ✅</h1>
        <p className="text-lg mb-6">
          Thanks for sending in your build! The FAS team will review your quote and get back to you shortly.
        </p>
        <div className="space-x-4">
          <Button href="/" text="Return Home" variant="outline" />
          <Button href="/shop" text="Shop Now" variant="multi-swipe-v2" />
        </div>
      </div>
    </div>
  );
}