// UI Module - Handles DOM manipulation and user interface interactions

class UIManager {
  constructor() {
    this.elements = {};
    this.initializeElements();
    this.setupEventListeners();
  }

  initializeElements() {
    // Header elements
    this.elements.refreshBtn = document.getElementById('refresh-btn');
    this.elements.configBtn = document.getElementById('config-btn');

    // Menu elements
    this.elements.menuBar = document.getElementById('menu-bar');
    this.elements.menuToggle = document.getElementById('menu-toggle');
    this.elements.menuLinks = document.querySelectorAll('.menu-link');

    // Page elements
    this.elements.pages = document.querySelectorAll('.page');
    this.elements.monitoringPage = document.getElementById('monitoring-page');
    this.elements.configurationPage = document.getElementById('configuration-page');

    // Monitoring page elements
    this.elements.testerCheckboxes = document.getElementById('tester-checkboxes');
    this.elements.selectedCount = document.getElementById('selected-count');
    this.elements.selectAllBtn = document.getElementById('select-all-btn');
    this.elements.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.elements.monitorBtn = document.getElementById('monitor-btn');
    this.elements.lastUpdate = document.getElementById('last-update');
    this.elements.connectionCount = document.getElementById('connection-count');
    this.elements.systemStatus = document.getElementById('system-status');
    this.elements.testersGrid = document.getElementById('testers-grid');

    // Configuration page elements
    this.elements.testersList = document.getElementById('testers-list');
    this.elements.addTesterBtn = document.getElementById('add-tester-btn');
    this.elements.testersPerRow = document.getElementById('testers-per-row');
    this.elements.refreshInterval = document.getElementById('refresh-interval');
    this.elements.saveSettingsBtn = document.getElementById('save-settings-btn');

    // Modal elements
    this.elements.configModal = document.getElementById('config-modal');
    this.elements.modalTitle = document.getElementById('modal-title');
    this.elements.modalClose = document.getElementById('modal-close');
    this.elements.modalCancel = document.getElementById('modal-cancel');
    this.elements.modalSave = document.getElementById('modal-save');
    this.elements.testerForm = document.getElementById('tester-form');
    this.elements.testerId = document.getElementById('tester-id');
    this.elements.testerDisplayName = document.getElementById('tester-display-name');
    this.elements.testerUrl = document.getElementById('tester-url');

    // Loading and notification elements
    this.elements.loadingOverlay = document.getElementById('loading-overlay');
    this.elements.toastContainer = document.getElementById('toast-container');
  }

