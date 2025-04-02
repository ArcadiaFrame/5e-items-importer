/**
 * Schema Mapper module for 5e-content-importer
 * Maps extracted data to dnd5e system data structures
 */

import { spbiUtils } from "../spbiUtils.js";

export class schemaMapper {
    static mapToFoundrySchema(type, extractedData) {
        spbiUtils.log(`Mapping ${type} data to Foundry schema`);
        
        switch (type) {
            case 'spell':
                return this._mapSpellData(extractedData);
            case 'item':
                return this._mapItemData(extractedData);
            case 'monster':
                return this._mapMonsterData(extractedData);
            case 'classFeature':
                return this._mapClassFeatureData(extractedData);
            case 'feat':
                return this._mapFeatData(extractedData);
            default:
                throw new Error(`Unknown content type: ${type}`);
        }
    }

    static _mapSpellData(extractedData) {
        const spellData = {
            name: extractedData.name,
            type: "spell",
            img: "modules/5e-content-importer/img/spell.png",
            system: {
                description: { value: extractedData.description || "" },
                source: extractedData.source || "",
                activation: {
                    type: this._mapActivationType(extractedData.castingTime),
                    cost: this._extractActivationCost(extractedData.castingTime),
                    condition: ""
                },
                duration: {
                    value: this._extractDurationValue(extractedData.duration),
                    units: this._mapDurationUnits(extractedData.duration)
                },
                target: {
                    value: this._extractTargetValue(extractedData.range),
                    width: null,
                    units: "ft",
                    type: this._determineTargetType(extractedData.range)
                },
                range: {
                    value: this._extractRangeValue(extractedData.range),
                    long: null,
                    units: this._mapRangeUnits(extractedData.range)
                },
                uses: { value: null, max: null, per: "" },
                consume: { type: "", target: "", amount: null },
                ability: "",
                actionType: this._determineSpellActionType(extractedData),
                attackBonus: 0,
                chatFlavor: "",
                critical: { threshold: null, damage: "" },
                damage: {
                    parts: this._extractDamageParts(extractedData.description),
                    versatile: ""
                },
                formula: "",
                save: {
                    ability: this._extractSaveAbility(extractedData.description),
                    dc: null,
                    scaling: "spell"
                },
                level: this._extractSpellLevel(extractedData.level),
                school: this._mapSpellSchool(extractedData.school),
                components: {
                    value: "",
                    vocal: extractedData.components?.includes('v') || false,
                    somatic: extractedData.components?.includes('s') || false,
                    material: extractedData.components?.includes('m') || false,
                    ritual: extractedData.ritual || false,
                    concentration: extractedData.duration?.toLowerCase().includes('concentration') || false
                },
                materials: {
                    value: extractedData.materials || "",
                    consumed: false,
                    cost: 0,
                    supply: 0
                },
                preparation: { mode: "prepared", prepared: false },
                scaling: {
                    mode: this._determineScalingMode(extractedData),
                    formula: this._extractScalingFormula(extractedData.description)
                }
            }
        };
        return spellData;
    }

    static _mapItemData(extractedData) {
        const itemType = this._determineItemType(extractedData.type);
        const itemData = {
            name: extractedData.name,
            type: itemType,
            img: this._getItemImage(itemType, extractedData.subtype),
            system: {
                description: { value: extractedData.description || "" },
                source: extractedData.source || "",
                quantity: 1,
                weight: extractedData.weight || 0,
                price: extractedData.price || 0,
                attunement: extractedData.attunement ? 1 : 0,
                equipped: false,
                rarity: this._mapItemRarity(extractedData.rarity),
                identified: true
            }
        };

        switch (itemType) {
            case "weapon": this._addWeaponProperties(itemData, extractedData); break;
            case "equipment": this._addEquipmentProperties(itemData, extractedData); break;
            case "consumable": this._addConsumableProperties(itemData, extractedData); break;
            case "tool": this._addToolProperties(itemData, extractedData); break;
            case "loot": this._addLootProperties(itemData, extractedData); break;
            case "container": this._addContainerProperties(itemData, extractedData); break;
        }
        return itemData;
    }

