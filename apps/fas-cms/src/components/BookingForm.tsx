import React, { useState } from 'react';
import Button from './button.jsx';

const BookingForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    datetime: '',
    message: ''
  });

  const [status, setStatus] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Submitting...');

    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setStatus('✅ Booking submitted successfully!');
        setFormData({ name: '', email: '', phone: '', service: '', datetime: '', message: '' });
      } else {
        setStatus('❌ Failed to submit booking.');
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ An error occurred.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative space-y-6 industrial-card backdrop-blur-sm border border-white/30 p-6 rounded-lg shadow-md border-shadow text-white font-sans"
    >
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Service</label>
        <select
          name="service"
          value={formData.service}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        >
          <option value="">Select a service</option>
          <option value="custom-work">Custom Work</option>
          <option value="diagnostics">Diagnostics</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Preferred Date & Time</label>
        <input
          type="datetime-local"
          name="datetime"
          value={formData.datetime}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Message</label>
        <textarea
          name="message"
          value={formData.message}
          placeholder="Please tell us about your project..."
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 bg-black/20 border border-white/30 rounded-sm"
        />
      </div>

      <Button type="submit" className="w-full" onClick={() => {}} href="#" text="Submit Booking">
        Submit Booking
      </Button>
      {status && <p className="text-sm text-center mt-2">{status}</p>}
    </form>
  );
};

export default BookingForm;
