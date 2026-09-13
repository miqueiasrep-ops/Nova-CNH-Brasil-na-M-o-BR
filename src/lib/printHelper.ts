/**
 * Utilitário de impressão de alta fidelidade para o navegador.
 * Evita o problema crítico de Chromium onde iframes com width: 0 / height: 0
 * causam colapso do layout gerando páginas em branco no diálogo de impressão/salvar como PDF.
 */

export function printHtmlElement(elementId: string, docTitle: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) return false;

  // Clona e coleta todas as tags de estilo e links de stylesheet do documento pai
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(el => el.outerHTML)
    .join('\n');

  // Cria um iframe com dimensões reais fora da visão para garantir que o mecanismo
  // de layout do Chromium (Blink) e WebKit calcule larguras e alturas corretamente
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '960px'; // Dimensão real crítica para evitar colapso de viewport
  iframe.style.height = '1200px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    try {
      iframe.remove();
    } catch (e) {}
    return false;
  }

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  ${headStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .print-wrapper {
      width: 100% !important;
      max-width: 820px !important;
      margin: 0 auto !important;
      padding: 20px !important;
      background: #ffffff !important;
    }
    @media print {
      body {
        padding: 0 !important;
      }
      .print-wrapper {
        padding: 4mm !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${element.innerHTML}
  </div>
</body>
</html>`);
  iframeDoc.close();

  // Aguarda layout e fontes serem renderizados
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Falha no print do iframe:', err);
    }
    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {}
    }, 15000);
  }, 450);

  return true;
}
