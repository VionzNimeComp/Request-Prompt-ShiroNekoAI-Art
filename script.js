// ============================================
// REQUEST PROMPT - MAIN APPLICATION
// ============================================

class RequestPromptApp {
    constructor() {
        // State
        this.imageFile = null;
        this.imageName = null;
        this.imageSize = null;
        this.requestId = this.generateId();
        this.isSubmitting = false;
        this.cooldownTime = 120000;
        this.lastSubmitTime = parseInt(localStorage.getItem('lastRequestTime')) || 0;
        this.selectedGenre = '';
        this.errorCount = 0;
        
        // ✅ URL untuk Vercel (ganti dengan URL deploy kamu)
        // Contoh: 'https://nama-project.vercel.app'
        this.baseUrl = window.location.origin; // Auto detect
        this.serverUrl = this.baseUrl;
        
        // DOM Elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.previewContainer = document.getElementById('previewContainer');
        this.namaInput = document.getElementById('namaInput');
        this.waInput = document.getElementById('waInput');
        this.teleInput = document.getElementById('teleInput');
        this.alasanInput = document.getElementById('alasanInput');
        this.genreInput = document.getElementById('genreInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.submitText = document.getElementById('submitText');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.statusMessage = document.getElementById('statusMessage');
        this.requestIdEl = document.getElementById('requestId');
        this.imageStatusEl = document.getElementById('imageStatus');
        this.requestStatusEl = document.getElementById('requestStatus');
        
        this.genreBtns = document.querySelectorAll('.genre-btn');
        
        this.init();
    }
    
    init() {
        if (typeof TELEGRAM_CONFIG === 'undefined') {
            this.showStatus('❌ File config.js tidak ditemukan!', 'error');
            return;
        }
        
        if (!validateConfig()) {
            this.showStatus('⚠️ Silakan isi Token Bot, Chat ID, dan Owner ID di config.js', 'error');
            this.submitBtn.disabled = true;
            return;
        }
        
        console.log('📡 Server URL:', this.serverUrl);
        
        // Event Listeners
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        this.namaInput.addEventListener('input', this.checkForm.bind(this));
        this.waInput.addEventListener('input', this.checkForm.bind(this));
        this.genreBtns.forEach(btn => {
            btn.addEventListener('click', this.selectGenre.bind(this));
        });
        
        this.submitBtn.addEventListener('click', this.handleSubmit.bind(this));
        this.clearAllBtn.addEventListener('click', this.clearAll.bind(this));
        
        this.requestIdEl.textContent = this.requestId;
        this.checkCooldownOnLoad();
    }
    
    // ===== FILE HANDLING =====
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
        this.fileInput.value = '';
    }
    
