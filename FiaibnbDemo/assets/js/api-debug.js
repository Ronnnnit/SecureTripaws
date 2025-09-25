// API Debug Console JavaScript
class APIDebugConsole {
    constructor() {
        this.logs = [];
        this.isPaused = false;
        this.pollingInterval = null;
        this.lastLogCount = 0;
        this.autoScroll = true;
        this.showSuccess = true;
        this.showErrors = true;
        
        this.initializeElements();
        this.setupEventListeners();
        this.startPolling();
    }

    initializeElements() {
        this.consoleContent = document.getElementById('console-content');
        this.clearLogsBtn = document.getElementById('clear-logs-btn');
        this.pauseLogsBtn = document.getElementById('pause-logs-btn');
        this.resumeLogsBtn = document.getElementById('resume-logs-btn');
        this.statusDot = document.getElementById('status-dot');
        this.statusText = document.getElementById('status-text');
        
        // Stats elements
        this.totalRequests = document.getElementById('total-requests');
        this.successRate = document.getElementById('success-rate');
        this.avgResponseTime = document.getElementById('avg-response-time');
        this.errorCount = document.getElementById('error-count');
        
        // Filter checkboxes
        this.autoScrollCheckbox = document.getElementById('auto-scroll');
        this.showSuccessCheckbox = document.getElementById('show-success');
        this.showErrorsCheckbox = document.getElementById('show-errors');
    }

    setupEventListeners() {
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        this.pauseLogsBtn.addEventListener('click', () => this.pauseLogs());
        this.resumeLogsBtn.addEventListener('click', () => this.resumeLogs());
        
        this.autoScrollCheckbox.addEventListener('change', (e) => {
            this.autoScroll = e.target.checked;
        });
        
        this.showSuccessCheckbox.addEventListener('change', (e) => {
            this.showSuccess = e.target.checked;
            this.refreshDisplay();
        });
        
        this.showErrorsCheckbox.addEventListener('change', (e) => {
            this.showErrors = e.target.checked;
            this.refreshDisplay();
        });
    }

    async fetchLogs() {
        try {
            const response = await fetch('/api/logs');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                this.updateStatus('connected');
                this.processLogs(data.logs);
            } else {
                throw new Error(data.error || 'Failed to fetch logs');
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            this.updateStatus('disconnected');
        }
    }

    processLogs(newLogs) {
        if (newLogs.length !== this.lastLogCount) {
            this.logs = newLogs;
            this.lastLogCount = newLogs.length;
            this.updateStats();
            this.refreshDisplay();
        }
    }

    updateStats() {
        if (this.logs.length === 0) {
            this.totalRequests.textContent = '0';
            this.successRate.textContent = '0%';
            this.avgResponseTime.textContent = '0ms';
            this.errorCount.textContent = '0';
            return;
        }

        const totalRequests = this.logs.length;
        const successRequests = this.logs.filter(log => log.statusCode >= 200 && log.statusCode < 400).length;
        const errorRequests = this.logs.filter(log => log.statusCode >= 400).length;
        const avgResponseTime = this.logs.reduce((sum, log) => sum + (log.responseTime || 0), 0) / totalRequests;

        this.totalRequests.textContent = totalRequests.toLocaleString();
        this.successRate.textContent = Math.round((successRequests / totalRequests) * 100) + '%';
        this.avgResponseTime.textContent = Math.round(avgResponseTime) + 'ms';
        this.errorCount.textContent = errorRequests.toLocaleString();
    }

    refreshDisplay() {
        if (this.isPaused) return;

        // Clear console content
        this.consoleContent.innerHTML = '';

        // Filter logs based on checkboxes
        const filteredLogs = this.logs.filter(log => {
            if (log.statusCode >= 200 && log.statusCode < 400) {
                return this.showSuccess;
            } else if (log.statusCode >= 400) {
                return this.showErrors;
            }
            return true;
        });

        // Display logs
        filteredLogs.forEach(log => {
            this.addLogToConsole(log);
        });

        // Auto-scroll to bottom
        if (this.autoScroll) {
            this.consoleContent.scrollTop = this.consoleContent.scrollHeight;
        }
    }

