import { Edge, Node, VisitLog } from '@cdm/types';
import { LayoutState } from '@cdm/types';

export interface GraphRepository {
  saveGraph(graphId: string, nodes: Node[], edges: Edge[]): void;
  getGraph(graphId: string): { nodes: Node[]; edges: Edge[] } | undefined;
  logVisit(log: VisitLog): void;
  saveLayout(state: LayoutState): void;
  getLayout(graphId: string): LayoutState | undefined;
}

export class InMemoryGraphRepository implements GraphRepository {
  private graphs = new Map<string, { nodes: Node[]; edges: Edge[] }>();
  private visits: VisitLog[] = [];
  private layouts = new Map<string, LayoutState>();

  saveGraph(graphId: string, nodes: Node[], edges: Edge[]): void {
    this.graphs.set(graphId, { nodes, edges });
  }

  getGraph(graphId: string): { nodes: Node[]; edges: Edge[] } | undefined {
    return this.graphs.get(graphId);
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
