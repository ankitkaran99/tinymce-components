<?php

// Function to convert DOCX to HTML using LibreOffice
function convertDocxToHtml($inputFile, $outputDir) {
    // Create output directory if it doesn't exist
    if (!file_exists($outputDir)) {
        mkdir($outputDir, 0777, true);
    }
    
    // Command to convert DOCX to HTML
    $command = "libreoffice --headless --convert-to html:HTML --outdir \"$outputDir\" \"$inputFile\" 2>&1";
    exec($command, $output, $returnVar);
    
    if ($returnVar !== 0) {
        throw new Exception("Error converting DOCX to HTML: " . implode("\n", $output));
    }
    
    // Find the generated HTML file
    $htmlFiles = glob($outputDir . '/*.html');
    if (empty($htmlFiles)) {
        throw new Exception("No HTML file was generated");
    }
    
    return $htmlFiles[0];
}

// Function to process HTML and add position: relative to parents of absolutely positioned elements
function processHtml($htmlFile) {
    // Load the HTML
    $dom = new DOMDocument();
    @$dom->loadHTMLFile($htmlFile, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    
    $xpath = new DOMXPath($dom);
    
    // Find all elements with position: absolute
    $absoluteElements = $xpath->query("//*[contains(@style, 'position:absolute') or contains(@style, 'position: absolute')]");
    
    foreach ($absoluteElements as $element) {
        $parent = $element->parentNode;
        if ($parent) {
            // Get current parent style
            $currentStyle = $parent->getAttribute('style') ?: '';
            
            // Add position: relative if not already set
            if (!preg_match('/position\s*:\s*[^;]/i', $currentStyle)) {
                $newStyle = $currentStyle . ($currentStyle ? '; ' : '') . 'position: relative;';
                $parent->setAttribute('style', $newStyle);
            }
        }
    }
    
    // Save the modified HTML
    $modifiedHtml = $dom->saveHTML();
    $outputFile = str_replace('.html', '_processed.html', $htmlFile);
    file_put_contents($outputFile, $modifiedHtml);
    
    return $outputFile;
}

// Main execution
try {
    // Check if LibreOffice is installed
    exec('which libreoffice', $output, $returnVar);
    if ($returnVar !== 0) {
        die("LibreOffice is not installed. Please install it first.\n");
    }
    
    // Example usage
    $inputDocx = 'ai.docx';  // Change this to your input file
    $outputDir = 'output';      // Output directory
    
    if (!file_exists($inputDocx)) {
        die("Input file not found: $inputDocx\n");
    }
    
    echo "Converting DOCX to HTML...\n";
    $htmlFile = convertDocxToHtml($inputDocx, $outputDir);
    
    echo "Processing HTML...\n";
    $processedFile = processHtml($htmlFile);
    
    echo "Conversion and processing complete!\n";
    echo "Processed file: $processedFile\n";
    
} catch (Exception $e) {
    die("Error: " . $e->getMessage() . "\n");
}