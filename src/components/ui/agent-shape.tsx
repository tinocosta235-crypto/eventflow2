"use client";

/**
 * AgentShape — Geometric visual identity for Phorma AI Agents.
 *
 * Each agent is represented as a distinct geometric form that animates
 * subtly to express its intelligence and purpose.
 *
 * Agents:
 *   score-monitor   → Octagon    — precise, data-driven (indigo)
 *   email-draft     → Diamond    — directed, communicative (violet)
 *   flow-runner     → Hexagon    — connective, systemic (cyan/pulse)
 *   analytics       → Circle     — cyclical, expansive (emerald)
 *   hospitality     → Superellipse — warm, rounded (amber)
 *   registration    → Triangle   — progressive, directional (sky)
 *   generic         → Square     — stable, universal (slate)
 */

export type AgentType =
  | "score-monitor"
  | "email-draft"
  | "flow-runner"
  | "analytics"
  | "hospitality"
  | "registration"
  | "generic";

const AGENTS: Record<
  AgentType,
  { color: string; glow: string; label: string; shape: "octagon" | "diamond" | "hexagon" | "circle" | "superellipse" | "triangle" | "square" }
> = {
  "score-monitor": {
    color: "#6d62f3",
    glow:  "rgba(109, 98, 243, 0.35)",
    label: "Score Monitor",
    shape: "octagon",
  },
  "email-draft": {
    color: "#a78bfa",
    glow:  "rgba(167, 139, 250, 0.35)",
    label: "Email Draft",
    shape: "diamond",
  },
  "flow-runner": {
    color: "#22d3ee",
    glow:  "rgba(34, 211, 238, 0.32)",
    label: "Flow Runner",
    shape: "hexagon",
  },
  analytics: {
    color: "#34d399",
    glow:  "rgba(52, 211, 153, 0.32)",
    label: "Analytics",
    shape: "circle",
  },
  hospitality: {
    color: "#f97316",
    glow:  "rgba(249, 115, 22, 0.30)",
    label: "Hospitality",
    shape: "superellipse",
  },
  registration: {
    color: "#38bdf8",
    glow:  "rgba(56, 189, 248, 0.30)",
    label: "Registration",
    shape: "triangle",
  },
  generic: {
    color: "#8590a8",
    glow:  "rgba(133, 144, 168, 0.25)",
    label: "Agent",
    shape: "square",
  },
};

function ShapePath({ shape, size }: { shape: string; size: number }) {
  const c = size / 2;
  const r = size * 0.38;

  if (shape === "octagon") {
    const a = r * Math.sin(Math.PI / 8);
    const b = r * Math.cos(Math.PI / 8);
    const pts = Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4 - Math.PI / 8;
      return `${(c + r * Math.cos(angle)).toFixed(2)},${(c + r * Math.sin(angle)).toFixed(2)}`;
    });
    return <polygon points={pts.join(" ")} />;
  }

  if (shape === "diamond") {
    const rx = r * 0.72;
    const ry = r;
    return <ellipse cx={c} cy={c} rx={rx} ry={ry} transform={`rotate(45 ${c} ${c})`} />;
  }

  if (shape === "hexagon") {
    const pts = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      return `${(c + r * Math.cos(angle)).toFixed(2)},${(c + r * Math.sin(angle)).toFixed(2)}`;
    });
    return <polygon points={pts.join(" ")} />;
  }

  if (shape === "circle") {
    return <circle cx={c} cy={c} r={r} />;
  }

  if (shape === "superellipse") {
    // Squircle approximation via SVG path
    const k = r * 0.92;
    const s = r * 0.55;
    return (
      <path d={`M ${c} ${c - k} C ${c + s} ${c - k}, ${c + k} ${c - s}, ${c + k} ${c} C ${c + k} ${c + s}, ${c + s} ${c + k}, ${c} ${c + k} C ${c - s} ${c + k}, ${c - k} ${c + s}, ${c - k} ${c} C ${c - k} ${c - s}, ${c - s} ${c - k}, ${c} ${c - k} Z`} />
    );
  }

  if (shape === "triangle") {
    const h  = r * 1.08;
    const hw = r * 0.96;
    const top    = `${c},${c - h * 0.62}`;
    const botL   = `${c - hw * 0.86},${c + h * 0.38}`;
    const botR   = `${c + hw * 0.86},${c + h * 0.38}`;
    return <polygon points={`${top} ${botL} ${botR}`} />;
  }

  // square (default)
  const half = r * 0.82;
  return <rect x={c - half} y={c - half} width={half * 2} height={half * 2} rx={r * 0.18} />;
}

interface AgentShapeProps {
  type?: AgentType;
  size?: number;
  /** Show the orbit ring animation */
  animated?: boolean;
  /** Show inner label below the shape */
  showLabel?: boolean;
  className?: string;
}

export function AgentShape({
  type = "generic",
  size = 48,
  animated = true,
  showLabel = false,
  className = "",
}: AgentShapeProps) {
  const agent = AGENTS[type];
  const padding = size * 0.14;
  const svgSize = size - padding * 2;
  const orbitR = svgSize * 0.46;
  const center = svgSize / 2;

  return (
    <div
      className={`flex flex-col items-center gap-1.5 ${className}`}
      title={agent.label}
    >
      <div
        className="relative flex items-center justify-center rounded-full flex-shrink-0"
        style={{
          width:  size,
          height: size,
          animation: animated ? "flow-pulse 3.2s ease-in-out infinite" : undefined,
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${agent.glow} 0%, transparent 70%)`,
            transform: "scale(1.3)",
          }}
        />

        {/* Main shape SVG */}
        <svg
          width={svgSize}
          height={svgSize}
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          style={{ position: "relative", zIndex: 1 }}
        >
          <title>{agent.label}</title>

          {/* Shape with fill and stroke */}
          <g fill={`${agent.color}22`} stroke={agent.color} strokeWidth={svgSize * 0.04}>
            <ShapePath shape={agent.shape} size={svgSize} />
          </g>

          {/* Center dot */}
          <circle cx={center} cy={center} r={svgSize * 0.08} fill={agent.color} opacity={0.9} />

          {/* Orbit ring (animated) */}
          {animated && (
            <g
              style={{
                transformOrigin: `${center}px ${center}px`,
                animation: "orbit-ring 6s linear infinite",
              }}
            >
              <circle
                cx={center}
                cy={center}
                r={orbitR}
                fill="none"
                stroke={agent.color}
                strokeWidth={svgSize * 0.02}
                strokeDasharray={`${orbitR * 0.6} ${orbitR * 1.4}`}
                opacity={0.35}
              />
            </g>
          )}
        </svg>
      </div>

      {showLabel && (
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em] select-none"
          style={{ color: agent.color }}
        >
          {agent.label}
        </span>
      )}
    </div>
  );
}

/** Compact inline badge version for lists/cards */
export function AgentBadge({ type = "generic", size = 28 }: { type?: AgentType; size?: number }) {
  const agent = AGENTS[type];
  const svgSize = size * 0.62;
  const center = svgSize / 2;

  return (
    <div
      className="relative flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: `${agent.color}14`,
        border: `1px solid ${agent.color}30`,
      }}
      title={agent.label}
    >
      <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        <g fill={`${agent.color}30`} stroke={agent.color} strokeWidth={svgSize * 0.06}>
          <ShapePath shape={agent.shape} size={svgSize} />
        </g>
        <circle cx={center} cy={center} r={svgSize * 0.10} fill={agent.color} opacity={0.85} />
      </svg>
    </div>
  );
}

export { AGENTS };
