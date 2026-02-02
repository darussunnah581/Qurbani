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
    
    // جانوروں کو آن لائن اپڈیٹ کریں
    try {
        await fetch(`${DB_URL}animals.json`, {
            method: 'PUT',
            body: JSON.stringify(DB.animals)
        });
    } catch (e) { console.error("آن لائن اپڈیٹ میں مسئلہ: ", e); }
    
    updateNotificationBadge();
}

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

// --- خودکار آن لائن ڈیٹا سنک (Auto Sync) ---
// یہ فنکشن بیک گراؤنڈ میں چلے گا
async function autoSync() {
    try {
        const response = await fetch(`${DB_URL}bookings.json`);
        const onlineData = await response.json();
        
        if (onlineData) {
            let newFound = false;
            Object.keys(onlineData).forEach(key => {
                const b = onlineData[key];
                if (!DB.bookings.find(x => x.id === b.id)) {
                    DB.bookings.push(b);
                    newFound = true;
                }
            });

            if (newFound) {
                saveData();
                // اگر پینڈنگ پیج کھلا ہے تو اسے فوراً ریفریش کریں
                if(document.getElementById('page-title').textContent === 'زير التواء') {
                    renderPending(document.getElementById('page-content'));
                }
                // نوٹیفکیشن ساؤنڈ بھی بجا سکتے ہیں (Optional)
            }
            updateNotificationBadge();
        }
    } catch (error) {
        console.log("Sync skipped due to network");
    }
}

// ہر 5 سیکنڈ بعد خودکار چیک کریں
setInterval(autoSync, 5000);


// --- لاگ ان اور اسٹارٹ ---
window.addEventListener('load', () => {
    updateNotificationBadge();
    
    // موبائل بیک بٹن ہینڈلنگ
    window.history.pushState({page: 'home'}, "Home", ""); 
    window.addEventListener('popstate', function(event) {
        if(document.getElementById('content-detail-view').style.display === 'block') {
            goBack();
            // ہسٹری میں دوبارہ ہوم سٹیٹ ڈالیں تاکہ اگلی بار پھر بیک دبانے سے بند نہ ہو
            window.history.pushState({page: 'home'}, "Home", ""); 
        }
    });

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
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        document.getElementById('app-header').classList.remove('hidden');
        document.getElementById('main-footer').classList.remove('hidden');
        updateNotificationBadge();
        
        // مینو کو زبردستی دکھانے کے لیے
        document.getElementById('menu-view').style.display = 'grid';
    } else { alert("غلط پاس ورڈ"); }
}

