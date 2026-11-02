import nodemailer from 'nodemailer';

// Configuração do transporte de email
// Para desenvolvimento, podemos usar serviços como Gmail, ou configurar SMTP
const createTransporter = () => {
  // Se as variáveis de ambiente estiverem configuradas, usa-as
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
      auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      } : undefined
    });
  }
  
  // Caso contrário, retorna null (emails não serão enviados, mas não quebram a aplicação)
  // Em produção, configure as variáveis de ambiente:
  // EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS
  return null;
};

/**
 * Envia um email de notificação
 * @param {string} destinatario - Email do destinatário
 * @param {string} assunto - Assunto do email
 * @param {string} corpoHTML - Corpo do email em HTML
 * @returns {Promise<Object>} - Resultado do envio
 */
export const enviarEmail = async (destinatario, assunto, corpoHTML) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.error(
        '[email] Transporter NÃO configurado. Verifique as variáveis de ambiente. ' +
        `EMAIL_HOST=${process.env.EMAIL_HOST ? 'definido' : 'AUSENTE'}, ` +
        `EMAIL_PORT=${process.env.EMAIL_PORT ? 'definido' : 'AUSENTE'}, ` +
        `EMAIL_USER=${process.env.EMAIL_USER ? 'definido' : 'AUSENTE'}, ` +
        `EMAIL_PASS=${process.env.EMAIL_PASS ? 'definido' : 'AUSENTE'}`
      );
      return { sucesso: false, erro: 'Serviço de email não configurado' };
    }

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Sistema RPVI" <noreply@rpvi.com>',
      to: destinatario,
      subject: assunto,
      html: corpoHTML,
      text: corpoHTML.replace(/<[^>]*>/g, '') // Versão texto simples
    });

    console.log(`[email] Enviado para ${destinatario} (messageId: ${info.messageId})`);
    return { sucesso: true, messageId: info.messageId };
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    // Não lança erro para não quebrar o fluxo principal
    // A notificação será criada mesmo se o email falhar
    return { sucesso: false, erro: error.message };
  }
};

/**
 * Envia email de notificação de nova prova
 * @param {string} destinatario - Email do destinatário
 * @param {string} nomeDestinatario - Nome do destinatário
 * @param {Object} prova - Dados da prova
 * @returns {Promise<Object>} - Resultado do envio
 */
