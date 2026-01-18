// Super Admin Dashboard Logic

// State Management
const STATE = {
    users: [],
    interactions: [],
    currentUser: null,
    map: null,
    markers: {},
    charts: {},
    pollingInterval: null
};

// DOM Elements
const usersTableBody = document.getElementById('usersTableBody');
const userModal = document.getElementById('userModal');
const rentalModal = document.getElementById('rentalModal');
const userForm = document.getElementById('userForm');
const searchInput = document.getElementById('userListSearch');
const roleFilter = document.getElementById('userRoleFilter');
const revenueDisplay = document.getElementById('stat-revenue');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initMap();
    initCharts();
    renderUsers();
    updateStats();
    updatePendingBadge(); // Initialize pending badge
    startPolling();

    // Event Listeners
    searchInput.addEventListener('input', renderUsers);
    roleFilter.addEventListener('change', renderUsers);

    // Sidebar Mobile
    window.toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };
});

// Data Loading
async function loadData() {
    // Try LocalStorage first for persistence during demo
    const localUsers = localStorage.getItem('super_admin_users');
    const localInteractions = localStorage.getItem('super_admin_interactions');

    // Check for pending orders from index.html (simulation of backend sync)
    checkForNewOrders();

    if (localUsers && localInteractions) {
        STATE.users = JSON.parse(localUsers);
        STATE.interactions = JSON.parse(localInteractions);
    } else {
        try {
            const response = await fetch('data.json');
            const data = await response.json();
            STATE.users = data.users;
            STATE.interactions = data.interactions;
        } catch (error) {
            console.error('Failed to load data.json', error);
            // Fallback mock
            STATE.users = [{ id: 1, name: "Admin User", email: "admin@medish.com", role: "Admin", status: "Active", balance: 0, location: { lat: 9.0054, lng: 38.7419, name: "Addis Ababa HQ" } }];
            STATE.interactions = [];
        }
        saveData();
    }
}

function saveData() {
    localStorage.setItem('super_admin_users', JSON.stringify(STATE.users));
    localStorage.setItem('super_admin_interactions', JSON.stringify(STATE.interactions));
    updateStats();
    updateCharts();
}

function startPolling() {
    // Track last known pending count
    let lastPendingCount = STATE.users.filter(u => u.status === 'Pending').length;

    // Poll for new orders and signups every 3 seconds
    setInterval(async () => {
        // Safe check for new orders
        if (typeof checkForNewOrders === 'function') {
            checkForNewOrders();
        }

        // Check for new partner signups
        const reloadedUsers = JSON.parse(localStorage.getItem('super_admin_users') || '[]');
        const currentPending = reloadedUsers.filter(u => u.status === 'Pending').length;

        if (reloadedUsers.length !== STATE.users.length || currentPending !== lastPendingCount) {
            // Data changed!
            const isNewSignup = currentPending > lastPendingCount;

            STATE.users = reloadedUsers;
            lastPendingCount = currentPending;

            // Refresh ALL views to show "live data"
            renderUsers();
            renderPending();
            updateMapMarkers();
            updatePendingBadge();
            updateStats();
            updateAnalyticsCharts();

            if (isNewSignup) {
                showNotification('New Partner Application!', `You have ${currentPending} pending approval${currentPending > 1 ? 's' : ''}.`, 'info');
            }
        }
    }, 3000);
}



function showNotification(title, message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'info' ? 'bg-industrial-yellow' : 'bg-green-500';
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-4 rounded-xl shadow-xl transform transition-all duration-500 translate-y-20 z-50 max-w-sm`;
    toast.innerHTML = `
        <div class="flex items-start space-x-3">
            <i class="fas fa-bell text-xl"></i>
            <div>
                <div class="font-bold">${title}</div>
                <div class="text-sm opacity-90">${message}</div>
            </div>
        </div>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.remove('translate-y-20'));
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-20');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}

