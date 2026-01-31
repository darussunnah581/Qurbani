// --- کنفگریشن اور ڈیٹا بیس ---
const DB_URL = "https://darusunnah581-default-rtdb.firebaseio.com/";

let DB;
try {
    DB = {
        animals: JSON.parse(localStorage.getItem('q_animals')) || [],
        bookings: JSON.parse(localStorage.getItem('q_bookings')) || []
    };
} catch (e) {
    DB = { animals: [], bookings: [] };
}

// --- ڈیٹا محفوظ کرنے اور آن لائن بھیجنے کا فنکشن ---
async function saveData() {
    localStorage.setItem('q_animals', JSON.stringify(DB.animals));
    localStorage.setItem('q_bookings', JSON.stringify(DB.bookings));
    
    // جانوروں کو آن لائن اپڈیٹ کریں تاکہ کسٹمر دیکھ سکیں
    try {
        await fetch(`${DB_URL}animals.json`, {
            method: 'PUT', // PUT پورے ڈیٹا کو اوور رائٹ کر دے گا
            body: JSON.stringify(DB.animals)
        });
    } catch (e) { console.error("آن لائن اپڈیٹ میں مسئلہ: ", e); }
    
    updateNotificationBadge();
}

// مینو پر نئی درخواستوں کا نشان (Badge) دکھانا
function updateNotificationBadge() {
    const pendingCount = DB.bookings.filter(b => b.status === 'pending').length;
    const badge = document.getElementById('pending-badge');
    if (badge) {
        if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

// --- آن لائن ڈیٹا سنک (Customer Bookings) ---
async function syncOnlineBookings() {
    const syncBtn = document.querySelector('.btn-sync-main');
    if(syncBtn) syncBtn.innerText = "چیک ہو رہا ہے...";

    try {
        const response = await fetch(`${DB_URL}bookings.json`);
        const onlineData = await response.json();
        
        if (onlineData) {
            let newFound = 0;
            Object.keys(onlineData).forEach(key => {
                const b = onlineData[key];
                if (!DB.bookings.find(x => x.id === b.id)) {
                    DB.bookings.push(b);
                    newFound++;
                }
            });

            if (newFound > 0) {
                saveData();
                alert(`${newFound} نئی آن لائن درخواستیں موصول ہو گئی ہیں!`);
                renderPending(document.getElementById('page-content'));
            } else {
                alert("کوئی نئی درخواست نہیں ملی۔");
            }
        } else {
            alert("فی الحال کوئی نئی بکنگ موجود نہیں ہے۔");
        }
    } catch (error) {
        alert("انٹرنیٹ کنکشن چیک کریں۔");
    } finally {
        if(syncBtn) syncBtn.innerText = "🔄 نئی آن لائن بکنگ چیک کریں";
    }
}

// --- لاگ ان اور اسٹارٹ ---
window.addEventListener('load', () => {
    updateNotificationBadge();
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if(splash) {
            splash.style.opacity = 0;
            setTimeout(() => {
                splash.style.display = 'none';
                document.getElementById('login-view').style.display = 'block';
            }, 500);
        }
    }, 2000);
});

function loginAdmin() {
    const u = document.getElementById('adminUser').value;
    const p = document.getElementById('adminPass').value;
    
    if(u === "D" && p === "1") {
        // لاگ ان اسکرین چھپائیں
        document.getElementById('login-view').style.display = 'none';
        
        // ڈیش بورڈ اور مینو کو زبردستی دکھائیں
        const dashboard = document.getElementById('dashboard-view');
        dashboard.style.display = 'block';
        
        const menuView = document.getElementById('menu-view');
        menuView.style.display = 'grid'; // یا block
        menuView.classList.remove('menu-mini');
        
        // ہیڈر اور فوٹر دکھائیں
        document.getElementById('app-header').classList.remove('hidden');
        document.getElementById('main-footer').classList.remove('hidden');
        
        // اگر کوئی پرانا مواد کھلا ہے تو اسے بند کریں
        document.getElementById('content-detail-view').style.display = 'none';
        
        // نوٹیفکیشن اپڈیٹ کریں
        if(typeof updateNotificationBadge === "function") updateNotificationBadge();
        
        console.log("Login Successful - Menu should be visible now");
    } else { 
        alert("غلط پاس ورڈ یا یوزر نیم"); 
    }
}


