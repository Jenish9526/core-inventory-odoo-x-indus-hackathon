import { useEffect, useRef } from 'react';

/**
 * useBarcode — initializes Quagga barcode scanner on a container ref.
 * onDetected(code) is called when a barcode is successfully decoded.
 */
const useBarcode = (onDetected, active = false) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    let Quagga;
    const init = async () => {
      try {
        Quagga = (await import('quagga')).default;
        Quagga.init({
          inputStream: {
            type: 'LiveStream',
            target: containerRef.current,
            constraints: { facingMode: 'environment', width: 640, height: 480 },
          },
          decoder: { readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'upc_reader'] },
          locate: true,
        }, (err) => {
          if (err) { console.warn('Quagga init error:', err); return; }
          Quagga.start();
        });

        let lastCode = null;
        let lastTs = 0;
        Quagga.onDetected((result) => {
          const code = result.codeResult.code;
          const now = Date.now();
          // Debounce — same code within 1.5s ignored
          if (code === lastCode && now - lastTs < 1500) return;
          lastCode = code;
          lastTs = now;
          onDetected(code);
        });
      } catch (e) {
        console.warn('Quagga not available:', e);
      }
    };

    init();

    return () => {
      if (Quagga) {
        try { Quagga.stop(); } catch {}
      }
    };
  }, [active, onDetected]);

  return containerRef;
};

export default useBarcode;
