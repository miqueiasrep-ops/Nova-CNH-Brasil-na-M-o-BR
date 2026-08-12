import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Award, 
  BookOpen, 
  Clock, 
  RefreshCw, 
  HelpCircle, 
  Check, 
  AlertTriangle, 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  ArrowLeft, 
  BarChart3, 
  History, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Flag, 
  GraduationCap, 
  Flame, 
  Eye,
  CheckCircle,
  TrendingUp,
  FileText,
  BookmarkCheck,
  ShieldAlert,
  Info
} from 'lucide-react';

// ================= TYPES DEFINITION =================
export type MateriaId = 'legislacao' | 'direcao' | 'socorros' | 'meioambiente' | 'mecanica';

export interface MateriaInfo {
  id: MateriaId;
  nome: string;
  descricao: string;
  emoji: string;
  corBorda: string;
  corTexto: string;
  corBg: string;
}

export interface Questao {
  id: string;
  materia: MateriaId;
  pergunta: string;
  opcoes: string[];
  correta: number; // 0 a 3 (A, B, C, D)
  explicacao: string;
}

export interface HistoricoItem {
  id: string;
  data: string;
  modo: string;
  materiaNome?: string;
  acertos: number;
  total: number;
  tempoGasto: string;
  aprovado: boolean;
}

// ================= LISTA DE MATÉRIAS =================
const MATERIAS_DETRAN: Record<MateriaId, MateriaInfo> = {
  legislacao: {
    id: 'legislacao',
    nome: 'Legislação de Trânsito',
    descricao: 'Leis, CNH, pontuação, penalidades, regras de circulação e classificação de vias.',
    emoji: '🚦',
    corBorda: 'border-amber-500/40',
    corTexto: 'text-amber-400',
    corBg: 'bg-amber-950/20'
  },
  direcao: {
    id: 'direcao',
    nome: 'Direção Defensiva',
    descricao: 'Prevenção de acidentes, física das vias, comportamento seguro e adversidades.',
    emoji: '🛡️',
    corBorda: 'border-emerald-500/40',
    corTexto: 'text-emerald-400',
    corBg: 'bg-emerald-950/20'
  },
  socorros: {
    id: 'socorros',
    nome: 'Primeiros Socorros',
    descricao: 'Sinalização, acionamento de emergência, conduta diante de vítimas e fraturas.',
    emoji: '🚑',
    corBorda: 'border-red-500/40',
    corTexto: 'text-rose-450',
    corBg: 'bg-rose-950/20'
  },
  meioambiente: {
    id: 'meioambiente',
    nome: 'Meio Ambiente e Cidadania',
    descricao: 'Poluição atmosférica, sonora e visual. Catalisadores, descarte de óleo e cidadania.',
    emoji: '🌳',
    corBorda: 'border-teal-500/40',
    corTexto: 'text-teal-400',
    corBg: 'bg-teal-950/20'
  },
  mecanica: {
    id: 'mecanica',
    nome: 'Mecânica Básica',
    descricao: 'Painel do motor, arrefecimento, motor de 4 tempos, suspensão, freios e pneus TWI.',
    emoji: '🔧',
    corBorda: 'border-indigo-500/40',
    corTexto: 'text-indigo-400',
    corBg: 'bg-indigo-950/20'
  }
};

