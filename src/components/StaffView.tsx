import { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

/** Renders MusicXML as staff notation. Re-renders (debounced) when the XML changes. */
export function StaffView({ xml }: { xml: string }) {
  const box = useRef<HTMLDivElement>(null);
  const osmd = useRef<OpenSheetMusicDisplay | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!box.current) return;
    osmd.current = new OpenSheetMusicDisplay(box.current, {
      autoResize: true,
      autoBeam: true,
      drawTitle: true,
      drawComposer: true,
      drawPartNames: true,
      drawingParameters: 'compacttight',
    });
    return () => { osmd.current?.clear(); osmd.current = null; };
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const o = osmd.current;
      if (!o) return;
      try {
        await o.load(xml);
        o.render();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }, 350);
    return () => window.clearTimeout(handle);
  }, [xml]);

  return (
    <div className="staff-view">
      {error && <p className="staff-error">Staff notation could not be drawn: {error}</p>}
      <div ref={box} />
    </div>
  );
}