// --- نیویگیشن ---
function openPage(pageType, title, btnElement) {
    // براؤزر ہسٹری میں اسٹیٹ ڈالیں تاکہ بیک بٹن کام کرے
    window.history.pushState({page: pageType}, title, "#" + pageType);

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

// --- 1. زير التواء (Pending) - Updated with Manual Add ---
function renderPending(container) {
    container.innerHTML = `
        <div style="display:flex; gap:10px; margin-bottom:15px;">
            <button class="action-btn btn-sync-main" style="background:#0288d1; flex:1; padding:12px;" onclick="syncOnlineBookings()">
                🔄 آن لائن چیک کریں
            </button>
            <button class="action-btn" style="background:#00695c; flex:1; padding:12px;" onclick="showManualBookingForm()">
                ➕ خود ایڈ کریں
            </button>
        </div>
        <div id="pending-list"></div>
    `;

    const listDiv = document.getElementById('pending-list');
    // لسٹ کو الٹا دکھائیں تاکہ نئی ریکویسٹ اوپر آئے
    const list = DB.bookings.filter(b => b.status === 'pending').sort((a,b) => b.id - a.id);

    if(list.length === 0) {
        listDiv.innerHTML = '<p style="text-align:center; color:#777; padding:20px;">کوئی پینڈنگ درخواست نہیں ہے</p>';
        return;
    }

    list.forEach(b => {
        const div = document.createElement("div");
        div.className = "list-item";
        div.innerHTML = `
            <div class="list-info">
                <h4>${b.name}</h4>
                <p>فون: ${b.phone} | حصے: ${b.shares}</p>
                <p style="color:var(--primary)">ایڈوانس: ${b.advance || 0}</p>
            </div>
            <button class="action-btn btn-confirm" onclick="showApprovalForm(${b.id})">چیک کریں</button>
        `;
        listDiv.appendChild(div);
    });
}


function showApprovalForm(id) {
    const b = DB.bookings.find(x => x.id === id);
    // اگر جانور منتخب نہیں کیا تو پہلا جانور ڈیفالٹ لیں
    let a = DB.animals.find(x => x.id == b.animalId);
    if(!a && DB.animals.length > 0) a = DB.animals[0];

    const container = document.getElementById('page-content');
    
    // متعدد حصوں کے لیے تجویز (1, 2)
    let suggestedShare = "";
    if(a) {
        if(b.shares === 1) suggestedShare = (a.booked + 1).toString();
        else {
            let start = a.booked + 1;
            let end = a.booked + b.shares;
            suggestedShare = `${start} سے ${end}`;
        }
    }

    container.innerHTML = `
        <div class="card" style="border: 2px solid var(--primary); border-radius:15px;">
            <div style="background:var(--primary); color:white; padding:10px; border-radius:10px 10px 0 0; margin:-20px -20px 15px -20px; text-align:center;">
                <h3 style="margin:0;">درخواست کی جانچ پڑتال</h3>
            </div>
            
            <div style="line-height:1.8; font-size:1.1rem;">
                <p>👤 <b>نام:</b> ${b.name}</p>
                <p>🐄 <b>جانور:</b> ${a ? a.name : 'منتخب نہیں'}</p>
                <p>🔢 <b>حصے:</b> ${b.shares}</p>
                <p>💰 <b>ایڈوانس:</b> <span style="color:green; font-weight:bold;">${b.advance || 0}</span></p>
            </div>
            
            <hr style="border:0; border-top:1px dashed #ccc; margin:15px 0;">

            <label>حصہ نمبر الاٹ کریں (Text):</label>
            <!-- یہاں ٹائپ ٹیکسٹ ہے تاکہ آپ "1, 2" لکھ سکیں -->
            <input type="text" id="assignShareNo" value="${suggestedShare}" style="font-size:1.2rem; font-weight:bold; color:red;">
            
            <label>حتمی وصولی (ایڈوانس):</label>
            <input type="number" id="finalPaid" value="${b.advance || 0}" style="font-size:1.2rem; font-weight:bold; color:green;">
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
                <button class="action-btn" style="background:var(--primary); padding:15px;" onclick="finaliseBooking(${b.id}, ${a ? a.id : 0})">✅ کنفرم</button>
                <button class="action-btn" style="background:#777; padding:15px;" onclick="renderPending(document.getElementById('page-content'))">❌ واپس</button>
            </div>
            <button class="action-btn" style="background:#d32f2f; width:100%; margin-top:10px;" onclick="cancelReq(${b.id})">درخواست منسوخ کریں (Delete)</button>
        </div>
    `;
}

async function finaliseBooking(bId, aId) {
    const b = DB.bookings.find(x => x.id === bId);
    const a = DB.animals.find(x => x.id == aId);
    const shareNo = document.getElementById('assignShareNo').value;
    const paid = document.getElementById('finalPaid').value;

    if(!a) { alert("براہ کرم جانور منتخب کریں۔"); return; }

    b.status = 'confirmed';
    b.animalId = a.id;
    b.shareNumber = shareNo; // اب یہ ٹیکسٹ (String) کے طور پر سیو ہوگا
    b.paidAmount = parseInt(paid);
    b.totalBill = b.shares * a.price;
    a.booked += b.shares; // جانور کی بکنگ میں اتنے حصے جمع کر دیں

    await saveData();
    
    // واپس پینڈنگ لسٹ پر جائیں تاکہ اگلی درخواست دیکھ سکیں
    alert("بکنگ کنفرم ہو گئی!");
    renderPending(document.getElementById('page-content'));
}

// --- 2. کنفرم شدہ (Confirmed List) - Updated ---
function renderConfirmed(container) {
    const search = document.createElement("input");
    search.placeholder = "نام، فون یا حصہ نمبر سے تلاش کریں...";
    search.className = "search-input";
    container.appendChild(search);

    const listDiv = document.createElement("div");
    container.appendChild(listDiv);

    function updateList(keyword = "") {
        listDiv.innerHTML = "";
        const list = DB.bookings.filter(b => 
            b.status === 'confirmed' && 
            (b.name.toLowerCase().includes(keyword.toLowerCase()) || 
             b.phone.includes(keyword) || 
             b.shareNumber.toString().includes(keyword))
        );
        
        if(list.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; padding:20px; color:#777;">کوئی ریکارڈ نہیں ملا</p>';
            return;
        }

        list.forEach(b => {
            const a = DB.animals.find(x => x.id == b.animalId) || {name: "نامعلوم"};
            const due = b.totalBill - b.paidAmount;
            
            const div = document.createElement('div');
            div.className = 'list-item';
            // بارڈر کا رنگ: اگر بقایا ہے تو لال، ورنہ ہرا
            div.style.borderRight = `5px solid ${due > 0 ? '#d32f2f' : '#4CAF50'}`;
            
            div.innerHTML = `
                <div class="list-info" onclick="showCustomerDetails(${b.id})" style="cursor:pointer;">
                    <h4 style="margin-bottom:5px;">${b.name}</h4>
                    <p style="font-size:0.9rem; color:#555;">
                        <span style="background:#e3f2fd; padding:2px 6px; border-radius:4px; color:#0277bd;">حصہ نمبر: ${b.shareNumber}</span>
                        | ${a.name}
                    </p>
                </div>
                <button class="action-btn" style="background:#00695c;" onclick="showCustomerDetails(${b.id})">
                    تفصیلات 👁️
                </button>
            `;
            listDiv.appendChild(div);
        });
    }
    updateList();
    search.oninput = (e) => updateList(e.target.value);
}
function addPayment(id, isDetailView = false) {
    const b = DB.bookings.find(x => x.id === id);
    const due = b.totalBill - b.paidAmount;
    
    if(due <= 0) {
        alert("اس کسٹمر کا کوئی بقایا نہیں ہے۔");
        return;
    }

    const amt = prompt(`رقم درج کریں (بقایا: ${due}):`);
    
    if(amt) {
        const parsedAmt = parseInt(amt);
        if(isNaN(parsedAmt)) return;

        b.paidAmount += parsedAmt;
        saveData();
        
        // اگر تفصیل والے صفحے سے آئے ہیں تو وہیں واپس جائیں
        if(isDetailView) {
            showCustomerDetails(id);
        } else {
            renderConfirmed(document.getElementById('page-content'));
        }
    }
}


// --- 3. جانور (Animals & Details) ---
function renderAnimals(container) {
    DB.animals.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const nextId = DB.animals.length > 0 ? Math.max(...DB.animals.map(a => parseInt(a.id))) + 1 : 1;
    
    // Add Form
    container.innerHTML = `
        <div class="card" style="margin-bottom:20px; border-top:5px solid #2196F3;">
            <h3 style="text-align:center; color:#1E88E5;">✨ جانور شامل کریں</h3>
            <div id="animal-form" style="display:grid; gap:10px;">
                <input type="hidden" id="edit-mode" value="false">
                <input type="number" id="newAId" value="${nextId}" placeholder="جانور نمبر">
                <input type="text" id="newAName" placeholder="نام (مثلاً: گائے نمبر 1)">
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
                <button class="action-btn" style="background:#673AB7;" onclick="viewAnimalDetails(${a.id})">👁️ تفصیل</button>
                <button class="action-btn btn-confirm" style="background:#fbc02d; color:#000;" onclick="editAnimal(${a.id})">ترمیم</button>
            </div>
        `;
        listDiv.appendChild(div);
    });
}

