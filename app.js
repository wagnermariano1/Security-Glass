// Security Glass App - Main JavaScript v2.0
// Novo fluxo: Cadastrado → Desmontado → Aplicado → Montado

const DB = {
    getVehicles: () => JSON.parse(localStorage.getItem('vehicles') || '[]'),
    saveVehicles: (vehicles) => localStorage.setItem('vehicles', JSON.stringify(vehicles)),
    
    getTeam: () => JSON.parse(localStorage.getItem('team') || JSON.stringify({
        aplicadores: ['Jonas', 'Maycon'],
        montadores: ['Rafael', 'Vinicius', 'Arthur', 'Claiton']
    })),
    saveTeam: (team) => localStorage.setItem('team', JSON.stringify(team)),
    
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

        this.showDashboard();
    }

    static logout() {
        APP_STATE.currentUser = null;
        APP_STATE.currentRole = null;
        APP_STATE.currentUserFullName = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('currentUserFullName');
        
        document.getElementById('dashboardScreen').classList.remove('active');
        document.getElementById('loginScreen').classList.add('active');
        document.body.classList.remove('gestor', 'manager', 'aplicador', 'montador');
        
        document.getElementById('passwordInput').value = '';
    }

    static showDashboard() {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('dashboardScreen').classList.add('active');
        
        document.getElementById('userNameDisplay').textContent = APP_STATE.currentUserFullName;
        
        document.body.classList.add(APP_STATE.currentRole);
        
        Dashboard.init();
    }

    static checkAuth() {
        const user = localStorage.getItem('currentUser');
        const role = localStorage.getItem('currentRole');
        const fullName = localStorage.getItem('currentUserFullName');
        
        if (user && role && fullName) {
            APP_STATE.currentUser = user;
            APP_STATE.currentRole = role;
            APP_STATE.currentUserFullName = fullName;
            
            const userSelect = document.getElementById('userSelect');
            userSelect.value = user;
            
            this.showDashboard();
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
            // Montador vê apenas seus carros em cadastrado e aplicado
            cadastrados = cadastrados.filter(v => v.montador === currentUserName);
            aplicados = aplicados.filter(v => v.montador === currentUserName);
            // Não vê desmontados (são para aplicadores)
            desmontados = [];
        }
        
        if (role === 'aplicador') {
            // Aplicador vê apenas desmontados (todos) e seus aplicados
            cadastrados = [];
            aplicados = aplicados.filter(v => v.aplicador === currentUserName);
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

    static createVehicleCard(vehicle) {
        const actions = this.getVehicleActions(vehicle);
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
                <h4>${vehicle.modelo}</h4>
                <p><strong>Chassi:</strong> ${vehicle.chassi}</p>
                <p><strong>Concessionária:</strong> ${vehicle.concessionaria}</p>
                ${vehicle.local ? `<p><strong>Local:</strong> ${vehicle.local}</p>` : ''}
                ${obsToShow}
                <p><strong>Aplicador:</strong> ${vehicle.aplicador || 'A definir'}</p>
                <p><strong>Montador:</strong> ${vehicle.montador || 'A definir'}</p>
                ${vehicle.cadastroData ? `<p><small>Cadastrado: ${Utils.formatDate(vehicle.cadastroData)}</small></p>` : ''}
                ${vehicle.desmontagemData ? `<p><small>Desmontado: ${Utils.formatDate(vehicle.desmontagemData)}</small></p>` : ''}
                ${vehicle.aplicacaoData ? `<p><small>Aplicado: ${Utils.formatDateTime(vehicle.aplicacaoData)}</small></p>` : ''}
                ${vehicle.montagemData ? `<p><small>Montado: ${Utils.formatDate(vehicle.montagemData)} ${vehicle.montagemFotos && vehicle.montagemFotos.length > 0 ? `📷 ${vehicle.montagemFotos.length}` : ''}</small></p>` : ''}
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
        }
        
        return '';
    }

    static markAsDesmontado(vehicleId) {
        UpdateStatusModal.show(vehicleId, 'desmontado');
    }

    static markAsAplicado(vehicleId) {
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (vehicle) {
            vehicle.status = 'aplicado';
            vehicle.aplicacaoData = new Date().toISOString();
            vehicle.aplicadoPor = APP_STATE.currentUserFullName;
            
            DB.saveVehicles(vehicles);
            this.renderDashboard();
        }
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
        const concessionaria = document.getElementById('concessionaria').value.trim();
        const local = document.getElementById('local').value.trim();
        const chassi = document.getElementById('chassi').value.trim();
        const modelo = document.getElementById('modelo').value.trim();
        const observacoes = document.getElementById('observacoes').value.trim();
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
        
        if (action === 'desmontado') {
            title.textContent = 'Marcar como Desmontado';
            photoSection.style.display = 'none';
            changeMontadorSection.style.display = 'none';
            obsDesmontarSection.style.display = 'block';
            // Limpar campo
            document.getElementById('obsDesmontar').value = '';
        } else if (action === 'montado') {
            title.textContent = 'Marcar como Montado';
            photoSection.style.display = 'block';
            obsDesmontarSection.style.display = 'none';
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
        
        const vehicles = DB.getVehicles();
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (vehicle && action === 'desmontado') {
            // Marcar como desmontado
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
            
            document.getElementById('updateStatusModal').classList.remove('active');
            document.getElementById('updateStatusForm').reset();
            
            alert('Veículo desmontado com sucesso!');
            
        } else if (vehicle && action === 'montado') {
            // Verificar se trocou montador
            if (newMontador) {
                vehicle.montador = newMontador;
            }
            
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
                            <p>${Utils.formatDateTime(vehicle.aplicacaoData)} - por ${vehicle.aplicadoPor}</p>
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
                                        <img src="${photo}" alt="Foto da montagem" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" onclick="window.open('${photo}', '_blank')">
                                    `).join('')}
                                </div>
                            ` : '<p style="margin-top: 8px; color: #f97316;">⚠️ Nenhuma foto anexada</p>'}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        document.querySelectorAll('#vehicleDetailModal .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        });
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

// Gerenciador de Veículos
class VehiclesManager {
    static loadVehiclesList() {
        const vehicles = DB.getVehicles();
        this.renderList(vehicles);
    }

    static search(query) {
        const vehicles = DB.getVehicles();
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
        
        list.innerHTML = vehicles.map(vehicle => Dashboard.createVehicleCard(vehicle)).join('');
        
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
        csv += 'Concessionária;Local;Modelo;Mês;Desmontador;Aplicador;Montador;OBS Montagem\n';
        
        finalizados.forEach(v => {
            const concessionaria = v.concessionaria || '-';
            const local = v.local || '-';
            const modelo = v.modelo || '-';
            const mes = Utils.getCurrentMonth(); // Mês atual (ex: "2026-02")
            const desmontador = v.desmontadoPor || '-';
            const aplicador = v.aplicadoPor || v.aplicador || '-';
            const montador = v.montadoPor || v.montador || '-';
            const obsMontagemDesmontagem = (v.obsDesmontar || '-').replace(/;/g, ','); // OBS da desmontagem (avarias)
            
            // Nova ordem: Concessionária, Local, Modelo, Mês, Desmontador, Aplicador, Montador, OBS
            csv += `${concessionaria};${local};${modelo};${mes};${desmontador};${aplicador};${montador};${obsMontagemDesmontagem}\n`;
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

// Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registrado'))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}
