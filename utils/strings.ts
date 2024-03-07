// take in a date, and return as x time ago
export const timeAgo = (date: number) => {
  const now = new Date().getTime();
  const time = now - date;

  if (time < 60000) {
    return 'Just now';
  } else if (time < 3600000) {
    return `${Math.floor(time / 60000)}m ago`;
  } else if (time < 86400000) {
    return `${Math.floor(time / 3600000)}h ago`;
  } else if (time < 604800000) {
    return `${Math.floor(time / 86400000)}d ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
};
