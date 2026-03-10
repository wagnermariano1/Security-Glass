// Security Glass App - Main JavaScript v24.1-PROD - ASYNC CORRIGIDO!
// Todas funções que usam await saveBoth agora são async! Login OK!

console.log('🔥 Security Glass v24.1-PROD - ASYNC OK!');

// Firebase Database Layer
const FirebaseDB = {
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        // Aguardar Firebase estar disponível
        let attempts = 0;
        while (!window.firebase && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.firebase) {
            console.error('Firebase não carregou! Usando localStorage como fallback.');
            return;
        }
        
        this.initialized = true;
        console.log('✅ Firebase inicializado!');
        
        // MIGRAÇÃO DESATIVADA PERMANENTEMENTE
        // Firebase é a ÚNICA fonte da verdade
        // localStorage serve APENAS como cache local
        console.log('🔒 Migração desativada. Firebase é a fonte da verdade.');
        
        // Configurar listeners em tempo real
        this.setupRealtimeListeners();
    },
    
    setupRealtimeListeners() {
        const { db, collection, onSnapshot } = window.firebase;
        
        // Listener de veículos com atualização completa
        onSnapshot(collection(db, 'vehicles'), (snapshot) => {
            const vehicles = [];
            snapshot.forEach(doc => {
                vehicles.push({ id: doc.id, ...doc.data() });
            });
            localStorage.setItem('vehicles', JSON.stringify(vehicles));
            
            console.log('🔄 Dados sincronizados do Firebase!');
            
            // Atualizar TODAS as telas que podem estar visíveis
            if (document.getElementById('dashboardScreen').classList.contains('active')) {
                const currentTab = document.querySelector('.tab.active')?.dataset?.tab;
                
                // Atualizar dashboard principal
                if (currentTab === 'dashboard') {
                    Dashboard.renderDashboard();
                }
                
                // Atualizar aba de veículos
                if (currentTab === 'vehicles') {
                    VehiclesManager.renderList();
                }
                
                // Atualizar rotas se estiver aberta
                if (currentTab === 'rotaDesmontagem') {
                    RotaDesmontagemManager.loadRota();
                }
                if (currentTab === 'rotaAplicacao') {
                    RotaAplicacaoManager.loadRota();
                }
                if (currentTab === 'rotaMontagem') {
                    RotaMontagemManager.loadRota();
                }
                
                // Atualizar espera
                if (currentTab === 'espera') {
                    EsperaManager.loadEspera();
                }
                
                // Atualizar relatórios
                if (currentTab === 'reports') {
                    ReportsManager.loadReport();
                }
            }
        });
        
        // Listener de equipe (team) com atualização em tempo real
        const { doc, onSnapshot: onSnapshotDoc } = window.firebase;
        onSnapshotDoc(doc(db, 'config', 'team'), (docSnapshot) => {
            if (docSnapshot.exists()) {
                const teamData = docSnapshot.data();
                localStorage.setItem('team', JSON.stringify(teamData));
                console.log('👥 Equipe sincronizada do Firebase!', teamData);
                
                // Atualizar lista de login se estiver na tela de login
                if (typeof populateUserSelect === 'function' && document.getElementById('loginScreen').classList.contains('active')) {
                    populateUserSelect();
                }
                
                // Atualizar aba equipe se estiver aberta
                if (document.getElementById('dashboardScreen').classList.contains('active')) {
                    const currentTab = document.querySelector('.tab.active')?.dataset?.tab;
                    if (currentTab === 'team') {
                        TeamManager.loadTeam();
                    }
                }
            }
        });
        
        console.log('🔄 Sincronização em tempo real ativada!');
    },
    
    async saveVehicle(vehicle) {
        if (!this.initialized || !window.firebase) {
            return DB.saveVehicles([...DB.getVehicles().filter(v => v.id !== vehicle.id), vehicle]);
        }
        
        try {
            const { db, doc, setDoc } = window.firebase;
            await setDoc(doc(db, 'vehicles', vehicle.id), vehicle);
        } catch (error) {
            console.error('Erro ao salvar veículo:', error);
            // Fallback para localStorage
            DB.saveVehicles([...DB.getVehicles().filter(v => v.id !== vehicle.id), vehicle]);
        }
    },
    
    async deleteVehicle(vehicleId) {
        if (!this.initialized || !window.firebase) {
            return DB.saveVehicles(DB.getVehicles().filter(v => v.id !== vehicleId));
        }
        
        try {
            const { db, doc, deleteDoc } = window.firebase;
            await deleteDoc(doc(db, 'vehicles', vehicleId));
        } catch (error) {
            console.error('Erro ao deletar veículo:', error);
            DB.saveVehicles(DB.getVehicles().filter(v => v.id !== vehicleId));
        }
    },
    
    async saveTeam(team) {
        if (!this.initialized || !window.firebase) {
            return DB.saveTeam(team);
        }
        
        try {
            const { db, doc, setDoc } = window.firebase;
            await setDoc(doc(db, 'config', 'team'), team);
        } catch (error) {
            console.error('Erro ao salvar equipe:', error);
            DB.saveTeam(team);
        }
    }
};

// Classe DB original (fallback localStorage)
const DB = {
    getVehicles: () => JSON.parse(localStorage.getItem('vehicles') || '[]'),
    saveVehicles: (vehicles) => {
        localStorage.setItem('vehicles', JSON.stringify(vehicles));
        // Sincronizar cada veículo com Firebase
        if (FirebaseDB.initialized) {
            vehicles.forEach(v => FirebaseDB.saveVehicle(v));
        }
    },
    
    getTeam: () => {
        // Tentar buscar do localStorage primeiro (mais rápido)
        const cached = localStorage.getItem('team');
        if (cached) {
            return JSON.parse(cached);
        }
        
        // Padrão inicial SEM Vinicius montador (será adicionado manualmente)
        return {
            aplicadores: ['Jonas', 'Maycon'],
            montadores: ['Rafael', 'Arthur', 'Claiton'],
            vendedoras: [] // NOVO: lista de vendedoras
        };
    },
    
    getTeamAsync: async () => {
        // SEMPRE buscar do Firebase primeiro se disponível
        if (FirebaseDB.initialized && window.firebase) {
            try {
                const { db, doc, getDoc } = window.firebase;
                const teamDoc = await getDoc(doc(db, 'config', 'team'));
                
                if (teamDoc.exists()) {
                    const teamData = teamDoc.data();
                    // Atualizar localStorage com dados do Firebase
                    localStorage.setItem('team', JSON.stringify(teamData));
                    console.log('👥 Equipe carregada do Firebase');
                    return teamData;
                }
            } catch (error) {
                console.log('⚠️ Erro ao buscar equipe do Firebase:', error);
            }
        }
        
        // Fallback: localStorage
        return DB.getTeam();
    },
    saveTeam: (team) => {
        localStorage.setItem('team', JSON.stringify(team));
        if (FirebaseDB.initialized) {
            FirebaseDB.saveTeam(team);
        }
    },
    
    getConcessionarias: () => JSON.parse(localStorage.getItem('concessionarias') || '[]'),
    saveConcessionarias: (list) => localStorage.setItem('concessionarias', JSON.stringify(list)),
    
    getModelos: () => JSON.parse(localStorage.getItem('modelos') || '[]'),
    saveModelos: (list) => localStorage.setItem('modelos', JSON.stringify(list)),
    
    getPasswords: async () => {
        // Primeiro tenta buscar do Firebase
        if (window.firebase && FirebaseDB.initialized) {
            try {
                const { db, doc, getDoc } = window.firebase;
                const passwordsDoc = await getDoc(doc(db, 'config', 'passwords'));
                
                if (passwordsDoc.exists()) {
                    console.log('🔐 Senhas carregadas do Firebase');
                    return passwordsDoc.data();
                }
            } catch (error) {
                console.log('⚠️ Erro ao buscar senhas do Firebase:', error);
            }
        }
        
        // Fallback: localStorage ou padrão
        const defaultPasswords = {
            wagner: '11111111',
            vinicius: '11111111',
            jonas: '11111111',
            maycon: '11111111',
            rafael: '11111111',
            arthur: '11111111',
            claiton: '11111111'
        };
        
        const storedPasswords = localStorage.getItem('passwords');
        if (storedPasswords) {
            console.log('🔐 Senhas carregadas do localStorage');
            return JSON.parse(storedPasswords);
        }
        
        console.log('🔐 Usando senhas padrão');
        return defaultPasswords;
    },
    
    savePasswords: async (passwords) => {
        // Salva no localStorage (backward compatibility)
        localStorage.setItem('passwords', JSON.stringify(passwords));
        
        // Salva no Firebase
        if (window.firebase && FirebaseDB.initialized) {
            try {
                const { db, doc, setDoc } = window.firebase;
                await setDoc(doc(db, 'config', 'passwords'), passwords);
                console.log('🔐 Senhas salvas no Firebase');
            } catch (error) {
                console.error('❌ Erro ao salvar senhas no Firebase:', error);
            }
        }
    }
};

// Helper para salvar em localStorage E Firebase
const saveBoth = {
    vehicles: async (vehiclesLocal) => {
        // CRITICAL: SEMPRE buscar dados ATUAIS do Firebase ANTES de salvar!
        let vehiclesFinal = vehiclesLocal;
        
        if (window.firebase && FirebaseDB.initialized) {
            try {
                const vehiclesFirebase = await FirebaseDB.getVehicles();
                
                if (vehiclesFirebase && vehiclesFirebase.length > 0) {
                    // Merge: atualizar veículos do Firebase com mudanças locais
                    vehiclesFinal = vehiclesFirebase.map(vFB => {
                        // Procurar se tem versão local deste veículo
                        const vLocal = vehiclesLocal.find(vL => vL.id === vFB.id);
                        // Se tem local, usar local (mais recente), senão Firebase
                        return vLocal || vFB;
                    });
                    
                    // Adicionar veículos que só existem no local (novos)
                    vehiclesLocal.forEach(vLocal => {
                        if (!vehiclesFinal.find(v => v.id === vLocal.id)) {
                            vehiclesFinal.push(vLocal);
                        }
                    });
                    
                    console.log('✅ Merge Firebase ← Local concluído');
                }
            } catch (error) {
                console.warn('⚠️ Erro ao buscar Firebase, usando dados locais:', error);
            }
        }
        
        // Salvar localmente
        DB.saveVehicles(vehiclesFinal);
        
        // Salvar no Firebase
        if (window.firebase && FirebaseDB.initialized) {
            vehiclesFinal.forEach(v => FirebaseDB.saveVehicle(v));
        }
    },
    vehicle: async (vehicle) => {
        // Buscar lista ATUAL do Firebase
        let vehicles = DB.getVehicles();
        
        if (window.firebase && FirebaseDB.initialized) {
            try {
                const vehiclesFirebase = await FirebaseDB.getVehicles();
                if (vehiclesFirebase && vehiclesFirebase.length > 0) {
                    vehicles = vehiclesFirebase;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao buscar Firebase:', error);
            }
        }
        
        const index = vehicles.findIndex(v => v.id === vehicle.id);
        if (index >= 0) {
            vehicles[index] = vehicle;
        } else {
            vehicles.unshift(vehicle);
        }
        
        DB.saveVehicles(vehicles);
        if (window.firebase && FirebaseDB.initialized) {
            FirebaseDB.saveVehicle(vehicle);
        }
    },
    deleteVehicle: async (vehicleId) => {
        // Buscar lista ATUAL do Firebase
        let vehicles = DB.getVehicles();
        
        if (window.firebase && FirebaseDB.initialized) {
            try {
                const vehiclesFirebase = await FirebaseDB.getVehicles();
                if (vehiclesFirebase && vehiclesFirebase.length > 0) {
                    vehicles = vehiclesFirebase;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao buscar Firebase:', error);
            }
        }
        
        vehicles = vehicles.filter(v => v.id !== vehicleId);
        
        DB.saveVehicles(vehicles);
        if (window.firebase && FirebaseDB.initialized) {
            FirebaseDB.deleteVehicle(vehicleId);
        }
    }
};

// Sistema de Notificações Push
const NotificationManager = {
    vapidKey: 'BFbQG-FvP8GneifDgUHbjd_HVR-jMfyXguF9byC3Otnbs-glEiGJjWxU5IoSVcrhj2HB7y_nzOnDqVqBkOmzsiQ',
    
    async init() {
        if (!window.firebase || !window.firebase.messaging) {
            console.log('⚠️ Firebase Messaging não disponível');
            return;
        }
        
        // Pedir permissão ao usuário
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('✅ Permissão de notificação concedida!');
            await this.getToken();
            this.listenToMessages();
        } else {
            console.log('❌ Permissão de notificação negada');
        }
    },
    
    async getToken() {
        try {
            const { messaging, getToken } = window.firebase;
            const currentToken = await getToken(messaging, { vapidKey: this.vapidKey });
            
            if (currentToken) {
                console.log('🔑 Token FCM obtido:', currentToken);
                
                // Salvar token associado ao usuário
                const username = APP_STATE.currentUser;
                if (username) {
                    await this.saveToken(username, currentToken);
                }
                
                return currentToken;
            } else {
                console.log('❌ Não foi possível obter token');
            }
        } catch (error) {
            console.error('Erro ao obter token:', error);
        }
    },
    
    async saveToken(username, token) {
        try {
            const { db, doc, setDoc } = window.firebase;
            await setDoc(doc(db, 'fcm_tokens', username), {
                token: token,
                updatedAt: new Date().toISOString()
            });
            console.log(`✅ Token salvo para ${username}`);
        } catch (error) {
            console.error('Erro ao salvar token:', error);
        }
    },
    
    listenToMessages() {
        const { messaging, onMessage } = window.firebase;
        
        onMessage(messaging, (payload) => {
            console.log('📬 Mensagem recebida:', payload);
            
            // Mostrar notificação mesmo com app aberto
            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: '/icon-192.png'
            };
            
            new Notification(notificationTitle, notificationOptions);
        });
    },
    
    async sendNotification(username, title, body) {
        try {
            const { db, doc, getDoc } = window.firebase;
            const tokenDoc = await getDoc(doc(db, 'fcm_tokens', username));
            
            if (!tokenDoc.exists()) {
                console.log(`⚠️ Token não encontrado para ${username}`);
                return;
            }
            
            const token = tokenDoc.data().token;
            
            // Salvar notificação no Firestore para ser processada por Cloud Function
            const { setDoc, collection } = window.firebase;
            const notificationRef = doc(collection(db, 'notifications'));
            
            await setDoc(notificationRef, {
                token: token,
                title: title,
                body: body,
                createdAt: new Date().toISOString(),
                status: 'pending'
            });
            
            console.log(`📤 Notificação enviada para ${username}: ${title}`);
        } catch (error) {
            console.error('Erro ao enviar notificação:', error);
        }
    }
};

const APP_STATE = {
    currentUser: null,
    currentRole: null,
    currentUserFullName: null
};

const Utils = {
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('pt-BR');
    },
    
    formatDateTime: (date) => {
        const d = new Date(date);
        return d.toLocaleString('pt-BR');
    },
    
    getCurrentMonth: () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },
    
    isCurrentMonth: (date) => {
        const d = new Date(date);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    },
    
    openPhotoModal: (photoUrl) => {
        // Criar modal de forma segura (sem innerHTML para evitar problemas com aspas)
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px;';
        
        const container = document.createElement('div');
        container.style.cssText = 'position: relative; max-width: 90%; max-height: 90%; display: flex; flex-direction: column;';
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'position: absolute; top: -50px; right: 0; background: white; border: none; width: 45px; height: 45px; border-radius: 50%; cursor: pointer; font-size: 28px; color: #000; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
        closeBtn.onclick = () => modal.remove();
        
        const img = document.createElement('img');
        img.src = photoUrl;
        img.style.cssText = 'max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);';
        img.onerror = () => {
            img.alt = 'Erro ao carregar imagem';
            img.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.textContent = '❌ Erro ao carregar foto';
            errorMsg.style.cssText = 'color: white; font-size: 18px; padding: 20px;';
            container.appendChild(errorMsg);
        };
        
        container.appendChild(closeBtn);
        container.appendChild(img);
        modal.appendChild(container);
        
        // Fechar ao clicar fora da imagem
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
    }
};

// Sistema de Autenticação com Senha
class AuthSystem {
    static init() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', () => this.logout());
        
