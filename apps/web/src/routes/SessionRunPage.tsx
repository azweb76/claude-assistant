import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Button, Link, Stack, Typography } from '@mui/material';
import { api } from '../api/endpoints.js';
import { useEventStream } from '../api/useEventStream.js';
import { ErrorState, LoadingState } from '../components/common/StateViews.js';
import { RunControls } from '../components/sessions/RunControls.js';
import { Transcript, UsageMeter } from '../components/sessions/Transcript.js';

export function SessionRunPage() {
  const { id = '' } = useParams();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof api.getSession>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stream = useEventStream(id ? `/api/sessions/${id}/stream` : null);

  useEffect(() => {
    if (!id) return;
    void api
      .getSession(id)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Load failed'));
  }, [id, stream.done]);

  const liveMessages = useMemo(
    () =>
      stream.events
        .filter((e) => e.type === 'message')
        .map((e) => ({
          type: e.data.messageType,
          subtype: e.data.subtype,
          payload: e.data.payload,
          seq: e.data.seq,
        })),
    [stream.events],
  );

  const usageEvent = [...stream.events].reverse().find((e) => e.type === 'usage');

  if (error) return <ErrorState message={error} />;
  if (!detail) return <LoadingState label="Loading session…" />;

  const messages = liveMessages.length ? liveMessages : (detail.messages as never[]);
  const running = (stream.status ?? detail.status) === 'running';

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Session</Typography>
        <Button component={RouterLink} to="/sessions">
          All sessions
        </Button>
      </Stack>
      <Typography>Status: {stream.status ?? detail.status}</Typography>
      <UsageMeter
        inputTokens={
          usageEvent?.type === 'usage' ? usageEvent.data.inputTokens : detail.inputTokens
        }
        outputTokens={
          usageEvent?.type === 'usage' ? usageEvent.data.outputTokens : detail.outputTokens
        }
        totalCostUsd={
          usageEvent?.type === 'usage' ? usageEvent.data.totalCostUsd : detail.totalCostUsd
        }
        numTurns={usageEvent?.type === 'usage' ? usageEvent.data.numTurns : detail.numTurns}
      />
      {detail.prUrl ? (
        <Link href={detail.prUrl} target="_blank" rel="noreferrer">
          Open pull request
        </Link>
      ) : null}
      <RunControls
        running={running}
        onCancel={() => void api.cancelSession(id).then(() => api.getSession(id).then(setDetail))}
        onFollowUp={(prompt) =>
          void api.followUpSession(id, prompt).then(() => api.getSession(id).then(setDetail))
        }
      />
      <Transcript messages={messages} />
    </Stack>
  );
}
