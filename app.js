// Security Glass App - Main JavaScript v9.0 - Firebase Integration
// Novo fluxo: Cadastrado → Desmontado → Aplicado → Montado

console.log('🔥 Security Glass v9.0 - Firebase Integration!');

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
        
        // Sincronizar dados do localStorage para Firebase (primeira vez)
        await this.syncLocalToFirebase();
        
        // Configurar listeners em tempo real
        this.setupRealtimeListeners();
    },
    
    async syncLocalToFirebase() {
        try {
            const { db, collection, getDocs } = window.firebase;
            const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
            const localVehicles = JSON.parse(localStorage.getItem('vehicles') || '[]');
            
            // CENÁRIO 1: Firebase tem dados E localStorage também tem
            if (!vehiclesSnapshot.empty && localVehicles.length > 0) {
                console.log('🔄 Firebase e localStorage têm dados. Firebase é a fonte da verdade.');
                // Firebase sincroniza via listener, localStorage será atualizado automaticamente
                return;
            }
            
            // CENÁRIO 2: Firebase VAZIO mas localStorage TEM dados
            if (vehiclesSnapshot.empty && localVehicles.length > 0) {
                // Verificar se é migração inicial legítima OU dados órfãos
                const jaMigrou = localStorage.getItem('firebase_migrated');
                
                if (jaMigrou === 'true') {
                    // JÁ MIGROU ANTES = São dados ÓRFÃOS!
                    console.log('🧹 Detectados dados órfãos no localStorage. Limpando...');
                    localStorage.removeItem('vehicles');
                    
                    // Mostra mensagem pro usuário
                    this.mostrarMensagemLimpeza();
                    return;
                }
                
                // PRIMEIRA VEZ = Migração legítima
                console.log(`📦 Primeira migração: ${localVehicles.length} veículos → Firebase`);
                for (const vehicle of localVehicles) {
                    await this.saveVehicle(vehicle);
                }
                localStorage.setItem('firebase_migrated', 'true');
                console.log('✅ Migração inicial completa!');
                return;
            }
            
            // CENÁRIO 3: Firebase tem dados, localStorage vazio
            if (!vehiclesSnapshot.empty && localVehicles.length === 0) {
                console.log('✅ Firebase tem dados, localStorage será preenchido via listener.');
                localStorage.setItem('firebase_migrated', 'true');
                return;
            }
            
            // CENÁRIO 4: Ambos vazios
            console.log('✅ Ambos vazios. Sistema pronto para novos cadastros.');
            
            // Migrar equipe (só na primeira vez)
            const jaMigrouEquipe = localStorage.getItem('team_migrated');
            if (!jaMigrouEquipe) {
                const localTeam = JSON.parse(localStorage.getItem('team') || 'null');
                if (localTeam) {
                    await this.saveTeam(localTeam);
                    localStorage.setItem('team_migrated', 'true');
                }
            }
            
        } catch (error) {
            console.error('Erro ao sincronizar dados:', error);
        }
    },
    
    mostrarMensagemLimpeza() {
        // Cria notificação discreta
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #3b82f6;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            font-size: 14px;
            animation: slideIn 0.3s ease-out;
        `;
        notif.textContent = '🧹 Cache antigo removido. Sistema atualizado!';
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notif.remove(), 300);
        }, 3000);
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
    
    getTeam: () => JSON.parse(localStorage.getItem('team') || JSON.stringify({
        aplicadores: ['Jonas', 'Maycon'],
        montadores: ['Rafael', 'Vinicius', 'Arthur', 'Claiton']
    })),
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
    
    getPasswords: () => {
        const defaultPasswords = {
            wagner: '11111111',
            vinicius: '11111111',
            jonas: '11111111',
            maycon: '11111111',
            rafael: '11111111',
            arthur: '11111111',
            claiton: '11111111'
        };
        return JSON.parse(localStorage.getItem('passwords') || JSON.stringify(defaultPasswords));
    },
    savePasswords: (passwords) => localStorage.setItem('passwords', JSON.stringify(passwords))
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
        
        const changePasswordBtn = document.getElementById('changePasswordBtn');
        changePasswordBtn.addEventListener('click', () => this.showChangePasswordModal());
    }

    static login() {
        const userSelect = document.getElementById('userSelect');
        const passwordInput = document.getElementById('passwordInput');
        const rememberMe = document.getElementById('rememberMe');
        const username = userSelect.value;
        const password = passwordInput.value;
        
        if (!username) {
            alert('Selecione um usuário');
            return;
        }
        
        const passwords = DB.getPasswords();
        
        if (passwords[username] !== password) {
            alert('Senha incorreta!');
            passwordInput.value = '';
            return;
        }

        const userOption = userSelect.options[userSelect.selectedIndex];
        const fullName = userOption.text.split(' (')[0];
        const roleText = userOption.text.match(/\(([^)]+)\)/)[1];
        
        let role = 'montador';
        if (roleText === 'Gestor') role = 'gestor';
        else if (roleText === 'Gerente') role = 'manager';
        else if (roleText === 'Aplicador') role = 'aplicador';

        APP_STATE.currentUser = username;
        APP_STATE.currentRole = role;
        APP_STATE.currentUserFullName = fullName;

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

    static showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        document.getElementById('userNameDisplay').textContent = APP_STATE.currentUserFullName;
        
        document.body.classList.add(APP_STATE.currentRole);
        
        // Mostrar configurações avançadas só para Wagner
        if (APP_STATE.currentUser === 'wagner') {
            document.getElementById('wagnerOnlySettings').style.display = 'block';
        } else {
            document.getElementById('wagnerOnlySettings').style.display = 'none';
        }
        
        Dashboard.init();
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
            
            const userSelect = document.getElementById('userSelect');
            userSelect.value = user;
            
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
    
    static showChangePasswordModal() {
        const modal = document.getElementById('changePasswordModal');
        modal.classList.add('active');
        
        const form = document.getElementById('changePasswordForm');
        form.onsubmit = (e) => {
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
    
    static changePassword() {
        const user = document.getElementById('changePasswordUser').value;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!user) {
            alert('Selecione um usuário');
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
        
        const passwords = DB.getPasswords();
        
        if (passwords[user] !== currentPassword) {
            alert('Senha atual incorreta!');
            return;
        }
        
        passwords[user] = newPassword;
        DB.savePasswords(passwords);
        
        alert('Senha alterada com sucesso!');
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
                return '<button class="btn btn-small btn-success" onclick="Dashboard.markAsMontado(\'' + vehicle.id + '\')">Montar</button>';
            }
        }
        
        // Aplicador
        if (role === 'aplicador') {
            if (vehicle.status === 'desmontado') {
                return '<button class="btn btn-small btn-secondary" onclick="Dashboard.markAsAplicado(\'' + vehicle.id + '\')">Aplicado</button>';
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

    static startAutoRefresh() {
        setInterval(() => {
            if (document.getElementById('dashboardTab').classList.contains('active')) {
                this.renderDashboard();
            }
        }, 30000);
        
        // Verificar automação 18h a cada 5 minutos
        this.checkEsperaAutomation();
        setInterval(() => {
            this.checkEsperaAutomation();
        }, 5 * 60 * 1000); // 5 minutos
    }
    
    static checkEsperaAutomation() {
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        
        // Configuração: horário padrão 19:30h
        const HORA_LIMITE = 19;
        const MINUTO_LIMITE = 30;
        
        // Se passou das 19:30h, verificar carros cadastrados não desmontados hoje
        const passouHorario = (hour > HORA_LIMITE) || (hour === HORA_LIMITE && minutes >= MINUTO_LIMITE);
        
        if (passouHorario) {
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
                    
                    // Verificar se foi cadastrado ANTES das 19:30h
                    const cadastradoAntes = (cadastroHour < HORA_LIMITE) || (cadastroHour === HORA_LIMITE && cadastroMinutes < MINUTO_LIMITE);
                    
                    // Se foi cadastrado HOJE e ANTES das 19:30h (e ainda não desmontou)
                    if (cadastroDateStr === today && cadastradoAntes) {
                        // Mover para ESPERA
                        v.status = 'espera';
                        v.motivoEspera = 'Não desmontado até 19:30h';
                        v.dataEspera = new Date().toISOString();
                        v.tentouDesmontarPor = 'Automação (Não tentou)';
                        movidosParaEspera++;
                    }
                }
            });
            
            if (movidosParaEspera > 0) {
                DB.saveVehicles(vehicles);
                this.renderDashboard();
                console.log(`Automação 19:30h: ${movidosParaEspera} veículo(s) movido(s) para ESPERA`);
            }
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
        const photoPreview = document.getElementById('photoPreview');
        const extractBtn = document.getElementById('extractDataBtn');
        const chassiInput = document.getElementById('chassi');
        
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    photoPreview.innerHTML = `<img src="${event.target.result}" alt="Foto do veículo">`;
                    extractBtn.style.display = 'block';
                    extractBtn.dataset.imageData = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        extractBtn.addEventListener('click', () => {
            alert('Funcionalidade de OCR: Em produção, isso extrairia automaticamente os dados da foto.\n\nPor enquanto, preencha os campos manualmente.');
        });

        chassiInput.addEventListener('blur', () => {
            this.checkDuplicateChassi();
        });

        form.onsubmit = (e) => {
            e.preventDefault();
            this.submitForm();
        };

        document.querySelectorAll('#newVehicleModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                form.reset();
                photoPreview.innerHTML = '';
                extractBtn.style.display = 'none';
            });
        });
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

    static submitForm() {
        const concessionaria = document.getElementById('concessionaria').value.trim().toUpperCase();
        const local = document.getElementById('local').value.trim().toUpperCase();
        const chassi = document.getElementById('chassi').value.trim();
        const modelo = document.getElementById('modelo').value.trim().toUpperCase();
        const observacoes = document.getElementById('observacoes').value.trim();
        const prioridade = document.getElementById('prioridade').value.trim();
        const obsUrgencia = document.getElementById('obsUrgencia').value.trim();
        const aplicador = document.getElementById('aplicador').value;
        const montador = document.getElementById('montador').value;
        
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
            cadastroData: new Date().toISOString()
        };
        
        vehicles.unshift(newVehicle);
        DB.saveVehicles(vehicles);
        
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
        
        Dashboard.renderDashboard();
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
            document.getElementById('btnDesmontouSim').onclick = () => {
                desmontarChoiceSection.style.display = 'none';
                obsDesmontarSection.style.display = 'block';
                motivoNaoDesmontarSection.style.display = 'none';
                modalActions.style.display = 'flex'; // Mostrar botões
                document.getElementById('updateAction').value = 'desmontado_sim';
                // Remover required do motivo
                document.getElementById('motivoNaoDesmontar').removeAttribute('required');
            };
            
            document.getElementById('btnDesmontouNao').onclick = () => {
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
        
        form.onsubmit = (e) => {
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

    static submit() {
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
            
            DB.saveVehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificar Vinicius
            PushNotifications.sendNotification(
                ['vinicius'],
                '✅ Carro desmontado',
                `${vehicle.modelo} desmontado por ${APP_STATE.currentUserFullName}`
            );
            
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
            
            DB.saveVehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificar Vinicius
            PushNotifications.sendNotification(
                ['vinicius'],
                '⚠️ Carro em ESPERA',
                `${vehicle.modelo} - Motivo: ${motivo}`
            );
            
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
            
            DB.saveVehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificar Vinicius
            PushNotifications.sendNotification(
                ['vinicius'],
                '✨ Carro aplicado',
                `${vehicle.modelo} aplicado por ${APP_STATE.currentUserFullName}`
            );
            
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
                
                DB.saveVehicles(vehicles);
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
            
            DB.saveVehicles(vehicles);
            Dashboard.renderDashboard();
            
            // Notificar Vinicius
            PushNotifications.sendNotification(
                ['vinicius'],
                '🎉 Carro finalizado',
                `${vehicle.modelo} montado por ${APP_STATE.currentUserFullName}`
            );
            
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
    
    static deleteVehicle(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle) {
            alert('Veículo não encontrado!');
            return;
        }
        
        const confirmMsg = `Tem certeza que deseja EXCLUIR o veículo?\n\n${vehicle.modelo}\nChassi: ${vehicle.chassi}\n\nEsta ação NÃO pode ser desfeita!`;
        
        if (confirm(confirmMsg)) {
            // Remover veículo
            const newVehicles = vehicles.filter(v => v.id !== vehicleId);
            DB.saveVehicles(newVehicles);
            
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
        form.onsubmit = (e) => {
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
        DB.saveVehicles(vehicles);
        
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
        
        let html = `
            <h3>Relatório do Mês - ${Utils.getCurrentMonth()}</h3>
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
}

