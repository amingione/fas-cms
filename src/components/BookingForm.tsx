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
        <label className="block text-sm mb-1" htmlFor="booking-name">
          Name
        </label>
        <input
          type="text"
          name="name"
          id="booking-name"
          value={formData.name}
          onChange={handleChange}
          required
          autoComplete="name"
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="booking-email">
          Email
        </label>
        <input
          type="email"
          name="email"
          id="booking-email"
          value={formData.email}
          onChange={handleChange}
          required
          autoComplete="email"
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="booking-phone">
          Phone
        </label>
        <input
          type="tel"
          name="phone"
          id="booking-phone"
          value={formData.phone}
          onChange={handleChange}
          autoComplete="tel"
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="booking-service">
          Service
        </label>
        <select
          name="service"
          id="booking-service"
          value={formData.service}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        >
          <option value="">Select a service</option>
          <option value="custom-work">Custom Work</option>
          <option value="diagnostics">Diagnostics</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="booking-datetime">
          Preferred Date & Time
        </label>
        <input
          type="datetime-local"
          name="datetime"
          id="booking-datetime"
          value={formData.datetime}
          onChange={handleChange}
          autoComplete="off"
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        />
      </div>
      <div>
        <label className="block text-sm mb-1" htmlFor="booking-message">
          Message
        </label>
        <textarea
          name="message"
          id="booking-message"
          value={formData.message}
          placeholder="Please tell us about your project..."
          onChange={handleChange}
          rows={4}
          autoComplete="off"
          className="w-full px-4 py-2 bg-[#1a1a1a] border border-white/30 rounded-sm"
        />
      </div>

      <Button type="submit" className="w-full" onClick={() => {}} text="Submit Booking">
        Submit Booking
      </Button>
      {status && <p className="text-sm text-center mt-2">{status}</p>}
    </form>
  );
};

export default BookingForm;
