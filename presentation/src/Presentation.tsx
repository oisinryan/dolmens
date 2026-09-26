import React from "react";
import { Series } from "remotion";
import { Controls } from "./controls";
import { SLIDES } from "./slides";

/** the whole deck as one film: each slide plays through once */
export const Presentation: React.FC<Controls> = (props) => (
  <Series>
    {SLIDES.map(({ id, component: Slide, duration }) => (
      <Series.Sequence key={id} durationInFrames={duration} name={id}>
        <Slide {...props} />
      </Series.Sequence>
    ))}
  </Series>
);