// جانور کی تفصیل (کون کون حصے دار ہے)
function viewAnimalDetails(aId) {
    const a = DB.animals.find(x => x.id === aId);
    // اس جانور کے تمام کنفرم بکنگ ڈھونڈیں
    const shares = DB.bookings.filter(b => b.status === 'confirmed' && b.animalId === aId);
    
    const container = document.getElementById('page-content');
    let html = `
        <button class="action-btn" style="margin-bottom:10px; background:#777;" onclick="renderAnimals(document.getElementById('page-content'))">← واپس لسٹ پر</button>
        <div class="card">
            <h3 style="color:var(--primary); text-align:center;">${a.name} کی تفصیل</h3>
            <p style="text-align:center;">کل حصے: ${a.totalShares} | بک شدہ: ${a.booked}</p>
            <hr>
            <table style="width:100%; text-align:right; border-collapse:collapse;">
                <tr style="background:#eee;">
                    <th style="padding:5px;">حصہ نمبر</th>
                    <th style="padding:5px;">نام</th>
                    <th style="padding:5px;">فون</th>
                </tr>
    `;
    
    if(shares.length === 0) {
        html += `<tr><td colspan="3" style="text-align:center; padding:10px;">ابھی کوئی بکنگ نہیں</td></tr>`;
    } else {
        shares.forEach(s => {
            html += `
                <tr style="border-bottom:1px solid #ddd;">
                    <td style="padding:8px;">${s.shareNumber}</td>
                    <td style="padding:8px;">${s.name}</td>
                    <td style="padding:8px;">${s.phone}</td>
                </tr>
            `;
        });
    }
    
    html += `</table></div>`;
    container.innerHTML = html;
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
        // اپڈیٹ کریں بکنگز میں بھی اگر قیمت بدلی ہو
        DB.bookings.forEach(b => {
            if(b.animalId === id && b.status === 'confirmed') {
                b.totalBill = b.shares * price;
            }
        });
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

// --- 4. مالیات (Finance - Detailed) ---
function renderFinance(container) {
    let totalRev = 0, received = 0;
    const confirmedList = DB.bookings.filter(b => b.status === 'confirmed');
    
    confirmedList.forEach(b => { 
        received += b.paidAmount; 
        totalRev += b.totalBill; 
    });

    let html = `
        <div class="card" style="text-align:center; margin-bottom:20px;">
            <h2>مالیاتی رپورٹ</h2>
            <div style="font-size:1.1rem; margin:10px 0;">
                <p>کل رقم: <strong>${totalRev}</strong></p>
                <p style="color:green;">وصول شدہ: <strong>${received}</strong></p>
                <hr>
                <h3 style="color:red;">کل بقایا: ${totalRev - received}</h3>
            </div>
        </div>
        
        <h4 style="margin-right:10px;">تفصیلات:</h4>
        <div style="background:white; border-radius:10px; overflow:hidden;">
            <table style="width:100%; text-align:right; border-collapse:collapse;">
                <tr style="background:#00695c; color:white;">
                    <th style="padding:10px;">نام</th>
                    <th style="padding:10px;">کل بل</th>
                    <th style="padding:10px;">وصول</th>
                    <th style="padding:10px;">بقایا</th>
                </tr>
    `;

    confirmedList.forEach(b => {
        const due = b.totalBill - b.paidAmount;
        html += `
            <tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${b.name} <br><small style="color:#888">${b.phone}</small></td>
                <td style="padding:10px;">${b.totalBill}</td>
                <td style="padding:10px; color:green;">${b.paidAmount}</td>
                <td style="padding:10px; color:${due > 0 ? 'red' : 'green'}; font-weight:bold;">${due}</td>
            </tr>
        `;
    });

    html += `</table></div>`;
    container.innerHTML = html;
}

// --- 5. بقایا رقم (Payments) ---
function renderPayments(container) {
    const list = DB.bookings.filter(b => b.status === 'confirmed' && (b.totalBill > b.paidAmount));
    if(list.length === 0) { container.innerHTML = '<p style="text-align:center; padding:20px;">کوئی بقایا رقم نہیں ہے</p>'; return; }
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
            <button class="action-btn btn-confirm" onclick="addPayment(${b.id})">وصولی</button>
        `;
        container.appendChild(div);
    });
}

// --- 6. منسوخ شدہ (History & Restore) ---
function renderHistory(container) {
    const list = DB.bookings.filter(b => b.status === 'cancelled');
    if(list.length === 0) { container.innerHTML = '<p style="text-align:center;">کوئی منسوخ شدہ بکنگ نہیں ہے</p>'; return; }
    
    list.forEach(b => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.style.opacity = '0.8';
        div.style.background = '#f5f5f5';
        div.innerHTML = `
            <div class="list-info">
                <h4 style="text-decoration:line-through;">${b.name}</h4>
                <p>${b.phone}</p>
            </div>
            <div>
                <span class="tag" style="background:#777;">منسوخ</span>
                <button class="action-btn" style="background:#4CAF50;" onclick="restoreReq(${b.id})">بحال کریں</button>
                <button class="action-btn btn-delete" onclick="deleteForever(${b.id})">ختم</button>
            </div>
        `;
        container.appendChild(div);
    });
}

function cancelReq(id) {
    if(confirm("کیا آپ واقعی اسے منسوخ کر کے ہسٹری میں ڈالنا چاہتے ہیں؟")) {
        const b = DB.bookings.find(x => x.id === id);
        if(b.status === 'confirmed') {
            const a = DB.animals.find(x => x.id == b.animalId);
            if(a) a.booked -= b.shares;
        }
        b.status = 'cancelled';
        saveData();
        
        // اگر پینڈنگ پیج پر ہیں تو وہیں رہیں، ورنہ واپس جائیں
        const title = document.getElementById('page-title').textContent;
        if(title === 'زير التواء') renderPending(document.getElementById('page-content'));
        else goBack();
    }
}

function restoreReq(id) {
    if(confirm("کیا آپ اس بکنگ کو دوبارہ 'زیر التواء' لسٹ میں بھیجنا چاہتے ہیں؟")) {
        const b = DB.bookings.find(x => x.id === id);
        b.status = 'pending';
        saveData();
        renderHistory(document.getElementById('page-content'));
    }
}

function deleteForever(id) {
    if(confirm("یہ ریکارڈ ہمیشہ کے لیے ختم ہو جائے گا۔ کیا آپ کو یقین ہے؟")) {
        DB.bookings = DB.bookings.filter(b => b.id !== id);
        saveData();
        renderHistory(document.getElementById('page-content'));
    }
}

// --- 7. سیٹنگز / بیک اپ ---
function renderSettings(container) {
    container.innerHTML = `
        <div class="card" style="text-align:center;">
            <h3>ڈیٹا بیک اپ و ریسٹور</h3>
            <button class="action-btn" style="background:#00695c; width:100%; padding:12px; margin-bottom:10px;" onclick="downloadBackup()">📥 فائل ڈاؤنلوڈ کریں</button>
            <button class="action-btn" style="background:#0288d1; width:100%; padding:12px; margin-bottom:20px;" onclick="copyBackupToClipboard()">📋 ڈیٹا کوڈ کاپی کریں</button>
            <hr>
            <textarea id="manualRestore" style="width:100%; height:60px; margin-bottom:10px;" placeholder="کوڈ یہاں پیسٹ کریں"></textarea>
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
            alert("ڈیٹا بحال ہو گیا!");
            location.reload();
        } else { alert("غلط ڈیٹا فارمیٹ"); }
    } catch(e) { alert("کوڈ درست نہیں ہے"); }
}

