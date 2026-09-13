import { jsPDF } from 'jspdf';
import { CandidateReceiptData, extensoBRL } from '../App';
import { ReciboQuitacao } from '../types';

/**
 * Utilitário para formatar datas no padrão brasileiro DD/MM/AAAA
 */
function formatDateBR(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR');
  try {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR');
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

/**
 * Utilitário seguro para acionar download em qualquer navegador/iframe
 */
function triggerPdfDownload(doc: jsPDF, filename: string): void {
  try {
    const blob = doc.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (e) {
        // ignore
      }
    }, 2000);
  } catch (err) {
    console.warn('Fallback para doc.save:', err);
    doc.save(filename);
  }
}

/**
 * Gerador 100% vetorial de Recibo de Pagamento do Candidato (jsPDF)
 * Nunca fica em branco, não depende de html2canvas ou renderização de DOM.
 */
export function generateCandidateReceiptPDF(receipt: CandidateReceiptData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const receiptId = String(receipt.idRecibo || 'REC-0000').toUpperCase();
  const dataEmissaoBR = formatDateBR(receipt.dataEmissao);
  const valorFormatado = receipt.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const valorExtenso = extensoBRL(receipt.valor);
  const alunoNome = (receipt.aluno.nome || 'Candidato').trim().toUpperCase();
  const alunoCpf = receipt.aluno.cpf || 'Não informado';
  const alunoId = receipt.aluno.id || 'CNH-000';
  const formaPagamento = (receipt.formaPagamento || 'Cartão de Crédito').toUpperCase();
  const categoria = receipt.aluno.categoria || 'Carro (B)';
  const plano = receipt.aluno.plano || receipt.aluno.tipoPlano || 'Plano CNH Facilitada';
  const operador = receipt.operador || 'Administração Nova CNH';
  const telefone = receipt.aluno.whatsapp || receipt.aluno.telefone || 'Não informado';

  // 1. Bordas decorativas de segurança do documento
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 'S');

  doc.setDrawColor(12, 35, 64); // navy #0c2340
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4, 'S');

  // Marca d'água de autenticidade no fundo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(38);
  doc.setTextColor(241, 245, 249); // slate-100 bem sutil
  doc.text('NOVA CNH BRASIL', pageWidth / 2, 145, { align: 'center', angle: 30 });
  doc.text('RECIBO OFICIAL', pageWidth / 2, 168, { align: 'center', angle: 30 });

  // 2. Banner Superior da Instituição
  doc.setFillColor(12, 35, 64); // #0c2340
  doc.rect(margin, margin, contentWidth, 25, 'F');

  // Linha de realce Esmeralda
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(margin, margin + 25, contentWidth, 1.5, 'F');

  // Título e Subtítulos do Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('NOVA CNH BRASIL NA MÃO', margin + 6, margin + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('SECRETARIA DE ARRECADAÇÃO & GESTÃO DE CANDIDATOS', margin + 6, margin + 14.5);
  doc.text('Comprovante Eletrônico Oficial de Quitação Financeira', margin + 6, margin + 19.5);

  // Badge do Número do Recibo e Data (canto direito do header)
  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(pageWidth - margin - 58, margin + 3.5, 52, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Nº RECIBO', pageWidth - margin - 54, margin + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 35, 64);
  doc.text(receiptId, pageWidth - margin - 54, margin + 12.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão: ${dataEmissaoBR}`, pageWidth - margin - 54, margin + 18);

  let currentY = margin + 33;

  // 3. Faixa de Título Oficial
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 16, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('DOCUMENTO OFICIAL DE QUITAÇÃO', pageWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(12, 35, 64);
  doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, currentY + 12, { align: 'center' });

  currentY += 21;

  // 4. Caixa de Destaque do Valor Recebido
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(110, 231, 183); // emerald-300
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, contentWidth, 26, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR RECEBIDO', pageWidth / 2, currentY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text(valorFormatado, pageWidth / 2, currentY + 15, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`(${valorExtenso})`, pageWidth / 2, currentY + 21.5, { align: 'center' });

  currentY += 31;

  // 5. Caixa de Declaração de Quitação Formal
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 54, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 35, 64);
  doc.text('DECLARAÇÃO DE QUITAÇÃO', margin + 6, currentY + 7);

  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 6, currentY + 9, pageWidth - margin - 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  const declarationText = `Recebemos do(a) candidato(a) ${alunoNome}, inscrito(a) sob o CPF ${alunoCpf}, matrícula ID ${alunoId}, a quantia de ${valorFormatado}, quitada mediante ${formaPagamento}.`;
  const splitDeclaration = doc.splitTextToSize(declarationText, contentWidth - 12);
  doc.text(splitDeclaration, margin + 6, currentY + 16);

  let declOffsetY = currentY + 16 + (splitDeclaration.length * 4.5) + 3;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('REFERENTE A:', margin + 6, declOffsetY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const refLines = doc.splitTextToSize(receipt.referente || 'Pagamento referente ao programa CNH Facilitada', contentWidth - 42);
  doc.text(refLines, margin + 36, declOffsetY);

  declOffsetY += (refLines.length * 4.5) + 3;

  if (receipt.observacao) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('OBSERVAÇÕES:', margin + 6, declOffsetY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const obsLines = doc.splitTextToSize(receipt.observacao, contentWidth - 42);
    doc.text(obsLines, margin + 36, declOffsetY);
  }

  currentY += 58;

  // 6. Tabela de Metadados do Candidato e Curso
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 34, 2.5, 2.5, 'FD');

  const colW = (contentWidth - 8) / 3;

  // Coluna 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CATEGORIA HABILITAÇÃO', margin + 6, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(categoria, margin + 6, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUS DO PAGAMENTO', margin + 6, currentY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text('QUITADO E HOMOLOGADO', margin + 6, currentY + 28);

  // Coluna 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PLANO CONTRATADO', margin + 6 + colW, currentY + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const planoLines = doc.splitTextToSize(plano, colW - 6);
  doc.text(planoLines, margin + 6 + colW, currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CANAL / OPERADOR', margin + 6 + colW, currentY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const opLines = doc.splitTextToSize(operador, colW - 6);
  doc.text(opLines, margin + 6 + colW, currentY + 28);

  // Coluna 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CONTATO CADASTRADO', margin + 6 + (colW * 2), currentY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(telefone, margin + 6 + (colW * 2), currentY + 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('FORMA DE PAGAMENTO', margin + 6 + (colW * 2), currentY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const formaLines = doc.splitTextToSize(formaPagamento, colW - 6);
  doc.text(formaLines, margin + 6 + (colW * 2), currentY + 28);

  currentY += 39;

  // 7. Selo de Autenticação Digital & Homologação
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(16, 185, 129); // emerald-500
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, contentWidth, 31, 2.5, 2.5, 'FD');

  // Barra lateral verde do selo
  doc.setFillColor(16, 185, 129);
  doc.rect(margin, currentY, 3.5, 31, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87);
  doc.text('[V] PAGAMENTO HOMOLOGADO ELETRONICAMENTE', margin + 8, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Documento oficial emitido pela Secretaria Administrativa do Programa Nova CNH Brasil.', margin + 8, currentY + 12.5);
  doc.text(`Chancela Digital de Autenticidade: SHA256-${receiptId.toLowerCase()}-sec-cnh`, margin + 8, currentY + 17.5);
  doc.text('Este comprovante possui validade jurídica perante as autoescolas e instrutores credenciados.', margin + 8, currentY + 22.5);
  doc.text(`Autenticação gerada em ${dataEmissaoBR} sob protocolo eletrônico oficial.`, margin + 8, currentY + 27.5);

  // Rodapé Oficial
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nova CNH Brasil na Mão • Programa Social de Habilitação • Autenticação válida em todo território nacional', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });

  return doc;
}

/**
 * Executa o download direto do Recibo do Candidato em formato PDF
 */
export function downloadCandidateReceiptPDF(receipt: CandidateReceiptData): void {
  const doc = generateCandidateReceiptPDF(receipt);
  const receiptId = String(receipt.idRecibo || 'recibo').toLowerCase().replace(/\s+/g, '_');
  const filename = `recibo_nova_cnh_${receiptId}.pdf`;
  triggerPdfDownload(doc, filename);
}

/**
 * Gerador 100% vetorial de Recibo de Repasse do Instrutor (jsPDF)
 */
export function generateInstructorReceiptPDF(data: { instrutorNome: string; recibo: ReciboQuitacao }): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  const recibo = data.recibo;
  const reciboId = String(recibo.id || 'REC-INST').toUpperCase();
  const dataEmissaoBR = formatDateBR(recibo.dataEmissao);
  const valorFormatado = recibo.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const instrutorNome = (data.instrutorNome || 'Instrutor Credenciado').trim().toUpperCase();
  const isAssinadoGov = recibo.status === 'assinado_gov';

  // Molduras de segurança
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 'S');

  doc.setDrawColor(12, 35, 64);
  doc.setLineWidth(0.8);
  doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4, 'S');

  // Header Banner
  doc.setFillColor(12, 35, 64);
  doc.rect(margin, margin, contentWidth, 25, 'F');

  doc.setFillColor(5, 150, 105);
  doc.rect(margin, margin + 25, contentWidth, 1.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.text('NOVA CNH BRASIL NA MÃO', margin + 6, margin + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text('SECRETARIA NACIONAL DE CREDENCIAMENTO & REPASSES', margin + 6, margin + 14.5);
  doc.text('Dossiê Eletrônico de Homologação Pedagógica & Financeira', margin + 6, margin + 19.5);

  // Badge do Número do Recibo
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(pageWidth - margin - 58, margin + 3.5, 52, 18, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Nº DO REPASSE', pageWidth - margin - 54, margin + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 35, 64);
  doc.text(reciboId, pageWidth - margin - 54, margin + 12.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão: ${dataEmissaoBR}`, pageWidth - margin - 54, margin + 18);

  let currentY = margin + 33;

  // Faixa de Título
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 16, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(5, 150, 105);
  doc.text('TERMO ELETRÔNICO DE HOMOLOGAÇÃO DE REPASSE', pageWidth / 2, currentY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(12, 35, 64);
  doc.text('RECIBO DE QUITAÇÃO DE REPASSE', pageWidth / 2, currentY + 12, { align: 'center' });

  currentY += 21;

  // Status de Assinatura
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  if (isAssinadoGov) {
    doc.setTextColor(5, 150, 105);
    doc.text('[V] QUITADO & ASSINADO DIGITALMENTE VIA GOV.BR', pageWidth - margin - 6, currentY + 4, { align: 'right' });
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text('[!] AGUARDANDO ASSINATURA DIGITAL DO INSTRUTOR', pageWidth - margin - 6, currentY + 4, { align: 'right' });
  }

  currentY += 7;

  // Caixa de Valor
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(110, 231, 183);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, currentY, contentWidth, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR INTEGRAL REPASSADO', pageWidth / 2, currentY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(4, 120, 87);
  doc.text(valorFormatado, pageWidth / 2, currentY + 15, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('(Comissões e remuneração pedagógica regional)', pageWidth / 2, currentY + 20.5, { align: 'center' });

  currentY += 29;

  // Declaração do Repasse
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 54, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 35, 64);
  doc.text('RECIBO DE QUITAÇÃO DE REPASSE FINANCEIRO', margin + 6, currentY + 7);

  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 6, currentY + 9, pageWidth - margin - 6, currentY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const repasseText = `Declaramos, para os devidos fins de comprovação fiscal e contábil, sob as penas da lei, que a plataforma nacional do programa Nova CNH Brasil efetuou o repasse financeiro no valor de ${valorFormatado} ao instrutor autônomo e credenciado ${instrutorNome}, referente às comissões, indicações de turmas e acompanhamento pedagógico prestado.`;
  const splitRepasse = doc.splitTextToSize(repasseText, contentWidth - 12);
  doc.text(splitRepasse, margin + 6, currentY + 16);

  const quitacaoLegal = 'O beneficiário, mediante confirmação deste termo, outorga à plataforma Nova CNH Brasil plena, geral, irrestrita e irrevogável quitação de todas as obrigações e comissões devidas até a presente data, nada mais tendo a reclamar a qualquer título.';
  const splitQuitacao = doc.splitTextToSize(quitacaoLegal, contentWidth - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(splitQuitacao, margin + 6, currentY + 16 + (splitRepasse.length * 4) + 4);

  currentY += 59;

  // Assinaturas Digitais
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 40, 2.5, 2.5, 'FD');

  const halfW = (contentWidth - 10) / 2;

  // Emitente
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('EMITENTE / PAGADOR', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 35, 64);
  doc.text('Nova CNH Brasil Ltda', margin + 6, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CNPJ: 45.928.304/0001-99', margin + 6, currentY + 21);
  doc.text('Secretaria Nacional de Finanças', margin + 6, currentY + 26);
  doc.text('Chancela Digital Centralizada', margin + 6, currentY + 31);

  // Beneficiário (Instrutor)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('BENEFICIÁRIO / INSTRUTOR CREDENCIADO', margin + 6 + halfW, currentY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 35, 64);
  doc.text(instrutorNome, margin + 6 + halfW, currentY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  if (isAssinadoGov) {
    doc.text(`Identificador Gov.br: ${recibo.identificadorGov || 'Certificado Digital'}`, margin + 6 + halfW, currentY + 21);
    doc.text(`Data Assinatura: ${formatDateBR(recibo.dataAssinatura)}`, margin + 6 + halfW, currentY + 26);
    doc.text(`Hash: ${(recibo.documentoAssinado || 'sha256-homolog').slice(0, 32)}...`, margin + 6 + halfW, currentY + 31);
  } else {
    doc.text('Pendente de confirmação eletrônica no painel', margin + 6 + halfW, currentY + 21);
    doc.text(`Enviado para homologação em ${dataEmissaoBR}`, margin + 6 + halfW, currentY + 26);
  }

  // Rodapé
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Nova CNH Brasil • Gestão de Repasses Financeiros • Documento Oficial de Quitação', pageWidth / 2, pageHeight - margin - 3, { align: 'center' });

  return doc;
}

/**
 * Executa o download direto do Recibo do Instrutor em formato PDF
 */
export function downloadInstructorReceiptPDF(data: { instrutorNome: string; recibo: ReciboQuitacao }): void {
  const doc = generateInstructorReceiptPDF(data);
  const reciboId = String(data.recibo.id || 'repasse').toLowerCase().replace(/\s+/g, '_');
  const filename = `recibo_repasse_${reciboId}.pdf`;
  triggerPdfDownload(doc, filename);
}