        const limparCacheLoginBtn = document.getElementById('limparCacheLoginBtn');
        limparCacheLoginBtn.addEventListener('click', () => this.limparCache());
        
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
    }

    static async login() {
        const userInput = document.getElementById('userInput');
        const passwordInput = document.getElementById('passwordInput');
        const rememberMe = document.getElementById('rememberMe');
        const username = userInput.value.toLowerCase().replace(/\s+/g, '');
        const password = passwordInput.value;
        
        if (!username) {
            alert('Digite seu nome de usuário');
            return;
        }
        
        const passwords = await DB.getPasswords();
        const team = DB.getTeam();
        
        // Detectar tipo de usuário e nome completo
        let fullName = '';
        let role = '';
        let isValid = false;
        
        // 1. Verificar se está em passwords (pode ser gestor, gerente, ou equipe)
        if (passwords[username]) {
            if (password === passwords[username]) {
                isValid = true;
                
                // Detectar role baseado no usuário
                if (username === 'wagner') {
                    fullName = 'Wagner';
                    role = 'gestor';
                } else if (username === 'vinicius') {
                    fullName = 'Vinicius';
                    role = 'manager';
                } else {
                    // Buscar nos arrays do team
                    const montador = team.montadores.find(n => 
                        n.toLowerCase().replace(/\s+/g, '') === username
                    );
                    const aplicador = team.aplicadores.find(n => 
                        n.toLowerCase().replace(/\s+/g, '') === username
                    );
                    
                    if (montador) {
                        role = 'montador';
                        fullName = montador;
                    } else if (aplicador) {
                        role = 'aplicador';
                        fullName = aplicador;
                    }
                }
            } else {
                alert('Senha incorreta!');
                passwordInput.value = '';
                return;
            }
        }
        // 2. Verificar se é vendedora
        if (!isValid && team.vendedoras) {
            const vendedora = team.vendedoras.find(v => 
                v.nome.toLowerCase().replace(/\s+/g, '') === username
            );
            if (vendedora) {
                if (password === vendedora.senha) {
                    isValid = true;
                    fullName = vendedora.nome;
                    role = 'vendedora';
                } else {
                    alert('Senha incorreta!');
                    passwordInput.value = '';
                    return;
                }
            }
        }
        // 3. Verificar se é montador/aplicador
        if (!isValid) {
            const allMembers = [...team.montadores, ...team.aplicadores];
            const member = allMembers.find(name => 
                name.toLowerCase().replace(/\s+/g, '') === username
            );
            
            if (member) {
                // Senha padrão para equipe
                if (password === '11111111') {
                    isValid = true;
                    fullName = member;
                    // Detectar se é montador ou aplicador
                    role = team.montadores.includes(member) ? 'montador' : 'aplicador';
                } else {
                    alert('Senha incorreta! Para membros da equipe, use: 11111111');
                    passwordInput.value = '';
                    return;
                }
            }
        }
        
        if (!isValid) {
            alert('Usuário não encontrado!');
            return;
        }

        // Salvar estado
        APP_STATE.currentUser = username;
        APP_STATE.currentRole = role;
        APP_STATE.currentUserFullName = fullName;
        
        console.log('✅ Login:', {username, role, fullName});

        localStorage.setItem('currentUser', username);
        localStorage.setItem('currentRole', role);
        localStorage.setItem('currentUserFullName', fullName);
        
        // Lembrar de mim - salva por 30 dias
        if (rememberMe.checked) {
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberMeExpiry', expiryDate.toISOString());
            console.log('✅ Lembrar de mim ativado por 30 dias');
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberMeExpiry');
        }

        this.showDashboard();
        
        // Inicializar notificações push APÓS login (para salvar token com usuário correto)
        setTimeout(async () => {
            await PushNotifications.init();
            console.log('✅ Notificações ativadas para:', APP_STATE.currentUser);
        }, 1000);
    }

    static logout() {
        APP_STATE.currentUser = null;
        APP_STATE.currentRole = null;
        APP_STATE.currentUserFullName = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('currentUserFullName');
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberMeExpiry');
        
        document.getElementById('dashboardScreen').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
        document.body.classList.remove('gestor', 'manager', 'aplicador', 'montador');
        
        document.getElementById('passwordInput').value = '';
        document.getElementById('rememberMe').checked = false;
    }
    
    static limparCache() {
        const confirma = confirm('🧹 LIMPAR CACHE E DADOS ANTIGOS?\n\nIsso vai:\n✅ Limpar dados locais antigos\n✅ Resolver problemas de carros "fantasmas"\n✅ Sincronizar corretamente com a nuvem\n\nA página será recarregada.\n\nConfirma?');
        
        if (!confirma) return;
        
        try {
            console.log('🧹 Limpando cache...');
            
            // Limpa TUDO do localStorage (exceto credenciais de equipe)
            const team = localStorage.getItem('team');
            const config = localStorage.getItem('config');
            
            localStorage.clear();
            
            // Restaura apenas equipe e config
            if (team) localStorage.setItem('team', team);
            if (config) localStorage.setItem('config', config);
            
            // Marca que foi limpo manualmente (para evitar migração)
            localStorage.setItem('firebase_migrated', 'true');
            
            console.log('✅ Cache limpo com sucesso!');
            
            // Mostra mensagem de sucesso
            alert('✅ Cache limpo com sucesso!\n\nAgora você pode fazer login normalmente.');
            
            // Recarrega página
            window.location.reload();
            
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
            alert('❌ Erro ao limpar cache: ' + error.message);
        }
    }

    static showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        document.getElementById('userNameDisplay').textContent = APP_STATE.currentUserFullName;
        
        // Adicionar role ao body (proteção contra vazio)
        if (APP_STATE.currentRole) {
            document.body.classList.add(APP_STATE.currentRole);
        }
        
        // NOVO: Controlar visibilidade por perfil
        if (APP_STATE.currentRole === 'vendedora') {
            // Desativar TODAS tabs normais
            const dashTab = document.querySelector('[data-tab="dashboard"]');
            const dashContent = document.getElementById('dashboardTab');
            if (dashTab) {
                dashTab.classList.remove('active');
                dashTab.style.display = 'none';
            }
            if (dashContent) {
                dashContent.classList.remove('active');
                dashContent.style.display = 'none';
            }
            
            const vehTab = document.querySelector('[data-tab="vehicles"]');
            const vehContent = document.getElementById('vehiclesTab');
            if (vehTab) {
                vehTab.classList.remove('active');
                vehTab.style.display = 'none';
            }
            if (vehContent) {
                vehContent.classList.remove('active');
                vehContent.style.display = 'none';
            }
            
            // Esconder tabs de gestão
            document.querySelectorAll('.manager-only').forEach(el => {
                el.style.display = 'none';
                el.classList.remove('active');
            });
            
            // Esconder conteúdos de gestão
            document.querySelectorAll('.tab-content.manager-only').forEach(el => {
                el.classList.remove('active');
                el.style.display = 'none';
            });
            
            // Mostrar APENAS tabs vendedora
            document.querySelectorAll('.vendedora-only').forEach(el => {
                el.style.display = 'block';
            });
            
            // Ativar primeira tab vendedora
            document.querySelector('[data-tab="vendedoraDashboard"]').classList.add('active');
            document.getElementById('vendedoraDashboardTab').classList.add('active');
            document.getElementById('vendedoraDashboardTab').style.display = 'block';
            
            // Carregar dashboard vendedora
            VendedoraManager.loadDashboard();
            
            // IMPORTANTE: Configurar event listeners para vendedora
            Dashboard.setupTabs();
            this.setupVendedoraEventListeners();
            
            // NÃO chamar Dashboard.init() para vendedora
            return;
        } else {
            // Perfis normais: esconder tabs vendedora E MOSTRAR tabs normais
            document.querySelectorAll('.vendedora-only').forEach(el => el.style.display = 'none');
            
            // RESTAURAR tabs normais
            const dashTab = document.querySelector('[data-tab="dashboard"]');
            const vehTab = document.querySelector('[data-tab="vehicles"]');
            if (dashTab) dashTab.style.display = '';
            if (vehTab) vehTab.style.display = '';
            
            // RESTAURAR tabs manager (se for gestor/gerente)
            if (APP_STATE.currentRole === 'gestor' || APP_STATE.currentRole === 'manager') {
                document.querySelectorAll('.manager-only').forEach(el => {
                    el.style.display = '';
                });
            }
        }
        
        // Mostrar configurações avançadas só para Wagner
        if (APP_STATE.currentUser === 'wagner') {
            document.getElementById('wagnerOnlySettings').style.display = 'block';
        } else {
            document.getElementById('wagnerOnlySettings').style.display = 'none';
        }
        
        Dashboard.init();
        
        // Forçar refresh do dashboard após 100ms (garantir que carregou)
        setTimeout(() => {
            if (APP_STATE.currentRole !== 'vendedora') {
                Dashboard.renderDashboard();
            }
        }, 100);
    }

    static checkAuth() {
        const user = localStorage.getItem('currentUser');
        const role = localStorage.getItem('currentRole');
        const fullName = localStorage.getItem('currentUserFullName');
        const rememberMe = localStorage.getItem('rememberMe');
        const rememberMeExpiry = localStorage.getItem('rememberMeExpiry');
        
        // Verificar se "Lembrar de mim" ainda é válido
        if (rememberMe === 'true' && rememberMeExpiry) {
            const expiryDate = new Date(rememberMeExpiry);
            const now = new Date();
            
            if (now > expiryDate) {
                // Expirou - fazer logout
                console.log('⏰ Lembrar de mim expirou (30 dias)');
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('rememberMeExpiry');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('currentRole');
                localStorage.removeItem('currentUserFullName');
                return;
            }
        }
        
        if (user && role && fullName) {
            // Se NÃO marcou "Lembrar de mim", só mantém durante a sessão
            if (rememberMe !== 'true') {
                // Verifica se é uma nova sessão (página foi fechada e reaberta)
                const sessionId = sessionStorage.getItem('sessionId');
                if (!sessionId) {
                    // Nova sessão - fazer logout
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('currentRole');
                    localStorage.removeItem('currentUserFullName');
                    return;
                }
            }
            
            APP_STATE.currentUser = user;
            APP_STATE.currentRole = role;
            APP_STATE.currentUserFullName = fullName;
            
            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.value = user;
            }
            
            this.showDashboard();
            
            // Inicializar notificações após login automático
            setTimeout(async () => {
                await PushNotifications.init();
                console.log('✅ Notificações ativadas para:', APP_STATE.currentUser);
            }, 1000);
        }
        
        // Criar ID de sessão se não existir
        if (!sessionStorage.getItem('sessionId')) {
            sessionStorage.setItem('sessionId', Date.now().toString());
        }
    }
    
    // NOVO: Configurar event listeners específicos para vendedora
    static setupVendedoraEventListeners() {
        // Botão cadastrar veículo
        const cadastroBtn = document.getElementById('cadastroVendedoraBtn');
        if (cadastroBtn) {
            cadastroBtn.onclick = function() {
                // Abrir modal
                document.getElementById('newVehicleModal').classList.add('active');
                
                // Pré-preencher concessionária e local
                const team = DB.getTeam();
                const username = APP_STATE.currentUser;
                const vendedora = team.vendedoras?.find(v => 
                    v.nome.toLowerCase().replace(/\s+/g, '') === username
                );
                
                if (vendedora) {
                    const concInput = document.getElementById('concessionaria');
                    const localInput = document.getElementById('local');
                    const modeloInput = document.getElementById('modelo');
                    const chassiInput = document.getElementById('chassi');
                    
                    if (concInput) {
                        concInput.value = vendedora.concessionaria;
                        concInput.setAttribute('readonly', 'true');
                        concInput.style.background = '#f1f5f9';
                    }
                    
                    if (localInput) {
                        localInput.value = vendedora.local || '';
                        localInput.setAttribute('readonly', 'true');
                        localInput.style.background = '#f1f5f9';
                    }
                    
                    // Forçar caixa alta em modelo e chassi
                    if (modeloInput) {
                        modeloInput.addEventListener('input', function() {
                            this.value = this.value.toUpperCase();
                        });
                    }
                    
                    if (chassiInput) {
                        chassiInput.addEventListener('input', function() {
                            this.value = this.value.toUpperCase();
                        });
                    }
                }
            };
        }
        
        // Botão gerar relatório
        const relatorioBtn = document.getElementById('gerarRelatorioVendedoraBtn');
        if (relatorioBtn) {
            relatorioBtn.onclick = function() {
                VendedoraManager.gerarRelatorio();
            };
        }
        
        console.log('✅ Event listeners vendedora configurados!');
    }
    
    static showChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        modal.classList.add('active');
        
        // Input é texto agora, não precisa popular
        // Usuário digita nome igual ao login
        
        const form = document.getElementById('changePasswordForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            this.changePassword();
        };
        
        document.querySelectorAll('#changePasswordModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                form.reset();
            });
        });
    }
    
    static async changePassword() {
        const userInput = document.getElementById('changePasswordUser').value;
        const user = userInput.toLowerCase().replace(/\s+/g, ''); // Normalizar
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!user) {
            alert('Digite seu nome de usuário');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }
        
        if (newPassword.length < 4) {
            alert('A senha deve ter no mínimo 4 caracteres');
            return;
        }
        
        const passwords = await DB.getPasswords();
        
        // Verificar senha atual
        let senhaAtualCorreta = false;
        
        if (passwords[user]) {
            // Usuário já tem senha cadastrada
            senhaAtualCorreta = (passwords[user] === currentPassword);
        } else {
            // Verificar se é membro da equipe OU vendedora
            const team = DB.getTeam();
            const allMembers = [...team.montadores, ...team.aplicadores];
            
            // Checar se é montador/aplicador
            const memberExists = allMembers.some(name => {
                const memberUsername = name.toLowerCase().replace(/\s+/g, '');
                return memberUsername === user;
            });
            
            if (memberExists && currentPassword === '11111111') {
                senhaAtualCorreta = true;
                console.log(`✅ Primeiro troca de senha: ${user}`);
            }
            
            // NOVO: Checar se é vendedora
            if (!senhaAtualCorreta && team.vendedoras) {
                const vendedora = team.vendedoras.find(v => 
                    v.nome.toLowerCase().replace(/\s+/g, '') === user
                );
                
                if (vendedora && currentPassword === vendedora.senha) {
                    senhaAtualCorreta = true;
                    console.log(`✅ Troca de senha vendedora: ${user}`);
                }
            }
        }
        
        if (!senhaAtualCorreta) {
            alert('Senha atual incorreta!');
            return;
        }
        
        // Salvar nova senha no local correto
        const team = DB.getTeam();
        const vendedora = team.vendedoras?.find(v => 
            v.nome.toLowerCase().replace(/\s+/g, '') === user
        );
        
        if (vendedora) {
            // É vendedora → salvar em team.vendedoras
            vendedora.senha = newPassword;
            await DB.saveTeam(team);
            console.log(`✅ Senha vendedora atualizada no team`);
        } else {
            // É gestor/gerente/equipe → salvar em passwords
            passwords[user] = newPassword;
            await DB.savePasswords(passwords);
            console.log(`✅ Senha atualizada em passwords`);
        }
        
        alert(`✅ Senha alterada com sucesso!\n\nUsuário: ${user}\n\nFaça login novamente com a nova senha.`);
        document.getElementById('changePasswordModal').classList.remove('active');
        document.getElementById('changePasswordForm').reset();
    }
}

// Dashboard Principal
class Dashboard {
    static init() {
        this.setupTabs();
        this.loadTeamMembers();
        this.loadDataLists();
        this.renderDashboard();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.checkManagementButton();
    }
    
    static checkManagementButton() {
        const role = APP_STATE.currentRole;
        const user = APP_STATE.currentUser;
        const btn = document.getElementById('enableManagementBtn');
        
        // Mostrar botão apenas para Wagner (gestor)
        if (user === 'wagner' && role === 'gestor') {
            btn.style.display = 'inline-block';
        } else {
            btn.style.display = 'none';
        }
    }
    
    static enableManagementMode() {
        if (confirm('🔑 Ativar Modo Gestão?\n\nVocê terá acesso total ao sistema (igual ao Vinicius).\n\nIsso deve ser usado apenas quando Vinicius estiver ausente.')) {
            // Mudar role para manager PERMANENTEMENTE na sessão
            APP_STATE.currentRole = 'manager';
            APP_STATE.currentUser = 'vinicius'; // Importante para permissões
            APP_STATE.currentUserFullName = 'Wagner (Gestão)';
            
            // Salvar no sessionStorage para persistir na sessão
            sessionStorage.setItem('currentRole', 'manager');
            sessionStorage.setItem('currentUser', 'vinicius');
            sessionStorage.setItem('currentUserFullName', 'Wagner (Gestão)');
            
            // IMPORTANTE: Trocar classe do body de 'gestor' para 'manager'
            document.body.classList.remove('gestor');
            document.body.classList.add('manager');
            
            // Esconder botão
            document.getElementById('enableManagementBtn').style.display = 'none';
            
            // Atualizar display do nome
            document.getElementById('userNameDisplay').textContent = 'Wagner (Gestão Ativa) 🔑';
            
            // Mostrar abas de manager
            document.querySelectorAll('.manager-only').forEach(el => {
                el.style.display = 'block';
            });
            
            // Mostrar botão de cadastro
            const newVehicleBtn = document.getElementById('newVehicleBtn');
            if (newVehicleBtn) {
                newVehicleBtn.style.display = 'block';
            }
            
            // Re-renderizar tudo
            this.renderDashboard();
            Dashboard.loadTeamMembers();
            
            alert('✅ Modo Gestão ATIVADO!\n\nVocê agora tem acesso completo ao sistema.');
        }
    }

    static setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(targetTab + 'Tab').classList.add('active');
                
