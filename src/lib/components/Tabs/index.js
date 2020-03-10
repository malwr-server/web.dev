import {html} from "lit-element";
import {BaseElement} from "../BaseElement";
import {checkOverflow} from "../../utils/handle-overflow";
import {generateIdSalt} from "../../utils/generate-salt";
import "./_styles.scss";

/**
 * Element that wraps each child element in a tab panel
 * and renders a tab for each panel.
 * @extends {BaseElement}
 */
class Tabs extends BaseElement {
  static get properties() {
    return {
      label: {type: String},
      activeTab: {type: Number, reflect: true},
      overflow: {type: Boolean, reflect: true},
    };
  }

  constructor() {
    super();
    this.activeTab = 0;
    this.overflow = false;
    this.prerenderedChildren = null;
    this.tabs = null;
    this.idSalt = generateIdSalt("web-tab-");

    this.onResize = this.onResize.bind(this);
    this._changeTab = this._changeTab.bind(this);
    this.focusTab = this.focusTab.bind(this);
    this.previousTab = this.previousTab.bind(this);
    this.nextTab = this.nextTab.bind(this);
    this.focusNextItem = this.focusNextItem.bind(this);
    this.focusPreviousItem = this.focusPreviousItem.bind(this);
    this.focusFirstItem = this.focusFirstItem.bind(this);
    this.focusLastItem = this.focusLastItem.bind(this);
  }

  render() {
    if (!this.prerenderedChildren) {
      this.prerenderedChildren = [];
      this.tabs = [];
      let i = 1;

      for (const child of this.children) {
        // Set id and aria-labelledby attributes for each panel for a11y.
        this.prerenderedChildren.push(this.panelTemplate(i, child));
        // Get tab label from child data-label attribute
        // and render a tab for each panel.
        const tabLabel = child.getAttribute("data-label");
        this.tabs.push(this.tabTemplate(i, tabLabel));
        i++;
      }
    }

    return html`
      <div class="web-tabs__tablist" role="tablist" aria-label="${this.label}">
        ${this.tabs}
      </div>
      ${this.prerenderedChildren}
    `;
  }

  tabTemplate(i, tabLabel) {
    switch (tabLabel) {
      case "question":
        tabLabel = "Question " + i;
        break;
      case "sample":
        tabLabel = "Sample " + i;
        break;
      case "":
      case null:
      case "bare":
        tabLabel = i;
        break;
      default:
        break;
    }

    return html`
      <button
        @focus="${this.onFocus}"
        @keydown="${this.onKeydown}"
        class="web-tabs__tab gc-analytics-event"
        role="tab"
        aria-selected="false"
        id="web-tab-${this.idSalt}-${i}"
        aria-controls="web-tab-${this.idSalt}-${i}-panel"
        tabindex="-1"
        data-category="Site-Wide Custom Events"
        data-label="tab, ${tabLabel}"
      >
        <span class="web-tabs__text-label">${tabLabel}</span>
      </button>
    `;
  }

  panelTemplate(i, child) {
    return html`
      <div
        id="web-tab-${this.idSalt}-${i}-panel"
        class="web-tabs__panel"
        role="tabpanel"
        aria-labelledby="web-tab-${this.idSalt}-${i}"
        hidden
      >
        ${child}
      </div>
    `;
  }

  firstUpdated() {
    this.activeTab = 0;
    this.classList.remove("unresolved");
    this.onResize();

    // If Tabs component contains AssessmentQuestion components,
    // listen for requests to navigate to the next tab.
    const questions = this.querySelectorAll("web-question");

    if (!questions) {
      return;
    }
    for (const question of questions) {
      question.addEventListener("request-nav-to-next", this.nextTab);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("resize", this.onResize);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener("resize", this.onResize);
  }

  updated(changedProperties) {
    if (changedProperties.has("activeTab")) {
      this._changeTab(); // _ prefix because it's an internal method
    }
  }

  // Update state of tabs and associated panels.
  _changeTab() {
    const tabs = this.querySelectorAll(".web-tabs__tab");
    const panels = this.querySelectorAll(".web-tabs__panel");
    const activeTab = tabs[this.activeTab];

    if (!panels[this.activeTab]) {
      return;
    }

    for (const tab of tabs) {
      tab.setAttribute("aria-selected", "false");
      tab.setAttribute("tabindex", "-1");
    }

    activeTab.setAttribute("aria-selected", "true");
    activeTab.removeAttribute("tabindex");

    for (const panel of panels) {
      panel.hidden = true;
    }

    panels[this.activeTab].hidden = false;
  }

  // Focus the tab at the specified index.
  focusTab(index) {
    const tabs = this.querySelectorAll(".web-tabs__tab");

    if (!tabs[index]) {
      throw new RangeError("There is no tab at the specified index.");
    } else {
      this.activeTab = index;
    }
  }

  // Helper function to allow other components to request
  // navigation to the previous tab.
  previousTab() {
    this.focusTab(this.activeTab - 1);
  }

  // Helper function to allow other components to request
  // navigation to the next tab.
  nextTab() {
    this.focusTab(this.activeTab + 1);
  }

  onResize() {
    const tabs = this.querySelector(".web-tabs__tablist");

    this.overflow = checkOverflow(tabs, "width");
  }

  onFocus(e) {
    const tab = e.currentTarget;
    const tabs = this.querySelectorAll(".web-tabs__tab");
    const index = Array.from(tabs).indexOf(tab);

    // Match behavior specified for Material scrollable tabs:
    // https://material.io/components/tabs/#scrollable-tabs
    tab.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
    this.activeTab = index;
  }

  onKeydown(e) {
    const KEYCODE = {
      END: 35,
      HOME: 36,
      LEFT: 37,
      RIGHT: 39,
    };

    switch (e.keyCode) {
      case KEYCODE.RIGHT:
        e.preventDefault();
        this.focusNextItem();
        break;
      case KEYCODE.LEFT:
        e.preventDefault();
        this.focusPreviousItem();
        break;
      case KEYCODE.HOME:
        e.preventDefault();
        this.focusFirstItem();
        break;
      case KEYCODE.END:
        e.preventDefault();
        this.focusLastItem();
        break;
    }
  }

  // Figure out if the current element has a next sibling.
  // If so, focus it. If not, focus the first sibling.
  focusNextItem() {
    const item = document.activeElement;
    if (item.nextElementSibling) {
      item.nextElementSibling.focus();
    } else {
      this.focusFirstItem();
    }
  }

  // Figure out if the current element has a previous sibling.
  // If so, focus it. If not, focus the last sibling.
  focusPreviousItem() {
    const item = document.activeElement;
    if (item.previousElementSibling) {
      item.previousElementSibling.focus();
    } else {
      this.focusLastItem();
    }
  }

  // Focus first element in set of siblings.
  focusFirstItem() {
    const item = document.activeElement;
    item.parentElement.firstElementChild.focus();
  }

  // Focus last element in set of siblings.
  focusLastItem() {
    const item = document.activeElement;
    item.parentElement.lastElementChild.focus();
  }
}

customElements.define("web-tabs", Tabs);