    processFile(file) {
        try {
            if (!file.type.startsWith('image/')) {
                const errorMsg = `File "${file.name}" bukan gambar!`;
                this.showStatus(`❌ ${errorMsg}`, 'error');
                this.sendErrorLog('File Validation Error', errorMsg, { fileName: file.name, fileType: file.type });
                return;
            }
            
            if (file.size > 20 * 1024 * 1024) {
                const errorMsg = `File "${file.name}" terlalu besar (${(file.size/1024/1024).toFixed(2)}MB), maks 20MB!`;
                this.showStatus(`❌ ${errorMsg}`, 'error');
                this.sendErrorLog('File Size Error', errorMsg, { fileName: file.name, fileSize: file.size });
                return;
            }
            
            const remaining = this.getCooldownRemaining();
            if (remaining > 0) {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                let timeMsg = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;
                this.showStatus(`⏳ Tunggu ${timeMsg} lagi!`, 'info');
                return;
            }
            
            this.imageFile = file;
            this.imageName = file.name;
            this.imageSize = file.size;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewContainer.innerHTML = `
                    <img src="${e.target.result}" alt="${this.imageName}" class="preview-image">
                `;
            };
            reader.onerror = (e) => {
                const errorMsg = 'Gagal membaca file untuk preview';
                this.showStatus(`❌ ${errorMsg}`, 'error');
                this.sendErrorLog('File Read Error', errorMsg, { fileName: file.name });
            };
            reader.readAsDataURL(file);
            
            this.imageStatusEl.textContent = file.name;
            this.checkForm();
            this.showStatus(`✅ Gambar "${file.name}" siap dikirim!`, 'success');
            
        } catch (error) {
            const errorMsg = `Error processing file: ${error.message}`;
            this.showStatus(`❌ ${errorMsg}`, 'error');
            this.sendErrorLog('Process File Error', errorMsg, { fileName: file?.name, errorStack: error.stack });
        }
    }
    
    // ===== GENRE SELECTION =====
    selectGenre(e) {
        try {
            const btn = e.target;
            const genre = btn.dataset.genre;
            
            if (!genre) {
                throw new Error('Genre data tidak ditemukan');
            }
            
            this.genreBtns.forEach(b => {
                b.classList.remove('active-sfw', 'active-nsfw');
            });
            
            if (genre === 'SFW') {
                btn.classList.add('active-sfw');
            } else if (genre === 'NSFW') {
                btn.classList.add('active-nsfw');
            } else {
                throw new Error(`Genre tidak dikenal: ${genre}`);
            }
            
            this.selectedGenre = genre;
            this.genreInput.value = genre;
            this.checkForm();
            
        } catch (error) {
            const errorMsg = `Error select genre: ${error.message}`;
            this.showStatus(`❌ ${errorMsg}`, 'error');
            this.sendErrorLog('Genre Selection Error', errorMsg, { errorStack: error.stack });
        }
    }
    
    // ===== CHECK FORM =====
    checkForm() {
        try {
            const nama = this.namaInput.value.trim();
            const wa = this.waInput.value.trim();
            const hasImage = this.imageFile !== null;
            const hasGenre = this.selectedGenre !== '';
            
            this.submitBtn.disabled = !(nama && wa && hasImage && hasGenre);
        } catch (error) {
            console.error('Check form error:', error);
        }
    }
    
    // ===== COOLDOWN =====
    getCooldownRemaining() {
        try {
            const now = Date.now();
            const lastSubmit = parseInt(localStorage.getItem('lastRequestTime')) || 0;
            
            if (lastSubmit === 0) return 0;
            
            const elapsed = now - lastSubmit;
            const remaining = this.cooldownTime - elapsed;
            
            return remaining > 0 ? remaining : 0;
        } catch (error) {
            this.sendErrorLog('Cooldown Error', error.message, { errorStack: error.stack });
            return 0;
        }
    }
    
    checkCooldownOnLoad() {
        try {
            const remaining = this.getCooldownRemaining();
            if (remaining > 0) {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                let timeMsg = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;
                this.showStatus(`⏳ Cooldown: ${timeMsg} tersisa`, 'info');
                this.submitBtn.disabled = true;
                
                this.cooldownInterval = setInterval(() => {
                    try {
                        const remain = this.getCooldownRemaining();
                        if (remain <= 0) {
                            clearInterval(this.cooldownInterval);
                            this.clearStatus();
                            this.showStatus('✅ Cooldown selesai! Silakan request lagi.', 'success');
                            this.submitBtn.disabled = false;
                            this.checkForm();
                            setTimeout(() => this.clearStatus(), 3000);
                        } else {
                            const mins = Math.floor(remain / 60000);
                            const secs = Math.floor((remain % 60000) / 1000);
                            let msg = mins > 0 ? `${mins} menit ${secs} detik` : `${secs} detik`;
                            this.showStatus(`⏳ Cooldown: ${msg} tersisa`, 'info');
                        }
                    } catch (error) {
                        clearInterval(this.cooldownInterval);
                        this.sendErrorLog('Cooldown Interval Error', error.message, { errorStack: error.stack });
                    }
                }, 1000);
            }
        } catch (error) {
            this.sendErrorLog('Cooldown Init Error', error.message, { errorStack: error.stack });
        }
    }
    
    // ===== SUBMIT REQUEST =====
    async handleSubmit() {
        if (this.isSubmitting) return;
        
        try {
            if (!this.imageFile) {
                this.showStatus('❌ Upload gambar terlebih dahulu!', 'error');
                return;
            }
            
            const nama = this.namaInput.value.trim();
            const wa = this.waInput.value.trim();
            
            if (!nama || !wa) {
                this.showStatus('❌ Nama dan WA wajib diisi!', 'error');
                return;
            }
            
            if (!this.selectedGenre) {
                this.showStatus('❌ Pilih genre terlebih dahulu!', 'error');
                return;
            }
            
            this.isSubmitting = true;
            this.submitBtn.disabled = true;
            this.submitText.textContent = '⏳ Mengirim...';
            this.loadingSpinner.classList.remove('hidden');
            this.showStatus('⏳ Mengirim request ke admin...', 'loading');
            
            this.requestId = this.generateId();
            this.requestIdEl.textContent = this.requestId;
            
            const now = new Date();
            const timeStr = now.toLocaleString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            let message = `📝 REQUEST PROMPT • ShiroNekoAI Art\n\n`;
            message += `🆔 ID Request: ${this.requestId}\n`;
            message += `📝 Nama: ${nama}\n`;
            message += `📱 WA: ${wa}\n`;
            message += `✈️ Tele: ${this.teleInput.value.trim() || '-'}\n`;
            message += `📝 Alasan: ${this.alasanInput.value.trim() || '-'}\n`;
            message += `🎭 Genre: ${this.selectedGenre}\n`;
            message += `🖼 File: ${this.imageName}\n`;
            message += `📏 Size: ${(this.imageSize/1024/1024).toFixed(2)} MB\n`;
            message += `⏰ Time: ${timeStr} WIB\n\n`;
            message += `#RequestPrompt #AI #ShiroNekoAI`;
            
            const result = await this.sendToTelegramViaServer(message, this.imageFile);
            
            if (result.success) {
                localStorage.setItem('lastRequestTime', String(Date.now()));
                this.lastSubmitTime = Date.now();
                
                this.showStatus('✅ Request berhasil dikirim! Simpan ID Anda.', 'success');
                this.requestStatusEl.textContent = '✅ Terkirim';
                
                setTimeout(() => {
                    this.clearAll();
                }, 3000);
            } else {
                const errorMsg = result.error || 'Gagal mengirim request ke Telegram!';
                this.showStatus(`❌ ${errorMsg}`, 'error');
                this.requestStatusEl.textContent = '❌ Gagal';
                await this.sendErrorLog('Telegram Send Error', errorMsg, {
                    requestId: this.requestId,
                    fileName: this.imageName
                });
            }
        } catch (error) {
            console.error('❌ Submit error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.requestStatusEl.textContent = '❌ Error';
            
            await this.sendErrorLog('Submit Error', error.message, {
                requestId: this.requestId,
                fileName: this.imageName,
                errorStack: error.stack
            });
        } finally {
            this.isSubmitting = false;
            this.submitBtn.disabled = false;
            this.submitText.textContent = '📤 Kirim Request';
            this.loadingSpinner.classList.add('hidden');
            this.checkForm();
        }
    }
    
    // ===== SEND TO TELEGRAM VIA SERVER =====
    async sendToTelegramViaServer(message, imageFile) {
        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('requestId', this.requestId);
            if (imageFile) {
                formData.append('photo', imageFile);
            }
            
            console.log('📤 Sending to:', `${this.serverUrl}/api/send-request`);
            
            const response = await fetch(`${this.serverUrl}/api/send-request`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('📥 Response:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Telegram error:', error);
            
            await this.sendErrorLog('Send Request Error', error.message, {
                requestId: this.requestId,
                fileName: this.imageName,
                serverUrl: this.serverUrl,
                errorStack: error.stack
            });
            
            return { success: false, error: error.message };
        }
    }
    
    // ===== SEND ERROR LOG VIA SERVER =====
    async sendErrorLog(errorType, errorMessage, errorDetails = {}) {
        try {
            if (!TELEGRAM_CONFIG.ownerId || TELEGRAM_CONFIG.ownerId === 'YOUR_OWNER_ID_HERE') {
                console.warn('⚠️ Owner ID tidak diisi, error log tidak terkirim!');
                return;
            }
            
            this.errorCount++;
            
            let ip = 'Unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ip = ipData.ip || 'Unknown';
            } catch (ipError) {}
            
            const response = await fetch(`${this.serverUrl}/api/send-error-log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    errorType: errorType,
                    errorMessage: errorMessage,
                    errorDetails: {
                        ...errorDetails,
                        requestId: this.requestId,
                        ip: ip,
                        userAgent: navigator.userAgent || 'Unknown'
                    }
                })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log(`✅ Error log terkirim ke Owner (ID: #${String(this.errorCount).padStart(4, '0')})`);
            }
            
        } catch (error) {
            console.error('❌ Gagal kirim error log:', error.message);
        }
    }
    
    // ===== UTILITY =====
    generateId() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }
    
    // ===== CLEAR ALL =====
    clearAll() {
        try {
            this.imageFile = null;
            this.imageName = null;
            this.imageSize = null;
            this.selectedGenre = '';
            this.genreInput.value = '';
            
            this.namaInput.value = '';
            this.waInput.value = '';
            this.teleInput.value = '';
            this.alasanInput.value = '';
            
            this.previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <span>📸</span>
                    <p>Belum ada gambar</p>
                </div>
            `;
            
            this.imageStatusEl.textContent = 'Belum ada';
            this.requestStatusEl.textContent = 'Menunggu';
            this.requestId = this.generateId();
            this.requestIdEl.textContent = this.requestId;
            
            this.genreBtns.forEach(b => {
                b.classList.remove('active-sfw', 'active-nsfw');
            });
            
            this.submitBtn.disabled = true;
            this.showStatus('🧹 Semua dibersihkan!', 'info');
            setTimeout(() => this.clearStatus(), 2000);
            
        } catch (error) {
            this.sendErrorLog('Clear All Error', error.message, { errorStack: error.stack });
        }
    }
    
    // ===== STATUS =====
    showStatus(message, type = '') {
        this.statusMessage.textContent = message;
        this.statusMessage.className = 'status-message';
        if (type) {
            this.statusMessage.classList.add(type);
            this.statusMessage.style.display = 'block';
        } else {
            this.statusMessage.style.display = 'none';
        }
    }
    
    clearStatus() {
        this.statusMessage.style.display = 'none';
        this.statusMessage.className = 'status-message';
    }
}

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new RequestPromptApp();
        window.requestApp = app;
        console.log('✅ Request Prompt App initialized!');
        console.log('📡 Server URL:', app.serverUrl);
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        alert('Terjadi error saat memuat aplikasi. Silakan refresh halaman.');
    }
});