    static _mapMonsterData(extractedData) {
        const { actorBuilder } = require('./actorBuilder.js');
        return extractedData;
    }

    static async createMonsterActor(monsterData, folderId) {
        const { actorBuilder } = await import('./actorBuilder.js');
        return await actorBuilder.createActor(monsterData, folderId);
    }

    static _mapClassFeatureData(extractedData) {
        const featureData = {
            name: extractedData.name,
            type: "feat",
            img: "icons/svg/book.svg",
            system: {
                description: {
                    value: extractedData.description || ""
                },
                source: extractedData.source || "",
                requirements: extractedData.requirements || "",
                recharge: {
                    value: null,
                    charged: false
                }
            }
        };
        
        return featureData;
    }

    static _mapFeatData(extractedData) {
        const featData = {
            name: extractedData.name,
            type: "feat",
            img: "icons/svg/book.svg",
            system: {
                description: {
                    value: extractedData.description || ""
                },
                source: extractedData.source || "",
                requirements: extractedData.prerequisites || "",
                recharge: {
                    value: null,
                    charged: false
                }
            }
        };
        
        return featData;
    }
    
    static _mapActivationType(castingTime) {
        if (!castingTime) return "action";
        
        const lowerCasting = castingTime.toLowerCase();
        if (lowerCasting.includes("bonus action")) return "bonus";
        if (lowerCasting.includes("reaction")) return "reaction";
        if (lowerCasting.includes("minute")) return "minute";
        if (lowerCasting.includes("hour")) return "hour";
        if (lowerCasting.includes("day")) return "day";
        if (lowerCasting.includes("special")) return "special";
        
        return "action";
    }

    static _extractActivationCost(castingTime) {
        if (!castingTime) return 1;
        
        const match = castingTime.match(/(\d+)\s*(?:bonus action|action|minute|hour|day)/i);
        if (match) {
            return parseInt(match[1]);
        }
        
        if (castingTime.toLowerCase().includes('reaction')) {
            return 1;
        }
        if (castingTime.toLowerCase().includes('bonus')) {
            return 1;
        }
        
        return 1;
    }

    static _extractDurationValue(duration) {
        if (!duration) return null;
        
        const concentrationMatch = duration.match(/concentration,\s*up\s*to\s*(\d+)\s*(?:minute|hour|day|round|turn)/i);
        if (concentrationMatch) {
            return parseInt(concentrationMatch[1]);
        }
        
        const match = duration.match(/(\d+)\s*(?:minute|hour|day|round|turn)/i);
        if (match) {
            return parseInt(match[1]);
        }
        
        if (duration.toLowerCase().includes('instantaneous')) {
            return null;
        }
        if (duration.toLowerCase().includes('permanent')) {
            return null;
        }
        if (duration.toLowerCase().includes('until dispelled')) {
            return null;
        }
        
        return null;
    }

    static _mapDurationUnits(duration) {
        if (!duration) return "inst";
        
        const lowerDuration = duration.toLowerCase();
        if (lowerDuration.includes("instantaneous")) return "inst";
        if (lowerDuration.includes("round")) return "round";
        if (lowerDuration.includes("minute")) return "minute";
        if (lowerDuration.includes("hour")) return "hour";
        if (lowerDuration.includes("day")) return "day";
        if (lowerDuration.includes("month")) return "month";
        if (lowerDuration.includes("year")) return "year";
        if (lowerDuration.includes("permanent")) return "perm";
        if (lowerDuration.includes("special")) return "spec";
        if (lowerDuration.includes("until dispelled")) return "disp";
        
        return "inst";
    }

    static _extractTargetValue(range) {
        if (!range) return null;
        
        const aoeMatch = range.match(/(\d+)[\s-]*(foot|feet|ft\.?)[\s-]*(radius|cube|cone|line|sphere)/i);
        if (aoeMatch) {
            return parseInt(aoeMatch[1]);
        }
        
        const areaMatch = range.match(/(\d+)[\s-]*(foot|feet|ft\.?)/i);
        if (areaMatch && (range.includes('cube') || range.includes('cone') || range.includes('sphere') || 
                          range.includes('cylinder') || range.includes('line') || range.includes('radius'))) {
            return parseInt(areaMatch[1]);
        }
        
        return null;
    }

