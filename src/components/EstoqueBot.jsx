import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader, ChevronDown } from 'lucide-react';
import Groq from 'groq-sdk';
import { supabase } from '../supabaseClient';
import { useAuth } from '../App';

export default function EstoqueBot({ addAlerta }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', content: "Você é o Assistente Virtual do Estoque da Cell Express. Responda em português, de forma concisa e direta. Quando o usuário pedir para buscar, adicionar, alterar estoque ou listar pedidos, USE AS FERRAMENTAS ('tools') fornecidas. Nunca invente dados do estoque, apenas baseie-se nos resultados das ferramentas." },
    { role: 'assistant', content: 'Olá! Sou seu Assistente IA de Estoque. Posso pesquisar produtos, adicionar novos, alterar quantidades ou gerar listas de pedidos. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const [groq, setGroq] = useState(null);

  useEffect(() => {
    // Initialize Groq AI client
    // user said they added groq api key to project, probably VITE_GROQ_API_KEY
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY; 
    if (apiKey) {
      setGroq(new Groq({ apiKey, dangerouslyAllowBrowser: true }));
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Define tools for the AI (OpenAI format)
  const tools = [
    {
      type: 'function',
      function: {
        name: 'buscar_produto',
        description: 'Busca produtos no estoque pelo nome. Retorna a lista de produtos encontrados com suas quantidades e preços.',
        parameters: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome ou parte do nome do produto' }
          },
          required: ['nome']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'adicionar_produto',
        description: 'Cria/Adiciona um novo produto ao banco de dados de estoque.',
        parameters: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome do produto' },
            categoria: { type: 'string', description: 'Categoria (ex: peca, acessorio, insumo)' },
            quantidade: { type: 'integer', description: 'Quantidade atual em estoque' },
            quantidade_minima: { type: 'integer', description: 'Quantidade mínima ideal para o estoque' },
            preco_custo: { type: 'number', description: 'Preço de custo unitário em reais' },
            preco_venda: { type: 'number', description: 'Preço de venda sugerido em reais' }
          },
          required: ['nome', 'quantidade', 'preco_custo']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'atualizar_estoque',
        description: 'Atualiza (edita) a quantidade em estoque de um produto existente.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'ID numérico do produto' },
            nova_quantidade: { type: 'integer', description: 'Nova quantidade total em estoque' }
          },
          required: ['id', 'nova_quantidade']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'gerar_lista_pedidos',
        description: 'Analisa o estoque e retorna uma lista de todos os produtos cuja quantidade atual está abaixo ou igual à quantidade mínima (precisam ser comprados/repostos).',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    }
  ];

  const executeTool = async (call) => {
    const args = JSON.parse(call.function.arguments);
    switch (call.function.name) {
      case 'buscar_produto': {
        const { data, error } = await supabase.from('estoque').select('*').ilike('nome', `%${args.nome}%`);
        if (error) throw error;
        return data;
      }
      case 'adicionar_produto': {
        const payload = {
          nome: args.nome,
          categoria: args.categoria || 'peca',
          quantidade: args.quantidade,
          quantidade_minima: args.quantidade_minima || 0,
          preco_custo: args.preco_custo,
          preco_venda: args.preco_venda || (args.preco_custo * 2)
        };
        const { data, error } = await supabase.from('estoque').insert([payload]).select();
        if (error) throw error;

        // Registrar atividade
        await supabase.from('atividades').insert([{
          tipo: 'adicao_estoque',
          descricao: `[IA Assistente] Adicionou ${args.quantidade}x ${args.nome} ao estoque.`,
          id_usuario: user?.id,
          valor: args.preco_custo * args.quantidade,
          status: 'concluido'
        }]);

        return { success: true, message: 'Produto adicionado com sucesso', produto: data[0] };
      }
      case 'atualizar_estoque': {
        const { data: itemData, error: findError } = await supabase.from('estoque').select('*').eq('id', args.id).single();
        if (findError) throw findError;

        const { data, error } = await supabase.from('estoque').update({ quantidade: args.nova_quantidade }).eq('id', args.id).select();
        if (error) throw error;

        // Registrar atividade
        await supabase.from('atividades').insert([{
          tipo: 'edicao_estoque',
          descricao: `[IA Assistente] Alterou estoque de ${itemData.nome} de ${itemData.quantidade} para ${args.nova_quantidade}.`,
          id_usuario: user?.id,
          status: 'concluido'
        }]);

        return { success: true, message: 'Estoque atualizado com sucesso', produto: data[0] };
      }
      case 'gerar_lista_pedidos': {
        const { data: allData, error: errAll } = await supabase.from('estoque').select('*');
        if (errAll) throw errAll;
        const faltantes = allData.filter(item => item.quantidade <= (item.quantidade_minima || 0));
        return { total_items_precisando_reposicao: faltantes.length, itens: faltantes };
      }
      default:
        throw new Error(`Tool ${call.function.name} not found`);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !groq) {
      if (!groq && addAlerta) addAlerta('A chave da API Groq (VITE_GROQ_API_KEY) não está configurada no arquivo .env.', 'error');
      return;
    }

    const userMessage = input;
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let currentMessages = [...newMessages];
      
      let response = await groq.chat.completions.create({
        model: 'llama3-70b-8192',
        messages: currentMessages,
        tools: tools,
        tool_choice: 'auto',
        max_tokens: 1024
      });

      let responseMessage = response.choices[0].message;

      // Handle function calls
      while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        currentMessages.push(responseMessage); // Add the assistant's tool call message
        
        for (const call of responseMessage.tool_calls) {
          try {
            const result = await executeTool(call);
            currentMessages.push({
              tool_call_id: call.id,
              role: 'tool',
              name: call.function.name,
              content: JSON.stringify(result)
            });
          } catch (error) {
            console.error("Tool execution error:", error);
            currentMessages.push({
              tool_call_id: call.id,
              role: 'tool',
              name: call.function.name,
              content: JSON.stringify({ error: error.message })
            });
          }
        }
        
        // Get the final response from Groq after tool results
        response = await groq.chat.completions.create({
          model: 'llama3-70b-8192',
          messages: currentMessages,
          tools: tools,
          tool_choice: 'auto',
          max_tokens: 1024
        });
        
        responseMessage = response.choices[0].message;
      }

      setMessages(prev => [...currentMessages, responseMessage]);

    } catch (error) {
      console.error("Chat erro:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Desculpe, ocorreu um erro ao se comunicar com a IA da Groq." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-color, #FFD700)',
            color: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: 'none',
            boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
            cursor: 'pointer',
            zIndex: 1000,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)'; }}
        >
          <Bot size={30} />
        </button>
      )}

      {/* Janela de Chat */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '380px',
          height: '550px',
          backgroundColor: 'var(--bg-elevated, #1a1a1a)',
          borderRadius: '16px',
          border: '1px solid var(--border-color, #2a2a2a)',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: 'var(--bg-primary, #0a0a0a)',
            borderBottom: '1px solid var(--border-color, #2a2a2a)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(255, 215, 0, 0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--accent-color, #FFD700)' }}>
                <Bot size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#fff' }}>Assistente de Estoque</h3>
                <span style={{ fontSize: '11px', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-color)' }}></span> Online (Groq)
                </span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary, #A0A0A0)', cursor: 'pointer', padding: '4px' }}>
              <ChevronDown size={24} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {!groq && (
              <div style={{ padding: '12px', backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid #FF4444', borderRadius: '8px', color: '#FF4444', fontSize: '13px' }}>
                <strong>Atenção:</strong> A chave da API do Groq (VITE_GROQ_API_KEY) não foi encontrada. O bot não conseguirá responder.
              </div>
            )}
            
            {messages.filter(m => m.role !== 'system' && m.role !== 'tool' && !m.tool_calls).map((msg, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: '10px',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end'
              }}>
                {msg.role !== 'user' && (
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,215,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                    <Bot size={16} color="var(--accent-color, #FFD700)" />
                  </div>
                )}
                
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: msg.role === 'user' ? 'var(--accent-color, #FFD700)' : '#2a2a2a',
                  color: msg.role === 'user' ? '#000' : '#e0e0e0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,215,0,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Bot size={16} color="var(--accent-color, #FFD700)" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', backgroundColor: '#2a2a2a', color: 'var(--text-secondary)' }}>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            padding: '16px',
            backgroundColor: 'var(--bg-primary, #0a0a0a)',
            borderTop: '1px solid var(--border-color, #2a2a2a)'
          }}>
            <form onSubmit={e => { e.preventDefault(); handleSendMessage(); }} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ex: Buscar tela do iPhone 13..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  borderRadius: '24px',
                  border: '1px solid var(--border-color, #333)',
                  backgroundColor: '#141414',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-color, #333)'}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: input.trim() && !isLoading ? 'var(--accent-color, #FFD700)' : '#2a2a2a',
                  color: input.trim() && !isLoading ? '#000' : '#555',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                  transition: '0.2s',
                  flexShrink: 0
                }}
              >
                <Send size={20} style={{ marginLeft: '2px', transform: 'rotate(-5deg)' }} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
