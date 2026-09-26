import React from "react";
import { P1Title, P2Inventory } from "./P1P2";
import { P3Signal, P4Range } from "./P3P4";
import { P5Clusters, P6Exploded } from "./P5P6";
import { P7PulseCode, P8TestPlan } from "./P7P8";

/** the eight white-paper plates, in the order of ChatGPT's slide-image prompts */
export const PLATES: { id: string; file: string; component: React.FC }[] = [
  { id: "Plate1-Title", file: "plate-1-title.png", component: P1Title },
  { id: "Plate2-Inventory", file: "plate-2-inventory.png", component: P2Inventory },
  { id: "Plate3-Signal", file: "plate-3-signalling.png", component: P3Signal },
  { id: "Plate4-Range", file: "plate-4-range.png", component: P4Range },
  { id: "Plate5-Clusters", file: "plate-5-clusters.png", component: P5Clusters },
  { id: "Plate6-Exploded", file: "plate-6-exploded.png", component: P6Exploded },
  { id: "Plate7-PulseCode", file: "plate-7-pulse-code.png", component: P7PulseCode },
  { id: "Plate8-TestPlan", file: "plate-8-test-plan.png", component: P8TestPlan },
];
