function bs5_components_init(componentsManager) {
  const components = [
    // Button Component
    new Component({
      id: "button",
      name: "Button",
      icon: "",
      category: "Basic",
      content: (props) => {
        let buttonAttrs = `class="btn ${props.btnStyle} ${props.btnSize} ${props.btnState}"`;       
        return `<button type="${props.btnType}" ${buttonAttrs}>Click me</button>`;
      },
      properties: {
        btnType: {
          type: "select",
          label: "Button Type",
          options: [
            { value: "button", label: "Button" },
            { value: "submit", label: "Submit" },
            { value: "reset", label: "Reset" }
          ],
          default: "button"
        },
        btnStyle: {
          type: "select",
          label: "Button Style",
          options: [
            { value: "btn-primary", label: "Primary" },
            { value: "btn-secondary", label: "Secondary" },
            { value: "btn-success", label: "Success" },
            { value: "btn-danger", label: "Danger" },
            { value: "btn-warning", label: "Warning" },
            { value: "btn-info", label: "Info" },
            { value: "btn-light", label: "Light" },
            { value: "btn-dark", label: "Dark" },
            { value: "btn-link", label: "Link" },
            { value: "btn-outline-primary", label: "Outline Primary" },
            { value: "btn-outline-secondary", label: "Outline Secondary" },
            { value: "btn-outline-success", label: "Outline Success" },
            { value: "btn-outline-danger", label: "Outline Danger" },
            { value: "btn-outline-warning", label: "Outline Warning" },
            { value: "btn-outline-info", label: "Outline Info" },
            { value: "btn-outline-light", label: "Outline Light" },
            { value: "btn-outline-dark", label: "Outline Dark" }
          ],
          default: "btn-primary"
        },
        btnSize: {
          type: "select",
          label: "Button Size",
          options: [
            { value: "", label: "Default" },
            { value: "btn-lg", label: "Large" },
            { value: "btn-sm", label: "Small" }
          ],
          default: ""
        },
        btnState: {
          type: "select",
          label: "Button State",
          options: [
            { value: "", label: "Normal" },
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" }
          ],
          default: ""
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "btnStyle") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => element.classList.remove(option));
          if (value) element.classList.add(value);
        } else if (propName === "btnSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          if (value) element.classList.add(value);
        } else if (propName === "btnState") {
          element.classList.remove("active", "disabled");
          if (value === "disabled") {
            element.disabled = true;
          } else if (value === "active") {
            element.classList.add("active");
            element.setAttribute("aria-pressed", "true");
          } else {
            element.disabled = false;
            element.removeAttribute("aria-pressed");
          }
        } else if (propName === "btnType") {
          element.type = value;
        }
      },
    }),
    // Button Groups Component
    new Component({
      id: "button-group",
      name: "Button Group",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div class="btn-group" role="group" data-component-children="default">
            <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "button",
          "count": 3
        }
      },
      allowed: {
        "default": "button"
      },
    }),
    // Alerts Component
    new Component({
      id: "alert",
      name: "Alert",
      icon: "⚠️",
      category: "Basic",
      content: (props) => {
        return `<div class="alert ${props.alertStyle}">This is a ${props.alertStyle} alert—check it out!</div>`;
      },
      properties: {
        alertStyle: {
          type: "select",
          label: "Alert Style",
          options: [
            { value: "alert-primary", label: "Primary" },
            { value: "alert-secondary", label: "Secondary" },
            { value: "alert-success", label: "Success" },
            { value: "alert-danger", label: "Danger" },
            { value: "alert-warning", label: "Warning" },
            { value: "alert-info", label: "Info" },
            { value: "alert-light", label: "Light" },
            { value: "alert-dark", label: "Dark" },
          ],
          default: "alert-primary",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "alertStyle") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => element.classList.remove(option));
          element.classList.add(value);
        }
      },
    }),
    // Badges Component
    new Component({
      id: "badge",
      name: "Badge",
      icon: "🔖",
      category: "Basic",
      content: (props) => {
        return `<span class="badge ${props.badgeStyle} ${props.badgeShape}">New</span>`;
      },
      properties: {
        badgeStyle: {
          type: "select",
          label: "Badge Style",
          options: [
            { value: "bg-primary", label: "Primary" },
            { value: "bg-secondary", label: "Secondary" },
            { value: "bg-success", label: "Success" },
            { value: "bg-danger", label: "Danger" },
            { value: "bg-warning", label: "Warning" },
            { value: "bg-info", label: "Info" },
            { value: "bg-light", label: "Light" },
            { value: "bg-dark", label: "Dark" },
          ],
          default: "bg-primary",
        },
        badgeShape: {
          type: "select",
          label: "Badge Shape",
          options: [
            { value: "rounded-pill", label: "Pill" },
            { value: "", label: "Default" },
          ],
          default: "",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "badgeStyle") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => element.classList.remove(option));
          element.classList.add(value);
        } else if (propName === "badgeShape") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) =>
            option ? element.classList.remove(option) : null
          );
          element.classList.add(value);
        }
      },
    }),
    // Card Component
    new Component({
      id: "card",
      name: "Card",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div class="card">
            <img src="..." class="card-img-top" alt="Alt Image">
            <div class="card-header" data-component-children="header">
                Card Header
            </div>
            <div class="card-body" data-component-children="body">
                This is some content in the card body.
            </div>
            <div class="card-footer" data-component-children="footer">
                Card Footer
            </div>
        </div>`;
      },
      children: {
        "header": {
          "id": "card-header",
          "count": 1
        },
        "body": {
          "id": "card-body",
          "count": 1
        },
        "footer": {
          "id": "card-footer",
          "count": 1
        }
      },
    }),
    // Dropdown Component
    new Component({
      id: "dropdown",
      name: "Dropdown",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div class="dropdown">
            <button class="btn ${props.btnStyle} ${props.btnSize} dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                Dropdown button
            </button>
            <div class="dropdown-menu" data-component-children="default">
              <!-- Children -->
            </div>
        </div>`;
      },
      allowed: {
        "default": "dropdown-item"
      },
      properties: {
        btnStyle: {
          type: "select",
          label: "Button Style",
          options: [
            { value: "btn-primary", label: "Primary" },
            { value: "btn-secondary", label: "Secondary" },
            { value: "btn-success", label: "Success" },
            { value: "btn-danger", label: "Danger" },
            { value: "btn-warning", label: "Warning" },
            { value: "btn-info", label: "Info" },
            { value: "btn-light", label: "Light" },
            { value: "btn-dark", label: "Dark" },
            { value: "btn-link", label: "Link" },
            { value: "btn-outline-primary", label: "Outline Primary" },
            { value: "btn-outline-secondary", label: "Outline Secondary" },
            { value: "btn-outline-success", label: "Outline Success" },
            { value: "btn-outline-danger", label: "Outline Danger" },
            { value: "btn-outline-warning", label: "Outline Warning" },
            { value: "btn-outline-info", label: "Outline Info" },
            { value: "btn-outline-light", label: "Outline Light" },
            { value: "btn-outline-dark", label: "Outline Dark" },
          ],
          default: "btn-primary",
        },
        btnSize: {
          type: "select",
          label: "Button Size",
          options: [
            { value: "", label: "Default" },
            { value: "btn-lg", label: "Large" },
            { value: "btn-sm", label: "Small" },
          ],
          default: "",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "btnStyle") {
          const button = element.querySelector("button");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => button.classList.remove(option));
          button.classList.add(value);
        } else if (propName === "btnSize") {
          const button = element.querySelector("button");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          button.classList.add(value);
        }
      },
    }),
    // Dropdown Item Component
    new Component({
      id: "dropdown-item",
      name: "Dropdown Item",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<a class="dropdown-item" href="#">Action</a>`;
      },
      restriction: (parent) => {
        return parent.classList.contains("dropdown-menu");
      }
    }),
    // List Group Component
    new Component({
      id: "list-group",
      name: "List Group",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<ul class="list-group" data-component-children="default">
          <!-- Children -->
        </ul>`;
      },
      children: {
        "default": {
          "id": "list-group-item",
          "count": 3
        }
      },
      allowed: {
        "default": "list-group-item"
      },
    }),
    // List Group Item Component
    new Component({
      id: "list-group-item",
      name: "List Group Item",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<li class="list-group-item ${props.listGroupItemStyle}">Item</li>`;
      },  
      properties: {
        listGroupItemStyle: {
          type: "select",
          label: "List Group Item Style",
          options: [
            { value: "", label: "Default" },
            { value: "list-group-item-action", label: "Action" },
            { value: "list-group-item-primary", label: "Primary" },
            { value: "list-group-item-secondary", label: "Secondary" },
            { value: "list-group-item-success", label: "Success" },
            { value: "list-group-item-danger", label: "Danger" },
            { value: "list-group-item-warning", label: "Warning" },
            { value: "list-group-item-info", label: "Info" },
            { value: "list-group-item-light", label: "Light" },
            { value: "list-group-item-dark", label: "Dark" },
          ],
          default: "",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "listGroupItemStyle") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        }
      },
      restriction: (parent) => {
        return parent.classList.contains("list-group");
      }
    }),
    // Modal Component
    new Component({
      id: "modal",
      name: "Modal",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div class="d-inline-block">
          <button type="button" class="btn ${props.btnStyle}" data-bs-toggle="modal" data-bs-target="#${props.id}">Launch demo modal</button>
          <div class="modal fade" id="${props.id}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog ${props.modalDialogSize}">
              <div class="modal-content">
                <div class="modal-header">
                  <h1 class="modal-title fs-5">Modal title</h1>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" data-component-children="body">
                  <!-- Children -->
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                  <button type="button" class="btn btn-primary">Save changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>`;
      },
      properties: {
        btnStyle: {
          type: "select",
          label: "Button Style",
          options: [
            { value: "btn-primary", label: "Primary" },
            { value: "btn-secondary", label: "Secondary" },
            { value: "btn-success", label: "Success" },
            { value: "btn-danger", label: "Danger" },
            { value: "btn-warning", label: "Warning" },
            { value: "btn-info", label: "Info" },
            { value: "btn-light", label: "Light" },
            { value: "btn-dark", label: "Dark" },
            { value: "btn-link", label: "Link" },
            { value: "btn-outline-primary", label: "Outline Primary" },
            { value: "btn-outline-secondary", label: "Outline Secondary" },
            { value: "btn-outline-success", label: "Outline Success" },
            { value: "btn-outline-danger", label: "Outline Danger" },
            { value: "btn-outline-warning", label: "Outline Warning" },
            { value: "btn-outline-info", label: "Outline Info" },
            { value: "btn-outline-light", label: "Outline Light" },
            { value: "btn-outline-dark", label: "Outline Dark" },
          ],
          default: "btn-primary",
        },
        modalDialogSize: {
          type: "select",
          label: "Modal Dialog Size",
          options: [
            { value: "", label: "Default" },
            { value: "modal-dialog-lg", label: "Large" },
            { value: "modal-dialog-sm", label: "Small" },
          ],
          default: "",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "modalDialogSize") {
          const modalDialog = element.querySelector("div.modal-dialog");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? modalDialog.classList.remove(option) : null);
          modalDialog.classList.add(value);
        } else if (propName === "btnStyle") {
          const button = element.querySelector("button");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? button.classList.remove(option) : null);
          button.classList.add(value);
        }
      },
      onInsert: function (editor, element) {
        const id = "modal" + Math.floor(Math.random() * 1000);
        element.querySelector("button").setAttribute("data-bs-target", "#" + id);
        element.querySelector("div.modal").id = id;
      },
    }),
    // Offcanvas Component
    new Component({
      id: "offcanvas",
      name: "Offcanvas",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div class="d-inline-block">
          <button type="button" class="btn ${props.btnStyle}" data-bs-toggle="offcanvas" data-bs-target="#${props.id}">Launch demo offcanvas</button>
          <div class="offcanvas ${props.offcanvasDirection}" id="${props.id}" tabindex="-1" aria-hidden="true">
            <div class="offcanvas-header">
              <h5 class="offcanvas-title">Offcanvas</h5>
              <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body" data-component-children="default">
              <!-- Children -->
            </div>
          </div>
        </div>`;
      },
      properties: {
        btnStyle: {
          type: "select",
          label: "Button Style",
          options: [
            { value: "btn-primary", label: "Primary" },
            { value: "btn-secondary", label: "Secondary" },
            { value: "btn-success", label: "Success" },
            { value: "btn-danger", label: "Danger" },
            { value: "btn-warning", label: "Warning" },
            { value: "btn-info", label: "Info" },
            { value: "btn-light", label: "Light" },
            { value: "btn-dark", label: "Dark" },
            { value: "btn-link", label: "Link" },
            { value: "btn-outline-primary", label: "Outline Primary" },
            { value: "btn-outline-secondary", label: "Outline Secondary" },
            { value: "btn-outline-success", label: "Outline Success" },
            { value: "btn-outline-danger", label: "Outline Danger" },
            { value: "btn-outline-warning", label: "Outline Warning" },
            { value: "btn-outline-info", label: "Outline Info" },
            { value: "btn-outline-light", label: "Outline Light" },
            { value: "btn-outline-dark", label: "Outline Dark" },
          ],
          default: "btn-primary",
        },
        offcanvasDirection: {
          type: "select",
          label: "Offcanvas Direction",
          options: [
            { value: "offcanvas-start", label: "Start" },
            { value: "offcanvas-end", label: "End" },
            { value: "offcanvas-top", label: "Top" },
            { value: "offcanvas-bottom", label: "Bottom" },
          ],
          default: "offcanvas-start",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "btnStyle") {
          const button = element.querySelector("button");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? button.classList.remove(option) : null);
          button.classList.add(value);
        } else if (propName === "offcanvasDirection") {
          const offcanvas = element.querySelector("div.offcanvas");
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? offcanvas.classList.remove(option) : null);
          offcanvas.classList.add(value);
        }
      },
      onInsert: function (editor, element) {
        const id = "offcanvas" + Math.floor(Math.random() * 1000);
        element.querySelector("button").setAttribute("data-bs-target", "#" + id);
        element.querySelector("div.offcanvas").setAttribute("id", id);
      },
    }),
    // Row Component
    new Component({
      id: "row",
      name: "Row",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          id: "col",
          count: 3
        }
      },
      allowed: {
        "default": "col"
      },
      editorStyle: `
        .row {
          border:1px dashed #ccc;
          min-height: 50px;
          padding-bottom: 10px;
        }
      `
    }),
    // Column Component
    new Component({
      id: "col",
      name: "Column",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="${props.colSize} ${props.colSmSize} ${props.colMdSize} ${props.colLgSize} ${props.colXlSize}" data-component-children="default">
          <p>Column</p>
        </div>`;
      },
      editorStyle: `
        .col-1, .col-2, .col-3, .col-4, .col-5, .col-6, .col-7, .col-8, .col-9, .col-10, .col-11, .col-12 {
          border:1px dashed #ccc;
          min-height: 40px;
        }

        .col-sm-1, .col-sm-2, .col-sm-3, .col-sm-4, .col-sm-5, .col-sm-6, .col-sm-7, .col-sm-8, .col-sm-9, .col-sm-10, .col-sm-11, .col-sm-12 {
          border:1px dashed #ccc;
          min-height: 40px;
        }

        .col-md-1, .col-md-2, .col-md-3, .col-md-4, .col-md-5, .col-md-6, .col-md-7, .col-md-8, .col-md-9, .col-md-10, .col-md-11, .col-md-12 {
          border:1px dashed #ccc;
          min-height: 40px;
        }

        .col-lg-1, .col-lg-2, .col-lg-3, .col-lg-4, .col-lg-5, .col-lg-6, .col-lg-7, .col-lg-8, .col-lg-9, .col-lg-10, .col-lg-11, .col-lg-12 {
          border:1px dashed #ccc;
          min-height: 40px;
        }

        .col-xl-1, .col-xl-2, .col-xl-3, .col-xl-4, .col-xl-5, .col-xl-6, .col-xl-7, .col-xl-8, .col-xl-9, .col-xl-10, .col-xl-11, .col-xl-12 {
          border:1px dashed #ccc;
          min-height: 40px;
        }
      `,
      properties: {
        colSize: {
          type: "select",
          label: "Column Size",
          options: [
            { value: "col-1", label: "1" },
            { value: "col-2", label: "2" },
            { value: "col-3", label: "3" },
            { value: "col-4", label: "4" },
            { value: "col-5", label: "5" },
            { value: "col-6", label: "6" },
            { value: "col-7", label: "7" },
            { value: "col-8", label: "8" },
            { value: "col-9", label: "9" },
            { value: "col-10", label: "10" },
            { value: "col-11", label: "11" },
            { value: "col-12", label: "12" },
          ],
          default: "col-4",
        },
        colSmSize: {
          type: "select",
          label: "Small Column Size",
          options: [
            { value: "", label: "None" },
            { value: "col-sm-1", label: "1" },
            { value: "col-sm-2", label: "2" },
            { value: "col-sm-3", label: "3" },
            { value: "col-sm-4", label: "4" },
            { value: "col-sm-5", label: "5" },
            { value: "col-sm-6", label: "6" },
            { value: "col-sm-7", label: "7" },
            { value: "col-sm-8", label: "8" },
            { value: "col-sm-9", label: "9" },
            { value: "col-sm-10", label: "10" },
            { value: "col-sm-11", label: "11" },
            { value: "col-sm-12", label: "12" },
          ],
          default: "col-sm-4",
        },
        colMdSize: {
          type: "select",
          label: "Medium Column Size",
          options: [
            { value: "", label: "None" },
            { value: "col-md-1", label: "1" },
            { value: "col-md-2", label: "2" },
            { value: "col-md-3", label: "3" },
            { value: "col-md-4", label: "4" },
            { value: "col-md-5", label: "5" },
            { value: "col-md-6", label: "6" },
            { value: "col-md-7", label: "7" },
            { value: "col-md-8", label: "8" },
            { value: "col-md-9", label: "9" },
            { value: "col-md-10", label: "10" },
            { value: "col-md-11", label: "11" },
            { value: "col-md-12", label: "12" },
          ],
          default: "col-md-4",
        },
        colLgSize: {
          type: "select",
          label: "Large Column Size",
          options: [
            { value: "", label: "None" },
            { value: "col-lg-1", label: "1" },
            { value: "col-lg-2", label: "2" },
            { value: "col-lg-3", label: "3" },
            { value: "col-lg-4", label: "4" },
            { value: "col-lg-5", label: "5" },
            { value: "col-lg-6", label: "6" },
            { value: "col-lg-7", label: "7" },
            { value: "col-lg-8", label: "8" },
            { value: "col-lg-9", label: "9" },
            { value: "col-lg-10", label: "10" },
            { value: "col-lg-11", label: "11" },
            { value: "col-lg-12", label: "12" },
          ],
          default: "col-lg-4",
        },
        colXlSize: {
          type: "select",
          label: "Extra Large Column Size",
          options: [
            { value: "", label: "None" },
            { value: "col-xl-1", label: "1" },
            { value: "col-xl-2", label: "2" },
            { value: "col-xl-3", label: "3" },
            { value: "col-xl-4", label: "4" },
            { value: "col-xl-5", label: "5" },
            { value: "col-xl-6", label: "6" },
            { value: "col-xl-7", label: "7" },
            { value: "col-xl-8", label: "8" },
            { value: "col-xl-9", label: "9" },
            { value: "col-xl-10", label: "10" },
            { value: "col-xl-11", label: "11" },
            { value: "col-xl-12", label: "12" },
          ],
          default: "col-xl-4",
        },
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "colSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        } else if (propName === "colSmSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        } else if (propName === "colMdSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        } else if (propName === "colLgSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        } else if (propName === "colXlSize") {
          const toRemove = prop.options.map((option) => option.value);
          toRemove.forEach((option) => option ? element.classList.remove(option) : null);
          element.classList.add(value);
        }
      },
      restriction: function (parent) {
        return parent.classList.contains("row");
      },
    }),
    // Tab Component
    new Component({
      id: "tab",
      name: "Tab",
      icon: "",
      category: "Basic",
      content: (props) => {
        return `<div>
          <ul class="nav nav-tabs" role="tablist" data-component-children="tabs">
            <!-- Children -->
          </ul>
          <div class="tab-content" data-component-children="tab-content">
            <!-- Children -->
          </div>
        </div>`;
      },
      children: {
        "tabs": {
          "id": "tab-item",
          "count": 3
        },
        "tab-content": {
          "id": "tab-content-item",
          "count": 3
        }
      },
      allowed: {
        "tabs": "tab-item",
        "tab-content": "tab-content-item"
      },
      editorStyle: `
        .nav-tabs, .tab-content {
          border:1px dashed #ccc;
          min-height: 50px;
        }
      `,
      onInsert: function (editor,element, component) {
        const tabs = element.querySelectorAll('.nav-link');
        const tabContents = element.querySelectorAll('.tab-pane');

        for(let i = 0; i < tabs.length; i++) {
          const id = 'tab-' + Math.random().toString(36).substring(2, 10);
          tabs[i].setAttribute('data-bs-target', '#' + id);
          tabContents[i].id = id;
        }
      }
    }),
    // Tab Item Component
    new Component({
      id: "tab-item",
      name: "Tab Item",
      icon: "",
      category: "Basic",
      content: (props) => {
        const id = 'tab-' + Math.random().toString(36).substring(2, 10);
        return `<li><button class="nav-link" data-bs-toggle="tab" data-bs-target="#${id}" type="button" role="tab">Tab Item</button></li>`;
      },
      properties:{
        tabContentId: {
          type: "text",
          label: "Tab Content ID",
          default: ""
        }
      },
      restriction: (parent) => {
        return parent.classList.contains("nav") && parent.classList.contains("nav-tabs");
      },
      onUpdate: function (propName, value, element, prop) {
        if (propName === "tabContentId") {
          element.setAttribute("data-bs-target", value);
        }
      },
    }),
    // Tab Content Item Component
    new Component({
      id: "tab-content-item",
      name: "Tab Content Item",
      icon: "",
      category: "Basic",
      content: (props) => { 
        const id = 'tab-' + Math.random().toString(36).substring(2, 10);
        return `<div class="tab-pane fade" id="${id}" role="tabpanel" tabindex="0">Tab Content</div>`;
      },
      restriction: (parent) => {
        return parent.classList.contains("tab-content");
      }
    }),
    // Accordion Component
    new Component({
      id: "accordion",
      name: "Accordion",
      icon: "",
      category: "Basic",
      content: (props) => {
        const id = 'accordion-' + Math.random().toString(36).substring(2, 10);
        
        return `<div class="accordion" role="tablist" data-component-children="default" id="${id}">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "accordion-item",
          "count": 3
        }
      },
      allowed: {
        "default": "accordion-item"
      },
      editorStyle: `
        .accordion {
          border:1px dashed #ccc;
          min-height: 50px;
          padding-bottom: 10px;
        }
      `,
      onInsert: function (editor, element, component) {
        const firstItem = element.querySelector(".accordion-collapse");
        firstItem.classList.add("show");
      },
    }),
    // Accordion Item Component
    new Component({
      id: "accordion-item",
      name: "Accordion Item",
      icon: "",
      category: "Basic",
      content: (props) => {
        const id = 'accordion-item-' + Math.random().toString(36).substring(2, 10);

        return `<div class="accordion-item">
          <h2 class="accordion-header">
            <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#${id}">
              Accordion Item
            </button>
          </h2>
          <div id="${id}" class="accordion-collapse collapse" aria-labelledby="${id}">
            <div class="accordion-body">
              This here
            </div>
          </div>
        </div>`;
      },
      restriction: (parent) => {
        return parent.classList.contains("accordion");
      },
      onInsert: function (editor, element, component) {
        const accordion = element.closest(".accordion");
        const accordionCollapse = element.querySelector(".accordion-collapse");
        accordionCollapse.setAttribute("data-bs-parent", "#" + accordion.id);
      }
    })
  ];

  components.forEach((component) => {
    componentsManager.register(component);
  });

  const complexComponents = [
    // Row with two columns
    new Component({
      id: "row-2-column",
      name: "2 columns",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "col",
          "count": 2
        }
      },
      allowed: {
        "default": "col"
      },
      onInsert: function (editor, element, component) {
        const cols = element.children;
        for (let i = 0; i < cols.length; i++) {
          cols[i].classList.remove(...Array.from(cols[i].classList));
          cols[i].setAttribute("data-prop-colsize", "");
          cols[i].setAttribute("data-prop-colsmsize", "");
          cols[i].setAttribute("data-prop-colmdsize", "col-md-6");
          cols[i].setAttribute("data-prop-collgsize", "");
          cols[i].setAttribute("data-prop-colxlsize", "");
          cols[i].classList.add("col-md-6");
        }
      }
    }),
    // Row with three columns
    new Component({
      id: "row-3-column",
      name: "3 columns",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "col",
          "count": 3
        }
      },
      allowed: {
        "default": "col"
      },
      onInsert: function (editor, element, component) {
        const cols = element.children;
        for (let i = 0; i < cols.length; i++) {
          cols[i].classList.remove(...Array.from(cols[i].classList));
          cols[i].setAttribute("data-prop-colsize", "");
          cols[i].setAttribute("data-prop-colsmsize", "");
          cols[i].setAttribute("data-prop-colmdsize", "col-md-4");
          cols[i].setAttribute("data-prop-collgsize", "");
          cols[i].setAttribute("data-prop-colxlsize", "");
          cols[i].classList.add("col-md-4");
        }
      }
    }),
    // Row with four columns
    new Component({
      id: "row-4-column",
      name: "4 columns",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "col",
          "count": 4
        }
      },
      allowed: {
        "default": "col"
      },
      onInsert: function (editor, element, component) {
        const cols = element.children;
        for (let i = 0; i < cols.length; i++) {
          cols[i].classList.remove(...Array.from(cols[i].classList));
          cols[i].setAttribute("data-prop-colsize", "");
          cols[i].setAttribute("data-prop-colsmsize", "");
          cols[i].setAttribute("data-prop-colmdsize", "col-md-3");
          cols[i].setAttribute("data-prop-collgsize", "");
          cols[i].setAttribute("data-prop-colxlsize", "");
          cols[i].classList.add("col-md-3");
        }
      }
    }),
    // Row with 1+2 columns
    new Component({
      id: "row-1-2-column",
      name: "1/2 columns",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "col",
          "count": 2
        }
      },
      allowed: {
        "default": "col"
      },
      onInsert: function (editor, element, component) {
        const cols = element.children;
        cols[0].classList.remove(...Array.from(cols[0].classList));
        cols[1].classList.remove(...Array.from(cols[1].classList));
        cols[0].setAttribute("data-prop-colsize", "");
        cols[0].setAttribute("data-prop-colsmsize", "");
        cols[0].setAttribute("data-prop-colmdsize", "col-md-4");
        cols[0].setAttribute("data-prop-collgsize", "");
        cols[0].setAttribute("data-prop-colxlsize", "");
        cols[1].setAttribute("data-prop-colsize", "");
        cols[1].setAttribute("data-prop-colsmsize", "");
        cols[1].setAttribute("data-prop-colmdsize", "col-md-8");
        cols[1].setAttribute("data-prop-collgsize", "");
        cols[1].setAttribute("data-prop-colxlsize", "");
        cols[0].classList.add("col-md-4");
        cols[1].classList.add("col-md-8");
      }
    }),
    // Row with 2+1 columns
    new Component({
      id: "row-2-1-column",
      name: "2/1 columns",
      icon: "",
      category: "Layout",
      content: (props) => {
        return `<div class="row" data-component-children="default">
          <!-- Children -->
        </div>`;
      },
      children: {
        "default": {
          "id": "col",
          "count": 2
        }
      },
      allowed: {
        "default": "col"
      },
      onInsert: function (editor, element, component) {
        const cols = element.children;
        cols[0].classList.remove(...Array.from(cols[0].classList));
        cols[1].classList.remove(...Array.from(cols[1].classList));
        cols[0].setAttribute("data-prop-colsize", "");
        cols[0].setAttribute("data-prop-colsmsize", "");
        cols[0].setAttribute("data-prop-colmdsize", "col-md-8");
        cols[0].setAttribute("data-prop-collgsize", "");
        cols[0].setAttribute("data-prop-colxlsize", "");
        cols[1].setAttribute("data-prop-colsize", "");
        cols[1].setAttribute("data-prop-colsmsize", "");
        cols[1].setAttribute("data-prop-colmdsize", "col-md-4");
        cols[1].setAttribute("data-prop-collgsize", "");
        cols[1].setAttribute("data-prop-colxlsize", "");
        cols[0].classList.add("col-md-8");
        cols[1].classList.add("col-md-4");
      }
    }),
  ];

  complexComponents.forEach((component) => {
    componentsManager.register(component);
  });
}