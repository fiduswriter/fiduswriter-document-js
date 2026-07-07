/**
 * Optional callback that exporters can invoke to report progress back to the
 * caller. The caller is responsible for driving any UI (for example a
 * `ProgressTask` in the main Fidus Writer app). Non-UI callers such as the
 * CLI can simply omit the callback.
 */
export type ProgressCallback = (
    message: string,
    percentage?: number | null
) => void
