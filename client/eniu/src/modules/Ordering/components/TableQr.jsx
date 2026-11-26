import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/** El QR de una mesa, dibujado en el navegador. */
export default function TableQr({ url, size = 132, label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, { width: size, margin: 1 }).catch(() => {});
  }, [size, url]);

  return <canvas ref={canvasRef} role="img" aria-label={label} width={size} height={size} className="rounded-lg bg-white" />;
}
