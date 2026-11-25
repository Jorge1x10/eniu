/**
 * Imprime una página HTML con el diálogo de impresión del navegador, desde un
 * iframe oculto: sin ventanas emergentes (que se bloquean cuando la impresión
 * no la dispara un toque) y sin el panel alrededor.
 *
 * Las impresiones van en fila: dos pedidos aceptados casi a la vez no abren
 * dos diálogos encimados. Con Chrome en modo kiosco (`--kiosk-printing`) no
 * hay diálogo y la comanda sale directo a la impresora predeterminada.
 */
let queue = Promise.resolve();
const AFTER_PRINT_TIMEOUT_MS = 60000;

/**
 * El papel térmico es un rollo: la página mide lo que mide el ticket. Se
 * mide el contenido y se fija `@page` a ese alto, para que no salga una hoja
 * carta ni papel en blanco de más.
 */
function fitPageToContent(doc) {
  const width = Number(doc.body?.dataset?.paperMm);
  if (!width) return;
  const heightMm = Math.ceil((doc.documentElement.scrollHeight * 25.4) / 96) + 4;
  const style = doc.createElement("style");
  style.textContent = `@page { size: ${width}mm ${heightMm}mm; margin: 0; }`;
  doc.head.appendChild(style);
}

function printOnce(html) {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    frame.title = "comanda";
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", visibility: "hidden" });
    document.body.appendChild(frame);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.setTimeout(() => frame.remove(), 500);
      resolve();
    };
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    const target = frame.contentWindow;
    target.addEventListener("afterprint", finish);
    window.setTimeout(finish, AFTER_PRINT_TIMEOUT_MS);
    // Un instante para que el iframe aplique estilos antes de imprimir.
    window.setTimeout(() => {
      try {
        fitPageToContent(doc);
        target.focus();
        target.print();
      } catch {
        finish();
        return;
      }
      // Navegadores sin `afterprint` en iframes: `print()` bloquea hasta cerrar el diálogo.
      window.setTimeout(finish, 1000);
    }, 50);
  });
}

export function printHtml(html) {
  queue = queue.then(() => printOnce(html));
  return queue;
}

/** Imprime la comanda de un pedido con el papel elegido en este dispositivo. */
export async function printOrderTicket({ order, table, businessName, reprint = false }) {
  const [{ buildTicketHtml }, { loadPrintSettings }] = await Promise.all([import("./ticket"), import("./printSettings")]);
  return printHtml(buildTicketHtml({ order, table, businessName, paper: loadPrintSettings().paper, reprint }));
}
