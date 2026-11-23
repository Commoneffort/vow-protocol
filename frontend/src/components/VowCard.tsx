import React from "react";

export interface VowCardProps {
  classIndex: number;
  nonce: number;
  activatedAt: number;  // unix timestamp
  maturesAt: number;    // unix timestamp
  activeStake: boolean;
  size?: number;        // display width in px; height = size * 1.5
}

const FONT = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

const CLASS_LABELS = ["RUBY","OPAL","TOPAZ","EMERALD","AQUAMARINE","SAPPHIRE","AMETHYST","XENTURION"];

const CLASS_CONFIGS = [
  { dark: "#5A0000", light: "#C41212", border: "white" },    // Ruby
  { dark: "#4B2C66", light: "#D9B8FF", border: "white" },    // Opal
  { dark: "#7A4A00", light: "#F4B942", border: "white" },    // Topaz
  { dark: "#003B1F", light: "#11B86A", border: "white" },    // Emerald
  { dark: "#004E64", light: "#6BE3FF", border: "white" },    // Aquamarine
  { dark: "#001D6E", light: "#2E7BFF", border: "white" },    // Sapphire
  { dark: "#2A003D", light: "#B24CFF", border: "white" },    // Amethyst
  { dark: "#050505", light: "#2A2A2A", border: "#D4AF37" },  // Xenturion
];

function fmtCardDate(ts: number): string {
  if (!ts || ts <= 0) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function Accent({ ci }: { ci: number }): React.ReactElement | null {
  switch (ci) {
    case 0: // Ruby — 4-pointed crystal outline at card center
      return (
        <g>
          <polygon points="512,380 636,600 512,820 388,600"
            stroke="white" strokeOpacity="0.22" fill="none" strokeWidth="1.5" />
          <polygon points="400,545 512,340 624,545 512,750"
            stroke="white" strokeOpacity="0.13" fill="none" strokeWidth="1" />
        </g>
      );

    case 1: // Opal — soft concentric ellipses offset from center (iridescent glow)
      return (
        <g>
          <ellipse cx="680" cy="950" rx="280" ry="190" stroke="white" strokeOpacity="0.08" fill="none" strokeWidth="1" />
          <ellipse cx="700" cy="970" rx="210" ry="146" stroke="white" strokeOpacity="0.06" fill="none" strokeWidth="1" />
          <ellipse cx="716" cy="984" rx="148" ry="103" stroke="white" strokeOpacity="0.05" fill="none" strokeWidth="1" />
        </g>
      );

    case 2: // Topaz — diagonal golden light band
      return (
        <rect x="-300" y="690" width="1700" height="88"
          fill="#F4B942" fillOpacity="0.07"
          transform="rotate(-18, 512, 734)" />
      );

    case 3: // Emerald — subtle geometric grid in lower half
      return (
        <g>
          {[0,1,2,3,4].map(i => (
            <line key={`h${i}`} x1="0" y1={1060 + i * 90} x2="1024" y2={1060 + i * 90}
              stroke="#11B86A" strokeOpacity="0.07" strokeWidth="1" />
          ))}
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <line key={`v${i}`} x1={i * 128} y1="980" x2={i * 128} y2="1536"
              stroke="#11B86A" strokeOpacity="0.07" strokeWidth="1" />
          ))}
        </g>
      );

    case 4: // Aquamarine — sinusoidal wave-like curves
      return (
        <g>
          <path d="M0,880 C180,780 280,980 512,880 C744,780 844,980 1024,880"
            stroke="#6BE3FF" strokeOpacity="0.14" strokeWidth="2" fill="none" />
          <path d="M0,940 C180,840 280,1040 512,940 C744,840 844,1040 1024,940"
            stroke="#6BE3FF" strokeOpacity="0.09" strokeWidth="1.5" fill="none" />
          <path d="M0,1000 C180,900 280,1100 512,1000 C744,900 844,1100 1024,1000"
            stroke="#6BE3FF" strokeOpacity="0.06" strokeWidth="1" fill="none" />
        </g>
      );

    case 5: // Sapphire — faceted hexagonal geometry
      return (
        <g>
          <polygon points="512,440 672,532 672,716 512,808 352,716 352,532"
            stroke="#2E7BFF" strokeOpacity="0.18" fill="none" strokeWidth="1.5" />
          <polygon points="512,500 648,574 648,722 512,796 376,722 376,574"
            stroke="#2E7BFF" strokeOpacity="0.11" fill="none" strokeWidth="1" />
          <polygon points="512,558 622,618 622,738 512,798 402,738 402,618"
            stroke="#2E7BFF" strokeOpacity="0.07" fill="none" strokeWidth="1" />
        </g>
      );

    case 6: { // Amethyst — constellation line network
      const dots: [number, number][] = [
        [180, 320], [512, 185], [840, 265], [920, 700],
        [780, 1190], [650, 1060], [300, 1230], [120, 820],
      ];
      const edges: [number, number][] = [
        [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[0,5],[1,7],[2,5],[3,6],
      ];
      return (
        <g>
          {edges.map(([a, b], i) => (
            <line key={i}
              x1={dots[a][0]} y1={dots[a][1]}
              x2={dots[b][0]} y2={dots[b][1]}
              stroke="#B24CFF" strokeOpacity="0.10" strokeWidth="1" />
          ))}
          {dots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="#B24CFF" fillOpacity="0.22" />
          ))}
        </g>
      );
    }

    case 7: // Xenturion — concentric circles with gold accent
      return (
        <g>
          <circle cx="512" cy="780" r="360" stroke="#D4AF37" strokeOpacity="0.05" fill="none" strokeWidth="1" />
          <circle cx="512" cy="780" r="296" stroke="#D4AF37" strokeOpacity="0.07" fill="none" strokeWidth="1" />
          <circle cx="512" cy="780" r="234" stroke="#D4AF37" strokeOpacity="0.09" fill="none" strokeWidth="1" />
          <circle cx="512" cy="780" r="172" stroke="#D4AF37" strokeOpacity="0.12" fill="none" strokeWidth="1" />
          <circle cx="512" cy="780" r="110" stroke="#D4AF37" strokeOpacity="0.16" fill="none" strokeWidth="1" />
        </g>
      );

    default:
      return null;
  }
}

