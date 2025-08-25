<?php

// Function to convert DOCX to HTML using LibreOffice
function convertDocxToHtml($inputFile, $outputDir) {
    // Create output directory if it doesn't exist
    if (!file_exists($outputDir)) {
        mkdir($outputDir, 0777, true);
    }

    // Command to convert DOCX to HTML
    $command = "libreoffice --headless --convert-to 'html:HTML' --outdir \"$outputDir\" \"$inputFile\" 2>&1";
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

/**
 * Merge styles from two elements
 */
function mergeStyles($style1, $style2) {
    if (empty($style1)) return $style2;
    if (empty($style2)) return $style1;
    
    // Parse styles into associative array
    $styles1 = [];
    $styles2 = [];
    
    foreach (explode(';', $style1) as $style) {
        if (strpos($style, ':') !== false) {
            list($prop, $value) = explode(':', $style, 2);
            $styles1[trim($prop)] = trim($value);
        }
    }
    
    foreach (explode(';', $style2) as $style) {
        if (strpos($style, ':') !== false) {
            list($prop, $value) = explode(':', $style, 2);
            $styles2[trim($prop)] = trim($value);
        }
    }
    
    // Merge styles (styles2 will override styles1)
    $merged = array_merge($styles1, $styles2);
    
    // Convert back to string
    $result = [];
    foreach ($merged as $prop => $value) {
        $result[] = "$prop: $value";
    }
    
    return implode('; ', $result);
}

function mergeNestedFonts($dom) {
    $xpath = new DOMXPath($dom);
    
    // Find all font elements that have a non-font parent
    $fonts = $xpath->query('//font[not(ancestor::font)]/descendant-or-self::font');
    
    // Process fonts from deepest to shallowest
    $fontsToProcess = [];
    foreach ($fonts as $font) {
        $fontsToProcess[] = $font;
    }
    
    // Sort by depth (deepest first)
    usort($fontsToProcess, function($a, $b) {
        return getNodeDepth($b) - getNodeDepth($a);
    });
    
    foreach ($fontsToProcess as $font) {
        $parent = $font->parentNode;
        
        // Skip if parent is not an element node
        if ($parent->nodeType !== XML_ELEMENT_NODE) continue;
        
        // Get styles
        $parentStyle = $parent->hasAttribute('style') ? $parent->getAttribute('style') : '';

        if($font->hasAttribute('style')){
            $fontStyle = $font->getAttribute('style');
        } else if($font->hasAttribute('color')) {
            $fontStyle = 'color: ' . $font->getAttribute('color') . ';';
        } else if($font->hasAttribute('size')) {
            $fontStyle = 'font-size: ' . $font->getAttribute('size') . ';';
        } else if($font->hasAttribute('face')) {
            $fontStyle = 'font-family: ' . $font->getAttribute('face') . ';';
        } else {
            $fontStyle = '';
        }
        
        // Merge content
        $fragment = $dom->createDocumentFragment();
        while ($font->childNodes->length > 0) {
            $fragment->appendChild($font->firstChild);
        }
        
        // Replace font with its children
        $font->parentNode->replaceChild($fragment, $font);
        
        // Merge styles if needed
        if (!empty($fontStyle)) {
            $mergedStyle = mergeStyles($parentStyle, $fontStyle);
            $parent->setAttribute('style', $mergedStyle);
        }
    }
}

function mergeSpanIntoParent($dom) {
    $xpath = new DOMXPath($dom);
    
    // Find all span elements that have a non-span parent
    $spans = $xpath->query('//span[not(ancestor::span)]/descendant-or-self::span');
    
    // Process spans from deepest to shallowest
    $spansToProcess = [];
    foreach ($spans as $span) {
        $spansToProcess[] = $span;
    }
    
    // Sort by depth (deepest first)
    usort($spansToProcess, function($a, $b) {
        return getNodeDepth($b) - getNodeDepth($a);
    });
    
    foreach ($spansToProcess as $span) {
        $parent = $span->parentNode;
        
        // Skip if parent is not an element node
        if ($parent->nodeType !== XML_ELEMENT_NODE) continue;
        
        // Merge content
        $fragment = $dom->createDocumentFragment();
        while ($span->childNodes->length > 0) {
            $fragment->appendChild($span->firstChild);
        }
        
        // Replace span with its children
        $span->parentNode->replaceChild($fragment, $span);
    }
}

/**
 * Get node depth in the DOM tree
 */
function getNodeDepth($node) {
    $depth = 0;
    while ($node = $node->parentNode) {
        if ($node->nodeType === XML_ELEMENT_NODE) {
            $depth++;
        }
    }
    return $depth;
}

/**
 * Merge sibling b and i elements into p elements with appropriate styles
 */
function mergeFormattingElements($dom) {
    $xpath = new DOMXPath($dom);
    
    // Find all b and i elements
    $elements = $xpath->query('//b | //i | //strong');
    $processed = [];
    
    foreach ($elements as $element) {
        // Skip if already processed
        if (in_array($element, $processed, true)) {
            continue;
        }
        
        $siblings = [];
        $current = $element;
        
        // Collect all consecutive b or i siblings
        while ($current) {
            if($current->nodeType === XML_TEXT_NODE) {
                $current = $current->nextSibling;
                continue;
            }
            $tagName = strtolower($current->tagName);
            if (($tagName === 'b' || $tagName === 'i') && !in_array($current, $processed, true)) {
                $siblings[] = $current;
                $processed[] = $current;
            } else {
                break;
            }
            $current = $current->nextSibling;
            
            // Skip text nodes that are just whitespace
            while ($current && $current->nodeType === XML_TEXT_NODE && trim($current->nodeValue) === '') {
                $current = $current->nextSibling;
            }
        }
        
        // If we have siblings to merge
        if (count($siblings) > 1) {
            $parent = $siblings[0]->parentNode;
            $p = $dom->createElement('p');
            $styles = [];
            
            // Collect all text content and determine styles
            $content = '';
            foreach ($siblings as $sibling) {
                $tagName = strtolower($sibling->tagName);
                $styles[] = $tagName === 'b' ? 'font-weight: bold' : 'font-style: italic';
                $content .= $sibling->textContent . ' ';
                
                // Remove the original element
                $sibling->parentNode->removeChild($sibling);
            }
            
            // Remove trailing space
            $content = rtrim($content);
            
            // Set content and styles
            $p->nodeValue = $content;
            $p->setAttribute('style', implode('; ', array_unique($styles)));
            
            // Insert the new p element
            if ($parent) {
                $parent->insertBefore($p, $current);
            }
        }
    }
}

function processHtml($htmlFile) {
    // Load the HTML
    $dom = new DOMDocument();
    @$dom->loadHTMLFile($htmlFile, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);

    $xpath = new DOMXPath($dom);

    // Merge nested fonts
    mergeNestedFonts($dom);

    // Merge span into parent
    mergeSpanIntoParent($dom);
    
    // Merge sibling b and i elements into p elements
    mergeFormattingElements($dom);

    // Find all elements with position: absolute
    $absoluteElements = $xpath->query("//*[contains(@style, 'position:absolute') or contains(@style, 'position: absolute') or contains(@style, 'position : absolute')]");

    // Process absolute positioned elements
    foreach ($absoluteElements as $element) {
        $style = $element->getAttribute('style');

        // Remove position:absolute and positioning properties with any spacing and optional semicolons
        $style = preg_replace('/position\s*:\s*absolute\s*;?/i', '', $style);
        $style = preg_replace('/[^-](top|left|right|bottom)\s*:[^;]*;?/i', '', $style);
        $style = preg_replace('/[^-](width|height)\s*:[^;]*;?/i', '', $style);
        
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

    // Remove class attributes from all elements
    $allElements = $xpath->query('//*[@class]');
    foreach ($allElements as $element) {
        $element->removeAttribute('class');
    }

    // Remove all <br> elements
    $brElements = $xpath->query('//br');
    foreach ($brElements as $br) {
        $br->parentNode->removeChild($br);
    }

    
    // Remove truly empty elements (no content, no attributes, no children)
    $allElements = $xpath->query('//*[not(*) and not(normalize-space()) and not(@*)]');
    foreach ($allElements as $element) {
        // Skip elements that might have visual representation (like img, br, hr, etc.)
        if (!in_array(strtolower($element->tagName), ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'command', 'embed', 'keygen', 'param', 'source', 'track', 'wbr'])) {
            $element->parentNode->removeChild($element);
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
    $inputDocx = '/home/newgen/opt/htdocs/public/docx_parser/samples/Modern nursing resume.docx';  // Change this to your input file
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
