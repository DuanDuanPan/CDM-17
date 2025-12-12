import { Edge, Node, VisitLog } from '@cdm/types';

export interface GraphRepository {
  saveNode(node: Node): void;
  saveEdge(edge: Edge): void;
  listNodes(): Node[];
  listEdges(): Edge[];
  logVisit(log: VisitLog): void;
}

export class InMemoryGraphRepository implements GraphRepository {
  private nodes = new Map<string, Node>();
  private edges = new Map<string, Edge>();
  private visits: VisitLog[] = [];

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
}
