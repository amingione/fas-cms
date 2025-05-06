import React, { useState } from 'react';

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
      className="space-y-6 bg-zinc-900 border border-white p-6 rounded-lg shadow-md text-white font-cyber"
    >
      <div>
        <label className="block text-sm mb-1">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-black border border-white rounded"
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
          className="w-full px-4 py-2 bg-black border border-white rounded"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Phone</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-black border border-white rounded"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Service</label>
        <select
          name="service"
          value={formData.service}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 bg-black border border-white rounded"
        >
          <option value="">Select a service</option>
          <option value="consultation">Consultation</option>
          <option value="power-package">Power Package Install</option>
          <option value="diagnostics">Diagnostics</option>
        </select>
      </div>
      <div>
        <label className="block text-sm mb-1">Preferred Date & Time</label>
        <input
          type="datetime-local"
          name="datetime"
          value={formData.datetime}
          onChange={handleChange}
          className="w-full px-4 py-2 bg-black border border-white rounded"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 bg-black border border-white rounded"
        />
      </div>
      <button
        type="submit"
        className="w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition"
      >
        Submit Booking
      </button>
      {status && <p className="text-sm text-center mt-2">{status}</p>}
    </form>
  );
};

export default BookingForm;
