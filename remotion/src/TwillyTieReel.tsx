import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadBodoni } from "@remotion/google-fonts/BodoniModa";
import { loadFont as loadMont } from "@remotion/google-fonts/Montserrat";

const { fontFamily: SERIF } = loadBodoni();
const { fontFamily: SANS } = loadMont();
const GOLD = "#E8C76A";
const CREAM = "#F4EFE6";

export type TwillyTieProps = {
  scenes: { src: string; n: string; label: string }[];
  price: string;
};

// Tutorial "come annodare il Twilly". 4 scene × 75f = 300f (10s @30fps).
// Foto PULITE in public/ (no testo baked). Logo + safe-zone come SilkReel.
export const twillyTieDefaults: TwillyTieProps = {
  price: "€75",
  scenes: [
    { src: "tie-collo.jpg", n: "1", label: "Al collo" },
    { src: "tie-polso.jpg", n: "2", label: "Al polso" },
    { src: "tie-borsa.jpg", n: "3", label: "Alla borsa" },
    { src: "tie-capelli.jpg", n: "4", label: "Tra i capelli" },
  ],
};

const SCENE_LEN = 75;

// Hero full-bleed con Ken Burns, montato per-scena via <Sequence>.
const SceneImg: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame(); // scene-local (dentro Sequence)
  const scale = interpolate(frame, [0, SCENE_LEN], [1.02, 1.1]);
  return (
    <AbsoluteFill style={{ transform: `scale(${scale})` }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </AbsoluteFill>
  );
};

export const TwillyTieReel: React.FC<TwillyTieProps> = ({ scenes, price }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scena corrente + fade per-scena del blocco testo (sopra lo scrim).
  const idx = Math.min(scenes.length - 1, Math.floor(frame / SCENE_LEN));
  const local = frame - idx * SCENE_LEN;
  const labelOp = interpolate(
    local,
    [0, 12, SCENE_LEN - 12, SCENE_LEN - 2],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const labelY = interpolate(local, [0, 14], [26, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cur = scenes[idx];

  const logoIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  // Kicker iniziale (intro) — sfuma via dopo ~2,5s, resta solo silkincom.com nel footer.
  const kickerOp = interpolate(frame, [8, 26, 64, 78], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#171717" }}>
      {/* Immagini per-scena */}
      {scenes.map((s, i) => (
        <Sequence key={i} from={i * SCENE_LEN} durationInFrames={SCENE_LEN}>
          <SceneImg src={s.src} />
        </Sequence>
      ))}

      {/* Scrim leggibilità (alto + basso) */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(15,14,13,0.84) 0%, rgba(15,14,13,0.32) 32%, rgba(0,0,0,0) 55%), linear-gradient(to bottom, rgba(15,14,13,0.55) 0%, rgba(0,0,0,0) 22%)",
        }}
      />

      {/* Logo ufficiale top-right */}
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

      {/* Kicker intro top-left */}
      <div
        style={{
          position: "absolute",
          top: "6.5%",
          left: "6%",
          opacity: kickerOp,
          fontFamily: SANS,
          color: GOLD,
          letterSpacing: 2,
          fontSize: 29,
          fontWeight: 600,
          textTransform: "uppercase",
          textShadow: "0 2px 12px rgba(0,0,0,0.6)",
          lineHeight: 1.25,
        }}
      >
        Come annodare<br />il Twilly Como
      </div>

      {/* Blocco testo per-scena (numero + modo) */}
      <AbsoluteFill
        style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "21%", textAlign: "center" }}
      >
        <div style={{ opacity: labelOp, transform: `translateY(${labelY}px)` }}>
          <div
            style={{
              fontFamily: SANS,
              color: GOLD,
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 8,
            }}
          >
            {cur.n} / {scenes.length}
          </div>
          <div style={{ fontFamily: SERIF, color: CREAM, fontSize: 96, lineHeight: 1.0 }}>
            {cur.label}
          </div>
        </div>
        <div
          style={{
            fontFamily: SANS,
            color: GOLD,
            letterSpacing: 5,
            fontSize: 25,
            fontWeight: 500,
            textTransform: "uppercase",
            marginTop: 30,
          }}
        >
          Twilly Como · pura seta · {price} · silkincom.com
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
