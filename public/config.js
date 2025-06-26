class NotionTreeConfig {
    constructor() {
        this.userApiKey = '';
        this.savedEmbeds = [];
        this.savedPages = [];
        this.initializeEventListeners();
        this.updateEmbedUrl();
        this.setupApiKeyHandling();
    }

    initializeEventListeners() {
        const inputs = ['pageId', 'multiPageIds', 'maxDepth', 'compact', 'showSearch', 'autoExpand', 'autoRefresh'];
        
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => this.updateEmbedUrl());
                element.addEventListener('change', () => this.updateEmbedUrl());
            }
        });

        const copyBtn = document.getElementById('copyUrl');
        copyBtn.addEventListener('click', () => this.copyEmbedUrl());
    }

    extractPageId(input) {
        if (!input) return null;
        
        // Extract from full Notion URL with workspace prefix and query params
        // Matches: notion.so/workspace/Page-Title-199d606e3bdf8009975adb93ae6a52a7?source=copy_link
        const urlPatternWithWorkspace = /notion\.so\/[^\/]+\/[^\/]*-([a-f0-9]{32})(?:\?.*)?$/i;
        const workspaceMatch = input.match(urlPatternWithWorkspace);
        if (workspaceMatch) {
            return workspaceMatch[1];
        }
        
        // Extract from simple Notion URL
        // Matches: notion.so/199d606e3bdf8009975adb93ae6a52a7
        const urlPattern = /notion\.so\/([a-f0-9]{32})(?:\?.*)?$/i;
        const match = input.match(urlPattern);
        if (match) {
            return match[1];
        }
        
        // Extract from page ID with dashes
        const dashedPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
        const dashedMatch = input.match(dashedPattern);
        if (dashedMatch) {
            return dashedMatch[1].replace(/-/g, '');
        }
        
        // Clean ID (remove any non-hex characters)
        const cleanId = input.replace(/[^a-f0-9]/gi, '');
        if (cleanId.length === 32) {
            return cleanId;
        }
        
        return null; // Return null instead of input.trim() for invalid IDs
    }

    updateEmbedUrl() {
        const pageIdInput = document.getElementById('pageId').value.trim();
        const multiPageIdsInput = document.getElementById('multiPageIds').value.trim();
        
        let effectivePageIds;
        let hasPageIds = false;
        
        // Check if multiple page IDs are provided
        if (multiPageIdsInput) {
            const lines = multiPageIdsInput.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
            
            const extractedIds = lines
                .map(line => this.extractPageId(line))
                .filter(id => id !== null);
            
            if (extractedIds.length > 0) {
                effectivePageIds = extractedIds.join(',');
                hasPageIds = true;
            }
        } else if (pageIdInput) {
            // Single page ID
            const pageId = this.extractPageId(pageIdInput);
            if (pageId) {
                effectivePageIds = pageId;
                hasPageIds = true;
            }
        }

        const params = new URLSearchParams();
        
        // Only add page parameters if we have valid page IDs
        if (hasPageIds) {
            if (multiPageIdsInput) {
                params.set('pageIds', effectivePageIds);
            } else {
                params.set('pageId', effectivePageIds);
            }
        }
        
        // Get configuration values
        const maxDepth = document.getElementById('maxDepth').value;
        const compact = document.getElementById('compact').checked;
        const showSearch = document.getElementById('showSearch').checked;
        const autoExpand = document.getElementById('autoExpand').checked;
        const autoRefresh = parseInt(document.getElementById('autoRefresh').value) || 0;
        
        // Only add non-default values to keep URL clean
        if (maxDepth !== '3') {
            params.set('maxDepth', maxDepth);
        }
        if (compact) {
            params.set('compact', 'true');
        }
        if (!showSearch) {
            params.set('showSearch', 'false');
        }
        if (autoExpand) {
            params.set('autoExpand', 'true');
        }
        if (autoRefresh > 0) {
            params.set('autoRefresh', autoRefresh.toString());
        }

        const baseUrl = window.location.origin;
        const embedUrl = `${baseUrl}/embed?${params.toString()}`;
        
        // Update the embed URL display
        const embedUrlInput = document.getElementById('embedUrl');
        const copyBtn = document.getElementById('copyUrl');
        const saveBtn = document.getElementById('saveEmbed');
        
        embedUrlInput.value = embedUrl;
        copyBtn.disabled = false;
        saveBtn.disabled = !this.userApiKey;
        
        // Update preview
        this.updatePreview(embedUrl);
    }

    clearEmbedUrl() {
        const embedUrlInput = document.getElementById('embedUrl');
        const copyBtn = document.getElementById('copyUrl');
        
        embedUrlInput.value = '';
        copyBtn.disabled = true;
        
        this.clearPreview();
    }

    updatePreview(embedUrl) {
        const previewFrame = document.getElementById('previewFrame');
        const placeholder = document.getElementById('previewPlaceholder');
        
        previewFrame.src = embedUrl;
        previewFrame.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Remove fixed dimensions - let CSS handle responsive sizing
        // The iframe will now expand to fill its container
    }

    clearPreview() {
        const previewFrame = document.getElementById('previewFrame');
        const placeholder = document.getElementById('previewPlaceholder');
        
        previewFrame.src = '';
        previewFrame.style.display = 'none';
        placeholder.style.display = 'flex';
    }

    generateEmptyEmbed() {
        // Clear all page inputs
        document.getElementById('pageId').value = '';
        document.getElementById('multiPageIds').value = '';
        
        // Force update to generate empty embed URL
        this.updateEmbedUrl();
        
        this.showNotification('Empty embed URL generated! Use the + button in the embed to add pages dynamically.');
    }

    async copyEmbedUrl() {
        const embedUrlInput = document.getElementById('embedUrl');
        const copyBtn = document.getElementById('copyUrl');
        
        if (!embedUrlInput.value) return;
        
        try {
            await navigator.clipboard.writeText(embedUrlInput.value);
            
            // Visual feedback
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#27ae60';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy URL:', err);
            
            // Fallback: select the text
            embedUrlInput.select();
            embedUrlInput.setSelectionRange(0, 99999);
            
            try {
                document.execCommand('copy');
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000);
            } catch (fallbackErr) {
                console.error('Fallback copy also failed:', fallbackErr);
            }
        }
    }

    setupApiKeyHandling() {
        const apiKeyInput = document.getElementById('apiKey');
        apiKeyInput.addEventListener('input', (e) => {
            this.userApiKey = e.target.value;
            this.updateButtonStates();
            
            if (this.userApiKey) {
                this.loadSavedData();
            } else {
                this.hideSavedSections();
            }
        });
    }

    updateButtonStates() {
        const saveBtn = document.getElementById('saveEmbed');
        if (saveBtn) {
            saveBtn.disabled = !this.userApiKey;
        }
    }

    async loadSavedData() {
        if (!this.userApiKey) return;
        
        try {
            // Load saved embeds
            const embedsResponse = await fetch('/api/embeds/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: this.userApiKey })
            });
            
            if (embedsResponse.ok) {
                const embedsData = await embedsResponse.json();
                this.savedEmbeds = embedsData.embeds || [];
                this.renderSavedEmbeds();
                document.getElementById('savedEmbedsSection').style.display = 'block';
            }

            // Load saved pages
            const pagesResponse = await fetch('/api/pages/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: this.userApiKey })
            });
            
            if (pagesResponse.ok) {
                const pagesData = await pagesResponse.json();
                this.savedPages = pagesData.pages || [];
                this.renderSavedPages();
                document.getElementById('savedPagesSection').style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load saved data:', error);
        }
    }

    hideSavedSections() {
        document.getElementById('savedEmbedsSection').style.display = 'none';
        document.getElementById('savedPagesSection').style.display = 'none';
    }

    renderSavedEmbeds() {
        const container = document.getElementById('savedEmbedsContainer');
        container.innerHTML = '';

        if (this.savedEmbeds.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No saved embeds yet.</p>';
            return;
        }

        this.savedEmbeds.forEach(embed => {
            const embedCard = this.createEmbedCard(embed);
            container.appendChild(embedCard);
        });
    }

    createEmbedCard(embed) {
        const card = document.createElement('div');
        card.className = 'saved-item';
        
        const createdDate = new Date(embed.createdAt).toLocaleDateString();
        const pageCount = embed.pageIds.length;
        
        card.innerHTML = `
            <div class="saved-item-header">
                <h4 class="saved-item-title">${embed.name}</h4>
                <div class="saved-item-actions">
                    <button class="saved-item-btn copy" onclick="configInstance.copyEmbedUrlById('${embed.id}')">Copy</button>
                    <button class="saved-item-btn use" onclick="configInstance.useEmbed('${embed.id}')">Use</button>
                    <button class="saved-item-btn delete" onclick="configInstance.deleteEmbed('${embed.id}')">Delete</button>
                </div>
            </div>
            ${embed.description ? `<div class="saved-item-description">${embed.description}</div>` : ''}
            <div class="saved-item-meta">
                ${pageCount} page${pageCount !== 1 ? 's' : ''} • Created ${createdDate}
            </div>
        `;
        
        return card;
    }

    renderSavedPages() {
        const container = document.getElementById('savedPagesContainer');
        const existingButton = container.querySelector('button');
        container.innerHTML = '';

        if (this.savedPages.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No saved pages yet.</p>';
        } else {
            this.savedPages.forEach(page => {
                const pageCard = this.createPageCard(page);
                container.appendChild(pageCard);
            });
        }
    }

    createPageCard(page) {
        const card = document.createElement('div');
        card.className = 'saved-item';
        
        const savedDate = new Date(page.savedAt).toLocaleDateString();
        
        card.innerHTML = `
            <div class="saved-item-header">
                <h4 class="saved-item-title">${page.name}</h4>
                <div class="saved-item-actions">
                    <button class="saved-item-btn use" onclick="configInstance.usePage('${page.id}')">Use</button>
                    <button class="saved-item-btn copy" onclick="configInstance.copyPageId('${page.id}')">Copy ID</button>
                </div>
            </div>
            ${page.description ? `<div class="saved-item-description">${page.description}</div>` : ''}
            <div class="saved-item-meta">
                ID: ${page.id.substring(0, 8)}... • Saved ${savedDate}
            </div>
        `;
        
        return card;
    }

    async copyEmbedUrlById(embedId) {
        const embed = this.savedEmbeds.find(e => e.id === embedId);
        if (!embed) return;
        
        const embedUrl = this.buildEmbedUrl(embed.config, embed.pageIds);
        
        try {
            await navigator.clipboard.writeText(embedUrl);
            this.showNotification('Embed URL copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy embed URL:', error);
        }
    }

    buildEmbedUrl(config, pageIds) {
        const params = new URLSearchParams();
        
        if (pageIds.length === 1) {
            params.set('pageId', pageIds[0]);
        } else if (pageIds.length > 1) {
            params.set('pageIds', pageIds.join(','));
        }
        
        Object.entries(config).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params.set(key, value);
            }
        });
        
        return `${window.location.origin}/embed?${params.toString()}`;
    }

    useEmbed(embedId) {
        const embed = this.savedEmbeds.find(e => e.id === embedId);
        if (!embed) return;
        
        // Update form with embed config
        if (embed.pageIds.length === 1) {
            document.getElementById('pageId').value = embed.pageIds[0];
            document.getElementById('multiPageIds').value = '';
        } else {
            document.getElementById('pageId').value = '';
            document.getElementById('multiPageIds').value = embed.pageIds.join('\n');
        }
        
        Object.entries(embed.config).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value === 'true' || value === true;
                } else {
                    element.value = value;
                }
            }
        });
        
        this.updateEmbedUrl();
        this.showNotification(`Loaded embed: ${embed.name}`);
    }

    usePage(pageId) {
        document.getElementById('pageId').value = pageId;
        document.getElementById('multiPageIds').value = '';
        this.updateEmbedUrl();
        
        const page = this.savedPages.find(p => p.id === pageId);
        this.showNotification(`Using page: ${page.name}`);
    }

    async copyPageId(pageId) {
        try {
            await navigator.clipboard.writeText(pageId);
            this.showNotification('Page ID copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy page ID:', error);
        }
    }

    async deleteEmbed(embedId) {
        if (!confirm('Are you sure you want to delete this embed?')) return;
        
        try {
            const response = await fetch(`/api/embeds/${embedId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: this.userApiKey })
            });
            
            if (response.ok) {
                this.savedEmbeds = this.savedEmbeds.filter(e => e.id !== embedId);
                this.renderSavedEmbeds();
                this.showNotification('Embed deleted successfully');
            } else {
                throw new Error('Failed to delete embed');
            }
        } catch (error) {
            console.error('Delete embed error:', error);
            this.showNotification('Failed to delete embed', 'error');
        }
    }

    showNotification(message, type = 'success') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            color: white;
            border-radius: 6px;
            z-index: 1001;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Modal functions (global scope for onclick handlers)
function showSaveEmbedModal() {
    const modal = document.getElementById('saveEmbedModal');
    const apiKeyInput = document.getElementById('saveApiKey');
    
    // Pre-fill API key if available
    apiKeyInput.value = configInstance.userApiKey;
    
    modal.style.display = 'flex';
}

function closeSaveEmbedModal() {
    const modal = document.getElementById('saveEmbedModal');
    modal.style.display = 'none';
    
    // Clear form
    document.getElementById('embedName').value = '';
    document.getElementById('embedDescription').value = '';
    document.getElementById('saveApiKey').value = '';
}

function showSavePageModal() {
    const modal = document.getElementById('savePageModal');
    const currentPageIdInput = document.getElementById('currentPageId');
    const apiKeyInput = document.getElementById('savePageApiKey');
    
    // Get current page ID
    const pageId = document.getElementById('pageId').value;
    const multiPageIds = document.getElementById('multiPageIds').value;
    
    if (pageId) {
        currentPageIdInput.value = pageId;
    } else if (multiPageIds) {
        const firstPageId = configInstance.extractPageId(multiPageIds.split('\n')[0]);
        currentPageIdInput.value = firstPageId || '';
    } else {
        currentPageIdInput.value = '';
    }
    
    // Pre-fill API key if available
    apiKeyInput.value = configInstance.userApiKey;
    
    modal.style.display = 'flex';
}

function closeSavePageModal() {
    const modal = document.getElementById('savePageModal');
    modal.style.display = 'none';
    
    // Clear form
    document.getElementById('pageName').value = '';
    document.getElementById('pageDescription').value = '';
    document.getElementById('savePageApiKey').value = '';
}

async function saveEmbedConfig() {
    const name = document.getElementById('embedName').value.trim();
    const description = document.getElementById('embedDescription').value.trim();
    const apiKey = document.getElementById('saveApiKey').value.trim();
    
    if (!name) {
        alert('Please enter an embed name');
        return;
    }
    
    if (!apiKey) {
        alert('Please enter your API key');
        return;
    }
    
    // Get current configuration
    const config = {
        maxDepth: document.getElementById('maxDepth').value,
        compact: document.getElementById('compact').checked.toString(),
        showSearch: document.getElementById('showSearch').checked.toString(),
        autoExpand: document.getElementById('autoExpand').checked.toString(),
        autoRefresh: document.getElementById('autoRefresh').value
    };
    
    // Get page IDs
    const pageId = document.getElementById('pageId').value;
    const multiPageIds = document.getElementById('multiPageIds').value;
    let pageIds = [];
    
    if (multiPageIds.trim()) {
        pageIds = multiPageIds.split('\n')
            .map(line => configInstance.extractPageId(line.trim()))
            .filter(id => id);
    } else if (pageId) {
        const extractedId = configInstance.extractPageId(pageId);
        if (extractedId) pageIds = [extractedId];
    }
    
    const embedData = {
        name,
        description,
        config,
        pageIds
    };
    
    try {
        const response = await fetch('/api/embeds/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, embed: embedData })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            configInstance.showNotification('Embed saved successfully!');
            closeSaveEmbedModal();
            configInstance.loadSavedData(); // Refresh the list
        } else {
            throw new Error(result.error || 'Failed to save embed');
        }
    } catch (error) {
        console.error('Save embed error:', error);
        alert(`Failed to save embed: ${error.message}`);
    }
}

async function savePageId() {
    const name = document.getElementById('pageName').value.trim();
    const description = document.getElementById('pageDescription').value.trim();
    const pageIdValue = document.getElementById('currentPageId').value.trim();
    const apiKey = document.getElementById('savePageApiKey').value.trim();
    
    if (!name || !pageIdValue || !apiKey) {
        alert('Please fill in all required fields');
        return;
    }
    
    const pageData = {
        name,
        description,
        pageId: pageIdValue,
        url: `https://notion.so/${pageIdValue}`
    };
    
    try {
        const response = await fetch('/api/pages/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey, pageData })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            configInstance.showNotification('Page saved successfully!');
            closeSavePageModal();
            configInstance.loadSavedData(); // Refresh the list
        } else {
            throw new Error(result.error || 'Failed to save page');
        }
    } catch (error) {
        console.error('Save page error:', error);
        alert(`Failed to save page: ${error.message}`);
    }
}

// Global instance for modal handlers
let configInstance;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    configInstance = new NotionTreeConfig();
});