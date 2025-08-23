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

// Function to process a single element and its children
function processElement($element, $dom, $inheritedStyles = []) {
    if (!$element->hasChildNodes()) {
        return $inheritedStyles;
    }

    $children = [];
    // First, collect all child nodes
    while ($element->firstChild) {
        $children[] = $element->firstChild;
        $element->removeChild($element->firstChild);
    }

    // Get current element's styles
    $style = $element->getAttribute('style');
    $color = $element->getAttribute('color');
    $face = $element->getAttribute('face');
    $size = $element->getAttribute('size');
    
    // Create style string from attributes
    $currentStyles = $inheritedStyles;
    if ($style) $currentStyles[] = $style;
    if ($color) $currentStyles[] = "color: $color";
    if ($face) $currentStyles[] = "font-family: $face";
    if ($size) {
        $size = intval($size);
        if ($size > 0) {
            $pixelSize = $size * 4 / 3;
            $currentStyles[] = "font-size: {$pixelSize}px";
        }
    }

    foreach ($children as $child) {
        if ($child->nodeType === XML_TEXT_NODE) {
            if (!empty($currentStyles)) {
                $span = $dom->createElement('span');
                $span->setAttribute('style', implode('; ', $currentStyles));
                $element->appendChild($span);
                $span->appendChild($child);
            } else {
                $element->appendChild($child);
            }
        } else {
            $element->appendChild($child);
            if ($child->tagName === 'font' || $child->tagName === 'span') {
                // Process child elements with current styles
                processElement($child, $dom, $currentStyles);
            }
        }
    }

    // If this was a font/span, move its children up and remove it
    $tagName = strtolower($element->tagName);
    if (($tagName === 'font' || $tagName === 'span') && $element->parentNode) {
        while ($element->firstChild) {
            $child = $element->firstChild;
            $element->parentNode->insertBefore($child, $element);
        }
        $element->parentNode->removeChild($element);
    }
}

// Function to process HTML and add position: relative to parents of absolutely positioned elements
function processHtml($htmlFile) {
    // Load the HTML
    $dom = new DOMDocument();
    @$dom->loadHTMLFile($htmlFile, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

    $xpath = new DOMXPath($dom);

    // Find all elements with position: absolute
    $absoluteElements = $xpath->query("//*[contains(@style, 'position:absolute') or contains(@style, 'position: absolute') or contains(@style, 'position : absolute')]");

    // Process absolute positioned elements
    foreach ($absoluteElements as $element) {
        $style = $element->getAttribute('style');

        // Remove position:absolute and positioning properties with any spacing and optional semicolons
        $style = preg_replace('/position\s*:\s*absolute\s*;?/i', '', $style);
        $style = preg_replace('/[^-](top|left|right|bottom)\s*:[^;]*;?/i', '', $style);
        
        // Clean up any remaining double semicolons or trailing spaces
        $style = preg_replace('/;+/', ';', $style);
        $style = trim($style, ';\s');
        
        if (empty($style)) {
            $element->removeAttribute('style');
        } else {
            $element->setAttribute('style', $style);
        }
    }

    // Remove align attributes from all elements
    $allElements = $xpath->query('//*[@align]');
    foreach ($allElements as $element) {
        $element->removeAttribute('align');
    }

    // Remove all <br> elements
    $brElements = $xpath->query('//br');
    foreach ($brElements as $br) {
        $br->parentNode->removeChild($br);
    }

    // Process the body element to clean up nested elements
    $body = $xpath->query('//body')->item(0);
    if ($body) {
        // Process each top-level element in the body
        $children = [];
        while ($body->firstChild) {
            $children[] = $body->firstChild;
            $body->removeChild($body->firstChild);
        }

        foreach ($children as $child) {
            $body->appendChild($child);
            if ($child->nodeType === XML_ELEMENT_NODE) {
                processElement($child, $dom);
            }
        }

        // Function to check if a node contains only whitespace
        $containsOnlyWhitespace = function($node) use (&$containsOnlyWhitespace) {
            if ($node->nodeType === XML_TEXT_NODE) {
                return trim($node->nodeValue) === '';
            }
            if ($node->nodeType === XML_ELEMENT_NODE) {
                foreach ($node->childNodes as $child) {
                    if (!$containsOnlyWhitespace($child)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        };

        // Remove margin and padding from span/font elements
        $stylingElements = $xpath->query('//span | //font');
        foreach ($stylingElements as $el) {
            if ($el->hasAttribute('style')) {
                $style = $el->getAttribute('style');
                // Remove margin and padding properties
                $style = preg_replace('/\s*margin[^:;]*:[^;]+;?/i', '', $style);
                $style = preg_replace('/\s*padding[^:;]*:[^;]+;?/i', '', $style);
                // Clean up any remaining double semicolons or trailing spaces
                $style = preg_replace('/;+/', ';', $style);
                $style = trim($style, ';\s');
                
                if (empty($style)) {
                    $el->removeAttribute('style');
                } else {
                    $el->setAttribute('style', $style);
                }
            }
        }

        // Remove empty font/span elements
        do {
            $changed = false;
            $elements = $xpath->query('//font | //span');
            foreach ($elements as $element) {
                if ($containsOnlyWhitespace($element)) {
                    $parent = $element->parentNode;
                    if ($parent) {
                        while ($element->firstChild) {
                            $parent->insertBefore($element->firstChild, $element);
                        }
                        $parent->removeChild($element);
                        $changed = true;
                    }
                }
            }
        } while ($changed);

        // Merge sibling spans/fonts with same styles, even if separated by whitespace
        do {
            $changed = false;
            $elements = $xpath->query('//span | //font');
            foreach ($elements as $element) {
                $next = $element->nextSibling;
                
                // Skip whitespace text nodes
                while ($next && $next->nodeType === XML_TEXT_NODE && trim($next->nodeValue) === '') {
                    $next = $next->nextSibling;
                }
                
                if ($next && $next->nodeType === XML_ELEMENT_NODE && 
                    in_array(strtolower($next->tagName), ['span', 'font'])) {
                    
                    // Get styles for both elements
                    $style1 = $element->getAttribute('style');
                    $style2 = $next->getAttribute('style');
                    
                    // Check if styles match
                    if ($style1 === $style2) {
                        // Add a space between elements if there's text content
                        if ($element->lastChild && $element->lastChild->nodeType === XML_TEXT_NODE) {
                            $element->lastChild->nodeValue = rtrim($element->lastChild->nodeValue) . ' ';
                        } else if (trim($element->nodeValue) !== '') {
                            $element->appendChild(new DOMText(' '));
                        }
                        
                        // Move all children from next element to current element
                        while ($next->firstChild) {
                            $element->appendChild($next->firstChild);
                        }
                        
                        // Remove the now-empty next element
                        $next->parentNode->removeChild($next);
                        $changed = true;
                    }
                }
            }
        } while ($changed);
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
    $inputDocx = '/home/newgen/opt/htdocs/public/docx_parser/ai.docx';  // Change this to your input file
    $outputDir = '/home/newgen/opt/htdocs/public/docx_parser/output';      // Output directory

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