const VowCard = React.forwardRef<SVGSVGElement, VowCardProps>(
  ({ classIndex, nonce, activatedAt, maturesAt, activeStake, size = 280 }, ref) => {
    const ci = Math.min(7, Math.max(0, classIndex ?? 0));
    const cfg = CLASS_CONFIGS[ci];
    const isDormant = !activeStake;
    const gradId = `vow-bg-${ci}`;
    const w = size;
    const h = Math.round(size * 1.5);
    const textFill = ci === 7 ? "#D4AF37" : "white";
    const activatedStr = fmtCardDate(activatedAt);
    const maturesStr = fmtCardDate(maturesAt);
    const nonceStr = String(nonce ?? 0).padStart(6, "0");

    return (
      <svg
        ref={ref}
        viewBox="0 0 1024 1536"
        width={w}
        height={h}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block", borderRadius: 4 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={cfg.dark} />
            <stop offset="100%" stopColor={cfg.light} />
          </linearGradient>
          {isDormant && (
            <filter id="vow-dormant">
              <feColorMatrix type="saturate" values="0.35" />
            </filter>
          )}
        </defs>

        {/* Main content — apply desaturation filter when dormant */}
        <g filter={isDormant ? "url(#vow-dormant)" : undefined}>

          {/* Background */}
          <rect width="1024" height="1536" fill={`url(#${gradId})`} />

          {/* Class accent (geometric detail) */}
          <Accent ci={ci} />

          {/* Card border: dotted, 10px inset, 20px radius */}
          <rect x="10" y="10" width="1004" height="1516" rx="20"
            stroke={cfg.border} strokeWidth="1.5" strokeOpacity="0.55"
            strokeDasharray="7 5" fill="none" />

          {/* Top-left: CLASS NAME */}
          <text x="50" y="82"
            fontFamily={FONT} fontWeight="100" fontSize="34" letterSpacing="6"
            fill="white" fillOpacity="0.85">
            {CLASS_LABELS[ci]}
          </text>

          {/* Top-right: VOW #000000 */}
          <text x="974" y="82" textAnchor="end"
            fontFamily={FONT} fontWeight="100" fontSize="28" letterSpacing="3"
            fill="white" fillOpacity="0.65">
            VOW #{nonceStr}
          </text>

          {/* Center: X1 — slightly reduced size */}
          <text x="512" y="780" textAnchor="middle"
            fontFamily={FONT} fontWeight="100" fontSize="210" letterSpacing="10"
            fill={textFill} fillOpacity={ci === 7 ? "0.88" : "0.90"}>
            X1
          </text>

          {/* Center: VOW — larger for prominence */}
          <text x="512" y="900" textAnchor="middle"
            fontFamily={FONT} fontWeight="100" fontSize="96" letterSpacing="26"
            fill={textFill} fillOpacity={ci === 7 ? "0.75" : "0.82"}>
            VOW
          </text>

          {/* Bottom-left: Activated */}
          <text x="50" y="1435"
            fontFamily={FONT} fontWeight="100" fontSize="24" letterSpacing="2"
            fill="white" fillOpacity="0.50">
            Activated
          </text>
          <text x="50" y="1470"
            fontFamily={FONT} fontWeight="100" fontSize="26" letterSpacing="1"
            fill="white" fillOpacity="0.80">
            {activatedStr}
          </text>

          {/* Bottom-right: Matures */}
          <text x="974" y="1435" textAnchor="end"
            fontFamily={FONT} fontWeight="100" fontSize="24" letterSpacing="2"
            fill="white" fillOpacity="0.50">
            Matures
          </text>
          <text x="974" y="1470" textAnchor="end"
            fontFamily={FONT} fontWeight="100" fontSize="26" letterSpacing="1"
            fill="white" fillOpacity="0.80">
            {maturesStr}
          </text>

          {/* Bottom-center: SOULBOUND IDENTITY */}
          <text x="512" y="1515" textAnchor="middle"
            fontFamily={FONT} fontWeight="100" fontSize="22" letterSpacing="8"
            fill="white" fillOpacity="0.40">
            SOULBOUND IDENTITY
          </text>

        </g>

        {/* Dormant overlay: darkening rect + diagonal DORMANT watermark */}
        {isDormant && (
          <>
            <rect width="1024" height="1536" fill="black" fillOpacity="0.22" />
            <text x="512" y="768" textAnchor="middle" dominantBaseline="middle"
              transform="rotate(-32, 512, 768)"
              fontFamily={FONT} fontWeight="100" fontSize="150" letterSpacing="14"
              fill="#cc3333" fillOpacity="0.50">
              DORMANT
            </text>
          </>
        )}
      </svg>
    );
  }
);

VowCard.displayName = "VowCard";
export default VowCard;