// ================= BANCO DE QUESTÕES PARCIAIS DETRAN (45 QUESTÕES REAIS) =================
const QUESTOES_POOL: Questao[] = [
  // --- LEGISLAÇÃO DE TRÂNSITO (1-10) ---
  {
    id: 'l1',
    materia: 'legislacao',
    pergunta: 'Nas vias urbanas de Trânsito Rápido, qual a velocidade máxima permitida quando inexistir sinalização regulamentadora?',
    opcoes: [
      '60 km/h',
      '80 km/h',
      '110 km/h',
      '90 km/h'
    ],
    correta: 1,
    explicacao: 'O Código de Trânsito Brasileiro determina que, na ausência de sinalização regulamentadora, o limite para vias de Trânsito Rápido é 80 km/h, caracterizadas por acessos especiais, trânsito livre sem semáforos nem cruzamentos.'
  },
  {
    id: 'l2',
    materia: 'legislacao',
    pergunta: 'A primeira habilitação concedida ao condutor aprovado nos exames oficiais chama-se PPD (Permissão Para Dirigir). Qual é o seu prazo de validade?',
    opcoes: [
      '6 meses',
      '1 ano (12 meses)',
      '2 anos',
      '5 anos'
    ],
    correta: 1,
    explicacao: 'A Permissão para Dirigir (PPD) tem validade exata de 1 ano. Só após esse prazo, e sem cometer infrações graves, gravíssimas ou ser reincidente em médias, o motorista ganha a CNH definitiva.'
  },
  {
    id: 'l3',
    materia: 'legislacao',
    pergunta: 'Para obter a Categoria D de habilitação (ônibus, micro-ônibus e vans de mais de 8 passageiros), qual a idade mínima exigida pelo CTB?',
    opcoes: [
      '18 anos completos',
      '19 anos completos',
      '21 anos completos',
      '25 anos completos'
    ],
    correta: 2,
    explicacao: 'De acordo com o CTB, para se habilitar nas categorias D e E ou para conduzir veículos de transporte coletivo ou escolar, a idade mínima é de 21 anos.'
  },
  {
    id: 'l4',
    materia: 'legislacao',
    pergunta: 'O condutor que cometer uma infração de trânsito de natureza Grave acumula quantos pontos em seu prontuário de CNH?',
    opcoes: [
      '3 pontos',
      '4 pontos',
      '5 pontos',
      '7 pontos'
    ],
    correta: 2,
    explicacao: 'Infrações Graves somam 5 pontos na carteira. Lembrando as demais: Gravíssima: 7 pontos, Média: 4 pontos, Leve: 3 pontos.'
  },
  {
    id: 'l5',
    materia: 'legislacao',
    pergunta: 'A quem pertence a preferência de passagem ao se aproximar de um cruzamento não sinalizado rotatório de vias?',
    opcoes: [
      'Ao veículo que vier da esquerda',
      'Ao veículo que estiver circulando pela rotatória',
      'Sempre ao condutor com veículo de maior porte',
      'Quem piscar os faróis primeiro'
    ],
    correta: 1,
    explicacao: 'No caso de fluxo que se cruza por uma rotatória, a preferência de passagem pertencerá àquele veículo que já estiver circulando por ela.'
  },
  {
    id: 'l6',
    materia: 'legislacao',
    pergunta: 'O motorista que segura, manuseia ou utiliza o aparelho celular enquanto conduz o veículo comete qual infração?',
    opcoes: [
      'Infração Grave',
      'Infração Média',
      'Infração Gravíssima (com aplicação de multa)',
      'Infração Leve'
    ],
    correta: 2,
    explicacao: 'Manusear ou segurar o telefone celular ao dirigir acarreta infração Gravíssima de 7 pontos na carteira, pelo gravíssimo perigo de distração visual e cognitiva.'
  },
  {
    id: 'l7',
    materia: 'legislacao',
    pergunta: 'Qual a velocidade máxima predeterminada para automóveis e caminhonetes em rodovias rurais de pista simples não sinalizadas?',
    opcoes: [
      '110 km/h',
      '100 km/h',
      '90 km/h',
      '60 km/h'
    ],
    correta: 1,
    explicacao: 'Nas rodovias de pista simples, a velocidade máxima para automóveis, camionetas e motocicletas é de 100 km/h. Nas de pista dupla, sobe para 110 km/h.'
  },
  {
    id: 'l8',
    materia: 'legislacao',
    pergunta: 'Estacionar o carro na contramão da direção da via pública é uma conduta classificada como infração de que tipo?',
    opcoes: [
      'Infração Média',
      'Infração Grave',
      'Infração Leve',
      'Apenas falta de conduta cívica'
    ],
    correta: 0,
    explicacao: 'Estacionar na contramão de direção da via constitui infração de trânsito de natureza Média, gerando multa para o proprietário.'
  },
  {
    id: 'l9',
    materia: 'legislacao',
    pergunta: 'Qual o órgão federal máximo consultivo e normatizador, responsável por criar as resoluções técnicas do Sistema Nacional de Trânsito?',
    opcoes: [
      'DETRAN',
      'CONTRAN',
      'JARI',
      'PRF'
    ],
    correta: 1,
    explicacao: 'O CONTRAN (Conselho Nacional de Trânsito) é o órgão máximo normativo e consultivo de trânsito federal, responsável pelo detalhamento de resoluções e diretrizes técnicas.'
  },
  {
    id: 'l10',
    materia: 'legislacao',
    pergunta: 'Dirigir sob influência de substância alcoólica ou recusar o teste do bafômetro gera qual tipo de penalidade imediata?',
    opcoes: [
      'Apenas multa simples',
      'Grave infração reciclável com apenas 5 pontos',
      'Multa multiplicada por 10 e suspensão do direito de dirigir por 12 meses',
      'Advertência verbal'
    ],
    correta: 2,
    explicacao: 'A infração do artigo 165 e 165-A (Lei Seca) é Gravíssima e prevê o valor da multa multiplicado por 10, retenção do veículo, suspensão imediata do direito de dirigir por 12 meses.'
  },

  // --- DIREÇÃO DEFENSIVA (11-20) ---
  {
    id: 'd1',
    materia: 'direcao',
    pergunta: 'O que o condutor deve realizar imediatamente ao se ver sob o efeito da aquaplanagem (flutuação do veículo sobre lâmina d\'água)?',
    opcoes: [
      'Pisar bruscamente no freio com força máxima',
      'Girar vigorosamente o volante para os lados para escorrer a água',
      'Desacelerar gradativamente, segurar a direção reta e firme, sem frear bruscamente',
      'Engatar uma marcha mais forte e acelerar'
    ],
    correta: 2,
    explicacao: 'Na aquaplanagem, segure o volante firme de forma reta, alivie o acelerador de modo que as rodas restabeleçam contato com o solo e nunca trave os freios para não capotar ou girar sem rumo.'
  },
  {
    id: 'd2',
    materia: 'direcao',
    pergunta: 'No asfalto seco de pista rápida, qual a regra prática de tempo para manter uma distância segura de segurança em relação ao veículo da frente?',
    opcoes: [
      'Regra de 1 segundo',
      'Regra de 2 segundos',
      'Regra de 5 segundos',
      'Cerca de 10 segundos'
    ],
    correta: 1,
    explicacao: 'A regra clássica dos 2 segundos consiste em escolher um ponto de referência estático na via. Quando o veículo da frente passar por ele, conte mentalmente "mil e um, mil e dois". Se você passar pelo ponto antes de terminar a contagem, está perto demais!'
  },
  {
    id: 'd3',
    materia: 'direcao',
    pergunta: 'A Direção Defensiva se apoia em 5 elementos fundamentais importantes para evitar sinistros. São eles:',
    opcoes: [
      'Sinalização, Velocidade, Álcool, Carro e Pista',
      'Atenção, Alinhamento, Freios, Luzes e Conhecimento',
      'Conhecimento, Atenção, Previsão, Decisão e Habilidade',
      'Cinto, Chassi, Multas, Respeito e Histerese'
    ],
    correta: 2,
    explicacao: 'A doutrina oficial divide a direção defensiva em cinco preceitos: Conhecimento teórico, Atenção focada, Previsão de cenários, Decisão ágil e Habilidade prática.'
  },
  {
    id: 'd4',
    materia: 'direcao',
    pergunta: 'Ao se deparar com forte neblina ou fumaça densa na pista rústica, qual deve ser a postura defensiva do condutor?',
    opcoes: [
      'Acionar imediatamente o pisca-alerta em pleno movimento',
      'Ligar o farol alto do carro para iluminar a névoa',
      'Reduzir a velocidade, utilizar farol baixo ou luz de neblina e manter distância extra do carro à frente',
      'Ultrapassar todos os carros rápido para fugir da fumaça'
    ],
    correta: 2,
    explicacao: 'O farol alto reflete nas gotículas de fumaça/neblina cegando a visão. Use faróis baixos, aumente a distância do condutor que segue à frente, diminua a velocidade e jamais ligue o pisca-alerta se o veículo estiver em trânsito.'
  },
  {
    id: 'd5',
    materia: 'direcao',
    pergunta: 'A definição clássica de Direção Defensiva Abrange a prática de dirigir de forma a:',
    opcoes: [
      'Prever perigos, evitar acidentes apesar das ações errantes dos outros e condições adversas',
      'Dirigir o mais rápido possível para desobstruir vias engarrafadas',
      'Facilitar a corrida e ultrapassagens do carro nas vias rápidas',
      'Apenas fazer as revisões periódicas na concessionária'
    ],
    correta: 0,
    explicacao: 'Direção defensiva é exatamente conduzir seu veículo de forma proativa para neutralizar falhas de outros condutores, más condições meteorológicas e situações imprevisíveis.'
  },
  {
    id: 'd6',
    materia: 'direcao',
    pergunta: 'A fadiga e o cansaço acumulados no corpo do condutor após muitas horas consecutivas de viagem reduzem diretamente qual aspecto?',
    opcoes: [
      'O consumo geral de combustível do veículo',
      'O nível de reflexos do condutor e seu tempo necessário para reação de freagem',
      'O torque operacional de frenagem das pastilhas',
      'A capacidade de aquaplanagem do veículo'
    ],
    correta: 1,
    explicacao: 'O estresse e o cansaço reduzem drasticamente as tomadas de decisões rápidas, tornando os tempos de reação humanos perigosamente longos perante imprevistos.'
  },
  {
    id: 'd7',
    materia: 'direcao',
    pergunta: 'Como chama-se a distância total percorrida pelo automóvel desde o exato instante em que o condutor avista um obstáculo até a parada completa do veículo?',
    opcoes: [
      'Distância de Frenagem',
      'Distância de Reação',
      'Distância de Parada Total',
      'Distância de Seguimento'
    ],
    correta: 2,
    explicacao: 'A Distância de Parada Total é a fusão de duas distâncias consecutivas: a Distância de Reação (pensar e mover o pé para o freio) mais a Distância de Frenagem (ação hidráulica contínua sobre as rodas até cessar as rotações).'
  },
  {
    id: 'd8',
    materia: 'direcao',
    pergunta: 'Quando ventos laterais de alta intensidade impactam as laterais do veículo em alta velocidade em pontes e rodovias, o melhor comportamento defensivo é:',
    opcoes: [
      'Fechar totalmente os vidros e acelerar o motor até o limite',
      'Parar no meio da pista para esperar o vendaval passar',
      'Reduzir a velocidade, firmar volante com as mãos e abrir ligeiramente os vidros para equalização do ar',
      'Fazer movimentos em zigue-zague constantes para vencer as rajadas'
    ],
    correta: 2,
    explicacao: 'Abrir um pouco as janelas equilibra a pressão aerodinâmica interna, e reduzir a velocidade diminui a força desestabilizadora sofrida embaixo e nas laterais do carro.'
  },
  {
    id: 'd9',
    materia: 'direcao',
    pergunta: 'A "Atenção Difusa" recomendada para uma condução segura prevê que o motorista:',
    opcoes: [
      'Mantenha a atenção fixa apenas no capô do seu próprio carro',
      'Preste atenção exclusivamente em outdoors de publicidades laterais',
      'Monitore constantemente tudo ao redor e à frente do veículo, consultando retrovisores e faixas adjacentes',
      'Focalize seu olhar apenas em quem vem atrás dele'
    ],
    correta: 2,
    explicacao: 'Diferente da atenção fixa ou dispersa, a atenção defensiva ideal é difusa: o olho escaneia 360 graus o tráfego adiante, as vias laterais e os espelhos do painel de milissegundos em milissegundos.'
  },
  {
    id: 'd10',
    materia: 'direcao',
    pergunta: 'Para realizar uma curva de forma segura e com perfeita estabilidade direcional sem perda de aderência física, o condutor defensivo deve:',
    opcoes: [
      'Reduzir a marcha e frear no ápice exato da trajetória da curva',
      'Diminuir a velocidade utilizando freio antes de entrar na curva e manter sutil aceleração na trajetória',
      'Fazer curvas em ponto morto (neutro) para economizar as rodas traseiras',
      'Acelerar bruscamente justo ao iniciar para deslizar de propósito'
    ],
    correta: 1,
    explicacao: 'A frenagem brusca feita com o volante esterçado compromete a força centrípeta do carro, tirando as rodas da estabilidade. Reduza o ritmo *antes* do contorno e mantenha-o dócil e seguro na curva.'
  },

  // --- PRIMEIROS SOCORROS (21-30) ---
  {
    id: 's1',
    materia: 'socorros',
    pergunta: 'Se houver um acidente em uma rodovia seca cujo limite de velocidade máxima seja 80 km/h, a qual distância o triângulo deve ser posicionado?',
    opcoes: [
      'Cerca de 10 metros após a colisão',
      'A exatos 80 passos longos de adulto da cena do impacto',
      'A 30 metros apenas para economizar tempo do socorrista',
      'Na frente do capô do veículo avariado'
    ],
    correta: 1,
    explicacao: 'A regra geral oficial do DETRAN determina posicionar a distância do triângulo de acordo com 1 passo longo por quilômetro por hora da pista: via de 80 km/h exige 80 passos sob pista seca.'
  },
  {
    id: 's2',
    materia: 'socorros',
    pergunta: 'Ao se deparar com uma vítima de acidente de motocicleta deitada no solo de trânsito, qual conduta o socorrista leigo JAMAIS deve exercer?',
    opcoes: [
      'Ligar imediatamente para o resgate de trauma',
      'Conversar calmamente com a pessoa para mantê-la lúcida',
      'Mover a vítima desordenadamente e remover o seu capacete',
      'Sinalizar o acostamento e isolar o tráfego'
    ],
    correta: 2,
    explicacao: 'Retirar o capacete ou mover abruptamente o motociclista pode induzir movimentos nas vértebras cervicais e romper a medula espinhal, causando tetraplegia irreversível.'
  },
  {
    id: 's3',
    materia: 'socorros',
    pergunta: 'Em caso de acidentes críticos de trânsito que envolvam múltiplas colisões com potencial de incêndio ou vítimas feridas graves, quais os números rápidos para acionamento médico e salvamento?',
    opcoes: [
      'SAMU (190) e Bombeiros (191)',
      'SAMU (192) e Corpo de Bombeiros (193)',
      'Polícia (191) e PRF (192)',
      'SAMU (194) e Defesa Civil (193)'
    ],
    correta: 1,
    explicacao: 'Os telefones corretos do serviço médico de emergência e resgate de incêndio e ferragens são SAMU 192 e Corpo de Bombeiros 193.'
  },
  {
    id: 's4',
    materia: 'socorros',
    pergunta: 'Se o mesmo acidente na rodovia regulada a 80 km/h ocorrer em dia chuvoso ou sob forte neblina, qual deverá ser a distância para a correta sinalização?',
    opcoes: [
      'Manter os mesmos 80 passos regulamentares',
      'Dobrar a distância recomendada para 160 passos longos devido à baixa visibilidade',
      'Diminuir para 40 passos para o motorista não se molhar na chuva',
      'Instalar o equipamento apenas quando a chuva passar'
    ],
    correta: 1,
    explicacao: 'Sob chuva forte, neblina, poeira noturna ou fumaça densa de queimada nas rodovias, as distâncias de colocação física do triângulo devem ser DOBRADAS para proteção total.'
  },
  {
    id: 's5',
    materia: 'socorros',
    pergunta: 'Uma das maiores causas de óbito por engasgamento primário em vítimas inconscientes de acidente automobilístico dá-se pelo bloqueio físico de:',
    opcoes: [
      'Ingestão involuntária de gotas de calmantes orais dados por terceiros',
      'A queda da base lingual obstruindo a passagem de ar e asfixia mecânica rápida',
      'Inalação de gás ozônio atmosférico',
      'Nenhum, pois inconscientes não engasgam'
    ],
    correta: 1,
    explicacao: 'Durante o estado de coma profundo ou inconsciência muscular geral, a língua relaxa e pode deslizar para trás, cobrindo o canal respiratório glótico se a cabeça não estiver cuidadosamente posicionada.'
  },
  {
    id: 's6',
    materia: 'socorros',
    pergunta: 'Se uma pessoa deitada no asfalto após o trauma apresenta sangramento volumoso em um dos braços, qual intervenção prática de socorro é dita correta?',
    opcoes: [
      'Fazer um torniquete garrote com arame serrilhado fino',
      'Aplicar álcool líquido direto no ferimento exposto',
      'Fazer pressão direta e firme contínua sobre a ferida com uma gaze ou pano limpo',
      'Não encostar na pessoa e esperar apenas que o sangue coagule sozinho'
    ],
    correta: 2,
    explicacao: 'O método básico e mais seguro para controlar hemorragias externas agudas na área do trauma é colocar um pano limpo/gaze e exercer compressão direta mantida para cessar a vazão sanguínea.'
  },
  {
    id: 's7',
    materia: 'socorros',
    pergunta: 'Por que o socorrista leigo NÃO deve oferecer água de beber ou comprimidos orais de analgésico a uma vítima de acidente consciente que reclama de sede?',
    opcoes: [
      'Para evitar o desperdício de soro',
      'A vítima pode sofrer asfixia pela glote e se houver cirurgia posterior urgente o estômago deve estar 100% livre',
      'Porque a ingestão de água acelera hemorragias internas renais',
      'Apenas porque dá azar para a recuperação'
    ],
    correta: 1,
    explicacao: 'Líquidos no estômago causam risco de vômitos, aspiração broncopulmonar em caso de desmaio repentino e inviabilizam procedimentos cirúrgicos imediatos em hospitais.'
  },
  {
    id: 's8',
    materia: 'socorros',
    pergunta: 'Se houver fumaça acumulando embaixo do motor colidido com vítimas feridas em seu interior, qual a prioridade imediata?',
    opcoes: [
      'Puxar mangueiras para tentar limpar com água do limpador',
      'Sinalizar e organizar o isolamento, pedir resgate urgente e remover com extremo cuidado as vítimas se houver eminência fatal de incêndio',
      'Tentar consertar a fiação rompida para ligar o rádio',
      'Sair correndo e deixar os veículos sozinhos'
    ],
    correta: 1,
    explicacao: 'A prioridade absoluta é garantir que as pessoas saiam rápido se o fogo for real e inevitável, mas em condições normais, prefere-se nunca mover a vítima para evitar as citadas sequelas cervicais térmicas.'
  },

  // --- MEIO AMBIENTE E CIDADANIA (31-38) ---
  {
    id: 'm1',
    materia: 'meioambiente',
    pergunta: 'Qual o papel desempenhado pelo filtro do catalisador no escapamento do veículo motorizado?',
    opcoes: [
      'Diminuir por completo o barulho estridente do motor para conforto',
      'Economizar cerca de 30% do consumo de combustível fóssil',
      'Realizar reações químicas catalíticas que neutralizam gases poluentes perigosos (como o monóxido de carbono)',
      'Regular o calor do motor por meio de água climatizada'
    ],
    correta: 2,
    explicacao: 'O catalisador promove uma modificação termoquímica nos gases originados da combustão, neutralizando o venenoso e asfixiante monóxido de carbono (CO) em dejetos não asfixiantes como CO₂ e H₂O.'
  },
  {
    id: 'm2',
    materia: 'meioambiente',
    pergunta: 'Por que despejar incorretamente óleo lubrificante de motor usado no meio ambiente é severamente proibido pela legislação ecológica federal?',
    opcoes: [
      'Porque o óleo atrai grandes bandos de aves migratórias nocivas',
      'O composto carrega substâncias altamente cancerígenas e carcinogênicas que contaminam bacias de água doce profundas e solos férteis',
      'Porque o óleo evapora sumindo no céu rapidamente sem deixar vestígios',
      'Apenas porque encarece a importação de aditivos sintéticos'
    ],
    correta: 1,
    explicacao: 'O óleo lubrificante usado é um resíduo perigoso que não se degrada na água. Um litro apenas de óleo de motor polui por completo milhões de litros de água doce.'
  },
  {
    id: 'm3',
    materia: 'meioambiente',
    pergunta: 'Quem exerce a prioridade total e absoluta de tráfego e de passagem nas travessias urbanas não sinalizadas segundo o CTB?',
    opcoes: [
      'Os veículos esportivos que circulam velozes',
      'Os ônibus do sistema municipal de trânsito',
      'O pedestre cruzando as linhas',
      'Os ciclistas em pistas de asfalto'
    ],
    correta: 2,
    explicacao: 'No trânsito ordenado segundo a cidadania brasileira, o elemento mais vulnerável tem prioridade jurídica máxima de circulação e segurança: os pedestres.'
  },
  {
    id: 'm4',
    materia: 'meioambiente',
    pergunta: 'Atirar ou abandonar objetos, sacos de detritos plásticos ou lixo pela janela do automóvel gera que punição?',
    opcoes: [
      'Apenas repreensão escrita do guardião de quadra',
      'Infração Grave de 5 pontos',
      'Infração Média com a devida e severa aplicação de multa civil',
      'Infração Leve sem multa envolvida'
    ],
    correta: 2,
    explicacao: 'De acordo com o Código de Trânsito Brasileiro (Art. 172), atirar papéis, latas ou dejetos de veículos nas estradas ou vias urbanas é uma infração Média que soma 4 pontos na CNH.'
  },
  {
    id: 'm5',
    materia: 'meioambiente',
    pergunta: 'O motorista que trafega buzinando de forma prolongada, ruidosa e histérica perto de santuários médicos ou hospitais comete infração por gerar:',
    opcoes: [
      'Poluição do tipo Visual',
      'Poluição Atmosférica de asfalto',
      'Poluição Sonora e perturbação da saúde de internados',
      'Não comete nada, pois buzina é item de segurança'
    ],
    correta: 2,
    explicacao: 'O ruído acústico descontrolado enquadra-se na classificação direta de Poluição Sonora. Próximo a unidades hospitalares e escolas, o uso de buzina é vetado por lei de bem-estar.'
  },
  {
    id: 'm6',
    materia: 'meioambiente',
    pergunta: 'Das opções descritas, qual melhor exemplifica a atitude solidária exigida pelo Código de Trânsito Brasileiro para um ambiente viário saudável?',
    opcoes: [
      'Bloquear cruzamentos se o trânsito parar para não perder a sua vez',
      'Responsabilizar os maiores automotores por salvaguardar e proteger ciclistas, pedestres e demais condutores vulneráveis',
      'Acelerar quando o pedestre estiver iniciando a travessia para poupar tempo',
      'Disputar pistas com outros condutores para testar a destreza'
    ],
    correta: 1,
    explicacao: 'O CTB rege juridicamente que os maiores veículos no asfalto são responsáveis absolutos pelos menores e menos protegidos por si sós.'
  },

  // --- MECÂNICA BÁSICA (39-45) ---
  {
    id: 'k1',
    materia: 'mecanica',
    pergunta: 'Se a lâmpada indicadora de óleo vermelha em formato de "bule gotejante" acende estática no painel de avisos com o carro ativo, o condutor deve:',
    opcoes: [
      'Esperar completar 50 km para abastecer no posto',
      'Estacionar o carro imediatamente em local seguro e desligar o motor sob pena de fundir os metais do bloco térmico',
      'Acelerar forte para a bomba rotacionar e tentar enviar mais óleo por força centrífuga',
      'Ignorar o sinal pois é apenas falha temporária do sistema do rádio'
    ],
    correta: 1,
    explicacao: 'Parar o veículo e desligar o motor é obrigatório: a luz do óleo acesa indica que há perda crítica de lubrificação, o que arruinará o bloco por calor e atrito em poucos metros.'
  },
  {
    id: 'k2',
    materia: 'mecanica',
    pergunta: 'O limite legal mínimo medido no indicador TWI das ranhuras e sulcos de um pneu para que ele não seja considerado "careca" e ilegal é:',
    opcoes: [
      '0.8 mm de profundidade',
      '1.0 mm de profundidade',
      '1.6 mm de profundidade',
      '3.0 mm de profundidade'
    ],
    correta: 2,
    explicacao: 'O limite científico do indicador TWI (Tread Wear Indicator) do pneu é de 1.6 milímetros. Abaixo dessa medida, a dispersão de água na chuva é ineficiente e o pneu é multável.'
  },
  {
    id: 'k3',
    materia: 'mecanica',
    pergunta: 'Qual componente automotivo elétrico serve fundamentalmente para recarregar a bateria do automóvel e manter os fiação ativa enquanto o motor opera?',
    opcoes: [
      'O motor de partida arranque',
      'O alternador elétrico',
      'As bobinas de indução estática',
      'O reator de xenônio'
    ],
    correta: 1,
    explicacao: 'O alternador é o dínamo elétrico que converte o movimento mecânico da correia em eletricidade para carregar a bateria recarregável de chumbo-ácido e manter todo o sistema operando em alta.'
  },
  {
    id: 'k4',
    materia: 'mecanica',
    pergunta: 'O sistema de arrefecimento do carro, encarregado de combater o superaquecimento do motor térmico, utiliza quais elementos cruciais?',
    opcoes: [
      'Silenciador de ponteira, bico de ignição e filtro de combustível seco',
      'Radiador, bomba d\'água, ventoinha, válvula termostática e aditivo etilenoglicol diluído em água',
      'Vareta de nível mecânico e discos de pastilha de metal',
      'Amortecedores hidráulicos e barras de torção de aço'
    ],
    correta: 1,
    explicacao: 'O circuito usa água com aditivo refrigerante, bombeada pelo bloco até o radiador, resfriado pelo vento e acionado pela ventoinha elétrica nas curvas do calor do tráfego.'
  },
  {
    id: 'k5',
    materia: 'mecanica',
    pergunta: 'Em um pneu convencional de automóvel, a calibragem correta periódica das pressões internas de libras deve ser feita de preferência:',
    opcoes: [
      'Após o veículo circular dezenas de quilômetros de asfalto quente',
      'Com os pneus em estado totalmente Frio para não dilatar o ar interno',
      'Apenas quando o pneu murchar visivelmente no aro do asfalto',
      'A cada seis meses ou no período das trocas de velas'
    ],
    correta: 1,
    explicacao: 'O calor expande os gases do pneu elevando a pressão falsa na medição. Calibre sempre semanalmente e com pneus frios para obter valores nominais exatos.'
  },
  {
    id: 'k6',
    materia: 'mecanica',
    pergunta: 'Qual a sequência exata e lógica dos 4 tempos de um ciclo de motor térmico ciclo Otto a pistão que equipa a maioria esmagadora dos carros convencionais?',
    opcoes: [
      'Admissão, Explosão, Ignição e Faísca',
      'Admissão, Compressão, Explosão (ou Combustão/Expansão) e Escapamento',
      'Arrefecimento, Transmissão, Carburador e Partida',
      'Vela, Pistão, Correia e Alternador'
    ],
    correta: 1,
    explicacao: 'Os 4 tempos são: 1. Admissão (insere mistura combustível/ar); 2. Compressão (comprime a mistura); 3. Explosão, expansão ou combustão (vela emite faísca acionando pistão); 4. Escape de resíduos gasosos pelo silenciador.'
  },
  {
    id: 'k7',
    materia: 'mecanica',
    pergunta: 'O freio tipo ABS (Anti-lock Braking System), tecnologia de segurança hoje universalmente exigida, atua nos automóveis evitando:',
    opcoes: [
      'O desgaste prematuro das marchas hidráulicas do câmbio',
      'O travamento completo das rodas em frenagens críticas bruscas, mantendo o controle da trajetória e aderência direcional',
      'A queima de gasolina quando pisado de emergência nas descidas',
      'A emissão de ruídos do escapamento'
    ],
    correta: 1,
    explicacao: 'O freio ABS impede o travamento de rodas por meio de sensores magnéticos lineares, o que evita derrapagens descontroladas e assegura controle direcional no volante pelo piloto.'
  }
];

