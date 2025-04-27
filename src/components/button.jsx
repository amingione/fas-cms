export default function Button({ href, text }) {
  return (
    <a
      href={href}
      className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden font-cyber-italic text-white transition-all duration-300 rounded-none border-2 border-white group tracking-wide text-base"
    >
      <span className="absolute inset-0 w-full h-full transform scale-x-0 origin-left bg-white transition-transform duration-300 group-hover:scale-x-100"></span>
      <span className="relative flex items-center space-x-2 group-hover:text-primary">
        <span>{text}</span>
        <svg
          className="w-5 h-5 transition-transform duration-300 transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </a>
  );
}
