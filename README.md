# Security Glass - Sistema de Controle

Sistema de gestão para controle de aplicação de películas Security Glass em veículos.

## 📱 Funcionalidades

### Para Gerente (Vinicius)
- ✅ Cadastrar novos veículos
- ✅ Visualizar dashboard completo com status em tempo real
- ✅ Atribuir aplicadores e montadores
- ✅ Gerar relatórios mensais
- ✅ Gerenciar equipe (adicionar/remover profissionais)
- ✅ Exportar relatórios em CSV
- ✅ Upload de fotos para cadastro automático (OCR)

### Para Aplicadores (Jonas, Maycon)
- ✅ Visualizar veículos aguardando aplicação
- ✅ Marcar veículo como "Aplicado" com horário automático
- ✅ Visualizar histórico de aplicações

### Para Montadores (Rafael, Vinicius, Arthur, Claiton)
- ✅ Visualizar veículos aguardando montagem
- ✅ Marcar veículo como "Montado" com data
- ✅ Adicionar fotos da montagem finalizada
- ✅ Visualizar histórico de montagens

## 🎯 Fluxos de Status

```
Retirado (A Aplicar) → Aplicado (A Montar) → Montado (Finalizado)
```

## 🚀 Como Instalar no Android

### Opção 1: Instalação Direta (Recomendado)

1. **Hospedar os arquivos:**
   - Use um serviço como Netlify, Vercel ou GitHub Pages
   - Faça upload de todos os arquivos da pasta `security-glass-app`
   - Anote a URL gerada (ex: `https://seu-site.netlify.app`)

2. **No celular Android:**
   - Abra o Chrome
   - Acesse a URL do sistema
   - Toque no menu (⋮) no canto superior direito
   - Selecione "Adicionar à tela inicial" ou "Instalar app"
   - O app será adicionado como ícone na tela inicial

### Opção 2: Servidor Local (Para Testes)

1. **Instale o Node.js** no computador: https://nodejs.org

2. **Abra o terminal/prompt** e navegue até a pasta do projeto:
   ```bash
   cd security-glass-app
   ```

3. **Inicie um servidor HTTP:**
   ```bash
   npx http-server -p 8080
   ```

4. **No celular conectado à mesma rede Wi-Fi:**
   - Descubra o IP do computador (ex: 192.168.1.100)
   - Abra o Chrome no celular
   - Acesse: `http://192.168.1.100:8080`
   - Instale como descrito na Opção 1

## 👥 Usuários Padrão

### Gerente
- **Usuário:** Vinicius (Gerente)
- **Acesso:** Total

### Aplicadores
- **Usuário:** Jonas (Aplicador)
- **Usuário:** Maycon (Aplicador)

### Montadores
- **Usuário:** Rafael (Montador)
- **Usuário:** Vinicius (Montador) - também pode montar
- **Usuário:** Arthur (Montador)
- **Usuário:** Claiton (Montador)

## 📋 Como Usar

### 1. Cadastrar Novo Veículo (Gerente)

1. Faça login como Vinicius (Gerente)
2. Clique em "+ Novo Veículo"
3. Opcionalmente, envie foto do quadro/documento:
   - Clique em "📷 Capturar/Enviar Foto"
   - Tire foto ou selecione da galeria
   - (O sistema tentará extrair dados automaticamente - em desenvolvimento)
4. Preencha os dados:
   - **Concessionária** (ex: Nissan)
   - **Local** (ex: RioRio C.I.O)
   - **Chassi** (número único do veículo)
   - **Modelo** (ex: Kicks)
   - **Aplicador** (opcional)
   - **Montador** (opcional)
5. Clique em "Cadastrar"

⚠️ **Atenção:** Se o chassi, modelo e concessionária já existirem, você receberá um aviso de duplicidade.

### 2. Aplicar Película (Aplicadores)