function checkForNewOrders() {
    const pendingOrdersRaw = localStorage.getItem('super_admin_pending_orders') || localStorage.getItem('machinery_orders');
    if (!pendingOrdersRaw) return false;

    const pendingOrders = JSON.parse(pendingOrdersRaw);
    if (pendingOrders.length === 0) return false;

    let changesMade = false;

    // Process pending orders
    pendingOrders.forEach(order => {
        // 1. Create or Update User
        let user = STATE.users.find(u => u.email === order.customer.email);

        if (!user) {
            user = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                name: order.customer.name,
                email: order.customer.email,
                role: 'Customer',
                status: 'Active',
                balance: 0,
                joinDate: new Date().toISOString().split('T')[0],
                location: order.location // Lat/Lng from geolocation
            };
            STATE.users.push(user);
        } else if (order.location) {
            // Update location if provided
            user.location = order.location;
        }

        // 2. Add Interaction
        const interaction = {
            id: Date.now(),
            userId: user.id,
            machineId: order.items[0]?.machineId || 0,
            machineName: order.items[0]?.machine.name || 'Unknown Machine',
            action: order.items[0]?.isRental ? 'Rent' : 'Buy',
            date: new Date().toISOString().split('T')[0],
            duration: order.items[0]?.duration ? `${order.items[0].duration} days` : 'Permanent',
            cost: order.total,
            status: 'Active',
            provider: 'Online Booking'
        };

        STATE.interactions.push(interaction);
        changesMade = true;
    });

    // Clear queue
    localStorage.removeItem('super_admin_pending_orders');
    return changesMade;
}

// Navigation
window.showSection = (sectionId) => {
    ['users-section', 'map-section', 'analytics-section', 'pending-section'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });

    document.getElementById(`${sectionId}-section`).classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(btn => {
        if (btn.dataset.target === sectionId) {
            btn.classList.add('bg-white/10', 'text-white');
        } else {
            btn.classList.remove('bg-white/10', 'text-white');
        }
    });

    if (sectionId === 'map') {
        setTimeout(() => {
            STATE.map.invalidateSize();
            updateMapMarkers();
        }, 100);
    } else if (sectionId === 'pending') {
        renderPending();
    } else if (sectionId === 'analytics') {
        updateAnalyticsCharts();
    }
};

window.refreshPending = () => {
    renderPending();
    const btn = event.target.closest('button');
    const icon = btn?.querySelector('i');
    if (icon) {
        icon.classList.add('fa-spin');
        setTimeout(() => icon.classList.remove('fa-spin'), 1000);
    }
};