// --- نیویگیشن ---
function openPage(pageType, title, btnElement) {
    document.getElementById('content-detail-view').style.display = 'block';
    document.getElementById('back-btn').style.display = 'block';
    document.getElementById('page-title').textContent = title;
    
    const container = document.getElementById('page-content');
    container.innerHTML = ''; 

    if(pageType === 'pending') renderPending(container);
    else if(pageType === 'confirmed') renderConfirmed(container);
    else if(pageType === 'animals') renderAnimals(container);
    else if(pageType === 'finance') renderFinance(container);
    else if(pageType === 'payments') renderPayments(container);
    else if(pageType === 'history') renderHistory(container);
    else if(pageType === 'settings') renderSettings(container);
}

function goBack() {
    document.getElementById('content-detail-view').style.display = 'none';
    document.getElementById('back-btn').style.display = 'none';
    updateNotificationBadge();
}

// --- 1. زير التواء (Pending) ---
function renderPending(container) {
    container.innerHTML = `
        <button class="action-btn btn-sync-main" style="width:100%; background:#0288d1; margin-bottom:15px; padding:12px;" onclick="syncOnlineBookings()">
            🔄 نئی آن لائن بکنگ چیک کریں
        </button>
        <div id="pending-list"></div>
    `;

    const listDiv = document.getElementById('pending-list');
    const list = DB.bookings.filter(b => b.status === 'pending');

    if(list.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#777; padding:20px;">کوئی نئی درخواست نہیں ہے</p>';
        return;
    }

    list.forEach(b => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
            <div class="list-info">
                <h4>${b.name}</h4>
                <p>فون: ${b.phone} | حصے: ${b.shares}</p>
                <p style="color:var(--primary)">ایڈوانس رقم: ${b.advance || 0}</p>
            </div>
            <button class="action-btn btn-confirm" onclick="showApprovalForm(${b.id})">چیک کریں</button>
        `;
        listDiv.appendChild(div);
    });
}

// منظوری کا نیا خوبصورت صفحہ
function showApprovalForm(id) {
    const b = DB.bookings.find(x => x.id === id);
    const a = DB.animals.find(x => x.id == b.animalId);
    const container = document.getElementById('page-content');
    
    container.innerHTML = `
        <div class="card" style="border: 2px solid var(--primary); border-radius:15px;">
            <div style="background:var(--primary); color:white; padding:10px; border-radius:10px 10px 0 0; margin:-20px -20px 15px -20px; text-align:center;">
                <h3 style="margin:0;">درخواست کی جانچ پڑتال</h3>
            </div>
            
            <div style="line-height:1.8; font-size:1.1rem;">
                <p>👤 <b>نام کسٹمر:</b> ${b.name}</p>
                <p>📞 <b>فون نمبر:</b> ${b.phone}</p>
                <p>🐄 <b>منتخب جانور:</b> <span style="background:#fff3e0; padding:2px 10px; border-radius:5px; border:1px solid #ffb74d;">جانور نمبر ${a ? a.id : '?'}: ${a ? a.name : 'منتخب نہیں کیا'}</span></p>
                <p>🔢 <b>مطلوبہ حصے:</b> ${b.shares}</p>
                <p>💰 <b>کسٹمر کی بھیجی رقم:</b> <span style="color:green; font-weight:bold;">${b.advance || 0}</span></p>
            </div>
            
            <hr style="border:0; border-top:1px dashed #ccc; margin:15px 0;">

            <label>حصہ نمبر الاٹ کریں:</label>
            <input type="number" id="assignShareNo" value="${a ? a.booked + 1 : 1}" style="font-size:1.2rem; font-weight:bold; color:red;">
            
            <label>حتمی وصولی (ایڈوانس):</label>
            <input type="number" id="finalPaid" value="${b.advance || 0}" style="font-size:1.2rem; font-weight:bold; color:green;">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
                <button class="action-btn" style="background:var(--primary); padding:15px;" onclick="finaliseBooking(${b.id}, ${a ? a.id : 0})">✅ کنفرم کریں</button>
                <button class="action-btn" style="background:#777; padding:15px;" onclick="renderPending(document.getElementById('page-content'))">❌ پیچھے جائیں</button>
            </div>
        </div>
    `;
}


// اس فنکشن کو تلاش کریں اور پورے فنکشن کو اس سے بدل دیں
async function finaliseBooking(bId, aId) {
    const b = DB.bookings.find(x => x.id === bId);
    const a = DB.animals.find(x => x.id == aId);
    const shareNo = document.getElementById('assignShareNo').value;
    const paid = document.getElementById('finalPaid').value;

    if(!a) { alert("جانور دستیاب نہیں"); return; }

    // پہلے ڈیٹا اپڈیٹ کریں
    b.status = 'confirmed';
    b.shareNumber = parseInt(shareNo);
    b.paidAmount = parseInt(paid);
    b.totalBill = b.shares * a.price;
    a.booked += b.shares;

    // اب saveData کا انتظار کریں (await)
    await saveData(); 
    
    // اب الرٹ آئے گا جب ڈیٹا سیو ہو جائے گا
    alert("ماشاءاللہ! بکنگ کامیابی سے مکمل ہو گئی ہے۔");
    openPage('confirmed', 'کنفرم شدہ');
}

// --- 2. کنفرم شدہ (Confirmed) ---
function renderConfirmed(container) {
    const search = document.createElement("input");
    search.placeholder = "تلاش کریں...";
    search.className = "search-input";
    container.appendChild(search);

    const listDiv = document.createElement("div");
    container.appendChild(listDiv);

    function updateList(keyword = "") {
        listDiv.innerHTML = "";
        const list = DB.bookings.filter(b => b.status === 'confirmed' && (b.name.toLowerCase().includes(keyword.toLowerCase()) || b.phone.includes(keyword)));
        
        list.forEach(b => {
            const a = DB.animals.find(x => x.id == b.animalId) || {name: "نامعلوم"};
            const due = b.totalBill - b.paidAmount;
            const div = document.createElement('div');
            div.className = 'list-item';
            div.style.borderRight = `5px solid ${due > 0 ? '#FF9800' : '#4CAF50'}`;
            div.innerHTML = `
                <div class="list-info">
                    <h4>${b.name}</h4>
                    <p>${a.name} | حصہ نمبر: ${b.shareNumber}</p>
                    <p>کل بل: ${b.totalBill} | بقایا: <strong style="color:${due>0?'red':'green'}">${due}</strong></p>
                </div>
                <div style="display:flex; flex-direction:column; gap:5px;">
                    <button class="action-btn btn-confirm" onclick="addPayment(${b.id})">وصولی</button>
                    <button class="action-btn btn-whatsapp" onclick="genReceipt(${b.id})">رسید</button>
                </div>
            `;
            listDiv.appendChild(div);
        });
    }
    updateList();
    search.oninput = (e) => updateList(e.target.value);
}

function addPayment(id) {
    const b = DB.bookings.find(x => x.id === id);
    const amt = prompt(`رقم درج کریں (بقایا: ${b.totalBill - b.paidAmount}):`);
    if(amt) { b.paidAmount += parseInt(amt); saveData(); renderConfirmed(document.getElementById('page-content')); }
}

// --- 3. جانور (Animals) ---
function renderAnimals(container) {
    DB.animals.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const nextId = DB.animals.length > 0 ? Math.max(...DB.animals.map(a => parseInt(a.id))) + 1 : 1;
    
    container.innerHTML = `
        <div class="card" style="margin-bottom:20px; border-top:5px solid #2196F3;">
            <h3 id="form-title" style="text-align:center; color:#1E88E5;">✨ جانور شامل کریں</h3>
            <div id="animal-form" style="display:grid; gap:10px;">
                <input type="hidden" id="edit-mode" value="false">
                <input type="number" id="newAId" value="${nextId}" placeholder="جانور نمبر">
                <input type="text" id="newAName" placeholder="نام یا قسم (مثلاً: گائے نمبر 1)">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <input type="number" id="newATotal" value="7" placeholder="کل حصے">
                    <input type="number" id="newAPrice" placeholder="فی حصہ قیمت">
                </div>
                <input type="text" id="newATime" placeholder="ذبح کا وقت">
                <button id="submit-btn" class="action-btn" style="background:#2196F3; padding:12px;" onclick="saveAnimalData()">✅ محفوظ کریں</button>
            </div>
        </div>
        <div id="animals-list"></div>
    `;

    const listDiv = document.getElementById('animals-list');
    DB.animals.forEach(a => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <h4>جانور نمبر ${a.id}: ${a.name}</h4>
                <p>بکنگ: ${a.booked}/${a.totalShares} | قیمت: ${a.price}</p>
                <p>وقت: ${a.time || '-'}</p>
            </div>
            <div style="display:flex; flex-direction:column; gap:5px;">
                <button class="action-btn btn-confirm" style="background:#fbc02d; color:#000;" onclick="editAnimal(${a.id})">ترمیم</button>
                <button class="action-btn btn-delete" onclick="deleteAnimal(${a.id})">حذف</button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

function saveAnimalData() {
    const isEdit = document.getElementById('edit-mode').value === "true";
    const id = parseInt(document.getElementById('newAId').value);
    const name = document.getElementById('newAName').value;
    const total = parseInt(document.getElementById('newATotal').value);
    const price = parseInt(document.getElementById('newAPrice').value);
    const time = document.getElementById('newATime').value;

    if(!id || !name || !price) { alert("تمام معلومات لکھیں"); return; }

    if(isEdit) {
        const idx = DB.animals.findIndex(a => a.id === id);
        DB.animals[idx] = { ...DB.animals[idx], name, totalShares: total, price, time };
    } else {
        if(DB.animals.some(a => a.id === id)) { alert("یہ نمبر پہلے سے موجود ہے"); return; }
        DB.animals.push({ id, name, totalShares: total, price, time, booked: 0 });
    }
    saveData();
    renderAnimals(document.getElementById('page-content'));
}

function editAnimal(id) {
    const a = DB.animals.find(x => x.id === id);
    document.getElementById('newAId').value = a.id;
    document.getElementById('newAId').disabled = true;
    document.getElementById('newAName').value = a.name;
    document.getElementById('newATotal').value = a.totalShares;
    document.getElementById('newAPrice').value = a.price;
    document.getElementById('newATime').value = a.time;
    document.getElementById('edit-mode').value = "true";
    document.getElementById('submit-btn').innerText = "💾 تبدیلیاں محفوظ کریں";
    document.getElementById('submit-btn').style.background = "#4CAF50";
}

function deleteAnimal(id) {
    const a = DB.animals.find(x => x.id === id);
    if(a.booked > 0) { alert("اس جانور میں بکنگ موجود ہے، اس لیے یہ حذف نہیں ہو سکتا"); return; }
    if(confirm("کیا آپ واقعی اسے حذف کرنا چاہتے ہیں؟")) {
        DB.animals = DB.animals.filter(x => x.id !== id);
        saveData();
        renderAnimals(document.getElementById('page-content'));
    }
}

// --- 4. مالیات (Finance) ---
function renderFinance(container) {
    let totalRev = 0, received = 0;
    DB.bookings.forEach(b => { 
        if(b.status === 'confirmed'){ 
            received += b.paidAmount; 
            totalRev += b.totalBill; 
        } 
    });
    container.innerHTML = `
        <div class="card" style="text-align:center;">
            <h2>مالیاتی رپورٹ</h2>
            <div style="font-size:1.2rem; margin:20px 0;">
                <p>کل متوقع رقم: <strong>${totalRev}</strong></p>
                <p style="color:green;">کل وصول شدہ رقم: <strong>${received}</strong></p>
                <hr>
                <h3 style="color:red;">بقایا رقم: ${totalRev - received}</h3>
            </div>
        </div>
    `;
}

// --- 5. بقایا رقم (Payments) ---
function renderPayments(container) {
    const list = DB.bookings.filter(b => b.status === 'confirmed' && (b.totalBill > b.paidAmount));
    if(list.length === 0) { 
        container.innerHTML = '<p style="text-align:center; padding:20px;">کوئی بقایا رقم نہیں ہے</p>'; 
        return; 
    }
    list.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-info">
                <h4>${b.name}</h4>
                <p>فون: ${b.phone}</p>
            </div>
            <div style="color:red; font-weight:bold; font-size:1.2rem;">
                ${b.totalBill - b.paidAmount} Rs
            </div>
        `;
        container.appendChild(div);
    });
}

