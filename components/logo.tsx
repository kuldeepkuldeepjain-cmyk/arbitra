interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
}

const sizes = {
  sm: { icon: 28, text: 'text-base', gap: 'gap-2' },
  md: { icon: 36, text: 'text-xl',  gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-3xl', gap: 'gap-3' },
}

export function NexaAlgoLogo({ size = 'md', variant = 'full' }: LogoProps) {
  const s = sizes[size]

  return (
    <span className={`inline-flex items-center ${s.gap}`}>
      {/* Icon mark */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer rounded square */}
        <rect width="36" height="36" rx="9" fill="#0E1324" />
        <rect width="36" height="36" rx="9" fill="url(#logo-bg)" opacity="0.6" />

        {/* Neural trend mark — three nodes connected by an upward signal */}
        <path
          d="M7 25 L15 18 L22 21 L30 10"
          stroke="#00D4FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="25" r="3" fill="#6C63FF" />
        <circle cx="15" cy="18" r="3" fill="#00D4FF" />
        <circle cx="22" cy="21" r="3" fill="#00D4FF" />
        <circle cx="30" cy="10" r="3" fill="#E8B85B" />
        <path d="M27 10 H30 V13" stroke="#E8B85B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />

        <defs>
          <linearGradient id="logo-bg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%"  stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#00D4FF" />
          </linearGradient>
        </defs>
      </svg>

      {/* Wordmark */}
      {variant === 'full' && (
        <span className={`font-extrabold tracking-tight ${s.text} leading-none select-none`}>
          <span className="text-white">Nexa</span>
          <span
            className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(90deg, #00D4FF, #6C63FF)' }}
          >
            Algo
          </span>
        </span>
      )}
    </span>
  )
}
