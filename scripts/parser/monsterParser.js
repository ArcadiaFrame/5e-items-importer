/**
 * Monster Parser module for 5e-content-importer
 * Adapts the parsing logic from 5e-statblock-importer to work with our architecture
 */

import { spbiUtils } from "../spbiUtils.js";

export class monsterParser {
    // Block types from 5e-statblock-importer
    static Blocks = {
        abilities: {id: "abilities", name: "Abilities", top: true},
        actions: {id: "actions", name: "Actions"},
        armor: {id: "armor", name: "Armor", top: true},
        bonusActions: {id: "bonusActions", name: "Bonus Actions"},
        challenge: {id: "challenge", name: "Challenge", top: true},
        conditionImmunities: {id: "conditionImmunities", name: "Condition Immunities", top: true},
        damageImmunities: {id: "damageImmunities", name: "Damage Immunities", top: true},
        immunities2024: {id: "immunities2024", name: "Immunities (2024)", top: true},
        damageResistances: {id: "damageResistances", name: "Damage Resistances", top: true},
        damageVulnerabilities: {id: "damageVulnerabilities", name: "Damage Vulnerabilities", top: true},
        features: {id: "features", name: "Features"},
        gear: {id: "gear", name: "Gear", top: true},
        health: {id: "health", name: "Health", top: true},
        initiative: {id: "initiative", name: "Initiative", top: true},
        lairActions: {id: "lairActions", name: "Lair Actions"},
        languages: {id: "languages", name: "Languages", top: true},
        legendaryActions: {id: "legendaryActions", name: "Legendary Actions"},
        mythicActions: {id: "mythicActions", name: "Mythic Actions"},
        name: {id: "name", name: "Name"},
        proficiencyBonus: {id: "proficiencyBonus", name: "Proficiency Bonus", top: true},
        racialDetails: {id: "racialDetails", name: "Racial Details", top: true},
        reactions: {id: "reactions", name: "Reactions"},
        savingThrows: {id: "savingThrows", name: "Saving Throws", top: true},
        senses: {id: "senses", name: "Senses", top: true},
        skills: {id: "skills", name: "Skills", top: true},
        souls: {id: "souls", name: "Souls", top: true},
        speed: {id: "speed", name: "Speed", top: true},
        traits: {id: "traits", name: "Traits"},
        utilitySpells: {id: "utilitySpells", name: "Utility Spells"},
        villainActions: {id: "villainActions", name: "Villain Actions"},
        otherBlock: {id: "otherBlock", name: "Other (Bio)"}
    };

