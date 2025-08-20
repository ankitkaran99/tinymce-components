# Component System Documentation

This documentation explains how to create and manage components within the TinyMCE editor using the component system.

## Table of Contents
- [Creating a Component](#creating-a-component)
- [Component Manager Initialization](#component-manager-initialization)
- [Adding Components](#adding-components)
- [Best Practices](#best-practices)

## Creating a Component

Components are created using the `Component` class constructor. Here's a comprehensive guide to all component properties and lifecycle methods:

```javascript
const myComponent = new Component({
  // Core Properties
  id: "unique-id",                    // Required: Unique identifier for the component
  name: "Component Name",             // Required: Display name shown in the UI
  icon: "",                           // Optional: HTML string for component icon
  category: "General",                // Optional: Category for organization
  
  // Content Generation
  content: (props) => {               // Required: Function that returns HTML content
    return `<div>Component Content</div>`;
  },
  
  // Custom Properties
  properties: {                       // Optional: Custom properties for the component
    // Property definitions go here
  },
  
  // Component Behavior
  allowed: [],                        // Array of component IDs that can be placed inside this component
  children: {},                       // Child components configuration
  editorStyle: "",                    // CSS styles for the component
  restriction: () => true,           // Function to control where component can be dropped
  
  // Lifecycle Methods
  onInsert: (editor, element, props) => {
    // Called when component is inserted
    // Parameters:
    // - editor: TinyMCE editor instance
    // - element: The DOM element of the component
    // - props: Current properties of the component
  },
  
  onUpdate: (editor, element, props) => {
    // Called when component properties are updated
    // Parameters:
    // - editor: TinyMCE editor instance
    // - element: The DOM element of the component
    // - props: Updated properties of the component
  },
  
  onRemove: (editor, element) => {
    // Called before component is removed
    // Parameters:
    // - editor: TinyMCE editor instance
    // - element: The DOM element of the component
  }
});
```

### Core Properties

1. **id** (Required)
   - Unique identifier for the component
   - Must be a string
   - Must be unique across all components

2. **name** (Required)
   - Display name shown in the UI
   - Used in the components panel
   - Should be descriptive and user-friendly

3. **icon** (Optional)
   - HTML string for component icon
   - Can be any valid HTML content
   - Used in the components panel

4. **category** (Optional)
   - Category for organization
   - Components are grouped by category in the UI
   - Defaults to "General" if not specified

### Content Generation

The `content` property is a function that generates the HTML content for the component. It receives the current properties as its parameter.

### Custom Properties

Components can have custom properties that can be edited through the properties panel. These properties can be of different types:

1. Text Properties
```javascript
properties: {
  textContent: {
    type: "text",
    label: "Text Content",
    default: "Default text"
  }
}
```

2. Select Properties
```javascript
properties: {
  color: {
    type: "select",
    label: "Color",
    options: [
      { value: "primary", label: "Primary" },
      { value: "secondary", label: "Secondary" }
    ],
    default: "primary"
  }
}
```

3. Number Properties
```javascript
properties: {
  size: {
    type: "number",
    label: "Size",
    default: 10,
    min: 0,
    max: 100
  }
}
```

4. Checkbox Properties
```javascript
properties: {
  isActive: {
    type: "checkbox",
    label: "Active",
    default: false
  }
}
```

### Component Behavior

1. **allowed**
   - Array of component IDs that can be placed inside this component
   - Empty array (`[]`) means no components can be placed inside
   - `null` means any component can be placed inside
   - Example: `allowed: ["button", "text", "image"]`

2. **children**
   - Configuration for child components
   - Can be an object: `{ "id": "button", "count": 3 }`
   - Or an array of component IDs: `["button", "text"]`

3. **editorStyle**
   - CSS styles that will be injected into the TinyMCE editor iframe
   - Used to style components consistently across the editor
   - Styles are automatically injected when the component is registered
   - Example:
   ```javascript
   editorStyle: `.my-component {
     padding: 10px;
     border: 1px solid #ccc;
     background-color: #fff;
   }`
   ```

4. **restriction**
   - Function that controls where the component can be dropped
   - Receives two parameters:
     - `target`: The DOM element being dropped onto
     - `component`: The component being dropped
   - Should return `true` if drop is allowed, `false` otherwise
   - Example:
   ```javascript
   restriction: (target, component) => {
     return target.classList.contains('allowed-container');
   }
   ```

### Lifecycle Methods

1. **onInsert**
   - Called when component is inserted into the editor
   - Parameters:
     - `editor`: TinyMCE editor instance
     - `element`: The DOM element of the component
     - `props`: Current properties of the component
   - Example:
   ```javascript
   onInsert: (editor, element, props) => {
     // Initialize component behavior
     // Add event listeners
     // Set up dynamic content
   }
   ```

2. **onUpdate**
   - Called when component properties are updated
   - Parameters:
     - `editor`: TinyMCE editor instance
     - `element`: The DOM element of the component
     - `props`: Updated properties of the component
   - Example:
   ```javascript
   onUpdate: (editor, element, props) => {
     // Update component based on new properties
     element.textContent = props.textContent;
     element.className = `component-${props.color}`;
   }
   ```

3. **onRemove**
   - Called before component is removed from the editor
   - Parameters:
     - `editor`: TinyMCE editor instance
     - `element`: The DOM element of the component
   - Example:
   ```javascript
   onRemove: (editor, element) => {
     // Clean up any event listeners
     // Remove any initialized components
     // Perform cleanup tasks
   }
   ```

## Component Manager Initialization

To initialize the component manager with TinyMCE, you need to set it up inside TinyMCE's `init` event. Here's how to do it:

```javascript
document.addEventListener("DOMContentLoaded", () => {
  const editor = tinymce.init({
    selector: "#editor",
    plugins: 'advlist autolink lists link image charmap preview anchor',
    toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
    height: '100%',
    content_css: [
      'https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css',
    ],
    // Allow all elements and attributes
    valid_elements: '*[*]',
    // Allow any child elements in these containers
    valid_children: '+body[style],+div[div|ul|ol|li],+ul[li],+ol[li],+li[div|ul|ol|li]',
    // Explicitly allow all data attributes
    extended_valid_elements: '*[*]',
    // Configure TinyMCE to preserve our component attributes
    valid_attributes: 'id,class,style,data-*',
    // Disable cleanup to prevent attribute removal
    verify_html: false,
    cleanup: false,
    cleanup_on_startup: false,
    trim_span_elements: false,
    // Preserve data attributes on paste and other operations
    paste_data_images: false,
    paste_webkit_styles: 'all',
    paste_merge_formats: true,
    paste_auto_cleanup_on_paste: false,
    paste_remove_styles: false,
    paste_remove_styles_if_webkit: false,
    paste_strip_class_attributes: 'none',
    setup: function(editor) {
      editor.on('init', function(e) {
        // Add Bootstrap JS to the iframe
        const iframe = e.target.contentAreaContainer.querySelector('iframe');
        const iframeDoc = iframe.contentDocument;
        const script = iframeDoc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/js/bootstrap.bundle.min.js';
        iframeDoc.head.appendChild(script);
        
        // Initialize the component manager
        const componentsManager = new ComponentsManager({
          editor: tinymce.get('editor')
        });

        // Add some default styles
        componentsManager.addStyle('primary-button', {
          'background-color': '#007bff',
          'color': '#ffffff',
          'border': '1px solid #0056b3',
          'padding': '0.5rem 1rem',
          'border-radius': '0.25rem',
          'cursor': 'pointer',
          'font-weight': 'bold',
          'transition': 'background-color 0.2s'
        });
        
        // Register your components here
        // Example: bs5_components_init(componentsManager);
      });
    }
  });
});
```

## Managing Styles

The ComponentsManager includes powerful style management features that allow you to define and apply custom styles to any HTML element in the editor.

### Adding Custom Styles

Define and register custom styles that can be applied to elements:

```javascript
// Add a custom style
componentsManager.addStyle('primary-button', {
  'background-color': '#007bff',
  'color': '#ffffff',
  'border': '1px solid #0056b3',
  'padding': '0.5rem 1rem',
  'border-radius': '0.25rem',
  'cursor': 'pointer',
  'font-weight': 'bold'
});
```

### Style Properties

When adding a style, you can specify any valid CSS properties. The most commonly used properties include:

- `background-color`: Background color (supports hex, rgb, rgba, named colors)
- `color`: Text color
- `border`: Border style (e.g., '1px solid #ccc')
- `padding`: Inner spacing
- `margin`: Outer spacing
- `font-family`: Font family
- `font-size`: Text size
- `font-weight`: Text weight (e.g., 'bold', 'normal')
- `text-align`: Text alignment
- `border-radius`: Rounded corners
- `box-shadow`: Shadow effects

### Applying Styles

Styles can be applied to any selected element in the editor through the properties panel. The styles dropdown will appear for all HTML elements and will show all registered styles.

### Removing Styles

To remove all inline styles from an element, select the element and choose "Remove Style" from the styles dropdown in the properties panel.

### Getting All Registered Styles

```javascript
// Get all registered styles
const allStyles = componentsManager.getStyles();
console.log(allStyles); // Returns a Map of style names to style objects
```

### Example: Common UI Styles

Here are some common style presets you might want to define:

```javascript
// Primary button
componentsManager.addStyle('primary-button', {
  'background-color': '#007bff',
  'color': '#ffffff',
  'border': '1px solid #0056b3',
  'padding': '0.5rem 1rem',
  'border-radius': '0.25rem',
  'cursor': 'pointer',
  'font-weight': 'bold',
  'transition': 'background-color 0.2s'
});

// Secondary button
componentsManager.addStyle('secondary-button', {
  'background-color': '#6c757d',
  'color': '#ffffff',
  'border': '1px solid #5a6268',
  'padding': '0.5rem 1rem',
  'border-radius': '0.25rem',
  'cursor': 'pointer'
});

// Card style
componentsManager.addStyle('card', {
  'background-color': '#ffffff',
  'border': '1px solid rgba(0,0,0,.125)',
  'border-radius': '0.25rem',
  'box-shadow': '0 0.125rem 0.25rem rgba(0,0,0,.075)',
  'padding': '1.25rem',
  'margin-bottom': '1rem'
});
```

### Best Practices for Styles

1. **Use Semantic Names**: Name your styles based on their purpose rather than their appearance (e.g., 'call-to-action' instead of 'blue-button').
2. **Be Consistent**: Maintain consistent spacing, colors, and typography across your styles.
3. **Use Variables**: For colors and spacing, consider using CSS variables for easier maintenance.
4. **Mobile-First**: Design styles to work well on all screen sizes.
5. **Test Accessibility**: Ensure sufficient color contrast and readable text sizes.

## Adding Components

To add a component to the manager:

```javascript
// Create your component
const myComponent = new Component({...});

// Register it with the manager
componentsManager.register(myComponent);
```

## Best Practices

1. **Component IDs**
   - Always use unique IDs
   - Use descriptive IDs that reflect the component's purpose
   - Avoid special characters in IDs

2. **Categories**
   - Organize components into logical categories
   - Use consistent naming for categories
   - Consider user workflow when organizing categories

3. **Properties**
   - Provide default values for all properties
   - Use appropriate property types based on needs
   - Document property purposes in comments

4. **Lifecycle Methods**
   - Use `onInsert` for initialization
   - Use `onUpdate` for property updates
   - Use `onRemove` for cleanup
   - Avoid unnecessary DOM manipulation

5. **Restrictions**
   - Implement proper drop restrictions
   - Consider component hierarchy
   - Handle edge cases in restrictions

6. **Child Components**
   - Define clear relationships
   - Handle child component updates
   - Clean up child components properly

## Example Component

Here's a complete example of a button component:

```javascript
const buttonComponent = new Component({
  id: "button",
  name: "Button",
  category: "Basic",
  
  content: (props) => {
    return `
      <button class="btn ${props.style} ${props.size}">
        ${props.text}
      </button>
    `;
  },
  
  properties: {
    text: {
      type: "text",
      label: "Button Text",
      default: "Click me"
    },
    style: {
      type: "select",
      label: "Style",
      options: [
        { value: "btn-primary", label: "Primary" },
        { value: "btn-secondary", label: "Secondary" }
      ],
      default: "btn-primary"
    },
    size: {
      type: "select",
      label: "Size",
      options: [
        { value: "btn-sm", label: "Small" },
        { value: "", label: "Default" },
        { value: "btn-lg", label: "Large" }
      ],
      default: ""
    }
  },
  
  onUpdate: (editor, element, props) => {
    element.textContent = props.text;
    element.className = `btn ${props.style} ${props.size}`;
  }
});
```

## Error Handling

The component system includes error handling for:
- Invalid component registration
- Duplicate component IDs
- Invalid property types
- Invalid drop targets
- Property update failures

## Custom Styles

The component system includes a powerful style management system that allows you to define and apply custom styles to your components. This feature is particularly useful for maintaining consistent styling across your application.

### Adding Custom Styles

You can add custom styles to the properties panel using the `addStyle` method of the ComponentsManager instance. This makes the styles available for selection in the properties panel.

```javascript
// Example: Adding a custom style
componentsManager.addStyle('primary-button', {
  name: 'Primary Button',
  styles: {
    'background-color': '#007bff',
    'color': '#fff',
    'border': '1px solid #0056b3',
    'border-radius': '4px',
    'padding': '6px 12px',
    'font-weight': 'bold'
  }
});

// Adding a style with hover state
componentsManager.addStyle('primary-button-hover', {
  name: 'Primary Button (Hover)',
  styles: {
    'background-color': '#0056b3',
    'border-color': '#004085'
  },
  hover: true  // This style will be applied on hover
});
```

### Style Definition Properties

When defining a style, you can use the following properties:

- `name`: Display name for the style (shown in the UI)
- `styles`: Object containing CSS properties and values
- `hover`: Boolean indicating if this is a hover state style (optional)
- `media`: Media query for responsive styles (e.g., `'(max-width: 768px)'`)
- `selector`: Custom selector for the style (defaults to the component's selector)

### Applying Styles to Components

Styles can be applied to components in several ways:

1. **Programmatically**:
   ```javascript
   // Apply a style to an element
   componentsManager.applyStyle(element, 'primary-button');
   
   // Remove a style
   componentsManager.removeStyle(element, 'primary-button');
   ```

2. **Through the Properties Panel**:
   - Select a component
   - Open the properties panel
   - Choose from available styles in the styles dropdown

### Best Practices for Custom Styles

1. **Use Semantic Naming**: Choose names that describe the purpose of the style (e.g., 'primary-button' instead of 'blue-button')

2. **Leverage CSS Variables**: For better maintainability, define colors and other values as CSS variables
   ```css
   :root {
     --primary-color: #007bff;
     --primary-hover: #0056b3;
   }
   ```

3. **Responsive Design**: Use the `media` property to define styles for different screen sizes
   ```javascript
   componentsManager.addStyle('mobile-button', {
     name: 'Mobile Button',
     styles: {
       'width': '100%',
       'margin': '5px 0'
     },
     media: '(max-width: 768px)'
   });
   ```

4. **Component-Specific Styles**: You can define styles that only apply to specific components by using the `selector` property
   ```javascript
   componentsManager.addStyle('special-card', {
     name: 'Special Card',
     selector: '.card.special',  // Only applies to elements with both 'card' and 'special' classes
     styles: {
       'box-shadow': '0 4px 8px rgba(0,0,0,0.2)',
       'border-left': '4px solid #007bff'
     }
   });
   ```

5. **State Management**: Use the `hover` property to define hover states
   ```javascript
   componentsManager.addStyle('fancy-button', {
     name: 'Fancy Button',
     styles: {
       'transition': 'all 0.3s ease',
       'transform': 'scale(1)'
     }
   });
   
   componentsManager.addStyle('fancy-button-hover', {
     name: 'Fancy Button (Hover)',
     styles: {
       'transform': 'scale(1.05)'
     },
     hover: true
   });
   ```

## Performance Considerations

1. Use efficient DOM manipulation in lifecycle methods
2. Avoid unnecessary re-renders
3. Use proper cleanup in `onRemove`
4. Optimize property change listeners
5. Minimize style recalculations

## Browser Support

The component system supports modern browsers with:
- ES6+ features
- DOM manipulation
- Event handling
- CSS styling

## License

MIT License