  setupEventListeners() {
    // Menu toggle
    this.elements.menuToggle.addEventListener('click', () => {
      this.toggleMenu();
    });

    // Menu navigation
    this.elements.menuLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.showPage(page);
      });
    });

    // Header actions
    this.elements.refreshBtn.addEventListener('click', () => {
      this.emit('ui:refresh');
    });

    this.elements.configBtn.addEventListener('click', () => {
      this.showPage('configuration');
    });

    // Monitoring page actions
    this.elements.selectAllBtn.addEventListener('click', () => {
      this.emit('ui:selectAllTesters');
    });

    this.elements.deselectAllBtn.addEventListener('click', () => {
      this.emit('ui:deselectAllTesters');
    });

    this.elements.monitorBtn.addEventListener('click', () => {
      this.emit('ui:toggleMonitoring');
    });

    // Configuration page actions
    this.elements.addTesterBtn.addEventListener('click', () => {
      this.showTesterModal();
    });

    this.elements.saveSettingsBtn.addEventListener('click', () => {
      this.emit('ui:saveDisplaySettings', {
        testersPerRow: parseInt(this.elements.testersPerRow.value),
        refreshInterval: parseInt(this.elements.refreshInterval.value)
      });
    });

    // Modal actions
    this.elements.modalClose.addEventListener('click', () => {
      this.hideModal();
    });

    this.elements.modalCancel.addEventListener('click', () => {
      this.hideModal();
    });

    this.elements.modalSave.addEventListener('click', () => {
      this.emit('ui:saveTester', this.getTesterFormData());
    });

    // Close modal on outside click
    this.elements.configModal.addEventListener('click', (e) => {
      if (e.target === this.elements.configModal) {
        this.hideModal();
      }
    });

    // Form validation
    this.elements.testerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.emit('ui:saveTester', this.getTesterFormData());
    });
  }

  // Menu management
  toggleMenu() {
    this.elements.menuBar.classList.toggle('collapsed');
    
    // On mobile, toggle mobile-open class instead
    if (window.innerWidth <= 768) {
      this.elements.menuBar.classList.toggle('mobile-open');
    }
  }

  // Page management
  showPage(pageName) {
    // Hide all pages
    this.elements.pages.forEach(page => {
      page.classList.remove('active');
    });

    // Show selected page
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
      selectedPage.classList.add('active');
    }

    // Update menu active state
    this.elements.menuLinks.forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === pageName) {
        link.classList.add('active');
      }
    });

    // Close mobile menu
    if (window.innerWidth <= 768) {
      this.elements.menuBar.classList.remove('mobile-open');
    }
  }

  // Tester selection UI
  renderTesterCheckboxes(testers) {
    this.elements.testerCheckboxes.innerHTML = '';

    testers.forEach(tester => {
      const checkbox = document.createElement('div');
      checkbox.className = 'tester-checkbox';
      
      checkbox.innerHTML = `
        <input type="checkbox" id="tester-${tester.id}" value="${tester.id}">
        <label for="tester-${tester.id}">${tester.display_name}</label>
      `;

      const input = checkbox.querySelector('input');
      input.addEventListener('change', () => {
        this.emit('ui:testerSelectionChanged', {
          id: tester.id,
          selected: input.checked
        });
      });

      this.elements.testerCheckboxes.appendChild(checkbox);
    });
  }

  updateTesterSelection(selectedTesters) {
    const checkboxes = this.elements.testerCheckboxes.querySelectorAll('input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
      const testerId = checkbox.value;
      checkbox.checked = selectedTesters.includes(testerId);
    });

    this.elements.selectedCount.textContent = `${selectedTesters.length} selected`;
    this.elements.monitorBtn.disabled = selectedTesters.length === 0;
  }

  // Testers grid UI
  renderTestersGrid(testersData, displaySettings) {
    this.elements.testersGrid.innerHTML = '';
    this.elements.testersGrid.className = 'testers-grid';
    
    if (displaySettings && displaySettings.testersPerRow) {
      this.elements.testersGrid.classList.add(`testers-${displaySettings.testersPerRow}`);
      this.elements.testersGrid.style.setProperty('--testers-per-row', displaySettings.testersPerRow);
    }

    testersData.forEach(testerData => {
      const testerCard = this.createTesterCard(testerData);
      this.elements.testersGrid.appendChild(testerCard);
    });
  }

  createTesterCard(testerData) {
    const card = document.createElement('div');
    card.className = 'tester-card';
    card.dataset.testerId = testerData.testerId;

    const tester = configManager.getTester(testerData.testerId);
    const testerUrl = tester ? tester.url : '#';

    card.innerHTML = `
      <div class="tester-card-header">
        <h3 class="tester-card-title">${testerData.testerId.toUpperCase()}</h3>
        <a href="${testerUrl}" target="_blank" class="tester-card-link" title="Open tester page">🔗</a>
      </div>
      <div class="tester-card-status">
        <div class="status-badge testing">
          <span class="status-badge-label">TESTING</span>
          <span class="status-badge-value">${testerData.summary.testing}</span>
        </div>
        <div class="status-badge failing">
          <span class="status-badge-label">FAILING</span>
          <span class="status-badge-value">${testerData.summary.failing}</span>
        </div>
        <div class="status-badge passed">
          <span class="status-badge-label">PASSED</span>
          <span class="status-badge-value">${testerData.summary.passed}</span>
        </div>
        <div class="status-badge failed">
          <span class="status-badge-label">FAILED</span>
          <span class="status-badge-value">${testerData.summary.failed}</span>
        </div>
        <div class="status-badge aborted">
          <span class="status-badge-label">ABORTED</span>
          <span class="status-badge-value">${testerData.summary.aborted}</span>
        </div>
      </div>
      <div class="tester-card-content">
        ${testerData.slots.map(slot => this.createSlotCard(slot)).join('')}
      </div>
    `;

    // Add click event to navigate to tester URL
    card.addEventListener('click', (e) => {
      // Don't navigate if clicking on the link
      if (!e.target.classList.contains('tester-card-link')) {
        window.open(testerUrl, '_blank');
      }
    });

    return card;
  }

  createSlotCard(slot) {
    return `
      <div class="slot-card">
        <div class="slot-card-header">
          <span class="slot-card-id">${slot.slotId}</span>
          <span class="slot-card-status ${slot.status.toLowerCase()}">${slot.status}</span>
        </div>
        <div class="slot-card-body">
          <span class="slot-card-sn">SN: ${slot.serialNumber}</span>
          <span class="slot-card-time">${slot.testTime}</span>
        </div>
        <div class="slot-card-footer">
          <span class="slot-card-production">${slot.production}</span>
          <span class="slot-card-project">${slot.project}</span>
        </div>
      </div>
    `;
  }

  // Configuration page UI
  renderTestersList(testers) {
    this.elements.testersList.innerHTML = '';

    testers.forEach(tester => {
      const testerItem = document.createElement('div');
      testerItem.className = 'tester-item';

      testerItem.innerHTML = `
        <div class="tester-info">
          <div class="tester-id">${tester.display_name}</div>
          <div class="tester-details">
            ID: ${tester.id} | 
            <a href="${tester.url}" target="_blank" class="tester-url">${tester.url}</a>
          </div>
        </div>
        <div class="tester-actions">
          <button class="btn btn-sm btn-secondary edit-tester" data-id="${tester.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-tester" data-id="${tester.id}">Delete</button>
        </div>
      `;

      // Add event listeners
      const editBtn = testerItem.querySelector('.edit-tester');
      const deleteBtn = testerItem.querySelector('.delete-tester');

      editBtn.addEventListener('click', () => {
        this.emit('ui:editTester', tester.id);
      });

      deleteBtn.addEventListener('click', () => {
        this.emit('ui:deleteTester', tester.id);
      });

      this.elements.testersList.appendChild(testerItem);
    });
  }

  updateDisplaySettings(settings) {
    this.elements.testersPerRow.value = settings.testersPerRow;
    this.elements.refreshInterval.value = settings.refreshInterval;
  }

  // Modal management
  showTesterModal(tester = null) {
    if (tester) {
      this.elements.modalTitle.textContent = 'Edit Tester';
      this.elements.testerId.value = tester.id;
      this.elements.testerDisplayName.value = tester.display_name;
      this.elements.testerUrl.value = tester.url;
      this.elements.testerId.disabled = true; // Don't allow editing ID
    } else {
      this.elements.modalTitle.textContent = 'Add Tester';
      this.elements.testerForm.reset();
      this.elements.testerId.disabled = false;
    }

    this.elements.configModal.classList.add('active');
  }

  hideModal() {
    this.elements.configModal.classList.remove('active');
    this.elements.testerForm.reset();
  }

  getTesterFormData() {
    return {
      id: this.elements.testerId.value.trim(),
      display_name: this.elements.testerDisplayName.value.trim(),
      url: this.elements.testerUrl.value.trim()
    };
  }

  // Status updates
  updateLastUpdate(timestamp) {
    if (timestamp) {
      const date = new Date(timestamp);
      this.elements.lastUpdate.textContent = date.toLocaleTimeString();
    } else {
      this.elements.lastUpdate.textContent = 'Never';
    }
  }

  updateConnectionCount(count) {
    this.elements.connectionCount.textContent = count;
  }

  updateSystemStatus(status, isConnected) {
    this.elements.systemStatus.textContent = status;
    this.elements.systemStatus.className = 'status-value';
    
    if (isConnected) {
      this.elements.systemStatus.classList.add('status-connected');
    } else {
      this.elements.systemStatus.classList.add('status-disconnected');
    }
  }

  updateMonitorButton(isMonitoring) {
    if (isMonitoring) {
      this.elements.monitorBtn.textContent = 'Stop Monitoring';
      this.elements.monitorBtn.classList.remove('btn-primary');
      this.elements.monitorBtn.classList.add('btn-danger');
    } else {
      this.elements.monitorBtn.textContent = 'Start Monitoring';
      this.elements.monitorBtn.classList.remove('btn-danger');
      this.elements.monitorBtn.classList.add('btn-primary');
    }
  }

  // Loading and notifications
  showLoading() {
    this.elements.loadingOverlay.classList.remove('hidden');
  }

  hideLoading() {
    this.elements.loadingOverlay.classList.add('hidden');
  }

  showToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <button class="toast-close">&times;</button>
      </div>
      <div class="toast-message">${message}</div>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    this.elements.toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.removeToast(toast);
      }, duration);
    }

    return toast;
  }

  removeToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  // Event system
  on(event, handler) {
    if (!this.eventHandlers) {
      this.eventHandlers = new Map();
    }
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers && this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in UI event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const ui = new UIManager();