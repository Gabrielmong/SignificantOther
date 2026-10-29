import { useEffect, useState } from 'react';

import { useFirebase } from './useFirebase';

/** How many of your partner's messages arrived since you last had the chat open */
export const useUnreadCount = (roomId: string | null, uid: string | null) => {
  const { listenToUnreadCount } = useFirebase();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!roomId || !uid) {
      setCount(0);
      return;
    }

    return listenToUnreadCount(roomId, uid, setCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, uid]);

  return count;
};
