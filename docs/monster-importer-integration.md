# Monster/NPC Importer Integration Plan

## Overview

This document outlines the strategy for integrating the monster/NPC importing functionality from the 5e-statblock-importer module into our 5e-spellblock-importer project. The goal is to maintain the existing spell and item importing functionality while adding support for monster/NPC statblocks.

## Current Architecture

### 5e-spellblock-importer (Our Project)
- **UI**: Tab-based interface with text input and PDF upload options
- **Content Detection**: Identifies spells and items in text
- **Parsing**: Extracts structured data from detected content
- **Import**: Creates Foundry VTT items from parsed data

### 5e-statblock-importer (To Integrate)
- **UI**: Simple text input with parsing preview
- **Parsing**: Sophisticated statblock parsing with block identification
- **Actor Creation**: Creates Foundry VTT actors with abilities, actions, etc.
- **Hint System**: Allows manual hints for ambiguous content

## Integration Strategy

### 1. Update Content Detection

Extend the `contentDetector.js` module to better identify monster/NPC statblocks using patterns from the 5e-statblock-importer's regex patterns.

### 2. Create Monster Parser

Implement a new parser based on the 5e-statblock-importer's `sbiParser.js` and `sbiActor.js` to handle monster statblocks.

### 3. Update UI

Modify the existing UI to support monster/NPC importing:
- Add "Monster/NPC" option to the import type dropdown
- Update the folder selection to include Actor folders when Monster/NPC type is selected
- Add support for previewing parsed monster data

### 4. Schema Mapping

Extend the `schemaMapper.js` to fully support mapping parsed monster data to Foundry VTT actor schema.

## Implementation Steps

### Phase 1: Core Parser Integration

1. Create a new `monsterParser.js` module based on 5e-statblock-importer's parsing logic
2. Implement the core statblock parsing functionality
3. Create an `actorBuilder.js` module based on the `sbiActor.js` functionality

### Phase 2: UI Updates

1. Update the import type dropdown to include Monster/NPC option
2. Modify folder selection to show Actor folders when Monster/NPC is selected
3. Add preview functionality for parsed monster data

### Phase 3: Integration with PDF Import

1. Ensure PDF-extracted content can be properly identified as monster statblocks
2. Update the item selection UI to properly display monster entries

## Key Components to Adapt

### From 5e-statblock-importer

1. **Block Identification System**: The approach to identifying different parts of a statblock
2. **Actor Creation Logic**: The process of building a complete actor from parsed data
3. **Action Parsing**: The sophisticated parsing of monster actions and abilities

### From Our Project

1. **PDF Handling**: Maintain our PDF extraction and processing
2. **UI Framework**: Keep our tab-based, multi-item selection interface
3. **Content Detection**: Extend our detection system rather than replacing it

## Technical Considerations

1. **Namespace Conflicts**: Ensure no conflicts between the two modules' utility functions
2. **API Compatibility**: Maintain compatibility with Foundry VTT's actor creation API
3. **Performance**: Consider performance implications of parsing complex monster statblocks

## Testing Plan

1. Test with simple monster statblocks from the SRD
2. Test with complex monsters with multiple actions and special abilities
3. Test PDF import with pages containing multiple monsters
4. Test edge cases like legendary creatures and creatures with spellcasting

## Future Enhancements

1. Support for custom monster types and abilities
2. Batch import of multiple monsters from a single source
3. Enhanced preview with visual representation of the monster sheet
4. Integration with compendium lookup for standard monsters