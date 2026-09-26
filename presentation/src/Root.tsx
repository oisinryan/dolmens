import React from "react";
import { Composition, Folder } from "remotion";
import { DEFAULTS } from "./controls";
import { Presentation } from "./Presentation";
import { SLIDES, TOTAL_FRAMES } from "./slides";
import { FPS, H, W } from "./theme";
import { PLATES } from "./plates";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Presentation" component={Presentation} defaultProps={DEFAULTS} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Folder name="Slides">
      {SLIDES.map((s, i) => (
        <Composition key={s.id} id={`S${i + 1}-${s.id}`} component={s.component} defaultProps={DEFAULTS} durationInFrames={s.duration} fps={FPS} width={W} height={H} />
      ))}
    </Folder>
    <Folder name="Plates">
      {PLATES.map((p) => (
        <Composition key={p.id} id={p.id} component={p.component} durationInFrames={1} fps={FPS} width={W} height={H} />
      ))}
    </Folder>
  </>
);
