// ========================================
// GATEWALLS.JS - Gate Wall Management & Flow Control
// ========================================
const GateWallManager = {
    gateWalls: [],
    markers: {},
    
    flowDirections: {
        NONE: 'none',
        LEFT: 'left',
        RIGHT: 'right',
        STRAIGHT: 'straight',
        ALL: 'all'
    },
    
    icons: {
        straight: L.divIcon({
            html: '<div style="background: #9C27B0; width: 35px; height: 35px; border-radius: 8px; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-weight: bold; color: white; font-size: 15px;">S</div>',
            iconSize: [35, 35],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17],
            className: ''
        }),
        't-junction': L.divIcon({
            html: '<div style="background: #FF5722; width: 35px; height: 35px; border-radius: 8px; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-weight: bold; color: white; font-size: 15px;">T</div>',
            iconSize: [35, 35],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17],
            className: ''
        })
    },
    
    init() {
        const saved = Core.loadFromStorage();
        if (saved && saved.gateWalls) {
            saved.gateWalls.forEach(gw => this.addGateWall(gw, false));
        }
        
        // Start simulation
        this.startSimulation();
    },
    
    addGateWall(gateWall, save = true) {
        // Validate
        if (!gateWall.name || !gateWall.latitude || !gateWall.longitude) {
            Core.showNotification('Missing required gate wall fields', 'error');
            return false;
        }
        
        // Generate ID
        if (!gateWall.id) {
            gateWall.id = 'gw_' + Date.now();
        }
        
        // Check duplicate
        if (this.gateWalls.find(gw => gw.id === gateWall.id)) {
            Core.showNotification('Gate wall ID already exists', 'warning');
            return false;
        }
        
        // Set defaults
        gateWall.country = gateWall.country || 'India';
        gateWall.state = gateWall.state || '';
        gateWall.district = gateWall.district || '';
        gateWall.mandal = gateWall.mandal || '';
        gateWall.habitation = gateWall.habitation || '';
        gateWall.type = gateWall.type || 'straight';
        gateWall.altitude = gateWall.altitude || 0;
        gateWall.flowDirection = gateWall.flowDirection || this.flowDirections.NONE;
        gateWall.batteryLevel = gateWall.batteryLevel !== undefined ? gateWall.batteryLevel : 100;
        gateWall.pressure = gateWall.pressure || 0;
        gateWall.isActive = gateWall.isActive !== undefined ? gateWall.isActive : false;
        gateWall.connectedPipelines = gateWall.connectedPipelines || [];
        gateWall.history = gateWall.history || [];
        
        this.gateWalls.push(gateWall);
        
        // Add marker
        const icon = this.icons[gateWall.type] || this.icons.straight;
        const marker = L.marker([gateWall.latitude, gateWall.longitude], {
            icon,
            draggable: false
        })
        .bindPopup(this.createPopup(gateWall))
        .addTo(map);
        
        marker.on('click', () => this.showDetails(gateWall.id));
        
        this.markers[gateWall.id] = marker;
        
        if (save) {
            this.logHistory(gateWall, 'Gate wall created');
            Core.saveToStorage();
            Core.showNotification('Gate wall added successfully!', 'success');
            HierarchySearch.buildHierarchy();
        }
        
        return true;
    },
    
    createPopup(gw) {
        const flowStatus = gw.isActive ? '🟢 Active' : '🔴 Inactive';
        const batteryIcon = gw.batteryLevel > 20 ? '🔋' : '⚠️';
        
        return `
            <div style="min-width: 220px;">
                <b>${gw.name}</b><br>
                <small>ID: ${gw.id}</small><br>
                <small>Type: ${gw.type.toUpperCase()}</small><br>
                <small>Flow: ${gw.flowDirection}</small><br>
                <small>Status: ${flowStatus}</small><br>
                <small>Battery: ${batteryIcon} ${gw.batteryLevel.toFixed(0)}%</small><br>
                <small>Pressure: ${gw.pressure} PSI</small><br>
                <div style="margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;">
                    <button onclick="GateWallManager.showDetails('${gw.id}')" 
                        style="flex: 1; padding: 6px; background: #9C27B0; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        Control
                    </button>
                    <button onclick="GateWallManager.deleteGateWall('${gw.id}')" 
                        style="flex: 1; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        Delete
                    </button>
                </div>
            </div>
        `;
    },
    
    showDetails(gateWallId) {
        const gw = this.gateWalls.find(g => g.id === gateWallId);
        if (!gw) return;
        
        const panel = document.getElementById('detailsPanel');
        const header = document.getElementById('panelHeader');
        const title = document.getElementById('panelTitle');
        const content = document.getElementById('panelContent');
        
        header.classList.add('gatewall');
        title.textContent = gw.name;
        
        const flowControls = this.getFlowControlsHTML(gw);
        const batteryColor = gw.batteryLevel > 50 ? '#28a745' : gw.batteryLevel > 20 ? '#ffc107' : '#dc3545';
        
        content.innerHTML = `
            <div class="panel-section">
                <div class="section-header">
                    <h3>🚧 Gate Wall Information</h3>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gate Wall ID:</span>
                    <span class="detail-value">${gw.id}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${gw.type.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Battery Level:</span>
                    <span class="detail-value" id="gwBattery">${gw.batteryLevel.toFixed(0)}%</span>
                </div>
                <div style="margin: 10px 0;">
                    <div style="width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                        <div style="height: 100%; width: ${gw.batteryLevel}%; background: ${batteryColor}; border-radius: 4px; transition: width 0.5s;"></div>
                    </div>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Pressure:</span>
                    <span class="detail-value" id="gwPressure">${gw.pressure} PSI</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge ${gw.isActive ? 'status-active' : 'status-inactive'}" id="gwStatus">
                        ${gw.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>🎮 Flow Direction Control</h3>
                </div>
                <div class="flow-controls" id="flowControls">
                    ${flowControls}
                </div>
                <div class="info-text" style="margin-top: 10px;">
                    💧 <b>Blue pipelines</b> = Water flowing<br>
                    🔴 <b>Red pipelines</b> = No water flow<br>
                    Active flow automatically updates connected pipelines
                </div>
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>📍 Location Details</h3>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Country:</span>
                    <span class="detail-value">${gw.country}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">State:</span>
                    <span class="detail-value">${gw.state || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">District:</span>
                    <span class="detail-value">${gw.district || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mandal:</span>
                    <span class="detail-value">${gw.mandal || 'N/A'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Habitation:</span>
                    <span class="detail-value">${gw.habitation || 'N/A'}</span>
                </div>
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>🔗 Connected Pipelines</h3>
                </div>
                <div id="connectedPipelines" style="font-size: 12px; color: #666;">
                    ${this.getConnectedPipelinesHTML(gw.id)}
                </div>
            </div>
            
            <div class="panel-section">
                <div class="section-header">
                    <h3>📈 Recent History</h3>
                </div>
                <div style="max-height: 200px; overflow-y: auto; font-size: 11px;">
                    ${this.getRecentHistoryHTML(gw)}
                </div>
            </div>
        `;
        
        panel.classList.add('active');
        
        // Pan to gate wall
        map.setView([gw.latitude, gw.longitude], 16);
        this.markers[gw.id].openPopup();
    },
    
    getFlowControlsHTML(gw) {
        const FD = this.flowDirections;
        
        if (gw.type === 'straight') {
            return `
                <button class="flow-btn ${gw.flowDirection === FD.STRAIGHT ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.STRAIGHT}')">
                    ➡️ Flow Straight
                </button>
                <button class="flow-btn ${gw.flowDirection === FD.NONE ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.NONE}')">
                    ⛔ Stop Flow
                </button>
            `;
        } else {
            return `
                <button class="flow-btn ${gw.flowDirection === FD.LEFT ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.LEFT}')">
                    ⬅️ Flow Left
                </button>
                <button class="flow-btn ${gw.flowDirection === FD.RIGHT ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.RIGHT}')">
                    ➡️ Flow Right
                </button>
                <button class="flow-btn ${gw.flowDirection === FD.STRAIGHT ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.STRAIGHT}')">
                    ⬆️ Flow Straight
                </button>
                <button class="flow-btn ${gw.flowDirection === FD.ALL ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.ALL}')">
                    🔀 All Directions
                </button>
                <button class="flow-btn ${gw.flowDirection === FD.NONE ? 'active' : ''}" 
                    onclick="GateWallManager.setFlowDirection('${gw.id}', '${FD.NONE}')">
                    ⛔ Stop Flow
                </button>
            `;
        }
    },
    
    getConnectedPipelinesHTML(gateWallId) {
        const connected = PipelineManager.getAllPipelines().filter(p => 
            p.connectedGateWalls && p.connectedGateWalls.includes(gateWallId)
        );
        
        if (connected.length === 0) {
            return '<div style="padding: 10px; text-align: center; color: #999;">No connected pipelines</div>';
        }
        
        return connected.map(p => `
            <div style="padding: 8px; margin: 5px 0; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${p.flowActive ? '#2196F3' : '#FF0000'};">
                <b>${p.name}</b><br>
                <small>Status: ${p.flowActive ? '🟢 Active' : '🔴 Inactive'} • Pressure: ${p.pressure} PSI</small>
            </div>
        `).join('');
    },
    
    getRecentHistoryHTML(gw) {
        if (!gw.history || gw.history.length === 0) {
            return '<div style="padding: 10px; text-align: center; color: #999;">No history available</div>';
        }
        
        const recent = gw.history.slice(-10).reverse();
        
        return recent.map(entry => {
            const date = new Date(entry.timestamp);
            return `
                <div style="padding: 6px; margin: 4px 0; background: #f8f9fa; border-radius: 3px; border-left: 2px solid #1a73e8;">
                    <div style="font-weight: 600; color: #333;">${entry.event}</div>
                    <div style="color: #666; margin-top: 2px;">
                        ${date.toLocaleDateString()} ${date.toLocaleTimeString()}<br>
                        Flow: ${entry.flowDirection} • Pressure: ${entry.pressure} PSI
                    </div>
                </div>
            `;
        }).join('');
    },
    
    setFlowDirection(gateWallId, direction) {
        const gw = this.gateWalls.find(g => g.id === gateWallId);
        if (!gw) return;
        
        gw.flowDirection = direction;
        gw.isActive = direction !== this.flowDirections.NONE;
        gw.pressure = gw.isActive ? (Math.random() * 30 + 20).toFixed(1) : 0;
        
        this.logHistory(gw, `Flow direction changed to: ${direction}`);
        
        // Update pipelines
        PipelineManager.updateWaterFlow();
        
        // Update popup
        if (this.markers[gw.id]) {
            this.markers[gw.id].setPopupContent(this.createPopup(gw));
        }
        
        // Update panel if open
        const panel = document.getElementById('detailsPanel');
        if (panel.classList.contains('active')) {
            const gwBattery = document.getElementById('gwBattery');
            const gwPressure = document.getElementById('gwPressure');
            const gwStatus = document.getElementById('gwStatus');
            const flowControls = document.getElementById('flowControls');
            
            if (gwBattery) gwBattery.textContent = gw.batteryLevel.toFixed(0) + '%';
            if (gwPressure) gwPressure.textContent = gw.pressure + ' PSI';
            if (gwStatus) {
                gwStatus.textContent = gw.isActive ? 'Active' : 'Inactive';
                gwStatus.className = 'status-badge ' + (gw.isActive ? 'status-active' : 'status-inactive');
            }
            if (flowControls) {
                flowControls.innerHTML = this.getFlowControlsHTML(gw);
            }
        }
        
        Core.saveToStorage();
        Core.showNotification(`Flow set to: ${direction}`, 'success');
    },
    
    logHistory(gw, event) {
        gw.history.push({
            timestamp: new Date().toISOString(),
            event: event,
            flowDirection: gw.flowDirection,
            pressure: gw.pressure,
            batteryLevel: gw.batteryLevel,
            isActive: gw.isActive
        });
        
        // Keep last 1000
        if (gw.history.length > 1000) {
            gw.history = gw.history.slice(-1000);
        }
    },
    
    startSimulation() {
        setInterval(() => {
            this.gateWalls.forEach(gw => {
                if (gw.isActive) {
                    // Battery drain
                    gw.batteryLevel = Math.max(0, gw.batteryLevel - 0.01);
                    
                    // Pressure fluctuation
                    if (gw.flowDirection !== this.flowDirections.NONE) {
                        gw.pressure = (parseFloat(gw.pressure) + (Math.random() - 0.5) * 2).toFixed(1);
                        gw.pressure = Math.max(0, Math.min(50, gw.pressure));
                    }
                    
                    // Update popup if open
                    if (this.markers[gw.id] && this.markers[gw.id].isPopupOpen()) {
                        this.markers[gw.id].setPopupContent(this.createPopup(gw));
                    }
                    
                    // Low battery warning
                    if (gw.batteryLevel < 20 && gw.batteryLevel > 19.9) {
                        this.logHistory(gw, 'Low battery warning');
                        Core.showNotification(`${gw.name}: Low battery!`, 'warning');
                    }
                    
                    // Auto-shutdown on zero battery
                    if (gw.batteryLevel <= 0) {
                        this.setFlowDirection(gw.id, this.flowDirections.NONE);
                        this.logHistory(gw, 'Auto-shutdown: Battery depleted');
                        Core.showNotification(`${gw.name}: Battery depleted!`, 'error');
                    }
                }
            });
            
            Core.saveToStorage();
        }, 5000);
    },
    
    deleteGateWall(gateWallId) {
        if (!confirm('Delete this gate wall? This will remove its connections.')) return;
        
        const idx = this.gateWalls.findIndex(gw => gw.id === gateWallId);
        if (idx > -1) {
            // Remove marker
            if (this.markers[gateWallId]) {
                map.removeLayer(this.markers[gateWallId]);
                delete this.markers[gateWallId];
            }
            
            // Remove from pipelines
            PipelineManager.removeGateWallConnections(gateWallId);
            
            this.gateWalls.splice(idx, 1);
            Core.saveToStorage();
            Core.showNotification('Gate wall deleted', 'info');
            HierarchySearch.buildHierarchy();
            
            // Close panel if open
            const panel = document.getElementById('detailsPanel');
            if (panel.classList.contains('active')) {
                panel.classList.remove('active');
            }
        }
    },
    
    getAllGateWalls() {
        return this.gateWalls;
    },
    
    getGateWallById(id) {
        return this.gateWalls.find(gw => gw.id === id);
    },
    
    clearAll() {
        this.gateWalls.forEach(gw => {
            if (this.markers[gw.id]) {
                map.removeLayer(this.markers[gw.id]);
            }
        });
        this.gateWalls = [];
        this.markers = {};
    }
};