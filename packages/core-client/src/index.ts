import { Node, Edge } from '@cdm/types';
import { RealtimeClient } from '@cdm/sdk';

export interface ViewState {
  nodes: Node[];
  edges: Edge[];
  layout: 'mindmap' | 'gantt' | 'timeline' | 'board';
}

export class ViewManager {
  private state: ViewState;
  private client: RealtimeClient;

  constructor(initial: Partial<ViewState> = {}, client = new RealtimeClient()) {
    this.state = {
      nodes: initial.nodes ?? [],
      edges: initial.edges ?? [],
      layout: initial.layout ?? 'mindmap',
    };
    this.client = client;
  }

  getState() {
    return this.state;
  }

  setLayout(layout: ViewState['layout']) {
    this.state = { ...this.state, layout };
  }

  attachCollaboration(roomId: string) {
    this.client.connect(roomId);
  }
}
