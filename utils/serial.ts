/**
 * Runs async jobs one at a time, and tells older jobs when a newer one has
 * been queued so they can stop early. The latest job always runs last.
 */
export const createLatestRunner = () => {
  let generation = 0;
  let queue: Promise<void> = Promise.resolve();

  return (job: (isCurrent: () => boolean) => Promise<void>): Promise<void> => {
    const mine = ++generation;
    const isCurrent = () => mine === generation;
    queue = queue
      .then(() => job(isCurrent))
      .catch((error) => console.error('Serial job failed:', error));
    return queue;
  };
};
