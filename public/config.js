class NotionTreeConfig {
    constructor() {
        this.initializeEventListeners();
        this.updateEmbedUrl();
    }

    initializeEventListeners() {
        const inputs = ['pageId', 'maxDepth', 'compact', 'showSearch', 'autoExpand', 'autoRefresh'];
        
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
        const pageId = this.extractPageId(pageIdInput);
        
        if (!pageId) {
            this.clearEmbedUrl();
            return;
        }

        const params = new URLSearchParams();
        params.set('pageId', pageId);
        
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
        
        embedUrlInput.value = embedUrl;
        copyBtn.disabled = false;
        
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
        
        // Set iframe dimensions
        previewFrame.style.width = '100%';
        previewFrame.style.height = '300px';
        previewFrame.style.border = '1px solid #e9ecef';
        previewFrame.style.borderRadius = '8px';
    }

    clearPreview() {
        const previewFrame = document.getElementById('previewFrame');
        const placeholder = document.getElementById('previewPlaceholder');
        
        previewFrame.src = '';
        previewFrame.style.display = 'none';
        placeholder.style.display = 'flex';
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NotionTreeConfig();
});