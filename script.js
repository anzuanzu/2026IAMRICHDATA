// 業務目標數據 - 從 Firestore 動態載入
let salesTargets = {};

// 客戶數據存儲
let customers = [];
let customerIdCounter = 1;
let unsubscribe = null;
let salespersonUnsubscribe = null;

// Firebase 數據庫操作
const COLLECTION_NAME = 'customers_2026';
const SALESPERSON_COLLECTION = 'salespersons_config';

// 密碼設定
const CUSTOMER_PASSWORD = '73648219';
const ADMIN_PASSWORD = '88888888';
let isAuthenticated = false;
let isAdminAuthenticated = false;

// 預設理專數據（首次初始化用）
const DEFAULT_SALESPERSONS = {
    '璧菁': 3000,
    '麗鳳': 1000,
    '馨予': 1000,
    '淑芬': 1000,
    '靜芸': 1000,
    '品豪': 1000,
    '祺倫': 1000,
    '奕憲': 1000,
    '泓權': 1000,
    '至浩': 1000
};

// 客戶姓名隱碼函數
function maskCustomerName(name) {
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + 'O';
    if (name.length === 3) return name[0] + 'O' + name[2];
    return name[0] + 'O'.repeat(name.length - 2) + name[name.length - 1];
}

// 顯示提示訊息
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// =====================
// Firebase 初始化
// =====================
function initializeFirebase() {
    if (!window.db || !window.firestoreActions) {
        console.log('等待 Firebase 初始化...');
        setTimeout(initializeFirebase, 100);
        return;
    }

    console.log('Firebase 可用，開始設置監聽器');
    loadSalespersonsFromFirestore().then(() => {
        setupRealtimeListener();
    });
    console.log('Firebase 初始化完成');
}

// =====================
// 理專資料管理（Firestore）
// =====================

// 從 Firestore 載入理專資料
async function loadSalespersonsFromFirestore() {
    try {
        const { collection, getDocs } = window.firestoreActions;
        const querySnapshot = await getDocs(collection(window.db, SALESPERSON_COLLECTION));

        if (querySnapshot.empty) {
            console.log('Firestore 中沒有理專資料，使用預設值初始化...');
            await initializeDefaultSalespersons();
            return;
        }

        salesTargets = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            salesTargets[data.name] = data.target;
        });

        console.log('載入理專資料:', salesTargets);
        updateSalespersonDropdowns();
        updateAllDisplays();
    } catch (error) {
        console.error('載入理專資料時出錯:', error);
        // 如果載入失敗，使用預設值
        salesTargets = { ...DEFAULT_SALESPERSONS };
        updateSalespersonDropdowns();
        updateAllDisplays();
    }
}

// 初始化預設理專到 Firestore
async function initializeDefaultSalespersons() {
    try {
        const { doc, setDoc } = window.firestoreActions;

        for (const [name, target] of Object.entries(DEFAULT_SALESPERSONS)) {
            await setDoc(doc(window.db, SALESPERSON_COLLECTION, name), {
                name: name,
                target: target,
                createdAt: new Date().toISOString()
            });
        }

        salesTargets = { ...DEFAULT_SALESPERSONS };
        console.log('預設理專資料已初始化到 Firestore');
        updateSalespersonDropdowns();
        updateAllDisplays();
    } catch (error) {
        console.error('初始化預設理專資料時出錯:', error);
        salesTargets = { ...DEFAULT_SALESPERSONS };
        updateSalespersonDropdowns();
        updateAllDisplays();
    }
}

// 設置理專資料即時監聽
function setupSalespersonListener() {
    try {
        const { collection, onSnapshot } = window.firestoreActions;

        salespersonUnsubscribe = onSnapshot(collection(window.db, SALESPERSON_COLLECTION), (querySnapshot) => {
            salesTargets = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                salesTargets[data.name] = data.target;
            });

            console.log('理專資料即時更新:', salesTargets);
            updateSalespersonDropdowns();
            updateAllDisplays();

            // 如果管理面板開著，更新表格
            if (document.getElementById('adminPanelModal').style.display === 'block') {
                renderSalespersonTable();
            }
        });
    } catch (error) {
        console.error('設置理專監聽器時出錯:', error);
    }
}

