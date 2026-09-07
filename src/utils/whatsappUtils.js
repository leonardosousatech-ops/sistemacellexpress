// Utility for sending formatted WhatsApp messages to clients for Orders of Service (OS)
export function getCleanPhone(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }
  return digits;
}

export function formatOSWhatsAppMessage(os, client) {
  const clientName = client?.nome ? client.nome.split(' ')[0] : 'Cliente';
  
  const statusLabels = {
    'na-fila': 'Na Fila de Espera ⏳',
    'em-analise': 'Em Análise Técnica 🔬',
    'aguardando-peca': 'Aguardando Chegada de Peça 📦',
    'em-reparo': 'Em Reparo na Bancada 🔧',
    'pronto': 'Pronto para Retirada ✅',
    'entregue': 'Entregue / Concluído 🎉'
  };

  const statusText = statusLabels[os.status] || os.status;
  const dataEntradaStr = (os.data_entrada || os.dataEntrada) 
    ? new Date(os.data_entrada || os.dataEntrada).toLocaleDateString('pt-BR') 
    : new Date().toLocaleDateString('pt-BR');

  let msg = `Olá *${clientName}*! 👋\n`;
  msg += `Aqui é da assistência *CELL EXPRESS* com informações sobre a sua Ordem de Serviço:\n\n`;
  msg += `📋 *OS #${os.id}*\n`;
  msg += `📱 *Aparelho:* ${os.modelo || os.tipo_aparelho || 'Aparelho'}\n`;
  msg += `🔍 *Defeito / Serviço:* ${os.problema || 'Não informado'}\n`;
  msg += `⚡ *Status Atual:* ${statusText}\n`;
  msg += `📅 *Entrada:* ${dataEntradaStr}\n`;

  if (os.valor) {
    msg += `💰 *Valor Total:* R$ ${Number(os.valor).toFixed(2)}\n`;
  }

  if (os.status === 'pronto') {
    msg += `\n🎉 *Seu aparelho já foi finalizado e está pronto para retirada!* Você já pode vir à loja testar e retirar seu aparelho.\n`;
  }

  if (os.garantia_ate) {
    msg += `🛡️ *Garantia válida até:* ${new Date(os.garantia_ate).toLocaleDateString('pt-BR')} (90 dias de cobertura)\n`;
  }

  msg += `\nCaso tenha alguma dúvida ou queira falar conosco, basta responder a esta mensagem! 📲✨`;

  return msg;
}

export function sendOSWhatsApp(os, client) {
  const phone = getCleanPhone(client?.telefone);
  if (!phone) {
    alert('Cliente não possui telefone/WhatsApp válido cadastrado.');
    return false;
  }

  const message = formatOSWhatsAppMessage(os, client);
  const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
  return true;
}
