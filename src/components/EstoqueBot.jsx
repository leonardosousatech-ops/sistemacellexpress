import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader, ChevronDown } from 'lucide-react';
import Groq from 'groq-sdk';
import { supabase } from '../supabaseClient';
import { useAuth, useData } from '../App';

export default function EstoqueBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      role: 'system', 
      content: "Você é o Assistente Virtual do Estoque da Cell Express. Responda sempre em português, de forma amigável, clara e concisa.\n" +
               "Quando o usuário pedir para cadastrar, acrescentar, adicionar, buscar ou alterar produtos, USE AS FERRAMENTAS ('tools') fornecidas.\n" +
               "Se o usuário escrever algo como 'acrescenta tela moto g 30 vivid com aro 100', entenda 'tela moto g 30 vivid com aro' como o nome do produto e '100' como o preço de custo (ou 1 unidade caso não tenha especificado).\n" +
               "Ao adicionar um produto com sucesso, dê uma resposta curta e confirme o nome, quantidade e valores calculados."
    },
    { role: 'assistant', content: 'Olá! Sou seu Assistente IA de Estoque. Posso pesquisar produtos, adicionar novos, alterar quantidades ou gerar listas de pedidos. Como posso ajudar?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const { setEstoque, addAtividade, addAlerta } = useData?.() || {};
  const [groq, setGroq] = useState(null);

  useEffect(() => {
    // Initialize Groq AI client
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

  // Helper to call Groq with active model fallbacks
  const createChatCompletionWithFallback = async (groqClient, payload) => {
    const preferredModels = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'qwen/qwen3.6-27b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant'
    ];
    let lastError = null;

    for (const model of preferredModels) {
      try {
        return await groqClient.chat.completions.create({
          ...payload,
          model
        });
      } catch (err) {
        console.warn(`Groq model ${model} error, tentando próximo:`, err?.message || err);
        lastError = err;
      }
    }
    throw lastError;
  };

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
        description: 'Cria e cadastra um novo produto no banco de dados de estoque da loja.',
        parameters: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome do produto (ex: Tela Moto G30 Vivid com Aro)' },
            categoria: { type: 'string', description: 'Categoria (ex: peça, produto_venda, acessorio, insumo)' },
            quantidade: { type: 'integer', description: 'Quantidade a adicionar no estoque (padrão 1)' },
            estoque_minimo: { type: 'integer', description: 'Quantidade mínima para alerta de estoque baixo (padrão 5)' },
            preco_custo: { type: 'number', description: 'Preço de custo unitário em reais' },
            preco_venda: { type: 'number', description: 'Preço de venda à vista/PIX em reais' },
            preco_credito: { type: 'number', description: 'Preço no cartão de crédito (+15%)' }
          },
          required: ['nome', 'preco_custo']
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
        description: 'Analisa o estoque e retorna uma lista de todos os produtos cuja quantidade atual está abaixo ou igual ao estoque mínimo.',
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
        const custo = Number(args.preco_custo) || 0;
        const venda = Number(args.preco_venda) || (custo > 0 ? custo * 1.6 : 0);
        const credito = Number(args.preco_credito) || (venda > 0 ? venda * 1.15 : 0);
        const qtd = args.quantidade !== undefined ? Number(args.quantidade) : 1;
        const estMin = Number(args.estoque_minimo || args.quantidade_minima) || 5;

        // Determinar categoria padrão inteligente
        let categoria = args.categoria;
        if (!categoria) {
          const nomeLower = (args.nome || '').toLowerCase();
          if (nomeLower.includes('tela') || nomeLower.includes('bateria') || nomeLower.includes('conector') || nomeLower.includes('flex') || nomeLower.includes('placa') || nomeLower.includes('camera') || nomeLower.includes('câmera')) {
            categoria = 'peça';
          } else {
            categoria = 'produto_venda';
          }
        }

        const payload = {
          nome: args.nome,
          categoria: categoria,
          quantidade: qtd,
          estoque_minimo: estMin,
          preco_custo: custo,
          preco_venda: venda,
          preco_credito: credito
        };

        const { data, error } = await supabase.from('estoque').insert([payload]).select();
        if (error) {
          console.error('Erro ao inserir no estoque:', error);
          throw error;
        }

        const inserted = data[0];

        // Atualizar estado local de estoque em tempo real
        if (setEstoque && inserted) {
          setEstoque(prev => [inserted, ...(prev || [])]);
        }

        // Registrar atividade e alerta
        if (addAtividade) {
          addAtividade('Novo Item no Estoque', `[IA Assistente] Cadastrou ${args.nome} (${qtd} un - Custo: R$ ${custo.toFixed(2)})`, 'estoque');
        }
        if (addAlerta) {
          addAlerta(`"${args.nome}" adicionado ao estoque com sucesso!`, 'success');
        }

        return { 
          success: true, 
          message: `Produto '${args.nome}' cadastrado com sucesso! Quantidade: ${qtd}, Custo: R$ ${custo.toFixed(2)}, Preço PIX: R$ ${venda.toFixed(2)}, Cartão: R$ ${credito.toFixed(2)}.`, 
          produto: inserted 
        };
      }
      case 'atualizar_estoque': {
        const { data: itemData, error: findError } = await supabase.from('estoque').select('*').eq('id', args.id).single();
        if (findError) throw findError;

        const { data, error } = await supabase.from('estoque').update({ quantidade: args.nova_quantidade }).eq('id', args.id).select();
        if (error) throw error;

        const updated = data[0];
        if (setEstoque && updated) {
          setEstoque(prev => prev.map(item => item.id === args.id ? updated : item));
        }

        if (addAtividade) {
          addAtividade('Estoque Atualizado', `[IA Assistente] Alterou estoque de ${itemData.nome} de ${itemData.quantidade} para ${args.nova_quantidade}.`, 'estoque');
        }
        if (addAlerta) {
          addAlerta(`Estoque de "${itemData.nome}" atualizado para ${args.nova_quantidade}!`, 'success');
        }

        return { success: true, message: `Estoque de '${itemData.nome}' atualizado para ${args.nova_quantidade}.`, produto: updated };
      }
      case 'gerar_lista_pedidos': {
        const { data: allData, error: errAll } = await supabase.from('estoque').select('*');
        if (errAll) throw errAll;
        const faltantes = allData.filter(item => item.quantidade <= (item.estoque_minimo || 0));
        return { total_items_precisando_reposicao: faltantes.length, itens: faltantes };
      }
      default:
        throw new Error(`Tool ${call.function.name} not found`);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !groq) {
      if (!groq && addAlerta) addAlerta('A chave da API Groq (VITE_GROQ_API_KEY) não está configurada no ambiente.', 'error');
      return;
    }

    const userMessage = input;
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      let currentMessages = [...newMessages];
      
      let response = await createChatCompletionWithFallback(groq, {
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
              content: JSON.stringify({ error: error.message || 'Erro ao executar operação no banco.' })
            });
          }
        }
        
        // Get the final response from Groq after tool results
        response = await createChatCompletionWithFallback(groq, {
          messages: currentMessages,
          tools: tools,
          tool_choice: 'auto',
          max_tokens: 1024
        });
        
        responseMessage = response.choices[0].message;
      }

      setMessages(prev => [...currentMessages, responseMessage]);

    } catch (error) {
      console.error("Chat erro Groq:", error);
      const errMsg = error?.message?.includes('Rate limit') 
        ? "Limite temporário de requisições atingido. Por favor, aguarde alguns segundos."
        : "Desculpe, ocorreu um erro ao se comunicar com a IA da Groq. Tente novamente.";
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
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
          backgroundColor: 'rgba(26, 26, 26, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
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
                <span style={{ fontSize: '11px', color: 'var(--accent-color, #FFD700)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-color, #FFD700)' }}></span> Online (Groq)
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
                onFocus={e => e.target.style.borderColor = 'var(--accent-color, #FFD700)'}
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
