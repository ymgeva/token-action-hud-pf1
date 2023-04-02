import { ActionBuilderActorData } from '../models/actor-data.js';
import { CATEGORY_MAP } from './categories.js';
import { CoreActionHandler } from './config.js';
import { ROLL_TYPE } from './constants.js';
import { Settings } from './settings.js';
import { Utils } from "./utils";

export class HudBuilder extends CoreActionHandler {
    actorData = new ActionBuilderActorData();

    /**
     * Build System Actions
     * @override
     * @param {object} character
     * @param {array} subcategoryIds
     */
    async buildSystemActions(character, _subcategoryIds) {
        this.actorData = new ActionBuilderActorData(character);

        if (!this.actorData.isValid) {
            return;
        }

        this.#_buildSkills();
        this.#_buildSaves();
        this.#_buildChecks();
        this.#_buildConditions();

        this.#_buildCombat();
        this.#_buildBuffs();
        this.#_buildInventory();
        this.#_buildSpells();
        this.#_buildFeatures();
        this.#_buildOtherItems();
        this.#_buildUtils();
    }

    #_handledItemTypes = [
        'attack',
        'buff',
        'consumable',
        'container',
        'equipment',
        'feat',
        'loot',
        'spell',
        'weapon',
    ];

    #_buildChecks() {
        const saves = Object.keys(pf1.config.abilities);

        const actions = saves.map((key) => ({
            id: key,
            name: pf1.config.abilities[key],
            encodedValue: this.#_encodeData(ROLL_TYPE.abilityCheck, key),
        }));
        this.addActionsToActionList(actions, { id: CATEGORY_MAP.checks.subcategories.checks.id, type: 'system' });
    }

    #_buildSaves() {
        const saves = Object.keys(pf1.config.savingThrows);

        const actions = saves.map((key) => ({
            id: key,
            name: pf1.config.savingThrows[key],
            encodedValue: this.#_encodeData(ROLL_TYPE.save, key),
        }));
        this.addActionsToActionList(actions, { id: CATEGORY_MAP.saves.subcategories.saves.id, type: 'system' });
    }

    #_buildUtils() {
        const { subcategories } = CATEGORY_MAP.utility;

        const rest = {
            id: 'rest',
            name: Utils.localize('PF1.Rest'),
            encodedValue: this.#_encodeData(ROLL_TYPE.rest),
        }
        this.addActionsToActionList([rest], { id: subcategories.rest.id, type: 'system' });

        const tokenActions = [];
        if (game.user.isGM) {
            const isHidden = this.actorData.tokens
                .every((token) => token.document.hidden);
            tokenActions.push(isHidden ? {
                id: 'makeVisible',
                name: Utils.localize('categories.makeVisible'),
                encodedValue: this.#_encodeData(ROLL_TYPE.makeVisible),
            } : {
                id: 'makeInvisible',
                name: Utils.localize('categories.makeInvisible'),
                encodedValue: this.#_encodeData(ROLL_TYPE.makeInvisible),
            });
        }

        if (game.user.can('TOKEN_CONFIGURE')
            && this.actorData.tokens.every((token) => token.isOwner)
        ) {
            tokenActions.push({
                id: 'openTokenConfig',
                name: Utils.localize('actions.openTokenConfig'),
                encodedValue: this.#_encodeData(ROLL_TYPE.openTokenConfig),
            });
        };
        this.addActionsToActionList(tokenActions, { id: subcategories.token.id, type: 'system' });

        const utilActions = [{
            id: 'toggleTahGrid',
            name: Utils.localize('actions.toggleTahGrid'),
            encodedValue: this.#_encodeData(ROLL_TYPE.toggleTahGrid),
            cssClass: Settings.tahGrid ? ' active' : '',
        }, {
            id: 'toggleSkip',
            name: Utils.localize(Settings.pf1SkipActionDialogs ? 'actions.toggleSkipEnabled' : 'actions.toggleSkipDisabled'),
            encodedValue: this.#_encodeData(ROLL_TYPE.toggleSkip),
            cssClass: Settings.pf1SkipActionDialogs ? ' active' : '',
        }, {
            id: 'openSettings',
            name: Utils.localize('actions.openSettings'),
            encodedValue: this.#_encodeData(ROLL_TYPE.openSettings),
        }];
        this.addActionsToActionList(utilActions, { id: subcategories.utility.id, type: 'system' });
    }

    #_buildCombat() {
        const { subcategories } = CATEGORY_MAP.combat;

        const needsInitiative = !this.actorData.isMulti && this.actorData.inCombat && this.actorData.combatant.initiative !== null;
        const currentInitiativeInfo = this.actorData.isMulti || !this.actorData.inCombat || !needsInitiative
            ? {}
            : { text: this.actorData.combatant.initiative };
        const basicActions = [{
            id: 'showDefenses',
            name: Utils.localize('actions.displayDefenses'),
            encodedValue: this.#_encodeData(ROLL_TYPE.defenses),
        }, {
            id: 'bab',
            name: Utils.localize('PF1.BABAbbr'),
            encodedValue: this.#_encodeData(ROLL_TYPE.bab),
        }, {
            id: 'cmb',
            name: Utils.localize('PF1.CMBAbbr'),
            encodedValue: this.#_encodeData(ROLL_TYPE.cmb),
        }, {
            id: 'melee',
            name: Utils.localize('PF1.Melee'),
            encodedValue: this.#_encodeData(ROLL_TYPE.melee),
        }, {
            id: 'ranged',
            name: Utils.localize('PF1.Ranged'),
            encodedValue: this.#_encodeData(ROLL_TYPE.ranged),
        }, {
            id: 'initiative',
            name: Utils.localize('PF1.Initiative'),
            encodedValue: this.#_encodeData(ROLL_TYPE.initiative),
            cssClass: needsInitiative ? ' active' : '',
            info1: currentInitiativeInfo,
        }];

        if (game.user.isGM) {
            const action = this.actorData.inCombat ? {
                id: 'removeFromCombat',
                name: Utils.localize('COMBAT.CombatantRemove'),
                encodedValue: this.#_encodeData(ROLL_TYPE.removeFromCombat),
            } : {
                id: 'addToCombat',
                name: Utils.localize('COMBAT.CombatantCreate'),
                encodedValue: this.#_encodeData(ROLL_TYPE.addToCombat),
            };
            basicActions.push(action);
        }

        if (!this.actorData.isMulti && this.actorData.inCombat) {
            const { actorId, tokenId } = this.actorData;
            const combatant = game.combat.combatants.find((combatant) => combatant.actorId === actorId && combatant.tokenId === tokenId);
            if (game.combat.current.combatantId === combatant.id) {
                basicActions.push({
                    id: 'endTurn',
                    name: game.i18n.translations.COMBAT.TurnEnd,
                    encodedValue: this.#_encodeData(ROLL_TYPE.endTurn),
                });
            }
        }

        this.addActionsToActionList(basicActions, { id: subcategories.base.id, type: 'system' });

        if (this.actorData.isMulti) {
            return;
        }

        const filter = (subType) => (item) => item.type === 'attack' && item.subType === subType;
        this.#_buildFilteredItemActions(filter('weapon'), subcategories.weaponAttaack.id);
        this.#_buildFilteredItemActions(filter('natural'), subcategories.naturalAttack.id);
        this.#_buildFilteredItemActions(filter('ability'), subcategories.classAbilities.id);
        this.#_buildFilteredItemActions(filter('racialAbility'), subcategories.racialAbilities.id);
        this.#_buildFilteredItemActions(filter('item'), subcategories.items.id);
        this.#_buildFilteredItemActions(filter('misc'), subcategories.miscellaneous.id);

        // leftovers that could be from other mods or from a change in pf1
        const otherFilter = (item) => item.type === 'attack'
            && !['weapon', 'natural', 'ability', 'racialAbility', 'item', 'misc',].includes(item.subType);
        this.#_buildFilteredItemActions(otherFilter, subcategories.other.id, Settings.showPassiveFeatures);
    }

    #_buildBuffs() {
        if (this.actorData.isMulti) {
            return;
        }

        const mapBuffs = ([id, item]) => ({
            cssClass: 'toggle' + (item.isActive ? ' active' : ''),
            encodedValue: this.#_encodeData(ROLL_TYPE.buff, id, { enable: !item.isActive }),
            id,
            img: item.img,
            name: item.name,
        });

        const addBuffs = (subType, subcategoryId) => {
            const buffs = this.actorData.items
                .filter(([_id, item]) => item.type === 'buff' && item.subType === subType)
                .map(mapBuffs);
            this.addActionsToActionList(buffs, { id: subcategoryId, type: 'system' });
        }

        const { subcategories } = CATEGORY_MAP.buffs;

        addBuffs('item', subcategories.item.id);
        addBuffs('temp', subcategories.temporary.id);
        addBuffs('perm', subcategories.permanent.id);
        addBuffs('misc', subcategories.miscellaneous.id);

        // leftovers that could be from other mods or from a change in pf1
        const otherBuffs = this.actorData.items
            .filter(([_id, item]) => item.type === 'buff' && !['item', 'temp', 'perm', 'misc'].includes(item.subType))
            .map(mapBuffs);
        this.addActionsToActionList(otherBuffs, { id: subcategories.other.id, type: 'system' });
    }

    #_buildFeatures() {
        if (this.actorData.isMulti) {
            return;
        }

        const { subcategories } = CATEGORY_MAP.features;

        const filter = (subType) => (item) => item.type === 'feat' && item.subType === subType;
        this.#_buildFilteredItemActions(filter('classFeat'), subcategories.classFeat.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('feat'), subcategories.feat.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('racial'), subcategories.racial.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('template'), subcategories.template.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('trait'), subcategories.trait.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('misc'), subcategories.misc.id, Settings.showPassiveFeatures);

        // features added by spheres of power mod
        this.#_buildFilteredItemActions(filter('combatTalent'), subcategories.combatTalents.id, Settings.showPassiveFeatures);
        this.#_buildFilteredItemActions(filter('magicTalent'), subcategories.magicTalents.id, Settings.showPassiveFeatures);

        // leftovers that could be from other mods or from a change in pf1
        const otherFilter = (item) => item.type === 'feat'
            && !['classFeat', 'feat', 'racial', 'template', 'trait', 'misc', 'combatTalent', 'magicTalent'].includes(item.subType);
        this.#_buildFilteredItemActions(otherFilter, subcategories.other.id, Settings.showPassiveFeatures);
    }

    #_buildOtherItems() {
        if (this.actorData.isMulti) {
            return;
        }

        const { subcategories } = CATEGORY_MAP.other;

        const filter = (item) => !this.#_handledItemTypes.includes(item.type);
        this.#_buildFilteredItemActions(filter, subcategories.other.id, Settings.showPassiveFeatures);
    }

    #_buildInventory() {
        if (this.actorData.isMulti) {
            return;
        }

        const { subcategories } = CATEGORY_MAP.inventory;

        this.#_buildFilteredItemActions((item) => item.type === 'weapon', subcategories.weapons.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'equipment', subcategories.equipment.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'consumable', subcategories.consumables.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'container', subcategories.containers.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'loot' && item.subType === 'tradeGoods', subcategories.tradeGoods.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'loot' && item.subType === 'misc', subcategories.miscellaneous.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'loot' && item.subType === 'ammo', subcategories.ammunition.id, Settings.showPassiveInventory);
        this.#_buildFilteredItemActions((item) => item.type === 'loot' && item.subType === 'gear', subcategories.gear.id, Settings.showPassiveInventory);

        // leftovers that could be from other mods or from a change in pf1
        const otherFilter = (item) => (item.type === 'loot' && !['tradeGoods', 'misc', 'ammo', 'gear'].includes(item.subType));
        this.#_buildFilteredItemActions(otherFilter, subcategories.other.id, Settings.showPassiveFeatures);
    }

    #subSkillIds = ['art', 'crf', 'lor', 'prf', 'pro'];
    #knowledgeSkillIds = ['kar', 'kdu', 'ken', 'kge', 'khi', 'klo', 'kna', 'kno', 'kpl', 'kre'];
    #_buildSkills() {
        const skillCategory = { id: CATEGORY_MAP.skills.subcategories.skills.id, type: 'system' };

        const actorSkills = this.actorData.isMulti
            ? pf1.config.skills
            : this.actorData.actor.system.skills

        const excludedSkills = game.settings.get('pf1', 'allowBackgroundSkills')
            ? []
            : CONFIG.PF1.backgroundOnlySkills;

        const skillIds = Object.keys(actorSkills).filter((id) => !excludedSkills.includes(id));

        if (Settings.categorizeSkills) {
            const skills = skillIds
                .filter((id) => !this.#subSkillIds.includes(id))
                .filter((id) => !this.#knowledgeSkillIds.includes(id))
                .map((id) => ({ id, name: pf1.config.skills[id] || actorSkills[id].name }));
            const actions = skills.map(({ id, name }) => ({
                id,
                name: name,
                encodedValue: this.#_encodeData(ROLL_TYPE.skill, id),
            }));

            this.#subSkillIds.forEach((id) => {
                const subSkillIds = actorSkills[id].subSkills;
                const subskills = subSkillIds
                    ? Object.keys(subSkillIds).map((sid) => ({
                        id: `${id}.subSkills.${sid}`,
                        name: subSkillIds[sid].name,
                        encodedValue: this.#_encodeData(ROLL_TYPE.skill, `${id}.subSkills.${sid}`),
                    }))
                    : [];
                const groupedActions = [{
                    id,
                    name: pf1.config.skills[id] || actorSkills[id].name,
                    encodedValue: this.#_encodeData(ROLL_TYPE.skill, id),
                },
                ...subskills];

                if (groupedActions.length === 1) {
                    actions.push(groupedActions[0]);
                }
                else {
                    const subcategoryData = { id: `${skillCategory.id}_${id}`, type: 'system-derived', name: groupedActions[0].name };
                    this.addSubcategoryToActionList(skillCategory, subcategoryData);
                    this.addActionsToActionList(groupedActions, subcategoryData);
                }
            });

            const knowledgeName = (original) => /\(([^)]+)\)/g.exec(original)[1] || original;
            const knowledges = this.#knowledgeSkillIds.map((id) => ({
                id,
                name: knowledgeName(pf1.config.skills[id]),
                encodedValue: this.#_encodeData(ROLL_TYPE.skill, id),
            }));
            const knowledgeSubcategoryData = { id: `${skillCategory.id}_knowledge`, type: 'system-derived', name: Utils.localize('PF1.KnowledgeSkills') };
            this.addSubcategoryToActionList(skillCategory, knowledgeSubcategoryData);
            this.addActionsToActionList(knowledges, knowledgeSubcategoryData);

            const sorted = [...actions].sort((a, b) => a.name < b.name ? -1 : 1);

            this.addActionsToActionList(sorted, skillCategory);
        }
        else {
            const getSubskills = (key) => actorSkills[key].subSkills
                ? Object.keys(actorSkills[key].subSkills).map((s) => ({ id: `${key}.subSkills.${s}`, name: actorSkills[key].subSkills[s].name }))
                : [];
            const skills = [...skillIds.map((id) => ({ id, name: pf1.config.skills[id] || actorSkills[id].name })), ...skillIds.flatMap(getSubskills)];
            const actions = skills.map(({ id, name }) => ({
                id,
                name: name,
                encodedValue: this.#_encodeData(ROLL_TYPE.skill, id),
            }));
            const sorted = [...actions].sort((a, b) => a.name < b.name ? -1 : 1);

            this.addActionsToActionList(sorted, skillCategory);
        }
    }

    #_buildConditions() {
        const conditions = Object.keys(pf1.config.conditions);
        const actions = conditions.map((key) => {
            const isEnabled = this.actorData.actors.every((actor) => actor.hasCondition(key));
            return {
                cssClass: 'toggle' + (isEnabled ? ' active' : ''),
                encodedValue: this.#_encodeData(ROLL_TYPE.condition, key, { enable: !isEnabled }),
                id: key,
                img: pf1.config.conditionTextures[key],
                name: pf1.config.conditions[key],
            };
        });

        this.addActionsToActionList(actions, { id: CATEGORY_MAP.conditions.subcategories.conditions.id, type: 'system' });
    }

    #_buildSpells() {
        if (this.actorData.isMulti) {
            return;
        }

        const spellCategoryId = CATEGORY_MAP.spells.subcategories.spells.id;
        const allSpells = this.actorData.items
            .filter(([_id, item]) => item.type === 'spell' && Utils.canUseItem(item));

        const spellbookKeys = Object.keys(this.actorData.actor.system.attributes.spells.spellbooks)
            .map((key) => ({ key, spellbook: this.actorData.actor.system.attributes.spells.spellbooks[key] }))
            .filter(({ _key, spellbook }) => spellbook.inUse)
            .map(({ key, _spellbook }) => key);

        const { spellbooks } = this.actorData.actor.system.attributes.spells;
        const levels = Array.from(Array(10).keys());

        const parentSubcategoryData = { id: spellCategoryId, type: 'system' };
        spellbookKeys.forEach((key) => {
            const spellbook = spellbooks[key];
            const spellbookCategory = {
                hasDerivedSubcategories: true,
                id: `${spellCategoryId}_${key}.`,
                name: Utils.localize(spellbook.label) || spellbook.name,
                type: 'system-derived',
            };
            this.addSubcategoryToActionList(parentSubcategoryData, spellbookCategory);

            // todo add roll icons
            const basicActions = [
                {
                    id: 'casterLevel',
                    name: Utils.localize('PF1.CasterLevelCheck'),
                    encodedValue: this.#_encodeData(ROLL_TYPE.casterLevel, 'casterLevel', { book: key }),
                },
                {
                    id: 'concentration',
                    name: Utils.localize('PF1.ConcentrationCheck'),
                    encodedValue: this.#_encodeData(ROLL_TYPE.concentration, 'concentration', { book: key }),
                },
            ];
            this.addActionsToActionList(basicActions, spellbookCategory);

            let prepFilter;
            switch (Settings.spellPreparation) {
                case 'allSpells':
                    prepFilter = (_spell) => true;
                    break;
                case 'allPrepared':
                    prepFilter = (spell) => !!spell.maxCharges;
                    break;
                case 'onlyRemaining':
                default:
                    prepFilter = (spell) => !!spell.charges;
                    break;
            }

            const bookSpells = allSpells.filter(([_id, spell]) => spell.system.spellbook === key && prepFilter(spell));

            levels.forEach((level) => {
                const levelCategory = {
                    hasDerivedSubcategories: true,
                    id: `${spellbookCategory.id}_${level}.`,
                    name: Utils.localize(`PF1.SpellLevel${level}`),
                    type: 'system-derived',
                };

                const spellLevel = spellbook.spells[`spell${level}`];
                if (level && spellbook.spontaneous && spellLevel.max) {
                    levelCategory.info1 = { text: `${spellLevel.value || 0}/${spellLevel.max}` };
                }

                this.addSubcategoryToActionList(spellbookCategory, levelCategory);

                const itemChargeInfo = (spell) => spellbook.spontaneous
                    ? {}
                    : { text: spell.maxCharges === Number.POSITIVE_INFINITY ? '' : `${spell.charges}/${spell.maxCharges}` };

                const levelSpells = bookSpells.filter(([_id, item]) => item.spellLevel === level);
                this.#_addItemActionsToCategory(levelSpells, levelCategory, itemChargeInfo, () => ({}));
            });
        });
    }

    #_buildFilteredItemActions(filter, subcategoryId, includeUnusable = false) {
        if (this.actorData.isMulti) {
            return;
        }

        const filtered = this.actorData.items
            .filter(([_id, item]) => filter(item) && Utils.canUseItem(item));
        const parentSubcategoryData = { id: subcategoryId, type: 'system' };
        this.#_addItemActionsToCategory(filtered, parentSubcategoryData);

        if (includeUnusable) {
            const unusable = this.actorData.items
                .filter(([_id, item]) => filter(item) && !Utils.canUseItem(item));
            const subcategoryData = { id: `${parentSubcategoryData.id}_unusable`, type: 'system-derived', name: Utils.localize('PF1.ActivationTypePassive') };
            this.addSubcategoryToActionList(parentSubcategoryData, subcategoryData);
            this.#_addItemActionsToCategory(unusable, subcategoryData);
        }
    }

    #_encodeData = (
        rollType,
        actionId,
        extraData = {},
    ) => JSON.stringify({
        rollType,
        actionId,
        actorId: this.actorData.isMulti ? '' : this.actorData.actorId,
        tokenId: this.actorData.isMulti ? '' : this.actorData.tokenId,
        isMulti: this.actorData.isMulti,
        ...extraData,
    });

    #_addItemActionsToCategory(
        items,
        parentSubcategoryData,
        itemChargeInfo = null,
        actionChargeInfo = null,
    ) {
        if (this.actorData.isMulti) {
            return;
        }

        const info1 = (_item) => ({});
        const info2 = (_item) => ({});

        itemChargeInfo ??= (item) => item.maxCharges
            ? { text: `${item.charges}/${item.maxCharges}`, class: 'charged' }
            : {};
        actionChargeInfo ??= (action) => {
            const { self } = action.data.uses;
            const cost = action.getChargeCost();
            const values = [];
            if (cost) {
                values.push(cost);
            }
            if (action.isSelfCharged && self.max) {
                values.push(`${self.value}/${self.max}`)
            }
            return { text: values.join(', '), class: 'charged' };
        }

        const mapItemToAction = ([id, item]) => ({
            id,
            img: item.img,
            name: item.name,
            encodedValue: this.#_encodeData(ROLL_TYPE.item, id),
            info1: info1(item),
            info2: info2(item),
            info3: itemChargeInfo(item),
        });
        const mapSubActionToAction = (item, action, name = action.name) => ({
            id: action.id,
            img: item.img,
            name: name,
            encodedValue: this.#_encodeData(ROLL_TYPE.item, item.id, { subActionId: action.id }),
            info1: info1(item),
            info2: info2(item),
            info3: actionChargeInfo(action),
        });

        switch (Settings.actionLayout) {
            case 'onlyItems': {
                const actions = items.map(mapItemToAction);
                this.addActionsToActionList(actions, parentSubcategoryData);
            } break;
            case 'onlyActions': {
                const actions = (items.flatMap(([id, item]) => Utils.getItemActions(item).length > 1
                    ? Utils.getItemActions(item).map((action) => mapSubActionToAction(item, action, `${item.name} - ${action.name}`))
                    : mapItemToAction([id, item])));
                this.addActionsToActionList(actions, parentSubcategoryData);
            } break;
            case 'categorized':
            default: {
                items.forEach(([id, item]) => {
                    if (Utils.getItemActions(item).length > 1) {
                        const subActions = item.actions.map((action) => mapSubActionToAction(item, action));

                        const subcategoryData = { id: `${parentSubcategoryData.id}_${item.id}`, type: 'system-derived', name: item.name, info1: itemChargeInfo(item) };
                        this.addSubcategoryToActionList(parentSubcategoryData, subcategoryData);
                        this.addActionsToActionList(subActions, subcategoryData);
                    }
                    else {
                        // has a use script call or a single action
                        const action = mapItemToAction([id, item]);
                        this.addActionsToActionList([action], parentSubcategoryData);
                    }
                });
            } break;
        }
    }
}
