"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Core, ElementDefinition } from "cytoscape";

export type GraphNode = {
  id: string;
  label?: string;
  size?: number; // relative node weight
  color?: string;
  href?: string; // navigate here on click
};

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
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label ?? "",
          color: n.color ?? "#10b981",
          diameter: scale(n.size ?? 1),
          href: n.href ?? "",
        },
      })),
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
              "background-color": "data(color)",
              width: "data(diameter)",
              height: "data(diameter)",
              label: "data(label)",
              "font-size": 9,
              color: "#3f3f46",
              "text-valign": "bottom",
              "text-margin-y": 3,
              "min-zoomed-font-size": 8,
            },
          },
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
