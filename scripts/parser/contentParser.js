/**
 * Content Parser module for 5e-content-importer
 * Parses detected content blocks into structured data
 */

import { spbiUtils } from "../spbiUtils.js";

export class contentParser {
    /**
     * Parse a content block into structured data
     * @param {string} type - The type of content (spell, item, monster, etc.)
     * @param {string} content - The content block text
     * @returns {Object} - Structured data extracted from the content
     */
    static parseContent(type, content) {
        spbiUtils.log(`Parsing ${type} content`);
        
        switch (type) {
            case 'spell':
                return this._parseSpell(content);
            case 'item':
                return this._parseItem(content);
            case 'monster':
                return this._parseMonster(content);
            case 'classFeature':
                return this._parseClassFeature(content);
            case 'feat':
                return this._parseFeat(content);
            case 'background':
                return this._parseBackground(content);
            default:
                throw new Error(`Unknown content type: ${type}`);
        }
    }
    
    /**
     * Parse spell content
     * @param {string} content - The spell content text
     * @returns {Object} - Structured spell data
     * @private
     */
    static _parseSpell(content) {
        const lines = content.split(/\r?\n/).map(line => line.trim());
        const data = {
            name: this._extractName(lines),
            level: this._extractSpellLevel(lines),
            school: this._extractSpellSchool(lines),
            castingTime: this._extractKeyValuePair(lines, 'casting time'),
            range: this._extractKeyValuePair(lines, 'range'),
            components: this._extractComponents(lines),
            materials: this._extractMaterials(lines),
            duration: this._extractKeyValuePair(lines, 'duration'),
            description: this._extractDescription(lines),
            ritual: this._checkForRitual(lines),
            source: this._extractSource(lines)
        };
        
        return data;
    }
    
    /**
     * Parse item content
     * @param {string} content - The item content text
     * @returns {Object} - Structured item data
     * @private
     */
    static _parseItem(content) {
        const lines = content.split(/\r?\n/).map(line => line.trim());
        const data = {
            name: this._extractName(lines),
            type: this._extractItemType(lines),
            subtype: this._extractItemSubtype(lines),
            rarity: this._extractItemRarity(lines),
            attunement: this._checkForAttunement(lines),
            description: this._extractDescription(lines),
            weight: this._extractWeight(lines),
            price: this._extractPrice(lines),
            properties: this._extractItemProperties(lines),
            source: this._extractSource(lines)
        };
        
        return data;
    }
    
    /**
     * Parse monster content
     * @param {string} content - The monster content text
     * @returns {Object} - Structured monster data
     * @private
     */
    static _parseMonster(content) {
        // Use the dedicated monsterParser for more accurate parsing
        const { monsterParser } = require('./monsterParser.js');
        
        try {
            // Parse the monster statblock using the specialized parser
            const monsterData = monsterParser.parseMonster(content);
            return monsterData;
        } catch (error) {
            spbiUtils.error("Error parsing monster statblock", error);
            
            // Fallback to basic parsing if the specialized parser fails
            const lines = content.split(/\r?\n/).map(line => line.trim());
            const data = {
                name: this._extractName(lines),
                size: this._extractMonsterSize(lines),
                type: this._extractMonsterType(lines),
                alignment: this._extractMonsterAlignment(lines),
                ac: this._extractAC(lines),
                hp: this._extractHP(lines),
                hpFormula: this._extractHPFormula(lines),
                speed: this._extractSpeed(lines),
                abilities: this._extractAbilityScores(lines),
                saves: this._extractSavingThrows(lines),
                skills: this._extractSkills(lines),
                damageResistances: this._extractDamageResistances(lines),
                damageImmunities: this._extractDamageImmunities(lines),
                damageVulnerabilities: this._extractDamageVulnerabilities(lines),
                conditionImmunities: this._extractConditionImmunities(lines),
                senses: this._extractSenses(lines),
                languages: this._extractLanguages(lines),
                cr: this._extractCR(lines),
                traits: this._extractTraits(lines),
                actions: this._extractActions(lines),
                reactions: this._extractReactions(lines),
                legendaryActions: this._extractLegendaryActions(lines),
                description: this._extractDescription(lines),
                source: this._extractSource(lines)
            };
            
            return data;
        }
    }
    
