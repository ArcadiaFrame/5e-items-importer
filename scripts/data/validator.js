/**
 * Validator module for 5e-content-importer
 * Validates extracted data against dnd5e system requirements
 */

import { spbiUtils } from "../spbiUtils.js";

export class validator {
    /**
     * Validate extracted data against dnd5e system requirements
     * @param {string} type - The type of content (spell, item, monster, etc.)
     * @param {Object} data - The data to validate
     * @returns {Object} - Validated data with any corrections applied
     */
    static validateData(type, data) {
        spbiUtils.log(`Validating ${type} data`);
        
        switch (type) {
            case 'spell':
                return this._validateSpellData(data);
            case 'item':
                return this._validateItemData(data);
            case 'monster':
                return this._validateMonsterData(data);
            case 'classFeature':
                return this._validateClassFeatureData(data);
            case 'feat':
                return this._validateFeatData(data);
            default:
                throw new Error(`Unknown content type: ${type}`);
        }
    }
    
    /**
     * Validate spell data
     * @param {Object} data - The spell data to validate
     * @returns {Object} - Validated spell data
     * @private
     */
    static _validateSpellData(data) {
        // Ensure required fields are present
        if (!data.name) {
            throw new Error("Spell must have a name");
        }
        
        // Validate and correct spell level
        if (data.system.level === undefined || data.system.level === null) {
            data.system.level = 0;
            spbiUtils.log("Warning: Spell level not detected, defaulting to 0 (cantrip)");
        } else if (typeof data.system.level !== 'number') {
            data.system.level = parseInt(data.system.level) || 0;
        }
        
        // Validate spell school
        const validSchools = ["abj", "con", "div", "enc", "evo", "ill", "nec", "trs"];
        if (!validSchools.includes(data.system.school)) {
            data.system.school = "abj";
            spbiUtils.log("Warning: Invalid spell school detected, defaulting to abjuration");
        }
        
        // Validate components
        if (!data.system.components) {
            data.system.components = {
                value: "",
                vocal: false,
                somatic: false,
                material: false,
                ritual: false,
                concentration: false
            };
        }
        
        // Validate damage parts
        if (data.system.damage && data.system.damage.parts) {
            data.system.damage.parts = data.system.damage.parts.filter(part => {
                // Each part should be an array with at least 2 elements
                return Array.isArray(part) && part.length >= 2 && part[0];
            });
        }
        
        return data;
    }
    
    /**
     * Validate item data
     * @param {Object} data - The item data to validate
     * @returns {Object} - Validated item data
     * @private
     */
    static _validateItemData(data) {
        // Ensure required fields are present
        if (!data.name) {
            throw new Error("Item must have a name");
        }
        
        // Validate item type
        const validTypes = ["weapon", "equipment", "consumable", "tool", "loot", "container"];
        if (!validTypes.includes(data.type)) {
            data.type = "loot";
            spbiUtils.log(`Warning: Invalid item type '${data.type}', defaulting to loot`);
        }
        
        // Type-specific validation
        switch (data.type) {
            case "weapon":
                this._validateWeaponData(data);
                break;
            case "equipment":
                this._validateEquipmentData(data);
                break;
            case "consumable":
                this._validateConsumableData(data);
                break;
            case "tool":
                this._validateToolData(data);
                break;
        }
        
        // Validate quantity
        if (typeof data.system.quantity !== 'number' || data.system.quantity < 1) {
            data.system.quantity = 1;
        }
        
        // Validate weight
        if (typeof data.system.weight !== 'number' || isNaN(data.system.weight)) {
            data.system.weight = 0;
        }
        
        // Validate price
        if (typeof data.system.price !== 'number' || isNaN(data.system.price)) {
            data.system.price = 0;
        }
        
        return data;
    }
    
    /**
     * Validate weapon data
     * @param {Object} data - The weapon data to validate
     * @private
     */
    static _validateWeaponData(data) {
        // Validate weapon type
        const validWeaponTypes = ["simpleM", "simpleMR", "martialM", "martialMR", "simpleR", "martialR", "natural", "improv", "siege"];
        if (!validWeaponTypes.includes(data.system.weaponType)) {
            data.system.weaponType = "simpleM";
            spbiUtils.log("Warning: Invalid weapon type, defaulting to simple melee");
        }
        
        // Validate damage
        if (!data.system.damage) {
            data.system.damage = {
                parts: [],
                versatile: ""
            };
        }
        
        // Validate range
        if (!data.system.range) {
            data.system.range = {
                value: null,
                long: null,
                units: "ft"
            };
        }
    }
    