                if (targetTab === 'reports') {
                    ReportsManager.loadReport();
                } else if (targetTab === 'vehicles') {
                    VehiclesManager.loadVehiclesList();
                } else if (targetTab === 'team') {
                    TeamManager.loadTeam();
                } else if (targetTab === 'espera') {
                    EsperaManager.loadEspera();
                } else if (targetTab === 'rotaDesmontagem') {
                    RotaDesmontagemManager.loadRota();
                } else if (targetTab === 'rotaAplicacao') {
                    RotaAplicacaoManager.loadRota();
                } else if (targetTab === 'rotaMontagem') {
                    RotaMontagemManager.loadRota();
                } else if (targetTab === 'vendedoraDashboard') {
                    VendedoraManager.loadDashboard();
                } else if (targetTab === 'vendedoraCadastro') {
                    // Aba cadastro vendedora - nada a carregar
                } else if (targetTab === 'vendedoraRelatorio') {
                    // Aba relatório vendedora - nada a carregar
                }
            });
        });
    }

    static setupEventListeners() {
        document.getElementById('newVehicleBtn')?.addEventListener('click', () => {
            VehicleForm.show();
        });

        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            VehiclesManager.search(e.target.value);
        });

        document.getElementById('reportMonth')?.addEventListener('change', () => {
            ReportsManager.loadReport();
        });

        // Botão gerar relatório com filtros
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            const newBtn = generateReportBtn.cloneNode(true);
            generateReportBtn.parentNode.replaceChild(newBtn, generateReportBtn);
            newBtn.addEventListener('click', () => {
                ReportsManager.generateFilteredCSV();
            });
        }
        
        // Mostrar/ocultar data personalizada
        document.querySelectorAll('input[name="reportPeriod"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const customDateRange = document.getElementById('customDateRange');
                if (e.target.value === 'personalizado') {
                    customDateRange.style.display = 'block';
                } else {
                    customDateRange.style.display = 'none';
                }
            });
        });

        const exportBtn = document.getElementById('exportReportBtn');
        if (exportBtn) {
            // Remover listeners antigos
            const newBtn = exportBtn.cloneNode(true);
            exportBtn.parentNode.replaceChild(newBtn, exportBtn);
            // Adicionar novo listener
            newBtn.addEventListener('click', () => {
                ReportsManager.exportReport();
            });
        }

        document.getElementById('addAplicadorBtn')?.addEventListener('click', () => {
            TeamManager.addMember('aplicador');
        });

        document.getElementById('addMontadorBtn')?.addEventListener('click', () => {
            TeamManager.addMember('montador');
        });
        
        // NOVO: Botão adicionar vendedora
        document.getElementById('addVendedoraBtn')?.addEventListener('click', () => {
            TeamManager.addVendedora();
        });
        
        const saveRotaAplicacaoBtn = document.getElementById('saveRotaAplicacaoBtn');
        if (saveRotaAplicacaoBtn) {
            const newBtn = saveRotaAplicacaoBtn.cloneNode(true);
            saveRotaAplicacaoBtn.parentNode.replaceChild(newBtn, saveRotaAplicacaoBtn);
            newBtn.addEventListener('click', () => {
                RotaAplicacaoManager.saveRota();
            });
        }
        
        const saveRotaDesmontagemBtn = document.getElementById('saveRotaDesmontagemBtn');
        if (saveRotaDesmontagemBtn) {
            const newBtn = saveRotaDesmontagemBtn.cloneNode(true);
            saveRotaDesmontagemBtn.parentNode.replaceChild(newBtn, saveRotaDesmontagemBtn);
            newBtn.addEventListener('click', () => {
                RotaDesmontagemManager.saveRota();
            });
        }
        
        const saveRotaMontagemBtn = document.getElementById('saveRotaMontagemBtn');
        if (saveRotaMontagemBtn) {
            const newBtn = saveRotaMontagemBtn.cloneNode(true);
            saveRotaMontagemBtn.parentNode.replaceChild(newBtn, saveRotaMontagemBtn);
            newBtn.addEventListener('click', () => {
                RotaMontagemManager.saveRota();
            });
        }
    }

    static loadTeamMembers() {
        const team = DB.getTeam();
        
        const aplicadorSelect = document.getElementById('aplicador');
        const montadorSelect = document.getElementById('montador');
        
        if (aplicadorSelect) {
            aplicadorSelect.innerHTML = '<option value="">A definir</option>';
            team.aplicadores.forEach(name => {
                aplicadorSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });
        }
        
        if (montadorSelect) {
            montadorSelect.innerHTML = '<option value="">A definir</option>';
            team.montadores.forEach(name => {
                montadorSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });
        }
        
        // Atualizar select de troca de montador
        const changeMontadorSelect = document.getElementById('changeMontadorSelect');
        if (changeMontadorSelect) {
            changeMontadorSelect.innerHTML = '<option value="">Manter atual</option>';
            team.montadores.forEach(name => {
                changeMontadorSelect.innerHTML += `<option value="${name}">${name}</option>`;
            });
        }
    }

    static loadDataLists() {
        const concessionarias = DB.getConcessionarias();
        const modelos = DB.getModelos();
        
        const concessionariasList = document.getElementById('concessionariasList');
        if (concessionariasList) {
            concessionariasList.innerHTML = '';
            concessionarias.forEach(name => {
                concessionariasList.innerHTML += `<option value="${name}">`;
            });
        }
        
        const modelosList = document.getElementById('modelosList');
        if (modelosList) {
            modelosList.innerHTML = '';
            modelos.forEach(name => {
                modelosList.innerHTML += `<option value="${name}">`;
            });
        }
    }

    static renderDashboard() {
        const vehicles = DB.getVehicles();
        const role = APP_STATE.currentRole;
        const currentUserName = APP_STATE.currentUserFullName;
        
        let cadastrados = vehicles.filter(v => v.status === 'cadastrado');
        let desmontados = vehicles.filter(v => v.status === 'desmontado');
        let aplicados = vehicles.filter(v => v.status === 'aplicado');
        let finalizados = vehicles.filter(v => v.status === 'montado' && Utils.isCurrentMonth(v.montagemData));
        
        // Filtros por permissão
        if (role === 'montador') {
            console.log('=== DEBUG MONTADOR ===');
            console.log('currentUserName:', currentUserName);
            console.log('Cadastrados antes filtro:', cadastrados.map(v => ({
                modelo: v.modelo,
                montador: v.montador,
                status: v.status,
                prioridade: v.prioridade
            })));
            
            // Montador vê TODOS os seus carros cadastrados (com ou sem prioridade)
            cadastrados = cadastrados.filter(v => v.montador === currentUserName);
            
            // ORDENAR CADASTRADOS POR ROTA DE DESMONTAGEM
            cadastrados.sort((a, b) => {
                if (a.rotaDesmontagem && b.rotaDesmontagem) {
                    return a.rotaDesmontagem - b.rotaDesmontagem;
                }
                if (a.rotaDesmontagem) return -1;
                if (b.rotaDesmontagem) return 1;
                return 0;
            });
            
            console.log('Cadastrados DEPOIS filtro:', cadastrados.map(v => v.modelo));
            
            aplicados = aplicados.filter(v => v.montador === currentUserName);
            
            // FILTRAR: Só mostrar se TEM rota de montagem definida (Vinicius já organizou)
            aplicados = aplicados.filter(v => v.rotaMontagem);
            
            // ORDENAR APLICADOS POR ROTA DE MONTAGEM
            aplicados.sort((a, b) => {
                if (a.rotaMontagem && b.rotaMontagem) {
                    return a.rotaMontagem - b.rotaMontagem;
                }
                if (a.rotaMontagem) return -1;
                if (b.rotaMontagem) return 1;
                return 0;
            });
            
            // FILTRAR FINALIZADOS: vê que ELE desmontou, aplicou OU montou
            finalizados = finalizados.filter(v => 
                v.desmontadoPor === currentUserName || 
                v.aplicadoPor === currentUserName ||
                v.montadoPor === currentUserName
            );
            
            // Não vê desmontados (são para aplicadores)
            desmontados = [];
        }
        
        if (role === 'aplicador') {
            // Aplicador vê:
            // 1. DESMONTADOS (só os dele) - ordenados por sequência
            // 2. CADASTRADOS COM PRIORIDADE (onde ele é o aplicador) - antes de desmontar
            cadastrados = [];
            aplicados = aplicados.filter(v => v.aplicador === currentUserName);
            
            // FILTRAR: Só desmontados onde ele é o aplicador (COM ou SEM sequência)
            desmontados = desmontados.filter(v => v.aplicador === currentUserName);
            
            // PEGAR CADASTRADOS COM PRIORIDADE (onde ele é aplicador)
            const cadastradosPrioritarios = vehicles.filter(v => 
                v.status === 'cadastrado' && 
                v.prioridade && 
                v.aplicador === currentUserName
            );
            
            // JUNTAR: cadastrados prioritários + desmontados dele
            desmontados = [...cadastradosPrioritarios, ...desmontados];
            
            // ORDENAR POR SEQUÊNCIA DE APLICAÇÃO (definida por Vinicius)
            desmontados.sort((a, b) => {
                // Se tem sequência definida, usar ela
                if (a.sequenciaAplicacao && b.sequenciaAplicacao) {
                    return a.sequenciaAplicacao - b.sequenciaAplicacao;
                }
                // Sequência definida vem primeiro
                if (a.sequenciaAplicacao) return -1;
                if (b.sequenciaAplicacao) return 1;
                
                // Se não tem sequência, ordenar por prioridade (antigo)
                if (a.prioridade && !b.prioridade) return -1;
                if (!a.prioridade && b.prioridade) return 1;
                if (a.prioridade && b.prioridade) return a.prioridade - b.prioridade;
                
                // Por fim, por data de desmontagem (mais antigo primeiro)
                if (a.desmontagemData && b.desmontagemData) {
                    return new Date(a.desmontagemData) - new Date(b.desmontagemData);
                }
                
                return 0;
            });
            
            // FILTRAR FINALIZADOS: vê que ELE desmontou, aplicou OU montou
            finalizados = finalizados.filter(v => 
                v.desmontadoPor === currentUserName || 
                v.aplicadoPor === currentUserName ||
                v.montadoPor === currentUserName
            );
            
            // Mostrar filtro de local
            this.setupLocalFilter(desmontados);
        } else {
            // Esconder filtro se não for aplicador
            const filterSection = document.getElementById('localFilterSection');
            if (filterSection) filterSection.style.display = 'none';
        }
        
        document.getElementById('countCadastrado').textContent = cadastrados.length;
        document.getElementById('countDesmontado').textContent = desmontados.length;
        document.getElementById('countAplicado').textContent = aplicados.length;
        document.getElementById('countFinalizado').textContent = finalizados.length;
        
        this.renderColumn('columnCadastrado', cadastrados);
        this.renderColumn('columnDesmontado', desmontados);
        this.renderColumn('columnAplicado', aplicados);
        this.renderColumn('columnFinalizado', finalizados.slice(0, 20));
    }
    
    static setupLocalFilter(desmontados) {
        const filterSection = document.getElementById('localFilterSection');
        const filterSelect = document.getElementById('localFilter');
        
        if (!filterSection || !filterSelect) return;
        
        // Mostrar seção
        filterSection.style.display = 'block';
        
        // Pegar locais únicos
        const locais = [...new Set(desmontados.map(v => v.local).filter(l => l))];
        
        // Preencher dropdown
        filterSelect.innerHTML = '<option value="">Todos os locais</option>';
        locais.forEach(local => {
            filterSelect.innerHTML += `<option value="${local}">${local}</option>`;
        });
        
        // Listener do filtro
        filterSelect.onchange = () => {
            const localSelecionado = filterSelect.value;
            
            if (!localSelecionado) {
                // Mostrar todos
                this.renderColumn('columnDesmontado', desmontados);
            } else {
                // Separar com prioridade e sem prioridade
                const comPrioridade = desmontados.filter(v => v.prioridade);
                const semPrioridade = desmontados.filter(v => !v.prioridade && v.local === localSelecionado);
                
                // Mostrar: prioridades (todas) + sem prioridade filtradas
                const filtrados = [...comPrioridade, ...semPrioridade];
                this.renderColumn('columnDesmontado', filtrados);
            }
        };
    }

    static renderColumn(columnId, vehicles) {
        const column = document.getElementById(columnId);
        
        if (vehicles.length === 0) {
            column.innerHTML = '<div class="empty-state"><p>Nenhum veículo</p></div>';
            return;
        }
        
        column.innerHTML = vehicles.map(vehicle => this.createVehicleCard(vehicle)).join('');
        
        column.querySelectorAll('.vehicle-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-small')) {
                    VehicleDetailModal.show(vehicles[index]);
                }
            });
        });
    }

    static createVehicleCard(vehicle, showActions = true) {
        const actions = showActions ? this.getVehicleActions(vehicle) : '';
        const role = APP_STATE.currentRole;
        
        // Decidir qual OBS mostrar:
        // - OBS do Vinicius (cadastro) só aparece para montador e só se status = 'cadastrado'
        // - OBS do montador (desmontagem) aparece para todos após desmontar
        let obsToShow = '';
        if (vehicle.status === 'cadastrado' && role === 'montador' && vehicle.observacoes) {
            // Montador vê OBS do Vinicius (cadastro) quando ainda não desmontou
            obsToShow = `<p style="color: #dc2626;"><strong>OBS Cadastro:</strong> ${vehicle.observacoes}</p>`;
        } else if (vehicle.status !== 'cadastrado' && vehicle.obsDesmontar) {
            // Todos veem OBS do montador (desmontagem) após ser desmontado
            obsToShow = `<p style="color: #dc2626;"><strong>OBS:</strong> ${vehicle.obsDesmontar}</p>`;
        }
        
        return `
            <div class="vehicle-card">
                ${vehicle.rotaDesmontagem && vehicle.status === 'cadastrado' && role === 'montador' ? `<div style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; font-weight: bold; font-size: 1rem;">🚗 Rota Desmontagem ${vehicle.rotaDesmontagem}</div>` : ''}
                ${vehicle.sequenciaAplicacao && role === 'aplicador' ? `<div style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; font-weight: bold; font-size: 1rem;">🎨 Rota Aplicação ${vehicle.sequenciaAplicacao}</div>` : ''}
                ${vehicle.rotaMontagem && vehicle.status === 'aplicado' && role === 'montador' ? `<div style="background: #eab308; color: white; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 8px; font-weight: bold; font-size: 1rem;">🔧 Rota Montagem ${vehicle.rotaMontagem}</div>` : ''}
                ${vehicle.prioridade ? `<div style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; font-weight: bold; font-size: 0.85rem;">🔥 PRIORIDADE ${vehicle.prioridade}</div>` : ''}
                <h4>${vehicle.modelo}</h4>
                <p><strong>Chassi:</strong> ${vehicle.chassi}</p>
                <p><strong>Concessionária:</strong> ${vehicle.concessionaria}</p>
                ${vehicle.local ? `<p><strong>Local:</strong> ${vehicle.local}</p>` : ''}
                ${vehicle.obsUrgencia ? `<p style="color: #dc2626; font-weight: bold;">🚨 ${vehicle.obsUrgencia}</p>` : ''}
                ${obsToShow}
                ${vehicle.aplicador ? `<p><strong>Aplicador:</strong> ${vehicle.aplicador}</p>` : ''}
                ${vehicle.montador ? `<p><strong>Montador:</strong> ${vehicle.montador}</p>` : ''}
                ${vehicle.cadastroData ? `<p><small>Cadastrado: ${Utils.formatDate(vehicle.cadastroData)}</small></p>` : ''}
                ${vehicle.desmontagemData ? `<p><small>Desmontado: ${Utils.formatDate(vehicle.desmontagemData)}${vehicle.desmontadoPor ? ` - por ${vehicle.desmontadoPor}` : ''}</small></p>` : ''}
                ${vehicle.aplicacaoData ? `<p><small>Aplicado: ${Utils.formatDateTime(vehicle.aplicacaoData)}${vehicle.aplicadoPor ? ` - por ${vehicle.aplicadoPor}` : ''}</small></p>` : ''}
                ${vehicle.montagemData ? `<p><small>Montado: ${Utils.formatDate(vehicle.montagemData)}${vehicle.montadoPor ? ` - por ${vehicle.montadoPor}` : ''} ${vehicle.montagemFotos && vehicle.montagemFotos.length > 0 ? `📷 ${vehicle.montagemFotos.length}` : ''}</small></p>` : ''}
                <div class="card-actions">
                    ${actions}
                </div>
            </div>
        `;
    }

    static getVehicleActions(vehicle) {
        const role = APP_STATE.currentRole;
        const currentUserName = APP_STATE.currentUserFullName;
        
        // Gestor não tem botões de ação
        if (role === 'gestor') {
            return '';
        }
        
        // Gerente pode tudo
        if (role === 'manager') {
            if (vehicle.status === 'cadastrado') {
                return '<button class="btn btn-small btn-secondary" onclick="Dashboard.markAsDesmontado(\'' + vehicle.id + '\')">Desmontar</button>';
            } else if (vehicle.status === 'desmontado') {
                return '<button class="btn btn-small btn-secondary" onclick="Dashboard.markAsAplicado(\'' + vehicle.id + '\')">Aplicado</button>';
            } else if (vehicle.status === 'aplicado') {
                return '<button class="btn btn-small btn-success" onclick="Dashboard.markAsMontado(\'' + vehicle.id + '\')">Montar</button>';
            }
            return '';
        }
        
        // Montador
        if (role === 'montador') {
            // Só vê seus carros
            if (vehicle.montador !== currentUserName) return '';
            
            if (vehicle.status === 'cadastrado') {
                return '<button class="btn btn-small btn-secondary" onclick="Dashboard.markAsDesmontado(\'' + vehicle.id + '\')">Desmontar</button>';
            } else if (vehicle.status === 'aplicado') {
                return `
                    <button class="btn btn-small btn-success" onclick="Dashboard.markAsMontado('${vehicle.id}')">Montar</button>
                    <button class="btn btn-small btn-warning" onclick="Dashboard.colocarEmEsperaMontagem('${vehicle.id}')">⏸️ Espera</button>
                `;
            }
        }
        
        // Aplicador
        if (role === 'aplicador') {
            if (vehicle.status === 'desmontado') {
                return `
                    <button class="btn btn-small btn-secondary" onclick="Dashboard.markAsAplicado('${vehicle.id}')">Aplicado</button>
                    <button class="btn btn-small btn-warning" onclick="Dashboard.colocarEmEsperaAplicacao('${vehicle.id}')">⏸️ Espera</button>
                `;
            }
            // Se é cadastrado COM PRIORIDADE e é dele, mostra aviso
            if (vehicle.status === 'cadastrado' && vehicle.prioridade && vehicle.aplicador === currentUserName) {
                return '<span style="background: #fbbf24; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">⏳ Aguardando Desmontagem</span>';
            }
        }
        
        return '';
    }

    static markAsDesmontado(vehicleId) {
        UpdateStatusModal.show(vehicleId, 'desmontado');
    }

    static markAsAplicado(vehicleId) {
        console.log('markAsAplicado chamado para veículo:', vehicleId);
        UpdateStatusModal.show(vehicleId, 'aplicado');
    }

    static markAsMontado(vehicleId) {
        console.log('markAsMontado chamado para veículo:', vehicleId);
        UpdateStatusModal.show(vehicleId, 'montado');
    }
    
    static colocarEmEsperaAplicacao(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Veículo não encontrado!');
            return;
        }
        
        // Modal com motivos específicos de aplicação
        const motivos = [
            'Película acabou',
            'Aguardando arrumar arranhado',
            'Não deu tempo no dia'
        ];
        
        let html = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; width: 90%;">
                    <h3 style="margin: 0 0 16px 0;">⏸️ Colocar em Espera - Aplicação</h3>
                    <p style="margin-bottom: 16px;"><strong>${vehicle.modelo}</strong> - ${vehicle.chassi}</p>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #dc2626;">Por que não aplicou?</label>
                    <select id="motivoEsperaTemp" style="width: 100%; padding: 10px; margin-bottom: 16px; border: 2px solid #cbd5e1; border-radius: 6px;">
                        <option value="">Selecione o motivo</option>
                        ${motivos.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button id="btnCancelarEspera" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer;">Cancelar</button>
                        <button id="btnConfirmarEspera" style="padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        document.getElementById('btnCancelarEspera').onclick = async () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('btnConfirmarEspera').onclick = async () => {
            const motivo = document.getElementById('motivoEsperaTemp').value;
            
            if (!motivo) {
                alert('Selecione o motivo!');
                return;
            }
            
            // Mover para espera
            vehicle.status = 'espera';
            vehicle.motivoEspera = motivo;
            vehicle.dataEspera = new Date().toISOString();
            vehicle.tentouDesmontarPor = APP_STATE.currentUserFullName;
            vehicle.etapaEspera = 'aplicacao'; // Identifica que veio da aplicação
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            document.body.removeChild(modal);
            alert(`✅ Veículo movido para ABA DE ESPERA.\nMotivo: ${motivo}`);
        };
    }
    
    static colocarEmEsperaMontagem(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Veículo não encontrado!');
            return;
        }
        
        // Motivos iguais à desmontagem
        const motivos = [
            'Concessionária fechada',
            'Carro em reparo',
            'Passou da hora'
        ];
        
        let html = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; padding: 24px; border-radius: 8px; max-width: 500px; width: 90%;">
                    <h3 style="margin: 0 0 16px 0;">⏸️ Colocar em Espera - Montagem</h3>
                    <p style="margin-bottom: 16px;"><strong>${vehicle.modelo}</strong> - ${vehicle.chassi}</p>
                    <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #dc2626;">Por que não montou?</label>
                    <select id="motivoEsperaTemp" style="width: 100%; padding: 10px; margin-bottom: 16px; border: 2px solid #cbd5e1; border-radius: 6px;">
                        <option value="">Selecione o motivo</option>
                        ${motivos.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button id="btnCancelarEspera" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer;">Cancelar</button>
                        <button id="btnConfirmarEspera" style="padding: 10px 20px; background: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Confirmar</button>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.innerHTML = html;
        document.body.appendChild(modal);
        
        document.getElementById('btnCancelarEspera').onclick = async () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('btnConfirmarEspera').onclick = async () => {
            const motivo = document.getElementById('motivoEsperaTemp').value;
            
            if (!motivo) {
                alert('Selecione o motivo!');
                return;
            }
            
            // Mover para espera
            vehicle.status = 'espera';
            vehicle.motivoEspera = motivo;
            vehicle.dataEspera = new Date().toISOString();
            vehicle.tentouDesmontarPor = APP_STATE.currentUserFullName;
            vehicle.etapaEspera = 'montagem'; // Identifica que veio da montagem
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            document.body.removeChild(modal);
            alert(`✅ Veículo movido para ABA DE ESPERA.\nMotivo: ${motivo}`);
        };
    }

    static startAutoRefresh() {
        // Atualizar dashboard a cada 10 segundos
        setInterval(() => {
            if (document.getElementById('dashboardTab').classList.contains('active')) {
                this.renderDashboard();
            }
        }, 10000); // 10 segundos
        
        // Verificar automação 18h a cada 5 minutos
        this.checkEsperaAutomation();
        setInterval(() => {
            this.checkEsperaAutomation();
        }, 5 * 60 * 1000); // 5 minutos
    }
    
    static async checkEsperaAutomation() {
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        
        // Configuração: horário 18:40h
        const HORA_LIMITE = 18;
        const MINUTO_LIMITE = 40;
        
        // Verificar se já rodou hoje
        const hoje = now.toDateString();
        const ultimaExecucao = localStorage.getItem('ultimaAutomacaoEspera');
        
        if (ultimaExecucao === hoje) {
            // Já rodou hoje, não roda de novo
            return;
        }
        
        // Só roda entre 18:40h e 18:50h (janela de 10 min)
        const dentroJanela = (hour === HORA_LIMITE && minutes >= MINUTO_LIMITE && minutes < MINUTO_LIMITE + 10) ||
                             (hour === HORA_LIMITE + 1 && minutes < 10);
        
        if (!dentroJanela) {
            return; // Fora do horário
        }
        
        // EXECUTAR AUTOMAÇÃO
        const vehicles = DB.getVehicles();
        const today = new Date().toDateString();
        let movidosParaEspera = 0;
        
        vehicles.forEach(v => {
            // Se está CADASTRADO e foi cadastrado HOJE
            if (v.status === 'cadastrado' && v.cadastroData) {
                const cadastroDate = new Date(v.cadastroData);
                const cadastroDateStr = cadastroDate.toDateString();
                const cadastroHour = cadastroDate.getHours();
                const cadastroMinutes = cadastroDate.getMinutes();
                
                // Verificar se foi cadastrado ANTES das 18:40h
                const cadastradoAntes = (cadastroHour < HORA_LIMITE) || (cadastroHour === HORA_LIMITE && cadastroMinutes < MINUTO_LIMITE);
                
                // Se foi cadastrado HOJE e ANTES das 18:40h (e ainda não desmontou)
                if (cadastroDateStr === today && cadastradoAntes) {
                    // Mover para ESPERA
                    v.status = 'espera';
                    v.motivoEspera = 'Não desmontado até 18:40h';
                    v.dataEspera = new Date().toISOString();
                    v.tentouDesmontarPor = 'Automação (Não tentou)';
                    v.etapaEspera = 'desmontagem'; // NOVO
                    
                    // Limpar montador e rota para reatribuir amanhã
                    delete v.montador;
                    delete v.rotaDesmontagem;
                    
                    movidosParaEspera++;
                }
            }
        });
        
        if (movidosParaEspera > 0) {
            // CRITICAL: Buscar dados ATUALIZADOS do Firebase ANTES de salvar!
            const vehiclesAtualizados = await FirebaseDB.getVehicles() || vehicles;
            
            // Aplicar mudanças nos dados ATUALIZADOS
            vehiclesAtualizados.forEach(v => {
                if (v.status === 'cadastrado' && v.cadastroData) {
                    const cadastroDate = new Date(v.cadastroData);
                    const cadastroDateStr = cadastroDate.toDateString();
                    const cadastroHour = cadastroDate.getHours();
                    const cadastroMinutes = cadastroDate.getMinutes();
                    
                    const cadastradoAntes = (cadastroHour < HORA_LIMITE) || (cadastroHour === HORA_LIMITE && cadastroMinutes < MINUTO_LIMITE);
                    
                    if (cadastroDateStr === today && cadastradoAntes) {
                        v.status = 'espera';
                        v.motivoEspera = 'Não desmontado até 18:40h';
                        v.dataEspera = new Date().toISOString();
                        v.tentouDesmontarPor = 'Automação (Não tentou)';
                        v.etapaEspera = 'desmontagem';
                        delete v.montador;
                        delete v.rotaDesmontagem;
                    }
                }
            });
            
            await saveBoth.vehicles(vehiclesAtualizados);
            this.renderDashboard();
            
            // Marcar que já rodou hoje
            localStorage.setItem('ultimaAutomacaoEspera', hoje);
            
            console.log(`✅ Automação 18:40h executada: ${movidosParaEspera} veículo(s) movido(s) para ESPERA`);
            alert(`⏰ Automação 18:40h\n\n${movidosParaEspera} veículo(s) não desmontado(s) foram movidos para ESPERA.\n\nRotas limpas para reatribuir amanhã!`);
        }
    }
}

// Formulário de Novo Veículo
class VehicleForm {
    static show() {
        const modal = document.getElementById('newVehicleModal');
        modal.classList.add('active');
        
        this.setupForm();
    }

    static setupForm() {
        const form = document.getElementById('newVehicleForm');
        const photoInput = document.getElementById('vehiclePhoto');
        const photoInputCamera = document.getElementById('vehiclePhotoCamera');
        const photoPreview = document.getElementById('photoPreview');
        const extractBtn = document.getElementById('extractDataBtn');
        const chassiInput = document.getElementById('chassi');
        
        // Função compartilhada para processar foto
        const processPhoto = async (file) => {
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const imageData = event.target.result;
                    photoPreview.innerHTML = `<img src="${imageData}" alt="Foto do veículo">`;
                    
                    // OCR AUTOMÁTICO
                    extractBtn.style.display = 'block';
                    extractBtn.disabled = true;
                    extractBtn.innerHTML = '🔍 Lendo foto... <span id="ocrProgress">0%</span>';
                    
                    try {
                        const result = await Tesseract.recognize(
                            imageData,
                            'por',
                            {
                                logger: m => {
                                    if (m.status === 'recognizing text') {
                                        const progress = Math.round(m.progress * 100);
                                        document.getElementById('ocrProgress').textContent = `${progress}%`;
                                    }
                                }
                            }
                        );
                        
                        const text = result.data.text.toUpperCase();
                        console.log('📝 Texto extraído:', text);
                        
                        // Extrair dados comuns
                        this.extractVehicleData(text);
                        
                        extractBtn.innerHTML = '✅ Dados extraídos!';
                        setTimeout(() => {
                            extractBtn.style.display = 'none';
                        }, 2000);
                        
                    } catch (error) {
                        console.error('Erro OCR:', error);
                        extractBtn.innerHTML = '❌ Erro ao ler foto';
                        extractBtn.disabled = false;
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        
        // Event listeners para ambos inputs
        photoInput.addEventListener('change', (e) => processPhoto(e.target.files[0]));
        photoInputCamera.addEventListener('change', (e) => processPhoto(e.target.files[0]));

        extractBtn.addEventListener('click', () => {
            // Botão agora é apenas informativo
        });

        chassiInput.addEventListener('blur', () => {
            this.checkDuplicateChassi();
        });

        form.onsubmit = async (e) => {
            e.preventDefault();
            this.submitForm();
        };

        const modal = document.getElementById('newVehicleModal');
        document.querySelectorAll('#newVehicleModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                form.reset();
                photoPreview.innerHTML = '';
                extractBtn.style.display = 'none';
                
                // Limpar inputs de foto
                photoInput.value = '';
                photoInputCamera.value = '';
                
                // Limpar readonly (vendedora)
                const concInput = document.getElementById('concessionaria');
                const localInput = document.getElementById('local');
                if (concInput) {
                    concInput.removeAttribute('readonly');
                    concInput.style.background = '';
                }
                if (localInput) {
                    localInput.removeAttribute('readonly');
                    localInput.style.background = '';
                }
            });
        });
    }
    
    static extractVehicleData(text) {
        console.log('🔍 Iniciando extração inteligente de dados...');
        
        // Divide o texto em linhas para análise contextual
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        
        // ========== 1. CHASSI (PRIORIDADE MÁXIMA) ==========
        console.log('🔍 Procurando chassi...');
        let chassi = null;
        
        // Procura por padrão de chassi (17 caracteres)
        const chassiPatterns = [
            /CHASSI[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
            /VIN[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
            /CHASSIS[:\s]*([A-HJ-NPR-Z0-9]{17})/i,
            /\b([A-HJ-NPR-Z0-9]{17})\b/
        ];
        
        for (const pattern of chassiPatterns) {
            const match = text.match(pattern);
            if (match) {
                chassi = match[1] || match[0];
                if (chassi.length === 17) {
                    document.getElementById('chassi').value = chassi;
                    console.log('✅ Chassi encontrado:', chassi);
                    break;
                }
            }
        }
        
        if (!chassi) console.log('⚠️ Chassi não encontrado');
        
        // ========== 2. MODELO (SEGUNDA PRIORIDADE) ==========
        console.log('🔍 Procurando modelo...');
        let modelo = null;
        
        // Lista de modelos conhecidos (expandida)
        const modelosConhecidos = [
            'WRV', 'CIVIC', 'FIT', 'CITY', 'HRV', 'CRV', // Honda
            'KICKS', 'VERSA', 'SENTRA', 'FRONTIER', 'MARCH', // Nissan
            'SONG', 'YUAN', 'TAN', 'HAN', 'DOLPHIN', // BYD
            'XC40', 'XC60', 'XC90', 'S60', 'V60', // Volvo
            'COROLLA', 'HILUX', 'RAV4', 'YARIS', 'ETIOS', // Toyota
            'RANGER', 'ECOSPORT', 'KA', 'FUSION', 'BRONCO', // Ford
            'KWID', 'SANDERO', 'LOGAN', 'DUSTER', 'CAPTUR', // Renault
            'ONIX', 'TRACKER', 'SPIN', 'S10', 'TRAILBLAZER', // Chevrolet
            'ARGO', 'MOBI', 'CRONOS', 'TORO', 'STRADA' // Fiat
        ];
        
        // Procura com palavras-chave contextuais
        const modeloPatterns = [
            /MODELO[:\s]*([A-Z0-9\-]+)/i,
            /VEÍCULO[:\s]*([A-Z0-9\-]+)/i,
            /VEICULO[:\s]*([A-Z0-9\-]+)/i,
            /MODEL[:\s]*([A-Z0-9\-]+)/i
        ];
        
        for (const pattern of modeloPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                modelo = match[1].toUpperCase().trim();
                document.getElementById('modelo').value = modelo;
                console.log('✅ Modelo encontrado (contexto):', modelo);
                break;
            }
        }
        
        // Se não achou com contexto, procura na lista de modelos conhecidos
        if (!modelo) {
            for (const m of modelosConhecidos) {
                if (text.includes(m)) {
                    modelo = m;
                    document.getElementById('modelo').value = modelo;
                    console.log('✅ Modelo encontrado (lista):', modelo);
                    break;
                }
            }
        }
        
        if (!modelo) console.log('⚠️ Modelo não encontrado');
        
        // ========== 3. CONCESSIONÁRIA ==========
        console.log('🔍 Procurando concessionária...');
        let concessionaria = null;
        
        // Lista expandida de concessionárias
        const concessionarias = [
            'KOBE', 'HONDA', 'NISSAN', 'BYD', 'VOLVO', 'TOYOTA', 
            'FORD', 'RENAULT', 'CHEVROLET', 'FIAT', 'JEEP',
            'HYUNDAI', 'MITSUBISHI', 'CAOA', 'PEUGEOT', 'CITROEN'
        ];
        
        // Procura nas primeiras 5 linhas (topo do documento)
        const topoDocumento = lines.slice(0, 5).join(' ').toUpperCase();
        
        for (const conc of concessionarias) {
            if (topoDocumento.includes(conc)) {
                concessionaria = conc;
                document.getElementById('concessionaria').value = conc;
                console.log('✅ Concessionária encontrada (topo):', conc);
                break;
            }
        }
        
        // Se não achou no topo, procura em todo documento
        if (!concessionaria) {
            for (const conc of concessionarias) {
                if (text.includes(conc)) {
                    concessionaria = conc;
                    document.getElementById('concessionaria').value = conc;
                    console.log('✅ Concessionária encontrada:', conc);
                    break;
                }
            }
        }
        
        if (!concessionaria) console.log('⚠️ Concessionária não encontrada');
        
        // ========== 4. LOCAL/ENDEREÇO ==========
        console.log('🔍 Procurando local...');
        let local = null;
        
        // Procura por padrões de endereço
        const enderecoPatterns = [
            /ENDEREÇO[:\s]*([^\n]+)/i,
            /ENDERECO[:\s]*([^\n]+)/i,
            /RUA[:\s]*([^\n]+)/i,
            /AV[:\s\.]*([^\n]+)/i,
            /AVENIDA[:\s]*([^\n]+)/i
        ];
        
        for (const pattern of enderecoPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const enderecoCompleto = match[1].toUpperCase();
                
                // Extrai bairro do endereço
                const bairrosConhecidos = [
                    'BARRA DA TIJUCA', 'BARRA', 'TIJUCA', 'CENTRO', 
                    'BOTAFOGO', 'COPACABANA', 'IPANEMA', 'LEBLON',
                    'RECREIO', 'JACAREPAGUÁ', 'CAMPO GRANDE',
                    'ZONA SUL', 'ZONA NORTE', 'ZONA OESTE'
                ];
                
                for (const bairro of bairrosConhecidos) {
                    if (enderecoCompleto.includes(bairro)) {
                        local = bairro;
                        document.getElementById('local').value = bairro;
                        console.log('✅ Local encontrado (endereço):', bairro);
                        break;
                    }
                }
                
                if (local) break;
            }
        }
        
        // Se não achou no endereço, procura bairros diretamente
        if (!local) {
            const bairros = ['BARRA DA TIJUCA', 'BARRA', 'TIJUCA', 'CENTRO', 'BOTAFOGO', 'COPACABANA', 'IPANEMA', 'LEBLON', 'RECREIO'];
            for (const bairro of bairros) {
                if (text.includes(bairro)) {
                    local = bairro;
                    document.getElementById('local').value = bairro;
                    console.log('✅ Local encontrado:', bairro);
                    break;
                }
            }
        }
        
        if (!local) console.log('⚠️ Local não encontrado');
        
        // ========== RESUMO ==========
        const encontrados = [chassi, modelo, concessionaria, local].filter(Boolean).length;
        console.log(`✅ Extração concluída: ${encontrados}/4 campos preenchidos`);
        
        if (encontrados === 0) {
            alert('⚠️ Não foi possível extrair dados da foto.\n\nTente uma foto mais nítida ou preencha manualmente.');
        } else if (encontrados < 4) {
            alert(`✅ ${encontrados} campo(s) preenchido(s)!\n\nVerifique e complete os campos restantes.`);
        } else {
            alert('✅ Todos os dados foram extraídos!\n\nVerifique se estão corretos.');
        }
    }

    static checkDuplicateChassi() {
        const chassi = document.getElementById('chassi').value.trim();
        const modelo = document.getElementById('modelo').value.trim();
        const concessionaria = document.getElementById('concessionaria').value.trim();
        const warning = document.getElementById('chassiWarning');
        
        if (!chassi) {
            warning.textContent = '';
            return;
        }
        
        const vehicles = DB.getVehicles();
        const duplicate = vehicles.find(v => 
            v.chassi === chassi && 
            v.modelo === modelo && 
            v.concessionaria === concessionaria
        );
        
        if (duplicate) {
            warning.textContent = '⚠️ Veículo já consta no banco de dados';
        } else {
            warning.textContent = '';
        }
    }

    static async submitForm() {
        console.log('🔵 submitForm INICIADO!');
        
        const concessionaria = document.getElementById('concessionaria').value.trim().toUpperCase();
        const local = document.getElementById('local').value.trim().toUpperCase();
        const chassi = document.getElementById('chassi').value.trim();
        const modelo = document.getElementById('modelo').value.trim().toUpperCase();
        const observacoes = document.getElementById('observacoes').value.trim();
        const prioridade = document.getElementById('prioridade').value.trim();
        const obsUrgencia = document.getElementById('obsUrgencia').value.trim();
        const aplicador = document.getElementById('aplicador').value;
        const montador = document.getElementById('montador').value;
        
        console.log('📝 Dados:', {modelo, chassi, concessionaria});
        
        const vehicles = DB.getVehicles();
        const newVehicle = {
            id: Utils.generateId(),
            concessionaria,
            local,
            chassi,
            modelo,
            observacoes,
            prioridade: prioridade ? parseInt(prioridade) : null, // Converter para número ou null
            obsUrgencia,
            aplicador,
            montador,
            status: 'cadastrado',
            cadastradoPor: APP_STATE.currentUserFullName,
            cadastradoPorPerfil: APP_STATE.currentRole, // NOVO
            cadastroData: new Date().toISOString()
        };
        
        console.log('🚗 Novo veículo:', newVehicle);
        
        vehicles.unshift(newVehicle);
        await saveBoth.vehicle(newVehicle);
        
        console.log('💾 Veículo salvo! Total:', vehicles.length);
        
        const concessionarias = DB.getConcessionarias();
        if (!concessionarias.includes(concessionaria) && concessionaria) {
            concessionarias.push(concessionaria);
            DB.saveConcessionarias(concessionarias);
        }
        
        const modelos = DB.getModelos();
        if (!modelos.includes(modelo) && modelo) {
            modelos.push(modelo);
            DB.saveModelos(modelos);
        }
        
        document.getElementById('newVehicleModal').classList.remove('active');
        document.getElementById('newVehicleForm').reset();
        document.getElementById('photoPreview').innerHTML = '';
        
        // Limpar readonly (caso vendedora)
        const concInput = document.getElementById('concessionaria');
        const localInput = document.getElementById('local');
        if (concInput) {
            concInput.removeAttribute('readonly');
            concInput.style.background = '';
        }
        if (localInput) {
            localInput.removeAttribute('readonly');
            localInput.style.background = '';
        }
        
        // Recarregar dashboard apropriado
        if (APP_STATE.currentRole === 'vendedora') {
            VendedoraManager.loadDashboard();
        } else {
            Dashboard.renderDashboard();
        }
        Dashboard.loadDataLists();
        
        alert('Veículo cadastrado com sucesso!');
    }
}

// Modal de Atualização de Status
class UpdateStatusModal {
    static show(vehicleId, action) {
        console.log('UpdateStatusModal.show chamado:', vehicleId, action);
        const modal = document.getElementById('updateStatusModal');
        const form = document.getElementById('updateStatusForm');
        const title = document.getElementById('updateStatusTitle');
        const photoSection = document.getElementById('photoUploadSection');
        const changeMontadorSection = document.getElementById('changeMontadorSection');
        
        document.getElementById('updateVehicleId').value = vehicleId;
        document.getElementById('updateAction').value = action;
        
        // Limpar os 4 slots de fotos
        for (let i = 1; i <= 4; i++) {
            const preview = document.getElementById(`preview${i}`);
            if (preview) {
                preview.innerHTML = '';
                preview.classList.remove('has-photo');
            }
            const input = document.getElementById(`photo${i}`);
            if (input) {
                input.value = '';
            }
        }
        const counter = document.getElementById('photoCounter');
        if (counter) counter.textContent = '';
        
        // Buscar veículo
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        const obsDesmontarSection = document.getElementById('obsDesmontarSection');
        const desmontarChoiceSection = document.getElementById('desmontarChoiceSection');
        const motivoNaoDesmontarSection = document.getElementById('motivoNaoDesmontarSection');
        const obsAplicadorSection = document.getElementById('obsAplicadorSection');
        const modalActions = document.getElementById('modalActions');
        
        if (action === 'desmontado') {
            title.textContent = 'Desmontagem';
            photoSection.style.display = 'none';
            changeMontadorSection.style.display = 'none';
            obsDesmontarSection.style.display = 'none';
            obsAplicadorSection.style.display = 'none';
            desmontarChoiceSection.style.display = 'block';
            motivoNaoDesmontarSection.style.display = 'none';
            modalActions.style.display = 'none'; // Esconder botões inicialmente
            
            // Limpar campos
            document.getElementById('obsDesmontar').value = '';
            document.getElementById('motivoNaoDesmontar').value = '';
            
            // Listeners dos botões SIM/NÃO
            document.getElementById('btnDesmontouSim').onclick = async () => {
                desmontarChoiceSection.style.display = 'none';
                obsDesmontarSection.style.display = 'block';
                motivoNaoDesmontarSection.style.display = 'none';
                modalActions.style.display = 'flex'; // Mostrar botões
                document.getElementById('updateAction').value = 'desmontado_sim';
                // Remover required do motivo
                document.getElementById('motivoNaoDesmontar').removeAttribute('required');
            };
            
            document.getElementById('btnDesmontouNao').onclick = async () => {
                desmontarChoiceSection.style.display = 'none';
                obsDesmontarSection.style.display = 'none';
                motivoNaoDesmontarSection.style.display = 'block';
                modalActions.style.display = 'flex'; // Mostrar botões
                document.getElementById('updateAction').value = 'desmontado_nao';
                // Adicionar required no motivo
                document.getElementById('motivoNaoDesmontar').setAttribute('required', 'required');
            };
            
        } else if (action === 'aplicado') {
            title.textContent = 'Marcar como Aplicado';
            photoSection.style.display = 'none';
            obsDesmontarSection.style.display = 'none';
            desmontarChoiceSection.style.display = 'none';
            motivoNaoDesmontarSection.style.display = 'none';
            changeMontadorSection.style.display = 'none';
            
            // Mostrar campo de OBS do Aplicador
            const obsAplicadorSection = document.getElementById('obsAplicadorSection');
            obsAplicadorSection.style.display = 'block';
            document.getElementById('obsAplicador').value = '';
            
            modalActions.style.display = 'flex'; // Mostrar botões
            
        } else if (action === 'montado') {
            console.log('📸 Abrindo modal de MONTAGEM - botões devem aparecer!');
            title.textContent = 'Marcar como Montado';
            photoSection.style.display = 'block';
            obsDesmontarSection.style.display = 'none';
            obsAplicadorSection.style.display = 'none';
            desmontarChoiceSection.style.display = 'none';
            motivoNaoDesmontarSection.style.display = 'none';
            modalActions.style.display = 'flex'; // Mostrar botões
            console.log('✅ modalActions.style.display =', modalActions.style.display);
            this.setupPhotoUpload();
            
            // Mostrar opção de trocar montador
            if (APP_STATE.currentRole === 'montador') {
                changeMontadorSection.style.display = 'block';
                Dashboard.loadTeamMembers();
            } else {
                changeMontadorSection.style.display = 'none';
            }
        } else {
            // Outras ações
            photoSection.style.display = 'none';
            changeMontadorSection.style.display = 'none';
            obsDesmontarSection.style.display = 'none';
            obsAplicadorSection.style.display = 'none';
            desmontarChoiceSection.style.display = 'none';
            motivoNaoDesmontarSection.style.display = 'none';
            modalActions.style.display = 'flex'; // Mostrar botões
        }
        
        modal.classList.add('active');
        console.log('Modal deveria estar visível agora');
        
        form.onsubmit = async (e) => {
            e.preventDefault();
            this.submit();
        };
        
        document.querySelectorAll('#updateStatusModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                form.reset();
                
                // Limpar os 4 slots de fotos
                for (let i = 1; i <= 4; i++) {
                    const preview = document.getElementById(`preview${i}`);
                    if (preview) {
                        preview.innerHTML = '';
                        preview.classList.remove('has-photo');
                    }
                    const input = document.getElementById(`photo${i}`);
                    if (input) {
                        input.value = '';
                    }
                }
                const counter = document.getElementById('photoCounter');
                if (counter) counter.textContent = '';
            });
        });
    }

    static setupPhotoUpload() {
        // Sistema novo com 4 slots individuais - não precisa de setup aqui
        // Cada input chama handlePhotoUpload() diretamente
    }
    
    static handlePhotoUpload(slotNumber, input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgElement = new Image();
            imgElement.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Redimensionar mantendo proporção (max 800px)
                let width = imgElement.width;
                let height = imgElement.height;
                const maxSize = 800;
                
                if (width > height && width > maxSize) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(imgElement, 0, 0, width, height);
                
                // Comprimir para JPEG 70% qualidade
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // Mostrar preview no slot
                const preview = document.getElementById(`preview${slotNumber}`);
                preview.innerHTML = `
                    <img src="${compressedBase64}" data-base64="${compressedBase64}">
                    <button class="remove-photo" onclick="UpdateStatusModal.removePhoto(${slotNumber})">×</button>
                `;
                preview.classList.add('has-photo');
                
                // Atualizar contador
                UpdateStatusModal.updatePhotoCounter();
            };
            imgElement.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    static removePhoto(slotNumber) {
        const preview = document.getElementById(`preview${slotNumber}`);
        preview.innerHTML = '';
        preview.classList.remove('has-photo');
        document.getElementById(`photo${slotNumber}`).value = '';
        UpdateStatusModal.updatePhotoCounter();
    }
    
    static updatePhotoCounter() {
        let count = 0;
        for (let i = 1; i <= 4; i++) {
            const preview = document.getElementById(`preview${i}`);
            if (preview.classList.contains('has-photo')) {
                count++;
            }
        }
        const counter = document.getElementById('photoCounter');
        if (count > 0) {
            counter.textContent = `📷 ${count} foto(s) adicionada(s)`;
        } else {
            counter.textContent = '';
        }
    }

    static async submit() {
        const vehicleId = document.getElementById('updateVehicleId').value;
        const action = document.getElementById('updateAction').value;
        const newMontador = document.getElementById('changeMontadorSelect')?.value;
        
        console.log('Submit chamado! Action:', action); // DEBUG
        
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (vehicle && action === 'desmontado_sim') {
            console.log('Processando desmontado_sim'); // DEBUG
            // DESMONTOU COM SUCESSO
            vehicle.status = 'desmontado';
            vehicle.desmontagemData = new Date().toISOString();
            vehicle.desmontadoPor = APP_STATE.currentUserFullName;
            
            // Salvar observações da desmontagem (avarias)
            const obsDesmontar = document.getElementById('obsDesmontar').value.trim();
            if (obsDesmontar) {
                vehicle.obsDesmontar = obsDesmontar;
            }
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificação enviada pela Cloud Function automaticamente
            // (não precisa enviar aqui para evitar duplicação)
            
            document.getElementById('updateStatusModal').classList.remove('active');
            document.getElementById('updateStatusForm').reset();
            
            alert('Veículo desmontado com sucesso!');
            
        } else if (vehicle && action === 'desmontado_nao') {
            // NÃO DESMONTOU - Validar motivo obrigatório
            const motivo = document.getElementById('motivoNaoDesmontar').value;
            if (!motivo) {
                alert('Por favor, selecione o motivo por não ter desmontado!');
                return;
            }
            
            // Mover para ESPERA
            vehicle.status = 'espera';
            vehicle.motivoEspera = motivo;
            vehicle.dataEspera = new Date().toISOString();
            vehicle.tentouDesmontarPor = APP_STATE.currentUserFullName;
            vehicle.etapaEspera = 'desmontagem'; // NOVO: identifica de onde veio
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificação enviada pela Cloud Function automaticamente
            
            document.getElementById('updateStatusModal').classList.remove('active');
            document.getElementById('updateStatusForm').reset();
            
            alert(`Veículo movido para ABA DE ESPERA. Motivo: ${motivo}`);
            
        } else if (vehicle && action === 'aplicado') {
            // APLICADO - Salvar observações do aplicador
            vehicle.status = 'aplicado';
            vehicle.aplicacaoData = new Date().toISOString();
            vehicle.aplicadoPor = APP_STATE.currentUserFullName;
            
            // Salvar observações do aplicador (avarias ao receber)
            const obsAplicador = document.getElementById('obsAplicador').value.trim();
            if (obsAplicador) {
                vehicle.obsAplicador = obsAplicador;
            }
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificação enviada pela Cloud Function automaticamente
            
            document.getElementById('updateStatusModal').classList.remove('active');
            document.getElementById('updateStatusForm').reset();
            
            alert('Veículo marcado como aplicado!');
            
        } else if (vehicle && action === 'montado') {
            console.log('=== DEBUG MONTAGEM ===');
            console.log('newMontador:', newMontador);
            console.log('vehicle.montador:', vehicle.montador);
            console.log('Vai trocar?', newMontador && newMontador.trim() !== '' && newMontador !== vehicle.montador);
            
            // Verificar se trocou montador (só se selecionou um diferente)
            if (newMontador && newMontador.trim() !== '' && newMontador !== vehicle.montador) {
                console.log('TROCANDO MONTADOR!');
                // TROCAR MONTADOR: não finaliza, volta pra "aplicado" para o novo montador
                vehicle.montador = newMontador;
                vehicle.status = 'aplicado'; // Volta pra fila
                
                await saveBoth.vehicles(vehicles);
                Dashboard.renderDashboard();
                
                document.getElementById('updateStatusModal').classList.remove('active');
                document.getElementById('updateStatusForm').reset();
                
                alert(`Veículo transferido para ${newMontador}. Ele precisa finalizar a montagem.`);
                return; // Para aqui, não salva fotos
            }
            
            console.log('NÃO TROCOU, vai finalizar normalmente');
            
            // Se NÃO trocou montador, finaliza normalmente
            vehicle.status = 'montado';
            vehicle.montagemData = new Date().toISOString();
            vehicle.montadoPor = APP_STATE.currentUserFullName;
            
            // Salvar fotos dos 4 slots
            vehicle.montagemFotos = [];
            for (let i = 1; i <= 4; i++) {
                const preview = document.getElementById(`preview${i}`);
                const img = preview.querySelector('img');
                if (img && img.dataset.base64) {
                    vehicle.montagemFotos.push(img.dataset.base64);
                }
            }
            
            if (vehicle.montagemFotos.length === 0) {
                alert('ATENÇÃO: É importante adicionar pelo menos 1 foto da montagem!');
            }
            
            console.log(`Salvando ${vehicle.montagemFotos.length} fotos`); // Debug
            
            await saveBoth.vehicles(vehicles);
            Dashboard.renderDashboard();
            
            // NOVO: Notificar vendedora se foi ela quem cadastrou
            if (vehicle.cadastradoPorPerfil === 'vendedora' && vehicle.cadastradoPor) {
                PushNotifications.sendNotification(
                    [vehicle.cadastradoPor.toLowerCase().replace(/\s+/g, '')],
                    '✅ Veículo Finalizado',
                    `${vehicle.modelo} está pronto para retirada!`
                );
            }
            
            // Notificação enviada pela Cloud Function automaticamente
            
            document.getElementById('updateStatusModal').classList.remove('active');
            document.getElementById('updateStatusForm').reset();
            
            // Limpar os 4 slots de fotos
            for (let i = 1; i <= 4; i++) {
                const preview = document.getElementById(`preview${i}`);
                if (preview) {
                    preview.innerHTML = '';
                    preview.classList.remove('has-photo');
                }
                const input = document.getElementById(`photo${i}`);
                if (input) {
                    input.value = '';
                }
            }
            document.getElementById('photoCounter').textContent = '';
            
            alert('Status atualizado com sucesso!');
        }
    }
}

// Modal de Detalhes do Veículo
class VehicleDetailModal {
    static show(vehicle) {
        const modal = document.getElementById('vehicleDetailModal');
        const content = document.getElementById('vehicleDetailContent');
        
        content.innerHTML = `
            <div style="padding: 20px;">
                <div class="status-badge ${vehicle.status}">${this.getStatusLabel(vehicle.status)}</div>
                
                <h3 style="margin: 20px 0 16px;">${vehicle.modelo}</h3>
                
                <div style="margin-bottom: 24px;">
                    <p style="margin-bottom: 8px;"><strong>Chassi:</strong> ${vehicle.chassi}</p>
                    <p style="margin-bottom: 8px;"><strong>Concessionária:</strong> ${vehicle.concessionaria}</p>
                    ${vehicle.local ? `<p style="margin-bottom: 8px;"><strong>Local:</strong> ${vehicle.local}</p>` : ''}
                    ${vehicle.observacoes ? `<p style="margin-bottom: 8px; color: #dc2626;"><strong>OBS:</strong> ${vehicle.observacoes}</p>` : ''}
                    <p style="margin-bottom: 8px;"><strong>Aplicador:</strong> ${vehicle.aplicador || 'A definir'}</p>
                    <p style="margin-bottom: 8px;"><strong>Montador:</strong> ${vehicle.montador || 'A definir'}</p>
                </div>
                
                <div class="timeline">
                    <div class="timeline-item">
                        <div class="timeline-icon">📝</div>
                        <div class="timeline-content">
                            <h5>Cadastrado</h5>
                            <p>${Utils.formatDateTime(vehicle.cadastroData)} - por ${vehicle.cadastradoPor}</p>
                        </div>
                    </div>
                    
                    ${vehicle.desmontagemData ? `
                    <div class="timeline-item">
                        <div class="timeline-icon">🔧</div>
                        <div class="timeline-content">
                            <h5>Vidros Desmontados</h5>
                            <p>${Utils.formatDate(vehicle.desmontagemData)} - por ${vehicle.desmontadoPor}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${vehicle.aplicacaoData ? `
                    <div class="timeline-item">
                        <div class="timeline-icon">🛡️</div>
                        <div class="timeline-content">
                            <h5>Película Aplicada</h5>
                            <p>${Utils.formatDateTime(vehicle.aplicacaoData)} - por ${vehicle.aplicadoPor}${vehicle.obsAplicador ? ` <strong style="color: #dc2626;">(${vehicle.obsAplicador})</strong>` : ''}</p>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${vehicle.montagemData ? `
                    <div class="timeline-item">
                        <div class="timeline-icon">✅</div>
                        <div class="timeline-content">
                            <h5>Montagem Finalizada</h5>
                            <p>${Utils.formatDate(vehicle.montagemData)} - por ${vehicle.montadoPor}</p>
                            ${vehicle.montagemFotos && vehicle.montagemFotos.length > 0 ? `
                                <p style="margin-top: 12px;"><strong>📷 Fotos da Montagem (${vehicle.montagemFotos.length}):</strong></p>
                                <div class="photo-gallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;">
                                    ${vehicle.montagemFotos.map(photo => `
                                        <img src="${photo}" alt="Foto da montagem" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onclick="Utils.openPhotoModal('${photo}')">
                                    `).join('')}
                                </div>
                            ` : '<p style="margin-top: 8px; color: #f97316;">⚠️ Nenhuma foto anexada</p>'}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                ${APP_STATE.currentRole === 'manager' ? `
                    <div style="display: flex; gap: 12px; margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
                        <button class="btn btn-primary" onclick="VehicleDetailModal.editVehicle('${vehicle.id}')" style="flex: 1;">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-danger" onclick="VehicleDetailModal.deleteVehicle('${vehicle.id}')" style="flex: 1; background: #dc2626;">
                            🗑️ Excluir
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        modal.classList.add('active');
        
        document.querySelectorAll('#vehicleDetailModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });
    }
    
    static async deleteVehicle(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Veículo não encontrado!');
            return;
        }
        
        const confirmMsg = `Tem certeza que deseja EXCLUIR o veículo?\n\n${vehicle.modelo}\nChassi: ${vehicle.chassi}\n\nEsta ação NÃO pode ser desfeita!`;
        
        if (confirm(confirmMsg)) {
            // Remover veículo
            await saveBoth.deleteVehicle(vehicleId);
            
            // Fechar modal e atualizar
            document.getElementById('vehicleDetailModal').classList.remove('active');
            Dashboard.renderDashboard();
            VehiclesManager.loadVehiclesList();
            
            alert('✅ Veículo excluído com sucesso!');
        }
    }
    
    static editVehicle(vehicleId) {
        // Fechar modal de detalhes
        document.getElementById('vehicleDetailModal').classList.remove('active');
        
        // Abrir modal de edição
        VehicleEditModal.show(vehicleId);
    }

    static getStatusLabel(status) {
        const labels = {
            'cadastrado': 'Cadastrado',
            'desmontado': 'Desmontado (A Aplicar)',
            'aplicado': 'A Montar',
            'montado': 'Finalizado'
        };
        return labels[status] || status;
    }
}

// Gerenciador de Edição de Veículos
class VehicleEditModal {
    static show(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Veículo não encontrado!');
            return;
        }
        
        const modal = document.getElementById('vehicleEditModal');
        const form = document.getElementById('vehicleEditForm');
        
        // Preencher campos
        document.getElementById('editVehicleId').value = vehicle.id;
        document.getElementById('editConcessionaria').value = vehicle.concessionaria;
        document.getElementById('editLocal').value = vehicle.local || '';
        document.getElementById('editChassi').value = vehicle.chassi;
        document.getElementById('editModelo').value = vehicle.modelo;
        document.getElementById('editObservacoes').value = vehicle.observacoes || '';
        document.getElementById('editPrioridade').value = vehicle.prioridade || '';
        document.getElementById('editObsUrgencia').value = vehicle.obsUrgencia || '';
        
        // Carregar datalists
        this.loadDataLists();
        
        // Carregar equipe nos selects
        const team = DB.getTeam();
        const aplicadorSelect = document.getElementById('editAplicador');
        const montadorSelect = document.getElementById('editMontador');
        
        aplicadorSelect.innerHTML = '<option value="">A definir</option>' + 
            team.aplicadores.map(name => `<option value="${name}" ${vehicle.aplicador === name ? 'selected' : ''}>${name}</option>`).join('');
        
        montadorSelect.innerHTML = '<option value="">A definir</option>' + 
            team.montadores.map(name => `<option value="${name}" ${vehicle.montador === name ? 'selected' : ''}>${name}</option>`).join('');
        
        // Abrir modal
        modal.classList.add('active');
        
        // Listener do form
        form.onsubmit = async (e) => {
            e.preventDefault();
            this.saveEdit();
        };
        
        // Close buttons
        document.querySelectorAll('#vehicleEditModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });
    }
    
    static loadDataLists() {
        const vehicles = DB.getVehicles();
        
        // Concessionárias
        const concessionarias = [...new Set(vehicles.map(v => v.concessionaria))];
        document.getElementById('editConcessionariasList').innerHTML = 
            concessionarias.map(c => `<option value="${c}">`).join('');
        
        // Locais
        const locais = [...new Set(vehicles.map(v => v.local).filter(Boolean))];
        document.getElementById('editLocaisList').innerHTML = 
            locais.map(l => `<option value="${l}">`).join('');
        
        // Modelos
        const modelos = [...new Set(vehicles.map(v => v.modelo))];
        document.getElementById('editModelosList').innerHTML = 
            modelos.map(m => `<option value="${m}">`).join('');
    }
    
    static saveEdit() {
        const vehicles = DB.getVehicles();
        const vehicleId = document.getElementById('editVehicleId').value;
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Erro: Veículo não encontrado!');
            return;
        }
        
        // Atualizar dados
        vehicle.concessionaria = document.getElementById('editConcessionaria').value.trim();
        vehicle.local = document.getElementById('editLocal').value.trim();
        vehicle.chassi = document.getElementById('editChassi').value.trim();
        vehicle.modelo = document.getElementById('editModelo').value.trim();
        vehicle.observacoes = document.getElementById('editObservacoes').value.trim();
        vehicle.obsUrgencia = document.getElementById('editObsUrgencia').value.trim();
        
        const prioridadeValue = document.getElementById('editPrioridade').value;
        vehicle.prioridade = prioridadeValue ? parseInt(prioridadeValue) : null;
        
        vehicle.aplicador = document.getElementById('editAplicador').value;
        vehicle.montador = document.getElementById('editMontador').value;
        
        // Salvar
        await saveBoth.vehicle(vehicle);
        
        // Fechar modal e atualizar
        document.getElementById('vehicleEditModal').classList.remove('active');
        Dashboard.renderDashboard();
        VehiclesManager.loadVehiclesList();
        
        alert('✅ Veículo atualizado com sucesso!');
    }
}

