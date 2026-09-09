export type ActiveRun = {
  sessionId: string;
  abortController: AbortController;
};

export type RunRegistry = {
  register: (sessionId: string, controller: AbortController) => void;
  get: (sessionId: string) => ActiveRun | undefined;
  unregister: (sessionId: string) => void;
  abort: (sessionId: string) => boolean;
};

export function createRunRegistry(): RunRegistry {
  const runs = new Map<string, ActiveRun>();
  return {
    register(sessionId, abortController) {
      runs.set(sessionId, { sessionId, abortController });
    },
    get(sessionId) {
      return runs.get(sessionId);
    },
    unregister(sessionId) {
      runs.delete(sessionId);
    },
    abort(sessionId) {
      const run = runs.get(sessionId);
      if (!run) {
        return false;
      }
      run.abortController.abort();
      return true;
    },
  };
}