function renderPending() {
    const tbody = document.getElementById('pendingTableBody');
    const noMsg = document.getElementById('noPendingMsg');
    const pendingUsers = STATE.users.filter(u => u.status === 'Pending');

    if (pendingUsers.length === 0) {
        tbody.innerHTML = '';
        noMsg.classList.remove('hidden');
    } else {
        noMsg.classList.add('hidden');
        tbody.innerHTML = pendingUsers.map(user => `
            <tr class="hover:bg-orange-50/30 transition-colors">
                <td class="p-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div class="font-medium text-gray-800">${user.name}</div>
                    </div>
                </td>
                <td class="p-4 text-gray-700">${user.company || 'N/A'}</td>
                <td class="p-4 text-gray-600">${user.email}</td>
                <td class="p-4 text-gray-500">${user.joinDate}</td>
                <td class="p-4 text-right">
                    <div class="flex justify-end space-x-2">
                        <button onclick="approveUser(${user.id})" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium text-sm shadow transition">
                            <i class="fas fa-check mr-1"></i> Approve
                        </button>
                        <button onclick="deleteUser(${user.id})" class="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium text-sm transition">
                            <i class="fas fa-times mr-1"></i> Reject
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    updatePendingBadge();
}

function updatePendingBadge() {
    const count = STATE.users.filter(u => u.status === 'Pending').length;
    const badge = document.getElementById('pending-badge');
    const headerBadge = document.getElementById('header-pending-badge');

    // Update sidebar badge
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // Update header badge
    if (headerBadge) {
        if (count > 0) {
            headerBadge.textContent = count;
            headerBadge.classList.remove('hidden');
        } else {
            headerBadge.classList.add('hidden');
        }
    }
}

// User Management (CRUD)
function renderUsers() {
    const term = searchInput.value.toLowerCase();
    const role = roleFilter.value;

    const filtered = STATE.users.filter(user => {
        const matchesTerm = user.name.toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
        const matchesRole = role === 'All' || user.role === role;
        return matchesTerm && matchesRole;
    });

    usersTableBody.innerHTML = filtered.map(user => `
        <tr class="hover:bg-gray-50 transition-colors group">
            <td class="p-4">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                        ${user.name.charAt(0)}
                    </div>
                    <div>
                        <div class="font-bold text-industrial-gray">${user.name}</div>
                        <div class="text-xs text-gray-400">${user.email}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">
                <span class="px-2 py-1 rounded-md text-xs font-bold ${getRoleBadgeColor(user.role)}">
                    ${user.role}
                </span>
            </td>
            <td class="p-4">
                <span class="flex items-center">
                    <span class="w-2 h-2 rounded-full mr-2 ${user.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}"></span>
                    ${user.status}
                </span>
            </td>
            <td class="p-4 font-mono font-medium ${user.balance < 0 ? 'text-red-500' : 'text-gray-700'}">
                $${user.balance.toFixed(2)}
            </td>
            <td class="p-4 text-sm text-gray-500">
                ${user.location ? `<i class="fas fa-map-marker-alt text-red-400 mr-1"></i> ${user.location.name}` : 'N/A'}
            </td>
            <td class="p-4 text-right">
                <div class="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    ${user.status === 'Pending' ? `
                        <button onclick="approveUser(${user.id})" class="p-2 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xs" title="Approve">
                            <i class="fas fa-check-circle mr-1"></i>Approve
                        </button>
                        <button onclick="deleteUser(${user.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Reject">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    ` : `
                        <button onclick="viewHistory(${user.id})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Rental History">
                            <i class="fas fa-history"></i>
                        </button>
                        <button onclick="editUser(${user.id})" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUser(${user.id})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

function getRoleBadgeColor(role) {
    switch (role) {
        case 'Admin': return 'bg-purple-100 text-purple-700';
        case 'Partner': return 'bg-blue-100 text-blue-700';
        case 'Customer': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-600';
    }
}

// Modal & Forms
const ETHIOPIA_CITIES = {
    "Addis Ababa": { lat: 9.005401, lng: 38.741870 },
    "Dire Dawa": { lat: 9.600874, lng: 41.850143 },
    "Mekelle": { lat: 13.496664, lng: 39.469753 },
    "Gondar": { lat: 12.600000, lng: 37.466667 },
    "Bahir Dar": { lat: 11.593641, lng: 37.390770 },
    "Hawassa": { lat: 7.049936, lng: 38.476318 },
    "Jimma": { lat: 7.667469, lng: 36.835888 },
    "Adama": { lat: 8.525048, lng: 39.270180 },
    "Jijiga": { lat: 9.351660, lng: 42.796917 },
    "Shashemene": { lat: 7.200927, lng: 38.596073 }
};

window.updateLatLongFromCity = (cityName) => {
    if (ETHIOPIA_CITIES[cityName]) {
        document.getElementById('userLat').value = ETHIOPIA_CITIES[cityName].lat;
        document.getElementById('userLng').value = ETHIOPIA_CITIES[cityName].lng;
    }
};

window.openUserModal = () => {
    STATE.currentUser = null;
    document.getElementById('modalTitle').innerText = 'Add New User';
    userForm.reset();
    document.getElementById('userId').value = '';

    userModal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('userModalContent').classList.remove('scale-95', 'opacity-0');
        document.getElementById('userModalContent').classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.editUser = (id) => {
    const user = STATE.users.find(u => u.id === id);
    if (!user) return;

    STATE.currentUser = user;
    document.getElementById('modalTitle').innerText = 'Edit User';

    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.name;
    document.getElementById('userEmail').value = user.email;
    document.getElementById('userRole').value = user.role;
    document.getElementById('userStatus').value = user.status;

    if (user.location) {
        document.getElementById('userLocationName').value = user.location.name || '';
        document.getElementById('userLat').value = user.location.lat || '';
        document.getElementById('userLng').value = user.location.lng || '';

        // Try to match city if roughly same coords
        if (ETHIOPIA_CITIES[user.location.name]) {
            document.getElementById('userCitySelect').value = user.location.name;
        }
    } else {
        document.getElementById('userLocationName').value = '';
        document.getElementById('userLat').value = '';
        document.getElementById('userLng').value = '';
    }

    userModal.classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('userModalContent').classList.remove('scale-95', 'opacity-0');
        document.getElementById('userModalContent').classList.add('scale-100', 'opacity-100');
    }, 10);
};

window.closeUserModal = (e, force = false) => {
    if (force || e.target === userModal) {
        document.getElementById('userModalContent').classList.remove('scale-100', 'opacity-100');
        document.getElementById('userModalContent').classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            userModal.classList.add('hidden');
        }, 200);
    }
};