// Gerenciador de Veículos
class VehiclesManager {
    static loadVehiclesList() {
        let vehicles = DB.getVehicles();
        const role = APP_STATE.currentRole;
        const currentUserName = APP_STATE.currentUserFullName;
        
        // FILTRAR por role
        if (role === 'montador') {
            // Montador só vê carros que ELE desmontou OU montou
            vehicles = vehicles.filter(v => 
                v.desmontadoPor === currentUserName || 
                v.montadoPor === currentUserName ||
                v.montador === currentUserName // Ou que está atribuído a ele
            );
        } else if (role === 'aplicador') {
            // Aplicador só vê carros que ELE aplicou
            vehicles = vehicles.filter(v => 
                v.aplicadoPor === currentUserName ||
                v.aplicador === currentUserName // Ou que está atribuído a ele
            );
        }
        // Vinicius (gerente) vê TODOS
        
        this.renderList(vehicles);
    }

    static search(query) {
        let vehicles = DB.getVehicles();
        const role = APP_STATE.currentRole;
        const currentUserName = APP_STATE.currentUserFullName;
        
        // FILTRAR por role ANTES de buscar
        if (role === 'montador') {
            vehicles = vehicles.filter(v => 
                v.desmontadoPor === currentUserName || 
                v.montadoPor === currentUserName ||
                v.montador === currentUserName
            );
        } else if (role === 'aplicador') {
            vehicles = vehicles.filter(v => 
                v.aplicadoPor === currentUserName ||
                v.aplicador === currentUserName
            );
        }
        
        const filtered = vehicles.filter(v => 
            v.chassi.toLowerCase().includes(query.toLowerCase()) ||
            v.modelo.toLowerCase().includes(query.toLowerCase()) ||
            v.concessionaria.toLowerCase().includes(query.toLowerCase()) ||
            (v.observacoes && v.observacoes.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderList(filtered);
    }

    static renderList(vehicles) {
        const list = document.getElementById('vehiclesList');
        
        if (vehicles.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>Nenhum veículo encontrado</p></div>';
            return;
        }
        
        // showActions = false → Aba Veículos é só visualização
        list.innerHTML = vehicles.map(vehicle => Dashboard.createVehicleCard(vehicle, false)).join('');
        
        list.querySelectorAll('.vehicle-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-small')) {
                    VehicleDetailModal.show(vehicles[index]);
                }
            });
        });
    }
}

