'use client';

type SocialMediaProps = {
  className?: string;
};

export default function SocialMedia({ className = '' }: SocialMediaProps) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <a
        href="https://www.instagram.com/fas_moto"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 transition-colors duration-300 hover:text-white"
        aria-label="Instagram"
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.5A4.25 4.25 0 003.5 7.75v8.5A4.25 4.25 0 007.75 20.5h8.5a4.25 4.25 0 004.25-4.25v-8.5A4.25 4.25 0 0016.25 3.5h-8.5zm4.25 3.25a5.25 5.25 0 110 10.5 5.25 5.25 0 010-10.5zm0 1.5a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5zm5.25 1.25a1 1 0 110 2 1 1 0 010-2z" />
        </svg>
      </a>

      <span className="h-6 w-px bg-white/20" aria-hidden="true"></span>

      <a
        href="https://www.facebook.com/fasmotorsports"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-400 transition-colors duration-300 hover:text-white"
        aria-label="Facebook"
      >
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54v-2.89h2.54v-2.203c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562v1.876h2.773l-.443 2.89h-2.33v6.987C18.343 21.128 22 16.991 22 12z" />
        </svg>
      </a>
    </div>
  );
}
