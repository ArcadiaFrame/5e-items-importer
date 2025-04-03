import {
    spbiUtils
} from "./spbiUtils.js";
import {
    spbiParser
} from "./spbiParser.js";
import {
    spbiConfig
} from "./spbiConfig.js";
import {
    pdfHandler
} from "./pdf/pdfHandler.js";
import {
    contentDetector
} from "./parser/contentDetector.js";
import {
    contentParser
} from "./parser/contentParser.js";
import {
    schemaMapper
} from "./data/schemaMapper.js";


export class spbiWindow extends Application {

    constructor(options) {
        super(options);
        this.detectedItems = [];
        this.selectedItems = new Set();
        this.pdfFile = null;
        this.activeTab = "text";
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.id = "spbi-window";
        options.template = "modules/5e-items-importer/templates/spbiWindow.html";
        options.width = 800;
        options.height = 700;
        options.resizable = true;
        options.classes = ["spbi-window"];
        options.popup = true;
        options.title = "5e Spellblock Importer";

        return options;
    }

    static sbiInputWindowInstance = {}

    static async renderWindow() {
        spbiWindow.sbiInputWindowInstance = new spbiWindow();
        spbiWindow.sbiInputWindowInstance.render(true);
    }

    activateListeners(html) {
        spbiUtils.log("Listeners activated")
        super.activateListeners(html);

        // Setup folder select
        const folderSelect = $("#spbi-import-select")[0];
        const typeSelect = $("#spbi-import-type")[0];

        // Add a default option
        const noneFolder = "None";
        folderSelect.add(new Option(noneFolder));

        // Add the available folders
        for (const folder of [...game.folders.filter((f)=>f.type==='Item')]) {
            folderSelect.add(new Option(folder.name));
        }

        // Tab navigation
        html.find('.tabs .item').click(ev => {
            const tab = $(ev.currentTarget).data('tab');
            this.activateTab(html, tab);
        });

        // PDF upload handling
        const pdfUploadArea = html.find('.spbi-upload-area');
        const pdfInput = html.find('#spbi-pdf-input');

        pdfUploadArea.on('click', () => {
            pdfInput.trigger('click');
        });

        pdfUploadArea.on('dragover', (ev) => {
            ev.preventDefault();
            pdfUploadArea.addClass('dragover');
        });

        pdfUploadArea.on('dragleave', () => {
            pdfUploadArea.removeClass('dragover');
        });

        pdfUploadArea.on('drop', (ev) => {
            ev.preventDefault();
            pdfUploadArea.removeClass('dragover');
            
            const files = ev.originalEvent.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                this.handlePdfFile(files[0]);
                pdfInput.val('');
            } else {
                ui.notifications.error("Please upload a valid PDF file.");
            }
        });

        pdfInput.on('change', (ev) => {
            const files = ev.target.files;
            if (files.length > 0) {
                this.handlePdfFile(files[0]);
            }
        });

        // PDF clear button
        html.find('#spbi-pdf-clear').on('click', () => {
            this.clearPdf();
        });

        // Item selection controls
        html.find('#spbi-select-all').on('click', () => {
            this.selectAllItems(html);
        });

        html.find('#spbi-deselect-all').on('click', () => {
            this.deselectAllItems(html);
        });

        html.find('#spbi-filter-type').on('change', (ev) => {
            this.filterItemsByType(html, ev.target.value);
        });

        // Import button
        const importButton = $("#spbi-import-button");
        importButton.on("click", async () => {
            await this.importContent(html);
        });

