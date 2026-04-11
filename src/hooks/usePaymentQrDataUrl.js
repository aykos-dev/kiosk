import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const QR_PIXEL_SIZE = 228;

/**
 * Renders a scannable QR bitmap with high error correction for a center logo overlay.
 * @param {string} value - URL or any UTF-8 string to encode
 */
export function usePaymentQrDataUrl(value) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const text = typeof value === 'string' && value.trim() ? value.trim() : 'https://bellissimo.uz';
    let cancelled = false;

    QRCode.toDataURL(text, {
      width: QR_PIXEL_SIZE,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#161616', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDataUrl('');
          setError(e);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  return { dataUrl, error, size: QR_PIXEL_SIZE };
}
