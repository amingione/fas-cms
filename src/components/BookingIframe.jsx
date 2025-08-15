import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider.jsx';

export default function BookingIframe({ service }) {
  const { user } = useAuth();
  const [src, setSrc] = useState(`https://cal.com/fasmotorsports/${service}`);

  useEffect(() => {
    if (user?.email && service) {
      const url = new URL(`https://cal.com/fasmotorsports/${service}`);
      url.searchParams.set('email', user.email);
      setSrc(url.toString());
    }
  }, [user, service]);

  return (
    <iframe
      src={src}
      width="100%"
      height="700"
      frameBorder="0"
      scrolling="no"
      className="border border-white rounded-lg"
      title={`Book ${service}`}
    ></iframe>
  );
}
