// ============================================
// KONFIGURASI TELEGRAM - LANGSUNG DI SINI
// ============================================

const TELEGRAM_CONFIG = {
    botToken: '8727885486:AAE1cjgW03D49rWTqNDM0kWgR1ZI0JhRYmM',
    chatId: '-1003700985529',
    ownerId: '2056834184', // GANTI DENGAN ID TELEGRAM ANDA
    apiUrl: 'https://api.telegram.org/bot'
};

// ============================================
// MAIN APPLICATION
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
        this.baseUrl = window.location.origin;
        this.apiUrl = this.baseUrl;
        
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
        
        // Cek apakah elemen ada
        if (!this.uploadArea || !this.fileInput) {
            alert('Error: Elemen HTML tidak ditemukan!');
            return;
        }
        
        this.init();
    }
    
    init() {
        console.log('✅ App starting...');
        console.log('📡 API URL:', this.apiUrl);
        console.log('📡 Bot Token:', TELEGRAM_CONFIG.botToken ? '✅ ADA' : '❌ TIDAK ADA');
        console.log('📡 Chat ID:', TELEGRAM_CONFIG.chatId ? '✅ ADA' : '❌ TIDAK ADA');
        
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
        
        console.log('✅ App ready!');
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
                this.showStatus('❌ File harus berupa gambar!', 'error');
                return;
            }
            
            if (file.size > 20 * 1024 * 1024) {
                this.showStatus(`❌ File terlalu besar (${(file.size/1024/1024).toFixed(2)}MB), maks 20MB!`, 'error');
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
            reader.readAsDataURL(file);
            
            this.imageStatusEl.textContent = file.name;
            this.checkForm();
            this.showStatus(`✅ Gambar "${file.name}" siap dikirim!`, 'success');
            
        } catch (error) {
            console.error('Process file error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
        }
    }
    
    // ===== GENRE SELECTION =====
    selectGenre(e) {
        try {
            const btn = e.target;
            const genre = btn.dataset.genre;
            
            if (!genre) return;
            
            this.genreBtns.forEach(b => {
                b.classList.remove('active-sfw', 'active-nsfw');
            });
            
            if (genre === 'SFW') {
                btn.classList.add('active-sfw');
            } else if (genre === 'NSFW') {
                btn.classList.add('active-nsfw');
            }
            
            this.selectedGenre = genre;
            this.genreInput.value = genre;
            this.checkForm();
            
        } catch (error) {
            console.error('Genre error:', error);
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
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Cooldown error:', error);
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
                this.showStatus(`❌ ${result.error || 'Gagal mengirim request!'}`, 'error');
                this.requestStatusEl.textContent = '❌ Gagal';
            }
        } catch (error) {
            console.error('Submit error:', error);
            this.showStatus(`❌ Error: ${error.message}`, 'error');
            this.requestStatusEl.textContent = '❌ Error';
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
            
            const url = `${this.apiUrl}/api/send-request`;
            console.log('📤 Sending to:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Send error:', error);
            return { success: false, error: error.message };
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
            console.error('Clear all error:', error);
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
        console.log('🚀 Starting app...');
        const app = new RequestPromptApp();
        window.requestApp = app;
        console.log('✅ App initialized!');
    } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        alert('Terjadi error: ' + error.message);
    }
});
