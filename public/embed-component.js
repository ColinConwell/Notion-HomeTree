class NotionEmbedTree {
    constructor() {
        this.treeData = null;
        this.searchTerm = '';
        this.collapsedNodes = new Set();
        this.config = this.parseUrlParams();
        
        this.init();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            pageId: params.get('pageId'),
            theme: params.get('theme') || 'light',
            compact: params.get('compact') === 'true',
            showSearch: params.get('showSearch') !== 'false',
            maxDepth: parseInt(params.get('maxDepth')) || 3,
            autoExpand: params.get('autoExpand') === 'true'
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
        
        if (this.config.pageId) {
            this.loadTree(this.config.pageId);
        } else {
            this.showError('No page ID provided');
        }

        // Auto-resize iframe
        this.setupAutoResize();
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchToggle = document.getElementById('searchToggle');

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

        treeContainer.innerHTML = this.renderNode(this.treeData);
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
                    <span class="tree-node-title">${this.escapeHtml(node.title)}</span>
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

    getNodeIcon(node) {
        switch (node.type) {
            case 'database': return '🗃️';
            case 'page': return '📄';
            default: return '📄';
        }
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
}

// Initialize the embed tree when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new NotionEmbedTree();
});