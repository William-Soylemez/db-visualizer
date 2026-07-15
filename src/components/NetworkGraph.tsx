"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Core, ElementDefinition } from "cytoscape";

export type GraphNode = {
  id: string;
  label?: string;
  size?: number; // relative node weight
  color?: string;
  colors?: string[]; // multi-category nodes render as an even pie split
  href?: string; // navigate here on click
};

// Cytoscape needs a fixed set of pie slice selectors declared up front.
const MAX_PIE_SLICES = 7;

// Per-node pie data: even slices for each color, unused slices sized to 0.
function pieData(colors: string[]): Record<string, string | number> {
  const cols = colors.length ? colors : ["#10b981"];
  const n = Math.min(cols.length, MAX_PIE_SLICES);
  const size = 100 / n;
  const d: Record<string, string | number> = {};
  for (let i = 1; i <= MAX_PIE_SLICES; i++) {
    d[`pc${i}`] = cols[i - 1] ?? "#000000";
    d[`ps${i}`] = i <= n ? size : 0;
  }
  return d;
}

// Static pie-slice selectors, wired to the per-node data() fields above.
const pieSliceStyle: Record<string, string> = {};
for (let i = 1; i <= MAX_PIE_SLICES; i++) {
  pieSliceStyle[`pie-${i}-background-color`] = `data(pc${i})`;
  pieSliceStyle[`pie-${i}-background-size`] = `data(ps${i})`;
}

export type GraphEdge = {
  source: string;
  target: string;
  weight?: number;
};

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  height?: number;
};

// Register the fcose layout extension exactly once across the app.
let fcoseRegistered = false;

export default function NetworkGraph({ nodes, edges, height = 460 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Keep the latest router without re-running the heavy effect.
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!containerRef.current) return;
    let cy: Core | undefined;
    let cancelled = false;

    const sizes = nodes.map((n) => n.size ?? 1);
    const minS = Math.min(...sizes, 1);
    const maxS = Math.max(...sizes, 1);
    const scale = (s: number) =>
      maxS === minS ? 26 : 16 + (40 * (s - minS)) / (maxS - minS);

    const elements: ElementDefinition[] = [
      ...nodes.map((n) => {
        const colors = n.colors?.length ? n.colors : n.color ? [n.color] : [];
        return {
          data: {
            id: n.id,
            label: n.label ?? "",
            color: colors[0] ?? "#10b981",
            diameter: scale(n.size ?? 1),
            href: n.href ?? "",
            ...pieData(colors),
          },
        };
      }),
      ...edges.map((e, i) => ({
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
        },
      })),
    ];

    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (!fcoseRegistered) {
        const fcose = (await import("cytoscape-fcose")).default;
        cytoscape.use(fcose);
        fcoseRegistered = true;
      }
      if (cancelled || !containerRef.current) return;
      cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              // Fallback fill; the pie (slices sum to 100%) covers it.
              "background-color": "data(color)",
              width: "data(diameter)",
              height: "data(diameter)",
              label: "data(label)",
              "font-size": 9,
              color: "#3f3f46",
              "text-valign": "bottom",
              "text-margin-y": 3,
              "min-zoomed-font-size": 8,
              "pie-size": "100%",
              ...pieSliceStyle,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            selector: "edge",
            style: {
              "line-color": "#d4d4d8",
              width: 1,
              "curve-style": "haystack",
              opacity: 0.45,
            },
          },
          {
            selector: "node:active",
            style: { "overlay-opacity": 0.1 },
          },
        ],
        layout: {
          name: "fcose",
          quality: "default",
          animate: false,
          randomize: true,
          fit: true,
          padding: 40,
          // Use a constant ideal edge length so heavy co-occurrence weights
          // don't crush the connected core into an unreadable knot.
          idealEdgeLength: 60,
          nodeSeparation: 90,
          nodeRepulsion: 9000,
          // Pack the many disconnected single-cluster components into a tidy
          // block instead of flinging them into a giant ring.
          tile: true,
          tilingPaddingVertical: 12,
          tilingPaddingHorizontal: 12,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        wheelSensitivity: 0.2,
      });

      cy.on("tap", "node", (evt) => {
        const href = evt.target.data("href");
        if (href) routerRef.current.push(href);
      });
      cy.on("mouseover", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "pointer";
      });
      cy.on("mouseout", "node", () => {
        if (containerRef.current) containerRef.current.style.cursor = "default";
      });
    })();

    return () => {
      cancelled = true;
      cy?.destroy();
    };
  }, [nodes, edges]);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="w-full rounded-lg border border-zinc-200 bg-white"
    />
  );
}