window.handleUserSubmit = (e) => {
    e.preventDefault();

    const id = document.getElementById('userId').value;
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const role = document.getElementById('userRole').value;
    const status = document.getElementById('userStatus').value;

    const locName = document.getElementById('userLocationName').value;
    const locLat = parseFloat(document.getElementById('userLat').value);
    const locLng = parseFloat(document.getElementById('userLng').value);

    let location = null;
    if (locName && !isNaN(locLat) && !isNaN(locLng)) {
        location = { name: locName, lat: locLat, lng: locLng };
    }

    if (id) {
        // Edit existing
        const index = STATE.users.findIndex(u => u.id == id);
        if (index !== -1) {
            STATE.users[index] = { ...STATE.users[index], name, email, role, status, location };
        }
    } else {
        // Add new
        const newUser = {
            id: Date.now(),
            name,
            email,
            role,
            status,
            balance: 0,
            location,
            joinDate: new Date().toISOString().split('T')[0]
        };
        STATE.users.push(newUser);
    }

    saveData();
    renderUsers();
    updateMapMarkers();
    closeUserModal(null, true);

    // Show success notification
    showNotification('Success', id ? 'User updated successfully' : 'New user added successfully', 'success');
};

window.deleteUser = (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
        STATE.users = STATE.users.filter(u => u.id !== id);
        saveData();

        // Auto-refresh all views
        renderUsers();
        renderPending();
        updateMapMarkers();
        updatePendingBadge();
        updateStats();

        // Show notification
        showNotification('User Deleted', 'The user has been removed from the system.', 'info');
    }
};

window.approveUser = (id) => {
    const user = STATE.users.find(u => u.id === id);
    if (!user) return;

    // Approve without confirmation for faster workflow
    user.status = 'Active';
    saveData();

    // Auto-refresh all views
    renderUsers();
    renderPending();
    updateMapMarkers();
    updatePendingBadge();
    updateStats();

    // Show success notification
    showNotification('Approved OK', `${user.name} has been approved successfully.`, 'success');
};

// Map Visualization (Ethiopia Focused)
function initMap() {
    STATE.map = L.map('map').setView([9.145, 40.489], 6); // Center of Ethiopia

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(STATE.map);

    updateMapMarkers();
}

function updateMapMarkers() {
    // Clear existing markers
    for (let id in STATE.markers) {
        STATE.map.removeLayer(STATE.markers[id]);
    }
    STATE.markers = {};

    STATE.users.forEach(user => {
        if (user.location && user.location.lat && user.location.lng) {
            const marker = L.marker([user.location.lat, user.location.lng])
                .addTo(STATE.map)
                .bindPopup(`
                    <div class="font-sans text-center">
                        <div class="font-bold text-industrial-gray">${user.name}</div>
                        <div class="text-xs text-gray-500">${user.role}</div>
                        <div class="mt-1 font-bold text-industrial-yellow">${user.location.name}</div>
                    </div>
                `);
            STATE.markers[user.id] = marker;
        }
    });
}

// Charts (Chart.js)
function initCharts() {
    const ctxRevenue = document.getElementById('revenueChart');
    const ctxUserGrowth = document.getElementById('userGrowthChart');
    const ctxEquipment = document.getElementById('equipmentStatusChart');

    if (!ctxRevenue) return; // Charts might not be visible initially

    // Revenue Chart
    STATE.charts.revenue = new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], // Dynamic in real app
            datasets: [{
                label: 'Revenue ($)',
                data: [12000, 19000, 15000, 45200],
                borderColor: '#FFB347',
                backgroundColor: 'rgba(255, 179, 71, 0.2)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true }
    });

    // User Growth Chart
    STATE.charts.growth = new Chart(ctxUserGrowth, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr'],
            datasets: [{
                label: 'New Users',
                data: [5, 12, 8, 15],
                backgroundColor: '#4299E1',
                borderRadius: 4
            }]
        },
        options: { responsive: true }
    });

    // Equipment Chart
    STATE.charts.equipment = new Chart(ctxEquipment, {
        type: 'doughnut',
        data: {
            labels: ['Rented', 'Available', 'Maintenance'],
            datasets: [{
                data: [3, 8, 1],
                backgroundColor: ['#FFB347', '#10B981', '#FF6B35']
            }]
        },
        options: { responsive: true }
    });
}

