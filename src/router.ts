import { useEffect, useState } from 'react';

/**
 * Tiny hash router: `#/help/lyrics` → ['help', 'lyrics']. Hash routes work on any static host
 * without server configuration.
 */
export function useRoute(): string[] {
  const read = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const href = (path: string) => `#/${path.replace(/^\//, '')}`;

export function navigate(path: string) {
  window.location.hash = href(path);
}
