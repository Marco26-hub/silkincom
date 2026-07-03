import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadBodoni } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadMont } from "@remotion/google-fonts/Montserrat";

const { fontFamily: SERIF } = loadBodoni(); // Bodoni Moda ≈ Didot/Bodoni brand
const { fontFamily: SANS } = loadMont();
const GOLD = "#E8C76A";
const CREAM = "#F4EFE6";

export type SilkReelProps = {
  place: string; // es. "Cernobbio"
  product: string; // nome DB, es. "Como Fluido"
  subtitle: string; // es. "Twilly in pura seta di Como · €75"
  heroSrc: string; // URL immagine o video (full-bleed)
  heroKind: "image" | "video";
};

export const silkReelDefaults: SilkReelProps = {
  place: "Cernobbio",
  product: "Como Fluido",
  subtitle: "Twilly in pura seta di Como · €75",
  // Default = foto PULITA in public/ (no testo baked). Sostituibile via --props (URL o file public/).
  heroSrc: "hero-demo.jpg",
  heroKind: "image",
};

const Fade: React.FC<{
  at: number;
  dur?: number;
  rise?: number;
  children: React.ReactNode;
}> = ({ at, dur = 28, rise = 34, children }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [at, at + dur], [rise, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity: o, transform: `translateY(${y}px)` }}>{children}</div>;
};

export const SilkReel: React.FC<SilkReelProps> = ({
  place,
  product,
  subtitle,
  heroSrc,
  heroKind,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  // hero = URL pubblico (http) oppure file in public/ (staticFile). DEVE essere PULITO (no testo baked).
  const src = heroSrc.startsWith("http") ? heroSrc : staticFile(heroSrc);

  // Ken Burns lento (zoom-in)
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.09]);
  // Flash bianco iniziale (apertura premium)
  const flash = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: "clamp" });
  // Logo: molla in entrata
  const logoIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#171717" }}>
      {/* HERO full-bleed con Ken Burns */}
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {heroKind === "video" ? (
          <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </AbsoluteFill>

      {/* Scrim gradiente per leggibilità testo (basso) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(15,14,13,0.82) 0%, rgba(15,14,13,0.35) 30%, rgba(0,0,0,0) 55%)",
        }}
      />

      {/* Logo ufficiale top-right (margine 5%) */}
      <Img
        src={staticFile("logo.png")}
        style={{
          position: "absolute",
          top: "5%",
          right: "5%",
          width: "16%",
          opacity: logoIn,
          transform: `translateY(${interpolate(logoIn, [0, 1], [-20, 0])}px)`,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))",
        }}
      />

      {/* Blocco testo in basso */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: "20%", // safe-zone: la UI reel FB/IG copre il ~18-20% basso
          textAlign: "center",
        }}
      >
        <Fade at={34}>
          <div
            style={{
              fontFamily: SANS,
              color: GOLD,
              letterSpacing: 6,
              fontSize: 30,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            {place ? `Lago di Como · ${place}` : 'Lago di Como'}
          </div>
        </Fade>
        <Fade at={58}>
          <div style={{ fontFamily: SERIF, color: CREAM, fontSize: 92, lineHeight: 1.02 }}>
            {product}
          </div>
        </Fade>
        <Fade at={86}>
          <div
            style={{
              fontFamily: SERIF,
              fontStyle: "italic",
              color: CREAM,
              fontSize: 40,
              marginTop: 18,
              opacity: 0.95,
            }}
          >
            {subtitle}
          </div>
        </Fade>
        <Fade at={112}>
          <div
            style={{
              fontFamily: SANS,
              color: GOLD,
              letterSpacing: 5,
              fontSize: 26,
              fontWeight: 500,
              textTransform: "uppercase",
              marginTop: 26,
            }}
          >
            silkincom.com
          </div>
        </Fade>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
