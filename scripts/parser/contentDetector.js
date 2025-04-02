/**
 * Content Detector module for 5e-content-importer
 * Identifies different types of content blocks in extracted text
 */

import { spbiUtils } from "../spbiUtils.js";

export class contentDetector {
    // Regular expressions for detecting different content types
    static #spellBlockPattern = /^([\w\s'-]+)\s*(?:\r?\n)((?:(?:\d+)(?:st|nd|rd|th))?[-\s]?(?:level)?\s*(?:abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)\s*(?:spell|cantrip)?(?:\s*\(ritual\))?)\s*(?:\r?\n)/im;
    
    static #itemBlockPattern = /^([\w\s'-]+)\s*(?:\r?\n)((?:(?:wondrous item|armor|weapon|ring|rod|staff|wand|potion|scroll|tool|kit|supplies|instrument))?\s*(?:\([\w\s]+\))?\s*(?:,)?\s*(?:(?:uncommon|common|rare|very rare|legendary|artifact))?)\s*(?:\r?\n)/im;
    
    static #monsterBlockPattern = /^([\w\s'-]+)\s*(?:\r?\n)((?:(?:tiny|small|medium|large|huge|gargantuan)\s+(?:aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|ooze|plant|undead))\s*(?:\([^\)]+\))?\s*(?:,)?\s*(?:(?:unaligned|lawful good|neutral good|chaotic good|lawful neutral|neutral|chaotic neutral|lawful evil|neutral evil|chaotic evil|any alignment|any non-good alignment|any non-lawful alignment|any chaotic alignment))?)\s*(?:\r?\n)/im;
    
    static #classFeaturePattern = /^([\w\s'-]+)\s*(?:\r?\n)((?:(?:\d+)(?:st|nd|rd|th))?[-\s]?level\s*(?:feature|class feature))\s*(?:\r?\n)/im;
    
    static #featPattern = /^([\w\s'-]+)\s*(?:\r?\n)((?:feat|prerequisite:))\s*(?:\r?\n)/im;
    
    static #backgroundPattern = /^([\w\s'-]+)\s*(?:\r?\n)(background)\s*(?:\r?\n)/im;
    
    /**
     * Detect content blocks in extracted text
     * @param {string} text - The extracted text from a PDF
     * @returns {Array<Object>} - Array of detected content blocks with type and content
     */
    static detectContentBlocks(text) {
        spbiUtils.log("Detecting content blocks in extracted text");
        
        // Split text into potential blocks using common separators
        const potentialBlocks = this._splitIntoBlocks(text);
        
        // Process each potential block to determine its type
        const contentBlocks = [];
        
        for (const block of potentialBlocks) {
            if (block.trim().length < 10) continue; // Skip very short blocks
            
            const blockType = this._identifyBlockType(block);
            if (blockType) {
                contentBlocks.push({
                    type: blockType,
                    content: block.trim()
                });
            }
        }
        
        spbiUtils.log(`Detected ${contentBlocks.length} content blocks`);
        return contentBlocks;
    }
    
    /**
     * Split text into potential content blocks
     * @param {string} text - The extracted text
     * @returns {Array<string>} - Array of potential content blocks
     * @private
     */
    static _splitIntoBlocks(text) {
        // Look for common block separators
        // 1. Multiple newlines (3+)
        // 2. Horizontal rules (series of dashes or underscores)
        // 3. Page breaks or section markers
        
        const blockSeparators = [
            /\n{3,}/g,                  // Multiple newlines
            /\n[-_]{3,}\n/g,           // Horizontal rules
            /\n[\s]*\d+[\s]*\n/g,      // Page numbers
            /\n[\s]*•[\s]*\n/g        // Bullet points as separators
        ];
        
        // Replace all separators with a consistent marker
        let processedText = text;
        for (const separator of blockSeparators) {
            processedText = processedText.replace(separator, "\n###BLOCK_SEPARATOR###\n");
        }
        
        // Split by the marker
        const blocks = processedText.split("###BLOCK_SEPARATOR###");
        
        // Further process blocks to handle cases where separators weren't detected
        return this._refineBlocks(blocks);
    }
    
    /**
     * Refine blocks by looking for content type indicators
     * @param {Array<string>} blocks - Initial blocks
     * @returns {Array<string>} - Refined blocks
     * @private
     */
    static _refineBlocks(blocks) {
        const refinedBlocks = [];
        
        for (const block of blocks) {
            if (block.trim().length === 0) continue;
            
            // Check if this block might contain multiple content items
            const lines = block.split("\n");
            let currentBlock = "";
            let blockStart = 0;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                // Check for potential new block starts
                if (i > blockStart + 3 && this._looksLikeBlockStart(line, lines.slice(i, i + 3).join("\n"))) {
                    // Save the current block if it's not empty
                    if (currentBlock.trim().length > 0) {
                        refinedBlocks.push(currentBlock.trim());
                    }
                    
                    // Start a new block
                    currentBlock = line;
                    blockStart = i;
                } else {
                    // Continue the current block
                    currentBlock += "\n" + line;
                }
            }
            
            // Add the last block
            if (currentBlock.trim().length > 0) {
                refinedBlocks.push(currentBlock.trim());
            }
        }
        
