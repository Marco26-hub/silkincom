import {
  AbsoluteFill,
  Audio,
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

const { fontFamily: SERIF } = loadBodoni(); // Bodoni Moda ≈ Didot/Bodoni brand (NO € → tofu)
const { fontFamily: SANS } = loadMont(); // Montserrat (usa per €, prezzi, eyebrow)
const GOLD = "#E8C76A";
const CREAM = "#F4EFE6";

type Scene = {
  src: string; // foto PULITA in public/ (no testo baked)
  eyebrow: string; // SANS gold uppercase
  title: string; // SERIF (Bodoni) — niente €
  subtitle: string; // SANS — qui ci va il prezzo/€ in sicurezza
  from: number;
  durationInFrames: number;
};

export type LarioReelProps = { scenes: Scene[]; audioSrc: string };

// Timing scene calcolato sulla voce IT (say -v Alice, 19.48s → 585f @30fps).
export const larioReelDefaults: LarioReelProps = {
  audioSrc: "vo-lario.m4a",
  scenes: [
    { src: "lario_bianco.jpg", eyebrow: "LAGO DI COMO", title: "", subtitle: "", from: 0, durationInFrames: 141 },
    { src: "lario_azzurro.jpg", eyebrow: "MADE IN COMO · DAL 1400", title: "Lario", subtitle: "T-SHIRT IN PURO COTONE", from: 129, durationInFrames: 192 },
    { src: "lario_rosa.jpg", eyebrow: "SETTE COLORI", title: "Lario", subtitle: "100% COTONE · TAGLIATA A COMO", from: 309, durationInFrames: 136 },
    { src: "lario_navy.jpg", eyebrow: "MADE IN COMO", title: "Lario", subtitle: "€45 · SILKINCOM.COM", from: 433, durationInFrames: 152 },
  ],
};

const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame(); // locale alla Sequence (0 = inizio scena)
  const dur = scene.durationInFrames;

  // Crossfade: dissolvenza in entrata + uscita (overlap fra Sequence adiacenti)
  const inOp = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });
  const outOp = interpolate(frame, [dur - 14, dur], [1, 0], { extrapolateLeft: "clamp" });
  const op = Math.min(inOp, outOp);

  // Ken Burns lento (zoom-in)
  const scale = interpolate(frame, [0, dur], [1.0, 1.1]);

  const fade = (at: number) => interpolate(frame, [at, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = (at: number) => interpolate(frame, [at, at + 22], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: op }}>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        <Img src={staticFile(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Scrim per leggibilità testo */}
      <AbsoluteFill
        style={{ background: "linear-gradient(to top, rgba(15,14,13,0.82) 0%, rgba(15,14,13,0.32) 32%, rgba(0,0,0,0) 58%)" }}
      />

      {/* Blocco testo basso — safe-zone 20% (UI reel FB/IG) */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: "20%", textAlign: "center" }}>
        <div style={{ opacity: fade(8), transform: `translateY(${rise(8)}px)`, fontFamily: SANS, color: GOLD, letterSpacing: 6, fontSize: 28, fontWeight: 600, textTransform: "uppercase", marginBottom: 14 }}>
          {scene.eyebrow}
        </div>
        {scene.title ? (
          <div style={{ opacity: fade(20), transform: `translateY(${rise(20)}px)`, fontFamily: SERIF, color: CREAM, fontSize: 104, lineHeight: 1.0 }}>
            {scene.title}
          </div>
        ) : null}
        {scene.subtitle ? (
          <div style={{ opacity: fade(34) * 0.96, transform: `translateY(${rise(34)}px)`, fontFamily: SANS, color: CREAM, fontSize: 30, letterSpacing: 3, fontWeight: 500, marginTop: 16 }}>
            {scene.subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const LarioReel: React.FC<LarioReelProps> = ({ scenes, audioSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = interpolate(frame, [0, 8], [1, 0], { extrapolateRight: "clamp" });
  const logoIn = spring({ frame: frame - 6, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#171717" }}>
      <Audio src={staticFile(audioSrc)} />

      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.durationInFrames}>
          <SceneView scene={s} />
        </Sequence>
      ))}

      {/* Flash bianco apertura premium */}
      <AbsoluteFill style={{ backgroundColor: "white", opacity: flash * 0.85 }} />

      {/* Logo ufficiale top-right (margine 5%, persistente) */}
      <Img
        src={staticFile("logo.png")}
        style={{ position: "absolute", top: "5%", right: "5%", width: "16%", opacity: logoIn, transform: `translateY(${interpolate(logoIn, [0, 1], [-20, 0])}px)`, filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}
      />
    </AbsoluteFill>
  );
};
