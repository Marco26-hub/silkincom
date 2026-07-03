import { Composition } from "remotion";
import { SilkReel, silkReelDefaults } from "./SilkReel";
import { LarioReel, larioReelDefaults } from "./LarioReel";
import { TwillyTieReel, twillyTieDefaults } from "./TwillyTieReel";

// Reel verticale 9:16 social (IG/TikTok/FB/YT Shorts). 6s a 30fps.
// Parametrico: render diversi reel cambiando inputProps (--props) — vedi README.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SilkReel"
        component={SilkReel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={silkReelDefaults}
      />
      {/* Lario T-shirt — multi-scene 4 colori reali DB + voce IT (say -v Alice) bakata. 585f = 19.5s */}
      <Composition
        id="LarioReel"
        component={LarioReel}
        durationInFrames={585}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={larioReelDefaults}
      />
      {/* Tutorial "come annodare il Twilly" — 4 modi (collo/polso/borsa/capelli). 300f = 10s */}
      <Composition
        id="TwillyTieReel"
        component={TwillyTieReel}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={twillyTieDefaults}
      />
    </>
  );
};
