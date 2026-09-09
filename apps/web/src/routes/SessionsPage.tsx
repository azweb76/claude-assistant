import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { api } from '../api/endpoints.js';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews.js';

type Session = Awaited<ReturnType<typeof api.listSessions>>[number];

export function SessionsPage() {
  const [items, setItems] = useState<Session[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void api
      .listSessions()
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;
  if (items.length === 0) {
    return <EmptyState title="No sessions yet" description="Start a session from New session." />;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Sessions</Typography>
        <Button
          variant="contained"
          disabled={selected.length === 0}
          aria-label="Analyze selected sessions"
          onClick={() => navigate('/analysis', { state: { sessionIds: selected } })}
        >
          Analyze selected
        </Button>
      </Stack>
      <Table size="small" aria-label="Sessions table">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" />
            <TableCell>Status</TableCell>
            <TableCell>Prompt</TableCell>
            <TableCell>Cost</TableCell>
            <TableCell>PR</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selected.includes(s.id)}
                  slotProps={{ input: { 'aria-label': `Select session ${s.id}` } }}
                  onChange={(e) => {
                    setSelected((prev) =>
                      e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                    );
                  }}
                />
              </TableCell>
              <TableCell>
                <Link component={RouterLink} to={`/sessions/${s.id}`}>
                  {s.status}
                </Link>
              </TableCell>
              <TableCell>{s.prompt.slice(0, 80)}</TableCell>
              <TableCell>${(s.totalCostUsd ?? 0).toFixed(4)}</TableCell>
              <TableCell>
                {s.prUrl ? (
                  <Link href={s.prUrl} target="_blank" rel="noreferrer">
                    PR
                  </Link>
                ) : (
                  '—'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Stack>
  );
}
