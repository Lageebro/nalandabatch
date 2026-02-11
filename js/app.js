
const app = {
    currentParticipantId: null,
    isLoggedIn: false,

    init() {
        this.setupEventListeners();
        this.checkUrlForTicket();
        console.log("App Logic Initialized");
    },

    async checkUrlForTicket() {
        const urlParams = new URLSearchParams(window.location.search);
        const ticketId = urlParams.get('id');
        if (ticketId) {
            Swal.fire({
                title: 'Loading Ticket...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#1a1a1a',
                color: '#fff'
            });

            try {
                const doc = await db.collection('participants').doc(ticketId).get();
                if (doc.exists) {
                    const participant = doc.data();
                    document.getElementById('success-name').innerText = participant.name;
                    document.getElementById('ticket-id').innerText = `#BP2026-${ticketId.substring(0, 8).toUpperCase()}`;
                    this.showPage('ticket');
                    setTimeout(() => {
                        this.generateQR(participant, ticketId);
                        Swal.close();
                    }, 500);
                } else {
                    Swal.fire('Error', 'Ticket not found.', 'error');
                }
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Could not load ticket.', 'error');
            }
        }
    },

    setupEventListeners() {
        const slipInput = document.getElementById('slip-input');
        if (slipInput) {
            slipInput.addEventListener('change', (e) => {
                this.handleFilePreview(e);
            });
        }
    },

    showPage(pageId) {
        // Auth Check
        if (pageId === 'admin' && !this.isLoggedIn) {
            this.showPage('login');
            return;
        }

        document.getElementById('page-registration').classList.add('hidden');
        document.getElementById('page-ticket').classList.add('hidden');
        document.getElementById('page-login').classList.add('hidden');
        document.getElementById('page-admin').classList.add('hidden');
        document.getElementById('page-pending').classList.add('hidden');

        const target = document.getElementById(`page-${pageId}`);
        if (target) {
            target.classList.remove('hidden');
        }

        if (pageId === 'admin') {
            this.renderAdminList();
        }

        window.scrollTo(0, 0);
    },

    handleLogin(event) {
        event.preventDefault();
        const user = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        if (user === 'Rashen' && pass === 'Lagee') {
            this.isLoggedIn = true;
            this.showPage('admin');
            Swal.fire({
                title: 'Welcome Rashen!',
                text: 'Access Granted.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1a1a1a',
                color: '#fff'
            });
        } else {
            Swal.fire({
                title: 'Access Denied',
                text: 'Invalid username or password.',
                icon: 'error',
                confirmButtonColor: '#FF3D57',
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    },

    handleFilePreview(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('slip-preview');
            const container = document.getElementById('slip-preview-container');
            const placeholder = document.getElementById('upload-placeholder');

            preview.src = event.target.result;
            container.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    },

    async handleRegistration(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const name = formData.get('name');
        const batch = formData.get('batch');
        const contact = formData.get('contact');
        const address = formData.get('address');
        const slipFile = formData.get('slip');

        if (!name || !batch || !contact || !address || !slipFile.size) {
            Swal.fire({
                title: 'Missing Details',
                text: 'Please fill all fields and upload your payment slip.',
                icon: 'warning',
                confirmButtonColor: '#FF3D57'
            });
            return;
        }

        // Show loading
        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="animate-spin" data-lucide="loader-2"></i> PROCESSING...`;
        lucide.createIcons();

        try {
            // Convert file to Base64
            const slipBase64 = await this.fileToBase64(slipFile);

            const participant = {
                name,
                batch,
                contact,
                address,
                slip: slipBase64,
                status: 'pending',
                timestamp: new Date().toISOString()
            };

            const docRef = await db.collection('participants').add(participant);
            const id = docRef.id;

            // Show Pending Success Page instead of Ticket
            this.showPage('pending');

            Swal.fire({
                title: 'Done!',
                text: 'Your registration is pending verification.',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
                background: '#1a1a1a',
                color: '#fff'
            });

            event.target.reset();
            document.getElementById('slip-preview-container').classList.add('hidden');
            document.getElementById('upload-placeholder').classList.remove('hidden');

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'Error',
                text: 'Something went wrong while saving your data.',
                icon: 'error'
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>CONFIRM REGISTRATION</span><i data-lucide="arrow-right"></i>`;
            lucide.createIcons();
        }
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    generateQR(data, id) {
        const qrContainer = document.getElementById('ticket-qr');
        if (!qrContainer) return;
        qrContainer.innerHTML = '';

        if (typeof QRCode === 'undefined') {
            qrContainer.innerHTML = '<p class="text-xs text-red-500 font-bold">QR Library not loaded.</p>';
            return;
        }

        const qrString = JSON.stringify({
            id: id,
            name: data.name,
            batch: data.batch,
            status: data.status
        });

        new QRCode(qrContainer, {
            text: qrString,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    },

    downloadTicket() {
        // Simple client-side ticket "download" logic
        // In a real app, we might use html2canvas to save the whole card.
        // For now, let's just alert.
        const qrCanvas = document.querySelector('#ticket-qr canvas');
        if (!qrCanvas) return;

        const link = document.createElement('a');
        link.download = `BatchParty_Ticket_${this.currentParticipantId}.png`;
        link.href = qrCanvas.toDataURL();
        link.click();
    },

    async renderAdminList(searchTerm = '') {
        const listContainer = document.getElementById('admin-list');
        const noData = document.getElementById('no-data');
        const totalStat = document.getElementById('total-stat');
        const verifiedStat = document.getElementById('verified-stat');

        // Check if snapshot listener already exists
        if (this.adminUnsubscribe) this.adminUnsubscribe();

        this.adminUnsubscribe = db.collection('participants').orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                let participants = [];
                snapshot.forEach(doc => {
                    participants.push({ id: doc.id, ...doc.data() });
                });

                if (searchTerm) {
                    const lowerTerm = searchTerm.toLowerCase();
                    participants = participants.filter(p =>
                        p.name.toLowerCase().includes(lowerTerm) ||
                        p.batch.toLowerCase().includes(lowerTerm)
                    );
                }

                totalStat.innerText = participants.length;
                verifiedStat.innerText = participants.filter(p => p.status === 'verified').length;

                if (participants.length === 0) {
                    listContainer.innerHTML = '';
                    noData.classList.remove('hidden');
                    return;
                }

                noData.classList.add('hidden');
                listContainer.innerHTML = participants.map(p => `
                    <tr class="hover:bg-white/[0.02] transition-colors group">
                        <td class="p-5">
                            <span class="font-mono text-white/30 text-xs">#${p.id.substring(0, 5).toUpperCase()}</span>
                        </td>
                        <td class="p-5">
                            <div class="flex flex-col">
                                <span class="font-bold text-white text-sm">${p.name}</span>
                                <span class="text-white/40 text-[10px]">${p.contact}</span>
                            </div>
                        </td>
                        <td class="p-5">
                            <span class="text-xs font-semibold px-2 py-1 rounded bg-white/5 border border-white/10">${p.batch}</span>
                        </td>
                        <td class="p-5">
                            <div class="flex items-center gap-2">
                                <span class="w-1.5 h-1.5 rounded-full ${p.status === 'verified' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}"></span>
                                <span class="text-[10px] font-bold uppercase tracking-widest ${p.status === 'verified' ? 'text-emerald-500' : 'text-orange-500'}">
                                    ${p.status}
                                </span>
                            </div>
                        </td>
                        <td class="p-5">
                            <span class="text-[10px] text-white/30 uppercase">${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'N/A'}</span>
                        </td>
                        <td class="p-5">
                            <div class="flex justify-center gap-2">
                                <button onclick="app.viewSlip('${p.id}')" class="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all" title="View Slip">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button onclick="app.deleteParticipant('${p.id}')" class="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 transition-all" title="Delete">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');

                lucide.createIcons();
            }, (error) => {
                console.error("Firestore Subscribe Error:", error);
            });
    },

    async viewSlip(id) {
        const doc = await db.collection('participants').doc(id).get();
        if (!doc.exists) return;
        const participant = doc.data();

        const modal = document.getElementById('slip-modal');
        const img = document.getElementById('modal-slip-img');
        const name = document.getElementById('modal-slip-name');
        const batch = document.getElementById('modal-slip-batch');
        const verifyBtn = document.getElementById('verify-btn-modal');

        img.src = participant.slip;
        name.innerText = participant.name;
        batch.innerText = `Batch ${participant.batch} | Contact: ${participant.contact}`;

        if (participant.status === 'verified') {
            verifyBtn.classList.add('hidden');
        } else {
            verifyBtn.classList.remove('hidden');
            verifyBtn.onclick = () => this.verifyParticipant(id);
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lucide.createIcons();
    },

    closeSlipModal() {
        const modal = document.getElementById('slip-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    async verifyParticipant(id) {
        await db.collection('participants').doc(id).update({ status: 'verified' });

        const doc = await db.collection('participants').doc(id).get();
        const p = doc.data();

        this.closeSlipModal();

        Swal.fire({
            title: 'Verified!',
            text: 'Payment has been confirmed. Send the ticket to participant?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'Send via WhatsApp',
            cancelButtonText: 'Done',
            confirmButtonColor: '#25D366',
            background: '#1a1a1a',
            color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                this.sendToWhatsApp(p, id);
            }
        });
    },

    async sendToWhatsApp(p, id) {
        Swal.fire({
            title: 'Preparing Ticket Image...',
            text: 'Please wait while we generate the QR ticket.',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            background: '#1a1a1a',
            color: '#fff'
        });

        // Ensure we are on the ticket page and it's rendered
        this.showPage('ticket');
        document.getElementById('success-name').innerText = p.name;
        document.getElementById('ticket-id').innerText = `#BP2026-${id.substring(0, 8).toUpperCase()}`;
        this.generateQR(p, id);

        // Wait for QR to render
        await new Promise(r => setTimeout(r, 600));

        try {
            const ticketElement = document.querySelector('#page-ticket .bg-white');
            const canvas = await html2canvas(ticketElement, {
                scale: 2, // High quality
                backgroundColor: '#ffffff',
                logging: false
            });

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const file = new File([blob], `Ticket_${p.name}.png`, { type: 'image/png' });

            const baseUrl = window.location.origin + window.location.pathname;
            const ticketUrl = `${baseUrl}?id=${id}`;
            const message = `*Hi ${p.name}!* 🎉\nYour payment for *Batch Party 2026* is VERIFIED. Please show the attached QR at entry.\n\n🔗 Online Link: ${ticketUrl}`;

            // Clean phone number (convert 07... to 947...)
            let cleanPhone = p.contact.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '94' + cleanPhone.substring(1);
            }

            // 1. Try Mobile/System Share API (Best for Mobile)
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Batch Party Ticket',
                    text: message
                });
                this.showPage('admin'); // Return to dashboard
                Swal.close();
            }
            // 2. Try Clipboard Copy (Best for PC)
            else {
                try {
                    const data = [new ClipboardItem({ 'image/png': blob })];
                    await navigator.clipboard.write(data);

                    Swal.fire({
                        title: 'Image Copied!',
                        text: 'Ticket image copied to clipboard. Now opening WhatsApp, just PASTE (Ctrl+V) and send.',
                        icon: 'success',
                        confirmButtonText: 'Open WhatsApp',
                        background: '#1a1a1a',
                        color: '#fff'
                    }).then(() => {
                        const encodedMsg = encodeURIComponent(message);
                        window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank');
                        this.showPage('admin'); // Return to dashboard
                    });
                } catch (err) {
                    console.error("Clipboard Error:", err);
                    Swal.fire('Error', 'Could not copy image automatically. Please download and send manually.', 'error');
                    this.showPage('admin');
                }
            }
        } catch (e) {
            console.error("Sharing Error:", e);
            Swal.fire('Error', 'Could not generate ticket image.', 'error');
            this.showPage('admin');
        }
    },

    async deleteParticipant(id) {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This removal cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#374151',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            await db.collection('participants').doc(id).delete();
            Swal.fire('Deleted!', 'Entry removed from database.', 'success');
        }
    },

    async clearAllData() {
        const result = await Swal.fire({
            title: 'Reset Everything?',
            text: "All participant records will be purged.",
            icon: 'error',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Yes, CLEAR ALL'
        });

        if (result.isConfirmed) {
            const snapshot = await db.collection('participants').get();
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            Swal.fire('Cleared!', 'Database is now empty.', 'success');
        }
    },

    async exportData() {
        const snapshot = await db.collection('participants').get();
        const data = [];
        snapshot.forEach(doc => {
            data.push({ id: doc.id, ...doc.data() });
        });
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BatchParty_Backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }
};

// Start the app
window.addEventListener('DOMContentLoaded', () => app.init());
