import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Reel verticale premium: H.264 yuv420p, faststart per social.
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
// Reel social leggeri: CRF 26 ≈ -80% size vs default, qualità invariata a 1080p.
Config.setCrf(26);
