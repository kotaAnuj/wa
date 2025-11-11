// ========================================
// CORE.JS - Core System Functions
// ========================================
const Core = {
    storageKey: 'iot_map_system_v1',
    
    init() {
        this.loadFromStorage();
    },
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
            color: ${type === 'warning' ? '#333' : 'white'};
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 13px;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    },
    
    saveToStorage() {
        const data = {
            devices: DeviceManager.getAllDevices(),
            gateWalls: GateWallManager.getAllGateWalls(),
            pipelines: PipelineManager.getAllPipelines(),
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save to storage:', e);
        }
    },
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load from storage:', e);
        }
        return null;
    },
    
    exportData() {
        const data = {
            devices: DeviceManager.getAllDevices(),
            gateWalls: GateWallManager.getAllGateWalls(),
            pipelines: PipelineManager.getAllPipelines(),
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iot-map-data-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    },
    
    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Clear existing
            DeviceManager.clearAll();
            GateWallManager.clearAll();
            PipelineManager.clearAll();
            
            // Import
            if (data.devices) {
                data.devices.forEach(d => DeviceManager.addDevice(d, false));
            }
            if (data.gateWalls) {
                data.gateWalls.forEach(gw => GateWallManager.addGateWall(gw, false));
            }
            if (data.pipelines) {
                data.pipelines.forEach(p => PipelineManager.addPipeline(p, false));
            }
            
            this.saveToStorage();
            this.showNotification('Data imported successfully!', 'success');
            HierarchySearch.buildHierarchy();
        } catch (e) {
            this.showNotification('Failed to import: ' + e.message, 'error');
        }
    }
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);