# 🚀 Deploy Cloud Functions - Security Glass

## 📋 PRÉ-REQUISITOS:

1. ✅ Plano Blaze ativado no Firebase (você já tem!)
2. ✅ Node.js instalado (versão 18+)
3. ✅ Firebase CLI instalado

---

## 🔧 PASSO A PASSO:

### **1. Instalar Firebase CLI (se ainda não tem):**

```bash
npm install -g firebase-tools
```

### **2. Fazer login no Firebase:**

```bash
firebase login
```

### **3. Navegar até a pasta do projeto:**

```bash
cd /caminho/para/security-glass-app
```

### **4. Inicializar Firebase (se necessário):**

```bash
firebase init functions
```

**Escolher:**
- ✅ Use an existing project → Security Glass controle
- ✅ JavaScript
- ✅ ESLint → No
- ✅ Install dependencies → Yes

### **5. Deploy das funções:**

```bash
firebase deploy --only functions
```

---

## ✅ APÓS O DEPLOY:

As funções estarão rodando 24/7 na nuvem da Google!

**Você verá algo como:**
```
✔  functions[sendNotificationOnStatusChange(us-central1)] deployed
✔  functions[sendNotificationOnRotaSave(us-central1)] deployed

✨ Deploy complete!
```

---

## 🔔 COMO FUNCIONA AGORA:

### **Antes (sem Cloud Functions):**
```
App aberto → Notificação local ✅
App fechado → Nada ❌
```

### **Depois (com Cloud Functions):**
```
App aberto → Notificação via FCM ✅
App fechado → Notificação via FCM ✅
Tela desligada → Notificação via FCM ✅
Celular no bolso → Notificação via FCM ✅
```

---

## 💰 CUSTOS:

**Notificações:** ~R$ 0,40 por milhão
**Cloud Functions:** Primeiros 2 milhões de invocações/mês GRÁTIS

**Seu uso estimado:**
- 10 notificações/dia = 300/mês
- **Custo: R$ 0,001 ≈ GRÁTIS!** 😄

---

## 🐛 TROUBLESHOOTING:

### **Erro: "Firebase CLI not found"**
```bash
npm install -g firebase-tools
```

### **Erro: "Permission denied"**
```bash
firebase login
```

### **Erro ao deploy:**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## 📱 TESTANDO:

1. Deploy das funções ✅
2. Abra app no celular
3. Fecha completamente o app
4. No PC: Salva uma rota
5. **Celular recebe notificação!** 🔔

---

**VERSÃO:** 9.6 - Cloud Functions
**STATUS:** Pronto para deploy! 🚀
