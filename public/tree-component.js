class NotionTreeComponent {
    constructor() {
        this.treeData = null;
        this.searchTerm = '';
        this.searchMode = 'filter';
        this.collapsedNodes = new Set();
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const loadButton = document.getElementById('loadTree');
        const pageIdInput = document.getElementById('pageId');
        const searchInput = document.getElementById('search');
        const clearSearchButton = document.getElementById('clearSearch');
        const searchModeRadios = document.querySelectorAll('input[name="searchMode"]');

        loadButton.addEventListener('click', () => this.loadTree());
        
        pageIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadTree();
        });

        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value;
            this.updateTreeDisplay();
        });

        clearSearchButton.addEventListener('click', () => {
            searchInput.value = '';
            this.searchTerm = '';
            this.updateTreeDisplay();
        });

        searchModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.searchMode = e.target.value;
                this.updateTreeDisplay();
            });
        });
    }

    extractPageId(input) {
        if (!input) return null;
        
        const urlPattern = /notion\.so\/([a-f0-9]{32})/i;
        const match = input.match(urlPattern);
        if (match) {
            return match[1];
        }
        
        const cleanId = input.replace(/[^a-f0-9]/gi, '');
        if (cleanId.length === 32) {
            return cleanId;
        }
        
        return input;
    }

    async loadTree() {
        const pageIdInput = document.getElementById('pageId');
        const rawInput = pageIdInput.value.trim();
        
        if (!rawInput) {
            this.showError('Please enter a Notion page ID or URL');
            return;
        }

        const pageId = this.extractPageId(rawInput);
        if (!pageId) {
            this.showError('Invalid Notion page ID or URL format');
            return;
        }

        this.showLoading(true);
        this.hideError();

        try {
            const response = await fetch(`/api/tree/${pageId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.treeData = await response.json();
            this.renderTree();
        } catch (error) {
            console.error('Error loading tree:', error);
            this.showError(`Failed to load tree: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (show) {
            loadingEl.classList.remove('hidden');
        } else {
            loadingEl.classList.add('hidden');
        }
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }

    hideError() {
        const errorEl = document.getElementById('error');
        errorEl.classList.add('hidden');
    }

    renderTree() {
        const treeContainer = document.getElementById('tree');
        
        if (!this.treeData) {
            treeContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No tree data</h3>
                    <p>Enter a Notion page ID to load the tree structure</p>
                </div>
            `;
            return;
        }

        treeContainer.innerHTML = this.renderNode(this.treeData);
        this.updateTreeDisplay();
    }

    renderNode(node, level = 0) {
        const nodeId = `node-${node.id}`;
        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = this.collapsedNodes.has(node.id);
        
        const icon = node.type === 'database' ? window.IconUtils.getIcon('database') : window.IconUtils.getIcon('file');
        const toggleIcon = hasChildren ? (isCollapsed ? window.IconUtils.getIcon('chevronRight') : window.IconUtils.getIcon('chevronDown')) : '';
        
        let html = `
            <div class="tree-node ${isCollapsed ? 'collapsed' : ''}" data-id="${node.id}">
                <div class="tree-node-content" style="padding-left: ${level * 20}px">
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
            const matches = this.searchTerm && originalTitle.toLowerCase().includes(this.searchTerm.toLowerCase());

            if (this.searchMode === 'filter') {
                if (this.searchTerm && !matches && !this.hasMatchingDescendant(nodeId)) {
                    nodeEl.style.display = 'none';
                } else {
                    nodeEl.style.display = 'block';
                }
                
                contentEl.classList.remove('highlighted');
                titleEl.innerHTML = this.escapeHtml(originalTitle);
            } else if (this.searchMode === 'highlight') {
                nodeEl.style.display = 'block';
                
                if (matches) {
                    contentEl.classList.add('highlighted');
                    titleEl.innerHTML = this.highlightText(originalTitle, this.searchTerm);
                } else {
                    contentEl.classList.remove('highlighted');
                    titleEl.innerHTML = this.escapeHtml(originalTitle);
                }
            }
        });

        this.attachToggleListeners();
    }

    hasMatchingDescendant(nodeId) {
        const findNodeInTree = (node, targetId) => {
            if (node.id === targetId) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findNodeInTree(child, targetId);
                    if (found) return found;
                }
            }
            return null;
        };

        const checkDescendants = (node) => {
            if (node.children) {
                for (const child of node.children) {
                    if (child.title.toLowerCase().includes(this.searchTerm.toLowerCase())) {
                        return true;
                    }
                    if (checkDescendants(child)) {
                        return true;
                    }
                }
            }
            return false;
        };

        const node = findNodeInTree(this.treeData, nodeId);
        return node ? checkDescendants(node) : false;
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return this.escapeHtml(text);
        
        const escapedText = this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
        return escapedText.replace(regex, '<span class="highlighted-text">$1</span>');
    }

    attachToggleListeners() {
        const toggleButtons = document.querySelectorAll('.tree-toggle:not(.empty)');
        
        toggleButtons.forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        
        const newToggleButtons = document.querySelectorAll('.tree-toggle:not(.empty)');
        newToggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const nodeId = button.dataset.nodeId;
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

document.addEventListener('DOMContentLoaded', () => {
    new NotionTreeComponent();
});