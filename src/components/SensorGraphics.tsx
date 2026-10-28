import type { Level } from '../data/sensors'
import { LEVELS } from '../data/sensors'

export function WaterLevelGraphic({
  level,
  isCurrent,
}: {
  level: Level | undefined
  isCurrent: boolean
}) {
  if (!isCurrent || level === undefined) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-dashed border-line bg-page/40 p-2"
        role="img"
        aria-label="Water sensor status unavailable or historical"
      >
        <svg viewBox="0 0 240 76" className="h-20 w-full" fill="none">
          {/* Probe contact lines (inactive) */}
          <line x1="20" y1="18" x2="190" y2="18" stroke="#dce4e8" strokeWidth="1" strokeDasharray="3 3" />
          <text x="196" y="21" fill="#7d939e" fontSize="9" fontWeight="600">HIGH</text>

          <line x1="20" y1="36" x2="190" y2="36" stroke="#dce4e8" strokeWidth="1" strokeDasharray="3 3" />
          <text x="196" y="39" fill="#7d939e" fontSize="9" fontWeight="600">MID</text>

          <line x1="20" y1="54" x2="190" y2="54" stroke="#dce4e8" strokeWidth="1" strokeDasharray="3 3" />
          <text x="196" y="57" fill="#7d939e" fontSize="9" fontWeight="600">LOW</text>

          {/* Baseline */}
          <line x1="20" y1="68" x2="190" y2="68" stroke="#dce4e8" strokeWidth="1.5" />

          {/* Stale/unavailable indicator text */}
          <rect x="55" y="27" width="130" height="22" rx="11" fill="#f2f5f7" stroke="#dce4e8" />
          <text x="120" y="42" textAnchor="middle" fill="#526873" fontSize="10" fontWeight="700">
            Reading unverified
          </text>
        </svg>
      </div>
    )
  }

  // Active configurations based on contact level
  const cfg = {
    0: {
      waterY: 66,
      waveHeight: 4,
      fill: 'rgba(22, 130, 96, 0.16)',
      stroke: '#168260',
      label: 'Below LOW contact',
      textColor: '#168260',
      lowWet: false,
      midWet: false,
      highWet: false,
    },
    1: {
      waterY: 48,
      waveHeight: 5,
      fill: 'rgba(155, 112, 0, 0.18)',
      stroke: '#9b7000',
      label: 'LOW contact active',
      textColor: '#9b7000',
      lowWet: true,
      midWet: false,
      highWet: false,
    },
    2: {
      waterY: 30,
      waveHeight: 5,
      fill: 'rgba(202, 91, 19, 0.2)',
      stroke: '#ca5b13',
      label: 'MID contact active',
      textColor: '#ca5b13',
      lowWet: true,
      midWet: true,
      highWet: false,
    },
    3: {
      waterY: 12,
      waveHeight: 5,
      fill: 'rgba(193, 60, 73, 0.22)',
      stroke: '#c13c49',
      label: 'HIGH contact active',
      textColor: '#c13c49',
      lowWet: true,
      midWet: true,
      highWet: true,
    },
  }[level]

  const y = cfg.waterY
  const h = cfg.waveHeight

  // Seamless wave path stretching from x=-30 to x=270 (300px total for smooth 24px transform)
  const waveD = `M -30 ${y} Q -15 ${y - h} 0 ${y} T 30 ${y} T 60 ${y} T 90 ${y} T 120 ${y} T 150 ${y} T 180 ${y} T 210 ${y} T 240 ${y} T 270 ${y} V 76 H -30 Z`

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-page/70 p-2"
      role="img"
      aria-label={`Water contact level: ${LEVELS[level].label}. Discrete contact category; depth not measured.`}
    >
      <svg viewBox="0 0 240 76" className="h-20 w-full" fill="none">
        {/* Contact probe levels */}
        {/* HIGH Probe (y = 18) */}
        <line x1="20" y1="18" x2="185" y2="18" stroke={cfg.highWet ? '#c13c49' : '#dce4e8'} strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="185" cy="18" r="3.5" fill={cfg.highWet ? '#c13c49' : '#ffffff'} stroke={cfg.highWet ? '#c13c49' : '#9bb5c4'} strokeWidth="1.5" />
        <text x="194" y="21" fill={cfg.highWet ? '#c13c49' : '#7d939e'} fontSize="9" fontWeight="700">HIGH</text>

        {/* MID Probe (y = 36) */}
        <line x1="20" y1="36" x2="185" y2="36" stroke={cfg.midWet ? '#ca5b13' : '#dce4e8'} strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="185" cy="36" r="3.5" fill={cfg.midWet ? '#ca5b13' : '#ffffff'} stroke={cfg.midWet ? '#ca5b13' : '#9bb5c4'} strokeWidth="1.5" />
        <text x="194" y="39" fill={cfg.midWet ? '#ca5b13' : '#7d939e'} fontSize="9" fontWeight="700">MID</text>

        {/* LOW Probe (y = 54) */}
        <line x1="20" y1="54" x2="185" y2="54" stroke={cfg.lowWet ? '#9b7000' : '#dce4e8'} strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="185" cy="54" r="3.5" fill={cfg.lowWet ? '#9b7000' : '#ffffff'} stroke={cfg.lowWet ? '#9b7000' : '#9bb5c4'} strokeWidth="1.5" />
        <text x="194" y="57" fill={cfg.lowWet ? '#9b7000' : '#7d939e'} fontSize="9" fontWeight="700">LOW</text>

        {/* Chamber base */}
        <line x1="16" y1="72" x2="188" y2="72" stroke="#9bb5c4" strokeWidth="2" strokeLinecap="round" />

        {/* Water wave fill with subtle horizontal oscillation */}
        <g className="animate-wave-motion">
          <path d={waveD} fill={cfg.fill} stroke={cfg.stroke} strokeWidth="1.5" />
        </g>

        {/* Contact state pill badge */}
        <rect x="22" y={y > 45 ? 12 : 50} width="105" height="18" rx="9" fill="#ffffff" stroke={cfg.stroke} strokeWidth="1" opacity="0.95" />
        <text x="74" y={y > 45 ? 24 : 62} textAnchor="middle" fill={cfg.textColor} fontSize="9" fontWeight="700">
          {cfg.label}
        </text>
      </svg>
    </div>
  )
}

