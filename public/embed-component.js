class NotionEmbedTree {
    constructor() {
        this.treeData = null;
        this.searchTerm = '';
        this.collapsedNodes = new Set();
        this.config = this.parseUrlParams();
        this.autoRefreshInterval = null;
        
        this.init();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            pageId: params.get('pageId'),
            pageIds: params.get('pageIds'), // Support multiple page IDs
            theme: params.get('theme') || 'light',
            compact: params.get('compact') === 'true',
            showSearch: params.get('showSearch') !== 'false',
            maxDepth: parseInt(params.get('maxDepth')) || 3,
            autoExpand: params.get('autoExpand') === 'true',
            autoRefresh: parseInt(params.get('autoRefresh')) || 0 // Auto-refresh rate in seconds (0 = disabled)
        };
    }

    init() {
        // Apply theme and size classes
        if (this.config.compact) {
            document.body.classList.add('compact');
        }
        
        // Show/hide search based on config
        const searchContainer = document.getElementById('searchContainer');
        if (this.config.showSearch) {
            searchContainer.classList.remove('hidden');
        }

        this.initializeEventListeners();
        
        const effectivePageId = this.config.pageIds || this.config.pageId;
        if (effectivePageId) {
            this.loadTree(effectivePageId);
        } else {
            this.showError('No page ID provided');
        }

        // Auto-resize iframe
        this.setupAutoResize();
        
        // Setup auto-refresh if enabled
        this.setupAutoRefresh();
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchToggle = document.getElementById('searchToggle');
        const refreshButton = document.getElementById('refreshButton');
        const expandAllButton = document.getElementById('expandAllButton');
        const collapseAllButton = document.getElementById('collapseAllButton');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.updateTreeDisplay();
            });
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', () => {
                const searchContainer = document.getElementById('searchContainer');
                const isHidden = searchContainer.classList.contains('hidden');
                
                if (isHidden) {
                    searchContainer.classList.remove('hidden');
                    searchInput.focus();
                } else {
                    searchContainer.classList.add('hidden');
                    searchInput.value = '';
                    this.searchTerm = '';
                    this.updateTreeDisplay();
                }
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshTree();
            });
        }

        if (expandAllButton) {
            expandAllButton.addEventListener('click', () => {
                this.expandAllNodes();
            });
        }

        if (collapseAllButton) {
            collapseAllButton.addEventListener('click', () => {
                this.collapseAllNodes();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + R for refresh
            if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshTree();
            }
            // Cmd/Ctrl + E for expand all
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                this.expandAllNodes();
            }
            // Cmd/Ctrl + Shift + E for collapse all
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                this.collapseAllNodes();
            }
        });
    }

    setupAutoResize() {
        const resizeObserver = new ResizeObserver(() => {
            this.notifyParentOfResize();
        });
        
        resizeObserver.observe(document.getElementById('embedContainer'));
        
        // Initial resize
        setTimeout(() => this.notifyParentOfResize(), 100);
    }

    notifyParentOfResize() {
        const container = document.getElementById('embedContainer');
        const height = Math.max(container.scrollHeight, 120);
        
        // Send resize message to parent (Notion)
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'notion-tree-resize',
                height: height
            }, '*');
        }
        
        // Also set iframe height directly if possible
        if (window.frameElement) {
            window.frameElement.style.height = height + 'px';
        }
    }

    async loadTree(pageId) {
        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`/api/tree/${pageId}?maxDepth=${this.config.maxDepth}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.treeData = await response.json();
            this.renderTree();
            
            if (this.config.autoExpand) {
                this.expandAllNodes();
            }
            
        } catch (error) {
            console.error('Error loading tree:', error);
            this.showError(`Failed to load tree: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async refreshTree() {
        const effectivePageId = this.config.pageIds || this.config.pageId;
        if (!effectivePageId) {
            this.showError('No page ID to refresh');
            return;
        }

        const refreshButton = document.getElementById('refreshButton');
        
        // Store current state
        const currentSearchTerm = this.searchTerm;
        const currentCollapsedNodes = new Set(this.collapsedNodes);
        
        // Show refresh animation
        if (refreshButton) {
            refreshButton.classList.add('refreshing');
            refreshButton.disabled = true;
        }

        try {
            // Add cache busting parameter to force fresh data
            const cacheBust = Date.now();
            const response = await fetch(`/api/tree/${effectivePageId}?maxDepth=${this.config.maxDepth}&_cb=${cacheBust}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.treeData = await response.json();
            this.renderTree();
            
            // Restore previous state
            this.searchTerm = currentSearchTerm;
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = currentSearchTerm;
            }
            
            // Restore collapsed state for nodes that still exist
            this.collapsedNodes = new Set();
            currentCollapsedNodes.forEach(nodeId => {
                const nodeExists = document.querySelector(`[data-id="${nodeId}"]`);
                if (nodeExists) {
                    this.collapsedNodes.add(nodeId);
                    nodeExists.classList.add('collapsed');
                    const toggle = nodeExists.querySelector('.tree-toggle');
                    if (toggle) {
                        toggle.textContent = '▶';
                    }
                }
            });
            
            this.updateTreeDisplay();
            
            // Show brief success feedback
            if (refreshButton) {
                const originalTitle = refreshButton.title;
                refreshButton.title = 'Refreshed!';
                setTimeout(() => {
                    refreshButton.title = originalTitle;
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error refreshing tree:', error);
            this.showError(`Failed to refresh tree: ${error.message}`);
        } finally {
            // Remove refresh animation
            if (refreshButton) {
                refreshButton.classList.remove('refreshing');
                refreshButton.disabled = false;
            }
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loadingIndicator');
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
        this.notifyParentOfResize();
    }

    showError(message) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        this.notifyParentOfResize();
    }

    hideError() {
        const errorEl = document.getElementById('errorMessage');
        errorEl.classList.add('hidden');
        this.notifyParentOfResize();
    }

    renderTree() {
        const treeContainer = document.getElementById('tree');
        
        if (!this.treeData) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-text">No tree data available</div>
                </div>
            `;
            this.notifyParentOfResize();
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.createNodeElement(this.treeData));
        
        treeContainer.innerHTML = '';
        treeContainer.appendChild(fragment);
        
        this.updateTreeDisplay();
        this.notifyParentOfResize();
    }

    renderNode(node, level = 0) {
        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = this.collapsedNodes.has(node.id);
        
        const icon = this.getNodeIcon(node);
        const toggleIcon = hasChildren ? (isCollapsed ? '▶' : '▼') : '';
        
        let html = `
            <div class="tree-node ${isCollapsed ? 'collapsed' : ''}" data-id="${node.id}">
                <div class="tree-node-content">
                    <button class="tree-toggle ${!hasChildren ? 'empty' : ''}" 
                            data-node-id="${node.id}" 
                            ${!hasChildren ? 'disabled' : ''}>
                        ${toggleIcon}
                    </button>
                    <span class="tree-node-icon">${icon}</span>
                    <a href="${this.getNotionUrl(node.id)}" target="_blank" class="tree-node-title tree-node-link">${this.escapeHtml(node.title)}</a>
                </div>
        `;

        if (hasChildren) {
            html += '<div class="tree-children">';
            for (const child of node.children) {
                html += this.renderNode(child, level + 1);
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    createNodeElement(node, level = 0) {
        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = this.collapsedNodes.has(node.id);
        
        // Create elements
        const nodeDiv = document.createElement('div');
        nodeDiv.className = `tree-node ${isCollapsed ? 'collapsed' : ''}`;
        nodeDiv.dataset.id = node.id;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'tree-node-content';

        const toggleButton = document.createElement('button');
        toggleButton.className = `tree-toggle ${!hasChildren ? 'empty' : ''}`;
        toggleButton.dataset.nodeId = node.id;
        toggleButton.textContent = hasChildren ? (isCollapsed ? '▶' : '▼') : '';
        if (!hasChildren) toggleButton.disabled = true;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'tree-node-icon';
        iconSpan.textContent = this.getNodeIcon(node);

        const titleLink = document.createElement('a');
        titleLink.href = this.getNotionUrl(node.id);
        titleLink.target = '_blank';
        titleLink.className = 'tree-node-title tree-node-link';
        titleLink.textContent = node.title;

        // Assemble content
        contentDiv.appendChild(toggleButton);
        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(titleLink);
        nodeDiv.appendChild(contentDiv);

        // Add children if they exist
        if (hasChildren) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'tree-children';
            
            for (const child of node.children) {
                childrenDiv.appendChild(this.createNodeElement(child, level + 1));
            }
            
            nodeDiv.appendChild(childrenDiv);
        }

        return nodeDiv;
    }

    getNodeIcon(node) {
        switch (node.type) {
            case 'database': return '🗃️';
            case 'page': return '📄';
            case 'virtual': return '📁'; // For multi-root virtual containers
            default: return '📄';
        }
    }

    getNotionUrl(pageId) {
        // Don't create URLs for virtual nodes
        if (pageId === 'multi-root' || !pageId || pageId.includes('virtual')) {
            return '#';
        }
        // Format page ID for Notion URL (add hyphens)
        const formattedId = pageId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        return `https://www.notion.so/${formattedId}`;
    }

    updateTreeDisplay() {
        if (!this.treeData) return;

        const treeContainer = document.getElementById('tree');
        const nodes = treeContainer.querySelectorAll('.tree-node');

        nodes.forEach(nodeEl => {
            const nodeId = nodeEl.dataset.id;
            const titleEl = nodeEl.querySelector('.tree-node-title');
            const contentEl = nodeEl.querySelector('.tree-node-content');
            
            if (!titleEl || !contentEl) return;

            const originalTitle = titleEl.textContent;
            const matches = this.searchTerm && 
                originalTitle.toLowerCase().includes(this.searchTerm.toLowerCase());

            // Always show nodes in compact embed, just highlight matches
            if (this.searchTerm) {
                if (matches) {
                    contentEl.classList.add('highlighted');
                    titleEl.innerHTML = this.highlightText(originalTitle, this.searchTerm);
                } else {
                    contentEl.classList.remove('highlighted');
                    titleEl.innerHTML = this.escapeHtml(originalTitle);
                }
            } else {
                contentEl.classList.remove('highlighted');
                titleEl.innerHTML = this.escapeHtml(originalTitle);
            }
        });

        this.attachToggleListeners();
        this.notifyParentOfResize();
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return escapedText.replace(regex, '<span class="highlighted-text">$1</span>');
    }

    attachToggleListeners() {
        // Remove existing listeners by cloning nodes
        const toggleButtons = document.querySelectorAll('.tree-toggle:not(.empty)');
        toggleButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = newButton.dataset.nodeId;
                this.toggleNode(nodeId);
            });
        });
    }

    toggleNode(nodeId) {
        const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
        if (!nodeEl) return;

        if (this.collapsedNodes.has(nodeId)) {
            this.collapsedNodes.delete(nodeId);
            nodeEl.classList.remove('collapsed');
        } else {
            this.collapsedNodes.add(nodeId);
            nodeEl.classList.add('collapsed');
        }

        const toggleButton = nodeEl.querySelector('.tree-toggle');
        if (toggleButton) {
            toggleButton.textContent = this.collapsedNodes.has(nodeId) ? '▶' : '▼';
        }
        
        this.notifyParentOfResize();
    }

    expandAllNodes() {
        this.collapsedNodes.clear();
        const nodes = document.querySelectorAll('.tree-node');
        nodes.forEach(node => {
            node.classList.remove('collapsed');
            const toggle = node.querySelector('.tree-toggle:not(.empty)');
            if (toggle) {
                toggle.textContent = '▼';
            }
        });
        this.notifyParentOfResize();
    }

    collapseAllNodes() {
        const nodes = document.querySelectorAll('.tree-node');
        nodes.forEach(node => {
            const nodeId = node.dataset.id;
            const hasChildren = node.querySelector('.tree-children');
            if (hasChildren) {
                this.collapsedNodes.add(nodeId);
                node.classList.add('collapsed');
                const toggle = node.querySelector('.tree-toggle');
                if (toggle) {
                    toggle.textContent = '▶';
                }
            }
        });
        this.notifyParentOfResize();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    setupAutoRefresh() {
        // Clear any existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }

        // Setup new interval if auto-refresh is enabled
        if (this.config.autoRefresh > 0) {
            const refreshMs = this.config.autoRefresh * 1000;
            this.autoRefreshInterval = setInterval(() => {
                this.refreshTree();
            }, refreshMs);
            
            console.log(`Auto-refresh enabled: every ${this.config.autoRefresh} seconds`);
        }
    }

    destroy() {
        // Clean up intervals when component is destroyed
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
}

// Initialize the embed tree when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NotionEmbedTree();
});