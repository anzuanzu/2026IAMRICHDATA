// =================================================================
// Firebase Firestore SDK 的功能模組
// 這些是與資料庫溝通需要用到的工具
// =================================================================
import {
    collection,
    addDoc,
    getDocs,
    onSnapshot, // ⭐️ 新增：這是實現即時更新的關鍵
    doc,
    deleteDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


// =================================================================
// 全域變數與設定
// =================================================================

// 業務目標數據 (這部分維持不變，因為這是固定的設定)
const salesTargets = {
    '璧菁': 3000,
    '麗鳳': 1000,
    '馨予': 1000,
    '淑芬': 1000,
    '靜芸': 1000,
    '雨軒': 1000,
    '祺倫': 1000,
    '奕憲': 1000,
    '泓權': 1000,
    '至浩': 1000
};

// 取得在 index.html 中初始化的 Firestore 資料庫物件
// window.db 是我們在 HTML 中設定的全域變數
const db = window.db;

// 建立一個對 'customers' 集合的引用
// 之後所有對客戶資料的操作都會透過這個引用
const customersCollectionRef = collection(db, "customers");

// 客戶數據存儲
// ⚠️ 舊的 localStorage 讀取方式已被移除
// 現在 customers 陣列會作為雲端資料的本地快照，由 Firebase 即時更新
let customers = [];


// =================================================================
// 資料庫操作 (CRUD - 新增、讀取、更新、刪除)
// 這些函數現在都改成非同步 (async)，因為與雲端溝通需要時間
// =================================================================

/**
 * ⭐️ 新增：設定一個即時監聽器
 * 當 Firestore 中的 'customers' 集合有任何變動時，這個函數會自動執行
 * 它會重新抓取所有資料，然後更新整個頁面
 */
onSnapshot(customersCollectionRef, (snapshot) => {
    // 將抓取到的資料轉換成我們需要的陣列格式
    customers = snapshot.docs.map(doc => ({
        id: doc.id, // 這是 Firestore 為每筆資料產生的唯一ID
        ...doc.data() // ...doc.data() 是文件中的所有欄位 (name, salesperson 等)
    }));

    // 資料更新後，重新渲染頁面所有相關區塊
    updateAllDisplays();
    console.log("資料已從 Firebase 同步更新！");
});


/**
 * 新增客戶資料到 Firebase
 * @param {object} customerData - 要新增的客戶物件
 */
async function addCustomer(customerData) {
    try {
        const newCustomer = {
            name: customerData.name,
            maskedName: maskCustomerName(customerData.name),
            salesperson: customerData.salesperson,
            orderMonth: customerData.orderMonth,
            productType: customerData.productType,
            amount: parseInt(customerData.amount),
            createdAt: new Date().toISOString() // 記錄建立時間
        };

        // ⚠️ 舊的 customers.push() 和 saveData() 已被取代
        // addDoc 會在 'customers' 集合中新增一筆文件
        const docRef = await addDoc(customersCollectionRef, newCustomer);
        console.log("客戶已新增，ID: ", docRef.id);
        showToast('客戶新增成功！');

        // 因為有 onSnapshot 監聽器，新增成功後頁面會自動更新，不需手動呼叫 updateAllDisplays()
    } catch (e) {
        console.error("新增客戶失敗: ", e);
        showToast('新增客戶失敗，請檢查網路連線', true);
    }
}

/**
 * 更新 Firebase 中的客戶資料
 * @param {string} id - 要編輯的客戶的 Firestore 文件 ID
 * @param {object} customerData - 更新後的客戶資料
 */
async function editCustomer(id, customerData) {
    try {
        // 建立一個指向特定客戶文件的引用
        const customerDocRef = doc(db, "customers", id);
        
        const updatedData = {
            name: customerData.name,
            maskedName: maskCustomerName(customerData.name),
            salesperson: customerData.salesperson,
            orderMonth: customerData.orderMonth,
            productType: customerData.productType,
            amount: parseInt(customerData.amount),
            updatedAt: new Date().toISOString() // 記錄更新時間
        };
        
        // ⚠️ 舊的 findIndex 和 array 修改已被取代
        // updateDoc 會更新指定的雲端文件
        await updateDoc(customerDocRef, updatedData);
        showToast('客戶資料更新成功！');

        // 同樣地，onSnapshot 會自動處理頁面更新
    } catch (e) {
        console.error("更新客戶失敗: ", e);
        showToast('更新客戶失敗，請檢查網路連線', true);
    }
}

/**
 * 從 Firebase 刪除客戶資料
 * @param {string} id - 要刪除的客戶的 Firestore 文件 ID
 */
async function deleteCustomer(id) {
    // 從本地快照中找到客戶資料，用於顯示確認訊息
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    // 刪除前的確認對話框 (這部分邏輯不變)
    if (!confirm('確定要刪除這筆客戶資料嗎？')) {
        return;
    }

    const confirmMessage = `請再次確認刪除以下客戶資料：\n\n` +
                          `客戶：${customer.maskedName}\n` +
                          `業務：${customer.salesperson}\n` +
                          `月份：${customer.orderMonth === '2025-12' ? '2025年12月' : 
                                   customer.orderMonth === '2026-01' ? '2026年1月' : '2026年2月'}\n` +
                          `商品：${customer.productType}\n` +
                          `金額：${customer.amount.toLocaleString()}萬元\n\n` +
                          `刪除後無法復原，確定要繼續嗎？`;

    if (confirm(confirmMessage)) {
        try {
            // 建立指向要刪除文件的引用
            const customerDocRef = doc(db, "customers", id);
            
            // ⚠️ 舊的 array.filter 和 saveData() 已被取代
            // deleteDoc 會刪除指定的雲端文件
            await deleteDoc(customerDocRef);
            showToast('客戶資料已刪除！');
            
            // onSnapshot 會自動處理頁面更新
        } catch (e) {
            console.error("刪除客戶失敗: ", e);
            showToast('刪除客戶失敗，請檢查網路連線', true);
        }
    }
}


// =================================================================
// 頁面顯示與計算 (這部分大部分不變，因為它們是基於 `customers` 陣列進行計算和渲染)
// =================================================================

// ⚠️ saveData() 函數已不再需要，可以直接刪除
// function saveData() { ... }

// 客戶姓名隱碼函數 (不變)
function maskCustomerName(name) {
    if (name.length <= 1) return name;
    if (name.length === 2) return name[0] + 'O';
    if (name.length === 3) return name[0] + 'O' + name[2];
    return name[0] + 'O'.repeat(name.length - 2) + name[name.length - 1];
}

// 顯示提示訊息 (不變)
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// 計算統計數據 (不變)
function calculateStats() {
    const totalTarget = Object.values(salesTargets).reduce((sum, target) => sum + target, 0);
    const totalAchieved = customers.reduce((sum, customer) => sum + customer.amount, 0);
    const totalRemaining = totalTarget - totalAchieved;
    const progressPercentage = totalTarget > 0 ? (totalAchieved / totalTarget * 100).toFixed(1) : 0;
    
    return {
        totalTarget,
        totalAchieved,
        totalRemaining,
        progressPercentage
    };
}

// 計算各業務達成狀況 (不變)
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

// 計算月份統計 (不變)
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

// 更新整體統計顯示 (不變)
function updateOverviewStats() {
    const stats = calculateStats();
    
    document.getElementById('totalTarget').textContent = `${stats.totalTarget.toLocaleString()}萬`;
    document.getElementById('totalAchieved').textContent = `${stats.totalAchieved.toLocaleString()}萬`;
    document.getElementById('totalRemaining').textContent = `${stats.totalRemaining.toLocaleString()}萬`;
    document.getElementById('totalProgress').textContent = `${stats.progressPercentage}%`;
}

// 更新業務目標顯示 (不變)
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

// 更新月份統計顯示 (不變)
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

// 過濾客戶清單 (不變)
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

// 更新客戶清單顯示 (不變)
function updateCustomerList() {
    const customerList = document.getElementById('customerList');
    const filteredCustomers = filterCustomers();
    
    customerList.innerHTML = '';
    
    if (filteredCustomers.length === 0) {
        customerList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">目前沒有符合條件的客戶資料</p>';
        return;
    }
    
    // 讓最新的資料顯示在最上面
    filteredCustomers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

// 更新所有顯示 (不變)
function updateAllDisplays() {
    updateOverviewStats();
    updateTargetsDisplay();
    updateMonthlyDisplay();
    updateCustomerList();
}

// 開啟編輯模態框 (不變)
// 只是傳入的 customerId 現在是 Firestore 的 ID
function openEditModal(customerId) {
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

// 關閉編輯模態框 (不變)
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}


// =================================================================
// 頁面初始化
// =================================================================
function initializePage() {
    // 新增客戶表單事件 (不變)
    document.getElementById('customerForm').addEventListener('submit', function(e) {
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
        
        addCustomer(customerData);
        this.reset();
    });
    
    // 編輯客戶表單事件 (不變)
    document.getElementById('editCustomerForm').addEventListener('submit', function(e) {
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
    
    // 過濾器事件 (不變)
    document.getElementById('filterSalesperson').addEventListener('change', updateCustomerList);
    document.getElementById('filterMonth').addEventListener('change', updateCustomerList);
    document.getElementById('filterProduct').addEventListener('change', updateCustomerList);
    
    // 模態框關閉事件 (不變)
    document.querySelector('.close').addEventListener('click', closeEditModal);
    
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('editModal');
        if (e.target === modal) {
            closeEditModal();
        }
    });
    
    // ⚠️ 舊的 setInterval 已被移除，因為 onSnapshot 會自動處理更新
    // setInterval(updateAllDisplays, 5000);

    // 初始載入時，onSnapshot 會自動觸發一次，所以這裡不需手動呼叫 updateAllDisplays()
    // 為了避免畫面一開始是空的，可以先呼叫一次
    updateAllDisplays();
}

// 頁面載入完成後初始化 (不變)
document.addEventListener('DOMContentLoaded', initializePage);

// 導出函數供全域使用 (不變)
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteCustomer = deleteCustomer;