// Gerenciador de Relatórios
class ReportsManager {
    static loadReport() {
        const vehicles = DB.getVehicles();
        const team = DB.getTeam();
        const content = document.getElementById('reportContent');
        
        if (!content) {
            console.error('❌ reportContent não encontrado no DOM!');
            return;
        }
        
        // NOVA INTERFACE COM FILTROS
        let html = `
            <div style="background: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #3b82f6;">
                <h3 style="margin: 0 0 20px 0; color: #1e40af;">📊 Gerar Relatório com Filtros</h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #475569;">Tipo de Relatório:</label>
                        <select id="reportType" style="width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 6px; font-size: 1rem;">
                            <option value="finalizados">Carros Finalizados</option>
                            <option value="andamento">Carros em Andamento</option>
                        </select>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #475569;">Período:</label>
                        <select id="reportPeriod" style="width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 6px; font-size: 1rem;">
                            <option value="hoje">📅 Hoje</option>
                            <option value="semana">📅 Esta Semana</option>
                            <option value="mes" selected>📅 Este Mês</option>
                            <option value="ano">📅 Este Ano</option>
                            <option value="personalizado">📅 Personalizado</option>
                        </select>
                    </div>
                </div>
                
                <div id="customDatesDiv" style="display: none; margin-bottom: 20px; padding: 16px; background: #f1f5f9; border-radius: 6px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #475569;">De:</label>
                            <input type="date" id="startDate" style="width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 6px;">
                        </div>
                        <div>
                            <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #475569;">Até:</label>
                            <input type="date" id="endDate" style="width: 100%; padding: 10px; border: 2px solid #cbd5e1; border-radius: 6px;">
                        </div>
                    </div>
                </div>
                
                <button id="btnGerarRelatorioFiltrado" style="width: 100%; padding: 14px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span style="font-size: 1.3rem;">📥</span>
                    Gerar e Baixar CSV
                </button>
            </div>
            
            <hr style="margin: 32px 0; border: none; border-top: 2px solid #e2e8f0;">
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 12px 0; color: #64748b;">💾 Relatório Geral (Todos os Carros)</h3>
                <p style="margin: 0 0 12px 0; color: #64748b; font-size: 0.95rem;">Baixe o CSV completo com todos os veículos cadastrados no sistema.</p>
                <button id="btnGerarRelatorioCompleto" style="padding: 12px 24px; background: #64748b; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                    📥 Baixar CSV Completo
                </button>
            </div>
            
            <h3 style="margin: 32px 0 16px 0;">Relatório do Mês Atual - ${Utils.getCurrentMonth()}</h3>
        `;
        
        const finalizados = vehicles.filter(v => 
            v.status === 'montado' && Utils.isCurrentMonth(v.montagemData)
        );
        
        const stats = {};
        
        [...team.aplicadores, ...team.montadores].forEach(name => {
            stats[name] = {
                desmontados: 0,
                aplicados: 0,
                montados: 0
            };
        });
        
        finalizados.forEach(v => {
            if (v.desmontadoPor && stats[v.desmontadoPor]) {
                stats[v.desmontadoPor].desmontados++;
            }
            if (v.aplicadoPor && stats[v.aplicadoPor]) {
                stats[v.aplicadoPor].aplicados++;
            }
            if (v.montadoPor && stats[v.montadoPor]) {
                stats[v.montadoPor].montados++;
            }
        });
        
        html += `
            <p style="margin: 16px 0;">Total de veículos finalizados: <strong>${finalizados.length}</strong></p>
            
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Profissional</th>
                        <th>Desmontagens</th>
                        <th>Aplicações</th>
                        <th>Montagens</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        Object.entries(stats).forEach(([name, data]) => {
            const total = data.desmontados + data.aplicados + data.montados;
            if (total > 0) {
                html += `
                    <tr>
                        <td>${name}</td>
                        <td>${data.desmontados}</td>
                        <td>${data.aplicados}</td>
                        <td>${data.montados}</td>
                        <td><strong>${total}</strong></td>
                    </tr>
                `;
            }
        });
        
        html += `
                </tbody>
            </table>
            
            <h4 style="margin-top: 32px;">Detalhes dos Veículos Finalizados</h4>
            <table class="report-table">
                <thead>
                    <tr>
                        <th>Data Montagem</th>
                        <th>Modelo</th>
                        <th>Concessionária</th>
                        <th>Chassi</th>
                        <th>Desmontador</th>
                        <th>Aplicador</th>
                        <th>Montador</th>
                        <th>OBS</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        finalizados.forEach(v => {
            html += `
                <tr>
                    <td>${Utils.formatDate(v.montagemData)}</td>
                    <td>${v.modelo}</td>
                    <td>${v.concessionaria}</td>
                    <td>${v.chassi}</td>
                    <td>${v.desmontadoPor || '-'}</td>
                    <td>${v.aplicadoPor || v.aplicador || '-'}</td>
                    <td>${v.montadoPor || v.montador || '-'}</td>
                    <td>${v.observacoes || '-'}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        content.innerHTML = html;
        
        // Adicionar event listener para toggle de datas personalizadas
        const periodSelect = document.getElementById('reportPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', () => this.toggleCustomDates());
        }
        
        // Adicionar event listener para botão de gerar relatório filtrado
        const btnGerar = document.getElementById('btnGerarRelatorioFiltrado');
        if (btnGerar) {
            btnGerar.addEventListener('click', () => this.generateFilteredCSV());
        }
        
        // Adicionar event listener para botão de relatório completo
        const btnCompleto = document.getElementById('btnGerarRelatorioCompleto');
        if (btnCompleto) {
            btnCompleto.addEventListener('click', () => this.generateFullCSV());
        }
    }

    static exportReport() {
        const vehicles = DB.getVehicles();
        const finalizados = vehicles.filter(v => 
            v.status === 'montado' && Utils.isCurrentMonth(v.montagemData)
        );
        
        // BOM para Excel reconhecer UTF-8 corretamente
        // Usar PONTO-E-VÍRGULA (;) que é o padrão do Excel brasileiro
        let csv = '\uFEFF';
        csv += 'ID;GRUPO;LOJA;CARRO;MÊS;CHASSI;Desmontador;Aplicador;Montador;OBS\n';
        
        finalizados.forEach((v, index) => {
            const id = index + 1; // ID numérico (1, 2, 3...)
            const grupo = v.concessionaria || '-';
            const loja = v.local || '-';
            const carro = v.modelo || '-';
            const mes = Utils.getCurrentMonth(); // Mês atual (ex: "JANEIRO" ou "2026-02")
            
            // IMPORTANTE: Forçar chassi como TEXTO para Excel não converter pra notação científica
            // Usar ="chassi" força Excel a tratar como texto
            const chassi = v.chassi ? `="${v.chassi}"` : '-';
            
            const desmontador = v.desmontadoPor || '-';
            const aplicador = v.aplicadoPor || v.aplicador || '-';
            const montador = v.montadoPor || v.montador || '-';
            const obs = (v.obsDesmontar || '-').replace(/;/g, ','); // OBS da desmontagem (avarias)
            
            // Ordem igual matriz: ID, GRUPO, LOJA, CARRO, MÊS, CHASSI, Desmontador, Aplicador, Montador, OBS
            csv += `${id};${grupo};${loja};${carro};${mes};${chassi};${desmontador};${aplicador};${montador};${obs}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-security-glass-${Utils.getCurrentMonth()}.csv`;
        a.click();
        
        // Limpar URL após download
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    static toggleCustomDates() {
        const period = document.getElementById('reportPeriod').value;
        const customDiv = document.getElementById('customDatesDiv');
        customDiv.style.display = period === 'personalizado' ? 'block' : 'none';
    }
    
    static getDateRange() {
        const period = document.getElementById('reportPeriod').value;
        console.log('📆 Período selecionado:', period);
        
        const now = new Date();
        let startDate, endDate;
        
        if (period === 'hoje') {
            startDate = new Date(now.setHours(0, 0, 0, 0));
            endDate = new Date(now.setHours(23, 59, 59, 999));
        } else if (period === 'semana') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Segunda-feira
            startDate = new Date(now.setDate(diff));
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else if (period === 'mes') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (period === 'ano') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        } else if (period === 'personalizado') {
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            
            if (!start || !end) {
                alert('Por favor, selecione as datas inicial e final!');
                return null;
            }
            
            startDate = new Date(start + 'T00:00:00');
            endDate = new Date(end + 'T23:59:59');
        }
        
        console.log('✅ Datas calculadas:', startDate, 'até', endDate);
        return { startDate, endDate };
    }
    
    static generateFilteredCSV() {
        console.log('🔍 generateFilteredCSV chamada!');
        
        // Proteção contra múltiplos cliques
        if (this._generating) {
            console.log('⚠️ Já está gerando, aguarde...');
            return;
        }
        this._generating = true;
        
        const reportTypeEl = document.getElementById('reportType');
        if (!reportTypeEl) {
            console.error('❌ Elemento reportType não encontrado!');
            this._generating = false;
            return;
        }
        
        const reportType = reportTypeEl.value;
        console.log('📊 Tipo:', reportType);
        
        const dateRange = this.getDateRange();
        console.log('📅 Range:', dateRange);
        
        if (!dateRange) {
            console.log('❌ dateRange é null, abortando');
            this._generating = false;
            return;
        }
        
        const { startDate, endDate } = dateRange;
        const vehicles = DB.getVehicles();
        
        let filtered = [];
        let csvData = '';
        
        if (reportType === 'finalizados') {
            // Carros Finalizados
            filtered = vehicles.filter(v => {
                if (v.status !== 'montado' || !v.montagemData) return false;
                const dataFinal = new Date(v.montagemData);
                return dataFinal >= startDate && dataFinal <= endDate;
            });
            
            // Ordenar por data de finalização (mais antigo primeiro)
            filtered.sort((a, b) => new Date(a.montagemData) - new Date(b.montagemData));
            
            // CSV Header - ORDEM: Data Finalização, Número, Concessionária, Local, Modelo, Mês, Chassi, Data Cadastro, Dias, Montador, Aplicador, OBS
            csvData = '\uFEFF'; // BOM UTF-8
            csvData += 'Data Finalização;Número;Concessionária;Local;Modelo;Mês;Chassi;Data Cadastro;Dias Total;Desmontado por;Aplicado por;Montado por;OBS\n';
            
            // Dados
            filtered.forEach((v, idx) => {
                const dataFinal = Utils.formatDate(v.montagemData);
                const numero = idx + 1;
                const conc = (v.concessionaria || '-').replace(/;/g, ',');
                const local = (v.local || '-').replace(/;/g, ',');
                const modelo = (v.modelo || '-').replace(/;/g, ',');
                const mes = v.montagemData ? Utils.getCurrentMonth() : '-'; // Mês da finalização
                const chassi = (v.chassi || '-').replace(/;/g, ',');
                const dataCad = v.cadastroData ? Utils.formatDate(v.cadastroData) : '-';
                
                // Calcular dias total
                const dias = v.cadastroData && v.montagemData ? 
                    Math.ceil((new Date(v.montagemData) - new Date(v.cadastroData)) / (1000 * 60 * 60 * 24)) : '-';
                
                const desmontadoPor = v.desmontadoPor || '-';
                const aplicadoPor = v.aplicadoPor || '-';
                const montadoPor = v.montadoPor || '-';
                const obs = (v.observacoes || '-').replace(/;/g, ',').replace(/\n/g, ' ');
                
                csvData += `${dataFinal};${numero};${conc};${local};${modelo};${mes};${chassi};${dataCad};${dias};${desmontadoPor};${aplicadoPor};${montadoPor};${obs}\n`;
            });
            
        } else {
            // Carros em Andamento
            filtered = vehicles.filter(v => {
                if (v.status === 'montado' || !v.cadastroData) return false;
                const dataCad = new Date(v.cadastroData);
                return dataCad >= startDate && dataCad <= endDate;
            });
            
            // Ordenar por data de cadastro (mais antigo primeiro)
            filtered.sort((a, b) => new Date(a.cadastroData) - new Date(b.cadastroData));
            
            // CSV Header - ORDEM: Data Cadastro, Número, Concessionária, Local, Modelo, Status, Chassi, Dias, Montador, Aplicador, OBS
            csvData = '\uFEFF';
            csvData += 'Data Cadastro;Número;Concessionária;Local;Modelo;Status;Chassi;Dias em Processo;Montador;Aplicador;OBS\n';
            
            // Dados
            filtered.forEach((v, idx) => {
                const dataCad = Utils.formatDate(v.cadastroData);
                const numero = idx + 1;
                const conc = (v.concessionaria || '-').replace(/;/g, ',');
                const local = (v.local || '-').replace(/;/g, ',');
                const modelo = (v.modelo || '-').replace(/;/g, ',');
                const status = v.status || '-';
                const chassi = (v.chassi || '-').replace(/;/g, ',');
                
                // Calcular dias em processo
                const dias = v.cadastroData ? 
                    Math.ceil((new Date() - new Date(v.cadastroData)) / (1000 * 60 * 60 * 24)) : '-';
                
                const montador = v.montador || '-';
                const aplicador = v.aplicador || '-';
                const obs = (v.observacoes || '-').replace(/;/g, ',').replace(/\n/g, ' ');
                
                csvData += `${dataCad};${numero};${conc};${local};${modelo};${status};${chassi};${dias};${montador};${aplicador};${obs}\n`;
            });
        }
        
        if (filtered.length === 0) {
            alert('Nenhum veículo encontrado no período selecionado!');
            this._generating = false;
            return;
        }
        
        // Download
        const period = document.getElementById('reportPeriod').value;
        const tipo = reportType === 'finalizados' ? 'finalizados' : 'em-andamento';
        const filename = `relatorio-${tipo}-${period}-${Utils.formatDate(new Date())}.csv`;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert(`✅ Relatório gerado!\n\n${filtered.length} veículo(s) encontrado(s)\nArquivo: ${filename}`);
        
        // Liberar flag
        this._generating = false;
    }
    
    static generateFullCSV() {
        const vehicles = DB.getVehicles();
        
        // CSV completo de TODOS os carros
        let csvData = '\uFEFF';
        csvData += 'ID;Data Cadastro;Modelo;Chassi;Concessionária;Local;Status;Desmontado por;Aplicado por;Montado por;Data Finalização;OBS\n';
        
        vehicles.forEach((v, idx) => {
            const id = idx + 1;
            const dataCad = v.cadastroData ? Utils.formatDate(v.cadastroData) : '-';
            const modelo = (v.modelo || '-').replace(/;/g, ',');
            const chassi = (v.chassi || '-').replace(/;/g, ',');
            const conc = (v.concessionaria || '-').replace(/;/g, ',');
            const local = (v.local || '-').replace(/;/g, ',');
            const status = v.status || '-';
            const desmontadoPor = v.desmontadoPor || '-';
            const aplicadoPor = v.aplicadoPor || '-';
            const montadoPor = v.montadoPor || '-';
            const dataFinal = v.montagemData ? Utils.formatDate(v.montagemData) : '-';
            const obs = (v.observacoes || '-').replace(/;/g, ',').replace(/\n/g, ' ');
            
            csvData += `${id};${dataCad};${modelo};${chassi};${conc};${local};${status};${desmontadoPor};${aplicadoPor};${montadoPor};${dataFinal};${obs}\n`;
        });
        
        const filename = `relatorio-completo-${Utils.formatDate(new Date())}.csv`;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert(`✅ Relatório completo gerado!\n\n${vehicles.length} veículo(s) no total\nArquivo: ${filename}`);
    }
    
}

// Gerenciador de Equipe
class TeamManager {
    static async loadTeam() {
        // Buscar do Firebase primeiro
        const team = await DB.getTeamAsync();
        
        const aplicadoresList = document.getElementById('aplicadoresList');
        const montadoresList = document.getElementById('montadoresList');
        const vendedorasList = document.getElementById('vendedorasList'); // NOVO
        
        aplicadoresList.innerHTML = team.aplicadores.map(name => `
            <div class="team-member">
                <span>${name}</span>
                <button class="btn-icon" onclick="TeamManager.removeMember('aplicador', '${name}')">🗑️</button>
            </div>
        `).join('');
        
        montadoresList.innerHTML = team.montadores.map(name => `
            <div class="team-member">
                <span>${name}</span>
                <button class="btn-icon" onclick="TeamManager.removeMember('montador', '${name}')">🗑️</button>
            </div>
        `).join('');
        
        // NOVO: Renderizar vendedoras
        if (vendedorasList && team.vendedoras) {
            vendedorasList.innerHTML = team.vendedoras.map(v => `
                <div class="team-member">
                    <div>
                        <strong>${v.nome}</strong>
                        <small style="display: block; color: #64748b;">${v.concessionaria}</small>
                    </div>
                    <button class="btn-icon" onclick="TeamManager.removeVendedora('${v.nome}')">🗑️</button>
                </div>
            `).join('');
        }
    }

    static async addMember(role) {
        const name = prompt(`Nome do ${role === 'aplicador' ? 'Aplicador' : 'Montador'}:`);
        if (!name) return;
        
        const team = DB.getTeam();
        
        if (role === 'aplicador') {
            if (!team.aplicadores.includes(name)) {
                team.aplicadores.push(name);
            }
        } else {
            if (!team.montadores.includes(name)) {
                team.montadores.push(name);
            }
        }
        
        DB.saveTeam(team);
        await FirebaseDB.saveTeam(team);
        this.loadTeam();
        Dashboard.loadTeamMembers();
    }

    static async removeMember(role, name) {
        if (!confirm(`Remover ${name}?`)) return;
        
        const team = DB.getTeam();
        
        if (role === 'aplicador') {
            team.aplicadores = team.aplicadores.filter(n => n !== name);
        } else {
            team.montadores = team.montadores.filter(n => n !== name);
        }
        
        DB.saveTeam(team);
        await FirebaseDB.saveTeam(team);
        this.loadTeam();
        Dashboard.loadTeamMembers();
    }
    
    // NOVO: Adicionar vendedora
    static addVendedora() {
        const nome = prompt('Nome da Vendedora:');
        if (!nome) return;
        
        const concessionaria = prompt('Concessionária:');
        if (!concessionaria) return;
        
        const local = prompt('Local (ex: RioRio C.I.O):');
        if (!local) return;
        
        const senha = prompt('Senha inicial (vendedora poderá trocar):') || '12345678';
        
        const team = DB.getTeam();
        if (!team.vendedoras) team.vendedoras = [];
        
        // Verificar se já existe
        if (team.vendedoras.find(v => v.nome === nome)) {
            alert('Vendedora já cadastrada!');
            return;
        }
        
        team.vendedoras.push({
            nome: nome,
            concessionaria: concessionaria,
            local: local,
            senha: senha
        });
        
        DB.saveTeam(team);
        this.loadTeam();
        Dashboard.loadTeamMembers();
        
        alert(`✅ Vendedora ${nome} adicionada!\n\nLogin: ${nome.toLowerCase().replace(/\s+/g, '')}\nSenha: ${senha}\nConcessionária: ${concessionaria}\nLocal: ${local}`);
    }
    
    // NOVO: Remover vendedora
    static async removeVendedora(nome) {
        if (!confirm(`Remover vendedora ${nome}?`)) return;
        
        const team = DB.getTeam();
        if (!team.vendedoras) team.vendedoras = [];
        
        team.vendedoras = team.vendedoras.filter(v => v.nome !== nome);
        
        DB.saveTeam(team);
        await FirebaseDB.saveTeam(team);
        this.loadTeam();
        Dashboard.loadTeamMembers();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    AuthSystem.init();
    AuthSystem.checkAuth();
    
    // Inicializar form de cadastro (para funcionar mesmo sem VehicleForm.show())
    VehicleForm.setupForm();
});

// Gerenciador de Rota de Desmontagem
class RotaDesmontagemManager {
    static loadRota() {
        const vehicles = DB.getVehicles();
        // Filtrar: cadastrados/espera E sem montador atribuído ainda
        const cadastrados = vehicles.filter(v => 
            (v.status === 'cadastrado' || v.status === 'espera') && 
            !v.montador // Só mostra se NÃO tem montador
        );
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaDesmontagemList');
        
        if (cadastrados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo pendente de atribuição!</p></div>';
            return;
        }
        
        // Ordenar por rotaDesmontagem (se já tiver) ou por data de cadastro
        cadastrados.sort((a, b) => {
            if (a.rotaDesmontagem && b.rotaDesmontagem) {
                return a.rotaDesmontagem - b.rotaDesmontagem;
            }
            if (a.rotaDesmontagem) return -1;
            if (b.rotaDesmontagem) return 1;
            return 0;
        });
        
        // NÃO calcular sugestão automática - deixar Vinicius escolher
        
        list.innerHTML = cadastrados.map((v) => {
            // Se JÁ tem rota salva, mostrar. Senão, deixar vazio.
            const rotaValue = v.rotaDesmontagem || '';
            const montadorValue = v.montador || '';
            
            return `
            <div class="rota-card" style="background: white; padding: 20px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 16px; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${v.modelo}</h3>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Chassi:</strong> ${v.chassi}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Concessionária:</strong> ${v.concessionaria}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Local:</strong> ${v.local || '-'}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #3b82f6;">Rota</label>
                        <input 
                            type="number" 
                            id="rotaDesm_${v.id}" 
                            value="${rotaValue}" 
                            min="1" 
                            placeholder="-"
                            style="width: 80px; padding: 8px; font-size: 1.2rem; font-weight: bold; text-align: center; border: 2px solid #3b82f6; border-radius: 6px;"
                            readonly
                        >
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #3b82f6;">Montador</label>
                        <select 
                            id="montDesm_${v.id}" 
                            style="width: 100%; padding: 10px; font-size: 1rem; border: 2px solid #3b82f6; border-radius: 6px;"
                            onchange="RotaDesmontagemManager.recalcularRota('${v.id}')"
                        >
                            <option value="">⬇️ Selecione montador</option>
                            ${team.montadores.map(name => 
                                `<option value="${name}" ${montadorValue === name ? 'selected' : ''}>${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `}).join('');
        
        // CALCULAR números automaticamente para carros que JÁ TEM montador
        setTimeout(() => {
            cadastrados.forEach(v => {
                if (v.montador && !v.rotaDesmontagem) {
                    // Tem montador mas não tem rota → calcular
                    this.recalcularRota(v.id);
                }
            });
        }, 100);
    }
    
    static recalcularRota(vehicleId) {
        const vehicles = DB.getVehicles();
        
        // Pegar montador selecionado NO DOM
        const montadorSelect = document.getElementById(`montDesm_${vehicleId}`);
        const novoMontador = montadorSelect.value;
        
        const inputRota = document.getElementById(`rotaDesm_${vehicleId}`);
        
        // Se selecionou "Selecione montador", limpar número e bloquear
        if (!novoMontador) {
            inputRota.value = '';
            inputRota.setAttribute('readonly', 'readonly');
            return;
        }
        
        // Desbloquear input
        inputRota.removeAttribute('readonly');
        
        // 1. Buscar números JÁ SALVOS no banco (hoje, cadastrados)
        const hoje = new Date().toDateString();
        const rotasSalvas = vehicles
            .filter(v => {
                const dataCad = v.cadastroData ? new Date(v.cadastroData).toDateString() : null;
                return v.montador === novoMontador && 
                       v.rotaDesmontagem && 
                       dataCad === hoje &&
                       v.status === 'cadastrado'; // Só cadastrados
            })
            .map(v => v.rotaDesmontagem);
        
        // 2. Buscar números NA TELA (ainda não salvos)
        const numerosUsados = [...rotasSalvas]; // Começa com as salvas
        
        // Pegar TODOS os selects e inputs de rota desmontagem na tela
        document.querySelectorAll('[id^="montDesm_"]').forEach(select => {
            // Pular o próprio carro atual
            const carroId = select.id.replace('montDesm_', '');
            if (carroId === vehicleId) return;
            
            // Se o select tem o mesmo montador
            if (select.value === novoMontador) {
                const rotaInput = document.getElementById(`rotaDesm_${carroId}`);
                if (rotaInput && rotaInput.value) {
                    const numero = parseInt(rotaInput.value);
                    if (!isNaN(numero) && !numerosUsados.includes(numero)) {
                        numerosUsados.push(numero);
                    }
                }
            }
        });
        
        // Achar maior número usado (banco + tela)
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputRota.value = maiorNumero + 1;
        
        console.log(`🔢 ${novoMontador}: rotas salvas ${rotasSalvas.join(', ')} + tela ${numerosUsados.filter(n => !rotasSalvas.includes(n)).join(', ')} → sugerindo ${maiorNumero + 1}`);
    }
    
    static async saveRota() {
        const vehicles = DB.getVehicles();
        const cadastrados = vehicles.filter(v => v.status === 'cadastrado');
        
        // VALIDAR: verificar números duplicados POR MONTADOR (cada um separado!)
        let temDuplicado = false;
        let mensagemErro = '';
        
        // Pegar lista de montadores únicos na tela
        const montadoresNaTela = [...new Set(cadastrados.map(v => {
            const montSelect = document.getElementById(`montDesm_${v.id}`);
            return montSelect ? montSelect.value : null;
        }).filter(Boolean))];
        
        // Validar CADA MONTADOR separadamente
        const hoje = new Date().toDateString();
        
        for (const montador of montadoresNaTela) {
            // 1. Buscar rotas JÁ SALVAS desse montador específico CADASTRADOS HOJE
            const rotasExistentes = vehicles
                .filter(v => {
                    const dataCad = v.cadastroData ? new Date(v.cadastroData).toDateString() : null;
                    return v.montador === montador && 
                           v.rotaDesmontagem && 
                           dataCad === hoje && // FILTRO: só hoje!
                           v.status === 'cadastrado'; // FILTRO: só cadastrados (não finalizados)!
                })
                .map(v => v.rotaDesmontagem);
            
            // 2. Buscar rotas NOVAS na tela desse montador
            const rotasNovas = [];
            for (const v of cadastrados) {
                const montSelect = document.getElementById(`montDesm_${v.id}`);
                const rotaInput = document.getElementById(`rotaDesm_${v.id}`);
                
                if (montSelect && montSelect.value === montador && rotaInput && rotaInput.value) {
                    const rota = parseInt(rotaInput.value);
                    
                    // Verifica se conflita com rotas JÁ SALVAS
                    if (rotasExistentes.includes(rota)) {
                        temDuplicado = true;
                        mensagemErro = `❌ ${montador} já tem Rota ${rota} salva!\n\nRotas existentes de ${montador}: ${rotasExistentes.sort((a,b) => a-b).join(', ')}`;
                        break;
                    }
                    
                    // Verifica se está repetido na própria tela
                    if (rotasNovas.includes(rota)) {
                        temDuplicado = true;
                        mensagemErro = `❌ ${montador} tem Rota ${rota} repetida na tela!`;
                        break;
                    }
                    
                    rotasNovas.push(rota);
                }
            }
            
            if (temDuplicado) break;
        }
        
        if (temDuplicado) {
            alert(mensagemErro);
            return;
        }
        
        
        // Se passou na validação, salvar
        let saved = 0;
        const rotasPorMontador = {}; // Para contar carros por montador (notificações)
        
        cadastrados.forEach(v => {
            const rotaInput = document.getElementById(`rotaDesm_${v.id}`);
            const montSelect = document.getElementById(`montDesm_${v.id}`);
            
            if (rotaInput && montSelect && montSelect.value) {
                v.rotaDesmontagem = parseInt(rotaInput.value);
                v.montador = montSelect.value;
                
                // Contar para notificação
                if (!rotasPorMontador[v.montador]) {
                    rotasPorMontador[v.montador] = [];
                }
                rotasPorMontador[v.montador].push(v);
                
                saved++;
            }
        });
        
        await saveBoth.vehicles(vehicles);
        Dashboard.renderDashboard();
        
        // Enviar notificações para montadores
        const montadoresNotificados = new Set();
        Object.keys(rotasPorMontador).forEach(montador => {
            const qtdCarros = rotasPorMontador[montador].length;
            if (qtdCarros > 0 && !montadoresNotificados.has(montador)) {
                PushNotifications.sendNotification(
                    [montador.toLowerCase()],
                    '🚗 Nova rota de desmontagem',
                    `${qtdCarros} ${qtdCarros === 1 ? 'carro' : 'carros'} aguardando`
                );
                montadoresNotificados.add(montador);
            }
        });
        
        alert(`✅ Rota de Desmontagem salva com sucesso! ${saved} veículo(s) atualizado(s).`);
        
        this.loadRota();
    }
}

// Gerenciador de Rota de Aplicação
class RotaAplicacaoManager {
    static loadRota() {
        const vehicles = DB.getVehicles();
        // Filtrar: desmontados E sem aplicador atribuído ainda
        const desmontados = vehicles.filter(v => 
            v.status === 'desmontado' && 
            !v.aplicador // Só mostra se NÃO tem aplicador
        );
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaAplicacaoList');
        
        if (desmontados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo pendente de atribuição!</p></div>';
            return;
        }
        
        // Ordenar por sequência (se já tiver) ou por data de desmontagem
        desmontados.sort((a, b) => {
            if (a.sequenciaAplicacao && b.sequenciaAplicacao) {
                return a.sequenciaAplicacao - b.sequenciaAplicacao;
            }
            if (a.sequenciaAplicacao) return -1;
            if (b.sequenciaAplicacao) return 1;
            return 0;
        });
        
        // NÃO calcular sugestão automática - deixar Vinicius escolher
        
        list.innerHTML = desmontados.map((v) => {
            // Se JÁ tem sequência salva, mostrar. Senão, deixar vazio.
            const seqValue = v.sequenciaAplicacao || '';
            const aplicadorValue = v.aplicador || '';
            
            return `
            <div class="sequencia-card" style="background: white; padding: 20px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 16px; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${v.modelo}</h3>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Chassi:</strong> ${v.chassi}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Concessionária:</strong> ${v.concessionaria}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Local:</strong> ${v.local || '-'}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #3b82f6;">Sequência</label>
                        <input 
                            type="number" 
                            id="seq_${v.id}" 
                            value="${seqValue}" 
                            min="1" 
                            placeholder="-"
                            style="width: 80px; padding: 8px; font-size: 1.2rem; font-weight: bold; text-align: center; border: 2px solid #3b82f6; border-radius: 6px;"
                            readonly
                        >
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #3b82f6;">Aplicador</label>
                        <select 
                            id="app_${v.id}" 
                            style="width: 100%; padding: 10px; font-size: 1rem; border: 2px solid #3b82f6; border-radius: 6px;"
                            onchange="RotaAplicacaoManager.recalcularRota('${v.id}')"
                        >
                            <option value="">⬇️ Selecione aplicador</option>
                            ${team.aplicadores.map(name => 
                                `<option value="${name}" ${aplicadorValue === name ? 'selected' : ''}>${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `}).join('');
        
        // CALCULAR números automaticamente para carros que JÁ TEM aplicador
        setTimeout(() => {
            desmontados.forEach(v => {
                if (v.aplicador && !v.sequenciaAplicacao) {
                    // Tem aplicador mas não tem sequência → calcular
                    this.recalcularRota(v.id);
                }
            });
        }, 100);
    }
    
    static recalcularRota(vehicleId) {
        const vehicles = DB.getVehicles();
        
        // Pegar aplicador selecionado NO DOM
        const aplicadorSelect = document.getElementById(`app_${vehicleId}`);
        const novoAplicador = aplicadorSelect.value;
        
        const inputSeq = document.getElementById(`seq_${vehicleId}`);
        
        // Se selecionou "Selecione aplicador", limpar número e bloquear
        if (!novoAplicador) {
            inputSeq.value = '';
            inputSeq.setAttribute('readonly', 'readonly');
            return;
        }
        
        // Desbloquear input
        inputSeq.removeAttribute('readonly');
        
        // 1. Buscar sequências JÁ SALVAS no banco (hoje, desmontados/aplicados)
        const hoje = new Date().toDateString();
        const sequenciasSalvas = vehicles
            .filter(v => {
                const dataCad = v.cadastroData ? new Date(v.cadastroData).toDateString() : null;
                return v.aplicador === novoAplicador && 
                       v.sequenciaAplicacao && 
                       dataCad === hoje &&
                       (v.status === 'desmontado' || v.status === 'aplicado'); // Desmontados ou aplicados
            })
            .map(v => v.sequenciaAplicacao);
        
        // 2. Buscar números NA TELA (ainda não salvos)
        const numerosUsados = [...sequenciasSalvas]; // Começa com as salvas
        
        // Pegar TODOS os selects de aplicador na tela
        document.querySelectorAll('[id^="app_"]').forEach(select => {
            // Pular o próprio carro atual
            const carroId = select.id.replace('app_', '');
            if (carroId === vehicleId) return;
            
            // Se o select tem o mesmo aplicador
            if (select.value === novoAplicador) {
                const seqInput = document.getElementById(`seq_${carroId}`);
                if (seqInput && seqInput.value) {
                    const numero = parseInt(seqInput.value);
                    if (!isNaN(numero) && !numerosUsados.includes(numero)) {
                        numerosUsados.push(numero);
                    }
                }
            }
        });
        
        // Achar maior número usado (banco + tela)
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputSeq.value = maiorNumero + 1;
        
        console.log(`🔢 ${novoAplicador}: seq salvas ${sequenciasSalvas.join(', ')} + tela ${numerosUsados.filter(n => !sequenciasSalvas.includes(n)).join(', ')} → sugerindo ${maiorNumero + 1}`);
    }
    
    static async saveRota() {
        const vehicles = DB.getVehicles();
        const desmontados = vehicles.filter(v => v.status === 'desmontado');
        
        // VALIDAR: verificar números duplicados por aplicador
        const rotasPorAplicador = {};
        let temDuplicado = false;
        let mensagemErro = '';
        
        desmontados.forEach(v => {
            const seqInput = document.getElementById(`seq_${v.id}`);
            const appSelect = document.getElementById(`app_${v.id}`);
            
            if (seqInput && appSelect) {
                const rota = parseInt(seqInput.value);
                const aplicador = appSelect.value;
                
                // IGNORAR se não tem aplicador OU número inválido
                if (!aplicador || isNaN(rota) || !seqInput.value) {
                    return; // Pula este carro
                }
                
                if (!rotasPorAplicador[aplicador]) {
                    rotasPorAplicador[aplicador] = [];
                }
                
                // Verificar se já existe esse número para esse aplicador
                if (rotasPorAplicador[aplicador].includes(rota)) {
                    temDuplicado = true;
                    mensagemErro = `❌ Erro: O aplicador ${aplicador} tem o número ${rota} repetido!\n\nCada aplicador deve ter números únicos na sua rota.`;
                }
                
                rotasPorAplicador[aplicador].push(rota);
            }
        });
        
        if (temDuplicado) {
            alert(mensagemErro);
            return;
        }
        
        // Se passou na validação, salvar
        let saved = 0;
        desmontados.forEach(v => {
            const seqInput = document.getElementById(`seq_${v.id}`);
            const appSelect = document.getElementById(`app_${v.id}`);
            
            if (seqInput && appSelect) {
                v.sequenciaAplicacao = parseInt(seqInput.value);
                v.aplicador = appSelect.value;
                saved++;
            }
        });
        
        await saveBoth.vehicles(vehicles);
        Dashboard.renderDashboard();
        
        // Notificar aplicadores
        const aplicadoresPorCarros = {};
        desmontados.forEach(v => {
            if (v.aplicador) {
                aplicadoresPorCarros[v.aplicador] = (aplicadoresPorCarros[v.aplicador] || 0) + 1;
            }
        });
        
        Object.keys(aplicadoresPorCarros).forEach(aplicador => {
            const qtdCarros = aplicadoresPorCarros[aplicador];
            PushNotifications.sendNotification(
                [aplicador.toLowerCase()],
                '🎨 Nova rota de aplicação',
                `${qtdCarros} ${qtdCarros === 1 ? 'carro' : 'carros'} aguardando aplicação`
            );
        });
        
        alert(`✅ Rota de Aplicação salva com sucesso! ${saved} veículo(s) atualizado(s).`);
        
        this.loadRota(); // Recarregar lista
    }
}

// Gerenciador de Rota de Montagem
class RotaMontagemManager {
    static loadRota() {
        const vehicles = DB.getVehicles();
        // Filtrar: aplicados E sem rota de montagem atribuída ainda
        const aplicados = vehicles.filter(v => 
            v.status === 'aplicado' && 
            !v.rotaMontagem // Só mostra se NÃO tem rota montagem
        );
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaMontagemList');
        
        if (aplicados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo pendente de atribuição!</p></div>';
            return;
        }
        
        // Ordenar por rotaMontagem (se já tiver) ou por data de aplicação
        aplicados.sort((a, b) => {
            if (a.rotaMontagem && b.rotaMontagem) {
                return a.rotaMontagem - b.rotaMontagem;
            }
            if (a.rotaMontagem) return -1;
            if (b.rotaMontagem) return 1;
            return 0;
        });
        
        // NÃO calcular sugestão automática - deixar Vinicius escolher
        
        list.innerHTML = aplicados.map((v) => {
            // Se JÁ tem rota salva, mostrar. Senão, deixar vazio.
            const rotaValue = v.rotaMontagem || '';
            
            // IMPORTANTE: Na Rota Montagem, só pré-selecionar montador se JÁ FOI SALVO
            // Se não, deixar vazio para Vinicius escolher (pode ser diferente da desmontagem)
            const montadorValue = v.rotaMontagem ? (v.montador || '') : '';
            
            return `
            <div class="rota-card" style="background: white; padding: 20px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #eab308;">
                <div style="display: grid; grid-template-columns: 2fr 1fr 2fr; gap: 16px; align-items: center;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${v.modelo}</h3>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Chassi:</strong> ${v.chassi}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Concessionária:</strong> ${v.concessionaria}</p>
                        <p style="margin: 4px 0; color: #64748b; font-size: 0.9rem;"><strong>Local:</strong> ${v.local || '-'}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #eab308;">Rota</label>
                        <input 
                            type="number" 
                            id="rotaMont_${v.id}" 
                            value="${rotaValue}" 
                            min="1" 
                            placeholder="-"
                            style="width: 80px; padding: 8px; font-size: 1.2rem; font-weight: bold; text-align: center; border: 2px solid #eab308; border-radius: 6px;"
                            readonly
                        >
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: bold; margin-bottom: 8px; color: #eab308;">Montador</label>
                        <select 
                            id="montMont_${v.id}" 
                            style="width: 100%; padding: 10px; font-size: 1rem; border: 2px solid #eab308; border-radius: 6px;"
                            onchange="RotaMontagemManager.recalcularRota('${v.id}')"
                        >
                            <option value="">⬇️ Selecione montador</option>
                            ${team.montadores.map(name => 
                                `<option value="${name}" ${montadorValue === name ? 'selected' : ''}>${name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `}).join('');
        
        // Na Rota Montagem NÃO calcular automaticamente
        // Vinicius sempre escolhe manual (pode ser diferente da desmontagem)
    }
    
    static recalcularRota(vehicleId) {
        const vehicles = DB.getVehicles();
        
        // Pegar montador selecionado NO DOM
        const montadorSelect = document.getElementById(`montMont_${vehicleId}`);
        const novoMontador = montadorSelect.value;
        
        const inputRota = document.getElementById(`rotaMont_${vehicleId}`);
        
        // Se selecionou "Selecione montador", limpar número e bloquear
        if (!novoMontador) {
            inputRota.value = '';
            inputRota.setAttribute('readonly', 'readonly');
            return;
        }
        
        // Desbloquear input
        inputRota.removeAttribute('readonly');
        
        // 1. Buscar rotas JÁ SALVAS no banco (hoje, SÓ aplicados - não montados!)
        const hoje = new Date().toDateString();
        const rotasSalvas = vehicles
            .filter(v => {
                const dataCad = v.cadastroData ? new Date(v.cadastroData).toDateString() : null;
                return v.montador === novoMontador && 
                       v.rotaMontagem && 
                       dataCad === hoje &&
                       v.status === 'aplicado'; // SÓ aplicados (não montados/espera)
            })
            .map(v => v.rotaMontagem);
        
        // 2. Buscar números NA TELA (ainda não salvos)
        const numerosUsados = [...rotasSalvas]; // Começa com as salvas
        
        // Pegar TODOS os selects de montador na tela
        document.querySelectorAll('[id^="montMont_"]').forEach(select => {
            // Pular o próprio carro atual
            const carroId = select.id.replace('montMont_', '');
            if (carroId === vehicleId) return;
            
            // Se o select tem o mesmo montador
            if (select.value === novoMontador) {
                const rotaInput = document.getElementById(`rotaMont_${carroId}`);
                if (rotaInput && rotaInput.value) {
                    const numero = parseInt(rotaInput.value);
                    if (!isNaN(numero) && !numerosUsados.includes(numero)) {
                        numerosUsados.push(numero);
                    }
                }
            }
        });
        
        // Achar maior número usado (banco + tela)
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputRota.value = maiorNumero + 1;
        
        console.log(`🔢 ${novoMontador}: rotas mont salvas ${rotasSalvas.join(', ')} + tela ${numerosUsados.filter(n => !rotasSalvas.includes(n)).join(', ')} → sugerindo ${maiorNumero + 1}`);
    }
    
    static async saveRota() {
        const vehicles = DB.getVehicles();
        const aplicados = vehicles.filter(v => v.status === 'aplicado');
        
        // VALIDAR: verificar números duplicados por montador
        const rotasPorMontador = {};
        let temDuplicado = false;
        let mensagemErro = '';
        
        aplicados.forEach(v => {
            const rotaInput = document.getElementById(`rotaMont_${v.id}`);
            const montSelect = document.getElementById(`montMont_${v.id}`);
            
            if (rotaInput && montSelect) {
                const rota = parseInt(rotaInput.value);
                const montador = montSelect.value;
                
                // IGNORAR se não tem montador OU número inválido
                if (!montador || isNaN(rota) || !rotaInput.value) {
                    return; // Pula este carro
                }
                
                if (!rotasPorMontador[montador]) {
                    rotasPorMontador[montador] = [];
                }
                
                // Verificar se já existe esse número para esse montador
                if (rotasPorMontador[montador].includes(rota)) {
                    temDuplicado = true;
                    mensagemErro = `❌ Erro: O montador ${montador} tem o número ${rota} repetido!\n\nCada montador deve ter números únicos na sua rota.`;
                }
                
                rotasPorMontador[montador].push(rota);
            }
        });
        
        if (temDuplicado) {
            alert(mensagemErro);
            return;
        }
        
        // Se passou na validação, salvar
        let saved = 0;
        aplicados.forEach(v => {
            const rotaInput = document.getElementById(`rotaMont_${v.id}`);
            const montSelect = document.getElementById(`montMont_${v.id}`);
            
            if (rotaInput && montSelect) {
                v.rotaMontagem = parseInt(rotaInput.value);
                v.montador = montSelect.value;
                saved++;
            }
        });
        
        await saveBoth.vehicles(vehicles);
        Dashboard.renderDashboard();
        
        // Notificar montadores
        const montadoresPorCarros = {};
        aplicados.forEach(v => {
            if (v.montador) {
                montadoresPorCarros[v.montador] = (montadoresPorCarros[v.montador] || 0) + 1;
            }
        });
        
        Object.keys(montadoresPorCarros).forEach(montador => {
            const qtdCarros = montadoresPorCarros[montador];
            PushNotifications.sendNotification(
                [montador.toLowerCase()],
                '🔧 Nova rota de montagem',
                `${qtdCarros} ${qtdCarros === 1 ? 'carro' : 'carros'} aguardando montagem`
            );
        });
        
        alert(`✅ Rota de Montagem salva com sucesso! ${saved} veículo(s) atualizado(s).`);
        
        this.loadRota();
    }
}

// Gerenciador da Aba de Espera
class EsperaManager {
    static loadEspera() {
        const vehicles = DB.getVehicles();
        const emEspera = vehicles.filter(v => v.status === 'espera');
        
        const list = document.getElementById('esperaList');
        
        if (emEspera.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo em espera!</p></div>';
            return;
        }
        
        // Separar por etapa
        const esperaDesmontagem = emEspera.filter(v => v.etapaEspera === 'desmontagem' || !v.etapaEspera);
        const esperaAplicacao = emEspera.filter(v => v.etapaEspera === 'aplicacao');
        const esperaMontagem = emEspera.filter(v => v.etapaEspera === 'montagem');
        
        let html = '';
        
        // SEÇÃO DESMONTAGEM
        if (esperaDesmontagem.length > 0) {
            html += `
                <div style="background: #fff7ed; padding: 16px; border-radius: 8px; border-left: 4px solid #f97316; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #ea580c;">🟠 Aguardando Desmontagem (${esperaDesmontagem.length})</h3>
                    ${esperaDesmontagem.map(v => this.renderEsperaCard(v, 'desmontagem')).join('')}
                </div>
            `;
        }
        
        // SEÇÃO APLICAÇÃO
        if (esperaAplicacao.length > 0) {
            html += `
                <div style="background: #fef9c3; padding: 16px; border-radius: 8px; border-left: 4px solid #eab308; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #ca8a04;">🟡 Aguardando Aplicação (${esperaAplicacao.length})</h3>
                    ${esperaAplicacao.map(v => this.renderEsperaCard(v, 'aplicacao')).join('')}
                </div>
            `;
        }
        
        // SEÇÃO MONTAGEM
        if (esperaMontagem.length > 0) {
            html += `
                <div style="background: #fee2e2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 24px;">
                    <h3 style="margin: 0 0 16px 0; color: #b91c1c;">🔴 Aguardando Montagem (${esperaMontagem.length})</h3>
                    ${esperaMontagem.map(v => this.renderEsperaCard(v, 'montagem')).join('')}
                </div>
            `;
        }
        
        list.innerHTML = html;
    }
    
    static renderEsperaCard(v, etapa) {
        const etapaLabel = {
            'desmontagem': 'Desmontagem',
            'aplicacao': 'Aplicação',
            'montagem': 'Montagem'
        }[etapa];
        
        return `
            <div class="espera-card" style="background: white; padding: 20px; margin-bottom: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${v.modelo}</h3>
                        <p style="margin: 4px 0;"><strong>Chassi:</strong> ${v.chassi}</p>
                        <p style="margin: 4px 0;"><strong>Concessionária:</strong> ${v.concessionaria}</p>
                        <p style="margin: 4px 0;"><strong>Local:</strong> ${v.local || '-'}</p>
                    </div>
                    <span style="background: #64748b; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem;">ESPERA ${etapaLabel.toUpperCase()}</span>
                </div>
                
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                    <p style="margin: 0; color: #92400e;"><strong>❌ Motivo:</strong> ${v.motivoEspera}</p>
                    <p style="margin: 4px 0 0 0; color: #92400e; font-size: 0.9rem;"><strong>Por:</strong> ${v.tentouDesmontarPor} - ${Utils.formatDateTime(v.dataEspera)}</p>
                </div>
                
                ${v.obsUrgencia ? `<p style="color: #dc2626; margin-bottom: 8px;"><strong>🚨 Urgência:</strong> ${v.obsUrgencia}</p>` : ''}
                ${v.montador ? `<p style="margin: 4px 0;"><strong>Montador:</strong> ${v.montador}</p>` : ''}
                ${v.aplicador ? `<p style="margin: 4px 0;"><strong>Aplicador:</strong> ${v.aplicador}</p>` : ''}
                
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-primary" onclick="EsperaManager.voltarParaEtapa('${v.id}', '${etapa}')">↩️ Voltar pra ${etapaLabel}</button>
                    ${etapa === 'desmontagem' ? `<button class="btn btn-secondary" onclick="EsperaManager.reatribuir('${v.id}')">🔄 Reatribuir Montador</button>` : ''}
                </div>
            </div>
        `;
    }
    
    static reatribuir(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) return;
        
        const team = DB.getTeam();
        const montadores = team.montadores;
        
        if (montadores.length === 0) {
            alert('Nenhum montador cadastrado!');
            return;
        }
        
        // Criar modal customizado com dropdown
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        modal.innerHTML = `
            <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <h3 style="margin: 0 0 16px 0;">🔄 Reatribuir Montador</h3>
                <p style="margin-bottom: 16px; color: #64748b;">Selecione o novo montador:</p>
                <select id="selectNovoMontador" style="width: 100%; padding: 12px; font-size: 1rem; border: 2px solid #3b82f6; border-radius: 6px; margin-bottom: 20px;">
                    ${montadores.map(m => `<option value="${m}">${m}</option>`).join('')}
                </select>
                <div style="display: flex; gap: 12px; justify-content: flex-end;">
                    <button id="btnCancelarReatribuir" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer;">Cancelar</button>
                    <button id="btnConfirmarReatribuir" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('btnCancelarReatribuir').onclick = async () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('btnConfirmarReatribuir').onclick = async () => {
            const novoMontador = document.getElementById('selectNovoMontador').value;
            
            vehicle.montador = novoMontador;
            vehicle.status = 'cadastrado'; // Volta pro início
            delete vehicle.motivoEspera;
            delete vehicle.dataEspera;
            delete vehicle.tentouDesmontarPor;
            delete vehicle.etapaEspera;
            
            // CRITICAL: Limpar TODAS as rotas antigas!
            delete vehicle.rotaDesmontagem;
            delete vehicle.rotaMontagem;
            delete vehicle.sequenciaAplicacao;
            
            await saveBoth.vehicles(vehicles);
            this.loadEspera();
            Dashboard.renderDashboard();
            
            document.body.removeChild(modal);
            alert(`✅ Veículo reatribuído para ${novoMontador}!`);
        };
    }
    
    static async voltarParaEtapa(vehicleId, etapa) {
        const etapaLabel = {
            'desmontagem': 'Desmontagem',
            'aplicacao': 'Aplicação',
            'montagem': 'Montagem'
        }[etapa];
        
        if (!confirm(`Voltar este veículo para ${etapaLabel}?`)) return;
        
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) return;
        
        // Voltar para o status correto
        if (etapa === 'desmontagem') {
            vehicle.status = 'cadastrado';
            // LIMPAR montador e rota para Vinicius reatribuir
            delete vehicle.montador;
            delete vehicle.rotaDesmontagem;
        } else if (etapa === 'aplicacao') {
            vehicle.status = 'desmontado';
            // LIMPAR aplicador e sequência para Vinicius reatribuir
            delete vehicle.aplicador;
            delete vehicle.sequenciaAplicacao;
        } else if (etapa === 'montagem') {
            vehicle.status = 'aplicado';
            // LIMPAR rota montagem para Vinicius reatribuir
            delete vehicle.rotaMontagem;
        }
        
        // Limpar dados de espera
        delete vehicle.motivoEspera;
        delete vehicle.dataEspera;
        delete vehicle.tentouDesmontarPor;
        delete vehicle.etapaEspera;
        
        await saveBoth.vehicles(vehicles);
        this.loadEspera();
        Dashboard.renderDashboard();
        
        alert(`✅ Veículo voltou para ${etapaLabel}!`);
    }
    
    static async voltarFila(vehicleId) {
        if (!confirm('Voltar este veículo para a fila de CADASTRADOS?')) return;
        
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) return;
        
        vehicle.status = 'cadastrado';
        delete vehicle.motivoEspera;
        delete vehicle.dataEspera;
        delete vehicle.tentouDesmontarPor;
        
        // IMPORTANTE: Limpar montador e rota para Vinicius definir novamente
        delete vehicle.montador;
        delete vehicle.rotaDesmontagem;
        
        await saveBoth.vehicles(vehicles);
        this.loadEspera();
        Dashboard.renderDashboard();
        
        alert('Veículo voltou para a fila!');
    }
}

// Sistema de Notificações Push
class PushNotifications {
    static VAPID_KEY = 'BFbQG-FvP8GneifDgUHbjd_HVR-jMfyXguF9byC3Otnbs-glEiGJjWxU5loSVcrhj2HB7y_nzOnDqVqBk0mzsiQ';
    static initialized = false;
    
    static async init() {
        if (this.initialized) return;
        
        try {
            // Service Worker já está registrado (sw.js inclui Firebase Messaging)
            // Aguardar registro estar ativo
            const registration = await navigator.serviceWorker.ready;
            console.log('🔔 Service Worker pronto para notificações');
            
            this.initialized = true;
            
            // Pedir permissão automaticamente
            await this.requestPermission();
            
        } catch (error) {
            console.error('Erro ao inicializar notificações:', error);
        }
    }
    
    static async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            
            if (permission === 'granted') {
                console.log('✅ Permissão de notificação concedida');
                await this.getToken();
            } else {
                console.log('❌ Permissão de notificação negada');
            }
        } catch (error) {
            console.error('Erro ao pedir permissão:', error);
        }
    }
    
    static async getToken() {
        try {
            const { messaging, getToken } = window.firebase;
            
            const token = await getToken(messaging, {
                vapidKey: this.VAPID_KEY
            });
            
            if (token) {
                console.log('🔑 Token FCM:', token);
                
                // Salvar token associado ao usuário
                const currentUser = APP_STATE.currentUser;
                if (currentUser) {
                    localStorage.setItem(`fcm_token_${currentUser}`, token);
                    
                    // Salvar no Firebase
                    await this.saveTokenToFirebase(currentUser, token);
                }
                
                return token;
            }
        } catch (error) {
            console.error('Erro ao obter token:', error);
        }
    }
    
    static async saveTokenToFirebase(username, token) {
        try {
            const { db, doc, setDoc } = window.firebase;
            await setDoc(doc(db, 'tokens', username), {
                token: token,
                updatedAt: new Date().toISOString(),
                username: username
            });
            console.log('💾 Token salvo no Firebase');
        } catch (error) {
            console.error('Erro ao salvar token:', error);
        }
    }
    
    static async sendNotification(usernames, title, body, data = {}) {
        console.log(`🔔 Enviando notificação para: ${usernames.join(', ')}`);
        console.log(`📨 Título: ${title}`);
        console.log(`📝 Mensagem: ${body}`);
        
        try {
            // Chamar Cloud Function para enviar notificação REAL
            const { app } = window.firebase;
            const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js');
            
            const functions = getFunctions(app);
            const sendNotificationFunction = httpsCallable(functions, 'sendNotificationOnRotaSave');
            
            const result = await sendNotificationFunction({
                usernames: usernames,
                title: title,
                body: body
            });
            
            console.log('✅ Notificação enviada via Cloud Function:', result);
            
        } catch (error) {
            console.error('❌ Erro ao enviar notificação:', error);
            
            // Fallback: Notificação local se Cloud Function falhar
            if (Notification.permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '/icon-192.png',
                    badge: '/icon-192.png',
                    tag: 'security-glass',
                    requireInteraction: false,
                    vibrate: [200, 100, 200],
                    data: data
                });
            }
        }
    }
    
    static setupForegroundListener() {
        const { messaging, onMessage } = window.firebase;
        
        onMessage(messaging, (payload) => {
            console.log('🔔 Notificação recebida (foreground):', payload);
            
            // Mostrar notificação mesmo com app aberto
            new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'security-glass',
                requireInteraction: false,
                vibrate: [200, 100, 200],
                data: payload.data
            });
        });
    }
}

// Service Worker com Auto-Atualização Forçada
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            // Registra o Service Worker
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registrado');
            
            // Verifica atualizações a cada 60 segundos
            setInterval(() => {
                registration.update();
            }, 60000);
            
            // Detecta quando há atualização disponível
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nova versão detectada!');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nova versão disponível!
                        mostrarMensagemAtualizacao();
                    }
                });
            });
            
            // Recarrega quando o SW for ativado
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('🔄 Recarregando para atualizar...');
                    window.location.reload();
                }
            });
            
        } catch (err) {
            console.log('❌ Erro ao registrar Service Worker:', err);
        }
    });
}

// Função para mostrar mensagem de atualização
function mostrarMensagemAtualizacao() {
    // Cria overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    overlay.innerHTML = `
        <div style="
            background: white;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            max-width: 400px;
            margin: 20px;
        ">
            <div style="font-size: 48px; margin-bottom: 15px;">⚙️</div>
            <h3 style="margin: 0 0 10px 0; color: #1e293b;">Nova Versão Disponível!</h3>
            <p style="color: #64748b; margin-bottom: 20px;">
                Atualizando sistema automaticamente...
            </p>
            <div style="
                width: 100%;
                height: 4px;
                background: #e2e8f0;
                border-radius: 2px;
                overflow: hidden;
            ">
                <div id="progressBar" style="
                    width: 0%;
                    height: 100%;
                    background: #3b82f6;
                    transition: width 0.1s linear;
                "></div>
            </div>
            <p style="color: #94a3b8; font-size: 0.9rem; margin-top: 15px;">
                Aguarde 3 segundos...
            </p>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Anima barra de progresso
    let progress = 0;
    const interval = setInterval(() => {
        progress += 3.33;
        document.getElementById('progressBar').style.width = progress + '%';
        if (progress >= 100) {
            clearInterval(interval);
        }
    }, 100);
    
    // Força atualização após 3 segundos
    setTimeout(() => {
        // Limpa todos os caches antigos
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    if (name !== 'security-glass-v3') {
                        caches.delete(name);
                        console.log('🗑️ Cache antigo removido:', name);
                    }
                });
            });
        }
        
        // Pega o novo SW e ativa
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg && reg.waiting) {
                reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
        });
    }, 3000);
}

