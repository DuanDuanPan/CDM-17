import type { Edge, Node } from '@cdm/types';

export type PositionedNode = Node & { x: number; y: number };
export type PositionedEdge = Edge & { id: string };

export type GraphSnapshot = { nodes: PositionedNode[]; edges: PositionedEdge[] };
export type GraphHistory = { past: GraphSnapshot[]; future: GraphSnapshot[] };
