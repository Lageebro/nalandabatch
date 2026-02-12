
const app = {
    currentParticipantId: null,
    isLoggedIn: false,
    html5QrCode: null,
    isScanning: false,

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

                    if (participant.status !== 'verified') {
                        Swal.fire({
                            title: 'Status: Pending',
                            text: 'Your registration is still being processed. Please check back after verification.',
                            icon: 'info',
                            confirmButtonColor: '#FF3D57',
                            background: '#1a1a1a',
                            color: '#fff'
                        }).then(() => {
                            this.showPage('registration');
                        });
                        return;
                    }

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
        const scannedStat = document.getElementById('scanned-stat');

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
                if (scannedStat) scannedStat.innerText = participants.filter(p => p.scanned).length;

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
                            ${p.scanned ? `
                                <div class="mt-1 flex items-center gap-1">
                                    <i data-lucide="check-check" class="w-3 h-3 text-emerald-400"></i>
                                    <span class="text-[8px] font-black text-emerald-500/80 uppercase">Entered</span>
                                </div>
                            ` : ''}
                        </td>
                        <td class="p-5">
                            <span class="text-[10px] text-white/30 uppercase">${p.timestamp ? new Date(p.timestamp).toLocaleDateString() : 'N/A'}</span>
                        </td>
                        <td class="p-5">
                            <div class="flex justify-center gap-2">
                                <button onclick="app.viewSlip('${p.id}')" class="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all" title="View Slip">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </button>
                                <button onclick="app.viewTicket('${p.id}')" class="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500/60 hover:text-emerald-500 transition-all" title="View Ticket/QR">
                                    <i data-lucide="ticket" class="w-4 h-4"></i>
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

    async viewTicket(id) {
        const doc = await db.collection('participants').doc(id).get();
        if (!doc.exists) return;
        const p = doc.data();

        const modal = document.getElementById('ticket-view-modal');
        document.getElementById('modal-success-name').innerText = p.name;
        document.getElementById('modal-ticket-id').innerText = `#BP2026-${id.substring(0, 8).toUpperCase()}`;

        // Generate QR in modal
        const qrContainer = document.getElementById('modal-ticket-qr');
        qrContainer.innerHTML = '';
        new QRCode(qrContainer, {
            text: JSON.stringify({ id, name: p.name, batch: p.batch, status: p.status }),
            width: 180, height: 180,
            colorDark: "#000000", colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        lucide.createIcons();

        this.currentActiveParticipant = { id, ...p };
    },

    closeTicketModal() {
        const modal = document.getElementById('ticket-view-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    async copyTicketFromModal() {
        const ticketElement = document.getElementById('modal-ticket-container');
        try {
            const canvas = await html2canvas(ticketElement, { scale: 2, backgroundColor: '#ffffff' });
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const data = [new ClipboardItem({ 'image/png': blob })];
            await navigator.clipboard.write(data);
            Swal.fire({ title: 'Copied!', text: 'Ticket image copied to clipboard.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Could not copy image.', 'error');
        }
    },

    async downloadTicketFromModal() {
        const ticketElement = document.getElementById('modal-ticket-container');
        const canvas = await html2canvas(ticketElement, { scale: 2, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `Ticket_${this.currentActiveParticipant.name}.png`;
        link.href = canvas.toDataURL();
        link.click();
    },

    closeSlipModal() {
        const modal = document.getElementById('slip-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },

    async verifyParticipant(id) {
        Swal.fire({
            title: 'Verifying...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            background: '#1a1a1a',
            color: '#fff'
        });

        try {
            await db.collection('participants').doc(id).update({ status: 'verified' });

            const doc = await db.collection('participants').doc(id).get();
            const p = doc.data();

            this.closeSlipModal();

            // 1. Silent Ticket Generation (Populate hidden modal)
            document.getElementById('modal-success-name').innerText = p.name;
            document.getElementById('modal-ticket-id').innerText = `#BP2026-${id.substring(0, 8).toUpperCase()}`;
            const qrContainer = document.getElementById('modal-ticket-qr');
            qrContainer.innerHTML = '';
            new QRCode(qrContainer, {
                text: JSON.stringify({ id, name: p.name, batch: p.batch, status: p.status }),
                width: 180, height: 180,
                colorDark: "#000000", colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Give QR time to render
            await new Promise(r => setTimeout(r, 600));

            // 2. Copy Image to Clipboard
            try {
                const ticketElement = document.getElementById('modal-ticket-container');
                const canvas = await html2canvas(ticketElement, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    logging: false
                });
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const data = [new ClipboardItem({ 'image/png': blob })];
                await navigator.clipboard.write(data);
            } catch (clipboardErr) {
                console.warn("Auto-copy to clipboard failed:", clipboardErr);
            }

            // 3. Open WhatsApp
            const message = `*Hi ${p.name}!* 🎉\nYour payment for *Batch Party 2026* is VERIFIED.`;
            let cleanPhone = p.contact.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '94' + cleanPhone.substring(1);
            }

            const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

            Swal.close();
            window.open(waLink, '_blank');

        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Failed to verify participant.', 'error');
        }
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

            const message = `*Hi ${p.name}!* 🎉\nYour payment for *Batch Party 2026* is VERIFIED. Please show the attached QR at entry.`;

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
    },

    // --- QR SCANNER LOGIC ---

    async openScanner() {
        const modal = document.getElementById('scanner-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        if (!this.html5QrCode) {
            this.html5QrCode = new Html5Qrcode("qr-reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await this.html5QrCode.start(
                { facingMode: "environment" },
                config,
                this.onScanSuccess.bind(this)
            );
            this.isScanning = true;
        } catch (err) {
            console.error("Error starting scanner:", err);
            Swal.fire('Camera Error', 'Could not access camera. Please ensure permissions are granted.', 'error');
            this.closeScanner();
        }
    },

    async closeScanner() {
        const modal = document.getElementById('scanner-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');

        if (this.html5QrCode && this.isScanning) {
            try {
                await this.html5QrCode.stop();
                this.isScanning = false;
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
        }
    },

    async onScanSuccess(decodedText) {
        // Pause scanner to prevent multiple scans
        if (this.isScanning) {
            await this.closeScanner();
        }

        try {
            const data = JSON.parse(decodedText);
            const ticketId = data.id;

            if (!ticketId) throw new Error("Invalid QR Code");

            Swal.fire({
                title: 'Verifying Ticket...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                background: '#1a1a1a',
                color: '#fff'
            });

            const doc = await db.collection('participants').doc(ticketId).get();

            if (!doc.exists) {
                Swal.fire({
                    title: 'INVALID TICKET',
                    text: 'This ticket does not exist in our records.',
                    icon: 'error',
                    confirmButtonColor: '#FF3D57',
                    background: '#1a1a1a',
                    color: '#fff'
                });
                return;
            }

            const participant = doc.data();

            // 1. Check if verified
            if (participant.status !== 'verified') {
                Swal.fire({
                    title: 'ACCESS DENIED',
                    html: `
                        <div class="text-center">
                            <p class="text-orange-500 font-bold mb-2">NOT VERIFIED</p>
                            <p class="text-sm text-white/60">${participant.name} has not verified their payment yet.</p>
                        </div>
                    `,
                    icon: 'warning',
                    confirmButtonColor: '#FF3D57',
                    background: '#1a1a1a',
                    color: '#fff'
                });
                return;
            }

            // 2. Check if already scanned (One-time use)
            if (participant.scanned) {
                const scanTime = new Date(participant.scannedAt).toLocaleTimeString();
                Swal.fire({
                    title: 'DECLINED',
                    html: `
                        <div class="text-center">
                            <p class="text-red-500 font-bold mb-2">ALREADY SCANNED</p>
                            <p class="text-sm text-white/60">This ticket was already used for entry at <b>${scanTime}</b>.</p>
                            <p class="text-xs text-white/40 mt-4">Guest: ${participant.name}</p>
                        </div>
                    `,
                    icon: 'error',
                    confirmButtonColor: '#FF3D57',
                    background: '#1a1a1a',
                    color: '#fff'
                });
                return;
            }

            // 3. Approve Entry & Mark as Scanned
            await db.collection('participants').doc(ticketId).update({
                scanned: true,
                scannedAt: new Date().toISOString()
            });

            Swal.fire({
                title: 'APPROVED',
                html: `
                    <div class="text-center animate-in">
                        <div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="check" class="text-emerald-500 w-10 h-10"></i>
                        </div>
                        <h3 class="text-2xl font-black text-white mb-1">WELCOME!</h3>
                        <p class="text-emerald-500 font-bold text-sm uppercase tracking-widest mb-4">Valid Entry Marked</p>
                        <div class="p-4 bg-white/5 rounded-2xl border border-white/5 text-left">
                            <p class="text-[10px] text-white/40 uppercase font-black mb-1">Guest Name</p>
                            <p class="text-lg font-bold text-white mb-3">${participant.name}</p>
                            <p class="text-[10px] text-white/40 uppercase font-black mb-1">Batch</p>
                            <p class="text-sm font-bold text-white/80">${participant.batch}</p>
                        </div>
                    </div>
                `,
                icon: 'success',
                confirmButtonText: 'CONTINUE SCANNING',
                confirmButtonColor: '#10b981',
                background: '#1a1a1a',
                color: '#fff'
            }).then(() => {
                this.openScanner();
            });

            lucide.createIcons();

        } catch (err) {
            console.error(err);
            Swal.fire('Error', 'Could not process QR code data.', 'error');
        }
    }
};

// Start the app
window.addEventListener('DOMContentLoaded', () => app.init());
