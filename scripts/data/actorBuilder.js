/**
 * Actor Builder module for 5e-content-importer
 * Handles creation of Foundry VTT actors from parsed monster data
 * Adapts functionality from 5e-statblock-importer's sbiActor.js
 */

import { spbiUtils } from "../spbiUtils.js";

export class actorBuilder {
    /**
     * Create a Foundry VTT actor from parsed monster data
     * @param {Object} monsterData - The parsed monster data
     * @param {string} folderId - The folder ID to create the actor in
     * @returns {Promise<Actor>} - The created actor
     */
    static async createActor(monsterData, folderId) {
        spbiUtils.log("Creating actor from monster data", monsterData);
        
        // Create the base actor data
        const actorData = this._buildActorData(monsterData);
        
        try {
            // Create the actor
            const actor = await Actor.create({
                name: monsterData.name,
                type: "npc",
                folder: folderId || null,
                system: actorData.system,
                img: await this._findActorImage(monsterData.name, monsterData.type)
            });
            
            // Create embedded items (actions, features, etc.)
            if (actor) {
                await this._createEmbeddedItems(actor, monsterData);
                spbiUtils.log("Actor created successfully", actor);
            }
            
            return actor;
        } catch (error) {
            spbiUtils.error("Error creating actor", error);
            throw error;
        }
    }
    
    /**
     * Build the actor data object for Foundry VTT
     * @param {Object} monsterData - The parsed monster data
     * @returns {Object} - The actor data object
     * @private
     */
    static _buildActorData(monsterData) {
        const actorData = {
            system: {
                abilities: this._buildAbilities(monsterData.abilities),
                attributes: {
                    ac: this._buildArmorClass(monsterData.ac),
                    hp: this._buildHitPoints(monsterData.hp),
                    movement: this._buildMovement(monsterData.speed)
                },
                details: {
                    alignment: monsterData.alignment,
                    type: this._buildCreatureType(monsterData.type),
                    cr: monsterData.challenge.cr,
                    xp: {
                        value: monsterData.challenge.xp
                    },
                    source: ""
                },
                traits: {
                    size: this._mapSize(monsterData.size),
                    languages: {
                        value: monsterData.languages.map(lang => lang.toLowerCase())
                    },
                    di: {
                        value: monsterData.damageImmunities,
                        custom: ""
                    },
                    dr: {
                        value: monsterData.damageResistances,
                        custom: ""
                    },
                    dv: {
                        value: monsterData.damageVulnerabilities,
                        custom: ""
                    },
                    ci: {
                        value: monsterData.conditionImmunities,
                        custom: ""
                    }
                }
            }
        };
        
        // Add saving throws
        this._addSavingThrows(actorData, monsterData.savingThrows);
        
        // Add skills
        this._addSkills(actorData, monsterData.skills);
        
        // Add senses
        this._addSenses(actorData, monsterData.senses);
        
        // Add biography from other info
        if (monsterData.otherInfo && monsterData.otherInfo.length) {
            actorData.system.details.biography = {
                value: monsterData.otherInfo.join("\n")
            };
        }
        
        return actorData;
    }
    
    /**
     * Build abilities object
     * @param {Object} abilities - The parsed abilities
     * @returns {Object} - The abilities object for Foundry
     * @private
     */
    static _buildAbilities(abilities) {
        const result = {};
        const defaultScore = 10;
        
        // Set default ability scores
        for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
            result[ability] = {
                value: abilities[ability] || defaultScore
            };
        }
        