    /**
     * Parse class feature content
     * @param {string} content - The class feature content text
     * @returns {Object} - Structured class feature data
     * @private
     */
    static _parseClassFeature(content) {
        const lines = content.split(/\r?\n/).map(line => line.trim());
        const data = {
            name: this._extractName(lines),
            class: this._extractClass(lines),
            level: this._extractFeatureLevel(lines),
            description: this._extractDescription(lines),
            source: this._extractSource(lines)
        };
        
        return data;
    }
    
    /**
     * Parse feat content
     * @param {string} content - The feat content text
     * @returns {Object} - Structured feat data
     * @private
     */
    static _parseFeat(content) {
        const lines = content.split(/\r?\n/).map(line => line.trim());
        const data = {
            name: this._extractName(lines),
            prerequisites: this._extractPrerequisites(lines),
            description: this._extractDescription(lines),
            source: this._extractSource(lines)
        };
        
        return data;
    }
    
    /**
     * Parse background content
     * @param {string} content - The background content text
     * @returns {Object} - Structured background data
     * @private
     */
    static _parseBackground(content) {
        const lines = content.split(/\r?\n/).map(line => line.trim());
        const data = {
            name: this._extractName(lines),
            skillProficiencies: this._extractSkillProficiencies(lines),
            toolProficiencies: this._extractToolProficiencies(lines),
            languages: this._extractBackgroundLanguages(lines),
            equipment: this._extractBackgroundEquipment(lines),
            feature: this._extractBackgroundFeature(lines),
            description: this._extractDescription(lines),
            source: this._extractSource(lines)
        };
        
        return data;
    }
    