        // ###############################
        // DEBUG
        // ###############################
        if (spbiConfig.options.debug) {
            const stringToTest = `Acid Wind	

            1st-level Evocation 
            Casting Time 	1 action
            Range 	Self
            Components 	V S M (a Dried Lemon Peel)
            Duration 	Instantaneous
            
            You call forth a breeze full of stinging acid droplets from your outstretched hand. Each creature in a 15-foot cube originating from you must make a Constitution saving throw. On a failed save, a creature takes 2d6 acid damage and is blinded until the end of your next turn. On a successful save, the creature takes half as much damage and isn’t blinded.
            
            At Higher Levels: For each spell slot used higher than 1st level, the damage increases by 1d6.
            `
            $("#spbi-input").val(stringToTest);
        }
    }

    /**
     * Activate a specific tab
     * @param {jQuery} html - The HTML element
     * @param {string} tabName - The tab name to activate
     */
    activateTab(html, tabName) {
        // Update active tab
        html.find('.tabs .item').removeClass('active');
        html.find(`.tabs .item[data-tab="${tabName}"]`).addClass('active');
        
        // Show the active tab content
        html.find('.tab').removeClass('active');
        html.find(`.tab[data-tab="${tabName}"]`).addClass('active');
        
        this.activeTab = tabName;
    }

    /**
     * Handle PDF file upload
     * @param {File} file - The uploaded PDF file
     */
    async handlePdfFile(file) {
        this.pdfFile = file;
        
        // Update UI to show file info
        const pdfInfo = $("#spbi-pdf-info");
        const pdfName = $("#spbi-pdf-name");
        const pdfProgress = $("#spbi-pdf-progress");
        const progressBar = $(".progress-bar-fill");
        const statusText = $("#spbi-pdf-status");
        
        pdfInfo.removeClass('hidden');
        pdfName.text(file.name);
        pdfProgress.removeClass('hidden');
        progressBar.css('width', '0%');
        statusText.text('Processing PDF...');
        
        try {
            // Process the PDF file
            const extractedText = await pdfHandler.processPdf(file, {}, (progress) => {
                // Update progress bar
                if (progress.type === 'text-extraction' || progress.type === 'ocr-page') {
                    const percent = Math.round((progress.current / progress.total) * 100);
                    progressBar.css('width', `${percent}%`);
                    statusText.text(progress.message);
                } else if (progress.type === 'ocr-recognition') {
                    const percent = Math.round(progress.progress * 100);
                    progressBar.css('width', `${percent}%`);
                    statusText.text(progress.message);
                }
            });
            
            // Detect content blocks
            statusText.text('Detecting content blocks...');
            const contentBlocks = contentDetector.detectContentBlocks(extractedText);
            
            if (contentBlocks.length === 0) {
                statusText.text('No content blocks detected');
                ui.notifications.warn("No content blocks were detected in the PDF.");
                return;
            }
            
            // Parse detected content blocks
            statusText.text(`Processing ${contentBlocks.length} content blocks...`);
            this.detectedItems = [];
            
            for (const block of contentBlocks) {
                try {
                    const parsedData = contentParser.parseContent(block.type, block.content);
                    this.detectedItems.push({
                        type: block.type,
                        data: parsedData,
                        content: block.content,
                        selected: true
                    });
                } catch (error) {
                    console.error(`Error parsing ${block.type} content:`, error);
                }
            }
            
            // Update UI with detected items
            this.renderItemsList();
            $("#spbi-items-container").removeClass('hidden');
            statusText.text(`Found ${this.detectedItems.length} items`);
            
            // Select all items by default
            this.selectedItems = new Set(this.detectedItems.map((_, index) => index));
            
        } catch (error) {
            console.error("Error processing PDF:", error);
            statusText.text('Error processing PDF');
            ui.notifications.error(`Error processing PDF: ${error.message}`);
        }
    }

    /**
     * Clear the current PDF file
     */
    clearPdf() {
        this.pdfFile = null;
        this.detectedItems = [];
        this.selectedItems.clear();
        
        // Update UI
        $("#spbi-pdf-info").addClass('hidden');
        $("#spbi-pdf-progress").addClass('hidden');
        $("#spbi-items-container").addClass('hidden');
    }

    /**
     * Render the list of detected items
     */
    renderItemsList() {
        const itemsList = $("#spbi-items-list");
        itemsList.empty();
        
        this.detectedItems.forEach((item, index) => {
            const itemElement = $(`
                <div class="spbi-item" data-index="${index}" data-type="${item.type}">
                    <input type="checkbox" class="spbi-item-checkbox" ${this.selectedItems.has(index) ? 'checked' : ''}>
                    <div class="spbi-item-content">
                        <div class="spbi-item-header">
                            <span class="spbi-item-name">${item.data.name}</span>
                            <span class="spbi-item-type">${this.formatItemType(item.type)}</span>
                        </div>
                        <div class="spbi-item-description">${this.getItemDescription(item)}</div>
                    </div>
                </div>
            `);
            
            // Add checkbox event listener
            itemElement.find('.spbi-item-checkbox').on('change', (ev) => {
                if (ev.target.checked) {
                    this.selectedItems.add(index);
                } else {
                    this.selectedItems.delete(index);
                }
            });
            
            itemsList.append(itemElement);
        });
    }

    /**
     * Format item type for display
     * @param {string} type - The item type
     * @returns {string} - Formatted item type
     */
    formatItemType(type) {
        switch (type) {
            case 'spell': return 'Spell';
            case 'item': return 'Item';
            case 'monster': return 'Monster';
            case 'classFeature': return 'Class Feature';
            case 'feat': return 'Feat';
            case 'background': return 'Background';
            default: return type.charAt(0).toUpperCase() + type.slice(1);
        }
    }
    
    getItemTypeIcon(type) {
        switch (type) {
            case 'spell': return 'fas fa-magic';
            case 'item': return 'fas fa-ring';
            case 'monster': return 'fas fa-dragon';
            case 'classFeature': return 'fas fa-graduation-cap';
            case 'feat': return 'fas fa-medal';
            case 'background': return 'fas fa-scroll';
            default: return 'fas fa-question';
        }
    }
    
    getItemTypeName(type) {
        switch (type) {
            case 'spell': return 'Spell';
            case 'item': return 'Item';
            case 'monster': return 'Monster';
            case 'classFeature': return 'Class Feature';
            case 'feat': return 'Feat';
            case 'background': return 'Background';
            default: return 'Unknown';
        }
    }

    /**
     * Get a short description for an item
     * @param {Object} item - The item object
     * @returns {string} - Short description
     */
    getItemDescription(item) {
        switch (item.type) {
            case 'spell':
                return `${item.data.level || 'Cantrip'}, ${item.data.school || 'Unknown school'}`;
            case 'item':
                return `${item.data.type || 'Item'}, ${item.data.rarity || 'Common'}`;
            case 'monster':
                return `${item.data.size || ''} ${item.data.type || ''}, ${item.data.alignment || ''}`;
            case 'classFeature':
                return `Class feature, ${item.data.requirements || ''}`;
            case 'feat':
                return `Feat, ${item.data.prerequisites || ''}`;
            default:
                return '';
        }
    }

    /**
     * Select all items
     * @param {jQuery} html - The HTML element
     */
    selectAllItems(html) {
        const checkboxes = html.find('.spbi-item-checkbox');
        checkboxes.prop('checked', true);
        
        this.selectedItems = new Set(this.detectedItems.map((_, index) => index));
    }

    /**
     * Deselect all items
     * @param {jQuery} html - The HTML element
     */
    deselectAllItems(html) {
        const checkboxes = html.find('.spbi-item-checkbox');
        checkboxes.prop('checked', false);
        
        this.selectedItems.clear();
    }

    /**
     * Filter items by type
     * @param {jQuery} html - The HTML element
     * @param {string} type - The type to filter by
     */
    filterItemsByType(html, type) {
        const items = html.find('.spbi-item');
        
        if (type === 'all') {
            items.removeClass('hidden');
        } else {
            items.addClass('hidden');
            items.filter(`[data-type="${type}"]`).removeClass('hidden');
        }
    }

    /**
     * Import selected content
     * @param {jQuery} html - The HTML element
     */
    async importContent(html) {
        const importType = $("#spbi-import-type").val();
        const folderName = $("#spbi-import-select").val();
        let folderId = "";
        
        if (folderName && folderName !== "None") {
            // Get folder based on import type
            const folderType = importType === "monster" ? "Actor" : "Item";
            const folder = game.folders.find(f => f.name === folderName && f.type === folderType);
            if (folder) folderId = folder.id;
        }
        
        try {
            if (this.activeTab === 'text') {
                // Handle text input import (existing functionality)
                const content = $("#spbi-input").val();
                if (!content.trim()) {
                    ui.notifications.warn("Please enter some content to import.");
                    return;
                }
                
                switch (importType) {
                    case "spell":
                        await spbiParser.parseSpell(content, folderId);
                        break;
                    case "item":
                        await spbiParser.parseItem(content, folderId);
                        break;
                    case "monster":
                        await this.importMonster(content, folderId);
                        break;
                    default:
                        console.log("switch default")
                        break;
                }
                ui.notifications.info(`Successfully imported ${importType}.`);
            } else if (this.activeTab === 'pdf') {
                // Handle PDF import with selected items
                if (this.selectedItems.size === 0) {
                    ui.notifications.warn("Please select at least one item to import.");
                    return;
                }
                
                let importCount = 0;
                for (const index of this.selectedItems) {
                    const item = this.detectedItems[index];
                    if (!item) continue;
                    
                    // Map the data to Foundry schema
                    const mappedData = schemaMapper.mapToFoundrySchema(item.type, item.data);
                    
                    // Create the item in Foundry
                    await Item.create({
                        ...mappedData,
                        folder: selectedFolderId
                    });
                    
                    importCount++;
                }
                
                ui.notifications.info(`Successfully imported ${importCount} items.`);
            }
        } catch (error) {
            console.error("Import error:", error);
            ui.notifications.error(`Error during import: ${error.message}`);
        }
    }
}