// Função para zerar todos os dados (só Wagner)
async function zerarTodosDados() {
    const confirma1 = confirm('⚠️ ATENÇÃO! Isso vai apagar TODOS os veículos cadastrados!\n\nTem certeza?');
    if (!confirma1) return;
    
    const confirma2 = confirm('⚠️ ÚLTIMA CONFIRMAÇÃO!\n\nEsta ação NÃO pode ser desfeita!\n\nConfirma a exclusão de TODOS os dados?');
    if (!confirma2) return;
    
    try {
        console.log('🗑️ Iniciando limpeza de dados...');
        
        // 1. Limpar localStorage
        localStorage.removeItem('vehicles');
        localStorage.removeItem('firebase_migrated'); // Limpa flag de migração
        console.log('✅ localStorage limpo');
        
        // 2. Apagar vehicles do Firestore
        if (window.firebase) {
            const { db, collection, getDocs, deleteDoc, doc } = window.firebase;
            const vehiclesRef = collection(db, 'vehicles');
            const snapshot = await getDocs(vehiclesRef);
            
            console.log(`🗑️ Apagando ${snapshot.size} veículos do Firestore...`);
            
            const deletePromises = [];
            snapshot.forEach((document) => {
                deletePromises.push(deleteDoc(doc(db, 'vehicles', document.id)));
            });
            
            await Promise.all(deletePromises);
            console.log('✅ Firestore limpo');
        }
        
        // 3. Atualizar dashboard
        Dashboard.renderDashboard();
        
        alert('✅ Todos os dados foram zerados com sucesso!\n\nO sistema foi reiniciado.');
        
        // 4. Recarregar página para garantir
        setTimeout(() => {
            window.location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Erro ao zerar dados:', error);
        alert('❌ Erro ao zerar dados: ' + error.message);
    }
}

// Event listener para o botão Zerar Dados
document.addEventListener('DOMContentLoaded', () => {
    const zerarBtn = document.getElementById('zerarTudoBtn');
    if (zerarBtn) {
        zerarBtn.addEventListener('click', zerarTodosDados);
    }
});

// Inicializar Firebase ao carregar página
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🔥 Inicializando Firebase...');
    
    // Verificar versão e limpar cache se necessário
    const VERSAO_ATUAL = 'v24.2-PROD';
    const ultimaVersao = localStorage.getItem('appVersion');
    
    if (ultimaVersao !== VERSAO_ATUAL) {
        console.log(`🔄 Nova versão detectada: ${ultimaVersao || 'primeira vez'} → ${VERSAO_ATUAL}`);
        console.log('🧹 Limpando cache antigo automaticamente...');
        
        // Limpar TUDO exceto senhas e login
        const keepKeys = ['passwords', 'currentUser', 'currentRole', 'currentUserFullName', 'rememberMe', 'rememberMeExpiry'];
        const allKeys = Object.keys(localStorage);
        
        allKeys.forEach(key => {
            if (!keepKeys.includes(key) && key !== 'appVersion') {
                localStorage.removeItem(key);
                console.log(`   🗑️ Removido: ${key}`);
            }
        });
        
        // Salvar nova versão
        localStorage.setItem('appVersion', VERSAO_ATUAL);
        
        console.log(`✅ Cache limpo! App atualizado para ${VERSAO_ATUAL}`);
        console.log('📡 Dados serão carregados do Firebase...');
    }
    
    await FirebaseDB.init(); // ✅ ATIVADO PARA PRODUÇÃO
    // NÃO inicializar notificações aqui - vai inicializar DEPOIS do login
    PushNotifications.setupForegroundListener(); // ✅ ATIVADO PARA PRODUÇÃO
    console.log('✅ App pronto COM Firebase (PRODUÇÃO)!');
});

