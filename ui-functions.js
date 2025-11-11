// ========================================
// UI-FUNCTIONS.JS - UI Helper Functions & Event Handlers
// ========================================

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function switchTab(category, tab) {
    const prefix = category === 'device' ? 'device' : 'gatewall';
    const modalId = category === 'device' ? 'deviceModal' : 'gateWallModal';
    
    document.querySelectorAll(`#${modalId} .tab-btn`).forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll(`#${modalId} .tab-content`).forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${prefix}-${tab}-tab`).classList.add('active');
    
    // Update lists when switching to list tabs
    if (tab === 'list') {
        if (category === 'device') {
            updateDeviceList();
        } else {
            updateGateWallList();
        }
    }
}

function toggleSearchPanel() {
    const panel = document.getElementById('searchPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

// Device Management
function addDevice() {
    const device = {
        name: document.getElementById('deviceName').value.trim(),
        id: document.getElementById('deviceId').value.trim(),
        device: document.getElementById('deviceType').value,
        country: document.getElementById('deviceCountry').value,
        state: document.getElementById('deviceState').value.trim(),
        district: document.getElementById('deviceDistrict').value.trim(),
        mandal: document.getElementById('deviceMandal').value.trim(),
        habitation: document.getElementById('deviceHabitation').value.trim(),
        latitude: parseFloat(document.getElementById('deviceLat').value),
        longitude: parseFloat(document.getElementById('deviceLng').value),
        altitude: parseFloat(document.getElementById('deviceAlt').value) || 0
    };
    
    if (DeviceManager.addDevice(device)) {
        // Clear form
        ['deviceName', 'deviceId', 'deviceState', 'deviceDistrict', 'deviceMandal', 'deviceHabitation', 'deviceLat', 'deviceLng', 'deviceAlt'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.value = '';
        });
    }
}

function updateDeviceList() {
    const container = document.getElementById('deviceListContainer');
    if (!container) return;
    
    const devices = DeviceManager.getAllDevices();
    
    if (devices.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #999;">No devices added yet</div>';
        return;
    }
    
    container.innerHTML = devices.map(d => `
        <div class="result-item" onclick="DeviceManager.showDetails('${d.id}'); closeModal('deviceModal');">
            <span class="item-type type-${d.device}">${d.device.toUpperCase()}</span>
            <b>${d.name}</b><br>
            <small>${d.id} • ${d.habitation || d.mandal || d.district || 'N/A'}</small>
        </div>
    `).join('');
}

// Gate Wall Management
function addGateWall() {
    const gateWall = {
        name: document.getElementById('gwName').value.trim(),
        type: document.getElementById('gwType').value,
        country: document.getElementById('gwCountry').value,
        state: document.getElementById('gwState').value.trim(),
        district: document.getElementById('gwDistrict').value.trim(),
        mandal: document.getElementById('gwMandal').value.trim(),
        habitation: document.getElementById('gwHabitation').value.trim(),
        latitude: parseFloat(document.getElementById('gwLat').value),
        longitude: parseFloat(document.getElementById('gwLng').value),
        altitude: parseFloat(document.getElementById('gwAlt').value) || 0
    };
    
    if (GateWallManager.addGateWall(gateWall)) {
        // Clear form
        ['gwName', 'gwState', 'gwDistrict', 'gwMandal', 'gwHabitation', 'gwLat', 'gwLng', 'gwAlt'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.value = '';
        });
    }
}

function updateGateWallList() {
    const container = document.getElementById('gateWallListContainer');
    if (!container) return;
    
    const gateWalls = GateWallManager.getAllGateWalls();
    
    if (gateWalls.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #999;">No gate walls added yet</div>';
        return;
    }
    
    container.innerHTML = gateWalls.map(gw => {
        const statusColor = gw.isActive ? '#28a745' : '#dc3545';
        return `
            <div class="result-item" onclick="GateWallManager.showDetails('${gw.id}'); closeModal('gateWallModal');">
                <span class="item-type type-gatewall">${gw.type.toUpperCase()}</span>
                <b>${gw.name}</b>
                <span style="float: right; width: 8px; height: 8px; background: ${statusColor}; border-radius: 50%; display: inline-block; margin-top: 5px;"></span><br>
                <small>${gw.id} • ${gw.habitation || gw.mandal || gw.district || 'N/A'}</small>
            </div>
        `;
    }).join('');
}

// Pipeline Management
function toggleDrawPipeline() {
    if (PipelineManager.drawingMode) {
        PipelineManager.finishDrawing();
    } else {
        PipelineManager.startDrawing();
        // Close modal so user can see map clearly
        closeModal('gateWallModal');
    }
}

// Data Import/Export
function exportAllData() {
    Core.exportData();
}

function importData(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            Core.importData(e.target.result);
        };
        reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
}

// Panel Management
function closeDetailsPanel() {
    document.getElementById('detailsPanel').classList.remove('active');
}

// Map Layer Management
function changeMapLayer(type) {
    if (window.currentLayer) {
        map.removeLayer(window.currentLayer);
    }
    
    const layers = {
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'),
        street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
        terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
        dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
    };
    
    window.currentLayer = layers[type];
    window.currentLayer.addTo(map);
    
    document.querySelectorAll('.map-controls button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + type).classList.add('active');
}

// Initialize System
window.onload = function() {
    // Initialize all modules
    Core.init();
    DeviceManager.init();
    GateWallManager.init();
    PipelineManager.init();
    HierarchySearch.init();
    
    // Setup event listeners
    document.getElementById('deviceSettingsBtn').onclick = () => openModal('deviceModal');
    document.getElementById('gateWallSettingsBtn').onclick = () => openModal('gateWallModal');
    document.getElementById('searchBtn').onclick = toggleSearchPanel;
    
    // Right-click to auto-fill coordinates
    map.on('contextmenu', (e) => {
        const lat = e.latlng.lat.toFixed(6);
        const lng = e.latlng.lng.toFixed(6);
        
        // Fill device form if open
        if (document.getElementById('deviceModal').classList.contains('active')) {
            const latInput = document.getElementById('deviceLat');
            const lngInput = document.getElementById('deviceLng');
            if (latInput && lngInput) {
                latInput.value = lat;
                lngInput.value = lng;
                Core.showNotification('Coordinates auto-filled', 'info');
            }
        }
        
        // Fill gate wall form if open
        if (document.getElementById('gateWallModal').classList.contains('active')) {
            const latInput = document.getElementById('gwLat');
            const lngInput = document.getElementById('gwLng');
            if (latInput && lngInput) {
                latInput.value = lat;
                lngInput.value = lng;
                Core.showNotification('Coordinates auto-filled', 'info');
            }
        }
    });
    
    // Close modals on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Load demo data if empty
    if (DeviceManager.getAllDevices().length === 0 && GateWallManager.getAllGateWalls().length === 0) {
        loadDemoData();
    }
    
    console.log('✓ IoT Map Management System Initialized');
};

// Load demo data for testing
function loadDemoData() {
    // Add demo devices
    DeviceManager.addDevice({
        name: "OHSR Tank - Hanamkonda",
        id: "OHSR001",
        device: "ohsr",
        country: "India",
        state: "Telangana",
        district: "Warangal",
        mandal: "Warangal Urban",
        habitation: "Hanamkonda",
        latitude: 17.387,
        longitude: 78.488,
        altitude: 102
    }, false);
    
    DeviceManager.addDevice({
        name: "Gateway - Kazipet",
        id: "GW001",
        device: "gateway",
        country: "India",
        state: "Telangana",
        district: "Warangal",
        mandal: "Warangal Urban",
        habitation: "Kazipet",
        latitude: 17.392,
        longitude: 78.495,
        altitude: 95
    }, false);
    
    // Add demo gate walls
    GateWallManager.addGateWall({
        name: "Main Gate Wall 1",
        type: "straight",
        country: "India",
        state: "Telangana",
        district: "Warangal",
        mandal: "Warangal Urban",
        habitation: "Hanamkonda",
        latitude: 17.389,
        longitude: 78.490,
        altitude: 98
    }, false);
    
    GateWallManager.addGateWall({
        name: "T-Junction Gate 1",
        type: "t-junction",
        country: "India",
        state: "Telangana",
        district: "Warangal",
        mandal: "Warangal Urban",
        habitation: "Kazipet",
        latitude: 17.391,
        longitude: 78.493,
        altitude: 96
    }, false);
    
    Core.saveToStorage();
    HierarchySearch.buildHierarchy();
    
    console.log('✓ Demo data loaded');
}