        return refinedBlocks;
    }
    
    /**
     * Check if a line looks like the start of a new content block
     * @param {string} line - The line to check
     * @param {string} context - A few lines of context
     * @returns {boolean} - Whether the line looks like a block start
     * @private
     */
    static _looksLikeBlockStart(line, context) {
        // Check for common block start patterns
        
        // All caps title followed by type indicator
        if (/^[A-Z][A-Z\s]+$/.test(line) && 
            /(?:spell|cantrip|item|weapon|armor|monster|feat)/i.test(context)) {
            return true;
        }
        
        // Title case name followed by spell level and school
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line) && 
            /(?:\d+(?:st|nd|rd|th)[-\s]level|cantrip)\s+(?:abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i.test(context)) {
            return true;
        }
        
        // Title case name followed by item rarity
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line) && 
            /(?:wondrous item|armor|weapon|ring|rod|staff|wand|potion|scroll)\s*(?:,)?\s*(?:uncommon|common|rare|very rare|legendary|artifact)/i.test(context)) {
            return true;
        }
        
        // Title case name followed by monster type
        if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(line) && 
            /(?:tiny|small|medium|large|huge|gargantuan)\s+(?:aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|ooze|plant|undead)/i.test(context)) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Identify the type of a content block
     * @param {string} block - The content block
     * @returns {string|null} - The identified block type or null if unknown
     * @private
     */
    static _identifyBlockType(block) {
        // Check for spell blocks
        if (this.#spellBlockPattern.test(block)) {
            return 'spell';
        }
        
        // Check for item blocks
        if (this.#itemBlockPattern.test(block)) {
            return 'item';
        }
        
        // Check for monster blocks
        if (this.#monsterBlockPattern.test(block)) {
            return 'monster';
        }
        
        // Additional monster detection patterns
        // Check for common monster statblock patterns like AC, HP, etc.
        if (/armor class\s+\d+|hit points\s+\d+\s*\([\dd\+\s]+\)/i.test(block) && 
            /str\s+\d+\s*\([+-]\d+\)|dex\s+\d+\s*\([+-]\d+\)/i.test(block)) {
            return 'monster';
        }
        
        // Check for monster blocks with ability scores section
        if (/\b(str|dex|con|int|wis|cha)\s+\d+\s*\([+-]\d+\)\s+(str|dex|con|int|wis|cha)\s+\d+\s*\([+-]\d+\)/i.test(block)) {
            return 'monster';
        }
        
        // Check for monster blocks with challenge rating
        if (/challenge\s+([\d\/]+)\s*\([\d,]+\s*xp\)/i.test(block)) {
            return 'monster';
        }
        
        // Check for class feature blocks
        if (this.#classFeaturePattern.test(block)) {
            return 'classFeature';
        }
        
        // Check for feat blocks
        if (this.#featPattern.test(block)) {
            return 'feat';
        }
        
        // Check for background blocks
        if (this.#backgroundPattern.test(block)) {
            return 'background';
        }
        
        // Additional heuristics for blocks that don't match the patterns
        
        // Check for spell-like content
        if (/casting time|components|duration|range/i.test(block) && 
            /(?:abjuration|conjuration|divination|enchantment|evocation|illusion|necromancy|transmutation)/i.test(block)) {
            return 'spell';
        }
        
        // Tool indicators
        if (/(?:tool|kit|supplies)/i.test(block) &&
            /(?:artisan|thieves|herbalism|musical instrument)/i.test(block)) {
            return 'item';
        }
        
        // Weapon indicators
        if (/(?:weapon|sword|axe|bow|crossbow)/i.test(block) &&
            /(?:damage|attack|range|properties)/i.test(block)) {
            return 'item';
        }
        
        // Armor indicators
        if (/(?:armor|shield|plate|mail)/i.test(block) &&
            /(?:ac|armor class)/i.test(block)) {
            return 'item';
        }
        
        // Check for item-like content
        if (/(?:wondrous item|armor|weapon|ring|rod|staff|wand|potion|scroll)/i.test(block) && 
            /(?:attunement|rarity|requires)/i.test(block)) {
            return 'item';
        }
        
        // Check for monster-like content
        if (/armor class|hit points|speed|str|dex|con|int|wis|cha/i.test(block) && 
            /(?:actions|legendary actions|lair actions)/i.test(block)) {
            return 'monster';
        }
        
        // Check for background-like content
        if (/background/i.test(block) && 
            /(?:skill proficiencies|feature:|equipment|suggested characteristics)/i.test(block)) {
            return 'background';
        }
        
        // Unknown block type
        return null;
    }
}