// ========================================
// GERENCIADOR VENDEDORA
// ========================================
class VendedoraManager {
    
    static loadDashboard() {
        const vehicles = DB.getVehicles();
        const currentUser = APP_STATE.currentUserFullName;
        
        console.log('🔍 Dashboard Vendedora - Usuário:', currentUser);
        console.log('🔍 Total veículos:', vehicles.length);
        
        // Filtrar apenas carros cadastrados por esta vendedora (CASE-INSENSITIVE)
        const meusCarros = vehicles.filter(v => {
            const match = v.cadastradoPor && v.cadastradoPor.toLowerCase() === currentUser.toLowerCase();
            if (match) console.log('✅ Match:', v.modelo);
            return match;
        });
        
        console.log('🔍 Meus carros:', meusCarros.length);
        
        const emProcesso = meusCarros.filter(v => v.status !== 'montado');
        const finalizados = meusCarros.filter(v => v.status === 'montado');
        
        const dashboard = document.getElementById('vendedoraDashboard');
        if (!dashboard) return;
        
        dashboard.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 20px 0;">📊 Meus Carros</h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e;">
                        <div style="font-size: 2rem; font-weight: bold; color: #15803d;">${meusCarros.length}</div>
                        <div style="color: #15803d; font-size: 0.9rem;">Total Cadastrados</div>
                    </div>
                    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                        <div style="font-size: 2rem; font-weight: bold; color: #d97706;">${emProcesso.length}</div>
                        <div style="color: #d97706; font-size: 0.9rem;">Em Processo</div>
                    </div>
                    <div style="background: #dbeafe; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                        <div style="font-size: 2rem; font-weight: bold; color: #1d4ed8;">${finalizados.length}</div>
                        <div style="color: #1d4ed8; font-size: 0.9rem;">Finalizados</div>
                    </div>
                </div>
                
                ${emProcesso.length > 0 ? `
                    <h4 style="margin: 24px 0 12px 0;">🟡 Em Processo</h4>
                    ${emProcesso.map(v => `
                        <div style="background: #fef9c3; padding: 16px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #eab308;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <h4 style="margin: 0 0 8px 0;">${v.modelo}</h4>
                                    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Chassi:</strong> ${v.chassi}</p>
                                    ${v.cadastroData ? `<p style="margin: 4px 0; font-size: 0.85rem; color: #64748b;">Cadastrado: ${Utils.formatDate(v.cadastroData)}</p>` : ''}
                                </div>
                                <span style="background: #eab308; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem; white-space: nowrap;">
                                    Em Processo
                                </span>
                            </div>
                        </div>
                    `).join('')}
                ` : ''}
                
                ${finalizados.length > 0 ? `
                    <h4 style="margin: 24px 0 12px 0;">✅ Finalizados</h4>
                    ${finalizados.slice(0, 5).map(v => `
                        <div style="background: #f0fdf4; padding: 16px; margin-bottom: 12px; border-radius: 8px; border-left: 4px solid #22c55e;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <h4 style="margin: 0 0 8px 0;">${v.modelo}</h4>
                                    <p style="margin: 4px 0; font-size: 0.9rem;"><strong>Chassi:</strong> ${v.chassi}</p>
                                    ${v.montagemData ? `<p style="margin: 4px 0; font-size: 0.85rem; color: #64748b;">Finalizado: ${Utils.formatDate(v.montagemData)}</p>` : ''}
                                </div>
                                <span style="background: #22c55e; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem;">
                                    ✅ PRONTO
                                </span>
                            </div>
                        </div>
                    `).join('')}
                    ${finalizados.length > 5 ? `<p style="text-align: center; color: #64748b; margin-top: 12px;">+ ${finalizados.length - 5} finalizados</p>` : ''}
                ` : ''}
            </div>
        `;
    }
    
    static getStatusLabel(status) {
        const labels = {
            'cadastrado': '📋 Cadastrado',
            'desmontado': '🔧 Desmontado',
            'aplicado': '🛡️ Película Aplicada',
            'montado': '✅ Finalizado',
            'espera': '⏸️ Em Espera'
        };
        return labels[status] || status;
    }
    
    static gerarRelatorio() {
        const vehicles = DB.getVehicles();
        const currentUser = APP_STATE.currentUserFullName;
        
        // Filtrar apenas carros desta vendedora
        const meusCarros = vehicles.filter(v => v.cadastradoPor === currentUser);
        
        if (meusCarros.length === 0) {
            alert('Você ainda não cadastrou nenhum veículo!');
            return;
        }
        
        // Gerar CSV
        let csvData = '\uFEFF'; // BOM UTF-8
        csvData += 'Data Cadastro;Modelo;Chassi;Status;Data Finalização;Dias Total\n';
        
        meusCarros.forEach(v => {
            const dataCad = v.cadastroData ? Utils.formatDate(v.cadastroData) : '-';
            const modelo = (v.modelo || '-').replace(/;/g, ',');
            const chassi = (v.chassi || '-').replace(/;/g, ',');
            const status = this.getStatusLabel(v.status);
            const dataFinal = v.montagemData ? Utils.formatDate(v.montagemData) : '-';
            
            const dias = v.cadastroData && v.montagemData ? 
                Math.ceil((new Date(v.montagemData) - new Date(v.cadastroData)) / (1000 * 60 * 60 * 24)) : '-';
            
            csvData += `${dataCad};${modelo};${chassi};${status};${dataFinal};${dias}\n`;
        });
        
        // Download
        const filename = `meus-carros-${Utils.formatDate(new Date())}.csv`;
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        alert(`✅ Relatório gerado!\n\n${meusCarros.length} veículo(s)\nArquivo: ${filename}`);
    }
}

