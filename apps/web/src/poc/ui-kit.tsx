import { Badge, Button, Card, Input, Select } from '@cdm/ui';
import { useState } from 'react';

export default function UiKit() {
  const [text, setText] = useState('Hello');
  const [choice, setChoice] = useState('alpha');

  return (
    <div className="min-h-screen bg-surface-muted text-neutral-900 p-8">
      <div className="mx-auto max-w-4xl flex flex-col gap-6">
        <div className="text-sm text-neutral-700">PoC · UI Kit</div>

        <Card className="flex flex-col gap-3" padded>
          <div className="text-sm font-semibold">Buttons</div>
          <div className="flex flex-wrap gap-2">
            <Button data-testid="ui-btn-primary" variant="primary">
              Primary
            </Button>
            <Button data-testid="ui-btn-secondary" variant="secondary">
              Secondary
            </Button>
            <Button data-testid="ui-btn-ghost" variant="ghost">
              Ghost
            </Button>
            <Button data-testid="ui-btn-danger" variant="danger">
              Danger
            </Button>
            <Button data-testid="ui-btn-disabled" variant="secondary" disabled>
              Disabled
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3" padded>
          <div className="text-sm font-semibold">Badges</div>
          <div className="flex flex-wrap gap-2">
            <Badge data-testid="ui-badge-neutral" tone="neutral">
              Neutral
            </Badge>
            <Badge data-testid="ui-badge-info" tone="info">
              Info
            </Badge>
            <Badge data-testid="ui-badge-success" tone="success">
              Success
            </Badge>
            <Badge data-testid="ui-badge-warning" tone="warning">
              Warning
            </Badge>
            <Badge data-testid="ui-badge-danger" tone="danger">
              Danger
            </Badge>
          </div>
        </Card>

        <Card data-testid="ui-card" className="flex flex-col gap-3" padded>
          <div className="text-sm font-semibold">Inputs</div>
          <div className="flex flex-col gap-2 max-w-sm">
            <Input
              data-testid="ui-input"
              value={text}
              onChange={(e) => setText(e.currentTarget.value)}
              placeholder="Type something"
            />
            <Input data-testid="ui-input-invalid" value="Invalid" invalid readOnly />
            <Select
              data-testid="ui-select"
              value={choice}
              onChange={(e) => setChoice(e.currentTarget.value)}
            >
              <option value="alpha">alpha</option>
              <option value="beta">beta</option>
            </Select>
          </div>
        </Card>
      </div>
    </div>
  );
}
