import { useEffect, useState } from 'react';

export default function BookingConfirm() {
  const [bookingId, setBookingId] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('bookingId');
    setBookingId(id);
  }, []);

  return (
    <div className="text-center">
      {bookingId ? (
        <div className="bg-zinc-800 border border-white rounded-lg p-6 shadow-md">
          <p className="mb-2 text-sm text-gray-400">Your Booking ID:</p>
          <p className="text-xl font-semibold">{bookingId}</p>
        </div>
      ) : (
        <p className="text-red-500 font-semibold">
          We couldn't find a booking ID. Please check your confirmation email.
        </p>
      )}
    </div>
  );
}
