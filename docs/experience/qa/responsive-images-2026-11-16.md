# Responsive Experience images — 16 November 2026

The global Next.js image optimizer is disabled because its hosted quota was exhausted. Passing a custom loader cannot override that global setting. Experience therefore uses native responsive `srcset`/`sizes` with precompressed local WebP variants; the other storefront pages keep their existing image pipeline.

34 source images have responsive variants. Width descriptors match real output dimensions, including sources narrower than the maximum requested size. Missing manifest entries throw an explicit error. The generation script is `scripts/experience/optimize-images.mjs`.

At 480 px, all 34 variants total 907,996 bytes versus 5,947,674 bytes for the corresponding originals (85% fewer bytes). This is an asset-size comparison, not a claim about page loading time or the exact variant selected on every phone; device pixel ratio and rendered width affect selection.

| Cover photo | Original bytes | 480 px bytes |
| --- | ---: | ---: |
| Lake Como | 478,906 | 21,796 |
| Lake Maggiore | 114,172 | 15,416 |
| Sinigaglia | 357,934 | 25,366 |

The first hero image is eager, high priority and preloaded with matching responsive attributes. Subsequent slides are mounted progressively after the first image loads; reduced-motion and paused carousels skip automatic prefetch. Card images are lazy-loaded. Existing aspect ratios and image containers reserve layout space.

Browser check at 390 px: real `currentSrc` uses the 480 px responsive assets for the cover, boat and textile card; `srcset` is present, cover eager and cards lazy, with no horizontal overflow. This verifies selection at the tested browser density, not all hardware/network conditions. No Lighthouse score or measured time-to-load claim is made.

Collections copy also corrected across seven languages: the catalog heading reads Collections instead of Accessories; the all-collections filter explicitly identifies the complete catalog and points to `/collezioni`. Italian heading and link were verified in the local browser.