    addLogToConsole(log) {
        const logElement = document.createElement('div');
        logElement.className = 'console-message new';
        
        const timestamp = new Date(log.timestamp).toLocaleTimeString();
        const method = log.method;
        const statusCode = log.statusCode;
        const responseTime = log.responseTime;
        const url = log.url;
        const source = log.source;

        // Determine log type and styling
        let logType = 'info';
        if (statusCode >= 200 && statusCode < 300) {
            logType = 'success';
        } else if (statusCode >= 400 && statusCode < 500) {
            logType = 'warning';
        } else if (statusCode >= 500) {
            logType = 'error';
        }

        logElement.classList.add(logType);

        // Determine status code class
        let statusClass = 'success';
        if (statusCode >= 400 && statusCode < 500) {
            statusClass = 'client-error';
        } else if (statusCode >= 500) {
            statusClass = 'server-error';
        }

        logElement.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="method ${method}">${method}</span>
            <span class="url">${url}</span>
            <span class="status-code ${statusClass}">${statusCode}</span>
            <span class="response-time">${responseTime}ms</span>
            <span class="source">${source}</span>
        `;

        this.consoleContent.appendChild(logElement);

        // Remove animation class after animation completes
        setTimeout(() => {
            logElement.classList.remove('new');
        }, 300);
    }

    async clearLogs() {
        try {
            const response = await fetch('/api/logs', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.logs = [];
                this.lastLogCount = 0;
                this.updateStats();
                this.refreshDisplay();
                
                // Add system message
                this.addSystemMessage('API logs cleared successfully', 'info');
            } else {
                throw new Error('Failed to clear logs');
            }
        } catch (error) {
            console.error('Error clearing logs:', error);
            this.addSystemMessage('Failed to clear logs: ' + error.message, 'error');
        }
    }

    pauseLogs() {
        this.isPaused = true;
        this.pauseLogsBtn.style.display = 'none';
        this.resumeLogsBtn.style.display = 'inline-block';
        this.addSystemMessage('Log monitoring paused', 'warning');
    }

    resumeLogs() {
        this.isPaused = false;
        this.pauseLogsBtn.style.display = 'inline-block';
        this.resumeLogsBtn.style.display = 'none';
        this.addSystemMessage('Log monitoring resumed', 'success');
        this.refreshDisplay();
    }

    addSystemMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `console-message ${type} new`;
        
        const timestamp = new Date().toLocaleTimeString();
        messageElement.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="message">${message}</span>
        `;

        this.consoleContent.appendChild(messageElement);

        // Auto-scroll to bottom
        if (this.autoScroll) {
            this.consoleContent.scrollTop = this.consoleContent.scrollHeight;
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            messageElement.classList.remove('new');
        }, 300);
    }

    updateStatus(status) {
        if (status === 'connected') {
            this.statusDot.classList.remove('disconnected');
            this.statusText.textContent = 'Connected';
        } else {
            this.statusDot.classList.add('disconnected');
            this.statusText.textContent = 'Disconnected';
        }
    }

    startPolling() {
        // Initial fetch
        this.fetchLogs();
        
        // Set up polling interval (every 2 seconds)
        this.pollingInterval = setInterval(() => {
            if (!this.isPaused) {
                this.fetchLogs();
            }
        }, 2000);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
}

// Initialize the API Debug Console when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const debugConsole = new APIDebugConsole();
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        debugConsole.stopPolling();
    });
});

// Handle page visibility changes to pause/resume polling
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause polling to save resources
        console.log('Page hidden - API Debug Console continues monitoring');
    } else {
        // Page is visible again
        console.log('Page visible - API Debug Console active');
    }
});