export const enviarEmailNovaProva = async (destinatario, nomeDestinatario, prova) => {
  const assunto = `Nova Prova: ${prova.titulo}`;
  
  const formatoLabel = {
    'QUESTIONARIO_ONLINE': 'Questionário Online',
    'PROVA_PRATICA': 'Prova Prática',
    'PROVA_ESCRITA': 'Prova Escrita'
  };

  const dataInicio = new Date(prova.data_inicio).toLocaleString('pt-BR');
  const dataFim = prova.data_fim ? new Date(prova.data_fim).toLocaleString('pt-BR') : 'Não definida';

  const corpoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .prova-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .prova-titulo { font-size: 24px; font-weight: bold; color: #1e40af; margin-bottom: 10px; }
        .prova-descricao { color: #4b5563; margin: 15px 0; }
        .prova-info { margin: 10px 0; }
        .prova-info strong { color: #374151; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎯 Nova Prova Disponível!</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
          <p>Uma nova prova foi criada na gincana e está disponível para você.</p>
          
          <div class="prova-card">
            <div class="prova-titulo">${prova.titulo}</div>
            <div class="prova-descricao">${prova.descricao}</div>
            <div class="prova-info">
              <strong>Formato:</strong> ${formatoLabel[prova.formato] || prova.formato}
            </div>
            <div class="prova-info">
              <strong>Data de Início:</strong> ${dataInicio}
            </div>
            <div class="prova-info">
              <strong>Data de Término:</strong> ${dataFim}
            </div>
          </div>
          
          <p>Acesse o sistema para ver mais detalhes e se inscrever na prova.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/provas" class="button">Ver Prova</a>
          </div>
        </div>
        <div class="footer">
          <p>Esta é uma mensagem automática do Sistema RPVI. Por favor, não responda este email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail(destinatario, assunto, corpoHTML);
};

/**
 * Envia email de notificação de novo feedback para ADMIN
 * @param {string} destinatario - Email do administrador
 * @param {string} nomeDestinatario - Nome do administrador
 * @param {Object} feedback - Dados do feedback
 * @param {Object} usuarioAutor - Dados do usuário que enviou o feedback
 * @returns {Promise<Object>} - Resultado do envio
 */
export const enviarEmailNovoFeedback = async (destinatario, nomeDestinatario, feedback, usuarioAutor) => {
  const assunto = `Novo Feedback Recebido`;
  
  const dataFeedback = new Date(feedback.criado_em).toLocaleString('pt-BR');
  // Limita a descrição para 200 caracteres no email
  const descricaoResumida = feedback.descricao.length > 200 
    ? feedback.descricao.substring(0, 200) + '...' 
    : feedback.descricao;

  const corpoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .feedback-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #ec4899; }
        .feedback-titulo { font-size: 20px; font-weight: bold; color: #be185d; margin-bottom: 15px; }
        .feedback-descricao { color: #4b5563; margin: 15px 0; background: #f9fafb; padding: 15px; border-radius: 6px; }
        .feedback-info { margin: 10px 0; color: #6b7280; }
        .feedback-info strong { color: #374151; }
        .button { display: inline-block; background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 Novo Feedback Recebido</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
          <p>Um novo feedback foi enviado no sistema e está aguardando sua análise.</p>
          
          <div class="feedback-card">
            <div class="feedback-titulo">Feedback de ${usuarioAutor.nome}</div>
            <div class="feedback-info">
              <strong>Autor:</strong> ${usuarioAutor.nome} (${usuarioAutor.email})
            </div>
            <div class="feedback-info">
              <strong>Tipo:</strong> ${usuarioAutor.tipo || 'Usuário'}
            </div>
            <div class="feedback-info">
              <strong>Data:</strong> ${dataFeedback}
            </div>
            <div class="feedback-descricao">
              <strong>Mensagem:</strong><br>
              ${descricaoResumida.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p>Acesse o sistema para analisar e responder este feedback.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/feedbacks" class="button">Ver Feedback</a>
          </div>
        </div>
        <div class="footer">
          <p>Esta é uma mensagem automática do Sistema RPVI. Por favor, não responda este email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail(destinatario, assunto, corpoHTML);
};

/**
 * Envia email de notificação de feedback respondido para o usuário que enviou
 * @param {string} destinatario - Email do usuário que enviou o feedback
 * @param {string} nomeDestinatario - Nome do usuário
 * @param {Object} feedback - Dados do feedback respondido
 * @param {Object} admin - Dados do administrador que respondeu
 * @returns {Promise<Object>} - Resultado do envio
 */
export const enviarEmailFeedbackRespondido = async (destinatario, nomeDestinatario, feedback, admin) => {
  const assunto = `Seu feedback foi respondido`;
  
  const dataResposta = new Date().toLocaleString('pt-BR');
  // Limita a resposta para 300 caracteres no email
  const respostaResumida = feedback.resposta_admin.length > 300 
    ? feedback.resposta_admin.substring(0, 300) + '...' 
    : feedback.resposta_admin;

  const corpoHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .feedback-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #10b981; }
        .resposta-card { background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .feedback-titulo { font-size: 20px; font-weight: bold; color: #059669; margin-bottom: 15px; }
        .resposta-titulo { font-size: 18px; font-weight: bold; color: #059669; margin-bottom: 10px; }
        .resposta-texto { color: #374151; margin: 10px 0; line-height: 1.8; }
        .feedback-info { margin: 10px 0; color: #6b7280; }
        .feedback-info strong { color: #374151; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Feedback Respondido</h1>
        </div>
        <div class="content">
          <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
          <p>Seu feedback foi analisado e respondido pela administração.</p>
          
          <div class="feedback-card">
            <div class="feedback-titulo">Resposta da Administração</div>
            <div class="feedback-info">
              <strong>Respondido por:</strong> ${admin.nome || 'Administrador'}
            </div>
            <div class="feedback-info">
              <strong>Data da resposta:</strong> ${dataResposta}
            </div>
          </div>
          
          <div class="resposta-card">
            <div class="resposta-titulo">Resposta:</div>
            <div class="resposta-texto">
              ${respostaResumida.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p>Acesse o sistema para ver a resposta completa e todos os seus feedbacks.</p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/meus-feedbacks" class="button">Ver Meus Feedbacks</a>
          </div>
        </div>
        <div class="footer">
          <p>Esta é uma mensagem automática do Sistema RPVI. Por favor, não responda este email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await enviarEmail(destinatario, assunto, corpoHTML);
};

// Nomes de equipe e de pessoa são digitados por usuários: escapados antes de
// entrar no HTML do email.
export const escaparHtml = (texto) => String(texto ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const MEDALHA_EMOJI = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Assunto e HTML do email de resultado final da gincana, para o coordenador
 * de uma equipe. Função pura (testável); quem envia é enviarEmailResultadoFinal.
 *
 * Layout em tabelas e estilos inline: é o que Gmail e Outlook renderizam de
 * forma confiável (sem <style>, flexbox ou gradiente).
 *
 * @param {Object} dados
 * @param {string} dados.nomeDestinatario
 * @param {string} dados.nomeEquipe
 * @param {string|null} dados.corEquipe
 * @param {number} dados.posicao
 * @param {number} dados.totalEquipes
 * @param {number|null} dados.pontos null quando a gincana não mostra notas
 * @param {string[]} dados.empatadaCom nomes das outras equipes na mesma posição
 * @param {{posicao: number, nome: string}[]} dados.podio
 * @param {string} dados.gincanaNome
 * @param {number} dados.gincanaAno
 * @param {string|null} dados.escolaNome
 * @param {{emoji: string, cor: string, corTexto: string, corNoBranco: string, titulo: string, frase: string}} dados.mensagem
 * @param {string} dados.linkCerimonia
 * @returns {{assunto: string, html: string}}
 */
export const montarEmailResultadoFinal = (dados) => {
  const {
    nomeDestinatario, nomeEquipe, corEquipe, posicao, totalEquipes, pontos,
    empatadaCom = [], podio = [], gincanaNome, gincanaAno, escolaNome, mensagem, linkCerimonia,
  } = dados;
  const e = escaparHtml;

  const assunto = posicao === 1
    ? `${mensagem.emoji} ${nomeEquipe} é a equipe campeã — ${gincanaNome}`
    : `${mensagem.emoji} ${nomeEquipe} ficou em ${posicao}º lugar — ${gincanaNome}`;

  const empate = empatadaCom.length > 0
    ? `<p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Empatada com ${e(empatadaCom.join(', '))}</p>`
    : '';
  const linhaPontos = pontos !== null && pontos !== undefined
    ? `<p style="margin:8px 0 0;font-size:16px;color:#374151;"><strong>${e(Number(pontos).toLocaleString('pt-BR'))}</strong> pontos</p>`
    : '';

  const linhasPodio = podio.map((item) => `
              <tr>
                <td style="padding:6px 0;font-size:15px;color:#111827;">
                  ${MEDALHA_EMOJI[item.posicao] || ''}&nbsp; <strong>${item.posicao}º</strong>&nbsp; ${e(item.nome)}
                </td>
              </tr>`).join('');

  const contexto = [e(gincanaNome), e(gincanaAno), escolaNome ? e(escolaNome) : null].filter(Boolean).join(' · ');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${e(assunto)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td align="center" bgcolor="${mensagem.cor}" style="background:${mensagem.cor};padding:36px 24px;color:${mensagem.corTexto};">
            <div style="font-size:56px;line-height:1;">${mensagem.emoji}</div>
            <h1 style="margin:16px 0 4px;font-size:28px;line-height:1.2;color:${mensagem.corTexto};">${e(mensagem.titulo)}</h1>
            <p style="margin:0;font-size:14px;color:${mensagem.corTexto};">${contexto}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 28px 8px;color:#374151;font-size:16px;line-height:1.6;">
            <p style="margin:0 0 16px;">Olá, <strong>${e(nomeDestinatario)}</strong>!</p>
            <p style="margin:0;">A gincana chegou ao fim e o resultado da sua equipe já está definido:</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid ${mensagem.cor};border-radius:12px;">
              <tr><td align="center" style="padding:24px;">
                <p style="margin:0;font-size:15px;color:#6b7280;">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:6px;background:${e(corEquipe || '#9ca3af')};"></span>
                  &nbsp;${e(nomeEquipe)}
                </p>
                <p style="margin:8px 0 0;font-size:48px;line-height:1;font-weight:bold;color:${mensagem.corNoBranco};">${posicao}º lugar</p>
                <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">entre ${totalEquipes} equipes</p>
                ${empate}
                ${linhaPontos}
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px;color:#374151;font-size:16px;line-height:1.6;">
            <p style="margin:0;font-style:italic;">“${e(mensagem.frase)}”</p>
          </td>
        </tr>
        ${podio.length > 0 ? `<tr>
          <td style="padding:16px 28px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#9ca3af;">Pódio</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${linhasPodio}
            </table>
          </td>
        </tr>` : ''}
        <tr>
          <td align="center" style="padding:16px 28px 32px;">
            <a href="${e(linkCerimonia)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:8px;">Ver a cerimônia de encerramento</a>
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Esta é uma mensagem automática do Sistema de Gincana. Por favor, não responda este email.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { assunto, html };
};

/**
 * Envia o email de resultado final (ver montarEmailResultadoFinal).
 * @returns {Promise<Object>} - Resultado do envio
 */
export const enviarEmailResultadoFinal = async (destinatario, dados) => {
  const { assunto, html } = montarEmailResultadoFinal(dados);
  return await enviarEmail(destinatario, assunto, html);
};