        return result;
    }
    
    /**
     * Build armor class object
     * @param {Object} ac - The parsed AC data
     * @returns {Object} - The AC object for Foundry
     * @private
     */
    static _buildArmorClass(ac) {
        return {
            value: ac.value,
            formula: ac.formula || ""
        };
    }
    
    /**
     * Build hit points object
     * @param {Object} hp - The parsed HP data
     * @returns {Object} - The HP object for Foundry
     * @private
     */
    static _buildHitPoints(hp) {
        return {
            value: hp.value,
            max: hp.value,
            formula: hp.formula || ""
        };
    }
    
    /**
     * Build movement object
     * @param {Array} speeds - The parsed speed data
     * @returns {Object} - The movement object for Foundry
     * @private
     */
    static _buildMovement(speeds) {
        const movement = {
            walk: 0,
            fly: 0,
            swim: 0,
            climb: 0,
            burrow: 0,
            hover: false
        };
        
        for (const speed of speeds) {
            if (speed.type in movement) {
                movement[speed.type] = speed.value;
            }
            
            // Check for hover
            if (speed.type === "fly" && speed.hover) {
                movement.hover = true;
            }
        }
        
        return movement;
    }
    
    /**
     * Build creature type object
     * @param {string} type - The creature type
     * @returns {Object} - The creature type object for Foundry
     * @private
     */
    static _buildCreatureType(type) {
        return {
            value: type,
            subtype: "",
            swarm: "",
            custom: ""
        };
    }
    
    /**
     * Map size string to Foundry size value
     * @param {string} size - The size string
     * @returns {string} - The Foundry size value
     * @private
     */
    static _mapSize(size) {
        const sizeMap = {
            "tiny": "tiny",
            "small": "sm",
            "medium": "med",
            "large": "lg",
            "huge": "huge",
            "gargantuan": "grg"
        };
        
        return sizeMap[size.toLowerCase()] || "med";
    }
    
    /**
     * Add saving throws to actor data
     * @param {Object} actorData - The actor data object
     * @param {Array} savingThrows - The parsed saving throws
     * @private
     */
    static _addSavingThrows(actorData, savingThrows) {
        for (const save of savingThrows) {
            if (save.ability in actorData.system.abilities) {
                actorData.system.abilities[save.ability].proficient = 1;
                // Override the calculated bonus if needed
                if (save.override) {
                    actorData.system.abilities[save.ability].bonuses = {
                        check: save.bonus.toString()
                    };
                }
            }
        }
    }
    
    /**
     * Add skills to actor data
     * @param {Object} actorData - The actor data object
     * @param {Array} skills - The parsed skills
     * @private
     */
    static _addSkills(actorData, skills) {
        if (!actorData.system.skills) {
            actorData.system.skills = {};
        }
        
        const skillMap = {
            "acrobatics": { ability: "dex", key: "acr" },
            "animal handling": { ability: "wis", key: "ani" },
            "arcana": { ability: "int", key: "arc" },
            "athletics": { ability: "str", key: "ath" },
            "deception": { ability: "cha", key: "dec" },
            "history": { ability: "int", key: "his" },
            "insight": { ability: "wis", key: "ins" },
            "intimidation": { ability: "cha", key: "itm" },
            "investigation": { ability: "int", key: "inv" },
            "medicine": { ability: "wis", key: "med" },
            "nature": { ability: "int", key: "nat" },
            "perception": { ability: "wis", key: "prc" },
            "performance": { ability: "cha", key: "prf" },
            "persuasion": { ability: "cha", key: "per" },
            "religion": { ability: "int", key: "rel" },
            "sleight of hand": { ability: "dex", key: "slt" },
            "stealth": { ability: "dex", key: "ste" },
            "survival": { ability: "wis", key: "sur" }
        };
        
        for (const skill of skills) {
            const skillName = skill.name.toLowerCase();
            if (skillMap[skillName]) {
                const key = skillMap[skillName].key;
                actorData.system.skills[key] = {
                    value: 1, // Proficient
                    ability: skillMap[skillName].ability
                };
                
                // Override the calculated bonus if needed
                if (skill.override) {
                    actorData.system.skills[key].bonuses = {
                        check: skill.bonus.toString()
                    };
                }
            }
        }
    }
    
    /**
     * Add senses to actor data
     * @param {Object} actorData - The actor data object
     * @param {Array} senses - The parsed senses
     * @private
     */
    static _addSenses(actorData, senses) {
        if (!actorData.system.attributes.senses) {
            actorData.system.attributes.senses = {
                darkvision: 0,
                blindsight: 0,
                tremorsense: 0,
                truesight: 0,
                units: "ft",
                special: ""
            };
        }
        
        const specialSenses = [];
        
        for (const sense of senses) {
            if (sense.special) {
                specialSenses.push(sense.type);
                continue;
            }
            
            switch (sense.type) {
                case "darkvision":
                case "blindsight":
                case "tremorsense":
                case "truesight":
                    actorData.system.attributes.senses[sense.type] = sense.range;
                    break;
                default:
                    specialSenses.push(`${sense.type} ${sense.range} ft.`);
                    break;
            }
        }
        
        if (specialSenses.length) {
            actorData.system.attributes.senses.special = specialSenses.join(", ");
        }
    }
    
    /**
     * Create embedded items for the actor
     * @param {Actor} actor - The created actor
     * @param {Object} monsterData - The parsed monster data
     * @returns {Promise<void>}
     * @private
     */
    static async _createEmbeddedItems(actor, monsterData) {
        const items = [];
        
        // Add features
        for (const feature of monsterData.features) {
            items.push(await this._createFeature(feature));
        }
        
        // Add actions
        for (const action of monsterData.actions) {
            items.push(await this._createAction(action));
        }
        
        // Add bonus actions
        for (const bonusAction of monsterData.bonusActions) {
            items.push(await this._createBonusAction(bonusAction));
        }
        
        // Add reactions
        for (const reaction of monsterData.reactions) {
            items.push(await this._createReaction(reaction));
        }
        
        // Add legendary actions
        for (const legendaryAction of monsterData.legendaryActions) {
            items.push(await this._createLegendaryAction(legendaryAction));
        }
        
        // Add lair actions
        for (const lairAction of monsterData.lairActions) {
            items.push(await this._createLairAction(lairAction));
        }
        
        // Add mythic actions
        for (const mythicAction of monsterData.mythicActions) {
            items.push(await this._createMythicAction(mythicAction));
        }
        
        // Add villain actions
        for (const villainAction of monsterData.villainActions) {
            items.push(await this._createVillainAction(villainAction));
        }
        
        // Create the items
        if (items.length) {
            await actor.createEmbeddedDocuments("Item", items);
        }
    }
    
    /**
     * Create a feature item
     * @param {Object} feature - The feature data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createFeature(feature) {
        return {
            name: feature.name,
            type: "feat",
            img: await this._findItemImage(feature.name, "feat"),
            system: {
                description: {
                    value: this._enrichDescription(feature.description)
                },
                source: ""
            }
        };
    }
    
    /**
     * Create an action item
     * @param {Object} action - The action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createAction(action) {
        const itemData = await this._createFeature(action);
        
        // Set activation to action
        itemData.system.activation = {
            type: "action",
            cost: 1
        };
        
        // Check for attack and damage information
        this._parseAttackAndDamage(action, itemData);
        
        return itemData;
    }
    
    /**
     * Create a bonus action item
     * @param {Object} bonusAction - The bonus action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createBonusAction(bonusAction) {
        const itemData = await this._createFeature(bonusAction);
        
        // Set activation to bonus action
        itemData.system.activation = {
            type: "bonus",
            cost: 1
        };
        
        // Check for attack and damage information
        this._parseAttackAndDamage(bonusAction, itemData);
        
        return itemData;
    }
    
    /**
     * Create a reaction item
     * @param {Object} reaction - The reaction data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createReaction(reaction) {
        const itemData = await this._createFeature(reaction);
        
        // Set activation to reaction
        itemData.system.activation = {
            type: "reaction",
            cost: 1
        };
        
        return itemData;
    }
    
    /**
     * Create a legendary action item
     * @param {Object} legendaryAction - The legendary action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createLegendaryAction(legendaryAction) {
        const itemData = await this._createFeature(legendaryAction);
        
        // Set activation to legendary action
        itemData.system.activation = {
            type: "legendary",
            cost: 1
        };
        
        // Check for attack and damage information
        this._parseAttackAndDamage(legendaryAction, itemData);
        
        return itemData;
    }
    
    /**
     * Create a lair action item
     * @param {Object} lairAction - The lair action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createLairAction(lairAction) {
        const itemData = await this._createFeature(lairAction);
        
        // Set activation to lair action
        itemData.system.activation = {
            type: "lair",
            cost: 1
        };
        
        return itemData;
    }
    
    /**
     * Create a mythic action item
     * @param {Object} mythicAction - The mythic action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createMythicAction(mythicAction) {
        const itemData = await this._createFeature(mythicAction);
        
        // Set activation to mythic action
        itemData.system.activation = {
            type: "mythic",
            cost: 1
        };
        
        // Check for attack and damage information
        this._parseAttackAndDamage(mythicAction, itemData);
        
        return itemData;
    }
    
    /**
     * Create a villain action item
     * @param {Object} villainAction - The villain action data
     * @returns {Promise<Object>} - The item data
     * @private
     */
    static async _createVillainAction(villainAction) {
        const itemData = await this._createFeature(villainAction);
        
        // Set activation to villain action
        itemData.system.activation = {
            type: "special",
            cost: 1
        };
        
        // Check for attack and damage information
        this._parseAttackAndDamage(villainAction, itemData);
        
        return itemData;
    }
    
    /**
     * Parse attack and damage information from an action description
     * @param {Object} action - The action data
     * @param {Object} itemData - The item data to update
     * @private
     */
    static _parseAttackAndDamage(action, itemData) {
        const description = action.description;
        
        // Check for attack bonus
        const attackMatch = description.match(/(?:ranged|melee)\s+(?:weapon|spell)?\s*attack\s*:\s*([+-]\d+)\s+to\s+hit/i);
        if (attackMatch) {
            itemData.system.actionType = description.toLowerCase().includes("spell") ? "msak" : "mwak";
            if (description.toLowerCase().includes("ranged")) {
                itemData.system.actionType = description.toLowerCase().includes("spell") ? "rsak" : "rwak";
            }
            
            itemData.system.attack = {
                bonus: attackMatch[1],
                formula: ""
            };
        }
        
        // Check for damage
        const damageMatch = description.match(/(?:hit|damage):\s*(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([a-z]+)\s*damage/i);
        if (damageMatch) {
            itemData.system.damage = {
                parts: [
                    [damageMatch[2], damageMatch[3]]
                ]
            };
        }
        
        // Check for saving throw
        const saveMatch = description.match(/DC\s+(\d+)\s+([a-z]+)\s+(?:saving throw|save)/i);
        if (saveMatch) {
            itemData.system.actionType = "save";
            itemData.system.save = {
                ability: saveMatch[2].substring(0, 3).toLowerCase(),
                dc: parseInt(saveMatch[1]),
                scaling: "flat"
            };
            
            // Check for save damage
            const saveDamageMatch = description.match(/(?:takes|taking)\s*(\d+)\s*\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)\s*([a-z]+)\s*damage/i);
            if (saveDamageMatch) {
                itemData.system.damage = {
                    parts: [
                        [saveDamageMatch[2], saveDamageMatch[3]]
                    ]
                };
            }
        }
    }
    
    /**
     * Enrich a description with Foundry VTT formatting
     * @param {string} description - The raw description
     * @returns {string} - The enriched description
     * @private
     */
    static _enrichDescription(description) {
        let enriched = description;
        
        // Format attack and damage rolls
        enriched = enriched.replace(/\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b/g, "[[/r $1]]")
        
        // Format saving throws
        enriched = enriched.replace(/DC\s+(\d+)\s+([a-z]+)/gi, "DC $1 $2");
        
        // Format conditions
        const conditions = [
            "blinded", "charmed", "deafened", "exhaustion", "frightened", 
            "grappled", "incapacitated", "invisible", "paralyzed", "petrified", 
            "poisoned", "prone", "restrained", "stunned", "unconscious"
        ];
        
        for (const condition of conditions) {
            const regex = new RegExp(`\\b${condition}\\b`, "gi");
            enriched = enriched.replace(regex, `<em>${condition}</em>`);
        }
        
        // Wrap in paragraph tags if not already
        if (!enriched.startsWith("<p>")) {
            enriched = `<p>${enriched}</p>`;
        }
        
        return enriched;
    }
    
    /**
     * Find an image for an actor
     * @param {string} name - The actor name
     * @param {string} type - The actor type
     * @returns {Promise<string>} - The image path
     * @private
     */
    static async _findActorImage(name, type) {
        // Default image
        let imgPath = "icons/svg/mystery-man.svg";
        
        // Try to find a matching image in the core icons
        const searchTerms = [name.toLowerCase(), type.toLowerCase()];
        
        // Check for common monster types to use appropriate icons
        const typeIcons = {
            "aberration": "tentacles",
            "beast": "paw",
            "celestial": "angel",
            "construct": "robot",
            "dragon": "dragon",
            "elemental": "fire",
            "fey": "fairy",
            "fiend": "devil",
            "giant": "giant",
            "humanoid": "person",
            "monstrosity": "monster",
            "ooze": "slime",
            "plant": "tree",
            "undead": "skull"
        };
        
        if (typeIcons[type]) {
            searchTerms.push(typeIcons[type]);
        }
        
        // TODO: Implement image search logic
        // This would ideally search through available assets
        
        return imgPath;
    }
    
    /**
     * Find an image for an item
     * @param {string} name - The item name
     * @param {string} type - The item type
     * @returns {Promise<string>} - The image path
     * @private
     */
    static async _findItemImage(name, type) {
        // Default image based on type
        const defaultImages = {
            "feat": "icons/svg/book.svg",
            "weapon": "icons/svg/sword.svg",
            "spell": "icons/svg/spell.svg"
        };
        
        return defaultImages[type] || "icons/svg/item-bag.svg";
    }
}