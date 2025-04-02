# 5e-items-importer Development TODO List

This document tracks the development tasks and priorities for the 5e-items-importer module.

## Current Issues

- [x] Fix incomplete validator.js code for consumable items
- [ ] Complete PDF processing integration
- [ ] Add comprehensive error handling throughout the codebase

## PDF Import Features

### PDF Processing

- [ ] Complete pdfTextExtractor.js implementation
  - [ ] Add support for multi-column layout detection
  - [ ] Improve text preprocessing for better parsing
- [ ] Enhance OCR processing with Tesseract.js
  - [ ] Add image preprocessing options for better OCR results
  - [ ] Implement language detection/selection for non-English content
- [ ] Add progress indicators for long-running PDF operations

### Content Detection & Parsing

- [ ] Improve content block detection algorithms
  - [ ] Add support for detecting content across page boundaries
  - [ ] Enhance pattern matching for different sourcebook formats
- [ ] Extend parsers for additional content types
  - [ ] Complete monster/NPC parser
  - [ ] Implement class/subclass feature parser
  - [ ] Add background parser
  - [ ] Add magic item parser with variant detection

### Data Mapping & Validation

- [ ] Enhance schema mapping for all content types
  - [ ] Add support for complex spell effects
  - [ ] Improve weapon property detection and mapping
  - [ ] Add support for creature special abilities and actions
- [ ] Extend validation for all content types
  - [ ] Add validation for monster abilities and actions
  - [ ] Improve validation for class features

### User Interface

- [ ] Create PDF import dialog
  - [ ] Add file upload and processing options
  - [ ] Implement progress indicators
- [ ] Develop results viewer for extracted content
  - [ ] Add preview of detected content blocks
  - [ ] Allow manual corrections before import
- [ ] Add batch processing capabilities
  - [ ] Support importing multiple content blocks at once
  - [ ] Add option to create compendiums from imported content

## Testing & Quality Assurance

- [ ] Create test suite for PDF processing
  - [ ] Test with various PDF formats and layouts
  - [ ] Test OCR with different image qualities
- [ ] Test content detection with various sourcebooks
  - [ ] Official WotC content format tests
  - [ ] Third-party publisher format tests
- [ ] Validate imported content in Foundry VTT
  - [ ] Test functionality of imported spells
  - [ ] Test functionality of imported items
  - [ ] Test functionality of imported monsters

## Documentation

- [ ] Update user documentation
  - [ ] Add PDF import instructions
  - [ ] Document supported content types and formats
- [ ] Create developer documentation
  - [ ] Document architecture and component interactions
  - [ ] Add code documentation for new components

## Future Enhancements

- [ ] Add support for importing from images (jpg, png)
- [ ] Implement AI-assisted content correction
- [ ] Add support for importing from websites
- [ ] Create content editor for manual creation/editing