export function RainGraphic({
  rainDetected,
  isCurrent,
}: {
  rainDetected: boolean | undefined
  isCurrent: boolean
}) {
  if (!isCurrent || rainDetected === undefined) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-dashed border-line bg-page/40 p-2"
        role="img"
        aria-label="Rain sensor status unavailable or historical"
      >
        <svg viewBox="0 0 240 76" className="h-20 w-full" fill="none">
          {/* Muted static cloud */}
          <g transform="translate(100, 14)">
            <path
              d="M 12 28 A 10 10 0 0 1 24 16 A 14 14 0 0 1 48 18 A 9 9 0 0 1 54 28 Z"
              fill="#e2e8ec"
              stroke="#9bb5c4"
              strokeWidth="1.5"
            />
          </g>

          <rect x="55" y="46" width="130" height="22" rx="11" fill="#f2f5f7" stroke="#dce4e8" />
          <text x="120" y="61" textAnchor="middle" fill="#526873" fontSize="10" fontWeight="700">
            Reading unverified
          </text>
        </svg>
      </div>
    )
  }

  if (rainDetected) {
    return (
      <div
        className="relative overflow-hidden rounded-xl border border-teal/20 bg-teal/5 p-2"
        role="img"
        aria-label="Rain detected at prototype sensor"
      >
        <svg viewBox="0 0 240 76" className="h-20 w-full" fill="none">
          {/* Rain cloud */}
          <g transform="translate(90, 8)">
            <path
              d="M 10 28 A 12 12 0 0 1 24 14 A 16 16 0 0 1 52 16 A 11 11 0 0 1 58 28 Z"
              fill="#102b3b"
              stroke="#067a85"
              strokeWidth="1.5"
            />
          </g>

          {/* Falling raindrops */}
          <g className="animate-rain-drop-1">
            <line x1="102" y1="40" x2="99" y2="48" stroke="#067a85" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="134" y1="40" x2="131" y2="48" stroke="#067a85" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="animate-rain-drop-2">
            <line x1="114" y1="42" x2="111" y2="50" stroke="#50d7dd" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <g className="animate-rain-drop-3">
            <line x1="124" y1="42" x2="121" y2="50" stroke="#067a85" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="144" y1="42" x2="141" y2="50" stroke="#50d7dd" strokeWidth="2.5" strokeLinecap="round" />
          </g>

          {/* Label badge */}
          <rect x="68" y="56" width="104" height="17" rx="8.5" fill="#ffffff" stroke="#067a85" strokeWidth="1" />
          <text x="120" y="68" textAnchor="middle" fill="#067a85" fontSize="9" fontWeight="700">
            Moisture detected
          </text>
        </svg>
      </div>
    )
  }

  // Rain NOT detected (clear / dry)
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-line bg-page/70 p-2"
      role="img"
      aria-label="No rain detected at prototype sensor"
    >
      <svg viewBox="0 0 240 76" className="h-20 w-full" fill="none">
        {/* Calm sun with gentle pulse */}
        <g className="animate-calm-sun" transform="translate(136, 18)">
          <circle cx="0" cy="0" r="10" fill="#f59e0b" opacity="0.9" />
          {/* Subtle sun rays */}
          <line x1="0" y1="-14" x2="0" y2="-12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="-10" x2="8" y2="-8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="0" x2="12" y2="0" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="10" x2="8" y2="8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Calm cloud in front */}
        <g transform="translate(90, 10)">
          <path
            d="M 10 26 A 11 11 0 0 1 22 14 A 15 15 0 0 1 48 16 A 10 10 0 0 1 54 26 Z"
            fill="#ffffff"
            stroke="#9bb5c4"
            strokeWidth="1.5"
          />
        </g>

        {/* Label badge */}
        <rect x="68" y="52" width="104" height="17" rx="8.5" fill="#ffffff" stroke="#9bb5c4" strokeWidth="1" />
        <text x="120" y="64" textAnchor="middle" fill="#526873" fontSize="9" fontWeight="700">
          No rain detected
        </text>
      </svg>
    </div>
  )
}
