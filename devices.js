// ========================================
// DEVICES.JS - Device Management (OHSR Tanks & Gateways)
// ========================================
const DeviceManager = {
    devices: [],
    markers: {},
    
    icons: {
        ohsr: L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="13" fill="#2196F3" stroke="white" stroke-width="2.5"/><text x="16" y="21" font-size="13" fill="white" text-anchor="middle" font-weight="bold">T</text></svg>'),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        }),
        gateway: L.icon({
            iconUrl: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="4" y="4" width="24" height="24" rx="3" fill="#4CAF50" stroke="white" stroke-width="2.5"/><text x="16" y="21" font-size="13" fill="white" text-anchor="middle" font-weight="bold">G</text></svg>'),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        })
    },
    
    init() {
        const saved = Core.loadFromStorage();
        if (saved && saved.devices) {
            saved.devices.forEach(d => this.addDevice(d, false));
        }
    },
    
    addDevice(device, save = true) {
        // Validate
        if (!device.id || !device.name || !device.latitude || !device.longitude) {
            Core.showNotification('Missing required device fields', 'error');
            return false;
        }
        
        // Check duplicate
        if (this.devices.find(d => d.id === device.id)) {
            Core.showNotification('Device ID already exists', 'warning');
            return false;
        }
        
        // Set defaults
        device.country = device.country || 'India';
        device.state = device.state || '';
        device.district = device.district || '';
        device.mandal = device.mandal || '';
        device.habitation = device.habitation || '';
        device.device = device.device || 'ohsr';
        device.altitude = device.altitude || 0;
        device.status = device.status || 'active';
        device.waterLevel = device.waterLevel || (Math.random() * 5 + 2).toFixed(2);
        device.capacity = device.capacity || 1000; // kL
        
        this.devices.push(device);
        
        // Add marker
        const icon = this.icons[device.device] || this.icons.ohsr;
        const marker = L.marker([device.latitude, device.longitude], {
            icon,
            draggable: false
        })
        .bindPopup(this.createPopup(device))
        .addTo(map);
        
        marker.on('click', () => this.showDetails(device.id));
        
        this.markers[device.id] = marker;
        
        if (save) {
            Core.saveToStorage();
            Core.showNotification('Device added successfully!', 'success');
            HierarchySearch.buildHierarchy();
        }
        
        return true;
    },
    
    createPopup(device) {
        const statusIcon = device.status === 'active' ? '🟢' : '🔴';
        
        return `
            <div style="min-width: 220px;">
                <b>${device.name}</b><br>
                <small>ID: ${device.id}</small><br>
                <small>Type: ${device.device.toUpperCase()}</small><br>
                <small>Status: ${statusIcon} ${device.status.charAt(0).toUpperCase() + device.status.slice(1)}</small><br>
                <small>Location: ${device.habitation || device.mandal || device.district || 'N/A'}</small><br>
                ${device.device === 'ohsr' ? `<small>Water Level: ${device.waterLevel}m</small><br>` : ''}
                <div style="margin-top: 10px; display: flex; gap: 6px;">
                    <button onclick="DeviceManager.showDetails('${device.id}')" 
                        style="flex: 1; padding: 6px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        View Details
                    </button>
                    <button onclick="DeviceManager.deleteDevice('${device.id}')" 
                        style="flex: 1; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        Delete
                    </button>
                </div>
            </div>
        `;
    },
    
    showDetails(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;
        
        const panel = document.getElementById('detailsPanel');
        const header = document.getElementById('panelHeader');
        const title = document.getElementById('panelTitle');
        const content = document.getElementById('panelContent');
        
        header.classList.remove('gatewall');
        title.textContent = device.name;
        
        // Simulate live data
        const waterPercent = device.device === 'ohsr' ? Math.floor((parseFloat(device.waterLevel) / 10) * 100) : 0;
        const phLevel = (Math.random() * 2 + 6.5).toFixed(2);
        const temperature = (Math.random() * 10 + 20).toFixed(1);
        
        content.innerHTML = `
            <div class="panel-section">
                <div class="section-header">
                    <h3>📋 Device Information</h3>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Device ID:</span>
                    <span class="detail-value">${device.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Device Type:</span>
                    <span class="detail-value">${device.device.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge ${device.status === 'active' ? 'status-active' : 'status-inactive'}">
                        ${device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                    </span>
                </div>
                ${device.device === 'ohsr' ? `
                <div class="detail-row">
                    <span class="detail-label">Tank Capacity:</span>
                    <span class="detail-value">${device.capacity} kL</span>
                </div>
                ` : ''}
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>📍 Location Details</h3>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${device.country}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">State:</span>
                    <span class="detail-value">${device.state || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">District:</span>
                    <span class="detail-value">${device.district || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mandal:</span>
                    <span class="detail-value">${device.mandal || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Habitation:</span>
                    <span class="detail-value">${device.habitation || 'N/A'}</span>
                </div>
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>🗺️ Coordinates</h3>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Latitude:</span>
                    <span class="detail-value">${device.latitude.toFixed(6)}°</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Longitude:</span>
                    <span class="detail-value">${device.longitude.toFixed(6)}°</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Altitude:</span>
                    <span class="detail-value">${device.altitude} meters</span>
                </div>
            </div>
            
            ${device.device === 'ohsr' ? `
            <div class="panel-section">
                <div class="section-header">
                    <h3>📊 Live Data</h3>
                </div>
                <div style="margin: 15px 0;">
                    <div style="margin-bottom: 5px;">
                        <span style="font-size: 12px; color: #666;">💧 Water Level: ${device.waterLevel}m</span>
                        <span style="float: right; font-size: 12px; font-weight: 600; color: #1a73e8;">${waterPercent}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${waterPercent}%; background: ${waterPercent > 50 ? '#28a745' : waterPercent > 20 ? '#ffc107' : '#dc3545'}; border-radius: 4px; transition: width 0.5s;"></div>
                    </div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🧪 pH Level:</span>
                    <span class="detail-value">${phLevel}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">🌡️ Temperature:</span>
                    <span class="detail-value">${temperature}°C</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Last Update:</span>
                    <span class="detail-value">${new Date().toLocaleTimeString()}</span>
                </div>
            </div>
            ` : ''}
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>🔗 Connected Pipelines</h3>
                </div>
                <div id="connectedPipelines" style="font-size: 12px; color: #666;">
                    ${this.getConnectedPipelines(device.id)}
                </div>
            </div>
        `;
        
        panel.classList.add('active');
        
        // Pan to device
        map.setView([device.latitude, device.longitude], 16);
        this.markers[device.id].openPopup();
    },
    
    getConnectedPipelines(deviceId) {
        const connected = PipelineManager.getAllPipelines().filter(p => 
            p.connectedDevices && p.connectedDevices.includes(deviceId)
        );
        
        if (connected.length === 0) {
            return '<div style="padding: 10px; text-align: center; color: #999;">No connected pipelines</div>';
        }
        
        return connected.map(p => `
            <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${p.flowActive ? '#2196F3' : '#FF0000'};">
                <b>${p.name}</b><br>
                <small>Status: ${p.flowActive ? '🟢 Active' : '🔴 Inactive'} • Flow: ${p.flowRate} L/min</small>
            </div>
        `).join('');
    },
    
    deleteDevice(deviceId) {
        if (!confirm('Delete this device? This will remove its connections.')) return;
        
        const idx = this.devices.findIndex(d => d.id === deviceId);
        if (idx > -1) {
            // Remove marker
            if (this.markers[deviceId]) {
                map.removeLayer(this.markers[deviceId]);
                delete this.markers[deviceId];
            }
            
            // Remove from pipelines
            PipelineManager.removeDeviceConnections(deviceId);
            
            this.devices.splice(idx, 1);
            Core.saveToStorage();
            Core.showNotification('Device deleted', 'info');
            HierarchySearch.buildHierarchy();
            
            // Close panel if open
            const panel = document.getElementById('detailsPanel');
            if (panel.classList.contains('active')) {
                panel.classList.remove('active');
            }
        }
    },
    
    getAllDevices() {
        return this.devices;
    },
    
    getDeviceById(id) {
        return this.devices.find(d => d.id === id);
    },
    
    clearAll() {
        this.devices.forEach(d => {
            if (this.markers[d.id]) {
                map.removeLayer(this.markers[d.id]);
            }
        });
        this.devices = [];
        this.markers = {};
    }
};