// 更新所有理專下拉選單
function updateSalespersonDropdowns() {
    const salespersonNames = Object.keys(salesTargets);

    // 更新新增客戶表單的下拉選單
    const addSelect = document.getElementById('salesperson');
    const currentAddValue = addSelect.value;
    addSelect.innerHTML = '<option value="">請選擇業務</option>';
    salespersonNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        addSelect.appendChild(option);
    });
    if (currentAddValue && salespersonNames.includes(currentAddValue)) {
        addSelect.value = currentAddValue;
    }

    // 更新編輯客戶表單的下拉選單
    const editSelect = document.getElementById('editSalesperson');
    const currentEditValue = editSelect.value;
    editSelect.innerHTML = '';
    salespersonNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        editSelect.appendChild(option);
    });
    if (currentEditValue && salespersonNames.includes(currentEditValue)) {
        editSelect.value = currentEditValue;
    }

    // 更新篩選的下拉選單
    const filterSelect = document.getElementById('filterSalesperson');
    const currentFilterValue = filterSelect.value;
    filterSelect.innerHTML = '<option value="">所有業務</option>';
    salespersonNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        filterSelect.appendChild(option);
    });
    if (currentFilterValue && salespersonNames.includes(currentFilterValue)) {
        filterSelect.value = currentFilterValue;
    }
}

// =====================
// 管理員功能
// =====================

// 開啟管理員登入
function openAdminLogin() {
    if (isAdminAuthenticated) {
        openAdminPanel();
        return;
    }
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminPasswordError').style.display = 'none';
    document.getElementById('adminPasswordModal').style.display = 'block';
    document.getElementById('adminPassword').focus();
}

// 關閉管理員密碼框
function closeAdminPasswordModal() {
    document.getElementById('adminPasswordModal').style.display = 'none';
}

// 開啟管理面板
function openAdminPanel() {
    renderSalespersonTable();
    document.getElementById('adminPanelModal').style.display = 'block';
}

// 關閉管理面板
function closeAdminPanel() {
    document.getElementById('adminPanelModal').style.display = 'none';
}