    static _extractRangeValue(range) {
        if (!range) return null;
        
        const match = range.match(/(\d+)[\s-]*(foot|feet|ft\.?)/i);
        if (match) {
            return parseInt(match[1]);
        }
        
        if (range.toLowerCase().includes('touch')) {
            return 5;
        }
        if (range.toLowerCase().includes('self')) {
            return 0;
        }
        
        return null;
    }

    static _mapRangeUnits(range) {
        if (!range) return "self";
        
        const lowerRange = range.toLowerCase();
        if (lowerRange.includes("self")) return "self";
        if (lowerRange.includes("touch")) return "touch";
        if (lowerRange.includes("foot") || lowerRange.includes("feet") || lowerRange.includes("ft")) return "ft";
        if (lowerRange.includes("mile")) return "mi";
        if (lowerRange.includes("special")) return "spec";
        if (lowerRange.includes("sight")) return "spec";
        
        return "ft";
    }

    static _determineTargetType(range) {
        if (!range) return "";
        
        const lowerRange = range.toLowerCase();
        if (lowerRange.includes("cone")) return "cone";
        if (lowerRange.includes("cube")) return "cube";
        if (lowerRange.includes("cylinder")) return "cylinder";
        if (lowerRange.includes("line")) return "line";
        if (lowerRange.includes("sphere")) return "sphere";
        if (lowerRange.includes("radius")) return "radius";
        
        return "";
    }

    static _extractDamageParts(description) {
        if (!description) return [];
        
        const damageParts = [];
        
        const damagePattern = /(\d+d\d+(?:\s*\+\s*\d+)?)[\s]*(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)?[\s]*damage/gi;
        
        let match;
        while ((match = damagePattern.exec(description)) !== null) {
            const damageRoll = match[1];
            const damageType = match[2] ? match[2].toLowerCase() : "";
            damageParts.push([damageRoll, damageType]);
        }
        
        return damageParts;
    }

    static _extractSaveAbility(description) {
        if (!description) return "";
        
        const lowerDesc = description.toLowerCase();
        
        if (lowerDesc.includes("strength save")) return "str";
        if (lowerDesc.includes("dexterity save")) return "dex";
        if (lowerDesc.includes("constitution save")) return "con";
        if (lowerDesc.includes("intelligence save")) return "int";
        if (lowerDesc.includes("wisdom save")) return "wis";
        if (lowerDesc.includes("charisma save")) return "cha";
        
        return "";
    }

    static _determineSpellActionType(extractedData) {
        const description = extractedData.description?.toLowerCase() || "";
        
        if (description.includes("spell attack") || description.includes("attack roll")) {
            if (description.includes("melee spell attack")) return "msak";
            if (description.includes("ranged spell attack")) return "rsak";
            if (description.includes("melee")) return "mwak";
            if (description.includes("ranged")) return "rwak";
            return "other";
        }
        
        if (description.includes("saving throw") || 
            description.includes("must succeed on a") ||
            description.includes("must make a")) {
            return "save";
        }
        
        if (description.includes("ability check")) return "abil";
        
        if ((description.includes("regain") || description.includes("restore") || description.includes("heal")) && 
            description.includes("hit point")) {
            return "heal";
        }
        
        if (this._extractDamageParts(description).length > 0) return "other";
        
        return "util";
    }

    static _determineScalingMode(extractedData) {
        const description = extractedData.description?.toLowerCase() || "";
        
        if (description.includes("at higher levels") || 
            description.includes("for each slot level above") ||
            description.includes("higher level slot")) {
            return "level";
        }
        
        return "none";
    }

    static _extractScalingFormula(description) {
        if (!description) return "";
        
        const scalingPattern = /(?:at higher levels|when you cast this spell using a spell slot of|when cast at higher levels)[^.]*?(?:increases|add|deals|gain)[^.]*?(\d+d\d+|\d+)\s*(?:damage)?/i;
        
        const match = description.match(scalingPattern);
        if (match) {
            return match[1].replace(/\s+/g, '');
        }
        
        return "";
    }
}