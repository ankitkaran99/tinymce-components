/**
 * Enhanced Component class with property management
 */
class Component {
  /**
   * Create a new Component
   * @param {Object} config - Component configuration
   * @param {string} config.id - Unique identifier
   * @param {string} config.name - Display name
   * @param {string} config.icon - HTML string for the icon
   * @param {Function} config.content - Function that returns HTML content
   * @param {string} config.category - Component category
   * @param {Function} [config.onInsert] - Called when component is inserted into DOM
   * @param {Function} [config.onUpdate] - Called when component properties are updated
   * @param {Function} [config.onRemove] - Called before component is removed
   * @param {Array<PropertyDefinition>} [config.properties=[]] - Component properties
   */
  constructor({
    id,
    name,
    icon,
    content,
    editorStyle,
    category,
    restriction,
    onInsert,
    onUpdate,
    onRemove,
    properties = {},
    children = {},
  }) {
    if (!id || !name || !content) {
      throw new Error("Component requires id, name, and content");
    }

    // Core properties
    this.id = id;
    this.name = name;
    this.icon = icon || "";
    this.content = content;
    this.editorStyle = editorStyle || "";
    this.category = category || "general";
    this.properties = properties || {};
    this.allowed = []; // allow child components inside parent
    this.children = children; // { "id": "button", "count": 3 }

    // Lifecycle methods
    this.restriction = restriction || (() => true); // Default restriction allows dropping anywhere
    this.onInsert = onInsert || (() => {});
    this.onUpdate = onUpdate || (() => {});
    this.onRemove = onRemove || (() => {});
  }
}

// Export for CommonJS and browser environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Component };
} else if (typeof window !== "undefined") {
  window.Component = Component;
}
