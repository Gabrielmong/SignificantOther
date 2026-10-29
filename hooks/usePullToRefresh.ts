import { useState } from 'react';

/**
 * Pull-to-refresh state for a RefreshControl: shows the spinner until `reload`
 * finishes (or fails), so `reload` should resolve only once the data is in.
 */
export const usePullToRefresh = (reload: () => Promise<unknown>) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshing, onRefresh };
};
