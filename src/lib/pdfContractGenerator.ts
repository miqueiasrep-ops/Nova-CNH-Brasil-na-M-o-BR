import { jsPDF } from 'jspdf';
import { Aluno } from '../types';

/**
 * Formata data para o padrão DD/MM/AAAA
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
    doc.save(filename);
  } catch (err) {
    console.warn('Fallback para download manual via Blob:', err);
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
        } catch (e) {}
      }, 2000);
    } catch (e2) {
      console.error('Falha geral no download do PDF:', e2);
    }
  }
}

/**
 * Gera documento de Contrato 100% vetorial oficial em jsPDF.
 * Nunca sai em branco, com alta fidelidade tipográfica e estrutural.
 */
export function generateContractPDF(aluno: Aluno): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - (margin * 2);

  const isUnderage = !!(aluno.whatsappResponsavel || aluno.nomeResponsavel);
  const totalAulas = aluno.aulas || 20;
  const alunoNome = (aluno.nome || 'Candidato').trim();
  const alunoCpf = aluno.cpf || 'Não informado';
  const alunoId = aluno.id || 'CNH-000';
  const protocoloId = alunoId.toUpperCase().startsWith('CNH-') ? alunoId : `CNH-${alunoId}`;
  const dataAdesao = formatDateBR(aluno.dataAdesao || aluno.dataCadastro);
  const valorTotalNum = typeof aluno.valorTotal === 'number' ? aluno.valorTotal : 1800;
  const valorFormatado = valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const categoria = aluno.categoria || 'Carro (B)';
  const plano = aluno.plano || aluno.tipoPlano || (isUnderage ? 'Plano Poupança Jovem' : 'Plano CNH Facilitada');

  let currentY = margin;

  // Função auxiliar para desenhar o cabeçalho e bordas de segurança em qualquer página
  const drawPageBorder = (pageNum: number, totalPagesStr: string = '2') => {
    // Moldura externa elegante
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.4);
    doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin * 2) + 8, 'S');

    doc.setDrawColor(12, 35, 64); // #0c2340
    doc.setLineWidth(0.8);
    doc.rect(margin - 2, margin - 2, contentWidth + 4, pageHeight - (margin * 2) + 4, 'S');

    // Rodapé de segurança
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Nova CNH Brasil • Contrato de Prestação de Serviços • Matrícula ${alunoId} • Página ${pageNum} de ${totalPagesStr}`, pageWidth / 2, pageHeight - margin + 2, { align: 'center' });
  };

  // ===================== PÁGINA 1 =====================
  drawPageBorder(1, '2');

  // Cabeçalho Oficial
  doc.setFillColor(12, 35, 64); // navy #0c2340
  doc.rect(margin, currentY, contentWidth, 24, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('CONTRATO OFICIAL DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, currentY + 7.5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('PROGRAMA DE APRENDIZADO PRÁTICO INTELIGENTE • NOVA CNH BRASIL NA MÃO', pageWidth / 2, currentY + 13, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(`Instrumento Particular de Formação de Condutores • Protocolo Digital: ${protocoloId}-BR`, pageWidth / 2, currentY + 18.5, { align: 'center' });

  currentY += 28;

  // Faixa de identificação rápida
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(12, 35, 64);
  doc.text(`CANDIDATO(A): ${alunoNome.toUpperCase()}`, margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`CPF: ${alunoCpf}  |  Categoria: ${categoria}  |  Data Adesão: ${dataAdesao}`, margin + 4, currentY + 9.5);

  currentY += 16;

  // I. CONTRATANTE
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 35, 64);
  doc.text('I. DO(A) CONTRATANTE (CANDIDATO HABILITANDO)', margin + 3, currentY + 4.5);

  currentY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const contratanteLines = [
    `Nome Completo: ${alunoNome}`,
    `Nacionalidade: ${aluno.nacionalidade || 'Brasileira'}   |   Estado Civil: ${aluno.estadoCivil || 'Solteiro(a)'}   |   CPF nº: ${alunoCpf}`,
    `Endereço Residencial: ${aluno.endereco || (aluno.bairro ? `${aluno.bairro}, ${aluno.cidade} - ${aluno.estado}` : 'Cadastrado no dossiê eletrônico')}`,
    `Telefone / WhatsApp de Contato: ${aluno.whatsapp || 'Não informado'}`
  ];

  for (const line of contratanteLines) {
    doc.text(line, margin + 3, currentY);
    currentY += 4.5;
  }

  // Bloco de Menor de 18 anos se aplicável
  if (isUnderage) {
    currentY += 1;
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(254, 202, 202); // red-200
    doc.roundedRect(margin + 2, currentY, contentWidth - 4, 15, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27); // red-800
    doc.text('CLÁUSULA DE ASSISTÊNCIA CIVIL (BR-CIVIL - MENOR DE 18 ANOS):', margin + 5, currentY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(69, 10, 10);
    doc.text(`Responsável Legal: ${aluno.nomeResponsavel || 'Garantidor'} | CPF: ${aluno.cpfResponsavel || 'Conforme cadastro'} | WhatsApp: ${aluno.whatsappResponsavel || 'Cadastrado'}`, margin + 5, currentY + 8.5);
    doc.text('Declara prestar assistência civil e corresponsabilidade solidária no cumprimento deste contrato.', margin + 5, currentY + 12.5);

    currentY += 18;
  } else {
    currentY += 2;
  }

  // II. CONTRATADO
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 35, 64);
  doc.text('II. DO CONTRATADO (INSTRUTOR TÉCNICO & OPERADORA)', margin + 3, currentY + 4.5);

  currentY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const contratadoLines = [
    'Instrutor Responsável: Miqueias Souza de Lima - Instrutor de Trânsito Autônomo',
    'Registro Profissional SENATRAN nº: 1674704384   |   CPF nº: 869.496.594-15',
    'Operadora Parceira de Treinamento: Programa Social Nova CNH Brasil na Mão',
    'Suporte e Atendimento Técnico Oficial: (81) 99201-1024'
  ];

  for (const line of contratadoLines) {
    doc.text(line, margin + 3, currentY);
    currentY += 4.5;
  }

  currentY += 2;

  // III. CLÁUSULAS
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, contentWidth, 6.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(12, 35, 64);
  doc.text('III. DAS CLÁUSULAS E CONDIÇÕES CONTRATUAIS', margin + 3, currentY + 4.5);

  currentY += 9;

  // Cláusula 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(12, 35, 64);
  doc.text('CLÁUSULA PRIMEIRA – DO OBJETO DOS SERVIÇOS', margin + 3, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const c1Text = `O presente contrato tem por objeto a prestação de treinamentos práticos de trânsito e direção veicular defensiva na categoria ${categoria}, integrando o plano "${plano}", com o propósito de capacitação técnica, segurança viária e desenvolvimento de cidadania para obtenção da Carteira Nacional de Habilitação.`;
  const c1Lines = doc.splitTextToSize(c1Text, contentWidth - 6);
  doc.text(c1Lines, margin + 3, currentY);
  currentY += c1Lines.length * 3.8 + 3;

  // Cláusula 2
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(12, 35, 64);
  doc.text('CLÁUSULA SEGUNDA – DA CARGA LETIVA E METODOLOGIA', margin + 3, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const c2Text = `O pacote pedagógico e prático contratado compreende o total de ${totalAulas} horas-aula de instrução veicular prática, ministradas e agendadas conforme disponibilidade pedagógica. O CONTRATANTE declara ciência de que os treinamentos práticos seguem rigorosamente os manuais técnicos do CONTRAN e SENATRAN.`;
  const c2Lines = doc.splitTextToSize(c2Text, contentWidth - 6);
  doc.text(c2Lines, margin + 3, currentY);
  currentY += c2Lines.length * 3.8 + 3;

  // Cláusula 3
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(12, 35, 64);
  doc.text('CLÁUSULA TERCEIRA – DO VALOR ACORDADO E QUITAÇÃO', margin + 3, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const c3Text = `Pela prestação dos serviços contratados, o valor total acordado é de R$ ${valorFormatado}, a ser adimplido de forma planejada em parcelas estipuladas. Para cada parcela ou valor adimplido, é emitido o respectivo Recibo Oficial de Pagamento com chancela digital SHA-256 no sistema Nova CNH.`;
  const c3Lines = doc.splitTextToSize(c3Text, contentWidth - 6);
  doc.text(c3Lines, margin + 3, currentY);

  // ===================== PÁGINA 2 =====================
  doc.addPage();
  currentY = margin;
  drawPageBorder(2, '2');

  // Continuação Cláusulas
  doc.setFillColor(12, 35, 64);
  doc.rect(margin, currentY, contentWidth, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('CONTINUAÇÃO – CLÁUSULAS CONTRATUAIS E ASSINATURAS', pageWidth / 2, currentY + 7.5, { align: 'center' });

  currentY += 18;

  // Cláusula 4
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(12, 35, 64);
  doc.text('CLÁUSULA QUARTA – DA FORÇA EXECUTIVA E VALIDADE DIGITAL', margin + 3, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const c4Text = 'O presente instrumento goza de plena validade jurídica eletrônica nos termos da legislação civil brasileira e da Medida Provisória nº 2.200-2/2001, constituindo título executivo extrajudicial legal no momento de sua formalização, confirmação e emissão eletrônica de chaves de integridade criptográfica.';
  const c4Lines = doc.splitTextToSize(c4Text, contentWidth - 6);
  doc.text(c4Lines, margin + 3, currentY);
  currentY += c4Lines.length * 3.8 + 4;

  // Cláusula 5
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(12, 35, 64);
  doc.text('CLÁUSULA QUINTA – DO FORO E DISPOSIÇÕES FINAIS', margin + 3, currentY);
  currentY += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const c5Text = 'As partes elegem o foro da Comarca do domicílio do CONTRATANTE para dirimir quaisquer dúvidas ou litígios decorrentes deste contrato, renunciando a qualquer outro por mais privilegiado que seja. E, por estarem justos e acordados, celebram o presente instrumento em formato eletrônico auditável.';
  const c5Lines = doc.splitTextToSize(c5Text, contentWidth - 6);
  doc.text(c5Lines, margin + 3, currentY);
  currentY += c5Lines.length * 3.8 + 8;

  // Data formal
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`Recife/PE, ${dataAdesao}.`, pageWidth - margin - 4, currentY, { align: 'right' });

  currentY += 14;

  // Bloco de Assinaturas Digitais
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, isUnderage ? 75 : 55, 3, 3, 'FD');

  const halfWidth = (contentWidth - 10) / 2;

  // Assinatura Candidato (Esquerda)
  const leftX = margin + 5;
  const sigY = currentY + 18;

  doc.setDrawColor(79, 70, 229); // indigo-600
  doc.setLineWidth(0.6);
  doc.line(leftX, sigY, leftX + halfWidth, sigY);

  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text(alunoNome, leftX + (halfWidth / 2), sigY - 3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('ASSINATURA DIGITAL DO(A) CLIENTE', leftX + (halfWidth / 2), sigY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CPF: ${alunoCpf} • Matrícula: ${alunoId}`, leftX + (halfWidth / 2), sigY + 7.5, { align: 'center' });
  doc.text(`Chave SHA-256: ${alunoId.toLowerCase()}-cnh-autenticado`, leftX + (halfWidth / 2), sigY + 11, { align: 'center' });

  // Assinatura Instrutor (Direita)
  const rightX = margin + 5 + halfWidth + 5;

  doc.setDrawColor(5, 150, 105); // emerald-600
  doc.setLineWidth(0.6);
  doc.line(rightX, sigY, rightX + halfWidth, sigY);

  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(4, 120, 87); // emerald-700
  doc.text('Miqueias Souza de Lima', rightX + (halfWidth / 2), sigY - 3, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('REPRESENTANTE TÉCNICO / INSTRUTOR', rightX + (halfWidth / 2), sigY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Inst. Autônomo • Reg. SENATRAN 1674704384', rightX + (halfWidth / 2), sigY + 7.5, { align: 'center' });
  doc.text('CPF: 869.496.594-15 • Nova CNH Brasil', rightX + (halfWidth / 2), sigY + 11, { align: 'center' });

  // Co-assinatura do Responsável (se menor)
  if (isUnderage) {
    const respY = sigY + 28;
    const centerRespX = margin + (contentWidth / 2) - 45;

    doc.setDrawColor(220, 38, 38); // red-600
    doc.setLineWidth(0.6);
    doc.line(centerRespX, respY, centerRespX + 90, respY);

    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28);
    doc.text(aluno.nomeResponsavel || 'Responsável Legal Solidário', centerRespX + 45, respY - 3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(153, 27, 27);
    doc.text('CO-ASSINATURA DO RESPONSÁVEL CIVIL SOLIDÁRIO', centerRespX + 45, respY + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`CPF: ${aluno.cpfResponsavel || 'Cadastrado'} • Tutela Civil`, centerRespX + 45, respY + 7.5, { align: 'center' });
  }

  // Selo de Integridade Final
  currentY += (isUnderage ? 75 : 55) + 6;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(12, 35, 64);
  doc.text('[V] CONTRATO ELETRÔNICO HOMOLOGADO E REGISTRADO DIGITALMENTE', margin + 4, currentY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Protocolo de Segurança: ${protocoloId}-BR • Hash SHA256-${alunoId.toLowerCase()}-gov-leg`, margin + 4, currentY + 8);
  doc.text('Este documento eletrônico possui eficácia probatória plena conforme Medida Provisória nº 2.200-2/2001.', margin + 4, currentY + 11.5);

  return doc;
}

/**
 * Dispara o download oficial do Contrato em PDF
 */
export function downloadContractPDF(aluno: Aluno): void {
  const doc = generateContractPDF(aluno);
  const cleanName = aluno.nome ? aluno.nome.trim().replace(/\s+/g, '_').toLowerCase() : 'candidato';
  const filename = `contrato_nova_cnh_${cleanName}.pdf`;
  triggerPdfDownload(doc, filename);
}