// Gerenciador de Equipe
class TeamManager {
    static loadTeam() {
        const team = DB.getTeam();
        
        const aplicadoresList = document.getElementById('aplicadoresList');
        const montadoresList = document.getElementById('montadoresList');
        
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
    }

    static addMember(role) {
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
        this.loadTeam();
        Dashboard.loadTeamMembers();
    }

    static removeMember(role, name) {
        if (!confirm(`Remover ${name}?`)) return;
        
        const team = DB.getTeam();
        
        if (role === 'aplicador') {
            team.aplicadores = team.aplicadores.filter(n => n !== name);
        } else {
            team.montadores = team.montadores.filter(n => n !== name);
        }
        
        DB.saveTeam(team);
        this.loadTeam();
        Dashboard.loadTeamMembers();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    AuthSystem.init();
    AuthSystem.checkAuth();
});

// Gerenciador de Rota de Desmontagem
class RotaDesmontagemManager {
    static loadRota() {
        const vehicles = DB.getVehicles();
        const cadastrados = vehicles.filter(v => v.status === 'cadastrado' || v.status === 'espera');
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaDesmontagemList');
        
        if (cadastrados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo cadastrado aguardando desmontagem!</p></div>';
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
        const cadastrados = vehicles.filter(v => v.status === 'cadastrado' || v.status === 'espera');
        
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
        
        // Contar números de rota USADOS por esse montador (híbrido: BD + TELA)
        const numerosUsados = [];
        
        cadastrados.forEach(v => {
            if (v.id === vehicleId) return; // Pular o atual
            
            // Pegar montador da TELA (pode ter sido alterado mas não salvo)
            const montSelect = document.getElementById(`montDesm_${v.id}`);
            const montadorAtual = montSelect ? montSelect.value : v.montador;
            
            // Se é do mesmo montador que estamos verificando
            if (montadorAtual === novoMontador) {
                // Pegar número da TELA (pode ter sido alterado)
                const rotaInput = document.getElementById(`rotaDesm_${v.id}`);
                const numero = rotaInput ? parseInt(rotaInput.value) : v.rotaDesmontagem;
                
                if (numero) {
                    numerosUsados.push(numero);
                }
            }
        });
        
        // Achar maior número usado
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputRota.value = maiorNumero + 1;
    }
    
    static saveRota() {
        const vehicles = DB.getVehicles();
        const cadastrados = vehicles.filter(v => v.status === 'cadastrado');
        
        // VALIDAR: verificar números duplicados por montador
        const rotasPorMontador = {};
        let temDuplicado = false;
        let mensagemErro = '';
        
        cadastrados.forEach(v => {
            const rotaInput = document.getElementById(`rotaDesm_${v.id}`);
            const montSelect = document.getElementById(`montDesm_${v.id}`);
            
            if (rotaInput && montSelect) {
                const rota = parseInt(rotaInput.value);
                const montador = montSelect.value;
                
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
        cadastrados.forEach(v => {
            const rotaInput = document.getElementById(`rotaDesm_${v.id}`);
            const montSelect = document.getElementById(`montDesm_${v.id}`);
            
            if (rotaInput && montSelect) {
                v.rotaDesmontagem = parseInt(rotaInput.value);
                v.montador = montSelect.value;
                saved++;
            }
        });
        
        DB.saveVehicles(vehicles);
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
        const desmontados = vehicles.filter(v => v.status === 'desmontado');
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaAplicacaoList');
        
        if (desmontados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo desmontado aguardando aplicação!</p></div>';
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
        const desmontados = vehicles.filter(v => v.status === 'desmontado');
        
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
        
        // Contar números de sequência USADOS por esse aplicador (híbrido: BD + TELA)
        const numerosUsados = [];
        
        desmontados.forEach(v => {
            if (v.id === vehicleId) return; // Pular o atual
            
            // Pegar aplicador da TELA (pode ter sido alterado mas não salvo)
            const appSelect = document.getElementById(`app_${v.id}`);
            const aplicadorAtual = appSelect ? appSelect.value : v.aplicador;
            
            // Se é do mesmo aplicador que estamos verificando
            if (aplicadorAtual === novoAplicador) {
                // Pegar número da TELA (pode ter sido alterado)
                const seqInput = document.getElementById(`seq_${v.id}`);
                const numero = seqInput ? parseInt(seqInput.value) : v.sequenciaAplicacao;
                
                if (numero) {
                    numerosUsados.push(numero);
                }
            }
        });
        
        // Achar maior número usado
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputSeq.value = maiorNumero + 1;
    }
    
    static saveRota() {
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
        
        DB.saveVehicles(vehicles);
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
        const aplicados = vehicles.filter(v => v.status === 'aplicado');
        const team = DB.getTeam();
        
        const list = document.getElementById('rotaMontagemList');
        
        if (aplicados.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>✅ Nenhum veículo aplicado aguardando montagem!</p></div>';
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
        const aplicados = vehicles.filter(v => v.status === 'aplicado');
        
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
        
        // Contar números de rota USADOS por esse montador (híbrido: BD + TELA)
        const numerosUsados = [];
        
        aplicados.forEach(v => {
            if (v.id === vehicleId) return; // Pular o atual
            
            // Pegar montador da TELA (pode ter sido alterado mas não salvo)
            const montSelect = document.getElementById(`montMont_${v.id}`);
            const montadorAtual = montSelect ? montSelect.value : v.montador;
            
            // Se é do mesmo montador que estamos verificando
            if (montadorAtual === novoMontador) {
                // Pegar número da TELA (pode ter sido alterado)
                const rotaInput = document.getElementById(`rotaMont_${v.id}`);
                const numero = rotaInput ? parseInt(rotaInput.value) : v.rotaMontagem;
                
                if (numero) {
                    numerosUsados.push(numero);
                }
            }
        });
        
        // Achar maior número usado
        const maiorNumero = numerosUsados.length > 0 ? Math.max(...numerosUsados) : 0;
        
        // Sugerir próximo número
        inputRota.value = maiorNumero + 1;
    }
    
    static saveRota() {
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
        
        DB.saveVehicles(vehicles);
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
        
        list.innerHTML = emEspera.map(v => `
            <div class="espera-card" style="background: white; padding: 20px; margin-bottom: 16px; border-radius: 8px; border-left: 4px solid #f97316;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">${v.modelo}</h3>
                        <p style="margin: 4px 0;"><strong>Chassi:</strong> ${v.chassi}</p>
                        <p style="margin: 4px 0;"><strong>Concessionária:</strong> ${v.concessionaria}</p>
                        <p style="margin: 4px 0;"><strong>Local:</strong> ${v.local || '-'}</p>
                    </div>
                    <span style="background: #f97316; color: white; padding: 4px 12px; border-radius: 4px; font-size: 0.85rem;">EM ESPERA</span>
                </div>
                
                <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                    <p style="margin: 0; color: #92400e;"><strong>❌ Motivo:</strong> ${v.motivoEspera}</p>
                    <p style="margin: 4px 0 0 0; color: #92400e; font-size: 0.9rem;"><strong>Tentou desmontar:</strong> ${v.tentouDesmontarPor} - ${Utils.formatDateTime(v.dataEspera)}</p>
                </div>
                
                ${v.obsUrgencia ? `<p style="color: #dc2626; margin-bottom: 8px;"><strong>🚨 Urgência:</strong> ${v.obsUrgencia}</p>` : ''}
                
                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="btn btn-primary" onclick="EsperaManager.reatribuir('${v.id}')">🔄 Reatribuir Montador</button>
                    <button class="btn btn-secondary" onclick="EsperaManager.voltarFila('${v.id}')">↩️ Voltar pra Fila</button>
                </div>
            </div>
        `).join('');
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
        
        document.getElementById('btnCancelarReatribuir').onclick = () => {
            document.body.removeChild(modal);
        };
        
        document.getElementById('btnConfirmarReatribuir').onclick = () => {
            const novoMontador = document.getElementById('selectNovoMontador').value;
            
            vehicle.montador = novoMontador;
            vehicle.status = 'cadastrado'; // Volta pro início
            delete vehicle.motivoEspera;
            delete vehicle.dataEspera;
            delete vehicle.tentouDesmontarPor;
            
            DB.saveVehicles(vehicles);
            this.loadEspera();
            Dashboard.renderDashboard();
            
            document.body.removeChild(modal);
            alert(`✅ Veículo reatribuído para ${novoMontador}!`);
        };
    }
    
    static voltarFila(vehicleId) {
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
        
        DB.saveVehicles(vehicles);
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
    await FirebaseDB.init();
    // NÃO inicializar notificações aqui - vai inicializar DEPOIS do login
    PushNotifications.setupForegroundListener();
    console.log('✅ App pronto com Firebase!');
});