function updateCharts() {
    // Determine totals for charts based on STATE
    const totalRevenue = STATE.interactions.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);
    if (revenueDisplay) {
        revenueDisplay.innerText = `$${totalRevenue.toLocaleString()}`;
    }

    // Simple randomization for demo effect on chart updates
    if (STATE.charts.growth) {
        // Just force a re-render or update data if we had time series
        STATE.charts.growth.update();
    }
}

function updateAnalyticsCharts() {
    // Get data from localStorage
    const machinesData = localStorage.getItem('machines');
    let rentalCount = 0;
    let saleCount = 0;

    if (machinesData) {
        const machines = JSON.parse(machinesData);
        rentalCount = machines.filter(m => m.listingType === 'Rent').length;
        saleCount = machines.filter(m => m.listingType === 'Sale').length;
    }

    const vendorCount = STATE.users.filter(u => u.role === 'Partner' && u.status === 'Active').length;

    // Update Equipment Status Chart (show Rental vs Sale Machines)
    if (STATE.charts.equipment) {
        STATE.charts.equipment.data.labels = ['Rental Machines', 'Sale Machines'];
        STATE.charts.equipment.data.datasets[0].data = [rentalCount, saleCount];
        STATE.charts.equipment.data.datasets[0].backgroundColor = ['#4299E1', '#10B981'];
        STATE.charts.equipment.options.plugins = {
            legend: { position: 'bottom' },
            title: { display: true, text: 'Machines by Type' }
        };
        STATE.charts.equipment.update();
    }

    // Update User Growth Chart to show Vendors
    if (STATE.charts.growth) {
        STATE.charts.growth.data.labels = ['Active Vendors'];
        STATE.charts.growth.data.datasets[0].label = 'Active Partners';
        STATE.charts.growth.data.datasets[0].data = [vendorCount];
        STATE.charts.growth.data.datasets[0].backgroundColor = '#FFB347';
        STATE.charts.growth.options.scales = {
            y: { beginAtZero: true, ticks: { stepSize: 1 } }
        };
        STATE.charts.growth.update();
    }
}