    // Regular expressions for identifying different parts of a monster statblock
    static #regex = {
        // Basic monster information
        racialDetails: /^(tiny|small|medium|large|huge|gargantuan)\s+(aberration|beast|celestial|construct|dragon|elemental|fey|fiend|giant|humanoid|monstrosity|ooze|plant|undead)(\s*\(([^\)]+)\))?\s*,\s*(lawful good|neutral good|chaotic good|lawful neutral|neutral|chaotic neutral|lawful evil|neutral evil|chaotic evil|unaligned|any alignment|any non-good alignment|any non-lawful alignment|any chaotic alignment)/i,
        
        // Combat stats
        armor: /^armor\s+class\s+(\d+)(?:\s+\(([^\)]+)\))?/i,
        health: /^hit\s+points\s+(\d+)\s*\(([^\)]+)\)/i,
        speed: /^speed\s+(.+)/i,
        
        // Ability scores
        abilities: /^(str|dex|con|int|wis|cha)\s+(\d+)\s*\(([-+]\d+)\)/i,
        
        // Saving throws and skills
        savingThrows: /^saving\s+throws\s+(.+)/i,
        skills: /^skills\s+(.+)/i,
        
        // Damage and condition modifiers
        damageVulnerabilities: /^damage\s+vulnerabilities\s+(.+)/i,
        damageResistances: /^damage\s+resistances\s+(.+)/i,
        damageImmunities: /^damage\s+immunities\s+(.+)/i,
        conditionImmunities: /^condition\s+immunities\s+(.+)/i,
        immunities2024: /^immunities\s+(.+)/i,
        
        // Senses and languages
        senses: /^senses\s+(.+)/i,
        languages: /^languages\s+(.+)/i,
        
        // Challenge rating
        challenge: /^challenge\s+(\d+\/\d+|\d+)\s*\(([^\)]+)\s*\)/i,
        
        // Section headers
        actions: /^actions$/i,
        bonusActions: /^bonus\s+actions$/i,
        reactions: /^reactions$/i,
        legendaryActions: /^legendary\s+actions$/i,
        lairActions: /^lair\s+actions$/i,
        mythicActions: /^mythic\s+actions$/i,
        villainActions: /^villain\s+actions$/i,
        
        // Feature blocks
        blockTitle: /^([A-Z][\w\s]+)\./,
        otherBlock: /^([A-Z][\w\s]{0,30})\./,
        
        // Utility
        removeNewLines: /(?<header>Hit Points|Armor Class|Speed|Saving Throws|Skills|Damage Vulnerabilities|Damage Resistances|Damage Immunities|Condition Immunities|Immunities|Senses|Languages|Challenge)\s*\n/g
    };

    /**
     * Parse a monster statblock into structured data
     * @param {string} content - The monster statblock text
     * @returns {Object} - Structured monster data
     */
    static parseMonster(content) {
        spbiUtils.log("Parsing monster statblock");
        
        // Clean up the input text
        const cleanedText = this._cleanInput(content);
        
        // Split into lines
        const lines = cleanedText.split("\n").map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length === 0) {
            throw new Error("No content to parse");
        }
        
        // Extract the monster name (first line)
        const name = lines.shift();
        
        // Parse the statblock into blocks
        const blocks = this._parseIntoBlocks(lines);
        
        // Create the monster data structure
        const monsterData = {
            name: name,
            type: this._extractType(blocks),
            size: this._extractSize(blocks),
            alignment: this._extractAlignment(blocks),
            ac: this._extractAC(blocks),
            hp: this._extractHP(blocks),
            speed: this._extractSpeed(blocks),
            abilities: this._extractAbilities(blocks),
            savingThrows: this._extractSavingThrows(blocks),
            skills: this._extractSkills(blocks),
            damageVulnerabilities: this._extractDamageVulnerabilities(blocks),
            damageResistances: this._extractDamageResistances(blocks),
            damageImmunities: this._extractDamageImmunities(blocks),
            conditionImmunities: this._extractConditionImmunities(blocks),
            senses: this._extractSenses(blocks),
            languages: this._extractLanguages(blocks),
            challenge: this._extractChallenge(blocks),
            features: this._extractFeatures(blocks),
            actions: this._extractActions(blocks),
            bonusActions: this._extractBonusActions(blocks),
            reactions: this._extractReactions(blocks),
            legendaryActions: this._extractLegendaryActions(blocks),
            lairActions: this._extractLairActions(blocks),
            mythicActions: this._extractMythicActions(blocks),
            villainActions: this._extractVillainActions(blocks),
            otherInfo: this._extractOtherInfo(blocks)
        };
        
        spbiUtils.log("Monster parsing complete", monsterData);
        return monsterData;
    }
    
    /**
     * Clean and prepare the input text
     * @param {string} text - The raw input text
     * @returns {string} - Cleaned text
     * @private
     */
    static _cleanInput(text) {
        // Strip markdown and clean input
        let cleaned = spbiUtils.stripMarkdownAndCleanInput(text);
        
        // Fix newlines in specific sections
        cleaned = cleaned.replace(this.#regex.removeNewLines, "$<header> ");
        
        return cleaned;
    }
    
    /**
     * Parse the lines into logical blocks
     * @param {Array<string>} lines - The lines of text
     * @returns {Object} - Map of block types to their content
     * @private
     */
    static _parseIntoBlocks(lines) {
        const blocks = new Map();
        let currentBlockId = null;
        let foundTopBlock = true;
        let foundAbilityLine = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Ignore empty lines
            if (!line.length) continue;
            
            // Ignore lines starting with an asterisk
            if (line.startsWith("*")) continue;
            
            // Try to match the line to a block type
            let match = this._getFirstMatch(line, [...blocks.keys()]);
            
            // Handle features block
            if (!match && foundTopBlock && line.match(this.#regex.blockTitle)) {
                foundTopBlock = false;
                currentBlockId = this.Blocks.features.id;
                blocks.set(currentBlockId, []);
            }
            
            // Handle other blocks
            if (!match && !foundAbilityLine && line.match(this.#regex.otherBlock)) {
                foundTopBlock = false;
                currentBlockId = this.Blocks.otherBlock.id;
                if (!blocks.has(currentBlockId)) {
                    blocks.set(currentBlockId, []);
                }
            }
            
            if (match) {
                foundTopBlock = this.Blocks[match]?.top;
            }
            
            // Turn off foundAbilityLine when we hit the next block
            if (match && foundAbilityLine && match !== this.Blocks.abilities.id) {
                foundAbilityLine = false;
            }
            
            if (match && !foundAbilityLine) {
                currentBlockId = match;
                if (!blocks.has(currentBlockId)) {
                    blocks.set(currentBlockId, []);
                }
                
                // Set foundAbilityLine to true when we've found the first ability
                foundAbilityLine = currentBlockId === this.Blocks.abilities.id;
            }
            
            if (blocks.has(currentBlockId)) {
                blocks.get(currentBlockId).push({ lineNumber: i, line });
            }
        }
        
        return blocks;
    }
    
    /**
     * Get the first matching block type for a line
     * @param {string} line - The line to check
     * @param {Array<string>} excludeIds - Block IDs to exclude
     * @returns {string|null} - The matching block ID or null
     * @private
     */
    static _getFirstMatch(line, excludeIds = []) {
        return Object.keys(this.Blocks)
            .filter(b => ![
                "name", 
                "features", 
                "otherBlock"
            ].includes(b))
            .find(b => {
                if (excludeIds.includes(b)) return false;
                if (!this.#regex[b]) return false;
                return line.match(this.#regex[b]);
            });
    }
    
    // Extract methods for each part of the monster statblock
    // These would be implemented based on the 5e-statblock-importer's parsing logic
    
    static _extractType(blocks) {
        const racialDetails = blocks.get(this.Blocks.racialDetails.id);
        if (!racialDetails || !racialDetails.length) return "";
        
        const match = racialDetails[0].line.match(this.#regex.racialDetails);
        if (!match) return "";
        
        return match[2].toLowerCase();
    }
    
    static _extractSize(blocks) {
        const racialDetails = blocks.get(this.Blocks.racialDetails.id);
        if (!racialDetails || !racialDetails.length) return "";
        
        const match = racialDetails[0].line.match(this.#regex.racialDetails);
        if (!match) return "";
        
        return match[1].toLowerCase();
    }
    
    static _extractAlignment(blocks) {
        const racialDetails = blocks.get(this.Blocks.racialDetails.id);
        if (!racialDetails || !racialDetails.length) return "";
        
        const match = racialDetails[0].line.match(this.#regex.racialDetails);
        if (!match) return "";
        
        return match[5].toLowerCase();
    }
    
    static _extractAC(blocks) {
        const armor = blocks.get(this.Blocks.armor.id);
        if (!armor || !armor.length) return { value: 10, formula: "" };
        
        const match = armor[0].line.match(this.#regex.armor);
        if (!match) return { value: 10, formula: "" };
        
        return {
            value: parseInt(match[1]),
            formula: match[2] || ""
        };
    }
    
    static _extractHP(blocks) {
        const health = blocks.get(this.Blocks.health.id);
        if (!health || !health.length) return { value: 0, formula: "" };
        
        const match = health[0].line.match(this.#regex.health);
        if (!match) return { value: 0, formula: "" };
        
        return {
            value: parseInt(match[1]),
            formula: match[2] || ""
        };
    }
    
    static _extractSpeed(blocks) {
        const speed = blocks.get(this.Blocks.speed.id);
        if (!speed || !speed.length) return [];
        
        const match = speed[0].line.match(this.#regex.speed);
        if (!match) return [];
        
        const speedText = match[1];
        const speeds = [];
        
        // Parse different movement types
        const speedTypes = speedText.split(",").map(s => s.trim());
        
        for (const speedType of speedTypes) {
            const typeMatch = speedType.match(/^(?:(\w+)\s+)?([\d]+)\s*(?:ft\.?|feet)?$/i);
            if (typeMatch) {
                const type = typeMatch[1] ? typeMatch[1].toLowerCase() : "walk";
                const value = parseInt(typeMatch[2]);
                speeds.push({ type, value });
            }
        }
        
        return speeds;
    }
    
    static _extractAbilities(blocks) {
        const abilities = blocks.get(this.Blocks.abilities.id);
        if (!abilities || !abilities.length) return {};
        
        const abilityScores = {};
        
        for (const ability of abilities) {
            const match = ability.line.match(this.#regex.abilities);
            if (match) {
                const abilityType = match[1].toLowerCase();
                const score = parseInt(match[2]);
                abilityScores[abilityType] = score;
            }
        }
        
        return abilityScores;
    }
    
    static _extractSavingThrows(blocks) {
        const savingThrows = blocks.get(this.Blocks.savingThrows.id);
        if (!savingThrows || !savingThrows.length) return [];
        
        const match = savingThrows[0].line.match(this.#regex.savingThrows);
        if (!match) return [];
        
        const savesText = match[1];
        const saves = [];
        
        // Parse saving throws
        const saveTypes = savesText.split(",").map(s => s.trim());
        
        for (const saveType of saveTypes) {
            const typeMatch = saveType.match(/^(\w{3})\s+([+-]\d+)$/i);
            if (typeMatch) {
                const ability = typeMatch[1].toLowerCase();
                const bonus = parseInt(typeMatch[2]);
                saves.push({ ability, bonus });
            }
        }
        
        return saves;
    }
    
    static _extractSkills(blocks) {
        const skills = blocks.get(this.Blocks.skills.id);
        if (!skills || !skills.length) return [];
        
        const match = skills[0].line.match(this.#regex.skills);
        if (!match) return [];
        
        const skillsText = match[1];
        const parsedSkills = [];
        
        // Parse skills
        const skillTypes = skillsText.split(",").map(s => s.trim());
        
        for (const skillType of skillTypes) {
            const typeMatch = skillType.match(/^([\w\s]+)\s+([+-]\d+)$/i);
            if (typeMatch) {
                const name = typeMatch[1].trim();
                const bonus = parseInt(typeMatch[2]);
                parsedSkills.push({ name, bonus });
            }
        }
        
        return parsedSkills;
    }
    
    static _extractDamageVulnerabilities(blocks) {
        return this._extractDamageCondition(blocks, this.Blocks.damageVulnerabilities.id);
    }
    
    static _extractDamageResistances(blocks) {
        return this._extractDamageCondition(blocks, this.Blocks.damageResistances.id);
    }
    
    static _extractDamageImmunities(blocks) {
        return this._extractDamageCondition(blocks, this.Blocks.damageImmunities.id);
    }
    
    static _extractConditionImmunities(blocks) {
        return this._extractDamageCondition(blocks, this.Blocks.conditionImmunities.id);
    }
    
    static _extractDamageCondition(blocks, blockId) {
        const blockData = blocks.get(blockId);
        if (!blockData || !blockData.length) return [];
        
        const regexMap = {
            [this.Blocks.damageVulnerabilities.id]: this.#regex.damageVulnerabilities,
            [this.Blocks.damageResistances.id]: this.#regex.damageResistances,
            [this.Blocks.damageImmunities.id]: this.#regex.damageImmunities,
            [this.Blocks.conditionImmunities.id]: this.#regex.conditionImmunities,
            [this.Blocks.immunities2024.id]: this.#regex.immunities2024
        };
        
        const match = blockData[0].line.match(regexMap[blockId]);
        if (!match) return [];
        
        return match[1].split(",").map(item => item.trim().toLowerCase());
    }
    
    static _extractSenses(blocks) {
        const senses = blocks.get(this.Blocks.senses.id);
        if (!senses || !senses.length) return [];
        
        const match = senses[0].line.match(this.#regex.senses);
        if (!match) return [];
        
        const sensesText = match[1];
        const parsedSenses = [];
        
        // Parse senses
        const senseTypes = sensesText.split(",").map(s => s.trim());
        
        for (const senseType of senseTypes) {
            const typeMatch = senseType.match(/^([\w\s]+)\s+([\d]+)\s*(?:ft\.?|feet)?$/i);
            if (typeMatch) {
                const type = typeMatch[1].trim().toLowerCase();
                const range = parseInt(typeMatch[2]);
                parsedSenses.push({ type, range });
            } else {
                // Handle special senses like blindsight
                parsedSenses.push({ type: senseType.toLowerCase(), special: true });
            }
        }
        
        return parsedSenses;
    }
    
    static _extractLanguages(blocks) {
        const languages = blocks.get(this.Blocks.languages.id);
        if (!languages || !languages.length) return [];
        
        const match = languages[0].line.match(this.#regex.languages);
        if (!match) return [];
        
        return match[1].split(",").map(lang => lang.trim());
    }
    
    static _extractChallenge(blocks) {
        const challenge = blocks.get(this.Blocks.challenge.id);
        if (!challenge || !challenge.length) return { cr: 0, xp: 0 };
        
        const match = challenge[0].line.match(this.#regex.challenge);
        if (!match) return { cr: 0, xp: 0 };
        
        const crString = match[1];
        let cr = 0;
        
        // Handle fractional CR
        if (crString.includes("/")) {
            const [numerator, denominator] = crString.split("/").map(n => parseInt(n));
            cr = numerator / denominator;
        } else {
            cr = parseInt(crString);
        }
        
        // Extract XP
        const xpMatch = match[2].match(/(\d+(?:,\d+)*)/); 
        const xp = xpMatch ? parseInt(xpMatch[1].replace(/,/g, "")) : 0;
        
        return { cr, xp };
    }
    
    static _extractFeatures(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.features.id);
    }
    
    static _extractActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.actions.id);
    }
    
    static _extractBonusActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.bonusActions.id);
    }
    
    static _extractReactions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.reactions.id);
    }
    
    static _extractLegendaryActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.legendaryActions.id);
    }
    
    static _extractLairActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.lairActions.id);
    }
    
    static _extractMythicActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.mythicActions.id);
    }
    
    static _extractVillainActions(blocks) {
        return this._extractNamedEntries(blocks, this.Blocks.villainActions.id);
    }
    
    static _extractNamedEntries(blocks, blockId) {
        const entries = blocks.get(blockId);
        if (!entries || !entries.length) return [];
        
        const result = [];
        let currentEntry = null;
        
        // Skip the header line
        for (let i = 1; i < entries.length; i++) {
            const line = entries[i].line;
            const titleMatch = line.match(/^([^.]+)\.(.*)/i);
            
            if (titleMatch) {
                // If we have a current entry, add it to the result
                if (currentEntry) {
                    result.push(currentEntry);
                }
                
                // Start a new entry
                currentEntry = {
                    name: titleMatch[1].trim(),
                    description: titleMatch[2].trim()
                };
            } else if (currentEntry) {
                // Add to the current entry's description
                currentEntry.description += " " + line;
            }
        }
        
        // Add the last entry if there is one
        if (currentEntry) {
            result.push(currentEntry);
        }
        
        return result;
    }
    
    static _extractOtherInfo(blocks) {
        const otherInfo = blocks.get(this.Blocks.otherBlock.id);
        if (!otherInfo || !otherInfo.length) return [];
        
        return otherInfo.map(info => info.line);
    }
}