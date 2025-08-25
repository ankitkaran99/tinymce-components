/**
 * Components Manager for TinyMCE
 * Manages components and property panels in the editor
 */
class ComponentsManager {
  /**
   * Setup the Components Manager
   * @param {Object} editor - TinyMCE editor instance
   * @param {string} componentsPanelSelector - Selector for the components panel container
   * @param {string} propertiesPanelSelector - Selector for the properties panel container
   * @returns {ComponentsManager} The created instance
   */
  static setup(editor, componentsPanelSelector, propertiesPanelSelector) {
    return new ComponentsManager(
      editor,
      componentsPanelSelector,
      propertiesPanelSelector
    );
  }

  /**
   * Create a new Components Manager
   * @param {Object} editor - TinyMCE editor instance
   * @param {string} componentsPanelSelector - Selector for the components panel
   * @param {string} propertiesPanelSelector - Selector for the properties panel
   */
  constructor(editor, componentsPanelSelector, propertiesPanelSelector) {
    this.editor = editor;
    this.components = new Map();
    this.categories = new Set();
    this.activeComponent = null;
    this.selectedElement = null;
    this.editorStyles = new Set();
    this.styles = new Map(); // Store predefined styles

    // Get panel elements
    this.componentsPanel = document.querySelector(componentsPanelSelector);
    this.propertiesPanel = document.querySelector(propertiesPanelSelector);

    if (!this.componentsPanel || !this.propertiesPanel) {
      console.error("Could not find one or both panel containers");
      return;
    }

    this.initializeUI();
    this.bindEditorEvents();

    // Reinitialize any existing components in the editor
    this.reinitializeExistingComponents();
  }

  /**
   * Get properties from an element's data attributes
   * @param {HTMLElement} element - The element to get properties from
   * @param {Object} propertyDefs - The property definitions
   * @returns {Object} The properties object
   * @private
   */
  _getPropertiesFromElement(element, propertyDefs = {}) {
    const props = {};
    for (const [propName, propDef] of Object.entries(propertyDefs)) {
      const dataAttr = `data-prop-${propName}`;
      if (element.hasAttribute(dataAttr)) {
        const value = element.getAttribute(dataAttr);
        // Convert string values to appropriate types
        if (typeof propDef.default === "number") {
          props[propName] = parseFloat(value) || propDef.default;
        } else if (typeof propDef.default === "boolean") {
          props[propName] = value === "true";
        } else {
          props[propName] = value || propDef.default || "";
        }
      } else {
        // Use default value if not set
        props[propName] = propDef.default;
      }
    }
    return props;
  }

  /**
   * Save properties to an element's data attributes
   * @param {HTMLElement} element - The element to save properties to
   * @param {string} propName - The property name
   * @param {*} value - The property value
   * @private
   */
  _savePropertyToElement(element, propName, value) {
    const dataAttr = `data-prop-${propName}`;
    if (value === null || value === undefined) {
      element.removeAttribute(dataAttr);
    } else {
      element.setAttribute(dataAttr, String(value));
    }
  }

  /**
   * Register a component
   * @param {Component} component - The component to register
   */
  register(component) {
    if (!(component instanceof Component)) {
      console.error("Can only register instances of Component");
      return false;
    }

    if (this.components.has(component.id)) {
      console.warn(`Component with ID "${component.id}" is already registered`);
      return false;
    }

    this.components.set(component.id, component);
    this.categories.add(component.category || "General");

    // Add component's editor style if it exists
    if (component.editorStyle) {
      this.editorStyles.add(component.editorStyle);
      this.injectEditorStyles();
    }

    // Update the UI if already initialized
    if (this.initialized) {
      this.renderComponentsPanel();
    }

    return true;
  }

  /**
   * Add or update a predefined style
   * @param {string} name - Name of the style
   * @param {Object} style - Style properties (e.g., { color: 'red', 'font-weight': 'bold' })
   * @returns {ComponentsManager} The ComponentsManager instance for chaining
   */
  addStyle(name, style) {
    if (typeof name !== "string" || !style || typeof style !== "object") {
      console.error("Invalid style name or properties");
      return this;
    }
    this.styles.set(name, { ...style });
    return this;
  }

  /**
   * Get all predefined styles
   * @returns {Map} Map of style names to style objects
   */
  getStyles() {
    return new Map(this.styles);
  }

  /**
   * Apply a style to the selected element
   * @param {string} styleName - Name of the style to apply
   * @param {HTMLElement} [element] - Optional element to apply style to (defaults to selectedElement)
   * @returns {boolean} True if style was applied, false otherwise
   */
  applyStyle(styleName, element = this.selectedElement) {
    if (!element || !this.styles.has(styleName)) return false;

    const style = this.styles.get(styleName);
    let styleString = "";

    // Convert style object to CSS string
    for (const [prop, value] of Object.entries(style)) {
      styleString += `${prop}:${value};`;
    }

    // Apply the style
    element.style.cssText = styleString;

    // Dispatch style-updated event
    const event = new CustomEvent("style-updated", {
      detail: {
        styleName,
        element,
        style: styleString,
      },
    });
    document.dispatchEvent(event);

    // Update the properties panel
    this.updatePropertiesPanel();

    return true;
  }

  /**
   * Remove all inline styles from the selected element
   * @param {HTMLElement} [element] - Optional element to remove styles from (defaults to selectedElement)
   */
  removeStyles(element = this.selectedElement) {
    if (!element) return;

    // Remove all inline styles
    element.removeAttribute("style");

    // Dispatch style-updated event
    const event = new CustomEvent("style-updated", {
      detail: {
        styleName: null,
        element,
        style: "",
      },
    });
    document.dispatchEvent(event);

    // Update the properties panel
    this.updatePropertiesPanel();
  }

  /**
   * Get the currently applied style for an element
   * @param {HTMLElement} [element] - Optional element to check (defaults to selectedElement)
   * @returns {string|null} Name of the matching style or null if no match
   */
  getCurrentStyle(element = this.selectedElement) {
    if (!element) return null;

    // Get all inline styles
    const currentStyles = element.style;
    const inlineStyle = {};

    // Convert CSSStyleDeclaration to plain object
    for (let i = 0; i < currentStyles.length; i++) {
      const prop = currentStyles[i];
      inlineStyle[prop] = currentStyles[prop];
    }

    // Check each registered style for a match
    for (const [name, style] of this.styles.entries()) {
      if (this._stylesMatch(style, inlineStyle)) {
        return name;
      }
    }

    return null;
  }

  /**
   * Update the properties panel for the given element
   * @param {HTMLElement} element - The element to update the properties panel for
   * @private
   */
  updatePropertiesPanel(element) {
    if (!element || !this.propertiesPanel) return;

    // Store scroll position
    const scrollTop = this.propertiesPanel.scrollTop;

    // Re-render the properties panel
    this.renderElementProperties(element, this.propertiesPanel);

    // Restore scroll position
    this.propertiesPanel.scrollTop = scrollTop;
  }

  /**
   * Check if two style objects match
   * @private
   */
  _stylesMatch(style1, style2) {
    const keys1 = Object.keys(style1);
    const keys2 = Object.keys(style2);

    if (keys1.length !== keys2.length) return false;

    return keys1.every(
      (key) =>
        style1[key] === style2[key] ||
        (style1[key] &&
          style2[key] &&
          style1[key].toString() === style2[key].toString())
    );
  }

  /**
   * Get a component by ID
   * @param {string} id - Component ID
   * @returns {Component|null} The component or null if not found
   */
  getComponent(id) {
    return this.components.get(id) || null;
  }

  /**
   * Initialize the UI
   * @private
   */
  /**
   * Inject all collected editor styles into the TinyMCE iframe
   * @private
   */
  injectEditorStyles() {
    if (!this.editor) {
      return;
    }

    const inject = () => {
      try {
        const doc = this.editor.getDoc();
        if (!doc) {
          setTimeout(inject, 100);
          return;
        }

        const styleId = "components-editor-styles";
        let styleElement = doc.getElementById(styleId);

        if (!styleElement) {
          styleElement = doc.createElement("style");
          styleElement.id = styleId;
          doc.head.appendChild(styleElement);
        }

        // Combine all styles and update the style element
        const combinedStyles = Array.from(this.editorStyles).join("\n");
        styleElement.textContent = combinedStyles + `
          @keyframes blink {
            from, to { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          .drop-indicator {
            display: inline-block;
            width: 2px;
            height: 1.2em;
            background-color: #4a90e8;
            vertical-align: text-bottom;
            margin: 0 1px;
            position: relative;
            pointer-events: none;
            animation: blink 1s step-end infinite;
          }

          .dragging {
            display:none;
          }
        `;
      } catch (error) {
        // Retry after a short delay if there was an error
        setTimeout(inject, 100);
      }
    };

    // Start the injection process
    inject();
  }

  initializeUI() {
    // Initialize components panel
    this.componentsPanel.innerHTML = `
      <div class="components-scrollable">
        <div class="components-tabs"></div>
        <div class="components-list"></div>
      </div>
    `;

    // Initialize properties panel
    this.propertiesPanel.innerHTML = `
      <div class="properties-scrollable">
        <div class="properties-header">
          <h3>Properties</h3>
          <div class="element-info">Select an element to edit its properties</div>
        </div>
        <div class="properties-content"></div>
      </div>
    `;

    this.initialized = true;
    this.renderComponentsPanel();

    // Inject any existing styles
    if (this.editorStyles.size > 0) {
      this.injectEditorStyles();
    }
  }

  /**
   * Render the components panel with categories
   * @private
   */
  renderComponentsPanel() {
    if (!this.componentsPanel) return;

    // Get the scrollable container
    const scrollable = this.componentsPanel.querySelector(
      ".components-scrollable"
    );
    if (!scrollable) return;

    scrollable.innerHTML = "";

    // Create tabs container
    const tabs = document.createElement("div");
    tabs.className = "components-tabs";

    // Create content container
    const content = document.createElement("div");
    content.className = "components-content";

    // Add tabs and content to the scrollable container
    scrollable.appendChild(tabs);
    scrollable.appendChild(content);

    // Create category tabs
    let firstTab = true;
    this.categories.forEach((category) => {
      // Tab header
      const tab = document.createElement("div");
      tab.className = `tab ${firstTab ? "active" : ""}`;
      tab.textContent = category;
      tab.dataset.category = category;
      tab.addEventListener("click", () => this.switchCategory(category));
      tabs.appendChild(tab);

      // Tab content
      const tabContent = document.createElement("div");
      tabContent.className = `tab-content ${firstTab ? "active" : ""}`;
      tabContent.dataset.category = category;

      // Add components for this category
      const components = Array.from(this.components.values()).filter(
        (c) => (c.category || "General") === category
      );

      if (components.length === 0) {
        tabContent.innerHTML =
          '<div class="no-components">No components in this category</div>';
      } else {
        components.forEach((component) => {
          const item = this.createComponentItem(component);
          tabContent.appendChild(item);
        });
      }

      content.appendChild(tabContent);
      firstTab = false;
    });
  }