// --- 6. منسوخ شدہ (History) ---
function renderHistory(container) {
    const list = DB.bookings.filter(b => b.status === 'cancelled');
    if(list.length === 0) { container.innerHTML = '<p style="text-align:center;">کوئی منسوخ شدہ بکنگ نہیں ہے</p>'; return; }
    list.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.opacity = '0.6';
        div.innerHTML = `
            <div class="list-info">
                <h4>${b.name}</h4>
                <p>${b.phone}</p>
            </div>
            <span class="tag" style="background:#777;">Cancelled</span>
        `;
        container.appendChild(div);
    });
}

function cancelReq(id) {
    if(confirm("کیا آپ واقعی اسے منسوخ کرنا چاہتے ہیں؟")) {
        const b = DB.bookings.find(x => x.id === id);
        if(b.status === 'confirmed') {
            const a = DB.animals.find(x => x.id == b.animalId);
            if(a) a.booked -= b.shares;
        }
        b.status = 'cancelled';
        saveData();
        goBack();
    }
}

// --- 7. سیٹنگز / بیک اپ (Settings) ---
function renderSettings(container) {
    container.innerHTML = `
        <div class="card" style="text-align:center;">
            <h3>ڈیٹا بیک اپ و ریسٹور</h3>
            <button class="action-btn" style="background:#00695c; width:100%; padding:12px; margin-bottom:10px;" onclick="downloadBackup()">📥 فائل ڈاؤنلوڈ کریں</button>
            <button class="action-btn" style="background:#0288d1; width:100%; padding:12px; margin-bottom:20px;" onclick="copyBackupToClipboard()">📋 ڈیٹا کوڈ کاپی کریں</button>
            <hr>
            <p style="font-size:0.8rem; color:#666;">ڈیٹا بحال کرنے کے لیے کوڈ نیچے پیسٹ کریں:</p>
            <textarea id="manualRestore" style="width:100%; height:60px; margin-bottom:10px;"></textarea>
            <button class="action-btn" style="background:#d32f2f; width:100%; padding:12px;" onclick="manualRestoreData()">📤 ڈیٹا بحال کریں</button>
        </div>
    `;
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `Madrasa_Backup_${new Date().toLocaleDateString()}.json`);
    dlAnchor.click();
}

function copyBackupToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(DB)).then(() => alert("بیک اپ کوڈ کاپی ہو گیا ہے!"));
}

function manualRestoreData() {
    try {
        const val = document.getElementById('manualRestore').value;
        const data = JSON.parse(val);
        if(data.animals && data.bookings) {
            DB = data;
            saveData();
            alert("ڈیٹا کامیابی سے بحال ہو گیا!");
            location.reload();
        } else { alert("غلط ڈیٹا فارمیٹ"); }
    } catch(e) { alert("کوڈ درست نہیں ہے"); }
}

// --- رسید کا فنکشن (Receipt) ---
function genReceipt(id) {
    const b = DB.bookings.find(x => x.id === id);
    const a = DB.animals.find(x => x.id == b.animalId) || {};
    
    // رسید کے ایریا میں ڈیٹا بھرنا
    document.getElementById('rec-name').textContent = b.name;
    document.getElementById('rec-phone').textContent = b.phone;
    document.getElementById('rec-animal').textContent = a.name || '-';
    document.getElementById('rec-share-no').textContent = b.shareNumber || '-';
    document.getElementById('rec-time').textContent = a.time || '-';
    document.getElementById('rec-total').textContent = b.totalBill;
    document.getElementById('rec-paid').textContent = b.paidAmount;
    document.getElementById('rec-due').textContent = b.totalBill - b.paidAmount;

    const el = document.getElementById('receipt-print-area');
    el.style.display = 'block';

    // تصویر بنانا (html2canvas لائبریری کا استعمال)
    html2canvas(el).then(canvas => {
        el.style.display = 'none';
        const link = document.createElement('a');
        link.download = `Receipt_${b.name}.png`;
        link.href = canvas.toDataURL();
        link.click();
        
        let p = b.phone.replace(/\D/g,'');
        if(p.startsWith('0')) p = '92' + p.substring(1);
        
        if(confirm("رسید ڈاؤنلوڈ ہو گئی۔ واٹس ایپ پر بھیجیں؟")) {
            window.open(`https://wa.me/${p}?text=السلام علیکم، مدرسہ دارالسنہ کی جانب سے آپ کی قربانی حصہ کی رسید منسلک ہے۔`, '_blank');
        }
    }).catch(err => {
        alert("رسید بنانے میں مسئلہ آیا۔");
        el.style.display = 'none';
    });
}