1. Faça login como Jonas ou Maycon
2. Visualize os veículos na coluna "A Aplicar"
3. Quando terminar a aplicação, clique em "Aplicado"
4. O sistema registra automaticamente a data e hora

### 3. Montar Vidros (Montadores)

1. Faça login como Rafael, Arthur, Claiton ou Vinicius
2. Visualize os veículos na coluna "A Montar"
3. Quando terminar a montagem, clique em "Montado"
4. Adicione fotos da montagem finalizada (recomendado)
5. Confirme a montagem

### 4. Visualizar Relatórios (Gerente)

1. Faça login como Vinicius (Gerente)
2. Clique na aba "Relatórios"
3. Visualize:
   - Total de veículos finalizados no mês
   - Quantidade de aplicações por profissional
   - Quantidade de montagens por profissional
   - Detalhes de cada veículo finalizado
4. Clique em "Exportar Relatório" para baixar CSV

### 5. Gerenciar Equipe (Gerente)

1. Faça login como Vinicius (Gerente)
2. Clique na aba "Equipe"
3. Para adicionar:
   - Clique em "+ Adicionar Aplicador" ou "+ Adicionar Montador"
   - Digite o nome
4. Para remover:
   - Clique no ícone 🗑️ ao lado do nome

## 📊 Dashboard

O dashboard mostra em tempo real:
- **Cards de estatísticas:**
  - Quantidade de veículos "A Aplicar"
  - Quantidade de veículos "A Montar"
  - Quantidade de veículos finalizados no mês atual

- **Colunas Kanban:**
  - **Vermelha:** A Aplicar (vidros retirados, aguardando aplicação)
  - **Amarela:** A Montar (película aplicada, aguardando montagem)
  - **Verde:** Finalizados (montagem concluída)

## 💾 Armazenamento de Dados

- Os dados são salvos localmente no navegador (localStorage)
- Cada dispositivo mantém sua própria cópia dos dados
- **Importante:** Para uso compartilhado entre dispositivos, é necessário implementar um backend (banco de dados na nuvem)

## 🔄 Sincronização entre Dispositivos

**Versão Atual (Local):**
- Cada usuário vê apenas os dados do seu próprio dispositivo
- Ideal para testes e operação individual

**Para sincronizar entre todos os dispositivos:**
1. Implementar backend com Firebase, Supabase ou API própria
2. Substituir `localStorage` por chamadas à API
3. Todos os dispositivos acessarão o mesmo banco de dados

## 🎨 Personalização

### Alterar Cores
Edite o arquivo `styles.css`, seção `:root`:
```css
:root {
    --primary: #dc2626;  /* Cor principal (vermelho) */
    --success: #16a34a;  /* Cor de sucesso (verde) */
    --warning: #eab308;  /* Cor de aviso (amarelo) */
}
```

### Alterar Nome da Empresa
Edite o arquivo `index.html`:
- Linha 7: `<title>`
- Linha 22: `<h1>Security Glass</h1>`

## 🔧 Melhorias Futuras

### Próximas Versões:
1. ✅ OCR real para extrair dados de fotos automaticamente
2. ✅ Backend para sincronização entre dispositivos
3. ✅ Notificações push quando veículo muda de status
4. ✅ Controle de estoque de materiais
5. ✅ Assinatura digital na entrega
6. ✅ Integração com WhatsApp para receber solicitações
7. ✅ Backup automático em nuvem
8. ✅ Relatórios em PDF

## 📱 Requisitos

- Smartphone Android 5.0 ou superior
- Chrome ou navegador compatível
- Conexão com internet (apenas para instalação inicial)
- Funciona offline após instalação

## 🆘 Suporte

Em caso de problemas:
1. Verifique se está usando o Chrome atualizado
2. Limpe o cache do navegador
3. Reinstale o app
4. Entre em contato com o suporte técnico

## 📄 Licença

Sistema desenvolvido exclusivamente para Security Glass - Uso interno.

---

**Desenvolvido para otimizar o controle de operações da Security Glass** 🛡️


