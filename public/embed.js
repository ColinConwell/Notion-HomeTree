class NotionEmbedTree {
    constructor() {
        this.treeData = null;
        this.searchTerm = '';
        this.collapsedNodes = new Set();
        this.config = this.parseUrlParams();
        this.autoRefreshInterval = null;
        this.currentPageIds = [];
        
        this.init();
    }

    initializeLockButton() {
        const isLocked = localStorage.getItem('treeEditLocked') === 'true';
        const lockButton = document.getElementById('lockButton');
        
        if (lockButton) {
            if (isLocked) {
                lockButton.innerHTML = window.IconUtils.getIcon('lock');
                lockButton.title = 'Unlock editing';
                lockButton.classList.remove('unlocked');
                lockButton.classList.add('locked');
            } else {
                lockButton.innerHTML = window.IconUtils.getIcon('unlock');
                lockButton.title = 'Lock editing';
                lockButton.classList.remove('locked');
                lockButton.classList.add('unlocked');
            }
        }
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

    async init() {
        // Apply theme and size classes
        if (this.config.compact) {
            document.body.classList.add('compact');
        }
        
        // Show/hide search based on config
        const searchContainer = document.getElementById('searchContainer');
        if (!this.config.showSearch) {
            searchContainer.style.display = 'none';
        }

        // Initialize lock button state
        this.initializeLockButton();

        this.initializeEventListeners();
        
        // Load page IDs from URL params or defaults
        await this.loadPageIds();
        
        if (this.currentPageIds.length > 0) {
            const pageIdString = this.currentPageIds.join(',');
            this.loadTree(pageIdString);
        } else {
            this.showEmptyState();
        }

        // Auto-resize iframe
        this.setupAutoResize();
        
        // Setup auto-refresh if enabled
        this.setupAutoRefresh();
    }

    async loadPageIds() {
        // First check URL parameters
        if (this.config.pageIds) {
            this.currentPageIds = this.config.pageIds.split(',').map(id => id.trim()).filter(id => id);
            return;
        }
        
        if (this.config.pageId) {
            this.currentPageIds = [this.config.pageId];
            return;
        }
        
        // If no URL params, try to load defaults from server
        try {
            const response = await fetch('/api/config/defaults');
            if (response.ok) {
                const defaults = await response.json();
                this.currentPageIds = defaults.pageIds || [];
            }
        } catch (error) {
            console.warn('Could not load default page IDs:', error);
            this.currentPageIds = [];
        }
    }

    showEmptyState() {
        const treeContainer = document.getElementById('tree');
        treeContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${window.IconUtils.getIcon('folder', {width: '32', height: '32'})}</div>
                <div class="empty-state-text">No pages configured</div>
                <div class="empty-state-subtitle">Click the + button below to add pages</div>
            </div>
        `;
        // Always add the tree footer with the add button, regardless of lock state for empty trees
        this.addTreeFooter(true); // Pass true to force show add button for empty state
        this.updateToggleAllButton(); // Disable the toggle button for empty state
        this.notifyParentOfResize();
    }

    addTreeFooter(forceShowAddButton = false) {
        // Remove existing footer if it exists
        const existingFooter = document.getElementById('treeFooter');
        if (existingFooter) {
            existingFooter.remove();
        }
        
        const treeContainer = document.getElementById('tree');
        const footer = document.createElement('div');
        footer.id = 'treeFooter';
        footer.className = 'tree-footer';
        
        // Check if editing is locked (default to unlocked for now)
        const isLocked = localStorage.getItem('treeEditLocked') === 'true';
        
        // For empty states, always show the add button regardless of lock state
        const shouldShowAddButton = forceShowAddButton || !isLocked;
        
        footer.innerHTML = `
            <div class="tree-footer-controls">
                <button id="toggleLockButton" class="footer-button lock-button ${isLocked ? 'locked' : 'unlocked'}" 
                        title="${isLocked ? 'Unlock editing' : 'Lock editing'}">
                    ${isLocked ? window.IconUtils.getIcon('lock') : window.IconUtils.getIcon('unlock')}
                </button>
                <div id="addPageSection" class="add-page-section ${shouldShowAddButton ? '' : 'hidden'}">
                    <button id="addRootPageButton" class="footer-button add-page-button" title="Add new page as root node">
                        <span class="add-icon">+</span>
                        <span class="add-text">Add New Page as Root Node</span>
                    </button>
                </div>
            </div>
        `;
        
        treeContainer.appendChild(footer);
        
        // Add event listeners
        document.getElementById('toggleLockButton').addEventListener('click', () => {
            this.toggleEditLock();
        });
        
        document.getElementById('addRootPageButton').addEventListener('click', () => {
            this.showAddPageModal();
        });
    }
    
    toggleEditLock() {
        const isLocked = localStorage.getItem('treeEditLocked') === 'true';
        const newLockState = !isLocked;
        
        localStorage.setItem('treeEditLocked', newLockState.toString());
        
        const lockButton = document.getElementById('toggleLockButton');
        const addPageSection = document.getElementById('addPageSection');
        
        if (newLockState) {
            lockButton.innerHTML = window.IconUtils.getIcon('lock');
            lockButton.title = 'Unlock editing';
            lockButton.classList.remove('unlocked');
            lockButton.classList.add('locked');
            addPageSection.classList.add('hidden');
        } else {
            lockButton.innerHTML = window.IconUtils.getIcon('unlock');
            lockButton.title = 'Lock editing';
            lockButton.classList.remove('locked');
            lockButton.classList.add('unlocked');
            addPageSection.classList.remove('hidden');
        }
    }

    toggleGlobalEditLock() {
        const isLocked = localStorage.getItem('treeEditLocked') === 'true';
        const newLockState = !isLocked;
        
        localStorage.setItem('treeEditLocked', newLockState.toString());
        
        // Update toolbar lock button
        const toolbarLockButton = document.getElementById('lockButton');
        if (toolbarLockButton) {
            if (newLockState) {
                toolbarLockButton.innerHTML = window.IconUtils.getIcon('lock');
                toolbarLockButton.title = 'Unlock editing';
                toolbarLockButton.classList.remove('unlocked');
                toolbarLockButton.classList.add('locked');
            } else {
                toolbarLockButton.innerHTML = window.IconUtils.getIcon('unlock');
                toolbarLockButton.title = 'Lock editing';
                toolbarLockButton.classList.remove('locked');
                toolbarLockButton.classList.add('unlocked');
            }
        }
        
        // Update footer lock button if it exists
        const footerLockButton = document.getElementById('toggleLockButton');
        if (footerLockButton) {
            if (newLockState) {
                footerLockButton.innerHTML = window.IconUtils.getIcon('lock');
                footerLockButton.title = 'Unlock editing';
                footerLockButton.classList.remove('unlocked');
                footerLockButton.classList.add('locked');
            } else {
                footerLockButton.innerHTML = window.IconUtils.getIcon('unlock');
                footerLockButton.title = 'Lock editing';
                footerLockButton.classList.remove('locked');
                footerLockButton.classList.add('unlocked');
            }
        }
        
        // Show/hide add page section
        const addPageSection = document.getElementById('addPageSection');
        if (addPageSection) {
            if (newLockState) {
                addPageSection.classList.add('hidden');
            } else {
                addPageSection.classList.remove('hidden');
            }
        }
    }

    showAddPageModal() {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'add-page-modal';
        modal.innerHTML = `
            <div class="add-page-modal-content">
                <div class="add-page-modal-header">
                    <h3>Add Page to Tree</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="add-page-modal-body">
                    <label for="pageUrlInput">Paste Notion page URL or ID:</label>
                    <textarea id="pageUrlInput" placeholder="https://www.notion.so/...&#10;or paste multiple URLs (one per line)" rows="3"></textarea>
                    <div class="add-page-modal-footer">
                        <button id="cancelAddPage" class="modal-button modal-button-secondary">Cancel</button>
                        <button id="confirmAddPage" class="modal-button modal-button-primary">Add Page(s)</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Focus the input
        setTimeout(() => {
            document.getElementById('pageUrlInput').focus();
        }, 100);
        
        // Add event listeners
        document.getElementById('cancelAddPage').addEventListener('click', () => {
            this.closeAddPageModal();
        });
        
        document.getElementById('confirmAddPage').addEventListener('click', () => {
            this.addPagesFromInput();
        });
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.closeAddPageModal();
        });
        
        // Close on escape
        document.addEventListener('keydown', this.handleModalKeydown.bind(this));
        
        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeAddPageModal();
            }
        });
    }

    handleModalKeydown(e) {
        if (e.key === 'Escape') {
            this.closeAddPageModal();
        }
    }

    closeAddPageModal() {
        const modal = document.querySelector('.add-page-modal');
        if (modal) {
            modal.remove();
        }
        document.removeEventListener('keydown', this.handleModalKeydown.bind(this));
    }

    extractPageId(input) {
        if (!input) return null;
        
        // Extract from full Notion URL with workspace prefix and query params
        // Matches: https://www.notion.so/workspace/Page-Title-199d606e3bdf8009975adb93ae6a52a7?source=copy_link
        const urlPatternWithWorkspace = /notion\.so\/[^\/]+\/[^\/]*-([a-f0-9]{32})(?:\?.*)?$/i;
        const workspaceMatch = input.match(urlPatternWithWorkspace);
        if (workspaceMatch) {
            return workspaceMatch[1];
        }
        
        // Extract from simple notion.so URL
        // Matches: https://www.notion.so/199d606e3bdf8009975adb93ae6a52a7
        const urlPattern = /notion\.so\/([a-f0-9]{32})(?:\?.*)?$/i;
        const urlMatch = input.match(urlPattern);
        if (urlMatch) {
            return urlMatch[1];
        }
        
        // Extract from URL with title and ID (no workspace)
        // Matches: https://www.notion.so/Page-Title-199d606e3bdf8009975adb93ae6a52a7
        const titlePattern = /notion\.so\/[^\/]*-([a-f0-9]{32})(?:\?.*)?$/i;
        const titleMatch = input.match(titlePattern);
        if (titleMatch) {
            return titleMatch[1];
        }
        
        // Extract from dashed UUID format
        const dashedPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
        const dashedMatch = input.match(dashedPattern);
        if (dashedMatch) {
            return dashedMatch[1].replace(/-/g, '');
        }
        
        // Check if it's already a clean page ID (32 hex chars)
        if (/^[a-f0-9]{32}$/i.test(input.trim())) {
            return input.trim();
        }
        
        return null;
    }

    async addPagesFromInput() {
        const input = document.getElementById('pageUrlInput').value.trim();
        if (!input) return;
        
        const lines = input.split('\n').map(line => line.trim()).filter(line => line);
        const newPageIds = [];
        
        for (const line of lines) {
            const pageId = this.extractPageId(line);
            if (pageId && !this.currentPageIds.includes(pageId)) {
                newPageIds.push(pageId);
            }
        }
        
        if (newPageIds.length === 0) {
            alert('No valid page IDs found. Please check your URLs.');
            return;
        }
        
        // Add to current page IDs
        this.currentPageIds.push(...newPageIds);
        
        // Close modal
        this.closeAddPageModal();
        
        // Reload tree with new pages
        const pageIdString = this.currentPageIds.join(',');
        await this.loadTree(pageIdString);
    }

    initializeEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const lockButton = document.getElementById('lockButton');
        const refreshButton = document.getElementById('refreshButton');
        const toggleAllButton = document.getElementById('toggleAllButton');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.updateTreeDisplay();
            });
        }

        if (lockButton) {
            lockButton.addEventListener('click', () => {
                this.toggleGlobalEditLock();
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshTree();
            });
        }

        if (toggleAllButton) {
            toggleAllButton.addEventListener('click', () => {
                this.toggleAllNodes();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Cmd/Ctrl + R for refresh
            if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
                e.preventDefault();
                this.refreshTree();
            }
            // Cmd/Ctrl + E for toggle expand/collapse all
            if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
                e.preventDefault();
                this.toggleAllNodes();
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
            this.showEmptyState();
            return;
        }

        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        fragment.appendChild(this.createNodeElement(this.treeData));
        
        treeContainer.innerHTML = '';
        treeContainer.appendChild(fragment);
        
        // Add tree footer with controls
        this.addTreeFooter();
        
        this.updateTreeDisplay();
        this.updateToggleAllButton();
        this.notifyParentOfResize();
    }

    renderNode(node, level = 0) {
        const hasChildren = node.children && node.children.length > 0;
        const isCollapsed = this.collapsedNodes.has(node.id);
        
        const icon = this.getNodeIcon(node);
        const toggleIcon = hasChildren ? (isCollapsed ? window.IconUtils.getIcon('chevronRight') : window.IconUtils.getIcon('chevronDown')) : '';
        
        let html = `
            <div class="tree-node ${isCollapsed ? 'collapsed' : ''}" data-id="${node.id}">
                <div class="tree-node-content">
                    <button class="tree-toggle ${!hasChildren ? 'empty' : ''}" 
                            data-node-id="${node.id}" 
                            ${!hasChildren ? 'disabled' : ''}>
                        ${toggleIcon}
                    </button>
                    <span class="tree-node-icon">${icon}</span>
                    <a href="${node.url || this.getNotionUrl(node.id)}" target="_blank" class="tree-node-title tree-node-link">${this.escapeHtml(node.title)}</a>
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
        toggleButton.innerHTML = hasChildren ? (isCollapsed ? window.IconUtils.getIcon('chevronRight') : window.IconUtils.getIcon('chevronDown')) : '';
        if (!hasChildren) toggleButton.disabled = true;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'tree-node-icon';
        iconSpan.innerHTML = this.getNodeIcon(node);

        const titleLink = document.createElement('a');
        titleLink.href = node.url || this.getNotionUrl(node.id);
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
            case 'database': return window.IconUtils.getIcon('database');
            case 'page': return window.IconUtils.getIcon('file');
            case 'virtual': return window.IconUtils.getIcon('folder'); // For multi-root virtual containers
            default: return window.IconUtils.getIcon('file');
        }
    }

    getNotionUrl(pageId) {
        // Don't create URLs for virtual nodes
        if (pageId === 'multi-root' || !pageId || pageId.includes('virtual')) {
            return '#';
        }
        // Ensure pageId is 32 characters without dashes
        const cleanId = pageId.replace(/-/g, '');
        if (cleanId.length !== 32) {
            console.warn(`Invalid page ID length: ${pageId}`);
            return '#';
        }
        // Format page ID for Notion URL (add hyphens)
        const formattedId = cleanId.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
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
            // Find the node in the tree data by ID
            const findNodeById = (node, id) => {
                if (node.id === id) return node;
                if (node.children) {
                    for (const child of node.children) {
                        const found = findNodeById(child, id);
                        if (found) return found;
                    }
                }
                return null;
            };
            const nodeData = findNodeById(this.treeData, nodeId);
            const contentText = nodeData && nodeData.content ? nodeData.content : '';

            const matches = this.searchTerm && (
                originalTitle.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                contentText.toLowerCase().includes(this.searchTerm.toLowerCase())
            );

            // Always show nodes in compact embed, just highlight matches
            if (this.searchTerm) {
                if (matches) {
                    contentEl.classList.add('highlighted');
                    // Highlight in title if match
                    if (originalTitle.toLowerCase().includes(this.searchTerm.toLowerCase())) {
                        titleEl.innerHTML = this.highlightText(originalTitle, this.searchTerm);
                    } else {
                        titleEl.innerHTML = this.escapeHtml(originalTitle);
                    }
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
            toggleButton.innerHTML = this.collapsedNodes.has(nodeId) ? window.IconUtils.getIcon('chevronRight') : window.IconUtils.getIcon('chevronDown');
        }
        
        this.updateToggleAllButton();
        this.notifyParentOfResize();
    }

    toggleAllNodes() {
        const shouldExpand = this.areNodesMostlyCollapsed();
        
        if (shouldExpand) {
            this.expandAllNodes();
        } else {
            this.collapseAllNodes();
        }
        
        this.updateToggleAllButton();
    }

    areNodesMostlyCollapsed() {
        const nodesWithChildren = document.querySelectorAll('.tree-node .tree-children');
        if (nodesWithChildren.length === 0) return false;
        
        const collapsedCount = this.collapsedNodes.size;
        const totalCount = nodesWithChildren.length;
        
        // Consider "mostly collapsed" if more than half are collapsed
        return collapsedCount >= totalCount / 2;
    }

    updateToggleAllButton() {
        const toggleAllButton = document.getElementById('toggleAllButton');
        if (!toggleAllButton) return;
        
        // Check if there are any nodes with children
        const nodesWithChildren = document.querySelectorAll('.tree-node .tree-children');
        
        // Disable button if no tree or no expandable nodes
        if (!this.treeData || nodesWithChildren.length === 0) {
            toggleAllButton.disabled = true;
            toggleAllButton.innerHTML = window.IconUtils.getIcon('folderOpen');
            toggleAllButton.title = 'No expandable nodes';
            return;
        }
        
        // Enable button and update based on state
        toggleAllButton.disabled = false;
        const shouldExpand = this.areNodesMostlyCollapsed();
        
        if (shouldExpand) {
            toggleAllButton.innerHTML = window.IconUtils.getIcon('folderOpen');
            toggleAllButton.title = 'Expand all';
        } else {
            toggleAllButton.innerHTML = window.IconUtils.getIcon('folder');
            toggleAllButton.title = 'Collapse all';
        }
    }

    expandAllNodes() {
        this.collapsedNodes.clear();
        const nodes = document.querySelectorAll('.tree-node');
        nodes.forEach(node => {
            node.classList.remove('collapsed');
            const toggle = node.querySelector('.tree-toggle:not(.empty)');
            if (toggle) {
                toggle.innerHTML = window.IconUtils.getIcon('chevronDown');
            }
        });
        this.updateToggleAllButton();
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
                    toggle.innerHTML = window.IconUtils.getIcon('chevronRight');
                }
            }
        });
        this.updateToggleAllButton();
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

// Helper function to initialize icons in buttons
function initializeIcons() {
    const buttons = document.querySelectorAll('[data-icon]');
    buttons.forEach(button => {
        const iconName = button.getAttribute('data-icon');
        if (iconName && window.IconUtils) {
            button.innerHTML = window.IconUtils.getIcon(iconName);
        }
    });
}

// Initialize the embed tree when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize icons first
    initializeIcons();
    new NotionEmbedTree();
});