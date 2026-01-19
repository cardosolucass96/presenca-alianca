# Configuração de Email (Resend)

Para habilitar o envio de emails de recuperação de senha, você precisa configurar a chave da API Resend.

## Passos para Configurar

1. **Crie uma conta no Resend**
   - Acesse: https://resend.com/
   - Crie uma conta gratuita

2. **Obtenha sua API Key**
   - No dashboard do Resend, vá para "API Keys"
   - Crie uma nova API Key
   - Copie a chave gerada

3. **Configure no Cloudflare Pages**
   - Acesse o dashboard do Cloudflare Pages
   - Vá para Settings > Environment Variables
   - Adicione uma nova variável:
     - Nome: `RESEND_API_KEY`
     - Valor: Sua chave da API Resend
   - Salve e faça um novo deploy

## Comportamento

- Se `RESEND_API_KEY` estiver configurado: usuários receberão email + WhatsApp (se disponível)
- Se `RESEND_API_KEY` NÃO estiver configurado: usuários receberão apenas WhatsApp

## Verificar Domínio

Para enviar emails de produção, você precisa verificar seu domínio no Resend:

1. No Resend, vá para "Domains"
2. Adicione seu domínio (ex: presenca-alianca.com)
3. Configure os registros DNS conforme instruído
4. Aguarde a verificação
5. Atualize o campo `from` no código para usar seu domínio verificado

Atualmente configurado como: `noreply@presenca-alianca.com`