  /**
   * Create a draggable component item
   * @param {Component} component - The component to create an item for
   * @returns {HTMLElement} The created component item element
   * @private
   */
  createComponentItem(component) {
    const item = document.createElement("div");
    item.className = "component-item";
    item.draggable = true;
    item.dataset.componentId = component.id;

    item.innerHTML = `
      <div class="component-icon">${component.icon || "📦"}</div>
      <div class="component-name">${component.name}</div>
    `;

    // Set up drag and drop
    item.addEventListener("dragstart", (e) => {
      // Store the component ID in a custom format to prevent text insertion
      e.dataTransfer.setData("application/x-component-id", component.id);
      // Also set plain text to empty to prevent any text insertion
      e.dataTransfer.setData("text/plain", "");
      e.dataTransfer.effectAllowed = "copy";

      // Prevent default to avoid any browser-specific drag behaviors
      e.stopPropagation();
    });

    return item;
  }

  /**
   * Switch the active category tab
   * @param {string} category - The category to switch to
   * @private
   */
  switchCategory(category) {
    // Update active tab
    const tabs = this.componentsPanel.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      if (tab.dataset.category === category) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    // Update active content
    const contents = this.componentsPanel.querySelectorAll(".tab-content");
    contents.forEach((content) => {
      if (content.dataset.category === category) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
  }

  /**
   * Reinitialize any existing components in the editor
   * This is called after a page refresh to restore component functionality
   * @private
   */
  reinitializeExistingComponents() {
    // Check if editor and editor.dom are available
    if (!this.editor || !this.editor.dom) {
      console.warn(
        "Editor not fully initialized, skipping component reinitialization"
      );
      return;
    }

    try {
      const componentElements = this.editor.dom.select("[data-component]");
      componentElements.forEach((element) => {
        const componentId = element.getAttribute("data-component");
        const component = this.getComponent(componentId);

        if (component) {
          // Ensure instance ID exists
          if (!element.hasAttribute("data-instance-id")) {
            const instanceId = `comp-${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            element.setAttribute("data-instance-id", instanceId);
          }

          this.makeComponentDraggable(element);

          // Ensure default properties are set if they don't exist
          if (component.properties) {
            Object.entries(component.properties).forEach(
              ([propName, propDef]) => {
                const dataAttr = `data-prop-${propName}`;
                if (
                  !element.hasAttribute(dataAttr) &&
                  propDef.default !== undefined
                ) {
                  this._savePropertyToElement(
                    element,
                    propName,
                    propDef.default
                  );
                }
              }
            );
          }
        }
      });

      // non component elements
      const nonComponentElements = this.editor.dom.select("body :not([data-component])");
      nonComponentElements.forEach((el) => {
        el.setAttribute('draggable', 'true');

        el.addEventListener('dragstart', (ev) => {
          el.classList.add('dragging');
          ev.dropEffect = 'move';
          ev.stopPropagation();
        });
      });
    } catch (error) {
      console.error("Error reinitializing components:", error);
    }
  }

  placeholder = null;
  
  createPlaceholder(doc, range, position) {
    if (this.placeholder) {
      this.removePlaceholder();
    }
  
    const ph = doc.createElement("span");
    ph.className = "drop-indicator";
    ph.style.display = "inline-block";
    ph.style.width = "2px";
    ph.style.height = "1.2em";
    ph.style.backgroundColor = "#4a90e2";
    ph.style.verticalAlign = "text-bottom";
    ph.style.margin = "0 1px";
    ph.style.position = "relative";
    ph.style.pointerEvents = "none";
    ph.setAttribute("contenteditable", "false");
    ph.style.animation = "blink 1s step-end infinite";

    // Get the current selection and range
    let container = range.offsetNode;
    let offset = range.offset;

    if(position == 'before'){
      if(container.nodeType === Node.TEXT_NODE){
        container = container.parentNode;
        offset = offset - 1;
      }
      container.insertAdjacentElement('beforebegin', ph);
    } else {
      if (container.nodeType === Node.TEXT_NODE) {
        // For text nodes, insert the indicator at the cursor position
        if (offset < container.length) {
          // Split the text node at cursor position
          const remainingText = container.splitText(offset);
          container.parentNode.insertBefore(ph, remainingText);
        } else {
          // If at end of text node, insert after
          container.parentElement.insertAdjacentElement('afterend', ph);
        }
      } else if (container.hasChildNodes() && offset < container.childNodes.length) {
        // For element nodes, insert before the child at offset
        container.insertBefore(ph, container.childNodes[offset]);
      } else {
        // If no children or at end, append to container
        container.appendChild(ph);
      }
    }    
  
    // Store the reference
    this.placeholder = ph;
    return ph;
  }

  removePlaceholder() {
    if (this.placeholder) {
      this.placeholder.remove();
      this.placeholder = null;
    }
  }

  /**
   * Bind editor events
   * @private
   */
  bindEditorEvents() {
    const self = this;
    const doc = this.editor.getDoc();

    this.editor.on("NodeChange", (e) => {
      if(e.type == 'nodechange'){
        e.element.querySelectorAll(':not([draggable])').forEach((el) => {
          el.setAttribute('draggable', 'true');

          el.addEventListener('dragstart', (ev) => {
            el.classList.add('dragging');
            ev.dropEffect = 'move';
            ev.stopPropagation();
          });
        });
      }
    });

    // Handle click events directly on elements
    this.editor.on("click", (e) => {
      if (e.target && doc.contains(e.target)) {
        self.selectElement(e.target);
      }
    });

    // Update the dragover handler
    this.editor.on("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Get the element under the cursor
      const element = doc.elementFromPoint(e.clientX, e.clientY);
      if (!element) return;

      const componentId = e.dataTransfer.getData("application/x-component-id");

      if(componentId){
        const component = this.getComponent(componentId);

        // Check if we can drop here
        if (!component || !this.isValidDropTarget(element, component)) {
          return;
        }
      }

      // Get the character position under the cursor
      let range;
      if (doc.caretPositionFromPoint) {
        range = doc.caretPositionFromPoint(e.clientX, e.clientY);
      } else if (doc.caretRangeFromPoint) {
        // Use WebKit-proprietary fallback method
        range = doc.caretRangeFromPoint(e.clientX, e.clientY);
      } else {
        // Neither method is supported, do nothing
        return;
      }

      if (!range) return;

      const rect = element.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const relativeX = e.clientX - rect.left;

      let position = 'center';

      if(relativeX <= 5){
        position = 'before';
      }

      // Create or update the placeholder
      if (!this.placeholder) {
        this.placeholder = this.createPlaceholder(doc, range, position);
      } else {
        // Remove and reinsert at new position
        this.removePlaceholder();
        this.placeholder = this.createPlaceholder(doc, range, position);
      }

      return false;
    });

    // Handle drag leave
    this.editor.on("dragend", (e) => {
      e.preventDefault();
      e.stopPropagation();

      setTimeout(() => {
        this.selectedElement ? this.selectedElement.classList.remove('dragging') : null;
        this.removePlaceholder();
      }, 500)

      return false;
    });

    // Handle drop
    this.editor.on("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const componentId = e.dataTransfer.getData("application/x-component-id");
      const instanceId = e.dataTransfer.getData("application/x-component-instance-id");
      let componentElement;

      if(instanceId){
        if(!this.placeholder){
          return;
        }

        componentElement = doc.querySelector('[data-instance-id="' + instanceId + '"]');
        this.placeholder.replaceWith(componentElement);
      } else if(componentId) {
        const component = this.getComponent(componentId);
        
        if(!this.placeholder || !component){
          return false;
        }

        this.insertComponent(component, this.placeholder);
        this.editor.nodeChanged();
      } else {
        // normal html elements
        try {
          if (this.placeholder && this.selectedElement && !this.selectedElement.contains(this.placeholder)) {
            this.placeholder.replaceWith(this.selectedElement);
          }
        } catch (error) {
          console.error('Error during drop:', error);
        } finally {
          this.removePlaceholder();
          doc.querySelector('.dragging') ? doc.querySelector('.dragging').remove() : null;
        }
      }

      return false;
    });

    document.addEventListener('dragend', (e) => {
      if (e.target.classList.contains('component-item')) {
        e.preventDefault();
        e.stopPropagation();

        setTimeout(() => {
          this.removePlaceholder();
        }, 500)

        return false;
      }
    }, true); 
  }

  /**
   * Check if a target is a valid drop target for a component
   * @param {HTMLElement} target - The target element
   * @param {Component} component - The component being dropped
   * @returns {boolean} Whether the drop is valid
   * @private
   */
  isValidDropTarget(target, component) {
    if (!component) {
      return false; // Invalid component
    }

    if(target.nodeType === Node.TEXT_NODE){
      target = target.parentNode;
    }

    // Check if target is a valid drop zone (has data-component-children)
    if (target.hasAttribute("data-component-children")) {
      const containerName = target.getAttribute("data-component-children");

      // Find the parent component
      const parentComponentElement = target.closest("[data-component]");
      if (parentComponentElement) {
        const parentComponentId =
          parentComponentElement.getAttribute("data-component");
        const parentComponent = this.getComponent(parentComponentId);

        if (parentComponent && parentComponent.allowed) {
          // Get allowed components for this container
          const allowedComponents = parentComponent.allowed[containerName];

          if (allowedComponents) {
            // If allowed is an object, check if component ID is in the values
            if (
              typeof allowedComponents === "object" &&
              !Array.isArray(allowedComponents)
            ) {
              return Object.values(allowedComponents).includes(component.id);
            }
            // If allowed is an array, check if component ID is in the array
            else if (Array.isArray(allowedComponents)) {
              return allowedComponents.includes(component.id);
            }
            // If allowed is a string, check for direct match
            else if (typeof allowedComponents === "string") {
              return allowedComponents === component.id;
            }

            // No matching allowed components
            return false;
          }
        }
      }
    }

    // If component has a restriction method, use its result
    if (typeof component.restriction === "function") {
      return component.restriction(target);
    }

    // No restrictions, allow the drop
    return true;
  }

  /**
   * Insert a component into the editor
   * @param {Component} component - The component to insert
   * @param {HTMLElement} target - The target element to insert into
   * @param {boolean} isChild - Whether this is a child component being inserted
   * @private
   */
  insertComponent(component, target, isChild = false) {
    if (!component) return null;

    // Generate a unique instance ID
    const instanceId = `comp-${Math.random().toString(36).substr(2, 9)}`;
    
    // Get default property values for component content generation
    const defaultProps = {};
    Object.entries(component.properties).forEach(([key, prop]) => {
      defaultProps[key] = prop.value !== undefined ? prop.value : prop.default;
    });

    // Get the component's HTML content
    const componentHtml = typeof component.content === 'function' 
      ? component.content(defaultProps) 
      : component.content;

    // Create a document fragment to build our component
    const fragment = document.createDocumentFragment();
    const temp = document.createElement('div');
    temp.innerHTML = componentHtml.trim();
    
    // Move all children to the fragment
    while (temp.firstChild) {
      fragment.appendChild(temp.firstChild);
    }
    
    // Get the root element
    const rootElement = fragment.firstElementChild;
    if (!rootElement) {
      console.error(`Component "${component.name}" did not generate any HTML`);
      return null;
    }
    
    // Add component metadata
    rootElement.setAttribute('data-component', component.id);
    rootElement.setAttribute('data-instance-id', instanceId);

    // Get the current property values and save them to data attributes
    const props = {};
    Object.entries(component.properties).forEach(([key, prop]) => {
      props[key] = prop.value !== undefined ? prop.value : prop.default;
      // Save property to data attribute
      if(typeof props[key] === 'undefined'){
        return;
      }
      rootElement.setAttribute(`data-prop-${key}`, props[key]);
    });
    
    if (isChild && target) {
      // If target is a drop zone, remove any bogus <br> elements first
      const bogusBrs = target.querySelectorAll('br[data-mce-bogus="1"]');
      bogusBrs.forEach(br => br.remove());
      
      // For child components, directly append to the target
      target.appendChild(rootElement);
    } else if (target && target.hasAttribute('data-component-children')) {
      // If target is a drop zone, remove any bogus <br> elements first
      const bogusBrs = target.querySelectorAll('br[data-mce-bogus="1"]');
      bogusBrs.forEach(br => br.remove());
      
      // Append the new component
      target.replaceWith(rootElement);
    } else {
      // regular html
      target.replaceWith(rootElement);
    }
    
    // Process child components if any
    if (component.children && rootElement) {
      this._addChildComponents(component, rootElement, instanceId);
    }
    
    // Call onInsert if defined
    if (typeof component.onInsert === 'function' && rootElement) {
      component.onInsert(this.editor, rootElement, component);
    }

    this.makeComponentDraggable(rootElement);

    return rootElement;
  }
  
  /**
   * Add child components to a parent component
   * @private
   */
  /**
   * Add child components to a parent component
   * @param {Component} component - The parent component
   * @param {HTMLElement} parentElement - The parent DOM element
   * @param {string} parentInstanceId - The parent component's instance ID
   * @private
   */
  _addChildComponents(component, parentElement) {
    if (!component.children) return;
    
    // Process each container with data-component-children
    const containers = parentElement.hasAttribute('data-component-children') 
      ? [parentElement] 
      : parentElement.querySelectorAll('[data-component-children]');

    const insertChildComponent = (container, containerConfig) => {
      const childComponent = this.getComponent(containerConfig.id);
      if (childComponent) {
        for (let i = 0; i < containerConfig.count; i++) {
          this.insertComponent(childComponent, container, true);
        }
      }
    }
    
    containers.forEach(container => {
      const containerName = container.getAttribute('data-component-children');
      const containerConfig = component.children[containerName];
      if (!containerConfig) return;
      
      // Clear existing children if specified
      if (containerConfig.clearExisting) {
        container.innerHTML = '';
      }
      
      // If container config has an id and count, use that
      if (containerConfig.id && containerConfig.count) {
        insertChildComponent(container, containerConfig);
      }
      // If container config is an object with child configurations
      else if (typeof containerConfig === 'object') {
        Object.entries(containerConfig).forEach(([childName, childConfig]) => {
          // Skip special properties like clearExisting
          if (childName === 'clearExisting') return;
          
          // Handle different child configuration formats
          if (typeof childConfig === 'object' && childConfig !== null) {
            // Format: { id: 'component-id', count: 1 }
            if (childConfig.id && childConfig.count) {
              insertChildComponent(container, childConfig)
            }
            // Format: { 'component-id': { count: 1 } }
            else if (childConfig.count) {
              insertChildComponent(container, {
                id: childName,
                count: childConfig.count
              });
            }
          }
          // Format: 'component-id' (shorthand for { id: 'component-id', count: 1 })
          else if (typeof childConfig === 'string') {
            insertChildComponent(container, {
              id: childConfig,
              count: 1
            });
          }
        });
      }
    });
  }

  /**
   * Make a component draggable
   * @private
   */
  makeComponentDraggable(componentElement) {
    componentElement.setAttribute('draggable', 'true');

    componentElement.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/x-component-instance-id', componentElement.getAttribute('data-instance-id') || 'component');
      e.dataTransfer.setData('application/x-component-id', componentElement.getAttribute('data-component') || 'component');
      e.dropEffect = 'move';
      e.stopPropagation();
    });
  }

  /**
   * Select an element and update the properties panel
   * @param {HTMLElement} element - The element to select
   */
  selectElement(element) {
    try {
      // Skip if no element provided or already selected the same element
      if (!element) {
        this.selectedElement = null;
        this.updatePropertiesPanel();
        return;
      }

      // Check if element is a valid DOM node
      if (!element || !(element.nodeType === Node.ELEMENT_NODE)) {
        // Try to get the node from the editor's selection
        const selectedNode = this.editor.selection.getNode();
        if (selectedNode && selectedNode.nodeType === Node.ELEMENT_NODE) {
          element = selectedNode;
        } else {
          console.warn("selectElement called with invalid element:", element);
          return;
        }
      }

      // Skip if already selected the same element
      if (this.selectedElement === element) {
        return;
      }

      let selectedElement = element;

      // If we found a component element and we're not already selecting it
      if (element.hasAttribute("data-component") && ! this.selectedElement.isEqualNode(element)) {
        const componentDef = this.getComponent(element.getAttribute('data-component'));
        if(componentDef.onFocus){
          componentDef.onFocus(this.editor, element, componentDef);
        }
        selectedElement = element;
      }

      // Update the selected element
      this.selectedElement = selectedElement;

      // Always update the properties panel
      this.updatePropertiesPanel();
    } catch (error) {
      console.error("Error in selectElement:", error);
    }
  }

  /**
   * Create a styles dropdown for the properties panel
   * @param {HTMLElement} container - The container to add the dropdown to
   * @returns {HTMLSelectElement|null} The created select element or null if no styles exist
   * @private
   */
  _createStylesDropdown(container) {
    // Early return if no styles are defined
    if (!this.styles?.size) return null;

    // Create DOM elements using DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Create style group container
    const styleGroup = document.createElement('div');
    styleGroup.className = 'property-group';
    
    // Create and append header
    const header = document.createElement('h4');
    header.textContent = 'Styles';
    styleGroup.appendChild(header);
    
    // Create select container and element
    const styleContainer = document.createElement('div');
    styleContainer.className = 'property-field';
    
    const styleSelect = document.createElement('select');
    styleSelect.className = 'style-selector';
    styleSelect.setAttribute('aria-label', 'Select a style');

    /**
     * Updates the dropdown options based on available styles
     * @private
     */
    const updateDropdown = () => {
      // Use document fragment for batch DOM operations
      const fragment = document.createDocumentFragment();
      
      // Add default option
      const defaultOption = new Option('No style', '');
      fragment.appendChild(defaultOption);
      
      // Add style options using more efficient iteration
      Array.from(this.styles.keys()).forEach(name => {
        fragment.appendChild(new Option(name, name));
      });
      
      // Clear and repopulate in one operation
      styleSelect.innerHTML = '';
      styleSelect.appendChild(fragment);
      
      // Update selected value if an element is selected
      if (this.selectedElement) {
        styleSelect.value = this.getCurrentStyle(this.selectedElement) || '';
      }
    };

    /**
     * Handles style selection changes
     * @private
     */
    const handleStyleChange = () => {
      if (!this.selectedElement) return;
      
      const styleName = styleSelect.value;
      styleName ? this.applyStyle(styleName) : this.removeStyles();
      this.updatePropertiesPanel();
    };
    
    /**
     * Cleans up event listeners
     * @private
     */
    const cleanup = () => {
      styleSelect.removeEventListener('change', handleStyleChange);
      document.removeEventListener('style-updated', updateDropdown);
      delete this._styleChangeListener;
      delete this._styleCleanup;
    };

    // Initialize dropdown
    updateDropdown();
    
    // Set up event listeners
    styleSelect.addEventListener('change', handleStyleChange);
    document.addEventListener('style-updated', updateDropdown);
    
    // Store references for cleanup
    this._styleChangeListener = updateDropdown;
    this._styleCleanup = cleanup;
    
    // Assemble the DOM
    styleContainer.appendChild(styleSelect);
    styleGroup.appendChild(styleContainer);
    fragment.appendChild(styleGroup);
    
    // Insert at the beginning of the container
    container.insertBefore(fragment, container.firstChild);
    
    return styleSelect;
  }

  /**
   * Update the properties panel for the selected element
   * @private
   */
  /**
   * Update the properties panel for the selected element
   * @private
   */
  updatePropertiesPanel() {
    if (!this.selectedElement) return;

    // Get the scrollable container and content
    const scrollable = this.propertiesPanel.querySelector(
      ".properties-scrollable"
    );
    if (!scrollable) return;

    // Clear existing content
    scrollable.innerHTML = "";

    // Create header
    const header = document.createElement("div");
    header.className = "properties-header";

    // Create content container
    const content = document.createElement("div");
    content.className = "properties-content";

    // Add header and content to scrollable
    scrollable.appendChild(header);
    scrollable.appendChild(content);

    // Get the component type from the selected element
    const componentId = this.selectedElement.getAttribute("data-component");
    const component = this.getComponent(componentId);

    // Add styles dropdown for all elements
    this._createStylesDropdown(content);

    // Update header and content based on component type
    if (component) {
      header.innerHTML = `
        <h3>${component.name} Properties</h3>
        <div class="element-info">Editing ${component.name} component</div>
      `;

      // Get current properties from data attributes
      const currentProps = component.properties
        ? this._getPropertiesFromElement(
            this.selectedElement,
            component.properties
          )
        : {};

      // Render component properties
      this.renderComponentProperties(component, content, currentProps);

      // Set up event listeners for property changes
      this.setupPropertyChangeListeners(component);
    } else {
      // Not a registered component, show generic element info
      header.innerHTML = `
        <h3>Element Properties</h3>
        <div class="element-info">Selected element: ${this.selectedElement.tagName.toLowerCase()}</div>
      `;

      // Show generic element properties
      this.renderElementProperties(this.selectedElement, content);
    }
  }

  /**
   * Render component-specific properties
   * @param {Component} component - The component
   * @param {HTMLElement} container - The container to render into
   * @param {Object} currentProps - Current property values from data attributes
   * @private
   */
  renderComponentProperties(component, container, currentProps = {}) {
    try {
      if (!this.selectedElement) {
        console.warn("No element selected");
        return;
      }

      // Clear the container first
      container.innerHTML = "";

      // Element Group (ID, class, etc.)
      const elementGroup = document.createElement("div");
      elementGroup.className = "property-group";
      elementGroup.innerHTML = "<h4>Element</h4>";

      const elementContainer = document.createElement("div");
      elementContainer.className = "property-fields";

      // ID Input
      const idField = document.createElement("div");
      idField.className = "property-field";
      const elementId = this.selectedElement.id || "";
      idField.innerHTML = `
        <label for="element-id">ID</label>
        <input type="text" id="element-id" value="${elementId}" placeholder="element-id" name="id">
      `;

      const idInput = idField.querySelector("input");
      idInput.addEventListener("change", (e) => {
        const newId = e.target.value.trim();
        if (newId) {
          this.selectedElement.id = newId;
        } else {
          this.selectedElement.removeAttribute("id");
        }
        this.editor.nodeChanged();
      });

      elementContainer.appendChild(idField);
      elementGroup.appendChild(elementContainer);
      container.appendChild(elementGroup);

      // Get properties from the component definition
      const properties = component.properties || {};

      // Group properties by their group
      const groups = {};

      // Process each property
      Object.entries(properties).forEach(([key, prop]) => {
        if (prop && typeof prop === "object") {
          const groupName = prop.group || "General";
          if (!groups[groupName]) {
            groups[groupName] = [];
          }
          // Ensure the property has a name and type
          const namedProp = {
            ...prop,
            name: key,
            type: prop.type || "text", // Default to text if no type specified
          };
          groups[groupName].push(namedProp);
        }
      });

      // If no groups were created but we have properties, add them to a default group
      if (
        Object.keys(groups).length === 0 &&
        Object.keys(properties).length > 0
      ) {
        groups["General"] = Object.entries(properties).map(([key, prop]) => ({
          ...prop,
          name: key,
          type: prop.type || "text", // Default to text if no type specified
        }));
      }

      // Track if we've added any property groups
      let hasPropertyGroups = false;

      // Render each group
      Object.entries(groups).forEach(([groupName, props]) => {
        if (!Array.isArray(props) || props.length === 0) return;

        const group = document.createElement("div");
        group.className = "property-group";
        group.innerHTML = `<h4>${groupName}</h4>`;

        const propsContainer = document.createElement("div");
        propsContainer.className = "property-fields";

        // Render each property in the group
        let hasValidProperties = false;

        props.forEach((prop) => {
          if (prop && typeof prop === "object" && prop.name) {
            try {
              const field = this.createPropertyField(prop, component);
              if (field) {
                propsContainer.appendChild(field);
                hasValidProperties = true;
              }
            } catch (error) {
              console.error(
                `Error creating property field for ${prop.name}:`,
                error
              );
            }
          }
        });

        // Only add the group if it has valid properties
        if (hasValidProperties) {
          group.appendChild(propsContainer);
          container.appendChild(group);
          hasPropertyGroups = true;
        }
      });

      // If no properties were rendered, show a message
      if (!hasPropertyGroups) {
        const noProps = document.createElement("div");
        noProps.className = "no-properties";
        noProps.textContent = "No properties available for this component";
        container.appendChild(noProps);
      }

      // Set up event listeners for all property fields
      this.setupPropertyChangeListeners(component);
    } catch (error) {
      console.error("Error rendering component properties:", error);
      const errorMsg = document.createElement("div");
      errorMsg.className = "error-message";
      errorMsg.textContent = "Error loading properties";
      container.appendChild(errorMsg);
    }
  }

  /**
   * Create a number input with unit selector
   * @private
   */
  createNumberWithUnitInput(propName, label, currentValue = "") {
    // Handle empty or invalid values
    if (!currentValue) {
      currentValue = "0px";
    }
    
    // Extract numeric value and unit, handling cases like "0px"
    const match = String(currentValue).match(/^(0|0\.\d+|\d+(?:\.\d+)?)([a-z%]*)$/i);
    let value = "0";
    let unit = "px";
    
    if (match) {
      // Handle the numeric value
      value = match[1] || "0";
      // Handle the unit, default to px if not specified
      unit = match[2] || "px";
    }

    // Ensure value is a valid number for the input
    const numericValue = parseFloat(value) || 0;

    const field = document.createElement("div");
    field.className = "property-field number-with-unit";
    field.innerHTML = `
      <label>${label}</label>
      <div class="input-group">
        <input type="number" data-style="${propName}" value="${numericValue}" step="any">
        <select class="unit-selector" data-style="${propName}-unit">
          <option value="px" ${unit === "px" ? "selected" : ""}>px</option>
          <option value="%" ${unit === "%" ? "selected" : ""}>%</option>
          <option value="em" ${unit === "em" ? "selected" : ""}>em</option>
          <option value="rem" ${unit === "rem" ? "selected" : ""}>rem</option>
          <option value="vh" ${unit === "vh" ? "selected" : ""}>vh</option>
          <option value="vw" ${unit === "vw" ? "selected" : ""}>vw</option>
        </select>
      </div>
    `;

    // Add change handler
    const input = field.querySelector("input");
    const select = field.querySelector("select");

    // Ensure the input always has a valid numeric value
    input.addEventListener('blur', () => {
      if (input.value === '') {
        input.value = '0';
      } else if (isNaN(parseFloat(input.value))) {
        input.value = '0';
      }
    });

    const updateStyle = () => {
      // Ensure we always have a valid number
      const numValue = parseFloat(input.value) || 0;
      const value = input.value.trim();
      const unit = select.value;
      this.editor.dom.setStyle(
        this.selectedElement,
        propName,
        value ? `${value}${unit}` : ""
      );
    };

    input.addEventListener("change", updateStyle);
    select.addEventListener("change", updateStyle);

    return field;
  }

  /**
   * Create a color input field
   * @private
   */
  createColorInput(propName, label, currentValue = "") {
    const colorValue = this._parseColorValue(currentValue);
    
    const fieldElement = document.createElement("div");
    fieldElement.className = "property-field";
    fieldElement.innerHTML = `
      <label>${label}</label>
      <div class="color-picker-container">
        <input type="color" value="${
          colorValue || "#000000"
        }" data-style="${propName}">
        <span class="color-value">${colorValue || "transparent"}</span>
      </div>
    `;

    const colorInput = fieldElement.querySelector('input[type="color"]');
    const colorValueSpan = fieldElement.querySelector(".color-value");

    if (colorInput && colorValueSpan) {
      colorInput.addEventListener("input", (e) => {
        const value = e.target.value;
        this.editor.dom.setStyle(this.selectedElement, propName, value);
        colorValueSpan.textContent = value;
        this.editor.nodeChanged();
      });
    }

    return fieldElement;
  }

  /**
   * Create a select input
   * @private
   */
  createSelectInput(propName, label, options, currentValue = "") {
    const field = document.createElement("div");
    field.className = "property-field select-input";

    const select = document.createElement("select");
    select.dataset.style = propName;

    options.forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      if (option.value === currentValue) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", (e) => {
      this.editor.dom.setStyle(this.selectedElement, propName, e.target.value);
    });

    field.innerHTML = `<label>${label}</label>`;
    field.appendChild(select);

    return field;
  }

  /**
   * Create a border control with individual side controls and unified option
   * @private
   */
  // Helper function to safely parse color values
  _parseColorValue(colorValue) {
    // Return default if no value
    if (!colorValue || typeof colorValue !== 'string') return "#000000";
    
    // Remove any whitespace
    colorValue = colorValue.trim();
    
    // Handle transparent
    if (colorValue === 'transparent') return '#00000000';
    
    // Handle hex colors (3 or 6 digits with optional #)
    const hexMatch = colorValue.match(/^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        // Expand shorthand hex (#abc -> #aabbcc)
        return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
      }
      return `#${hex}`.toUpperCase();
    }
    
    // Handle rgb/rgba colors
    const rgbMatch = colorValue.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (rgbMatch) {
      try {
        const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1] || 0, 10)));
        const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2] || 0, 10)));
        const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3] || 0, 10)));
        
        // Convert to hex
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
      } catch (e) {
        console.warn('Error parsing RGB color:', colorValue, e);
        return '#000000';
      }
    }
    
    // Default fallback for any other format
    return '#000000';
  }

  createBorderControl(propName, label, currentValue = "") {
    const isUnified = !propName.includes("border-"); // Check if this is the main border control
    
    // Safely split and parse the border value
    let width = "", style = "none", color = "";
    try {
      [width = "", style = "none", color = ""] = (currentValue || "").split(" ").filter(Boolean);
      // Validate and normalize the color
      color = this._parseColorValue(color);
    } catch (e) {
      console.warn("Error parsing border value:", currentValue, e);
    }

    const field = document.createElement("div");
    field.className = "property-field border-control";

    // Add unified border checkbox for the main border control
    if (isUnified) {
      const unifiedCheckbox = document.createElement("div");
      unifiedCheckbox.className = "unified-checkbox";
      unifiedCheckbox.style.marginBottom = "8px";
      unifiedCheckbox.innerHTML = `
        <label>
          <input type="checkbox" class="unified-border-checkbox" checked>
          Unified Border
        </label>
      `;
      field.appendChild(unifiedCheckbox);
    }

    // Create the main border controls container
    const controlsContainer = document.createElement("div");
    controlsContainer.className = "border-controls";
    controlsContainer.style.display = "flex";
    controlsContainer.style.gap = "4px";
    controlsContainer.style.alignItems = "center";

    // Add border style dropdown
    controlsContainer.innerHTML = `
      <select class="border-style" data-style="${propName}-style" style="flex: 1;">
        <option value="none" ${style === "none" ? "selected" : ""}>None</option>
        <option value="solid" ${
          style === "solid" ? "selected" : ""
        }>Solid</option>
        <option value="dashed" ${
          style === "dashed" ? "selected" : ""
        }>Dashed</option>
        <option value="dotted" ${
          style === "dotted" ? "selected" : ""
        }>Dotted</option>
        <option value="double" ${
          style === "double" ? "selected" : ""
        }>Double</option>
      </select>
      <input type="number" class="border-width" 
             value="${parseInt(width) || "1"}" 
             min="0" 
             step="1" 
             data-style="${propName}-width" 
             style="width: 60px;">
      <input type="color" class="border-color" 
             value="${this._parseColorValue(color)}" 
             data-style="${propName}-color"
             style="width: 40px; height: 32px; min-width: 40px;"
             oninput="this.value = this.value || '#000000'">
    `;

    field.appendChild(controlsContainer);

    // Add individual side controls if this is the main border control
    if (isUnified) {
      const sides = ["top", "right", "bottom", "left"];
      const sidesContainer = document.createElement("div");
      sidesContainer.className = "border-sides";
      sidesContainer.style.display = "none";
      sidesContainer.style.marginTop = "8px";
      sidesContainer.style.borderTop = "1px solid #eee";
      sidesContainer.style.paddingTop = "8px";

      sides.forEach((side) => {
        const sideValue =
          this.editor.dom.getStyle(
            this.selectedElement,
            `border-${side}`,
            true
          ) || "";
        let [sideWidth = "", sideStyle = style, sideColor = color] = sideValue.split(" ");
        sideColor = this._parseColorValue(sideColor);

        const sideControl = document.createElement("div");
        sideControl.className = "border-side-control";
        sideControl.style.display = "flex";
        sideControl.style.alignItems = "center";
        sideControl.style.marginBottom = "4px";
        sideControl.style.gap = "4px";

        sideControl.innerHTML = `
          <span style="width: 40px; text-transform: capitalize;">${side}:</span>
          <select class="border-side-style" data-side="${side}" style="flex: 1;">
            <option value="none" ${
              sideStyle === "none" ? "selected" : ""
            }>None</option>
            <option value="solid" ${
              sideStyle === "solid" ? "selected" : ""
            }>Solid</option>
            <option value="dashed" ${
              sideStyle === "dashed" ? "selected" : ""
            }>Dashed</option>
          </select>
          <input type="number" class="border-side-width" 
                 data-side="${side}" 
                 value="${Math.max(0, parseInt(sideWidth) || 0)}" 
                 min="0" 
                 max="50"
                 step="1" 
                 style="width: 60px;"
                 oninput="this.value = Math.min(50, Math.max(0, parseInt(this.value) || 0))">
          <input type="color" class="border-side-color" 
                 data-side="${side}" 
                 value="${this._parseColorValue(sideColor || color)}" 
                 style="width: 30px; height: 26px; min-width: 30px;"
                 oninput="this.value = this.value || '#000000'">
        `;

        sidesContainer.appendChild(sideControl);
      });

      field.appendChild(sidesContainer);

      // Toggle individual side controls when unified checkbox changes
      const unifiedCheckbox = field.querySelector(".unified-border-checkbox");
      unifiedCheckbox.addEventListener("change", (e) => {
        sidesContainer.style.display = e.target.checked ? "none" : "block";

        // If enabling unified mode, sync all sides with main border
        if (e.target.checked) {
          this.syncAllBorders(field, propName);
        }
      });
    }

    // Update border when any control changes
    const updateBorder = (e) => {
      const borderStyle = field.querySelector(".border-style").value;
      const borderWidth = field.querySelector(".border-width").value;
      const borderColor = field.querySelector(".border-color").value;
      const isUnified =
        !field.querySelector(".unified-border-checkbox") ||
        field.querySelector(".unified-border-checkbox").checked;

      if (isUnified) {
        // Apply to all sides
        if (borderStyle === "none") {
          this.editor.dom.setStyle(this.selectedElement, "border", "none");
        } else {
          this.editor.dom.setStyle(
            this.selectedElement,
            "border",
            `${borderWidth}px ${borderStyle} ${borderColor}`
          );
        }
      } else if (e && e.target) {
        // Update individual side
        const side = e.target
          .closest(".border-side-control")
          ?.querySelector("select")?.dataset.side;
        if (side) {
          const sideStyle = field.querySelector(
            `.border-side-style[data-side="${side}"]`
          ).value;
          const sideWidth = field.querySelector(
            `.border-side-width[data-side="${side}"]`
          ).value;
          const sideColor = field.querySelector(
            `.border-side-color[data-side="${side}"]`
          ).value;

          if (sideStyle === "none") {
            this.editor.dom.setStyle(
              this.selectedElement,
              `border-${side}`,
              "none"
            );
          } else {
            this.editor.dom.setStyle(
              this.selectedElement,
              `border-${side}`,
              `${sideWidth}px ${sideStyle} ${sideColor}`
            );
          }
        }
      }

      this.editor.nodeChanged();
    };

    // Add event listeners
    field
      .querySelectorAll(".border-style, .border-width, .border-color")
      .forEach((input) => {
        input.addEventListener("change", updateBorder);
      });

    if (isUnified) {
      field
        .querySelectorAll(
          ".border-side-style, .border-side-width, .border-side-color"
        )
        .forEach((input) => {
          input.addEventListener("change", updateBorder);
        });
    }

    return field;
  }

  /**
   * Render generic element properties (CSS)
   * @param {HTMLElement} element - The element
   * @param {HTMLElement} container - The container to render into
   * @private
   */
  renderElementProperties(element, container) {
    // Element Group (ID, class, etc.)
    const elementGroup = document.createElement("div");
    elementGroup.className = "property-group";
    elementGroup.innerHTML = "<h4>Element</h4>";

    const elementContainer = document.createElement("div");
    elementContainer.className = "property-fields";

    // ID Input
    const idField = document.createElement("div");
    idField.className = "property-field";
    const elementId = element.id || "";
    idField.innerHTML = `
      <label for="element-id">ID</label>
      <input type="text" id="element-id" value="${elementId}" placeholder="element-id">
    `;

    const idInput = idField.querySelector("input");
    idInput.addEventListener("change", (e) => {
      const newId = e.target.value.trim();
      if (newId) {
        element.id = newId;
      } else {
        element.removeAttribute("id");
      }
      this.editor.nodeChanged();
    });

    elementContainer.appendChild(idField);
    elementGroup.appendChild(elementContainer);
    container.appendChild(elementGroup);

    // Typography Group
    const typographyGroup = document.createElement("div");
    typographyGroup.className = "property-group";
    typographyGroup.innerHTML = "<h4>Typography</h4>";

    const typographyContainer = document.createElement("div");
    typographyContainer.className = "property-fields";

    // Font Family
    const fontFamily =
      this.editor.dom.getStyle(element, "font-family", true) || "";
    typographyContainer.appendChild(
      this.createSelectInput(
        "font-family",
        "Font Family",
        [
          { value: "", label: "Inherit" },
          { value: "Arial, sans-serif", label: "Arial" },
          {
            value: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            label: "Helvetica",
          },
          { value: "Georgia, serif", label: "Georgia" },
          {
            value: "'Times New Roman', Times, serif",
            label: "Times New Roman",
          },
          { value: "Courier, monospace", label: "Courier" },
          { value: "'Courier New', Courier, monospace", label: "Courier New" },
          { value: "Verdana, sans-serif", label: "Verdana" },
        ],
        fontFamily
      )
    );

    // Font Size
    const fontSize = this.editor.dom.getStyle(element, "font-size", true) || "";
    typographyContainer.appendChild(
      this.createNumberWithUnitInput("font-size", "Font Size", fontSize)
    );

    // Font Weight
    const fontWeight =
      this.editor.dom.getStyle(element, "font-weight", true) || "";
    typographyContainer.appendChild(
      this.createSelectInput(
        "font-weight",
        "Font Weight",
        [
          { value: "", label: "Inherit" },
          { value: "100", label: "100 (Thin)" },
          { value: "200", label: "200 (Extra Light)" },
          { value: "300", label: "300 (Light)" },
          { value: "400", label: "400 (Normal)" },
          { value: "500", label: "500 (Medium)" },
          { value: "600", label: "600 (Semi Bold)" },
          { value: "700", label: "700 (Bold)" },
          { value: "800", label: "800 (Extra Bold)" },
          { value: "900", label: "900 (Black)" },
        ],
        fontWeight
      )
    );

    // Line Height
    const lineHeight =
      this.editor.dom.getStyle(element, "line-height", true) || "";
    typographyContainer.appendChild(
      this.createNumberWithUnitInput("line-height", "Line Height", lineHeight)
    );

    // Letter Spacing
    const letterSpacing =
      this.editor.dom.getStyle(element, "letter-spacing", true) || "";
    typographyContainer.appendChild(
      this.createNumberWithUnitInput(
        "letter-spacing",
        "Letter Spacing",
        letterSpacing
      )
    );

    // Text Align
    const textAlign =
      this.editor.dom.getStyle(element, "text-align", true) || "";
    typographyContainer.appendChild(
      this.createSelectInput(
        "text-align",
        "Text Align",
        [
          { value: "", label: "Inherit" },
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "justify", label: "Justify" },
        ],
        textAlign
      )
    );

    // Text Decoration
    const textDecoration =
      this.editor.dom.getStyle(element, "text-decoration", true) || "";
    typographyContainer.appendChild(
      this.createSelectInput(
        "text-decoration",
        "Text Decoration",
        [
          { value: "none", label: "None" },
          { value: "underline", label: "Underline" },
          { value: "overline", label: "Overline" },
          { value: "line-through", label: "Line Through" },
        ],
        textDecoration === "none" ? "none" : textDecoration || "none"
      )
    );

    // Text Transform
    const textTransform =
      this.editor.dom.getStyle(element, "text-transform", true) || "";
    typographyContainer.appendChild(
      this.createSelectInput(
        "text-transform",
        "Text Transform",
        [
          { value: "none", label: "None" },
          { value: "uppercase", label: "Uppercase" },
          { value: "lowercase", label: "Lowercase" },
          { value: "capitalize", label: "Capitalize" },
        ],
        textTransform || "none"
      )
    );

    typographyGroup.appendChild(typographyContainer);
    container.appendChild(typographyGroup);

    // Colors Group
    const colorsGroup = document.createElement("div");
    colorsGroup.className = "property-group";
    colorsGroup.innerHTML = "<h4>Colors</h4>";

    const colorsContainer = document.createElement("div");
    colorsContainer.className = "property-fields";

    // Text Color
    const color = this.editor.dom.getStyle(element, "color", true) || "";
    colorsContainer.appendChild(
      this.createColorInput("color", "Text Color", color)
    );

    // Background Color
    const backgroundColor =
      this.editor.dom.getStyle(element, "background-color", true) || "";
    colorsContainer.appendChild(
      this.createColorInput(
        "background-color",
        "Background Color",
        backgroundColor
      )
    );

    // Opacity
    const opacity = this.editor.dom.getStyle(element, "opacity", true) || "1";
    const opacityField = document.createElement("div");
    opacityField.className = "property-field";
    opacityField.innerHTML = `
      <label>Opacity</label>
      <div class="range-input">
        <input type="range" min="0" max="1" step="0.1" value="${opacity}" data-style="opacity">
        <span>${Math.round(parseFloat(opacity || 1) * 100)}%</span>
      </div>
    `;

    const opacityInput = opacityField.querySelector("input");
    const opacityValue = opacityField.querySelector("span");

    opacityInput.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      opacityValue.textContent = `${Math.round(value * 100)}%`;
      this.editor.dom.setStyle(this.selectedElement, "opacity", value);
    });

    colorsContainer.appendChild(opacityField);
    colorsGroup.appendChild(colorsContainer);
    container.appendChild(colorsGroup);

    // Borders Group
    const bordersGroup = document.createElement("div");
    bordersGroup.className = "property-group";
    bordersGroup.innerHTML = "<h4>Borders</h4>";

    const bordersContainer = document.createElement("div");
    bordersContainer.className = "property-fields";

    // Main border control (unified by default)
    const borderValue = [
      this.editor.dom.getStyle(element, "border-width", true) || "",
      this.editor.dom.getStyle(element, "border-style", true) || "none",
      this.editor.dom.getStyle(element, "border-color", true) || "",
    ]
      .join(" ")
      .trim();

    bordersContainer.appendChild(
      this.createBorderControl("border", "Border", borderValue)
    );

    bordersGroup.appendChild(bordersContainer);
    container.appendChild(bordersGroup);

    // Spacing Group
    const spacingGroup = document.createElement("div");
    spacingGroup.className = "property-group";
    spacingGroup.innerHTML = "<h4>Spacing</h4>";

    const spacingContainer = document.createElement("div");
    spacingContainer.className = "property-fields";

    // Padding
    const paddingTop =
      this.editor.dom.getStyle(element, "padding-top", true) || "";
    const paddingRight =
      this.editor.dom.getStyle(element, "padding-right", true) || "";
    const paddingBottom =
      this.editor.dom.getStyle(element, "padding-bottom", true) || "";
    const paddingLeft =
      this.editor.dom.getStyle(element, "padding-left", true) || "";

    // Helper function to parse numeric value from string with unit
    const parseNumericValue = (value) => {
      if (!value) return '0';
      const match = String(value).match(/^([\d.]+)/);
      return match ? match[1] : '0';
    };

    const paddingContainer = document.createElement("div");
    paddingContainer.className = "property-field";
    paddingContainer.innerHTML = `
      <div class="property-header">
        <label>Padding</label>
        <div class="unified-control">
          <input type="checkbox" id="unified-padding" />
          <label for="unified-padding">Unified</label>
        </div>
      </div>
      <div class="padding-inputs">
        <div class="input-group">
          <label>Top</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(paddingTop)}" data-style="padding-top">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Right</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(paddingRight)}" data-style="padding-right">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Bottom</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(paddingBottom)}" data-style="padding-bottom">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Left</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(paddingLeft)}" data-style="padding-left">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Unified padding checkbox functionality
    const unifiedPaddingCheckbox =
      paddingContainer.querySelector("#unified-padding");
    const paddingInputs = Array.from(
      paddingContainer.querySelectorAll(".input-group")
    );

    // Parse numeric value from style string (e.g., '10px' -> 10, '0px' -> 0, '' -> '')
    const parseStyleValue = (value) => {
      if (value === '' || value === '0' || value === '0px') return '0';
      const match = value ? value.match(/^([\d.]+)/) : null;
      return match ? parseFloat(match[0]) : '';
    };

    // Get unit from style string (e.g., '10px' -> 'px', '0px' -> 'px', '' -> 'px')
    const getUnit = (value) => {
      if (value === '0') return 'px'; // Handle standalone '0' as pixels
      const match = value ? value.match(/[^\d.]+$/) : null;
      return match ? match[0] : 'px';
    };

    // Initialize padding inputs with proper values and units
    paddingInputs.forEach((inputGroup, index) => {
      const input = inputGroup.querySelector('input[type="number"]');
      const select = inputGroup.querySelector("select");
      const style = input.dataset.style;
      const value = this.editor.dom.getStyle(element, style, true) || "";

      input.value = parseStyleValue(value);
      select.value = getUnit(value);

      // Handle input changes
      const handleChange = () => {
        const newValue = input.value + select.value;
        this.editor.dom.setStyle(element, style, input.value ? newValue : "");
        this.editor.nodeChanged();

        // If unified is checked, update all other padding values
        if (unifiedPaddingCheckbox.checked) {
          paddingInputs.forEach((otherGroup, otherIndex) => {
            if (otherIndex !== index) {
              const otherInput = otherGroup.querySelector(
                'input[type="number"]'
              );
              const otherSelect = otherGroup.querySelector("select");
              otherInput.value = input.value;
              otherSelect.value = select.value;
              this.editor.dom.setStyle(
                element,
                otherInput.dataset.style,
                input.value ? newValue : ""
              );
            }
          });
        }
      };

      input.addEventListener("input", handleChange);
      select.addEventListener("change", handleChange);
    });

    // Unified padding toggle
    unifiedPaddingCheckbox.addEventListener("change", () => {
      const isUnified = unifiedPaddingCheckbox.checked;

      // Hide/show individual padding inputs
      paddingInputs.forEach((inputGroup, index) => {
        if (index > 0) {
          inputGroup.style.display = isUnified ? "none" : "flex";
        }
      });

      // If enabling unified, sync all values to the first input
      if (isUnified && paddingInputs.length > 0) {
        const firstInput = paddingInputs[0].querySelector(
          'input[type="number"]'
        );
        const firstSelect = paddingInputs[0].querySelector("select");
        const value = firstInput.value + firstSelect.value;

        // Update all padding values to match the first one
        paddingInputs.forEach((inputGroup, index) => {
          if (index > 0) {
            const input = inputGroup.querySelector('input[type="number"]');
            const select = inputGroup.querySelector("select");
            input.value = firstInput.value;
            select.value = firstSelect.value;
            this.editor.dom.setStyle(
              element,
              input.dataset.style,
              firstInput.value ? value : ""
            );
          }
        });
      }

      this.editor.nodeChanged();
    });

    // Check if all padding values are the same
    const paddingValues = paddingInputs.map((inputGroup) => {
      const input = inputGroup.querySelector('input[type="number"]');
      const select = inputGroup.querySelector("select");
      return input.value + select.value;
    });

    const allPaddingSame = paddingValues.every(
      (val, i, arr) => val === arr[0] && val !== ""
    );
    if (allPaddingSame && paddingInputs.length > 1) {
      unifiedPaddingCheckbox.checked = true;
      paddingInputs.forEach((inputGroup, index) => {
        if (index > 0) inputGroup.style.display = "none";
      });
    }

    spacingContainer.appendChild(paddingContainer);

    // Margin
    const marginTop =
      this.editor.dom.getStyle(element, "margin-top", true) || "";
    const marginRight =
      this.editor.dom.getStyle(element, "margin-right", true) || "";
    const marginBottom =
      this.editor.dom.getStyle(element, "margin-bottom", true) || "";
    const marginLeft =
      this.editor.dom.getStyle(element, "margin-left", true) || "";

    const marginContainer = document.createElement("div");
    marginContainer.className = "property-field";
    marginContainer.innerHTML = `
      <div class="property-header">
        <label>Margin</label>
        <div class="unified-control">
          <input type="checkbox" id="unified-margin" />
          <label for="unified-margin">Unified</label>
        </div>
      </div>
      <div class="margin-inputs">
        <div class="input-group">
          <label>Top</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(marginTop)}" data-style="margin-top">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Right</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(marginRight)}" data-style="margin-right">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Bottom</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(marginBottom)}" data-style="margin-bottom">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
        <div class="input-group">
          <label>Left</label>
          <div class="input-with-unit">
            <input type="number" value="${parseNumericValue(marginLeft)}" data-style="margin-left">
            <select class="unit-select">
              <option value="px">px</option>
              <option value="%">%</option>
              <option value="em">em</option>
            </select>
          </div>
        </div>
      </div>
    `;

    // Unified margin checkbox functionality
    const unifiedMarginCheckbox =
      marginContainer.querySelector("#unified-margin");
    const marginInputs = Array.from(
      marginContainer.querySelectorAll(".input-group")
    );

    // Initialize margin inputs with proper values and units
    marginInputs.forEach((inputGroup, index) => {
      const input = inputGroup.querySelector('input[type="number"]');
      const select = inputGroup.querySelector("select");
      const style = input.dataset.style;
      const value = this.editor.dom.getStyle(element, style, true) || "";

      input.value = parseStyleValue(value);
      select.value = getUnit(value);

      // Handle input changes
      const handleChange = () => {
        const newValue = input.value + select.value;
        this.editor.dom.setStyle(element, style, input.value ? newValue : "");
        this.editor.nodeChanged();

        // If unified is checked, update all other margin values
        if (unifiedMarginCheckbox.checked) {
          marginInputs.forEach((otherGroup, otherIndex) => {
            if (otherIndex !== index) {
              const otherInput = otherGroup.querySelector(
                'input[type="number"]'
              );
              const otherSelect = otherGroup.querySelector("select");
              otherInput.value = input.value;
              otherSelect.value = select.value;
              this.editor.dom.setStyle(
                element,
                otherInput.dataset.style,
                input.value ? newValue : ""
              );
            }
          });
        }
      };

      input.addEventListener("input", handleChange);
      select.addEventListener("change", handleChange);
    });

    // Unified margin toggle
    unifiedMarginCheckbox.addEventListener("change", () => {
      const isUnified = unifiedMarginCheckbox.checked;

      // Hide/show individual margin inputs
      marginInputs.forEach((inputGroup, index) => {
        if (index > 0) {
          inputGroup.style.display = isUnified ? "none" : "flex";
        }
      });

      // If enabling unified, sync all values to the first input
      if (isUnified && marginInputs.length > 0) {
        const firstInput = marginInputs[0].querySelector(
          'input[type="number"]'
        );
        const firstSelect = marginInputs[0].querySelector("select");
        const value = firstInput.value + firstSelect.value;

        // Update all margin values to match the first one
        marginInputs.forEach((inputGroup, index) => {
          if (index > 0) {
            const input = inputGroup.querySelector('input[type="number"]');
            const select = inputGroup.querySelector("select");
            input.value = firstInput.value;
            select.value = firstSelect.value;
            this.editor.dom.setStyle(
              element,
              input.dataset.style,
              firstInput.value ? value : ""
            );
          }
        });
      }

      this.editor.nodeChanged();
    });

    // Check if all margin values are the same
    const marginValues = marginInputs.map((inputGroup) => {
      const input = inputGroup.querySelector('input[type="number"]');
      const select = inputGroup.querySelector("select");
      return input.value + select.value;
    });

    const allMarginSame = marginValues.every(
      (val, i, arr) => val === arr[0] && val !== ""
    );
    if (allMarginSame && marginInputs.length > 1) {
      unifiedMarginCheckbox.checked = true;
      marginInputs.forEach((inputGroup, index) => {
        if (index > 0) inputGroup.style.display = "none";
      });
    }

    spacingContainer.appendChild(marginContainer);
    spacingGroup.appendChild(spacingContainer);
    container.appendChild(spacingGroup);

    // Size & Position Group
    const sizeGroup = document.createElement("div");
    sizeGroup.className = "property-group";
    sizeGroup.innerHTML = "<h4>Size & Position</h4>";

    const sizeContainer = document.createElement("div");
    sizeContainer.className = "property-fields";

    // Width & Height
    const width = this.editor.dom.getStyle(element, "width", true) || "";
    const height = this.editor.dom.getStyle(element, "height", true) || "";

    sizeContainer.appendChild(
      this.createNumberWithUnitInput("width", "Width", width)
    );
    sizeContainer.appendChild(
      this.createNumberWithUnitInput("height", "Height", height)
    );

    // Min/Max Width & Height
    const minWidth = this.editor.dom.getStyle(element, "min-width", true) || "";
    const maxWidth = this.editor.dom.getStyle(element, "max-width", true) || "";
    const minHeight =
      this.editor.dom.getStyle(element, "min-height", true) || "";
    const maxHeight =
      this.editor.dom.getStyle(element, "max-height", true) || "";

    sizeContainer.appendChild(document.createElement("hr"));
    sizeContainer.appendChild(
      this.createNumberWithUnitInput("min-width", "Min Width", minWidth)
    );
    sizeContainer.appendChild(
      this.createNumberWithUnitInput("max-width", "Max Width", maxWidth)
    );
    sizeContainer.appendChild(
      this.createNumberWithUnitInput("min-height", "Min Height", minHeight)
    );
    sizeContainer.appendChild(
      this.createNumberWithUnitInput("max-height", "Max Height", maxHeight)
    );

    // Display & Position
    const display = this.editor.dom.getStyle(element, "display", true) || "";
    const position =
      this.editor.dom.getStyle(element, "position", true) || "static";

    sizeContainer.appendChild(document.createElement("hr"));
    sizeContainer.appendChild(
      this.createSelectInput(
        "display",
        "Display",
        [
          { value: "", label: "Inherit" },
          { value: "block", label: "Block" },
          { value: "inline", label: "Inline" },
          { value: "inline-block", label: "Inline Block" },
          { value: "flex", label: "Flex" },
          { value: "inline-flex", label: "Inline Flex" },
          { value: "grid", label: "Grid" },
          { value: "none", label: "None" },
        ],
        display
      )
    );

    sizeContainer.appendChild(
      this.createSelectInput(
        "position",
        "Position",
        [
          { value: "static", label: "Static" },
          { value: "relative", label: "Relative" },
          { value: "absolute", label: "Absolute" },
          { value: "fixed", label: "Fixed" },
          { value: "sticky", label: "Sticky" },
        ],
        position
      )
    );

    // Position values (only show if position is not static)
    if (position && position !== "static") {
      const top = this.editor.dom.getStyle(element, "top", true) || "";
      const right = this.editor.dom.getStyle(element, "right", true) || "";
      const bottom = this.editor.dom.getStyle(element, "bottom", true) || "";
      const left = this.editor.dom.getStyle(element, "left", true) || "";
      const zIndex = this.editor.dom.getStyle(element, "z-index", true) || "";

      sizeContainer.appendChild(document.createElement("hr"));
      sizeContainer.appendChild(
        this.createNumberWithUnitInput("top", "Top", top)
      );
      sizeContainer.appendChild(
        this.createNumberWithUnitInput("right", "Right", right)
      );
      sizeContainer.appendChild(
        this.createNumberWithUnitInput("bottom", "Bottom", bottom)
      );
      sizeContainer.appendChild(
        this.createNumberWithUnitInput("left", "Left", left)
      );
      sizeContainer.appendChild(
        this.createNumberWithUnitInput("z-index", "Z-Index", zIndex)
      );
    }

    sizeGroup.appendChild(sizeContainer);
    container.appendChild(sizeGroup);

    // Flex & Grid Group (only show if display is flex or grid)
    const displayType =
      this.editor.dom.getStyle(element, "display", true) || "";
    if (displayType.includes("flex") || displayType.includes("grid")) {
      const layoutGroup = document.createElement("div");
      layoutGroup.className = "property-group";
      layoutGroup.innerHTML = `<h4>${
        displayType.includes("flex") ? "Flex" : "Grid"
      } Layout</h4>`;

      const layoutContainer = document.createElement("div");
      layoutContainer.className = "property-fields";

      if (displayType.includes("flex")) {
        // Flex Direction
        const flexDirection =
          this.editor.dom.getStyle(element, "flex-direction", true) || "row";
        layoutContainer.appendChild(
          this.createSelectInput(
            "flex-direction",
            "Direction",
            [
              { value: "row", label: "Row" },
              { value: "row-reverse", label: "Row Reverse" },
              { value: "column", label: "Column" },
              { value: "column-reverse", label: "Column Reverse" },
            ],
            flexDirection
          )
        );

        // Justify Content
        const justifyContent =
          this.editor.dom.getStyle(element, "justify-content", true) ||
          "flex-start";
        layoutContainer.appendChild(
          this.createSelectInput(
            "justify-content",
            "Justify Content",
            [
              { value: "flex-start", label: "Flex Start" },
              { value: "flex-end", label: "Flex End" },
              { value: "center", label: "Center" },
              { value: "space-between", label: "Space Between" },
              { value: "space-around", label: "Space Around" },
              { value: "space-evenly", label: "Space Evenly" },
            ],
            justifyContent
          )
        );

        // Align Items
        const alignItems =
          this.editor.dom.getStyle(element, "align-items", true) || "stretch";
        layoutContainer.appendChild(
          this.createSelectInput(
            "align-items",
            "Align Items",
            [
              { value: "flex-start", label: "Flex Start" },
              { value: "flex-end", label: "Flex End" },
              { value: "center", label: "Center" },
              { value: "baseline", label: "Baseline" },
              { value: "stretch", label: "Stretch" },
            ],
            alignItems
          )
        );

        // Flex Wrap
        const flexWrap =
          this.editor.dom.getStyle(element, "flex-wrap", true) || "nowrap";
        layoutContainer.appendChild(
          this.createSelectInput(
            "flex-wrap",
            "Flex Wrap",
            [
              { value: "nowrap", label: "No Wrap" },
              { value: "wrap", label: "Wrap" },
              { value: "wrap-reverse", label: "Wrap Reverse" },
            ],
            flexWrap
          )
        );
      } else if (displayType.includes("grid")) {
        // Grid Template Columns
        const gridTemplateColumns =
          this.editor.dom.getStyle(element, "grid-template-columns", true) ||
          "";
        layoutContainer.appendChild(
          this.createNumberWithUnitInput(
            "grid-template-columns",
            "Columns",
            gridTemplateColumns
          )
        );

        // Grid Template Rows
        const gridTemplateRows =
          this.editor.dom.getStyle(element, "grid-template-rows", true) || "";
        layoutContainer.appendChild(
          this.createNumberWithUnitInput(
            "grid-template-rows",
            "Rows",
            gridTemplateRows
          )
        );

        // Grid Gap
        const gridGap = this.editor.dom.getStyle(element, "gap", true) || "";
        layoutContainer.appendChild(
          this.createNumberWithUnitInput("gap", "Gap", gridGap)
        );
      }

      layoutGroup.appendChild(layoutContainer);
      container.appendChild(layoutGroup);
    }
  }

  /**
   * Set up event listeners for property changes
   * @param {Component} component - The component to set up listeners for
   * @private
   */
  setupPropertyChangeListeners(component) {
    if (!component || !component.properties) return;

    // Set up change listeners for each property input
    Object.keys(component.properties).forEach((propName) => {
      const input = this.propertiesPanel.querySelector(`[name="${propName}"]`);
      if (!input) return;

      // Remove any existing listeners to avoid duplicates
      const newInput = input.cloneNode(true);
      input.parentNode.replaceChild(newInput, input);

      // Add change event listener
      newInput.addEventListener("change", (e) => {
        if (!this.selectedElement) return;

        const propDef = component.properties[propName];
        let value;

        // Handle different input types
        if (e.target.type === "checkbox") {
          value = e.target.checked;
        } else if (e.target.type === "number") {
          value = parseFloat(e.target.value) || 0;
        } else if (e.target.type === "color") {
          value = e.target.value;
        } else {
          value = e.target.value;
        }

        // Save the property to the element's data attributes
        this._savePropertyToElement(this.selectedElement, propName, value);

        // Call the component's onUpdate method if it exists
        if (typeof component.onUpdate === "function") {
          const currentProps = this._getPropertiesFromElement(
            this.selectedElement,
            component.properties
          );
          component.onUpdate(this.editor, this.selectedElement, currentProps);
        }

        // Notify the editor that content has changed
        this.editor.fire("change");
      });
    });
  }

  /**
   * Get HTML from editor and remove component-related attributes
   * @returns {string} The filtered HTML
   */
  getFilteredHtml() {
    // Get the editor's HTML content
    const html = this.editor.getContent();

    // Create a temporary element to parse the HTML
    const temp = document.createElement("div");
    temp.innerHTML = html;

    // Find all elements with component attributes
    const elements = temp.querySelectorAll(
      "[data-component], [data-instance-id], [data-prop-*], [draggable]"
    );

    // Remove component-related attributes from each element
    elements.forEach((element) => {
      // Remove component ID and instance ID
      element.removeAttribute("data-component");
      element.removeAttribute("data-instance-id");
      element.removeAttribute("draggable");

      // Remove all data-prop-* attributes
      const attributes = Array.from(element.attributes);
      attributes.forEach((attr) => {
        if (attr.name.startsWith("data-prop-")) {
          element.removeAttribute(attr.name);
        }
      });
    });

    // Return the cleaned HTML
    return temp.innerHTML;
  }

  /**
   * Create a property field based on its type
   * @param {Object} prop - The property definition
   * @param {Component} component - The component
   * @returns {HTMLElement|null} The created field element or null
   * @private
   */
  createPropertyField(prop, component) {
    if (!prop || !component || !this.selectedElement) return null;

    const field = document.createElement("div");
    field.className = "property-field";

    // Get the current value from data attributes or use the default
    const dataAttr = `data-prop-${prop.name}`;
    let currentValue = this.selectedElement.getAttribute(dataAttr);

    // If not set in data attributes, use the default value
    if (currentValue === null || currentValue === undefined) {
      currentValue = prop.default ?? "";
    }

    if (typeof prop.beforeInit === "function") {
      prop = prop.beforeInit(this.selectedElement, prop);
    }

    // Create different input types based on the property type
    switch (prop.type) {
      case "select":
        field.innerHTML = `
          <label>${prop.label || prop.name}</label>
          <select data-property="${prop.name}">
            ${(prop.options || [])
              .map(
                (option) =>
                  `<option value="${option.value}" ${
                    option.value === currentValue ? "selected" : ""
                  }>
                ${option.label || option.value}
              </option>`
              )
              .join("")}
          </select>
        `;

        field.querySelector("select").addEventListener("change", (e) => {
          const newValue = e.target.value;
          const propName = prop.name;

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Force a re-render of the properties panel to reflect changes
          this.updatePropertiesPanel();

          // Notify the editor that the content has changed
          this.editor.nodeChanged();
        });
        break;

      case "text":
      case "number":
        const input = document.createElement("input");
        input.type = prop.type;
        input.value = currentValue || "";
        field.appendChild(document.createElement("label")).textContent =
          prop.label || prop.name;
        field.appendChild(input);

        input.addEventListener("change", (e) => {
          let newValue;
          const propName = prop.name;

          // Convert the value based on the input type
          if (prop.type === "number") {
            newValue = parseFloat(e.target.value);
            if (isNaN(newValue)) return; // Don't update if not a valid number
          } else {
            newValue = e.target.value;
          }

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Force a re-render of the properties panel to reflect changes
          this.updatePropertiesPanel();

          // Notify the editor that the content has changed
          this.editor.nodeChanged();
        });
        break;

      case "color":
        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = currentValue || "#000000";
        field.appendChild(document.createElement("label")).textContent =
          prop.label || prop.name;
        field.appendChild(colorInput);

        colorInput.addEventListener("change", (e) => {
          const newValue = e.target.value;
          const propName = prop.name;

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Notify the editor that the content has changed
          this.editor.nodeChanged();

          // Force a re-render of the properties panel
          this.updatePropertiesPanel();
        });
        break;
      case "checkbox":
        const labelContainer = document.createElement("label");
        labelContainer.className = "checkbox";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = currentValue || false;
        labelContainer.appendChild(checkbox);
        labelContainer.appendChild(
          document.createTextNode(prop.label || prop.name)
        );
        field.appendChild(labelContainer);

        checkbox.addEventListener("change", (e) => {
          const newValue = e.target.checked;
          const propName = prop.name;

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Notify the editor that the content has changed
          this.editor.nodeChanged();

          // Force a re-render of the properties panel
          this.updatePropertiesPanel();
        });
        break;

      case "textarea":
        field.innerHTML = `
          <label>${prop.label || prop.name}</label>
          <textarea data-property="${prop.name}">${
          currentValue || ""
        }</textarea>
        `;

        field.querySelector("textarea").addEventListener("change", (e) => {
          const newValue = e.target.value;
          const propName = prop.name;

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Notify the editor that the content has changed
          this.editor.nodeChanged();

          // Force a re-render of the properties panel
          this.updatePropertiesPanel();
        });
        break;

      case "button":
        field.innerHTML = `
          <button data-property="${prop.name}">${prop.label || prop.name}</button>
        `;

        field.querySelector("button").addEventListener("click", (e) => {
          const propName = prop.name;

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, null, this.selectedElement, prop);
          }

          // Notify the editor that the content has changed
          this.editor.nodeChanged();

          // Force a re-render of the properties panel
          this.updatePropertiesPanel();
        });
        break;

      case "hidden":
        field.innerHTML = `
          <input type="hidden" data-property="${prop.name}" value="${currentValue || ""}">
        `;

        field.querySelector("input").addEventListener("change", (e) => {
          const newValue = e.target.value;
          const propName = prop.name;

          // Save the property to the element's data attribute
          this._savePropertyToElement(this.selectedElement, propName, newValue);

          // Call onUpdate if defined to handle any custom update logic
          if (typeof component.onUpdate === "function") {
            component.onUpdate(propName, newValue, this.selectedElement, prop);
          }

          // Notify the editor that the content has changed
          this.editor.nodeChanged();

          // Force a re-render of the properties panel
          this.updatePropertiesPanel();
        });
        break;

      default:
        return null; // Unsupported type
    }

    return field;
  }
}

(function() {
  const _add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    this._listeners = this._listeners || {};
    this._listeners[type] = this._listeners[type] || [];
    this._listeners[type].push(listener);
    _add.call(this, type, listener, options);
  };
})();

function cm_essentials_init(componentsManager){
  componentsManager.register(
    new Component({
      id: "layers-container",
      name: "Layers",
      icon: "",
      category: "Layout",
      editorStyle: `
        .cm-layers-container {
          position: relative;
          min-height: 100px;
          height: 200px;
          min-width: 200px;
          box-sizing: border-box;
          border: 1px dashed #ccc;
          outline: 2px solid transparent;
          transition: outline 0.2s ease;
          padding: 10px;
          user-select: none;
          resize: both;
          overflow: auto;
        }
        
        /* Prevent drag operations on the resize handle */
        .cm-layers-container::-webkit-resizer {
          background: transparent;
        }
        
        .cm-layers-container:not(:focus):hover {
          outline: 2px solid #0d6efd;
          outline-offset: 2px;
        }
        
        .cm-layers-container:focus {
          outline: 2px solid #0d6efd;
          outline-offset: 2px;
        }
        
        .cm-layers-container.cm-selected {
          outline: 2px solid #0d6efd !important;
          outline-offset: 2px;
        }
  
        .cm-layers-content {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 50px;
          box-sizing: border-box;
          pointer-events: none;
          user-select: none;
          overflow: hidden;
        }
        
        .cm-layers-content > * {
          user-select: none;
        }
  
        .cm-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          transition: all 0.2s ease-in-out;
          box-sizing: border-box;
          border: 1px solid transparent;
          background-color: rgba(255, 255, 255, 0.1);
        }
      
        .cm-layer.cm-active {
          border: 1px solid #0d6efd;
          pointer-events: auto;
        }
        
        .cm-layer.cm-inactive {
          pointer-events: none;
          opacity: 0.3;
        }
      `,
      content: (props) => {
        const containerId = `layers-${Math.random().toString(36).substr(2, 9)}`;
        return `
          <div id="${containerId}" class="cm-layers-container" contenteditable="false">
            <div class="cm-layers-content" draggable="false" contenteditable="false" style="position: relative;">
              <!-- Layers will be rendered here -->
            </div>

          </div>
        `;
      },
      properties: {
        addLayer: {
          type: 'button',
          label: 'Add New Layer',
        },
        removeLayer: {
          type: 'button',
          label: 'Remove Current Layer',
        },
        layerUp: {
          type: 'button',
          label: 'Move Layer Up',
        },
        layerDown: {
          type: 'button',
          label: 'Move Layer Down',
        },
        activeLayer: {
          type: 'select',
          label: 'Active Layer',
          options: [],
          default: '',
          beforeInit: function(element, prop) {
            prop.options = [];
  
            element.querySelectorAll('.cm-layers-content > .cm-layer').forEach((layer) => {
              prop.options.push({
                value: layer.style.zIndex,
                label: `Layer ${layer.style.zIndex}`
              });
            });
  
            return prop;
          }
        },
      },
      onUpdate: function(propName, newValue, element, prop) {
        if(propName == 'addLayer'){
          const ev = new CustomEvent('add_layer');
          element.dispatchEvent(ev);
        } else if(propName == 'removeLayer'){
          const ev = new CustomEvent('remove_layer');
          element.dispatchEvent(ev);
        } else if(propName == 'activeLayer'){
          if (!isNaN(newValue)) {
            const ev = new CustomEvent('set_active_layer_index', { detail: { index: newValue } });
            element.dispatchEvent(ev);
          }
        } else if(propName == 'layerUp'){
          const ev = new CustomEvent('move_layer', { detail: { direction: 'up' } });
          element.dispatchEvent(ev);
        } else if(propName == 'layerDown'){
          const ev = new CustomEvent('move_layer', { detail: { direction: 'down' } });
          element.dispatchEvent(ev);
        }
      },
      onInsert: function(editor, element, component) {
        // Make the container focusable
        element.setAttribute('tabindex', '0');

        const {addLayer, layers, activeLayerIndex} = component.onFocus(editor, element, component);
  
        // Initialize with one layer if empty
        if (Object.keys(layers).length === 0) {
          addLayer();
          addLayer();
        }
        
        // Update the properties panel when layers change
        const updateLayerProperties = () => {
          if (element.updateProperty) {
            const options = Object.keys(layers).map(zIndex => ({
              value: zIndex,
              label: `Layer ${zIndex}`
            }));
            
            element.updateProperty('activeLayer', {
              options,
              value: activeLayerIndex
            });
          }
        };
        
        // Initial properties update
        updateLayerProperties();
      },
      onFocus: function(editor, element, component){
        if(element._listeners?.add_layer?.length > 0){
          return;
        }

        const layersContent = element.querySelector('.cm-layers-content');
        let layers = {};
        let activeLayerIndex = -1;

        layersContent.querySelectorAll('.cm-layer').forEach((layer) => {
          layers[layer.style.zIndex] = layer;
          if(layer.classList.contains('cm-active')){
            activeLayerIndex = layer.style.zIndex;
          }
        });

        function makeCurrentLayerActive() {
          Object.values(layers).forEach((layer) => {
            layer.classList.remove('cm-active');
            layer.classList.add('cm-inactive');
          });
          
          if (layers[activeLayerIndex]) {
            layers[activeLayerIndex].classList.remove('cm-inactive');
            layers[activeLayerIndex].classList.add('cm-active');
            element.setAttribute('data-prop-activelayer', activeLayerIndex);
          }
        }
        
        function addLayer() {
          let zIndex = 1;
          while(layers[zIndex]) zIndex++;
          
          const layerEl = document.createElement('div');
          layerEl.className = 'cm-layer cm-inactive';
          layerEl.style.zIndex = zIndex;
          layerEl.style.top = '0';
          layerEl.style.left = '0';
          layerEl.style.width = '100%';
          layerEl.style.height = '100%';
          layerEl.style.position = 'absolute';
          layerEl.setAttribute('draggable', 'false');
          layerEl.setAttribute('contenteditable', 'true')
          layerEl.setAttribute('data-layer-index', zIndex);
          
          layerEl.innerHTML = '<p>Layer ' + zIndex + '</p>'
          
          layers[zIndex] = layerEl;
          layersContent.appendChild(layerEl);
          
          // Set the new layer as active
          activeLayerIndex = zIndex;
          makeCurrentLayerActive();
          
          return layerEl;
        }
  
        function removeLayer() {
          if (activeLayerIndex === -1) return;
          
          // Store the current active index before removal
          const currentIndex = activeLayerIndex;
          
          // Remove the current layer
          const layer = layers[activeLayerIndex];
          delete layers[activeLayerIndex];
          layer.remove();
  
          if (layers.length === 0) {
            activeLayerIndex = -1;
          } else {
            activeLayerIndex = null;
  
            for(var zIndex in layers){
              if(zIndex < currentIndex){
                activeLayerIndex = zIndex;
                break;
              }
            }
  
            if(activeLayerIndex == null){
              for(var zIndex in layers){
                if(zIndex > currentIndex){
                  activeLayerIndex = zIndex;
                  break;
                }
              }
            }
  
            if(activeLayerIndex == null){
              activeLayerIndex = -1;
            }
          }
          
          makeCurrentLayerActive()
        }
  
        function moveLayer(direction) {
          if (activeLayerIndex === -1) return;
          
          var prevLayerData = null;
          var currLayerData = null;
          var nextLayerData = null;
          var nextFlag = 0;
  
          for(zIndex in layers){
            if(zIndex == activeLayerIndex){
              currLayerData = {
                index: zIndex,
                element: layers[zIndex]
              };
  
              nextFlag = 1;
            } else if(nextFlag == 1){
              nextLayerData = {
                index: zIndex,
                element: layers[zIndex]
              };
            } else {
              prevLayerData = {
                index: zIndex,
                element: layers[zIndex]
              };
            }
            
            if(currLayerData){
              if(direction == 'up'){
                if(nextFlag == 1){
                  if(!nextLayerData){ return; }
                  layers[currLayerData.index] = nextLayerData.element;
                  layers[nextLayerData.index] = currLayerData.element;  
                  layers[currLayerData.index].style.zIndex = nextLayerData.index;
                  layers[nextLayerData.index].style.zIndex = currLayerData.index;
                  break;
                }
              } else {
                if(!prevLayerData){ return; }
                layers[currLayerData.index] = prevLayerData.element;
                layers[prevLayerData.index] = currLayerData.element;  
                layers[currLayerData.index].style.zIndex = prevLayerData.index;
                layers[prevLayerData.index].style.zIndex = currLayerData.index;
              }
            }
          }
        }

        function setActiveLayerIndex(index) {
          if(layers[index]){
            activeLayerIndex = index;
            makeCurrentLayerActive();
          }
        }

        // Expose methods to the element for property panel to use
        element.addEventListener('add_layer', addLayer);
        element.addEventListener('remove_layer', removeLayer);
        element.addEventListener('move_layer', moveLayer);
        element.addEventListener('set_active_layer_index', (e) => {
          setActiveLayerIndex(e.detail.index);
        });

        let isResizing = false;
        
        // Prevent drag operations during resize
        element.addEventListener('mousedown', function(e) {
          // Check if the click is on the resize handle (bottom-right 20x20px area)
          const rect = element.getBoundingClientRect();
          const isResizeHandle = 
            e.clientX > rect.right - 40 && 
            e.clientY > rect.bottom - 40;
            
          if (isResizeHandle) {
            isResizing = true;
            e.stopPropagation();
            return false;
          }

          return true;
        });
        
        // Prevent drag operations during resize
        element.addEventListener('dragstart', function(e) {
          if (isResizing) {
            e.preventDefault();
            return false;
          }
        });

        // Reset resize flag when mouse is released
        editor.getDoc().addEventListener('mouseup', function() {
          isResizing = false;
        });

        return {
          addLayer,
          removeLayer,
          moveLayer,
          setActiveLayerIndex,
          layers,
          activeLayerIndex
        };
      },
    })
  );
}

// Export for CommonJS and browser environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ComponentsManager, cm_essentials_init };
} else if (typeof window !== "undefined") {
  window.ComponentsManager = ComponentsManager;
  window.cm_essentials_init = cm_essentials_init;
}