// Rental History / Interactions
window.viewHistory = (userId) => {
    const user = STATE.users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('rentalModalTitle').innerText = 'Rental History';
    document.getElementById('rentalModalSubtitle').innerText = `${user.name} (${user.email})`;

    const userInteractions = STATE.interactions.filter(i => i.userId === userId);

    let content = '';
    if (userInteractions.length === 0) {
        content = `<div class="text-center py-8 text-gray-400">No rental history found for this user.</div>`;
    } else {
        content = userInteractions.map(item => `
            <div class="flex items-start p-4 border border-gray-100 rounded-xl bg-gray-50 mb-3">
                <div class="bg-white p-3 rounded-lg shadow-sm border border-gray-100 mr-4">
                    <i class="fas ${item.action === 'Rent' ? 'fa-truck-moving text-industrial-yellow' : 'fa-shopping-cart text-green-500'} text-xl"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between">
                        <h4 class="font-bold text-gray-800">${item.machineName}</h4>
                        <span class="text-xs font-bold px-2 py-1 rounded bg-gray-200 text-gray-600">${item.status}</span>
                    </div>
                    <p class="text-sm text-gray-600 mt-1">Provided by: <span class="font-semibold">${item.provider}</span></p>
                    <div class="flex items-center text-xs text-gray-400 mt-2 space-x-3">
                        <span><i class="far fa-calendar-alt mr-1"></i> ${item.date}</span>
                        <span><i class="fas fa-clock mr-1"></i> ${item.duration}</span>
                        <span class="font-bold text-green-600">$${item.cost}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('rentalHistoryContent').innerHTML = content;
    rentalModal.classList.remove('hidden');
};

window.closeRentalModal = (e, force = false) => {
    if (force || e.target === rentalModal) {
        rentalModal.classList.add('hidden');
    }
};

// Analytics / Stats
function updateStats() {
    // Get machines from localStorage (populated by main site)
    const machinesData = localStorage.getItem('machines');
    let rentalCount = 0;
    let saleCount = 0;

    if (machinesData) {
        const machines = JSON.parse(machinesData);
        rentalCount = machines.filter(m => m.listingType === 'Rent').length;
        saleCount = machines.filter(m => m.listingType === 'Sale').length;
    }

    // Count partners
    const partnerCount = STATE.users.filter(u => u.role === 'Partner' && u.status === 'Active').length;
    const pendingCount = STATE.users.filter(u => u.status === 'Pending').length;

    // Update stats
    const rentalEl = document.getElementById('stat-rental-machines');
    const saleEl = document.getElementById('stat-sale-machines');
    const partnerEl = document.getElementById('stat-total-partners');
    const pendingEl = document.getElementById('stat-pending-partners');

    if (rentalEl) rentalEl.innerText = rentalCount;
    if (saleEl) saleEl.innerText = saleCount;
    if (partnerEl) partnerEl.innerText = partnerCount;
    if (pendingEl) pendingEl.innerText = pendingCount;
}

// ==========================================
// UTILITIES & MISSING FUNCTIONS (FIX CRASH)
// ==========================================

function updatePendingBadge() {
    const count = STATE.users.filter(u => u.status === 'Pending').length;
    const sidebarBadge = document.getElementById('pending-badge');
    const headerBadge = document.getElementById('header-notification-badge');

    if (sidebarBadge) {
        sidebarBadge.innerText = count;
        count > 0 ? sidebarBadge.classList.remove('hidden') : sidebarBadge.classList.add('hidden');
    }

    if (headerBadge) {
        headerBadge.innerText = count;
        count > 0 ? headerBadge.classList.remove('hidden') : headerBadge.classList.add('hidden');
    }
}

function renderPending() {
    const tbody = document.getElementById('pendingTableBody');
    // If we are not on a page with pending table, skip
    if (!tbody) return;

    const pending = STATE.users.filter(u => u.status === 'Pending');

    if (pending.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400 italic">No pending approvals found</td></tr>`;
        return;
    }

    tbody.innerHTML = pending.map(u => `
        <tr class="hover:bg-orange-50/50 transition-colors border-b border-gray-50 last:border-0">
            <td class="p-4">
                <div class="font-bold text-gray-800">${u.name}</div>
                <div class="text-xs text-gray-400">ID: ${u.id}</div>
            </td>
            <td class="p-4 font-medium text-gray-600">${u.company || 'N/A'}</td>
            <td class="p-4 text-gray-500">${u.email}</td>
            <td class="p-4 text-gray-400 text-sm">
                <span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">${u.joinDate || 'Today'}</span>
            </td>
            <td class="p-4 text-right">
                <div class="flex justify-end space-x-2">
                    <button onclick="approveUser(${u.id})" class="flex items-center px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-bold text-xs transition">
                        <i class="fas fa-check mr-1.5"></i>Approve
                    </button>
                    <button onclick="deleteUser(${u.id})" class="flex items-center px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-bold text-xs transition">
                        <i class="fas fa-times mr-1.5"></i>Reject
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function checkForNewOrders() {
    // Read orders from shared storage
    const ordersJson = localStorage.getItem('machinery_orders');
    if (!ordersJson) return false;

    // Logic to detect new orders could go here (comparing length)
    // For now, we return false to assume no changes unless we implement full sync
    // But we avoid the crash.
    return false;
}

function showNotification(title, message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col space-y-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-industrial-gray';
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    toast.className = `${bgClass} text-white px-6 py-4 rounded-xl shadow-2xl transform transition-all duration-300 translate-y-10 opacity-0 flex items-center min-w-[320px] pointer-events-auto border-l-4 border-white/20`;
    toast.innerHTML = `
        <div class="mr-4 text-2xl flex-shrink-0"><i class="fas ${iconClass}"></i></div>
        <div>
            <div class="font-bold text-lg leading-tight">${title}</div>
            <div class="text-sm opacity-90 mt-1">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" class="ml-auto text-white/50 hover:text-white transition"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);

    // Animate In
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // Auto Dismiss
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
