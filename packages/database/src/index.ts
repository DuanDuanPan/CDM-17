import { Edge, Node, VisitLog } from '@cdm/types';
import { LayoutState } from '@cdm/types';

export interface GraphRepository {
  saveNode(node: Node): void;
  saveEdge(edge: Edge): void;
  listNodes(): Node[];
  listEdges(): Edge[];
  logVisit(log: VisitLog): void;
  saveLayout(state: LayoutState): void;
  getLayout(graphId: string): LayoutState | undefined;
}

export class InMemoryGraphRepository implements GraphRepository {
  private nodes = new Map<string, Node>();
  private edges = new Map<string, Edge>();
  private visits: VisitLog[] = [];
  private layouts = new Map<string, LayoutState>();

  saveNode(node: Node): void {
    this.nodes.set(node.id, node);
  }

  saveEdge(edge: Edge): void {
    this.edges.set(edge.id, edge);
  }

  listNodes(): Node[] {
    return Array.from(this.nodes.values());
  }

  listEdges(): Edge[] {
    return Array.from(this.edges.values());
  }

  logVisit(log: VisitLog): void {
    this.visits.push(log);
  }

  saveLayout(state: LayoutState): void {
    this.layouts.set(state.graphId, state);
  }

  getLayout(graphId: string): LayoutState | undefined {
    return this.layouts.get(graphId);
  }
}
