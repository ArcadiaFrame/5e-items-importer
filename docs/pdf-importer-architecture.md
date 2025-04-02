# 5e PDF Content Importer - Architecture Document

## Overview

This document outlines the architecture for extending the 5e-items-importer module to support importing content from PDF files. The enhanced module will be able to process both text-based PDFs and image-based PDFs (using OCR), extract structured data, and convert it into FoundryVTT compendium entries compatible with the dnd5e system.

## Core Components

### 1. PDF Processing Module

#### 1.1 PDF Text Extractor
- Uses pdf.js to extract text from digitally native PDFs
- Handles multi-column layouts and preserves reading order
- Provides text preprocessing to clean up formatting issues

#### 1.2 OCR Processor
- Uses Tesseract.js for OCR on image-based PDFs
- Includes image preprocessing for better OCR results
- Provides progress feedback during OCR processing

### 2. Content Parser Module

#### 2.1 Content Block Detector
- Identifies different types of content blocks (spells, items, monsters, etc.)
- Uses pattern matching and heuristics to detect block boundaries
- Handles variations in formatting across different sourcebooks

#### 2.2 Data Extractors
- Specialized parsers for different content types:
  - Spell Parser (extends existing functionality)
  - Item Parser (extends existing functionality)
  - Monster/NPC Parser (new)
  - Class/Subclass Parser (new)
  - Feat Parser (new)

### 3. Data Mapping Module

#### 3.1 Schema Mapper
- Maps extracted data to dnd5e system data structures
- References dnd5e system schema for accurate field mapping
- Handles data type conversions and validations

#### 3.2 Validation Engine
- Validates mapped data against dnd5e system requirements
- Provides error reporting for missing or invalid data
- Suggests default values for missing fields when appropriate

### 4. Compendium Generation Module

#### 4.1 Compendium Writer
- Creates or updates FoundryVTT compendium packs
- Organizes content into appropriate categories
- Handles duplicate detection and resolution

### 5. User Interface Module

#### 5.1 PDF Import Dialog
- Extends the existing import dialog to support PDF file uploads
- Provides options for processing settings (OCR quality, etc.)
- Displays progress indicators for long-running operations

#### 5.2 Results Viewer
- Shows preview of extracted content before import
- Allows manual corrections to extracted data
- Provides summary of import results

## Technical Architecture

### Dependencies

- **pdf.js**: Mozilla's PDF rendering library for text extraction
- **Tesseract.js**: OCR engine for image-based text extraction
- **FoundryVTT API**: For module integration and compendium manipulation
- **dnd5e System API**: For data structure compatibility

### Module Structure

```
5e-items-importer/
├── scripts/
│   ├── module.js                 # Main entry point
│   ├── pdf/
│   │   ├── pdfHandler.js         # PDF processing coordinator
│   │   ├── pdfTextExtractor.js    # Text extraction from PDFs
│   │   └── ocrProcessor.js        # OCR processing for images
│   ├── parser/
│   │   ├── contentDetector.js     # Content block detection
│   │   ├── spellParser.js         # Enhanced spell parser
│   │   ├── itemParser.js          # Enhanced item parser
│   │   ├── monsterParser.js       # Monster stat block parser
│   │   ├── classParser.js         # Class feature parser
│   │   └── featParser.js          # Feat parser
│   ├── data/
│   │   ├── schemaMapper.js        # Maps to dnd5e data structures
│   │   └── validator.js           # Validates data integrity
│   ├── compendium/
│   │   └── compendiumWriter.js    # Creates/updates compendiums
│   ├── ui/
│   │   ├── pdfImportDialog.js     # PDF import interface
│   │   └── resultsViewer.js       # Import results display
│   └── utils/
│       └── pdfUtils.js            # Utility functions for PDF processing
├── lib/                           # Third-party libraries
│   ├── pdf.js/                    # PDF.js library files
│   └── tesseract/                 # Tesseract.js files
└── templates/
    ├── pdfImportDialog.html       # PDF import dialog template
    └── resultsViewer.html         # Results viewer template
```

## Data Flow

1. **Input**: User uploads PDF file(s) through the import dialog
2. **Processing**:
   - PDF Handler determines if the PDF contains selectable text
   - If yes, uses PDF Text Extractor to extract text
   - If no, uses OCR Processor to perform OCR on the PDF pages
3. **Parsing**:
   - Content Detector identifies content blocks in the extracted text
   - Appropriate parser extracts structured data from each block
4. **Mapping**:
   - Schema Mapper converts extracted data to dnd5e system format
   - Validator checks data integrity and completeness
5. **Output**:
   - Results Viewer shows extracted content for review
   - User can make corrections if needed
   - Compendium Writer creates or updates compendium entries

## Implementation Strategy

### Phase 1: Foundation
- Set up project structure and dependencies
- Implement PDF text extraction with pdf.js
- Extend existing UI for PDF file uploads

### Phase 2: OCR Integration
- Implement OCR processing with Tesseract.js
- Add progress indicators for OCR operations
- Create image preprocessing utilities

### Phase 3: Enhanced Parsing
- Implement content block detection
- Enhance existing spell and item parsers
- Develop new parsers for monsters, classes, etc.

### Phase 4: Data Mapping & Validation
- Create schema mapping system for dnd5e compatibility
- Implement validation for data integrity
- Add error reporting and suggestions

### Phase 5: Compendium Integration
- Develop compendium creation/update functionality
- Implement organization and categorization features
- Add duplicate detection and resolution

### Phase 6: UI Refinement
- Enhance import dialog with additional options
- Create results viewer for preview and editing
- Add user feedback and help documentation

## Challenges and Considerations

### Performance
- OCR processing can be resource-intensive
- Consider implementing worker threads for background processing
- Provide options for batch processing of large documents

### Accuracy
- PDF formatting variations can affect parsing accuracy
- OCR quality depends on image quality
- Implement confidence scoring and manual correction options

### Compatibility
- Ensure compatibility with different versions of FoundryVTT
- Keep up with dnd5e system data structure changes
- Handle different PDF formats and layouts

### Dependencies
- Manage size of bundled dependencies (especially Tesseract language data)
- Consider options for on-demand downloading of language data
- Ensure proper bundling of web workers for pdf.js and Tesseract.js

## Conclusion

This architecture provides a comprehensive framework for implementing a PDF content importer for the dnd5e system in FoundryVTT. By leveraging existing code from the 5e-items-importer module and adding new components for PDF processing and OCR, we can create a powerful tool for automating the import of D&D 5e content from various sources.