    /**
     * Validate equipment data
     * @param {Object} data - The equipment data to validate
     * @private
     */
    static _validateEquipmentData(data) {
        // Validate armor type
        const validArmorTypes = ["light", "medium", "heavy", "natural", "shield", "clothing"];
        if (!data.system.armor || !validArmorTypes.includes(data.system.armor.type)) {
            if (!data.system.armor) data.system.armor = {};
            data.system.armor.type = "light";
            spbiUtils.log("Warning: Invalid armor type, defaulting to light");
        }
        
        // Validate armor value
        if (!data.system.armor.value || typeof data.system.armor.value !== 'number') {
            data.system.armor.value = 10;
        }
    }
    
    /**
     * Validate consumable data
     * @param {Object} data - The consumable data to validate
     * @private
     */
    static _validateConsumableData(data) {
        // Validate consumable type
        const validConsumableTypes = ["ammo", "potion", "poison", "food", "scroll", "wand", "rod", "trinket"];
        if (!data.system.consumableType || !validConsumableTypes.includes(data.system.consumableType)) {
            data.system.consumableType = "other";
            spbiUtils.log("Warning: Invalid consumable type, defaulting to other");
        }
        
        // Validate uses
        if (!data.system.uses) {
            data.system.uses = {
                value: 1,
                max: 1,
                per: "charges",
                autoDestroy: false
            };
        }
    }
    
    /**
     * Validate tool data
     * @param {Object} data - The tool data to validate
     * @private
     */
    static _validateToolData(data) {
        // Validate tool type
        const validToolTypes = ["art", "game", "music", "thief", "herb", "nav", "poison", "disg", "forg"];
        if (!data.system.toolType || !validToolTypes.includes(data.system.toolType)) {
            data.system.toolType = "art";
            spbiUtils.log("Warning: Invalid tool type, defaulting to artisan's tools");
        }
        
        // Validate ability
        const validAbilities = ["str", "dex", "con", "int", "wis", "cha"];
        if (!data.system.ability || !validAbilities.includes(data.system.ability)) {
            data.system.ability = "int";
            spbiUtils.log("Warning: Invalid tool ability, defaulting to Intelligence");
        }
        
        // Validate uses
        if (!data.system.uses) {
            data.system.uses = {
                value: 1,
                max: 1,
                per: "charges",
                autoDestroy: false
            };
        }
    }
    
    /**
     * Validate monster data
     * @param {Object} data - The monster data to validate
     * @returns {Object} - Validated monster data
     * @private
     */
    static _validateMonsterData(data) {
        // Ensure required fields are present
        if (!data.name) {
            throw new Error("Monster must have a name");
        }
        
        // Validate abilities
        const abilities = ["str", "dex", "con", "int", "wis", "cha"];
        for (const ability of abilities) {
            if (!data.system.abilities[ability] || typeof data.system.abilities[ability].value !== 'number') {
                if (!data.system.abilities[ability]) data.system.abilities[ability] = {};
                data.system.abilities[ability].value = 10;
                spbiUtils.log(`Warning: Invalid ${ability} score, defaulting to 10`);
            }
        }
        
        // Validate AC
        if (!data.system.attributes.ac || typeof data.system.attributes.ac.value !== 'number') {
            if (!data.system.attributes.ac) data.system.attributes.ac = {};
            data.system.attributes.ac.value = 10;
            spbiUtils.log("Warning: Invalid AC, defaulting to 10");
        }
        
        // Validate HP
        if (!data.system.attributes.hp) {
            data.system.attributes.hp = {
                value: 10,
                max: 10,
                formula: ""
            };
            spbiUtils.log("Warning: Invalid HP, defaulting to 10");
        }
        
        // Validate size
        const validSizes = ["tiny", "sm", "med", "lg", "huge", "grg"];
        if (!data.system.traits.size || !validSizes.includes(data.system.traits.size)) {
            data.system.traits.size = "med";
            spbiUtils.log("Warning: Invalid size, defaulting to medium");
        }
        
        // Validate CR
        if (data.system.details.cr === undefined || data.system.details.cr === null) {
            data.system.details.cr = 0;
            spbiUtils.log("Warning: Invalid CR, defaulting to 0");
        }
        
        return data;
    }
    
    /**
     * Validate class feature data
     * @param {Object} data - The class feature data to validate
     * @returns {Object} - Validated class feature data
     * @private
     */
    static _validateClassFeatureData(data) {
        // Ensure required fields are present
        if (!data.name) {
            throw new Error("Class feature must have a name");
        }
        
        // Validate description
        if (!data.system.description || !data.system.description.value) {
            if (!data.system.description) data.system.description = {};
            data.system.description.value = "";
        }
        
        return data;
    }
    
    /**
     * Validate feat data
     * @param {Object} data - The feat data to validate
     * @returns {Object} - Validated feat data
     * @private
     */
    static _validateFeatData(data) {
        // Ensure required fields are present
        if (!data.name) {
            throw new Error("Feat must have a name");
        }
        
        // Validate description
        if (!data.system.description || !data.system.description.value) {
            if (!data.system.description) data.system.description = {};
            data.system.description.value = "";
        }
        
        return data;
    }
}