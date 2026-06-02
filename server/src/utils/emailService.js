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

