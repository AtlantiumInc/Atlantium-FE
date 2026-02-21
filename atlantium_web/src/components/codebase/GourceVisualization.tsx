import { useEffect, useRef, useCallback, useState } from "react";
import { fetchAtlantiumCodebase, type TreeNode } from "@/lib/github";

// --- Types ---

interface CanvasNode {
  id: string;
  name: string;
  type: "folder" | "file";
  depth: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  color: string;
  r: number;
  g: number;
  b: number;
  glowIntensity: number;
  opacity: number;
  fadeDelay: number;
  phase: number;
  parentId: string | null;
  childCount: number;
}

// --- Hex to RGB ---

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

// --- Color mapping by extension ---

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "#22d3ee",
    tsx: "#22d3ee",
    js: "#facc15",
    jsx: "#facc15",
    json: "#a78bfa",
    css: "#f472b6",
    scss: "#f472b6",
    html: "#fb923c",
    md: "#94a3b8",
    svg: "#34d399",
    png: "#34d399",
    jpg: "#34d399",
    ico: "#34d399",
    yml: "#f87171",
    yaml: "#f87171",
    toml: "#f87171",
    lock: "#475569",
    gitignore: "#475569",
    env: "#475569",
    xs: "#06b6d4",
  };
  return map[ext] || "#94a3b8";
}

// --- Layout: convert TreeNode → flat CanvasNode[] with radial positions ---

function layoutTree(
  root: TreeNode,
  centerX: number,
  centerY: number,
  scale: number
): CanvasNode[] {
  const nodes: CanvasNode[] = [];
  const ringSpacing = 55 * scale;

  function countDescendants(node: TreeNode): number {
    if (!node.children || node.children.length === 0) return 1;
    return node.children.reduce((sum, c) => sum + countDescendants(c), 0);
  }

  function traverse(
    node: TreeNode,
    depth: number,
    angleStart: number,
    angleEnd: number,
    parentId: string | null
  ) {
    const angle = (angleStart + angleEnd) / 2;
    const r = depth * ringSpacing;
    const jitterR = (Math.random() - 0.5) * 6;
    const jitterA = (Math.random() - 0.5) * 0.03;

    const x = centerX + (r + jitterR) * Math.cos(angle + jitterA);
    const y = centerY + (r + jitterR) * Math.sin(angle + jitterA);

    const isFolder = node.type === "folder";
    const childCount = node.children?.length ?? 0;
    const nodeRadius = isFolder
      ? Math.min(3 + childCount * 0.2, 5.5) * scale
      : 2 * scale;

    const color = isFolder ? "#64748b" : getFileColor(node.name);
    const [cr, cg, cb] = hexToRgb(color);

    nodes.push({
      id: node.id,
      name: node.name,
      type: node.type,
      depth,
      x,
      y,
      baseX: x,
      baseY: y,
      radius: nodeRadius,
      color,
      r: cr,
      g: cg,
      b: cb,
      glowIntensity: 0,
      opacity: 0,
      fadeDelay: depth * 60 + Math.random() * 300,
      phase: Math.random() * Math.PI * 2,
      parentId,
      childCount,
    });

    if (node.children && node.children.length > 0) {
      const totalDesc = node.children.reduce(
        (s, c) => s + countDescendants(c),
        0
      );
      let currentAngle = angleStart;

      for (const child of node.children) {
        const childDesc = countDescendants(child);
        const childSpan =
          ((angleEnd - angleStart) * childDesc) / Math.max(totalDesc, 1);
        traverse(
          child,
          depth + 1,
          currentAngle,
          currentAngle + childSpan,
          node.id
        );
        currentAngle += childSpan;
      }
    }
  }

  // Root node
  const rootColor = "#22d3ee";
  const [rr, rg, rb] = hexToRgb(rootColor);
  nodes.push({
    id: root.id,
    name: root.name,
    type: "folder",
    depth: 0,
    x: centerX,
    y: centerY,
    baseX: centerX,
    baseY: centerY,
    radius: 7 * scale,
    color: rootColor,
    r: rr,
    g: rg,
    b: rb,
    glowIntensity: 0.6,
    opacity: 0,
    fadeDelay: 0,
    phase: 0,
    parentId: null,
    childCount: root.children?.length ?? 0,
  });

  if (root.children) {
    const totalDesc = root.children.reduce(
      (s, c) => s + countDescendants(c),
      0
    );
    let currentAngle = -Math.PI / 2; // start from top
    const fullCircle = Math.PI * 2;

    for (const child of root.children) {
      const childDesc = countDescendants(child);
      const childSpan = (fullCircle * childDesc) / Math.max(totalDesc, 1);
      traverse(child, 1, currentAngle, currentAngle + childSpan, root.id);
      currentAngle += childSpan;
    }
  }

  return nodes;
}

