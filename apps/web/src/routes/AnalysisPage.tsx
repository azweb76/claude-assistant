import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Stack, Typography } from '@mui/material';
import { api } from '../api/endpoints.js';
import { EmptyState, ErrorState, LoadingState } from '../components/common/StateViews.js';
import { ImprovementCard } from '../components/analysis/ImprovementCard.js';

type AnalysisDetail = Awaited<ReturnType<typeof api.getAnalysis>>;

export function AnalysisPage() {
  const location = useLocation();
  const sessionIds = useMemo(
    () => (location.state as { sessionIds?: string[] } | null)?.sessionIds ?? [],
    [location.state],
  );
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionIdsKey = sessionIds.join(',');

  useEffect(() => {
    if (sessionIds.length === 0) return;
    setLoading(true);
    void api
      .createAnalysis(sessionIds)
      .then(async (created) => {
        for (let i = 0; i < 40; i += 1) {
          const detail = await api.getAnalysis(created.id);
          setAnalysis(detail);
          if (detail.status === 'succeeded' || detail.status === 'failed') {
            return;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Analysis failed'))
      .finally(() => setLoading(false));
  }, [sessionIdsKey, sessionIds]);

  if (error) return <ErrorState message={error} />;
  if (sessionIds.length === 0 && !analysis) {
    return (
      <EmptyState
        title="No analysis selected"
        description="Select sessions on the Sessions page and click Analyze selected."
      />
    );
  }
  if (loading && !analysis) return <LoadingState label="Running analysis…" />;
  if (!analysis) return <LoadingState />;

  const improvements = analysis.improvements ?? [];

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Analysis</Typography>
      <Typography>Status: {analysis.status}</Typography>
      <Typography color="text.secondary">{analysis.summary ?? 'Working…'}</Typography>
      {improvements.length === 0 && analysis.status === 'succeeded' ? (
        <EmptyState
          title="No improvements staged"
          description="The review found nothing to change."
        />
      ) : (
        improvements.map((item) => (
          <ImprovementCard
            key={item.id}
            item={item}
            onApply={async () => {
              const updated = await api.applyImprovement(item.id);
              setAnalysis((prev) =>
                prev
                  ? {
                      ...prev,
                      improvements: (prev.improvements ?? []).map((i) =>
                        i.id === updated.id ? updated : i,
                      ),
                    }
                  : prev,
              );
            }}
            onDiscard={async () => {
              const updated = await api.discardImprovement(item.id);
              setAnalysis((prev) =>
                prev
                  ? {
                      ...prev,
                      improvements: (prev.improvements ?? []).map((i) =>
                        i.id === updated.id ? updated : i,
                      ),
                    }
                  : prev,
              );
            }}
          />
        ))
      )}
      <Button onClick={() => window.location.assign('/sessions')}>Back to sessions</Button>
    </Stack>
  );
}