    /**
     * Extract damage parts from spell description
     * @param {string} description - The spell description
     * @returns {Array} - Array of damage parts [damage, type]
     * @private
     */
    static _extractDamageParts(description) {
        if (!description) return [];
        
        const damageParts = [];
        
        // Common damage patterns in spell descriptions
        const damagePatterns = [
            /(?:take|deals|dealing|suffer|receives)\s+(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage/gi,
            /(\d+d\d+(?:\s*\+\s*\d+)?)\s+(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s+damage/gi
        ];
        
        for (const pattern of damagePatterns) {
            let match;
            while ((match = pattern.exec(description)) !== null) {
                const damageDice = match[1].replace(/\s+/g, '');
                const damageType = match[2].toLowerCase();
                
                // Check if this damage type is already in the array
                const existingIndex = damageParts.findIndex(part => part[1] === damageType);
                
                if (existingIndex >= 0) {
                    // If it exists, use the higher damage dice (assuming it's an "at higher levels" variant)
                    const existingDice = damageParts[existingIndex][0];
                    if (this._compareDamageDice(damageDice, existingDice) > 0) {
                        damageParts[existingIndex][0] = damageDice;
                    }
                } else {
                    // Otherwise add it as a new damage type
                    damageParts.push([damageDice, damageType]);
                }
            }
        }
        
        return damageParts;
    }
    
    /**
     * Compare two damage dice expressions to determine which is higher
     * @param {string} dice1 - First dice expression (e.g., "2d6+2")
     * @param {string} dice2 - Second dice expression
     * @returns {number} - Positive if dice1 > dice2, negative if dice1 < dice2, 0 if equal
     * @private
     */
    static _compareDamageDice(dice1, dice2) {
        // Simple heuristic: compare the first number (number of dice)
        const dice1Count = parseInt(dice1.match(/(\d+)d/)?.[1] || '0');
        const dice2Count = parseInt(dice2.match(/(\d+)d/)?.[1] || '0');
        
        if (dice1Count !== dice2Count) {
            return dice1Count - dice2Count;
        }
        
        // If same number of dice, compare the dice size
        const dice1Size = parseInt(dice1.match(/d(\d+)/)?.[1] || '0');
        const dice2Size = parseInt(dice2.match(/d(\d+)/)?.[1] || '0');
        
        if (dice1Size !== dice2Size) {
            return dice1Size - dice2Size;
        }
        
        // If same dice, compare the modifier
        const dice1Mod = parseInt(dice1.match(/\+(\d+)/)?.[1] || '0');
        const dice2Mod = parseInt(dice2.match(/\+(\d+)/)?.[1] || '0');
        
        return dice1Mod - dice2Mod;
    }
    
    /**
     * Extract save ability from spell description
     * @param {string} description - The spell description
     * @returns {string} - The save ability (str, dex, con, int, wis, cha)
     * @private
     */
    static _extractSaveAbility(description) {
        if (!description) return "";
        
        const savePatterns = [
            /make\s+a\s+(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i,
            /(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw/i
        ];
        
        for (const pattern of savePatterns) {
            const match = description.match(pattern);
            if (match) {
                const ability = match[1].toLowerCase();
                // Convert to abbreviation
                switch (ability) {
                    case 'strength': return 'str';
                    case 'dexterity': return 'dex';
                    case 'constitution': return 'con';
                    case 'intelligence': return 'int';
                    case 'wisdom': return 'wis';
                    case 'charisma': return 'cha';
                }
            }
        }
        
        return "";
    }
    
    // Utility extraction methods
    
    /**
     * Extract the name from content lines
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted name
     * @private
     */
    static _extractName(lines) {
        // Name is typically the first non-empty line
        for (const line of lines) {
            if (line.trim().length > 0) {
                return line.trim();
            }
        }
        return "";
    }
    
    /**
     * Extract a key-value pair from content lines
     * @param {Array<string>} lines - Content lines
     * @param {string} key - The key to look for
     * @returns {string} - Extracted value
     * @private
     */
    static _extractKeyValuePair(lines, key) {
        const keyPattern = new RegExp(`^${key}\s*[:\t]\s*(.+)$`, 'i');
        
        for (const line of lines) {
            const match = line.match(keyPattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return "";
    }
    
    /**
     * Extract spell level and school
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted level
     * @private
     */
    static _extractSpellLevel(lines) {
        // Look for level in the second line typically
        if (lines.length > 1) {
            const levelLine = lines[1].toLowerCase();
            
            if (levelLine.includes('cantrip')) {
                return 'cantrip';
            }
            
            const levelMatch = levelLine.match(/(\d+)(?:st|nd|rd|th)?[\s-]?level/);
            if (levelMatch) {
                return levelMatch[1];
            }
        }
        
        return "";
    }
    
    /**
     * Extract spell school
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted school
     * @private
     */
    static _extractSpellSchool(lines) {
        // Look for school in the second line typically
        if (lines.length > 1) {
            const schoolLine = lines[1].toLowerCase();
            
            const schools = ['abjuration', 'conjuration', 'divination', 'enchantment', 
                           'evocation', 'illusion', 'necromancy', 'transmutation'];
            
            for (const school of schools) {
                if (schoolLine.includes(school)) {
                    return school;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Extract spell components
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted components
     * @private
     */
    static _extractComponents(lines) {
        const componentsText = this._extractKeyValuePair(lines, 'components');
        
        // Return the raw components text
        return componentsText;
    }
    
    /**
     * Extract spell materials
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted materials
     * @private
     */
    static _extractMaterials(lines) {
        const componentsText = this._extractKeyValuePair(lines, 'components');
        
        // Look for materials in parentheses
        const materialsMatch = componentsText.match(/\(([^)]+)\)/);
        if (materialsMatch) {
            return materialsMatch[1].trim();
        }
        
        // Also check for a dedicated materials line
        const materialsLine = this._extractKeyValuePair(lines, 'materials');
        if (materialsLine) {
            return materialsLine.trim();
        }
        
        return "";
    }
    
    /**
     * Check if a spell is a ritual
     * @param {Array<string>} lines - Content lines
     * @returns {boolean} - Whether the spell is a ritual
     * @private
     */
    static _checkForRitual(lines) {
        // Check the second line for ritual tag
        if (lines.length > 1) {
            return lines[1].toLowerCase().includes('ritual');
        }
        
        return false;
    }
    
    /**
     * Extract item type
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted item type
     * @private
     */
    static _extractItemType(lines) {
        // Look for type in the second line typically
        if (lines.length > 1) {
            const typeLine = lines[1].toLowerCase();
            
            const types = ['wondrous item', 'armor', 'weapon', 'ring', 'rod', 'staff', 'wand', 
                         'potion', 'scroll', 'tool', 'kit', 'supplies', 'instrument'];
            
            for (const type of types) {
                if (typeLine.includes(type)) {
                    return type;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Extract item subtype
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted item subtype
     * @private
     */
    static _extractItemSubtype(lines) {
        // Look for subtype in parentheses in the second line
        if (lines.length > 1) {
            const subtypeMatch = lines[1].match(/\(([^)]+)\)/);
            if (subtypeMatch) {
                return subtypeMatch[1].trim();
            }
        }
        
        return "";
    }
    
    /**
     * Extract item rarity
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted item rarity
     * @private
     */
    static _extractItemRarity(lines) {
        // Look for rarity in the second line typically
        if (lines.length > 1) {
            const rarityLine = lines[1].toLowerCase();
            
            const rarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
            
            for (const rarity of rarities) {
                if (rarityLine.includes(rarity)) {
                    return rarity;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Check if an item requires attunement
     * @param {Array<string>} lines - Content lines
     * @returns {boolean} - Whether the item requires attunement
     * @private
     */
    static _checkForAttunement(lines) {
        // Look for attunement in the second line typically
        if (lines.length > 1) {
            return lines[1].toLowerCase().includes('attunement');
        }
        
        return false;
    }
    
    /**
     * Extract item weight
     * @param {Array<string>} lines - Content lines
     * @returns {number|null} - Extracted weight
     * @private
     */
    static _extractWeight(lines) {
        // Look for weight in the content
        for (const line of lines) {
            const weightMatch = line.match(/weight\s*[:\t]?\s*(\d+(?:\.\d+)?)\s*(?:lb|pound)/i);
            if (weightMatch) {
                return parseFloat(weightMatch[1]);
            }
        }
        
        return null;
    }
    
    /**
     * Extract item price
     * @param {Array<string>} lines - Content lines
     * @returns {number|null} - Extracted price in gold pieces
     * @private
     */
    static _extractPrice(lines) {
        // Look for price in the content
        for (const line of lines) {
            // Look for gold pieces
            const gpMatch = line.match(/(?:price|cost|value)\s*[:\t]?\s*(\d+(?:\.\d+)?)\s*(?:gp|gold)/i);
            if (gpMatch) {
                return parseFloat(gpMatch[1]);
            }
            
            // Look for silver pieces and convert to gold
            const spMatch = line.match(/(?:price|cost|value)\s*[:\t]?\s*(\d+(?:\.\d+)?)\s*(?:sp|silver)/i);
            if (spMatch) {
                return parseFloat(spMatch[1]) / 10;
            }
            
            // Look for copper pieces and convert to gold
            const cpMatch = line.match(/(?:price|cost|value)\s*[:\t]?\s*(\d+(?:\.\d+)?)\s*(?:cp|copper)/i);
            if (cpMatch) {
                return parseFloat(cpMatch[1]) / 100;
            }
        }
        
        return null;
    }
    
    /**
     * Extract item properties
     * @param {Array<string>} lines - Content lines
     * @returns {Array<string>} - Extracted properties
     * @private
     */
    static _extractItemProperties(lines) {
        const properties = [];
        
        // Common weapon properties
        const weaponProperties = [
            'ammunition', 'finesse', 'heavy', 'light', 'loading', 'reach', 
            'special', 'thrown', 'two-handed', 'versatile'
        ];
        
        // Look for properties in the content
        for (const line of lines) {
            for (const property of weaponProperties) {
                if (line.toLowerCase().includes(property)) {
                    properties.push(property);
                }
            }
        }
        
        return properties;
    }
    
    /**
     * Extract monster size
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted size
     * @private
     */
    static _extractMonsterSize(lines) {
        // Look for size in the second line typically
        if (lines.length > 1) {
            const sizeLine = lines[1].toLowerCase();
            
            const sizes = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];
            
            for (const size of sizes) {
                if (sizeLine.includes(size)) {
                    return size;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Extract monster type
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted type
     * @private
     */
    static _extractMonsterType(lines) {
        // Look for type in the second line typically
        if (lines.length > 1) {
            const typeLine = lines[1].toLowerCase();
            
            const types = ['aberration', 'beast', 'celestial', 'construct', 'dragon', 
                         'elemental', 'fey', 'fiend', 'giant', 'humanoid', 
                         'monstrosity', 'ooze', 'plant', 'undead'];
            
            for (const type of types) {
                if (typeLine.includes(type)) {
                    return type;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Extract monster alignment
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted alignment
     * @private
     */
    static _extractMonsterAlignment(lines) {
        // Look for alignment in the second line typically
        if (lines.length > 1) {
            const alignmentLine = lines[1].toLowerCase();
            
            const alignments = ['lawful good', 'neutral good', 'chaotic good', 
                              'lawful neutral', 'neutral', 'chaotic neutral', 
                              'lawful evil', 'neutral evil', 'chaotic evil', 
                              'unaligned'];
            
            for (const alignment of alignments) {
                if (alignmentLine.includes(alignment)) {
                    return alignment;
                }
            }
        }
        
        return "";
    }
    
    /**
     * Extract monster armor class
     * @param {Array<string>} lines - Content lines
     * @returns {number|null} - Extracted AC
     * @private
     */
    static _extractAC(lines) {
        // Look for AC in the content
        for (const line of lines) {
            const acMatch = line.match(/(?:armor class|ac)\s*[:\t]?\s*(\d+)/i);
            if (acMatch) {
                return parseInt(acMatch[1]);
            }
        }
        
        return null;
    }
    
    /**
     * Extract monster hit points
     * @param {Array<string>} lines - Content lines
     * @returns {number|null} - Extracted HP
     * @private
     */
    static _extractHP(lines) {
        // Look for HP in the content
        for (const line of lines) {
            const hpMatch = line.match(/(?:hit points|hp)\s*[:\t]?\s*(\d+)/i);
            if (hpMatch) {
                return parseInt(hpMatch[1]);
            }
        }
        
        return null;
    }
    
    /**
     * Extract monster hit point formula
     * @param {Array<string>} lines - Content lines
     * @returns {string} - Extracted HP formula
     * @private
     */
    static _extractHPFormula(lines) {
        // Look for HP formula in the content
        for (const line of lines) {
            const formulaMatch = line.match(/(?:hit points|hp)\s*[:\t]?\s*\d+\s*\(([^)]+)\)/i);
            if (formulaMatch) {
                return formulaMatch[1].trim();
            }
        }
        
        return "";
    }
    
    /**
     * Extract monster speed
     * @param {Array<string>} lines - Content lines
     * @returns {Object} - Extracted speed values
     * @private
     */
    static _extractSpeed(lines) {
        const speed = {
            walk: 0,
            fly: 0,
            swim: 0,
            climb: 0,
            burrow: 0
        };
        
        // Look for speed in the content
        for (const line of lines) {
            if (line.toLowerCase().includes('speed')) {
                // Extract walk speed
                const walkMatch = line.match(/speed\s*[:\t]?\s*(\d+)\s*(?:ft|feet)/i);
                if (walkMatch) {
                    speed.walk = parseInt(walkMatch[1]);
                }
                
                // Extract fly speed
                const flyMatch = line.match(/fly\s*[:\t]?\s*(\d+)\s*(?:ft|feet)/i);
                if (flyMatch) {
                    speed.fly = parseInt(flyMatch[1]);
                }
                
                // Extract swim speed
                const swimMatch = line.match(/swim\s*[:\t]?\s*(\d+)\s*(?:ft|feet)/i);
                if (swimMatch) {
                    speed.swim = parseInt(swimMatch[1]);
                }
                
                // Extract climb speed
                const climbMatch = line.match(/climb\s*[:\t]?\s*(\d+)\s*(?:ft|feet)/i);
                if (climbMatch) {
                    speed.climb = parseInt(climbMatch[1]);
                }
                
                // Extract burrow speed
                const burrowMatch = line.match(/burrow\s*[:\t]?\s*(\d+)\s*(?:ft|feet)/i);
                if (burrowMatch) {
                    speed.burrow = parseInt(burrowMatch[1]);
                }
            }
        }
        
        return speed;
    }
    
    /**
     * Extract monster ability scores
     * @param {Array<string>} lines - Content lines
     * @returns {Object} - Extracted ability scores
     * @private
     */
    static _extractAbilityScores(lines) {
        const abilities = {
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10
        };
        
        // Look for ability scores in the content
        for (const line of lines) {
            // Look for a line with all ability scores
            if (/str|dex|con|int|wis|cha/i.test(line)) {
                // Extract STR
                const strMatch = line.match(/str\s*[:\t]?\s*(\d+)/i);
                if (strMatch) {
                    abilities.str = parseInt(strMatch[1]);
                }
                
                // Extract DEX
                const dexMatch = line.match(/dex\s*[:\t]?\s*(\d+)/i);
                if (dexMatch) {
                    abilities.dex = parseInt(dexMatch[1]);
                }
                
                // Extract CON
                const conMatch = line.match(/con\s*[:\t]?\s*(\d+)/i);
                if (conMatch) {
                    abilities.con = parseInt(conMatch[1]);
                }
                
                // Extract INT
                const intMatch = line.match(/int\s*[:\t]?\s*(\d+)/i);
                if (intMatch) {
                    abilities.int = parseInt(intMatch[1]);
                }
                
                // Extract WIS
                const wisMatch = line.match(/wis\s*[:\t]?\s*(\d+)/i);
                if (wisMatch) {
                    abilities.wis = parseInt(wisMatch[1]);
                }
                
                // Extract CHA
                const chaMatch = line.match(/cha\s*[:\t]?\s*(\d+)/i);
                if (chaMatch) {
                    abilities.cha = parseInt(chaMatch[1]);
                }
            }
        }
        
        return abilities;
    }
    
    /**
     * Extract monster saving throws
     * @param {Array<string>} lines - Content lines
     * @returns {Object} - Extracted saving throw bonuses
     * @private
     */
    static _extractSavingThrows(lines) {
        const saves = {};
        
        // Look for saving throws in the content
        for (const line of lines) {
            if (line.toLowerCase().includes('saving throws')) {
                // Extract STR save
                const strMatch = line.match(/str\s*[:\t]?\s*([+-]\d+)/i);
                if (strMatch) {
                    saves.str = parseInt(strMatch[1]);
                }
                
                // Extract DEX save
                const dexMatch = line.match(/dex\s*[:\t]?\s*([+-]\d+)/i);
                if (dexMatch) {
                    saves.dex = parseInt(dexMatch[1]);
                }
                
                // Extract CON save
                const conMatch = line.match(/con\s*[:\t]?\s*([+-]\d+)/i);
                if (conMatch) {
                    saves.con = parseInt(conMatch[1]);
                }
                
                // Extract INT save
                const intMatch = line.match(/int\s*[:\t]?\s*([+-]\d+)/i);
                if (intMatch) {
                    saves.int = parseInt(intMatch[1]);
                }
                
                // Extract WIS save
                const wisMatch = line.match(/wis\s*[:\t]?\s*([+-]\d+)/i);
                if (wisMatch) {
                    saves.wis = parseInt(wisMatch[1]);
                }
                
                // Extract CHA save
                const chaMatch = line.match(/cha\s*[:\t]?\s*([+-]\d+)/i);
                if (chaMatch) {
                    saves.cha = parseInt(chaMatch[1]);
                }
            }
        }
        
        return saves;
    }
    
    /**
     * Extract monster skills
     * @param {Array<string>} lines - Content lines
     * @returns {Object} - Extracted skill bonuses
     * @private
     */
    static _extractSkills(lines) {
        const skills = {};
        
        // Look for skills in the content
        for (const line of lines) {
            if (line.toLowerCase().includes('skills')) {
                // Extract common skills
                const skillMatches = line.matchAll(/(\w+)\s*[:\t]?\s*([+-]\d+)/g);
                
                for (const match of skillMatches) {
                    const skillName = match[1].toLowerCase();
                    const bonus = parseInt(match[2]);
                    
                    // Map skill names to their proper keys
                    const skillMap = {
                        'acrobatics': 'acr',
                        'animal handling': 'ani',
                        'arcana': 'arc',
                        'athletics': 'ath',
                        'deception': 'dec',
                        'history': 'his',
                        'insight': 'ins',
                        'intimidation': 'itm',
                        'investigation': 'inv',
                        'medicine': 'med',
                        'nature': 'nat',
                        'perception': 'prc',
                        'performance': 'prf',
                        'persuasion': 'per',
                        'religion': 'rel',
                        'sleight of hand': 'slt',
                        'stealth': 'ste',
                        'survival': 'sur'
                    };
                    
                    if (skillMap[skillName]) {
                        skills[skillMap[skillName]] = bonus;
                    }
                }
            }
        }
        
        return skills;
    }
    
    /**
     * Extract monster damage resistances
     * @param {Array<string>} lines - Content lines
     * @returns {Array<string>} - Extracted damage resistances
     * @private
     */
    static _extractDamageResistances(lines) {
        return this._extractTraitList(lines, "Damage Resistances");
    }
}