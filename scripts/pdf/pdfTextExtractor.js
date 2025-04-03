/**
 * PDF Text Extractor module for 5e-content-importer
 * Handles extraction of text from digitally native PDFs using pdf.js
 */

import { spbiUtils } from "../spbiUtils.js";

export class pdfTextExtractor {
    /**
     * Extract text from a PDF file
     * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
     * @param {Object} options - Extraction options
     * @param {boolean} options.preserveFormatting - Whether to preserve formatting (default: true)
     * @param {boolean} options.detectColumns - Whether to attempt to detect columns (default: true)
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<string>} - The extracted text content
     */
    static async extractText(arrayBuffer, options = {}, progressCallback = null) {
        try {
            const defaultOptions = {
                preserveFormatting: true,
                detectColumns: true
            };
            
            const extractionOptions = { ...defaultOptions, ...options };
            
            // Load the PDF document using pdf.js
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'modules/5e-items-importer/dist/pdf.worker.bundle.js';
            
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            
            spbiUtils.log(`PDF loaded. Number of pages: ${pdf.numPages}`);
            
            // Extract text from each page
            let allText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                if (progressCallback) {
                    progressCallback({
                        type: 'text-extraction',
                        current: i,
                        total: pdf.numPages,
                        message: `Extracting text from page ${i} of ${pdf.numPages}`
                    });
                }
                
                const page = await pdf.getPage(i);
                const pageText = await this._extractPageText(page, extractionOptions);
                allText += pageText + "\n\n";
            }
            
            // Clean up the extracted text
            const cleanedText = this._cleanText(allText, extractionOptions);
            
            return cleanedText;
        } catch (error) {
            console.error("Error extracting text from PDF:", error);
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }
    
    /**
     * Extract text from a single PDF page
     * @param {PDFPageProxy} page - The PDF page
     * @param {Object} options - Extraction options
     * @returns {Promise<string>} - The extracted text from the page
     * @private
     */
    static async _extractPageText(page, options) {
        const textContent = await page.getTextContent();
        
        if (options.detectColumns) {
            return this._processTextWithColumnDetection(textContent, page, options);
        } else {
            return this._processTextContent(textContent, options);
        }
    }
    
    /**
     * Process text content with column detection
     * @param {TextContent} textContent - The text content from pdf.js
     * @param {PDFPageProxy} page - The PDF page
     * @param {Object} options - Extraction options
     * @returns {string} - The processed text
     * @private
     */
    static _processTextWithColumnDetection(textContent, page, options) {
        // Get page viewport for coordinate calculations
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        
        // Group text items by their approximate y-position (lines)
        const lineThreshold = 5; // pixels
        const lines = {};
        
        for (const item of textContent.items) {
            const y = Math.round(item.transform[5] / lineThreshold) * lineThreshold;
            if (!lines[y]) {
                lines[y] = [];
            }
            lines[y].push(item);
        }
        
        // Sort lines by y-position (top to bottom)
        const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
        
        // Detect if the page has columns
        const hasColumns = this._detectColumns(textContent.items, pageWidth);
        
        let text = "";
        let lastY = null;
        
        for (const y of sortedYs) {
            // Sort items within a line by x-position (left to right)
            const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
            
            // If we detect columns and there's a significant x-position gap, add extra newlines
            if (hasColumns && lastY !== null && Math.abs(y - lastY) > lineThreshold * 3) {
                text += "\n";
            }
            
            // Add each text item in the line
            const lineText = lineItems.map(item => item.str).join(" ");
            text += lineText + "\n";
            
            lastY = y;
        }
        
        return text;
    }
    
    /**
     * Detect if a page has multiple columns
     * @param {Array} textItems - The text items from pdf.js
     * @param {number} pageWidth - The width of the page
     * @returns {boolean} - Whether the page appears to have columns
     * @private
     */
    static _detectColumns(textItems, pageWidth) {
        // Create a histogram of x-positions
        const xPositions = textItems.map(item => item.transform[4]);
        const xHistogram = {};
        
        for (const x of xPositions) {
            const bucket = Math.floor(x / 10) * 10; // Group by 10px buckets
            xHistogram[bucket] = (xHistogram[bucket] || 0) + 1;
        }
        
        // Look for gaps in the histogram that might indicate columns
        const buckets = Object.keys(xHistogram).map(Number).sort((a, b) => a - b);
        let gapCount = 0;
        
        for (let i = 1; i < buckets.length; i++) {
            if (buckets[i] - buckets[i-1] > 30) { // Gap of more than 30px
                gapCount++;
            }
        }
        
        // If we have at least one significant gap and the page is wide enough,
        // it probably has columns
        return gapCount >= 1 && pageWidth > 400;
    }
    
    /**
     * Process text content without column detection
     * @param {TextContent} textContent - The text content from pdf.js
     * @param {Object} options - Extraction options
     * @returns {string} - The processed text
     * @private
     */
    static _processTextContent(textContent, options) {
        let text = "";
        let lastY;
        
        for (const item of textContent.items) {
            if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
                text += "\n";
            }
            text += item.str + " ";
            lastY = item.transform[5];
        }
        
        return text;
    }
    
    /**
     * Clean up extracted text
     * @param {string} text - The raw extracted text
     * @param {Object} options - Cleaning options
     * @returns {string} - The cleaned text
     * @private
     */
    static _cleanText(text, options) {
        // Remove excessive whitespace
        let cleaned = text.replace(/\s+/g, " ");
        
        // Restore paragraph breaks
        cleaned = cleaned.replace(/\. /g, ".\n");
        cleaned = cleaned.replace(/\n\s+/g, "\n");
        
        // Remove header/footer text that might appear on every page
        // This is a simplistic approach and might need refinement
        const lines = cleaned.split("\n");
        const lineFrequency = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length > 5) { // Ignore very short lines
                lineFrequency[trimmed] = (lineFrequency[trimmed] || 0) + 1;
            }
        }
        
        // If a line appears multiple times and looks like a header/footer, remove it
        for (const [line, frequency] of Object.entries(lineFrequency)) {
            if (frequency > 2 && (line.includes("Page") || /^\d+$/.test(line))) {
                const regex = new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
                cleaned = cleaned.replace(regex, "");
            }
        }
        
        // Final cleanup of excessive newlines
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
        
        return cleaned.trim();
    }
}