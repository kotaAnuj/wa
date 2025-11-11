// ========================================
// HIERARCHY.JS - Hierarchical Search System
// Country → State → District → Mandal → Habitation → Devices/GateWalls
// ========================================
const HierarchySearch = {
    hierarchy: {},
    
    init() {
        this.setupEventListeners();
        this.buildHierarchy();
    },
    
    setupEventListeners() {
        document.getElementById('searchCountry').onchange = (e) => this.onCountryChange(e.target.value);
        document.getElementById('searchState').onchange = (e) => this.onStateChange(e.target.value);
        document.getElementById('searchDistrict').onchange = (e) => this.onDistrictChange(e.target.value);
        document.getElementById('searchMandal').onchange = (e) => this.onMandalChange(e.target.value);
        document.getElementById('searchHabitation').onchange = (e) => this.onHabitationChange(e.target.value);
        document.getElementById('searchQuery').oninput = (e) => this.onSearchQuery(e.target.value);
    },
    
    buildHierarchy() {
        this.hierarchy = {};
        
        // Build from devices
        DeviceManager.getAllDevices().forEach(device => {
            this.addToHierarchy(device, 'device');
        });
        
        // Build from gate walls
        GateWallManager.getAllGateWalls().forEach(gw => {
            this.addToHierarchy(gw, 'gatewall');
        });
        
        // Populate country dropdown
        this.populateCountries();
    },
    
    addToHierarchy(item, type) {
        const country = item.country || 'India';
        const state = item.state || 'Unassigned';
        const district = item.district || 'Unassigned';
        const mandal = item.mandal || 'Unassigned';
        const habitation = item.habitation || 'Unassigned';
        
        // Build hierarchy tree
        if (!this.hierarchy[country]) {
            this.hierarchy[country] = {};
        }
        if (!this.hierarchy[country][state]) {
            this.hierarchy[country][state] = {};
        }
        if (!this.hierarchy[country][state][district]) {
            this.hierarchy[country][state][district] = {};
        }
        if (!this.hierarchy[country][state][district][mandal]) {
            this.hierarchy[country][state][district][mandal] = {};
        }
        if (!this.hierarchy[country][state][district][mandal][habitation]) {
            this.hierarchy[country][state][district][mandal][habitation] = {
                devices: [],
                gateWalls: []
            };
        }
        
        // Add item to appropriate list
        if (type === 'device') {
            this.hierarchy[country][state][district][mandal][habitation].devices.push(item);
        } else if (type === 'gatewall') {
            this.hierarchy[country][state][district][mandal][habitation].gateWalls.push(item);
        }
    },
    
    populateCountries() {
        const select = document.getElementById('searchCountry');
        const countries = Object.keys(this.hierarchy);
        
        if (countries.length > 0) {
            select.innerHTML = '<option value="">Select Country</option>' + 
                countries.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    },
    
    onCountryChange(country) {
        const stateSelect = document.getElementById('searchState');
        
        if (country && this.hierarchy[country]) {
            const states = Object.keys(this.hierarchy[country]).sort();
            stateSelect.innerHTML = '<option value="">Select State</option>' + 
                states.map(s => `<option value="${s}">${s}</option>`).join('');
            stateSelect.disabled = false;
        } else {
            stateSelect.innerHTML = '<option value="">Select State</option>';
            stateSelect.disabled = true;
        }
        
        this.resetDropdowns(['searchDistrict', 'searchMandal', 'searchHabitation']);
        this.clearResults();
    },
    
    onStateChange(state) {
        const country = document.getElementById('searchCountry').value;
        const districtSelect = document.getElementById('searchDistrict');
        
        if (country && state && this.hierarchy[country][state]) {
            const districts = Object.keys(this.hierarchy[country][state]).sort();
            districtSelect.innerHTML = '<option value="">Select District</option>' + 
                districts.map(d => `<option value="${d}">${d}</option>`).join('');
            districtSelect.disabled = false;
        } else {
            districtSelect.innerHTML = '<option value="">Select District</option>';
            districtSelect.disabled = true;
        }
        
        this.resetDropdowns(['searchMandal', 'searchHabitation']);
        this.clearResults();
    },
    
    onDistrictChange(district) {
        const country = document.getElementById('searchCountry').value;
        const state = document.getElementById('searchState').value;
        const mandalSelect = document.getElementById('searchMandal');
        
        if (country && state && district && this.hierarchy[country][state][district]) {
            const mandals = Object.keys(this.hierarchy[country][state][district]).sort();
            mandalSelect.innerHTML = '<option value="">Select Mandal</option>' + 
                mandals.map(m => `<option value="${m}">${m}</option>`).join('');
            mandalSelect.disabled = false;
        } else {
            mandalSelect.innerHTML = '<option value="">Select Mandal</option>';
            mandalSelect.disabled = true;
        }
        
        this.resetDropdowns(['searchHabitation']);
        this.clearResults();
    },
    
    onMandalChange(mandal) {
        const country = document.getElementById('searchCountry').value;
        const state = document.getElementById('searchState').value;
        const district = document.getElementById('searchDistrict').value;
        const habitationSelect = document.getElementById('searchHabitation');
        
        if (country && state && district && mandal && this.hierarchy[country][state][district][mandal]) {
            const habitations = Object.keys(this.hierarchy[country][state][district][mandal]).sort();
            habitationSelect.innerHTML = '<option value="">Select Habitation</option>' + 
                habitations.map(h => `<option value="${h}">${h}</option>`).join('');
            habitationSelect.disabled = false;
        } else {
            habitationSelect.innerHTML = '<option value="">Select Habitation</option>';
            habitationSelect.disabled = true;
        }
        
        this.clearResults();
    },
    
    onHabitationChange(habitation) {
        const country = document.getElementById('searchCountry').value;
        const state = document.getElementById('searchState').value;
        const district = document.getElementById('searchDistrict').value;
        const mandal = document.getElementById('searchMandal').value;
        
        if (country && state && district && mandal && habitation) {
            const data = this.hierarchy[country][state][district][mandal][habitation];
            
            // Combine devices and gate walls
            const items = [
                ...data.devices.map(d => ({ ...d, type: 'device' })),
                ...data.gateWalls.map(gw => ({ ...gw, type: 'gatewall' }))
            ];
            
            this.displayResults(items);
        }
    },
    
    onSearchQuery(query) {
        if (query.length < 2) {
            this.clearResults();
            return;
        }
        
        const results = [];
        const q = query.toLowerCase();
        
        // Search devices
        DeviceManager.getAllDevices().forEach(device => {
            if (device.name.toLowerCase().includes(q) || 
                device.id.toLowerCase().includes(q) ||
                (device.habitation && device.habitation.toLowerCase().includes(q)) ||
                (device.mandal && device.mandal.toLowerCase().includes(q)) ||
                (device.district && device.district.toLowerCase().includes(q))) {
                results.push({ ...device, type: 'device' });
            }
        });
        
        // Search gate walls
        GateWallManager.getAllGateWalls().forEach(gw => {
            if (gw.name.toLowerCase().includes(q) || 
                gw.id.toLowerCase().includes(q) ||
                (gw.habitation && gw.habitation.toLowerCase().includes(q)) ||
                (gw.mandal && gw.mandal.toLowerCase().includes(q)) ||
                (gw.district && gw.district.toLowerCase().includes(q))) {
                results.push({ ...gw, type: 'gatewall' });
            }
        });
        
        // Search pipelines
        PipelineManager.getAllPipelines().forEach(pipeline => {
            if (pipeline.name.toLowerCase().includes(q) || 
                pipeline.id.toLowerCase().includes(q)) {
                results.push({ ...pipeline, type: 'pipeline' });
            }
        });
        
        this.displayResults(results);
    },
    
    displayResults(items) {
        const container = document.getElementById('searchResults');
        const list = document.getElementById('searchResultsList');
        
        if (items.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        list.innerHTML = items.map(item => {
            let typeClass, typeName;
            
            if (item.type === 'device') {
                typeClass = item.device === 'ohsr' ? 'type-ohsr' : 'type-gateway';
                typeName = item.device.toUpperCase();
            } else if (item.type === 'gatewall') {
                typeClass = 'type-gatewall';
                typeName = 'GATE WALL';
            } else if (item.type === 'pipeline') {
                typeClass = 'type-pipeline';
                typeName = 'PIPELINE';
            }
            
            const location = item.habitation || item.mandal || item.district || 'N/A';
            
            return `
                <div class="result-item" onclick="HierarchySearch.selectItem('${item.id}', '${item.type}')">
                    <span class="item-type ${typeClass}">${typeName}</span>
                    <b>${item.name}</b><br>
                    <small>📍 ${location} • ID: ${item.id}</small>
                </div>
            `;
        }).join('');
        
        container.style.display = 'block';
    },
    
    selectItem(id, type) {
        if (type === 'device') {
            DeviceManager.showDetails(id);
        } else if (type === 'gatewall') {
            GateWallManager.showDetails(id);
        } else if (type === 'pipeline') {
            const pipeline = PipelineManager.getAllPipelines().find(p => p.id === id);
            if (pipeline && pipeline.segments.length > 0) {
                const firstSegment = pipeline.segments[0];
                const firstPoint = firstSegment[0];
                map.setView(firstPoint, 15);
                
                if (pipeline.polylines && pipeline.polylines[0]) {
                    pipeline.polylines[0].openPopup();
                }
                
                Core.showNotification(`Viewing: ${pipeline.name}`, 'info');
            }
        }
    },
    
    clearResults() {
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('searchResultsList').innerHTML = '';
    },
    
    resetDropdowns(ids) {
        ids.forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">Select...</option>';
            select.disabled = true;
        });
    }
};