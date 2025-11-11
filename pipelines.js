// ========================================
// PIPELINES.JS - Unified Pipeline Drawing & Management
// ========================================
const PipelineManager = {
    pipelines: [],
    polylines: {},
    drawingMode: false,
    currentPipeline: null,
    tempLine: null,
    lastClickTime: 0,
    lastClickPosition: null,
    doubleTapDelay: 300,
    connectionThreshold: 0.0005, // ~50 meters
    
    init() {
        this.setupMapEvents();
        
        const saved = Core.loadFromStorage();
        if (saved && saved.pipelines) {
            saved.pipelines.forEach(p => this.addPipeline(p, false));
        }
    },
    
    setupMapEvents() {
        map.on('click', (e) => {
            if (this.drawingMode) {
                this.handleMapClick(e);
            }
        });
    },
    
    handleMapClick(e) {
        const currentTime = Date.now();
        const timeDiff = currentTime - this.lastClickTime;
        const isSameLocation = this.lastClickPosition && 
            Math.abs(e.latlng.lat - this.lastClickPosition.lat) < 0.0001 &&
            Math.abs(e.latlng.lng - this.lastClickPosition.lng) < 0.0001;
        
        // Double tap detection - start new segment
        if (timeDiff < this.doubleTapDelay && isSameLocation) {
            this.finishCurrentSegment(e.latlng);
        } else {
            this.addPipelinePoint(e.latlng);
        }
        
        this.lastClickTime = currentTime;
        this.lastClickPosition = e.latlng;
    },
    
    addPipelinePoint(latlng) {
        if (!this.currentPipeline) {
            this.currentPipeline = {
                id: 'pipeline_' + Date.now(),
                name: `Pipeline ${this.pipelines.length + 1}`,
                points: [],
                segments: [],
                connectedDevices: [],
                connectedGateWalls: [],
                flowActive: false,
                color: '#FF0000',
                pressure: 0,
                flowRate: 0
            };
        }
        
        this.currentPipeline.points.push([latlng.lat, latlng.lng]);
        
        // Check for nearby connections
        this.checkNearbyConnections(latlng);
        
        this.updateTempLine();
    },
    
    checkNearbyConnections(latlng) {
        // Check devices
        DeviceManager.getAllDevices().forEach(device => {
            const distance = this.calculateDistance(
                device.latitude, device.longitude,
                latlng.lat, latlng.lng
            );
            
            if (distance < this.connectionThreshold && 
                !this.currentPipeline.connectedDevices.includes(device.id)) {
                this.currentPipeline.connectedDevices.push(device.id);
                Core.showNotification(`✓ Connected to ${device.name}`, 'success');
            }
        });
        
        // Check gate walls
        GateWallManager.getAllGateWalls().forEach(gw => {
            const distance = this.calculateDistance(
                gw.latitude, gw.longitude,
                latlng.lat, latlng.lng
            );
            
            if (distance < this.connectionThreshold && 
                !this.currentPipeline.connectedGateWalls.includes(gw.id)) {
                this.currentPipeline.connectedGateWalls.push(gw.id);
                
                // Update gate wall connections
                if (!gw.connectedPipelines.includes(this.currentPipeline.id)) {
                    gw.connectedPipelines.push(this.currentPipeline.id);
                }
                
                Core.showNotification(`✓ Connected to ${gw.name}`, 'success');
            }
        });
    },
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        return Math.sqrt(
            Math.pow(lat2 - lat1, 2) + 
            Math.pow(lon2 - lon1, 2)
        );
    },
    
    updateTempLine() {
        if (this.tempLine) {
            map.removeLayer(this.tempLine);
        }
        
        if (this.currentPipeline && this.currentPipeline.points.length > 0) {
            this.tempLine = L.polyline(this.currentPipeline.points, {
                color: this.currentPipeline.color,
                weight: 4,
                opacity: 0.7,
                dashArray: '10, 10'
            }).addTo(map);
        }
    },
    
    finishCurrentSegment(latlng) {
        if (this.currentPipeline && this.currentPipeline.points.length > 1) {
            // Save current segment
            this.currentPipeline.segments.push([...this.currentPipeline.points]);
            
            // Start new segment from this point
            this.currentPipeline.points = [[latlng.lat, latlng.lng]];
            
            this.updateTempLine();
            Core.showNotification('✓ New segment started', 'info');
        }
    },
    
    startDrawing() {
        this.drawingMode = true;
        this.currentPipeline = null;
        map.dragging.disable(); // Lock map
        map.scrollWheelZoom.disable();
        map.doubleClickZoom.disable();
        map.getContainer().style.cursor = 'crosshair';
        
        const indicator = document.getElementById('drawingIndicator');
        const btn = document.getElementById('drawPipelineBtn');
        
        indicator.classList.add('active');
        btn.textContent = '✓ Finish Pipeline';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-danger');
        
        Core.showNotification('Click to add points • Double-tap for new segment', 'info');
    },
    
    finishDrawing() {
        if (this.currentPipeline && this.currentPipeline.points.length > 1) {
            // Add final segment
            this.currentPipeline.segments.push([...this.currentPipeline.points]);
            
            // Validate minimum points
            const totalPoints = this.currentPipeline.segments.reduce((sum, seg) => sum + seg.length, 0);
            
            if (totalPoints >= 2) {
                this.addPipeline(this.currentPipeline);
                Core.showNotification('✓ Pipeline created successfully!', 'success');
            } else {
                Core.showNotification('Need at least 2 points for pipeline', 'warning');
            }
        } else if (this.currentPipeline) {
            Core.showNotification('Need at least 2 points for pipeline', 'warning');
        }
        
        // Cleanup
        if (this.tempLine) {
            map.removeLayer(this.tempLine);
            this.tempLine = null;
        }
        
        this.drawingMode = false;
        this.currentPipeline = null;
        map.dragging.enable(); // Unlock map
        map.scrollWheelZoom.enable();
        map.doubleClickZoom.enable();
        map.getContainer().style.cursor = '';
        
        const indicator = document.getElementById('drawingIndicator');
        const btn = document.getElementById('drawPipelineBtn');
        
        indicator.classList.remove('active');
        btn.textContent = '🎨 Start Drawing Pipeline';
        btn.classList.remove('btn-danger');
        btn.classList.add('btn-success');
    },
    
    addPipeline(pipeline, save = true) {
        // Validate
        if (!pipeline.id || !pipeline.segments || pipeline.segments.length === 0) {
            Core.showNotification('Invalid pipeline data', 'error');
            return false;
        }
        
        // Check duplicate
        if (this.pipelines.find(p => p.id === pipeline.id)) {
            Core.showNotification('Pipeline ID already exists', 'warning');
            return false;
        }
        
        // Set defaults
        pipeline.connectedDevices = pipeline.connectedDevices || [];
        pipeline.connectedGateWalls = pipeline.connectedGateWalls || [];
        pipeline.flowActive = pipeline.flowActive || false;
        pipeline.color = pipeline.color || '#FF0000';
        pipeline.pressure = pipeline.pressure || 0;
        pipeline.flowRate = pipeline.flowRate || 0;
        
        this.pipelines.push(pipeline);
        
        // Draw all segments
        pipeline.polylines = [];
        pipeline.segments.forEach(segment => {
            const line = L.polyline(segment, {
                color: pipeline.color,
                weight: 4,
                opacity: 0.8
            })
            .bindPopup(this.createPopup(pipeline))
            .addTo(map);
            
            pipeline.polylines.push(line);
        });
        
        if (save) {
            Core.saveToStorage();
            Core.showNotification('Pipeline added successfully!', 'success');
        }
        
        this.updateWaterFlow();
        return true;
    },
    
    createPopup(pipeline) {
        const connectedDevices = pipeline.connectedDevices
            .map(id => DeviceManager.getDeviceById(id))
            .filter(d => d)
            .map(d => d.name)
            .join(', ');
        
        const connectedGWs = pipeline.connectedGateWalls
            .map(id => GateWallManager.getGateWallById(id))
            .filter(gw => gw)
            .map(gw => gw.name)
            .join(', ');
        
        const totalLength = pipeline.segments.reduce((sum, seg) => sum + seg.length, 0);
        
        return `
            <div style="min-width: 220px;">
                <b>${pipeline.name}</b><br>
                <small>ID: ${pipeline.id}</small><br>
                <small>Status: ${pipeline.flowActive ? '🟢 Active Flow' : '🔴 No Flow'}</small><br>
                <small>Pressure: ${pipeline.pressure} PSI</small><br>
                <small>Flow Rate: ${pipeline.flowRate} L/min</small><br>
                <small>Points: ${totalLength}</small><br>
                ${connectedDevices ? `<small>🏭 Devices: ${connectedDevices}</small><br>` : ''}
                ${connectedGWs ? `<small>🚧 Gate Walls: ${connectedGWs}</small><br>` : ''}
                <div style="margin-top: 10px;">
                    <button onclick="PipelineManager.deletePipeline('${pipeline.id}')" 
                        style="width: 100%; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;">
                        🗑️ Delete Pipeline
                    </button>
                </div>
            </div>
        `;
    },
    
    updateWaterFlow() {
        this.pipelines.forEach(pipeline => {
            let hasActiveFlow = false;
            
            // Check connected gate walls for active flow
            for (let gwId of pipeline.connectedGateWalls) {
                const gw = GateWallManager.getGateWallById(gwId);
                if (gw && gw.isActive && gw.flowDirection !== 'none') {
                    hasActiveFlow = true;
                    break;
                }
            }
            
            // Update pipeline properties
            pipeline.flowActive = hasActiveFlow;
            pipeline.color = hasActiveFlow ? '#2196F3' : '#FF0000'; // Blue or Red
            pipeline.pressure = hasActiveFlow ? (Math.random() * 25 + 15).toFixed(1) : 0;
            pipeline.flowRate = hasActiveFlow ? (Math.random() * 50 + 100).toFixed(1) : 0;
            
            // Update visual representation
            if (pipeline.polylines) {
                pipeline.polylines.forEach(line => {
                    line.setStyle({ 
                        color: pipeline.color,
                        opacity: hasActiveFlow ? 1 : 0.5,
                        weight: hasActiveFlow ? 5 : 4
                    });
                    line.setPopupContent(this.createPopup(pipeline));
                });
            }
        });
        
        Core.saveToStorage();
    },
    
    deletePipeline(pipelineId) {
        if (!confirm('Delete this pipeline? This will remove all its connections.')) return;
        
        const idx = this.pipelines.findIndex(p => p.id === pipelineId);
        if (idx > -1) {
            const pipeline = this.pipelines[idx];
            
            // Remove from gate wall connections
            pipeline.connectedGateWalls.forEach(gwId => {
                const gw = GateWallManager.getGateWallById(gwId);
                if (gw && gw.connectedPipelines) {
                    const pIdx = gw.connectedPipelines.indexOf(pipelineId);
                    if (pIdx > -1) {
                        gw.connectedPipelines.splice(pIdx, 1);
                    }
                }
            });
            
            // Remove polylines from map
            if (pipeline.polylines) {
                pipeline.polylines.forEach(line => map.removeLayer(line));
            }
            
            this.pipelines.splice(idx, 1);
            Core.saveToStorage();
            Core.showNotification('Pipeline deleted', 'info');
        }
    },
    
    removeDeviceConnections(deviceId) {
        this.pipelines.forEach(pipeline => {
            const idx = pipeline.connectedDevices.indexOf(deviceId);
            if (idx > -1) {
                pipeline.connectedDevices.splice(idx, 1);
                Core.saveToStorage();
            }
        });
        this.updateWaterFlow();
    },
    
    removeGateWallConnections(gateWallId) {
        this.pipelines.forEach(pipeline => {
            const idx = pipeline.connectedGateWalls.indexOf(gateWallId);
            if (idx > -1) {
                pipeline.connectedGateWalls.splice(idx, 1);
                Core.saveToStorage();
            }
        });
        this.updateWaterFlow();
    },
    
    getAllPipelines() {
        return this.pipelines;
    },
    
    clearAll() {
        this.pipelines.forEach(p => {
            if (p.polylines) {
                p.polylines.forEach(line => map.removeLayer(line));
            }
        });
        this.pipelines = [];
        this.polylines = {};
    }
};