// 渲染理專管理表格
function renderSalespersonTable() {
    const tbody = document.getElementById('salespersonTableBody');
    tbody.innerHTML = '';

    const salespersonNames = Object.keys(salesTargets);

    if (salespersonNames.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #7f8c8d; padding: 20px;">目前沒有理專資料</td></tr>';
        return;
    }

    salespersonNames.forEach(name => {
        const target = salesTargets[name];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${name}</strong></td>
            <td>${target.toLocaleString()} 萬</td>
            <td>
                <button class="admin-action-btn admin-edit-btn" onclick="startEditSalesperson('${name}', ${target})">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="admin-action-btn admin-delete-btn" onclick="deleteSalesperson('${name}')">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 開始編輯理專（切換為 inline edit 模式）
function startEditSalesperson(oldName, oldTarget) {
    const tbody = document.getElementById('salespersonTableBody');
    const rows = tbody.querySelectorAll('tr');

    rows.forEach(row => {
        const nameCell = row.querySelector('td:first-child strong');
        if (nameCell && nameCell.textContent === oldName) {
            row.innerHTML = `
                <td><input type="text" class="edit-input" id="editSpName" value="${oldName}"></td>
                <td><input type="number" class="edit-input" id="editSpTarget" value="${oldTarget}" min="1" step="1"></td>
                <td>
                    <button class="admin-action-btn admin-save-btn" onclick="saveSalespersonEdit('${oldName}')">
                        <i class="fas fa-check"></i> 儲存
                    </button>
                    <button class="admin-action-btn admin-cancel-btn" onclick="renderSalespersonTable()">
                        <i class="fas fa-times"></i> 取消
                    </button>
                </td>
            `;
            document.getElementById('editSpName').focus();
        }
    });
}

// 儲存理專編輯
async function saveSalespersonEdit(oldName) {
    const newName = document.getElementById('editSpName').value.trim();
    const newTarget = parseInt(document.getElementById('editSpTarget').value);

    if (!newName) {
        showToast('請輸入理專姓名', true);
        return;
    }
    if (!newTarget || newTarget < 1) {
        showToast('請輸入有效的目標金額', true);
        return;
    }

    // 檢查是否重名（排除自己）
    if (newName !== oldName && salesTargets[newName]) {
        showToast('已存在相同姓名的理專', true);
        return;
    }

    try {
        const { doc, setDoc, deleteDoc, updateDoc, collection, getDocs, query } = window.firestoreActions;

        if (newName === oldName) {
            // 只更新目標金額
            await setDoc(doc(window.db, SALESPERSON_COLLECTION, oldName), {
                name: oldName,
                target: newTarget,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            showToast(`已更新 ${oldName} 的目標金額為 ${newTarget.toLocaleString()} 萬`);
        } else {
            // 名稱變更：新增新的、刪除舊的、更新客戶資料
            await setDoc(doc(window.db, SALESPERSON_COLLECTION, newName), {
                name: newName,
                target: newTarget,
                createdAt: new Date().toISOString()
            });

            await deleteDoc(doc(window.db, SALESPERSON_COLLECTION, oldName));

            // 更新所有相關客戶的 salesperson 欄位
            const customersToUpdate = customers.filter(c => c.salesperson === oldName);
            for (const customer of customersToUpdate) {
                await updateDoc(doc(window.db, COLLECTION_NAME, customer.id), {
                    salesperson: newName,
                    updatedAt: new Date().toISOString()
                });
            }

            showToast(`已將 ${oldName} 更名為 ${newName}，目標 ${newTarget.toLocaleString()} 萬`);
        }

        // 重新載入理專資料
        await loadSalespersonsFromFirestore();
        renderSalespersonTable();

    } catch (error) {
        console.error('更新理專資料時出錯:', error);
        showToast('更新失敗，請重試', true);
    }
}

// 新增理專
async function addSalesperson(name, target) {
    if (salesTargets[name]) {
        showToast('已存在相同姓名的理專', true);
        return;
    }

    try {
        const { doc, setDoc } = window.firestoreActions;
        await setDoc(doc(window.db, SALESPERSON_COLLECTION, name), {
            name: name,
            target: target,
            createdAt: new Date().toISOString()
        });

        showToast(`已新增理專：${name}，目標 ${target.toLocaleString()} 萬`);
        await loadSalespersonsFromFirestore();
        renderSalespersonTable();
    } catch (error) {
        console.error('新增理專時出錯:', error);
        showToast('新增失敗，請重試', true);
    }
}

// 刪除理專
async function deleteSalesperson(name) {
    // 檢查是否有客戶歸屬此理專
    const relatedCustomers = customers.filter(c => c.salesperson === name);

    let confirmMsg = `確定要刪除理專「${name}」嗎？`;
    if (relatedCustomers.length > 0) {
        confirmMsg += `\n\n⚠️ 注意：目前有 ${relatedCustomers.length} 筆客戶資料歸屬於此理專。\n刪除後這些客戶資料仍會保留，但理專將不再顯示在追蹤列表中。`;
    }

    if (!confirm(confirmMsg)) return;
    if (!confirm('再次確認：刪除後無法復原，確定要繼續嗎？')) return;

    try {
        const { doc, deleteDoc } = window.firestoreActions;
        await deleteDoc(doc(window.db, SALESPERSON_COLLECTION, name));

        showToast(`已刪除理專：${name}`);
        await loadSalespersonsFromFirestore();
        renderSalespersonTable();
    } catch (error) {
        console.error('刪除理專時出錯:', error);
        showToast('刪除失敗，請重試', true);
    }
}

// =====================
// 客戶資料管理（原有功能）
// =====================

// 設置即時數據監聽
function setupRealtimeListener() {
    try {
        const { collection, query, orderBy, onSnapshot } = window.firestoreActions;
        const q = query(collection(window.db, COLLECTION_NAME), orderBy('createdAt', 'desc'));

        console.log('正在設置 Firestore 監聽器...');

        unsubscribe = onSnapshot(q, (querySnapshot) => {
            console.log('收到 Firestore 數據，文檔數量:', querySnapshot.size);
            customers = [];
            querySnapshot.forEach((doc) => {
                const customerData = { id: doc.id, ...doc.data() };
                customers.push(customerData);
            });

            // 更新 customerIdCounter
            if (customers.length > 0) {
                const maxId = Math.max(...customers.map(c => parseInt(c.numericId) || 0));
                customerIdCounter = maxId + 1;
            }

            console.log('載入客戶總數:', customers.length);
            updateAllDisplays();
        }, (error) => {
            console.error('監聽數據時出錯:', error);
            showToast('數據同步出錯，請刷新頁面', true);
        });

        console.log('Firestore 監聽器設置完成');
        loadCustomersOnce();
    } catch (error) {
        console.error('設置監聽器時出錯:', error);
        showToast('初始化數據監聽失敗', true);
        loadCustomersOnce();
    }
}

// 手動載入客戶數據（備用方案）
async function loadCustomersOnce() {
    try {
        console.log('手動載入客戶數據...');
        const { collection, getDocs, query, orderBy } = window.firestoreActions;
        const q = query(collection(window.db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        customers = [];
        querySnapshot.forEach((doc) => {
            const customerData = { id: doc.id, ...doc.data() };
            customers.push(customerData);
        });

        if (customers.length > 0) {
            const maxId = Math.max(...customers.map(c => parseInt(c.numericId) || 0));
            customerIdCounter = maxId + 1;
        }

        console.log('手動載入客戶總數:', customers.length);
        updateAllDisplays();

    } catch (error) {
        console.error('手動載入數據時出錯:', error);
        showToast('載入數據失敗', true);
    }
}

// 保存數據到 Firestore
async function saveCustomerToFirestore(customerData) {
    try {
        if (!window.db || !window.firestoreActions) {
            throw new Error('Firebase 未初始化');
        }

        const { collection, addDoc } = window.firestoreActions;
        const docRef = await addDoc(collection(window.db, COLLECTION_NAME), customerData);

        console.log('Firestore 保存成功，文檔 ID:', docRef.id);
        showToast('客戶新增成功！');
        return docRef;

    } catch (error) {
        console.error('保存數據時出錯:', error);
        if (error.code === 'permission-denied') {
            showToast('保存失敗：權限不足。請檢查 Firebase 安全規則設置。', true);
        } else if (error.code === 'unavailable') {
            showToast('保存失敗：網路連接問題，請重試。', true);
        } else {
            showToast(`保存失敗：${error.message}`, true);
        }
        throw error;
    }
}

// 更新客戶數據到 Firestore
async function updateCustomerInFirestore(customerId, customerData) {
    try {
        const { doc, updateDoc } = window.firestoreActions;
        await updateDoc(doc(window.db, COLLECTION_NAME, customerId), customerData);
        showToast('客戶資料更新成功！');
    } catch (error) {
        console.error('更新數據時出錯:', error);
        showToast('更新失敗，請重試', true);
    }
}

// 從 Firestore 刪除客戶數據
async function deleteCustomerFromFirestore(customerId) {
    try {
        const { doc, deleteDoc } = window.firestoreActions;
        await deleteDoc(doc(window.db, COLLECTION_NAME, customerId));
        showToast('客戶資料已刪除！');
    } catch (error) {
        console.error('刪除數據時出錯:', error);
        showToast('刪除失敗，請重試', true);
    }
}

// 新增客戶
async function addCustomer(customerData) {
    const newCustomer = {
        numericId: customerIdCounter++,
        name: customerData.name,
        maskedName: maskCustomerName(customerData.name),
        salesperson: customerData.salesperson,
        orderMonth: customerData.orderMonth,
        productType: customerData.productType,
        amount: parseInt(customerData.amount),
        createdAt: new Date().toISOString()
    };

    try {
        await saveCustomerToFirestore(newCustomer);
    } catch (error) {
        console.error('新增客戶失敗:', error);
        showToast('新增客戶失敗，請重試', true);
    }
}

// 編輯客戶
function editCustomer(id, customerData) {
    const updatedData = {
        name: customerData.name,
        maskedName: maskCustomerName(customerData.name),
        salesperson: customerData.salesperson,
        orderMonth: customerData.orderMonth,
        productType: customerData.productType,
        amount: parseInt(customerData.amount),
        updatedAt: new Date().toISOString()
    };

    updateCustomerInFirestore(id, updatedData);
}

// 刪除客戶
function deleteCustomer(id) {
    if (!isAuthenticated) {
        showToast('請先解鎖查看客戶清單', true);
        requestPasswordForView();
        return;
    }

    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    if (!confirm('確定要刪除這筆客戶資料嗎？')) return;

    const confirmMessage = `請再次確認刪除以下客戶資料：\n\n` +
        `客戶：${customer.maskedName}\n` +
        `業務：${customer.salesperson}\n` +
        `月份：${customer.orderMonth === '2025-12' ? '2025年12月' :
            customer.orderMonth === '2026-01' ? '2026年1月' : '2026年2月'}\n` +
        `商品：${customer.productType}\n` +
        `金額：${customer.amount.toLocaleString()}萬元\n\n` +
        `刪除後無法復原，確定要繼續嗎？`;

    if (confirm(confirmMessage)) {
        deleteCustomerFromFirestore(id);
    }
}

// =====================
// 統計計算
// =====================
function calculateStats() {
    const totalTarget = Object.values(salesTargets).reduce((sum, target) => sum + target, 0);
    const totalAchieved = customers.reduce((sum, customer) => sum + customer.amount, 0);
    const totalRemaining = totalTarget - totalAchieved;
    const progressPercentage = totalTarget > 0 ? (totalAchieved / totalTarget * 100).toFixed(1) : 0;

    return { totalTarget, totalAchieved, totalRemaining, progressPercentage };
}

function calculateSalespersonStats() {
    const stats = {};

    Object.keys(salesTargets).forEach(salesperson => {
        const target = salesTargets[salesperson];
        const achieved = customers
            .filter(c => c.salesperson === salesperson)
            .reduce((sum, c) => sum + c.amount, 0);
        const remaining = target - achieved;
        const progress = target > 0 ? (achieved / target * 100).toFixed(1) : 0;

        stats[salesperson] = {
            target,
            achieved,
            remaining,
            progress: parseFloat(progress)
        };
    });

    return stats;
}

function calculateMonthlyStats() {
    const months = ['2025-12', '2026-01', '2026-02'];
    const monthlyStats = {};

    months.forEach(month => {
        const monthCustomers = customers.filter(c => c.orderMonth === month);
        const total = monthCustomers.reduce((sum, c) => sum + c.amount, 0);
        const finance = monthCustomers
            .filter(c => c.productType === '理財')
            .reduce((sum, c) => sum + c.amount, 0);
        const insurance = monthCustomers
            .filter(c => c.productType === '保險')
            .reduce((sum, c) => sum + c.amount, 0);

        monthlyStats[month] = { total, finance, insurance };
    });

    return monthlyStats;
}

// =====================
// 顯示更新
// =====================
function updateOverviewStats() {
    const stats = calculateStats();

    document.getElementById('totalTarget').textContent = `${stats.totalTarget.toLocaleString()}萬`;
    document.getElementById('totalAchieved').textContent = `${stats.totalAchieved.toLocaleString()}萬`;
    document.getElementById('totalRemaining').textContent = `${stats.totalRemaining.toLocaleString()}萬`;
    document.getElementById('totalProgress').textContent = `${stats.progressPercentage}%`;
}

function updateTargetsDisplay() {
    const targetsGrid = document.getElementById('targetsGrid');
    const salespersonStats = calculateSalespersonStats();

    targetsGrid.innerHTML = '';

    Object.keys(salesTargets).forEach(salesperson => {
        const stats = salespersonStats[salesperson];
        const targetCard = document.createElement('div');
        targetCard.className = 'target-card slide-up';

        targetCard.innerHTML = `
            <h3>${salesperson}</h3>
            <div class="target-info">
                <span>目標：${stats.target.toLocaleString()}萬</span>
                <span>已達成：${stats.achieved.toLocaleString()}萬</span>
            </div>
            <div class="target-info">
                <span>剩餘：${stats.remaining.toLocaleString()}萬</span>
                <span>達成率：${stats.progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(stats.progress, 100)}%"></div>
            </div>
        `;

        const progressFill = targetCard.querySelector('.progress-fill');
        if (stats.progress >= 100) {
            progressFill.style.background = 'linear-gradient(90deg, #27ae60, #2ecc71)';
        } else if (stats.progress >= 80) {
            progressFill.style.background = 'linear-gradient(90deg, #f39c12, #f1c40f)';
        } else if (stats.progress >= 50) {
            progressFill.style.background = 'linear-gradient(90deg, #3498db, #5dade2)';
        } else {
            progressFill.style.background = 'linear-gradient(90deg, #e74c3c, #ec7063)';
        }

        targetsGrid.appendChild(targetCard);
    });
}

function updateMonthlyDisplay() {
    const monthlyStats = calculateMonthlyStats();

    document.getElementById('december-total').textContent = `${monthlyStats['2025-12'].total.toLocaleString()}萬`;
    document.getElementById('december-finance').textContent = `${monthlyStats['2025-12'].finance.toLocaleString()}萬`;
    document.getElementById('december-insurance').textContent = `${monthlyStats['2025-12'].insurance.toLocaleString()}萬`;

    document.getElementById('january-total').textContent = `${monthlyStats['2026-01'].total.toLocaleString()}萬`;
    document.getElementById('january-finance').textContent = `${monthlyStats['2026-01'].finance.toLocaleString()}萬`;
    document.getElementById('january-insurance').textContent = `${monthlyStats['2026-01'].insurance.toLocaleString()}萬`;

    document.getElementById('february-total').textContent = `${monthlyStats['2026-02'].total.toLocaleString()}萬`;
    document.getElementById('february-finance').textContent = `${monthlyStats['2026-02'].finance.toLocaleString()}萬`;
    document.getElementById('february-insurance').textContent = `${monthlyStats['2026-02'].insurance.toLocaleString()}萬`;
}

function filterCustomers() {
    const filterSalesperson = document.getElementById('filterSalesperson').value;
    const filterMonth = document.getElementById('filterMonth').value;
    const filterProduct = document.getElementById('filterProduct').value;

    return customers.filter(customer => {
        return (!filterSalesperson || customer.salesperson === filterSalesperson) &&
            (!filterMonth || customer.orderMonth === filterMonth) &&
            (!filterProduct || customer.productType === filterProduct);
    });
}

function updateCustomerList() {
    const customerList = document.getElementById('customerList');
    const filteredCustomers = filterCustomers();

    customerList.innerHTML = '';

    if (filteredCustomers.length === 0) {
        customerList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">目前沒有符合條件的客戶資料</p>';
        return;
    }

    filteredCustomers.forEach(customer => {
        const customerItem = document.createElement('div');
        customerItem.className = 'customer-item fade-in';

        const monthText = {
            '2025-12': '2025年12月',
            '2026-01': '2026年1月',
            '2026-02': '2026年2月'
        }[customer.orderMonth];

        customerItem.innerHTML = `
            <div class="customer-info">
                <span class="customer-name">${customer.maskedName}</span>
                <span class="customer-salesperson">${customer.salesperson}</span>
                <span class="customer-month">${monthText}</span>
                <span class="customer-product">${customer.productType}</span>
                <span class="customer-amount">${customer.amount.toLocaleString()}萬</span>
            </div>
            <div class="customer-actions">
                <button class="edit-btn" onclick="openEditModal('${customer.id}')">
                    <i class="fas fa-edit"></i> 編輯
                </button>
                <button class="delete-btn" onclick="deleteCustomer('${customer.id}')">
                    <i class="fas fa-trash"></i> 刪除
                </button>
            </div>
        `;

        customerList.appendChild(customerItem);
    });
}

function updateAllDisplays() {
    updateOverviewStats();
    updateTargetsDisplay();
    updateMonthlyDisplay();
    updateCustomerList();
}

// =====================
// 密碼驗證與客戶清單
// =====================
function verifyPassword(password) {
    return password === CUSTOMER_PASSWORD;
}

function requestPasswordForView() {
    if (isAuthenticated) {
        showCustomerList();
        return;
    }
    document.getElementById('password').value = '';
    document.getElementById('passwordError').style.display = 'none';
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('password').focus();
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    isAuthenticated = true;
    showCustomerList();
}

function showCustomerList() {
    document.getElementById('lockedMessage').style.display = 'none';
    document.getElementById('customerListContainer').style.display = 'block';

    const unlockBtn = document.getElementById('unlockButton');
    unlockBtn.innerHTML = '<i class="fas fa-lock-open"></i> 已解鎖';
    unlockBtn.style.background = '#27ae60';
    unlockBtn.onclick = null;

    updateCustomerList();
}

function openEditModal(customerId) {
    if (!isAuthenticated) {
        showToast('請先解鎖查看客戶清單', true);
        requestPasswordForView();
        return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editSalesperson').value = customer.salesperson;
    document.getElementById('editOrderMonth').value = customer.orderMonth;
    document.getElementById('editProductType').value = customer.productType;
    document.getElementById('editAmount').value = customer.amount;

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function reloadData() {
    console.log('用戶手動重新載入數據');
    showToast('正在重新載入數據...', false);

    try {
        await loadSalespersonsFromFirestore();
        await loadCustomersOnce();
        showToast('數據重新載入成功！');
    } catch (error) {
        console.error('重新載入數據失敗:', error);
        showToast('重新載入失敗，請檢查網路連接', true);
    }
}

// =====================
// 頁面初始化
// =====================
function initializePage() {
    console.log('開始初始化頁面...');

    window.addEventListener('firebaseReady', () => {
        console.log('收到 Firebase 準備就緒事件');
        initializeFirebase();
        setupSalespersonListener();
    });

    if (window.db && window.firestoreActions) {
        console.log('Firebase 已經準備就緒');
        initializeFirebase();
        setupSalespersonListener();
    } else {
        console.log('等待 Firebase 準備就緒...');
    }

    // 客戶清單密碼驗證
    document.getElementById('passwordForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('passwordError');

        if (verifyPassword(password)) {
            closePasswordModal();
            showToast('驗證成功');
        } else {
            errorDiv.style.display = 'block';
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    });

    // 管理員密碼驗證
    document.getElementById('adminPasswordForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('adminPasswordError');

        if (password === ADMIN_PASSWORD) {
            isAdminAuthenticated = true;
            closeAdminPasswordModal();
            showToast('管理員驗證成功');
            openAdminPanel();
        } else {
            errorDiv.style.display = 'block';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    });

    // 新增理專表單
    document.getElementById('addSalespersonForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const name = document.getElementById('newSalespersonName').value.trim();
        const target = parseInt(document.getElementById('newSalespersonTarget').value);

        if (!name) {
            showToast('請輸入理專姓名', true);
            return;
        }
        if (!target || target < 1) {
            showToast('請輸入有效的目標金額', true);
            return;
        }

        await addSalesperson(name, target);
        this.reset();
    });

    // 新增客戶表單
    document.getElementById('customerForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const customerData = {
            name: document.getElementById('customerName').value.trim(),
            salesperson: document.getElementById('salesperson').value,
            orderMonth: document.getElementById('orderMonth').value,
            productType: document.getElementById('productType').value,
            amount: document.getElementById('amount').value
        };

        if (!customerData.name) {
            showToast('請輸入客戶姓名', true);
            return;
        }
        if (!customerData.salesperson || !customerData.orderMonth || !customerData.productType || !customerData.amount) {
            showToast('請填寫完整資料', true);
            return;
        }

        try {
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = '保存中...';

            await addCustomer(customerData);
            this.reset();

            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> 新增客戶';
        } catch (error) {
            console.error('表單提交處理失敗:', error);
            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> 新增客戶';
        }
    });

    // 編輯客戶表單
    document.getElementById('editCustomerForm').addEventListener('submit', function (e) {
        e.preventDefault();

        const customerId = document.getElementById('editCustomerId').value;
        const customerData = {
            name: document.getElementById('editCustomerName').value.trim(),
            salesperson: document.getElementById('editSalesperson').value,
            orderMonth: document.getElementById('editOrderMonth').value,
            productType: document.getElementById('editProductType').value,
            amount: document.getElementById('editAmount').value
        };

        editCustomer(customerId, customerData);
        closeEditModal();
    });

    // 過濾器事件
    document.getElementById('filterSalesperson').addEventListener('change', updateCustomerList);
    document.getElementById('filterMonth').addEventListener('change', updateCustomerList);
    document.getElementById('filterProduct').addEventListener('change', updateCustomerList);

    // 模態框關閉事件
    document.querySelector('#editModal .close').addEventListener('click', closeEditModal);

    // 點擊模態框外部關閉
    window.addEventListener('click', function (e) {
        const editModal = document.getElementById('editModal');
        const passwordModal = document.getElementById('passwordModal');
        const adminPasswordModal = document.getElementById('adminPasswordModal');
        const adminPanelModal = document.getElementById('adminPanelModal');

        if (e.target === editModal) closeEditModal();
        if (e.target === passwordModal) {
            passwordModal.style.display = 'none';
            document.getElementById('password').value = '';
            document.getElementById('passwordError').style.display = 'none';
        }
        if (e.target === adminPasswordModal) closeAdminPasswordModal();
        if (e.target === adminPanelModal) closeAdminPanel();
    });

    updateAllDisplays();
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', initializePage);

// 導出函數供全域使用
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteCustomer = deleteCustomer;
window.reloadData = reloadData;
window.requestPasswordForView = requestPasswordForView;
window.openAdminLogin = openAdminLogin;
window.closeAdminPasswordModal = closeAdminPasswordModal;
window.closeAdminPanel = closeAdminPanel;
window.startEditSalesperson = startEditSalesperson;
window.saveSalespersonEdit = saveSalespersonEdit;
window.deleteSalesperson = deleteSalesperson;