// --- Limit node count for performance ---

function pruneTree(root: TreeNode, maxNodes: number): TreeNode {
  let count = 0;

  function prune(node: TreeNode): TreeNode {
    count++;
    if (!node.children || node.children.length === 0 || count >= maxNodes) {
      return { ...node, children: node.type === "folder" ? [] : undefined };
    }

    const prunedChildren: TreeNode[] = [];
    const folders = node.children.filter((c) => c.type === "folder");
    const files = node.children.filter((c) => c.type === "file");

    for (const f of folders) {
      if (count >= maxNodes) break;
      prunedChildren.push(prune(f));
    }
    for (const f of files) {
      if (count >= maxNodes) break;
      count++;
      prunedChildren.push(f);
    }

    return { ...node, children: prunedChildren };
  }

  return prune(root);
}

// --- Component ---

export function GourceVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<CanvasNode[]>([]);
  const nodeMapRef = useRef<Map<string, CanvasNode>>(new Map());
  const animRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastPulseRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const hoveredRef = useRef<CanvasNode | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ offsetX: 0, offsetY: 0, dragging: false, lastX: 0, lastY: 0 });
  const zoomRef = useRef(1);
  const treeDataRef = useRef<TreeNode | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-layout all nodes from stored tree data
  const relayout = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const tree = treeDataRef.current;
    if (!container || !canvas || !tree) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const zoom = zoomRef.current;
    const cx = w / 2 + panRef.current.offsetX;
    const cy = h / 2 + panRef.current.offsetY;

    const pruned = pruneTree(tree, 400);
    const nodes = layoutTree(pruned, cx, cy, zoom);

    // Preserve opacity from old nodes
    const oldMap = nodeMapRef.current;
    for (const n of nodes) {
      const old = oldMap.get(n.id);
      if (old) {
        n.opacity = old.opacity;
        n.glowIntensity = old.glowIntensity;
      }
    }

    nodesRef.current = nodes;
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    nodeMapRef.current = map;
  }, []);

  // Fetch data
  const initVisualization = useCallback(async () => {
    try {
      const tree = await fetchAtlantiumCodebase();
      treeDataRef.current = tree;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const pruned = pruneTree(tree, 400);
      const nodes = layoutTree(pruned, w / 2, h / 2, 1);
      nodesRef.current = nodes;

      const map = new Map<string, CanvasNode>();
      for (const n of nodes) map.set(n.id, n);
      nodeMapRef.current = map;

      setLoading(false);
      startTimeRef.current = performance.now();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load codebase");
      setLoading(false);
    }
  }, []);

  // Draw frame
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const time = now * 0.001;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dark background
    ctx.fillStyle = "rgba(8, 12, 21, 0.95)";
    ctx.fillRect(0, 0, w, h);

    // Subtle radial gradient from center
    const rootNode = nodesRef.current.find((n) => n.depth === 0);
    if (rootNode) {
      const grad = ctx.createRadialGradient(
        rootNode.x,
        rootNode.y,
        0,
        rootNode.x,
        rootNode.y,
        Math.max(w, h) * 0.6
      );
      grad.addColorStop(0, "rgba(34, 211, 238, 0.04)");
      grad.addColorStop(0.5, "rgba(34, 211, 238, 0.01)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    const nodes = nodesRef.current;
    const nodeMap = nodeMapRef.current;

    if (nodes.length === 0) {
      animRef.current = requestAnimationFrame(draw);
      return;
    }

    // --- Trigger activity pulses ---
    if (now - lastPulseRef.current > 800) {
      lastPulseRef.current = now;
      const fileNodes = nodes.filter(
        (n) => n.type === "file" && n.opacity > 0.5
      );
      const count = 4 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count && fileNodes.length > 0; i++) {
        const idx = Math.floor(Math.random() * fileNodes.length);
        fileNodes[idx].glowIntensity = 1.0;
      }
    }

    // --- Update node positions & fade-in ---
    let hovered: CanvasNode | null = null;
    const mouse = mouseRef.current;

    for (const node of nodes) {
      // Fade in
      if (elapsed > node.fadeDelay && node.opacity < 1) {
        node.opacity = Math.min(1, node.opacity + 0.025);
      }

      // Organic sway — more dramatic
      const swayAmp = node.depth === 0 ? 0 : 3 + node.depth * 1.2;
      const swaySpeed = 0.4 + node.depth * 0.08;
      node.x =
        node.baseX +
        Math.sin(time * swaySpeed + node.phase) * swayAmp +
        Math.cos(time * swaySpeed * 0.6 + node.phase * 1.4) * swayAmp * 0.6;
      node.y =
        node.baseY +
        Math.cos(time * swaySpeed * 0.7 + node.phase + 1.2) * swayAmp +
        Math.sin(time * swaySpeed * 0.4 + node.phase * 0.8) * swayAmp * 0.6;

      // Decay glow
      if (node.glowIntensity > 0) {
        node.glowIntensity = Math.max(0, node.glowIntensity - 0.015);
      }

      // Hit test for hover
      if (mouse && node.opacity > 0.3) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = Math.max(node.radius + 4, 8);
        if (dist < hitRadius) {
          if (!hovered || node.depth > hovered.depth) {
            hovered = node;
          }
        }
      }
    }

    hoveredRef.current = hovered;

    // --- Mouse proximity glow ---
    if (mouse) {
      for (const node of nodes) {
        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80) {
          node.glowIntensity = Math.max(
            node.glowIntensity,
            (1 - dist / 80) * 0.8
          );
        }
      }
    }

    // --- Draw branch lines ---
    for (const node of nodes) {
      if (!node.parentId || node.opacity < 0.05) continue;
      const parent = nodeMap.get(node.parentId);
      if (!parent || parent.opacity < 0.05) continue;

      const alpha = Math.min(node.opacity, parent.opacity) * 0.15;
      const isGlowing = node.glowIntensity > 0.3;

      if (isGlowing) {
        ctx.strokeStyle = `rgba(${node.r}, ${node.g}, ${node.b}, ${alpha + node.glowIntensity * 0.15})`;
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = `rgba(100, 116, 139, ${alpha})`;
        ctx.lineWidth = 0.5;
      }

      ctx.beginPath();
      ctx.moveTo(parent.x, parent.y);

      const midX = (parent.x + node.x) / 2;
      const midY = (parent.y + node.y) / 2;
      const offsetX = (node.y - parent.y) * 0.12;
      const offsetY = (parent.x - node.x) * 0.12;
      ctx.quadraticCurveTo(midX + offsetX, midY + offsetY, node.x, node.y);
      ctx.stroke();
    }

    // --- Draw nodes ---
    for (const node of nodes) {
      if (node.opacity < 0.05) continue;

      const alpha = node.opacity;
      const glow = node.glowIntensity;
      const isHovered = hovered === node;

      // Glow halo
      if (glow > 0.05 || isHovered) {
        const intensity = isHovered ? Math.max(glow, 0.9) : glow;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 20 + intensity * 25;
        ctx.shadowColor = `rgba(${node.r}, ${node.g}, ${node.b}, ${intensity * 0.8})`;
        ctx.fillStyle = `rgba(${node.r}, ${node.g}, ${node.b}, ${intensity * 0.3})`;
        ctx.beginPath();
        ctx.arc(
          node.x,
          node.y,
          node.radius + intensity * 8 + (isHovered ? 4 : 0),
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // Node circle
      ctx.save();
      ctx.globalAlpha = alpha;

      // Brighter fill for files, dimmer for folders
      if (node.type === "file") {
        ctx.fillStyle = `rgba(${node.r}, ${node.g}, ${node.b}, ${0.8 + glow * 0.2})`;
      } else if (node.depth === 0) {
        // Root node - pulsing
        const pulse = 0.7 + Math.sin(time * 2) * 0.15;
        ctx.fillStyle = `rgba(${node.r}, ${node.g}, ${node.b}, ${pulse})`;
        ctx.shadowBlur = 15 + Math.sin(time * 2) * 5;
        ctx.shadowColor = `rgba(${node.r}, ${node.g}, ${node.b}, 0.6)`;
      } else {
        ctx.fillStyle = `rgba(${node.r}, ${node.g}, ${node.b}, 0.5)`;
      }

      const displayRadius = isHovered ? node.radius * 1.5 : node.radius;
      ctx.beginPath();
      ctx.arc(node.x, node.y, displayRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Labels for root and depth-1 nodes
      if (node.depth <= 1 && node.opacity > 0.3) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle =
          node.depth === 0 ? "#e2e8f0" : "rgba(148, 163, 184, 0.9)";
        ctx.font =
          node.depth === 0
            ? `bold ${11 * zoomRef.current}px Inter, system-ui, sans-serif`
            : `600 ${9 * zoomRef.current}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(node.name, node.x, node.y + displayRadius + 5);
        ctx.restore();
      }
    }

    // --- Update tooltip ---
    const tooltip = tooltipRef.current;
    if (tooltip) {
      if (hovered && mouse) {
        tooltip.style.display = "block";
        tooltip.style.left = `${mouse.x + 14}px`;
        tooltip.style.top = `${mouse.y - 30}px`;
        tooltip.textContent = hovered.name;
        tooltip.style.borderColor = `rgba(${hovered.r}, ${hovered.g}, ${hovered.b}, 0.5)`;
      } else {
        tooltip.style.display = "none";
      }
    }

    animRef.current = requestAnimationFrame(draw);
  }, []);

  // Setup & teardown
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    initVisualization();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [initVisualization]);

  // Start animation loop once loading is done
  useEffect(() => {
    if (!loading && !error && nodesRef.current.length > 0) {
      animRef.current = requestAnimationFrame(draw);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [loading, error, draw]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      relayout();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [relayout]);

  // Mouse tracking
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseRef.current = { x, y };

      // Panning
      const pan = panRef.current;
      if (pan.dragging) {
        pan.offsetX += x - pan.lastX;
        pan.offsetY += y - pan.lastY;
        pan.lastX = x;
        pan.lastY = y;
        relayout();
      }
    },
    [relayout]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      panRef.current.dragging = true;
      panRef.current.lastX = e.clientX - rect.left;
      panRef.current.lastY = e.clientY - rect.top;
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    panRef.current.dragging = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = null;
    panRef.current.dragging = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      zoomRef.current = Math.max(0.4, Math.min(2.5, zoomRef.current + delta));
      relayout();
    },
    [relayout]
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none hidden z-20 px-2 py-1 rounded bg-slate-900/90 border border-slate-700/50 text-xs text-slate-200 font-mono whitespace-nowrap backdrop-blur-sm"
        style={{ display: "none" }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading codebase...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 z-10">
          <div className="text-center px-4">
            <p className="text-sm text-slate-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
