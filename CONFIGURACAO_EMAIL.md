# Configuração de Email (Resend)

Para habilitar o envio de emails de recuperação de senha, você precisa configurar a chave da API Resend.

## Sua API Key

```
re_MhfohQYg_8fNomPqMynrjYg59TefZXqsF
```

## Passos para Configurar no Cloudflare Pages

1. **Acesse o Dashboard do Cloudflare Pages**
   - Acesse: https://dash.cloudflare.com/
   - Vá para Workers & Pages > presenca-alianca

2. **Configure a Variável de Ambiente**
   - Clique em Settings
   - Vá para Environment Variables
   - Clique em "Add variable"
   - Adicione:
     - **Nome**: `RESEND_API_KEY`
     - **Valor**: `re_MhfohQYg_8fNomPqMynrjYg59TefZXqsF`
     - **Environment**: Production (e Preview se desejar)
   - Clique em "Save"

3. **Redeploy**
   - Após salvar a variável, faça um novo deploy para aplicar as mudanças
   - Ou aguarde o próximo deploy automático

## Comportamento

- Se `RESEND_API_KEY` estiver configurado: usuários receberão email + WhatsApp (se disponível)
- Se `RESEND_API_KEY` NÃO estiver configurado: usuários receberão apenas WhatsApp

## Verificar Domínio no Resend

Para enviar emails de produção, você precisa verificar seu domínio no Resend:

1. No Resend, vá para "Domains"
2. Adicione seu domínio (ex: presenca-alianca.com)
3. Configure os registros DNS conforme instruído:
   - SPF
   - DKIM
   - DMARC
4. Aguarde a verificação (pode levar alguns minutos)
5. Atualize o campo `from` no código se necessário

Atualmente configurado como: `noreply@presenca-alianca.com`

## Funcionalidades que usam email

1. **Recuperação de senha** (`/forgot-password`)
2. **Redefinição de senha pelo admin** (página de edição de usuário)
