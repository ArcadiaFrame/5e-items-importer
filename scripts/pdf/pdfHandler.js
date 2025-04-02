/**
 * PDF Handler module for 5e-content-importer
 * Coordinates PDF processing, determining whether to use text extraction or OCR
 */

import { pdfTextExtractor } from "./pdfTextExtractor.js";
import { ocrProcessor } from "./ocrProcessor.js";
import { spbiUtils } from "../spbiUtils.js";

export class pdfHandler {
    /**
     * Process a PDF file and extract its content
     * @param {File} file - The PDF file to process
     * @param {Object} options - Processing options
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<string>} - The extracted text content
     */
    static async processPdf(file, options = {}, progressCallback = null) {
        try {
            spbiUtils.log("Processing PDF file: " + file.name);
            
            // Read the file as ArrayBuffer
            const arrayBuffer = await this._readFileAsArrayBuffer(file);
            
            // First try to extract text directly
            const hasText = await this._checkForTextContent(arrayBuffer);
            
            if (hasText) {
                spbiUtils.log("PDF contains text content, using text extraction");
                return await pdfTextExtractor.extractText(arrayBuffer, options, progressCallback);
            } else {
                spbiUtils.log("PDF appears to be image-based, using OCR");
                return await ocrProcessor.processWithOcr(arrayBuffer, options, progressCallback);
            }
        } catch (error) {
            console.error("Error processing PDF:", error);
            throw new Error(`Failed to process PDF: ${error.message}`);
        }
    }
    
    /**
     * Read a file as ArrayBuffer
     * @param {File} file - The file to read
     * @returns {Promise<ArrayBuffer>} - The file contents as ArrayBuffer
     * @private
     */
    static async _readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Check if a PDF contains text content
     * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
     * @returns {Promise<boolean>} - Whether the PDF contains text content
     * @private
     */
    static async _checkForTextContent(arrayBuffer) {
        try {
            // Load the PDF document using pdf.js
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'modules/5e-content-importer/dist/pdf.worker.bundle.js';
            
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            
            // Check the first few pages for text content
            const pagesToCheck = Math.min(5, pdf.numPages);
            let textFound = false;
            
            for (let i = 1; i <= pagesToCheck; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                
                // If we find a reasonable amount of text, consider it a text-based PDF
                if (textContent.items.length > 10) {
                    textFound = true;
                    break;
                }
            }
            
            return textFound;
        } catch (error) {
            console.error("Error checking for text content:", error);
            // If we can't determine, default to assuming it has text
            return true;
        }
    }
}