// --- رسید (Receipt) ---
function genReceipt(id) {
    const b = DB.bookings.find(x => x.id === id);
    const a = DB.animals.find(x => x.id == b.animalId) || {};
    
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
// --- کسٹمر کی مکمل تفصیلات (Detailed View) ---
function showCustomerDetails(id) {
    const b = DB.bookings.find(x => x.id === id);
    if(!b) return;

    const a = DB.animals.find(x => x.id == b.animalId) || {name: "نامعلوم", price: 0};
    const due = b.totalBill - b.paidAmount;

    const container = document.getElementById('page-content');
    
    // کسٹمر کارڈ کا ڈیزائن
    container.innerHTML = `
        <button class="action-btn" style="background:#777; margin-bottom:15px;" onclick="renderConfirmed(document.getElementById('page-content'))">
            ← واپس لسٹ پر
        </button>

        <div class="card" style="border-top: 5px solid var(--primary);">
            <div style="text-align:center; margin-bottom:15px;">
                <div style="font-size:3rem; margin-bottom:10px;">👤</div>
                <h2 style="color:var(--primary); margin:0;">${b.name}</h2>
                <p style="color:#666; margin:5px 0;">${b.phone}</p>
            </div>

            <div style="background:#f9f9f9; padding:15px; border-radius:10px; border:1px solid #eee;">
                <p><strong>🐄 جانور:</strong> ${a.name} (نمبر ${a.id || '?'})</p>
                <p><strong>🔢 حصہ نمبر:</strong> <span style="font-size:1.2rem; font-weight:bold;">${b.shareNumber}</span></p>
                <p><strong>🥩 حصوں کی تعداد:</strong> ${b.shares}</p>
                <hr>
                <div style="display:flex; justify-content:space-between;">
                    <span>کل بل:</span> <strong>${b.totalBill}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; color:green;">
                    <span>وصول شدہ:</span> <strong>${b.paidAmount}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; color:${due > 0 ? 'red' : 'green'}; font-weight:bold; font-size:1.1rem; margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;">
                    <span>بقایا:</span> <span>${due}</span>
                </div>
            </div>

            <h4 style="margin-top:20px; margin-bottom:10px; color:#555;">کارروائی کریں:</h4>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <button class="action-btn" style="background:#4CAF50; padding:12px;" onclick="addPayment(${b.id}, true)">
                    💰 وصولی ڈالیں
                </button>
                <button class="action-btn" style="background:#25D366; padding:12px;" onclick="genReceipt(${b.id})">
                    🧾 رسید بنائیں
                </button>
                <button class="action-btn" style="background:#FF9800; padding:12px;" onclick="editConfirmedBooking(${b.id})">
                    ✏️ ترمیم (Edit)
                </button>
                <button class="action-btn" style="background:#d32f2f; padding:12px;" onclick="cancelReq(${b.id})">
                    🗑️ منسوخ / ڈیلیٹ
                </button>
            </div>
        </div>
    `;
}

// --- کسٹمر ڈیٹا میں ترمیم (Edit) ---
function editConfirmedBooking(id) {
    const b = DB.bookings.find(x => x.id === id);
    
    // سادہ پرامپٹ کے ذریعے ایڈیٹنگ (آپ چاہیں تو اسے بھی خوبصورت فارم بنا سکتے ہیں)
    const newName = prompt("کسٹمر کا نام:", b.name);
    if(newName === null) return;

    const newPhone = prompt("فون نمبر:", b.phone);
    const newShareNo = prompt("حصہ نمبر (Share No):", b.shareNumber);

    if(newName && newPhone && newShareNo) {
        b.name = newName;
        b.phone = newPhone;
        b.shareNumber = newShareNo; // یہ ٹیکسٹ بھی ہو سکتا ہے جیسے "1,2"
        
        saveData();
        alert("تبدیلی محفوظ ہو گئی!");
        showCustomerDetails(id); // دوبارہ وہی صفحہ ریفریش کریں
    }
}
// --- دستی بکنگ (Manual Booking by Admin) ---
function showManualBookingForm() {
    const container = document.getElementById('page-content');
    
    // جانوروں کی لسٹ بنائیں
    let animalOptions = '<option value="">-- جانور منتخب کریں --</option>';
    DB.animals.forEach(a => {
        const remaining = a.totalShares - a.booked;
        if(remaining > 0) {
            animalOptions += `<option value="${a.id}">جانور نمبر ${a.id}: ${a.name} (باقی: ${remaining})</option>`;
        }
    });

    container.innerHTML = `
        <div class="card" style="border-top: 5px solid var(--primary);">
            <h3 style="text-align:center; color:var(--primary);">نئی بکنگ درج کریں</h3>
            
            <label>جانور منتخب کریں:</label>
            <select id="manAnimal" style="width:100%; padding:12px; margin-bottom:10px; border:1px solid #ccc; border-radius:8px;">
                ${animalOptions}
            </select>

            <label>کسٹمر کا نام:</label>
            <input type="text" id="manName" placeholder="نام لکھیں">

            <label>فون نمبر:</label>
            <input type="number" id="manPhone" placeholder="نمبر لکھیں">

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                <div>
                    <label>حصے:</label>
                    <input type="number" id="manShares" value="1" min="1">
                </div>
                <div>
                    <label>ایڈوانس رقم:</label>
                    <input type="number" id="manAdvance" value="0">
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:20px;">
                <button class="action-btn" style="background:var(--primary); padding:12px;" onclick="saveManualBooking()">✅ لسٹ میں ڈالیں</button>
                <button class="action-btn" style="background:#777; padding:12px;" onclick="renderPending(document.getElementById('page-content'))">❌ کینسل</button>
            </div>
        </div>
    `;
}

async function saveManualBooking() {
    const aId = document.getElementById('manAnimal').value;
    const name = document.getElementById('manName').value;
    const phone = document.getElementById('manPhone').value;
    const shares = document.getElementById('manShares').value;
    const advance = document.getElementById('manAdvance').value;

    if(!aId || !name || !phone || !shares) {
        alert("براہ کرم تمام خانے پُر کریں");
        return;
    }

    const newBooking = {
        id: Date.now(),
        name: name,
        phone: phone,
        shares: parseInt(shares),
        advance: parseInt(advance) || 0,
        animalId: parseInt(aId),
        status: 'pending', // یہ پہلے پینڈنگ میں جائے گا
        time: new Date().toLocaleString('ur-PK')
    };

    // لوکل لسٹ میں شامل کریں
    DB.bookings.push(newBooking);
    
    // فائر بیس پر بھی بھیجیں تاکہ ریکارڈ برابر رہے
    try {
        await fetch(`${DB_URL}bookings/${newBooking.id}.json`, {
            method: 'PUT',
            body: JSON.stringify(newBooking)
        });
    } catch(e) { console.error(e); }

    await saveData();
    
    alert("بکنگ 'زیر التواء' لسٹ میں شامل ہو گئی ہے۔ اب آپ اسے کنفرم کر سکتے ہیں۔");
    renderPending(document.getElementById('page-content'));
}