// ================= COMPONENTE PRINCIPAL DO SIMULADOR DETRAN =================
export function FreeTheoreticalCourse() {
  // --- STATES ---
  const [activeMode, setActiveMode] = useState<'menu' | 'simulado_oficial' | 'treino_rapido' | 'treino_materia'>('menu');
  const [selectedMateriaFiltro, setSelectedMateriaFiltro] = useState<MateriaId>('legislacao');
  
  const [questionsList, setQuestionsList] = useState<Questao[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answersUser, setAnswersUser] = useState<Record<number, number>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  
  // Timer for complete Simulado Oficial
  const [timeLeft, setTimeLeft] = useState<number>(2400); // 40 minutos (2400 segundos)
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stats results
  const [showResults, setShowResults] = useState<boolean>(false);
  const [startTimeString, setStartTimeString] = useState<string>('');

  // History loaded and saved to localStorage
  const [historico, setHistorico] = useState<HistoricoItem[]>(() => {
    try {
      const saved = localStorage.getItem('detran_historico_simulador');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Calculate master stats for dashboard
  const userStats = useMemo(() => {
    if (historico.length === 0) return { totalSimulados: 0, taxaAprovacao: 0, pontuacaoMedia: 0 };
    const total = historico.length;
    const aprovados = historico.filter(h => h.aprovado).length;
    const media = Math.round(historico.reduce((acc, current) => acc + (current.acertos / current.total), 0) * 100 / total);
    return {
      totalSimulados: total,
      taxaAprovacao: Math.round((aprovados / total) * 100),
      pontuacaoMedia: media
    };
  }, [historico]);

  // Persist history
  useEffect(() => {
    localStorage.setItem('detran_historico_simulador', JSON.stringify(historico));
  }, [historico]);

  // Handle countdown timer
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            setIsTimerRunning(false);
            // Automatic submit when time rolls to 0
            handleSubmitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timeLeft]);

  // Format digital countdown time mm:ss
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- ACTIONS ---

  // Build a quiz based on chosen modality
  const handleStartQuiz = (mode: 'simulado_oficial' | 'treino_rapido' | 'treino_materia', materiaId?: MateriaId) => {
    let selected: Questao[] = [];
    setAnswersUser({});
    setMarkedQuestions(new Set());
    setCurrentIdx(0);
    setShowResults(false);
    setStartTimeString(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

    if (mode === 'simulado_oficial') {
      // Real DETRAN exam has 30 questions.
      // Let's sample representative portions from each category and fill up to exactly 30:
      // legislacao: 10, direcao: 10, socorros: 4, meioambiente: 3, mecanica: 3
      const legislacaoPool = QUESTOES_POOL.filter(q => q.materia === 'legislacao');
      const direcaoPool = QUESTOES_POOL.filter(q => q.materia === 'direcao');
      const socorrosPool = QUESTOES_POOL.filter(q => q.materia === 'socorros');
      const meioPool = QUESTOES_POOL.filter(q => q.materia === 'meioambiente');
      const mecanicaPool = QUESTOES_POOL.filter(q => q.materia === 'mecanica');

      const shuffleAndTake = (arr: Questao[], limit: number) => {
        return [...arr].sort(() => 0.5 - Math.random()).slice(0, limit);
      };

      selected = [
        ...shuffleAndTake(legislacaoPool, 10),
        ...shuffleAndTake(direcaoPool, 10),
        ...shuffleAndTake(socorrosPool, 4),
        ...shuffleAndTake(meioPool, 3),
        ...shuffleAndTake(mecanicaPool, 3)
      ];

      // Ensure total is exactly 30. If we lack items, take any remaining.
      if (selected.length < 30) {
        const selectedIds = new Set(selected.map(q => q.id));
        const remainders = QUESTOES_POOL.filter(q => !selectedIds.has(q.id));
        const extraNeeded = 30 - selected.length;
        selected = [...selected, ...shuffleAndTake(remainders, extraNeeded)];
      }

      // Final shuffle of the 30 sampled questions
      selected = selected.sort(() => 0.5 - Math.random()).slice(0, 30);
      
      setTimeLeft(2400); // 40 minutes count
      setIsTimerRunning(true);
    } 
    else if (mode === 'treino_rapido') {
      // 10 random questions from across all subjects
      selected = [...QUESTOES_POOL].sort(() => 0.5 - Math.random()).slice(0, 10);
      setIsTimerRunning(false);
    } 
    else if (mode === 'treino_materia' && materiaId) {
      // All questions from that specific subject
      selected = QUESTOES_POOL.filter(q => q.materia === materiaId).sort(() => 0.5 - Math.random());
      setIsTimerRunning(false);
      setSelectedMateriaFiltro(materiaId);
    }

    setQuestionsList(selected);
    setActiveMode(mode);
  };

  // Handle picking an option
  const handleSelectOption = (optionIndex: number) => {
    // Save answer
    setAnswersUser(prev => ({
      ...prev,
      [currentIdx]: optionIndex
    }));
  };

  // Toggle flag review state
  const handleToggleFlag = () => {
    setMarkedQuestions(prev => {
      const updated = new Set(prev);
      if (updated.has(currentIdx)) {
        updated.delete(currentIdx);
      } else {
        updated.add(currentIdx);
      }
      return updated;
    });
  };

  // Close timer and compile outcomes
  const handleSubmitExam = (forceTimeout = false) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setIsTimerRunning(false);

    // Score evaluation
    let acertos = 0;
    questionsList.forEach((q, idx) => {
      if (answersUser[idx] === q.correta) {
        acertos++;
      }
    });

    const total = questionsList.length;
    const taxaCorte = activeMode === 'simulado_oficial' ? 0.7 : 0.6; // 70% approval for official, 60% for training
    const aprovado = (acertos / total) >= taxaCorte;

    // Time calculations
    const tempoTotalEmSegundos = activeMode === 'simulado_oficial' ? (2400 - timeLeft) : 0;
    const formattedMinutes = Math.floor(tempoTotalEmSegundos / 60);
    const formattedSeconds = tempoTotalEmSegundos % 60;
    const tempoString = activeMode === 'simulado_oficial' 
      ? `${formattedMinutes}m ${formattedSeconds}s` 
      : 'Sem cronômetro';

    // Save history
    const novoResultadoHistorico: HistoricoItem = {
      id: Math.random().toString(36).substr(2, 9),
      data: new Date().toLocaleDateString('pt-BR'),
      modo: activeMode === 'simulado_oficial' ? 'Simulado Oficial' : activeMode === 'treino_rapido' ? 'Treino Rápido' : 'Treino por Matéria',
      materiaNome: activeMode === 'treino_materia' ? MATERIAS_DETRAN[selectedMateriaFiltro].nome : undefined,
      acertos,
      total,
      tempoGasto: tempoString,
      aprovado
    };

    setHistorico(prev => [novoResultadoHistorico, ...prev]);
    setShowResults(true);

    if (forceTimeout) {
      alert('⚠️ O tempo regulamentar de 40 minutos esgotou! Seu exame foi submetido automaticamente.');
    }
  };

  const handleClearHistory = () => {
    if (confirm('Deseja realmente apagar todo o histórico de treinos do simulador?')) {
      setHistorico([]);
    }
  };

  // --- STATS HELPER BY CATEGORY FOR RESULTS PIE ---
  const getPerformanceByCategory = () => {
    const stats: Record<MateriaId, { total: number; acertos: number }> = {
      legislacao: { total: 0, acertos: 0 },
      direcao: { total: 0, acertos: 0 },
      socorros: { total: 0, acertos: 0 },
      meioambiente: { total: 0, acertos: 0 },
      mecanica: { total: 0, acertos: 0 }
    };

    questionsList.forEach((q, idx) => {
      const userAns = answersUser[idx];
      stats[q.materia].total++;
      if (userAns === q.correta) {
        stats[q.materia].acertos++;
      }
    });

    return stats;
  };

  const performanceByCategory = showResults ? getPerformanceByCategory() : null;

  return (
    <div className="bg-gradient-to-b from-slate-900 via-[#0e1d35] to-slate-950 rounded-2xl border-2 border-indigo-950/80 shadow-2xl overflow-hidden text-slate-100" id="curso-teorico-gratuito">
      
      {/* 🏢 MAIN HEADER */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-[#112d52] via-[#0b213b] to-indigo-950 border-b border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="absolute right-0 top-0 w-80 h-full bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="space-y-2 relative z-10 text-left">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 text-emerald-300 border border-emerald-500/30 tracking-widest font-mono uppercase">
            🚀 TREINAMENTO DE AUTOESTUDO INTERATIVO 🇧🇷
          </span>
          <h3 className="text-2xl md:text-3xl.5 font-black text-white tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-8 w-8 text-indigo-400 animate-pulse" />
            Simulador DETRAN de Exames Teóricos
          </h3>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Treine com dezenas de questões oficiais atualizadas do CTB divididas entre as 5 unidades curriculares obrigatórias. Estude por matéria crítica ou simule uma prova Detran cronometrada de 30 questões!
          </p>
        </div>

        {/* Global Statistics Indicators */}
        {activeMode === 'menu' && historico.length > 0 && (
          <div className="bg-slate-900/80 border border-indigo-900/60 p-4 rounded-xl min-w-[220px] shrink-0 text-left space-y-2.5 shadow-lg">
            <p className="text-[10px] text-slate-450 font-black uppercase tracking-wider font-mono">Desempenho Geral</p>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0c1628] border border-indigo-950/50 p-2 rounded">
                <span className="text-[9px] text-slate-400 font-mono block">Simulados</span>
                <span className="text-sm font-black text-white">{userStats.totalSimulados}</span>
              </div>
              <div className="bg-[#0c1628] border border-indigo-950/50 p-2 rounded">
                <span className="text-[9px] text-slate-400 font-mono block">Aprovação</span>
                <span className={`text-sm font-black ${userStats.taxaAprovacao >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {userStats.taxaAprovacao}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono font-medium">
                <span>Pontuação Média</span>
                <span>{userStats.pontuacaoMedia}% de acerto</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${userStats.pontuacaoMedia >= 70 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${userStats.pontuacaoMedia}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================= CASE 1: HOME PANEL (MENU) ======================= */}
      {activeMode === 'menu' && (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300">
          
          {/* Welcome Dashboard block */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Options to Start a Simulator */}
            <div className="lg:col-span-8 space-y-6 text-left">
              <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-indigo-950 pb-2">
                <Play className="h-4 w-4 text-emerald-400" />
                Selecione o Método de Treino
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mode A: Official Exam Simulator */}
                <div 
                  onClick={() => handleStartQuiz('simulado_oficial')}
                  className="group relative bg-[#0e1e35]/80 hover:bg-[#11243f] border-2 border-indigo-900/55 hover:border-emerald-500/70 p-5 rounded-2xl cursor-pointer transition-all duration-300 space-y-4 flex flex-col justify-between shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                  id="btn-modo-simulado-oficial"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl font-bold border border-emerald-500/20">
                        ⚖️
                      </span>
                      <span className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-black tracking-widest font-mono uppercase px-2 py-0.5 rounded border border-emerald-500/30">
                        Exame Realista
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">
                      Simulado Oficial DETRAN
                    </h5>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      30 questões variadas das 5 matérias, com tempo regressivo de <strong>40 minutos</strong>. Exige taxa mínima de <strong>70% de acertos (21 respostas corretas)</strong> para aprovação, idêntico ao processo legal do Detran real.
                    </p>
                  </div>
                  
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-900/60 font-mono">
                    <span>⏱️ Cronometrado</span>
                    <span className="text-emerald-400 font-bold group-hover:translate-x-1.5 transition-transform flex items-center">
                      Iniciar Simulado <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

                {/* Mode B: Quick Training */}
                <div 
                  onClick={() => handleStartQuiz('treino_rapido')}
                  className="group relative bg-[#0e1e35]/80 hover:bg-[#11243f] border-2 border-indigo-900/55 hover:border-indigo-500 p-5 rounded-2xl cursor-pointer transition-all duration-300 space-y-4 flex flex-col justify-between shadow-md hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                  id="btn-modo-treino-rapido"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="w-10 h-10 rounded-lg bg-[#3b82f6]/10 text-blue-400 flex items-center justify-center text-xl font-bold border border-blue-500/20">
                        🎯
                      </span>
                      <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black tracking-widest font-mono uppercase px-2 py-0.5 rounded border border-indigo-500/30">
                        Sem Pressão
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">
                      Treino Rápido de Fixação
                    </h5>
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Gerador expresso de <strong>10 questões aleatórias</strong> de qualquer bloco de matérias, sem limite de tempo e com explicação pedagógica detalhada instantânea ao marcar. Excelente para revisar em minutos livres!
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-900/60 font-mono">
                    <span>♾️ Sem Cronômetro</span>
                    <span className="text-indigo-400 font-bold group-hover:translate-x-1.5 transition-transform flex items-center">
                      Iniciar Treino <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>

              </div>

              {/* Mode C: Subdivided Subject Training */}
              <div className="space-y-4 pt-2">
                <h5 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  Ou Selecione uma Unidade Curricular Crítica para Treinar Focado:
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.keys(MATERIAS_DETRAN) as MateriaId[]).map((key) => {
                    const math = MATERIAS_DETRAN[key];
                    const numQuestoesMateria = QUESTOES_POOL.filter(q => q.materia === key).length;
                    return (
                      <div
                        key={key}
                        onClick={() => handleStartQuiz('treino_materia', key)}
                        className="p-3.5 rounded-xl border border-indigo-950 hover:border-indigo-500 bg-slate-900/90 hover:bg-[#0d1c31] transition-all cursor-pointer flex justify-between items-center group shadow"
                        id={`btn-materia-treino-${key}`}
                      >
                        <div className="flex items-center gap-2.5 text-left">
                          <span className="text-2xl">{math.emoji}</span>
                          <div>
                            <h6 className="text-[11.5px] font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight">{math.nome}</h6>
                            <span className="text-[9.5px] text-slate-400 font-mono">{numQuestoesMateria} Questões disponíveis</span>
                          </div>
                        </div>
                        <span className="w-6 h-6 rounded-lg bg-indigo-500/5 border border-indigo-950 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Sidebar with History & motivational message */}
            <div className="lg:col-span-4 space-y-6 text-left">
              <div className="flex justify-between items-center border-b border-indigo-950 pb-2">
                <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-400" />
                  Histórico de Simulados
                </h4>
                {historico.length > 0 && (
                  <button 
                    onClick={handleClearHistory} 
                    className="text-[10px] text-rose-450 hover:underline hover:text-red-400 font-mono uppercase bg-transparent border-0 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {historico.length === 0 ? (
                <div className="p-6 text-center border-2 border-dashed border-indigo-950/60 rounded-2xl bg-[#09111c]/30 space-y-2">
                  <p className="text-2xl">📊</p>
                  <p className="text-[11px] text-slate-400">Você ainda não realizou nenhum simulado oficial de teste nesta seção.</p>
                  <p className="text-[10px] text-slate-500">Seus resultados e tempos médios de preenchimento serão mostrados aqui após concluir!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {historico.map((h, hIdx) => (
                    <div 
                      key={h.id || hIdx}
                      className="p-3 bg-[#0c1628] border border-indigo-900/40 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] text-slate-400 block font-mono">
                          {h.data} • {h.modo} {h.materiaNome ? `(${h.materiaNome})` : ''}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-white text-sm">
                            {h.acertos} <span className="text-slate-500 font-medium text-xs">de {h.total}</span>
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ({Math.round((h.acertos / h.total) * 100)}%)
                          </span>
                        </div>
                      </div>

                      <div className="text-right space-y-1 shrink-0">
                        {h.aprovado ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase font-mono">
                            APROVADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-red-500/10 text-rose-450 border border-red-500/20 text-[9px] font-black uppercase font-mono">
                            REPROVADO
                          </span>
                        )}
                        <span className="text-[9px] text-slate-500 block font-mono">{h.tempoGasto}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Tips Banner */}
              <div className="p-4 bg-indigo-950/20 border border-indigo-900/50 rounded-xl space-y-2">
                <span className="text-xs text-indigo-400 font-black uppercase tracking-wider font-mono flex items-center gap-1">
                  💡 Macete de Mariana:
                </span>
                <p className="text-[11px] text-slate-350 leading-relaxed italic">
                  "No simulado de 30 questões, use o grid numérico para marcar as que tem dúvida e voltar nelas depois. Não trave em nenhuma! Gerencie os seus 40 minutos com inteligência."
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ======================= CASE 2: ACTIVE EXAM (TEST / TRADING MODE) ======================= */}
      {activeMode !== 'menu' && !showResults && questionsList.length > 0 && (
        <div className="p-5 md:p-8 space-y-6 animate-in fade-in duration-300">
          
          {/* Top Panel Controls */}
          <div className="bg-[#0b1424] border border-indigo-950 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs">
            <button
              onClick={() => {
                if (confirm('Deseja realmente abandonar o exame atual de treino? Seu progresso nesta sessão será descartado.')) {
                  setActiveMode('menu');
                  if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
                }
              }}
              className="text-slate-400 hover:text-white flex items-center gap-1 font-bold tracking-tight py-1.5 px-3 bg-[#111e33] rounded-lg hover:bg-[#1a2c49] transition border border-indigo-950 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Abandonar Treino
            </button>

            {/* Subject Info or Mode Tag */}
            <div className="text-center sm:text-left space-y-0.5 max-w-md">
              <span className="bg-indigo-500/20 text-indigo-300 text-[9px] font-black tracking-wider uppercase font-mono px-2 py-0.5 rounded border border-indigo-950">
                {activeMode === 'simulado_oficial' ? '📊 SIMULADO OFICIAL DETRAN' : activeMode === 'treino_rapido' ? '🎯 TREINO RÁPIDO' : '📚 TREINO SETORIAL'}
              </span>
              <h5 className="font-bold text-slate-200 mt-1">
                {activeMode === 'treino_materia' 
                  ? `Materia: ${MATERIAS_DETRAN[selectedMateriaFiltro].nome}` 
                  : 'Exame de simulação com matérias mistas'}
              </h5>
            </div>

            {/* Time countdown and final submission button */}
            <div className="flex items-center gap-3 shrink-0">
              {activeMode === 'simulado_oficial' && (
                <div className="bg-[#1f171e]/70 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-rose-450 font-mono font-bold animate-pulse">
                  <Clock className="h-4 w-4 text-rose-500" />
                  <span className="text-sm">{formatTime(timeLeft)}</span>
                </div>
              )}

              <button
                onClick={() => {
                  if (confirm('Deseja realmente finalizar o exame atual e ver o resultado geral de acertos?')) {
                    handleSubmitExam();
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold tracking-tight px-4.5 py-1.5 rounded-lg transition shadow flex items-center gap-1 hover:scale-102 cursor-pointer"
              >
                Concluir Prova
              </button>
            </div>
          </div>

          {/* Core Layout: Question Panel & Grid panel side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
            
            {/* Question Screen Card Column */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono font-medium text-slate-400">
                  <span>Progresso das Declarações</span>
                  <span>Questão {currentIdx + 1} de {questionsList.length}</span>
                </div>
                <div className="w-full bg-slate-900/60 h-2.5 rounded-full overflow-hidden border border-indigo-950/50">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-blue-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / questionsList.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Question container */}
              {(() => {
                const q = questionsList[currentIdx];
                const selectedOptionIdx = answersUser[currentIdx];
                const isFlagged = markedQuestions.has(currentIdx);
                const materiaInfo = MATERIAS_DETRAN[q.materia];

                return (
                  <div className="bg-[#0b1321] border-2 border-indigo-900/60 rounded-2xl p-6 space-y-6 shadow-xl relative overflow-hidden" id="card-questao-ativa">
                    
                    {/* Upper Metadata Info */}
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 bg-slate-950/60 rounded-lg flex items-center justify-center text-lg shadow-inner">
                          {materiaInfo.emoji}
                        </span>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none font-mono">Assunto Relacionado</span>
                          <span className={`text-[10.5px] font-bold ${materiaInfo.corTexto}`}>
                            {materiaInfo.nome}
                          </span>
                        </div>
                      </div>

                      {/* Flag button to bookmark later study */}
                      <button
                        onClick={handleToggleFlag}
                        className={`p-2 rounded-xl transition ${
                          isFlagged 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35' 
                            : 'bg-slate-900/60 text-slate-500 border border-indigo-950/40 hover:text-slate-350'
                        } flex items-center gap-1 text-[11px] font-mono cursor-pointer`}
                        title="Marcar questão com dúvida para revisar ao final"
                      >
                        <Flag className={`h-4 w-4 ${isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} />
                        <span className="hidden sm:inline">{isFlagged ? 'Marcada' : 'Revisar Depois'}</span>
                      </button>
                    </div>

                    {/* Question Body Text */}
                    <div className="space-y-3">
                      <span className="text-xs text-indigo-400 font-extrabold font-mono uppercase tracking-wider block">
                        Pergunta Oficial {currentIdx + 1}:
                      </span>
                      <h4 className="text-sm md:text-[15px] font-extrabold text-white leading-relaxed">
                        {q.pergunta}
                      </h4>
                    </div>

                    {/* Interactive Selection Buttons */}
                    <div className="space-y-3 pt-2">
                      {q.opcoes.map((opcaoItem, rIdx) => {
                        const isChosen = selectedOptionIdx === rIdx;
                        const letra = ['A', 'B', 'C', 'D'][rIdx];

                        // Immediate feedback check ONLY for offline training modes (NOT for Simulado Oficial)
                        const showImmediateFeedback = activeMode !== 'simulado_oficial' && selectedOptionIdx !== undefined;
                        const isCorrectOption = rIdx === q.correta;
                        const wasChosenCorrectly = showImmediateFeedback && isChosen && isCorrectOption;
                        const wasChosenIncorretamente = showImmediateFeedback && isChosen && !isCorrectOption;

                        let btnClasses = 'border-indigo-950 hover:bg-[#101c30] text-slate-300';
                        let badgeCircle = 'bg-slate-900/80 text-slate-450 border-indigo-950/60';

                        if (isChosen && activeMode === 'simulado_oficial') {
                          // Standard locking but no answers immediate exposure
                          btnClasses = 'border-indigo-500 bg-[#12233c] text-white';
                          badgeCircle = 'bg-indigo-600 text-white border-indigo-400/30';
                        } 
                        else if (showImmediateFeedback) {
                          if (isCorrectOption) {
                            btnClasses = 'border-emerald-500/40 bg-emerald-950/15 text-emerald-300';
                            badgeCircle = 'bg-emerald-600 text-white border-emerald-400/30';
                          } else if (isChosen && !isCorrectOption) {
                            btnClasses = 'border-red-500/30 bg-red-950/10 text-rose-450';
                            badgeCircle = 'bg-red-600 text-white border-red-400/20';
                          }
                        } else if (isChosen) {
                          btnClasses = 'border-indigo-500 bg-[#12233c] text-white';
                          badgeCircle = 'bg-indigo-600 text-white border-indigo-400/30';
                        }

                        return (
                          <button
                            key={rIdx}
                            onClick={() => !showImmediateFeedback && handleSelectOption(rIdx)}
                            disabled={showImmediateFeedback}
                            className={`w-full p-4 rounded-xl border text-left flex gap-3 items-center group transition-all duration-200 cursor-pointer ${btnClasses}`}
                            id={`opt-btn-${currentIdx}-${rIdx}`}
                          >
                            <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center font-mono font-bold text-xs border ${badgeCircle}`}>
                              {letra}
                            </span>
                            <span className="text-[12.5px] md:text-xs leading-normal">
                              {opcaoItem}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanatory pedagogical block shown dynamically ONLY in non-official training mode immediately */}
                    {activeMode !== 'simulado_oficial' && selectedOptionIdx !== undefined && (
                      <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex gap-1.5 items-center text-xs">
                          {selectedOptionIdx === q.correta ? (
                            <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" /> Resposta Correta!
                            </span>
                          ) : (
                            <span className="text-rose-450 font-extrabold flex items-center gap-1">
                              <XCircle className="h-4 w-4" /> Você Errou!
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-355 leading-relaxed text-left font-sans italic">
                          <strong>Justificativa do CTB:</strong> {q.explicacao}
                        </p>
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* Prev / Next Navigation buttons */}
              <div className="flex justify-between items-center gap-4">
                <button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                  disabled={currentIdx === 0}
                  className="px-4.5 py-2 whitespace-nowrap bg-slate-905 bg-[#0d1726]/80 text-slate-300 hover:text-white border border-indigo-950 rounded-xl disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-900 transition flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>

                {currentIdx < questionsList.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    className="px-5 py-2 whitespace-nowrap bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl hover:scale-101 transition flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="text-slate-450 text-[10px] font-mono bg-indigo-950/20 px-3 py-1.5 rounded-lg border border-indigo-950/40">
                    🏁 Última Questão (Clique em Concluir no painel de cima)
                  </span>
                )}
              </div>

            </div>

            {/* Grid Map Column (Right-sided interactive panel) */}
            <div className="lg:col-span-4 bg-[#0a1424] border border-indigo-950 rounded-2xl p-5 space-y-4 shadow-md sticky top-6">
              <div className="border-b border-indigo-950 pb-2.5">
                <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1">
                  <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                  Mapa do Simulado
                </h5>
                <p className="text-[10px] text-slate-450 mt-1">
                  Navegue rapidamente tocando nas dezenas de questões abaixo:
                </p>
              </div>

              {/* Badges Grid layout */}
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                {questionsList.map((_, idx) => {
                  const isAnswered = answersUser[idx] !== undefined;
                  const isCurrent = idx === currentIdx;
                  const isFlagged = markedQuestions.has(idx);

                  let badgeClasses = 'border-indigo-950/60 bg-[#0e1624] text-slate-400 hover:border-indigo-500';
                  
                  if (isCurrent) {
                    badgeClasses = 'border-indigo-500 bg-indigo-600 text-white ring-2 ring-indigo-400/20';
                  } else if (isFlagged) {
                    badgeClasses = 'border-amber-500/50 bg-amber-500/10 text-amber-300';
                  } else if (isAnswered) {
                    badgeClasses = 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`h-9 w-full rounded-lg border flex items-center justify-center font-mono font-bold text-xs transition cursor-pointer ${badgeClasses}`}
                      title={`Pular para Questão ${idx + 1}`}
                      id={`grid-badge-${idx}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legenda dos Blocos */}
              <div className="pt-3 border-t border-indigo-950/60 space-y-2 text-[10px] text-slate-400">
                <p className="font-mono uppercase text-[9px] text-slate-450 font-bold tracking-wider">Legenda de Cores:</p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-600 border border-indigo-500 shrink-0"></span>
                    <span>Atual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30 shrink-0"></span>
                    <span>Preenchida</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/30 shrink-0"></span>
                    <span>Rever Depois (Flag)</span>
                  </div>
                </div>
              </div>

              {/* Informative advice */}
              {activeMode === 'simulado_oficial' && (
                <div className="p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl space-y-1.5">
                  <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wide block font-mono flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> REGRAS DE PROVA DE DETRAN:
                  </span>
                  <ul className="list-disc list-inside space-y-1 leading-normal text-[9.5px] text-slate-400">
                    <li>30 Questões aleatórias misturadas.</li>
                    <li>Sua aprovação exige no mínimo 21 corretos.</li>
                    <li>O gabarito completo e justificativas serão exibidos ao terminar.</li>
                  </ul>
                </div>
              )}

            </div>

          </div>

        </div>
      )}

      {/* ======================= CASE 3: GRAPHICAL RESULTS DISPLAY ======================= */}
      {showResults && performanceByCategory && (
        <div className="p-6 md:p-8 space-y-8 animate-in zoom-in-95 duration-300">
          
          {/* Header Performance Feedback */}
          {(() => {
            const total = questionsList.length;
            let acertos = 0;
            questionsList.forEach((q, idx) => {
              if (answersUser[idx] === q.correta) acertos++;
            });

            const percent = Math.round((acertos / total) * 100);
            const taxaCorte = activeMode === 'simulado_oficial' ? 0.7 : 0.6;
            const aprovado = (acertos / total) >= taxaCorte;

            return (
              <div className="space-y-6">
                
                {/* Result Card Banner */}
                <div className={`p-6 md:p-8 rounded-2.5xl border-2 text-center space-y-4 relative overflow-hidden ${
                  aprovado 
                    ? 'bg-gradient-to-r from-emerald-505/15 via-emerald-500/10 to-teal-500/10 border-emerald-500/40 text-emerald-300' 
                    : 'bg-gradient-to-r from-rose-505/15 via-red-950/10 to-rose-950/10 border-red-500/30 text-rose-400'
                }`}>
                  <span className="text-4.5xl animate-bounce block">
                    {aprovado ? '🏆🎖️🎓' : '🤕📚📝'}
                  </span>
                  
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest font-mono uppercase opacity-75">
                      {activeMode === 'simulado_oficial' ? 'RESULTADO OFICIAL DE PROVA SIMULADA' : 'TREINO CONCLUÍDO'}
                    </span>
                    <h4 className="text-xl md:text-2.5xl font-black text-white">
                      {aprovado 
                        ? 'Parabéns! Você Passaria Direto no DETRAN real!' 
                        : 'Quase lá! Continue exercitando para fixar a teoria!'
                      }
                    </h4>
                  </div>

                  {/* Main Score Wheel */}
                  <div className="flex justify-center items-center gap-6 py-2">
                    <div className="text-center">
                      <span className="text-4xl md:text-5xl font-black text-white block font-mono">
                        {acertos} <span className="text-slate-500 text-lg font-bold font-sans">/ {total}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                        Questões Corretas ({percent}%)
                      </span>
                    </div>

                    <div className="w-px h-12 bg-indigo-950/80"></div>

                    <div className="text-left py-1 text-xs text-slate-300">
                      {activeMode === 'simulado_oficial' ? (
                        <>
                          <p>• Nota Mínima para Aprovação: <strong>21 Acertos (70%)</strong></p>
                          <p>• Horário do Exame: <strong>{startTimeString}</strong></p>
                        </>
                      ) : (
                        <>
                          <p>• Módulo de Prática Avançado</p>
                          <p>• Sem restrição de limite temporal</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Visual Status Tag badge */}
                  <div className="flex justify-center gap-2">
                    {aprovado ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-4 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                        STATUS: APROVADO COORTETEMENTE ✓
                      </span>
                    ) : (
                      <span className="bg-red-500/20 text-rose-300 border border-red-500/30 px-4 py-1 rounded-full text-xs font-black uppercase font-mono tracking-wider">
                        STATUS: REPROVADO • ESTUDE MAIS ⚠️
                      </span>
                    )}
                  </div>
                </div>

                {/* Subcategory breakdown diagnostics graphs bar */}
                <div className="space-y-4 text-left">
                  <h5 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-400" />
                    Diagnóstico de Acerto por Unidade Curricular
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {(Object.keys(performanceByCategory) as MateriaId[]).map((mId) => {
                      const item = performanceByCategory[mId];
                      const mInfo = MATERIAS_DETRAN[mId];
                      if (item.total === 0) return null; // No questions from this category in smaller test sets

                      const pPercent = Math.round((item.acertos / item.total) * 100);
                      const isPassingSub = pPercent >= 70;

                      return (
                        <div 
                          key={mId}
                          className="bg-[#0b1321] border border-indigo-950 p-4 rounded-xl flex flex-col justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl shrink-0">{mInfo.emoji}</span>
                            <span className="font-extrabold text-white leading-tight block">{mInfo.nome}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-450 font-mono font-bold">
                              <span>{item.acertos} de {item.total} acertos</span>
                              <span className={isPassingSub ? 'text-emerald-400' : 'text-amber-400'}>{pPercent}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-350 ${isPassingSub ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                style={{ width: `${pPercent}%` }}
                              ></div>
                            </div>
                          </div>

                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded text-center border font-mono ${
                            isPassingSub 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          }`}>
                            {isPassingSub ? 'Domínio Alto' : 'Exige Cuidado'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 🎯 CORE RETRY BUTTONS ACTIONS */}
                <div className="flex flex-wrap gap-3 items-center pt-2">
                  <button
                    onClick={() => handleStartQuiz(activeMode, selectedMateriaFiltro)}
                    className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-2.5 rounded-xl transition shadow flex items-center gap-2 hover:scale-101 border-0 cursor-pointer"
                  >
                    <RotateCcw className="h-4.5 w-4.5" /> Refazer Mesmo Simulado
                  </button>

                  <button
                    onClick={() => setActiveMode('menu')}
                    className="bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white font-bold px-6 py-2.5 rounded-xl border border-indigo-950 hover:border-indigo-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar ao Menu Principal
                  </button>
                </div>

                {/* 📖 DEEP REVIEW AND EXPLANATIONS OF THE COMPLETED TEST QUESTIONS */}
                <div className="space-y-4 pt-4 border-t border-indigo-950 text-left">
                  <h5 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono flex items-center gap-2">
                    <Eye className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
                    Análise e Correção Questão por Questão:
                  </h5>
                  <p className="text-[11px] text-slate-450 leading-relaxed max-w-2xl">
                    Revise as dezenas de questões respondidas abaixo com a indicação da resposta da legislação oficial, o que você assinalou, e o fundamentação comentada para fixar para sempre:
                  </p>

                  <div className="space-y-4">
                    {questionsList.map((q, idx) => {
                      const ansIndex = answersUser[idx];
                      const isCorrect = ansIndex === q.correta;
                      const mInfo = MATERIAS_DETRAN[q.materia];

                      return (
                        <div 
                          key={q.id || idx}
                          className={`p-5 rounded-2xl border-2 space-y-4 text-xs font-sans ${
                            isCorrect 
                              ? 'bg-[#09161a] border-emerald-500/20 text-slate-200' 
                              : 'bg-[#150f16] border-red-500/20 text-slate-200'
                          }`}
                        >
                          {/* Subject Tag Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-950/40 pb-2">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="text-base select-none">{mInfo.emoji}</span>
                              <span className={`${mInfo.corTexto} text-[11px]`}>{mInfo.nome}</span>
                              <span className="text-slate-550 text-[10px] font-mono">• Questão {idx + 1}</span>
                            </div>

                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase font-mono tracking-wider border border-emerald-500/30">
                                ✓ VOCÊ ACERTOU
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-red-500/10 text-rose-450 text-[10px] font-black uppercase font-mono tracking-wider border border-red-500/20">
                                ✗ VOCÊ ERROU
                              </span>
                            )}
                          </div>

                          {/* Question formulation */}
                          <p className="font-extrabold text-sm text-white leading-relaxed">
                            {q.pergunta}
                          </p>

                          {/* Answer block review list */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            {q.opcoes.map((opcaoItem, oIdx) => {
                              const letra = ['A', 'B', 'C', 'D'][oIdx];
                              const isThisCorrectOption = oIdx === q.correta;
                              const isThisChosenOption = ansIndex === oIdx;

                              let listClasses = 'border-indigo-950 bg-[#070e17]/40 text-slate-400';
                              if (isThisCorrectOption) {
                                listClasses = 'border-emerald-500/30 bg-emerald-905 bg-emerald-950/15 text-emerald-300 font-bold';
                              } else if (isThisChosenOption && !isThisCorrectOption) {
                                listClasses = 'border-red-500/30 bg-red-950/15 text-rose-400 font-bold';
                              }

                              return (
                                <div 
                                  key={oIdx}
                                  className={`p-3 rounded-lg border flex gap-2 items-center ${listClasses}`}
                                >
                                  <span className={`w-5.5 h-5.5 shrink-0 rounded-full flex items-center justify-center font-mono font-bold text-[10px] border ${
                                    isThisCorrectOption 
                                      ? 'bg-emerald-600 text-white border-emerald-400/40' 
                                      : isThisChosenOption 
                                        ? 'bg-red-650 bg-red-600 text-white' 
                                        : 'bg-slate-900/60 text-slate-500 border-indigo-950/30'
                                  }`}>
                                    {letra}
                                  </span>
                                  <span className="text-[11px] leading-tight">{opcaoItem}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Pedagogical comment footer */}
                          <div className="p-3.5 bg-[#0e1624] border border-indigo-950/80 rounded-xl">
                            <p className="text-[11px] text-slate-350 leading-relaxed font-sans italic">
                              <strong>Explanação e Solução do Gabarito:</strong> {q.explicacao}
                            </p>
                          </div>

                        </div>
                      );
                    })}
                  </div>

                </div>

              </div>
            );
          })()}

        </div>
      )}

    </div>
  );
}
