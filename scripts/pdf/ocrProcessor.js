/**
 * OCR Processor module for 5e-content-importer
 * Handles OCR processing of image-based PDFs using Tesseract.js
 */

import { spbiUtils } from "../spbiUtils.js";

export class ocrProcessor {
    /**
     * Process a PDF with OCR
     * @param {ArrayBuffer} arrayBuffer - The PDF file as ArrayBuffer
     * @param {Object} options - OCR options
     * @param {string} options.language - OCR language (default: 'eng')
     * @param {number} options.quality - Image quality for OCR (1-3, default: 2)
     * @param {boolean} options.preprocess - Whether to preprocess images (default: true)
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<string>} - The extracted text content
     */
    static async processWithOcr(arrayBuffer, options = {}, progressCallback = null) {
        try {
            const defaultOptions = {
                language: 'eng',
                quality: 2,
                preprocess: true
            };
            
            const ocrOptions = { ...defaultOptions, ...options };
            
            // Load the PDF document using pdf.js
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'modules/5e-content-importer/dist/pdf.worker.bundle.js';
            
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            
            spbiUtils.log(`PDF loaded for OCR. Number of pages: ${pdf.numPages}`);
            
            // Initialize Tesseract.js
            const { createWorker } = await import('tesseract.js');
            const worker = await createWorker({
                logger: m => {
                    if (progressCallback && m.status === 'recognizing text') {
                        progressCallback({
                            type: 'ocr-recognition',
                            progress: m.progress,
                            message: `OCR progress: ${Math.round(m.progress * 100)}%`
                        });
                    }
                },
                workerPath: 'modules/5e-content-importer/dist/tesseract-worker.js',
                corePath: 'modules/5e-content-importer/dist/tesseract-core.js',
                langPath: 'modules/5e-content-importer/dist/lang'
            });
            
            await worker.loadLanguage(ocrOptions.language);
            await worker.initialize(ocrOptions.language);
            
            // Set OCR parameters based on quality option
            let ocrParameters = {};
            switch (ocrOptions.quality) {
                case 1: // Fast but less accurate
                    ocrParameters = { tessjs_create_hocr: '0', tessjs_create_tsv: '0', tessjs_create_box: '0' };
                    break;
                case 3: // Slow but more accurate
                    ocrParameters = { tessjs_create_hocr: '1', tessjs_create_tsv: '1', tessjs_create_box: '1' };
                    break;
                case 2: // Default - balanced
                default:
                    ocrParameters = {};
                    break;
            }
            
            await worker.setParameters(ocrParameters);
            
            // Process each page with OCR
            let allText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                if (progressCallback) {
                    progressCallback({
                        type: 'ocr-page',
                        current: i,
                        total: pdf.numPages,
                        message: `Processing page ${i} of ${pdf.numPages} with OCR`
                    });
                }
                
                const page = await pdf.getPage(i);
                const pageText = await this._processPageWithOcr(page, worker, ocrOptions, progressCallback);
                allText += pageText + "\n\n";
            }
            
            // Terminate the worker
            await worker.terminate();
            
            // Clean up the extracted text
            const cleanedText = this._cleanOcrText(allText);
            
            return cleanedText;
        } catch (error) {
            console.error("Error processing PDF with OCR:", error);
            throw new Error(`Failed to process PDF with OCR: ${error.message}`);
        }
    }
    
    /**
     * Process a single PDF page with OCR
     * @param {PDFPageProxy} page - The PDF page
     * @param {Worker} worker - The Tesseract worker
     * @param {Object} options - OCR options
     * @param {Function} progressCallback - Callback for progress updates
     * @returns {Promise<string>} - The extracted text from the page
     * @private
     */
    static async _processPageWithOcr(page, worker, options, progressCallback) {
        // Render the page to a canvas
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR results
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;
        
        // Preprocess the image if enabled
        if (options.preprocess) {
            this._preprocessImage(canvas, context);
        }
        
        // Perform OCR on the canvas
        const { data } = await worker.recognize(canvas);
        return data.text;
    }
    
    /**
     * Preprocess an image for better OCR results
     * @param {HTMLCanvasElement} canvas - The canvas with the image
     * @param {CanvasRenderingContext2D} context - The canvas context
     * @private
     */
    static _preprocessImage(canvas, context) {
        // Get image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Convert to grayscale and increase contrast
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to grayscale
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            // Apply contrast enhancement
            const contrast = 1.5; // Increase contrast
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            const enhancedGray = factor * (gray - 128) + 128;
            
            // Apply thresholding for better text recognition
            const threshold = 150;
            const value = enhancedGray > threshold ? 255 : 0;
            
            data[i] = data[i + 1] = data[i + 2] = value;
        }
        
        // Put the modified image data back on the canvas
        context.putImageData(imageData, 0, 0);
    }
    
    /**
     * Clean up OCR-extracted text
     * @param {string} text - The raw OCR text
     * @returns {string} - The cleaned text
     * @private
     */
    static _cleanOcrText(text) {
        // Remove excessive whitespace
        let cleaned = text.replace(/\s+/g, " ");
        
        // Fix common OCR errors
        cleaned = cleaned.replace(/[\|\[\]\{\}]/g, ""); // Remove common misrecognized characters
        cleaned = cleaned.replace(/\b(l)\b/g, "1"); // Replace standalone 'l' with '1'
        cleaned = cleaned.replace(/\b(O|o)\b/g, "0"); // Replace standalone 'O' or 'o' with '0'
        
        // Restore paragraph breaks
        cleaned = cleaned.replace(/\. /g, ".\n");
        cleaned = cleaned.replace(/\n\s+/g, "\n");
        
        // Fix spell/item formatting
        cleaned = cleaned.replace(/(\d+)(st|nd|rd|th)[-\s]level/gi, "$1$2-level"); // Fix level formatting
        cleaned = cleaned.replace(/([A-Za-z]+)\s+(spell|cantrip)/gi, "$1 $2"); // Fix spell type formatting
        
        // Final cleanup of excessive newlines
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
        
        return cleaned.trim();
    }
}