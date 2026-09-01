import { currentSettings } from "../settings.js";
import { renderText } from "./text.js";
import { clickableActive } from "./scenes/clickable.js";
import { keyboard } from "../controls/keyboard.js";
import { lerp } from "../lerp.js";
import { ctx } from "./drawLoop.js";

// ============================================================================
// Constants
// ============================================================================

const BORDER_WIDTH = 4;
const DEBOUNCE_DELAY = 200;
const KEY_REPEAT_DELAY = 100;
const DROPDOWN_FADE_DURATION = 25; // ms per option
const DROPDOWN_FADE_STAGGER = 8; // ms delay between each option
const CHECKBOX_TRANSITION_DURATION = 10; // ms for color transition

const COLORS = {
    border: "grey",
    background: "lightgrey",
    backgroundActive: "darkgrey",
    optionHover: "#b8b8b8",
    optionDefault: "#d0d0d0",
    // RGB values for checkbox lerping
    checkboxOff: { r: 255, g: 150, b: 150 },
    checkboxOn: { r: 150, g: 255, b: 150 }
};

const SCALE = {
    clicked: 0.8,
    hovered: 1.05,
    default: 1.0
};

// ============================================================================
// State Management
// ============================================================================

const elements = new Map();

function createElement() {
    return {
        focused: false,
        forcedFocus: false,
        lastRender: performance.now(),
        debounce: 0,
        inputBuffer: "",
        lastKeyPress: 0,
        oldValue: null,
        dropdownOpen: false,
        dropdownOpenTime: 0,
        dropdownClosing: false,
        dropdownCloseTime: 0,
        checkboxValue: false,
        checkboxTransitionStart: 0,
        checkboxTransitionFrom: 0,
        wasFocused: false,
        currentScale: 1.0
    };
}

function getOrCreateElement(uniqueId) {
    let element = elements.get(uniqueId);

    if (!element) {
        element = createElement();
        elements.set(uniqueId, element);
        startCleanupTimer(uniqueId, element);
    }

    element.lastRender = performance.now();
    return element;
}

function startCleanupTimer(uniqueId, element) {
    const interval = currentSettings.inputElementsCacheInterval.value.number;

    const cleanUpInterval = setInterval(() => {
        if (performance.now() - element.lastRender > interval) {
            elements.delete(uniqueId);
            clearInterval(cleanUpInterval);
        }
    }, interval);
}

// ============================================================================
// Input Handling
// ============================================================================

function handleKeyboardInput(
    element,
    allowedChars = "all",
    lengthLimit = Infinity
) {
    const now = performance.now();
    if (now - element.lastKeyPress < KEY_REPEAT_DELAY) return;

    // Handle special keys
    if (keyboard.keys["Enter"]) {
        element.shouldSubmit = true;
        element.lastKeyPress = now;
        return;
    }
    if (keyboard.keys["Escape"]) {
        element.cancelSubmit = true;
        element.lastKeyPress = now;
        return;
    }

    for (const key of Object.keys(keyboard.keys)) {
        if (!keyboard.keys[key]) {
            // Key is not pressed, remove from pressed set
            continue;
        }
        if (key === "Backspace") {
            element.inputBuffer = element.inputBuffer.slice(0, -1);
            element.lastKeyPress = now;
            break;
        }
        if (key === "shift" || key === "Shift") {
            continue;
        }

        if (isValidChar(key, allowedChars)) {
            // Check length limit before adding character
            if (element.inputBuffer.length < lengthLimit) {
                element.inputBuffer += key;
                element.lastKeyPress = now;
            }
            break;
        }
    }
}

function isValidChar(key, allowedChars) {
    if (allowedChars === "all") return true;
    if (allowedChars === "number") {
        return (key >= "0" && key <= "9") || key === ".";
    }
    return false;
}

function canDebounce(element) {
    return performance.now() - element.debounce > DEBOUNCE_DELAY;
}

function resetDebounce(element) {
    element.debounce = performance.now();
}

// ============================================================================
// Drawing Helpers
// ============================================================================

function drawBorder(ctx, x, y, width, height) {
    const offset = BORDER_WIDTH / 2;
    ctx.fillStyle = COLORS.border;
    ctx.fillRect(
        x - offset,
        y - offset,
        width + BORDER_WIDTH,
        height + BORDER_WIDTH
    );
}

function drawBackground(ctx, x, y, width, height, isActive = false) {
    ctx.fillStyle = isActive ? COLORS.backgroundActive : COLORS.background;
    ctx.fillRect(x, y, width, height);
}

function drawCenteredText(ctx, text, x, y, width, height) {
    if (text.width > width) {
        ctx.save();
        ctx.beginPath()
        ctx.rect(x, y, x + width, y + width);
        ctx.clip();

        ctx.drawImage(
            text,
            x + width - text.width,
            y + height / 2 - text.height / 2
        );
        ctx.restore();
    } else {
        ctx.drawImage(
            text,
            x + width / 2 - text.width / 2,
            y + height / 2 - text.height / 2
        );

    }
}

function lerpColor(from, to, t) {
    t = Math.min(1, Math.max(0, t));
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

function applyHoverScale(x, y, width, height, scale) {
    return {
        x: x - (width * (scale - 1)) / 2,
        y: y - (height * (scale - 1)) / 2,
        width: width * scale,
        height: height * scale
    };
}

// ============================================================================
// Dropdown Helpers
// ============================================================================

function isHoveringDropdownOptions(x, y, width, height, uniqueId) {
    const options = currentSettings[uniqueId]?.value?.options;
    if (!options) return false;

    // x, y, width, height are already scaled
    const optionX = x + width;
    for (let i = 0; i < options.length; i++) {
        const optionY = y + i * height;
        const optionCheck = clickableActive(
            optionX,
            optionY,
            optionX + width,
            optionY + height
        );
        if (optionCheck !== false) return true;
    }

    return false;
}

function handleDropdownOptionInteraction(
    element,
    options,
    originalX,
    originalY,
    originalWidth,
    originalHeight,
    inputCallback
) {
    let hoveringOverOptions = false;
    // First option is to the right, rest stack below it
    const optionX = originalX + originalWidth;

    for (let i = 0; i < options.length; i++) {
        const optionY = originalY + i * originalHeight;
        const optionInteraction = clickableActive(
            optionX,
            optionY,
            optionX + originalWidth,
            optionY + originalHeight
        );

        if (optionInteraction !== false) {
            hoveringOverOptions = true;

            if (optionInteraction.left && canDebounce(element)) {
                resetDebounce(element);
                // Start close animation instead of instant close
                element.dropdownClosing = true;
                element.dropdownCloseTime = performance.now();
                inputCallback(options[i]);
            }
        }
    }

    return hoveringOverOptions;
}

function drawDropdownOptions(
    ctx,
    element,
    options,
    selectedValue,
    originalX,
    originalY,
    originalWidth,
    originalHeight
) {
    const menuAnimSpeed = currentSettings.menuAnimSpeed.value.number;

    // First option is to the right, rest stack below it
    const optionX = originalX + originalWidth;
    const baseAlpha = ctx.globalAlpha;
    const fadeDuration = DROPDOWN_FADE_DURATION / menuAnimSpeed;
    const fadeStagger = DROPDOWN_FADE_STAGGER / menuAnimSpeed;

    // Calculate time based on whether opening or closing
    const isClosing = element.dropdownClosing;
    const animationTime = isClosing
        ? performance.now() - element.dropdownCloseTime
        : performance.now() - element.dropdownOpenTime;

    for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const optionY = originalY + i * originalHeight;
        const optionHover = clickableActive(
            optionX,
            optionY,
            optionX + originalWidth,
            optionY + originalHeight
        );

        // Calculate staggered fade alpha for this option
        // For closing, reverse the stagger order (last options fade first)
        const staggerIndex = isClosing ? options.length - 1 - i : i;
        const optionDelay = staggerIndex * fadeStagger;
        const optionTime = animationTime - optionDelay;
        let optionAlpha = Math.min(1, Math.max(0, optionTime / fadeDuration));

        // Invert alpha for closing animation
        if (isClosing) {
            optionAlpha = 1 - optionAlpha;
        }

        ctx.globalAlpha = baseAlpha * optionAlpha;

        // Draw option border and background
        drawBorder(ctx, optionX, optionY, originalWidth, originalHeight);

        if (option === selectedValue) {
            ctx.fillStyle = COLORS.backgroundActive;
        } else if (optionHover !== false) {
            ctx.fillStyle = COLORS.optionHover;
        } else {
            ctx.fillStyle = COLORS.optionDefault;
        }
        ctx.fillRect(optionX, optionY, originalWidth, originalHeight);

        // Draw option text
        const text = renderText(option, originalHeight * 0.65);
        drawCenteredText(
            ctx,
            text,
            optionX,
            optionY,
            originalWidth,
            originalHeight
        );
    }

    ctx.globalAlpha = baseAlpha;
}

// ============================================================================
// Input Type Renderers
// ============================================================================

function renderButton(
    element,
    x,
    y,
    width,
    height,
    text,
    click,
    clickCallback
) {
    if (click.left === true && canDebounce(element)) {
        resetDebounce(element);
        clickCallback();
    }

    drawBorder(ctx, x, y, width, height);
    drawBackground(ctx, x, y, width, height, click.left === true);

    const textImage = renderText(text, height * 0.65);
    drawCenteredText(ctx, textImage, x, y, width, height);
}

function renderCheckbox(
    element,
    x,
    y,
    width,
    height,
    value,
    click,
    inputCallback
) {
    const menuAnimSpeed = currentSettings.menuAnimSpeed.value.number;

    if (click.left === true && canDebounce(element)) {
        resetDebounce(element);
        inputCallback();
    }

    // Track value changes for transition
    if (element.checkboxValue !== value) {
        element.checkboxTransitionFrom = element.checkboxValue ? 1 : 0;
        element.checkboxTransitionStart = performance.now();
        element.checkboxValue = value;
    }

    // Calculate transition progress
    const transitionTime = performance.now() - element.checkboxTransitionStart;
    const transitionDuration = CHECKBOX_TRANSITION_DURATION / menuAnimSpeed;
    const transitionProgress = Math.min(1, transitionTime / transitionDuration);

    const targetBlend = value ? 1 : 0;
    const currentBlend =
        element.checkboxTransitionFrom +
        (targetBlend - element.checkboxTransitionFrom) * transitionProgress;

    drawBorder(ctx, x, y, width, height);

    ctx.fillStyle = lerpColor(
        COLORS.checkboxOff,
        COLORS.checkboxOn,
        currentBlend
    );
    ctx.fillRect(x, y, width, height);
}

function renderNumber(
    element,
    uniqueId,
    x,
    y,
    width,
    height,
    value,
    inputCallback
) {
    const alpha = ctx.globalAlpha;
    const setting = currentSettings[uniqueId];

    if (element.focused) {
        ctx.fillStyle = "black";
        ctx.globalAlpha = alpha * Math.abs(Math.sin(performance.now() * 0.005));

        handleKeyboardInput(element, "number");

        let parsed = parseFloat(element.inputBuffer);
        if (setting?.value) {
            parsed = Math.min(
                setting.value.max,
                Math.max(setting.value.min, parsed)
            );
        }
        if (isNaN(parsed)) {
            if (element.oldValue) {
                parsed = element.oldValue
            } else {
                parsed = 0;
            }
        }

        // Only submit value on Enter or blur
        if (element.shouldSubmit) {
            inputCallback(parsed);
            element.focused = false || element.forcedFocus;
            if (element.focused) {
                element.inputBuffer = "";
            }
            element.shouldSubmit = false;
        } else if (element.cancelSubmit) {
            // Revert to original value on Escape
            if (element.oldValue !== null) {
                inputCallback(element.oldValue);
                element.inputBuffer = "";
            }
            element.focused = element.forcedFocus = false;
            element.cancelSubmit = false;
        }
    } else {
        ctx.fillStyle = COLORS.border;
    }

    drawBorder(ctx, x, y, width, height);
    ctx.globalAlpha = alpha;
    drawBackground(ctx, x, y, width, height);

    const displayValue =
        element.focused && element.inputBuffer !== ""
            ? element.inputBuffer
            : value.toString();
    const text = renderText(displayValue, height);
    drawCenteredText(ctx, text, x, y, width, height);
}

function renderTextInput(
    element,
    uniqueId,
    x,
    y,
    width,
    height,
    value,
    inputCallback
) {
    const alpha = ctx.globalAlpha;
    const setting = currentSettings[uniqueId];
    const lengthLimit = setting?.value?.lengthLimit || Infinity;

    if (element.focused) {
        ctx.fillStyle = "black";
        ctx.globalAlpha = alpha * Math.abs(Math.sin(performance.now() * 0.005));

        handleKeyboardInput(element, "all", lengthLimit);

        // Only submit value on Enter or blur
        if (element.shouldSubmit) {
            inputCallback(element.inputBuffer);
            element.focused = false || element.forcedFocus;
            if (element.focused) {
                element.inputBuffer = "";
            }
            element.shouldSubmit = false;
        } else if (element.cancelSubmit) {
            // Revert to original value on Escape
            if (element.oldValue !== null) {
                inputCallback(element.oldValue);
                element.inputBuffer = "";
            }
            element.focused = element.forcedFocus = false;
            element.cancelSubmit = false;
        }
    } else {
        ctx.fillStyle = COLORS.border;
    }

    drawBorder(ctx, x, y, width, height);
    ctx.globalAlpha = alpha;
    drawBackground(ctx, x, y, width, height);

    const displayValue =
        element.focused && element.inputBuffer !== ""
            ? element.inputBuffer
            : value;
    const text = renderText(displayValue || " ", height);
    drawCenteredText(ctx, text, x, y, width, height);
}

// For convience dropdowns inheriently work off settings
// Perhaps this can be changed but theres no need right now
function renderDropdown(
    element,
    uniqueId,
    x,
    y,
    width,
    height,
    click,
    inputCallback
) {
    const menuAnimSpeed = currentSettings.menuAnimSpeed.value.number;
    const setting = currentSettings[uniqueId];

    if (!setting?.value?.options) {
        console.warn(
            `Dropdown setting "${uniqueId}" not found or improperly configured`
        );
        return;
    }

    const options = setting.value.options;
    const selectedValue = setting.value.selected;

    // Calculate total animation duration for all options
    const fadeDuration = DROPDOWN_FADE_DURATION / menuAnimSpeed;
    const fadeStagger = DROPDOWN_FADE_STAGGER / menuAnimSpeed;
    const totalFadeDuration = fadeDuration + (options.length - 1) * fadeStagger;

    // Check if closing animation is complete
    if (element.dropdownClosing) {
        const closeTime = performance.now() - element.dropdownCloseTime;
        if (closeTime >= totalFadeDuration) {
            element.dropdownClosing = false;
            element.dropdownOpen = false;
        }
    }

    // Toggle dropdown on click
    if (click.left === true && canDebounce(element)) {
        resetDebounce(element);
        if (element.dropdownOpen && !element.dropdownClosing) {
            // Start closing animation
            element.dropdownClosing = true;
            element.dropdownCloseTime = performance.now();
        } else if (!element.dropdownOpen) {
            // Open dropdown
            element.dropdownOpen = true;
            element.dropdownClosing = false;
            element.dropdownOpenTime = performance.now();
        }
    }

    // Handle option interactions when open (and not closing)
    let hoveringOverOptions = false;
    if (element.dropdownOpen && !element.dropdownClosing) {
        hoveringOverOptions = handleDropdownOptionInteraction(
            element,
            options,
            x,
            y,
            width,
            height,
            inputCallback
        );

        // Start close animation if not hovering over main button or options
        if (click === false && !hoveringOverOptions) {
            element.dropdownClosing = true;
            element.dropdownCloseTime = performance.now();
        }
    }

    // Draw main dropdown button
    drawBorder(ctx, x, y, width, height);
    drawBackground(
        ctx,
        x,
        y,
        width,
        height,
        element.dropdownOpen && !element.dropdownClosing
    );

    const text = renderText(selectedValue, height * 0.65);
    drawCenteredText(ctx, text, x, y, width, height);

    // Draw dropdown options if open (including during close animation)
    if (element.dropdownOpen) {
        drawDropdownOptions(
            ctx,
            element,
            options,
            selectedValue,
            x,
            y,
            width,
            height
        );
    }
}

// ============================================================================
// Main Render Function
// ============================================================================

function renderInput(
    uniqueId,
    type,
    x,
    y,
    width,
    height,
    value,
    inputCallback,
    hoverCallback,
    lostFocusCallback
) {
    ctx.save();
    const menuAnimSpeed = currentSettings.menuAnimSpeed.value.number;
    const element = getOrCreateElement(uniqueId);
    element.type = type;

    // Apply current scale FIRST so all hit-testing matches drawn positions
    const scaled = applyHoverScale(x, y, width, height, element.currentScale);
    x = scaled.x;
    y = scaled.y;
    width = scaled.width;
    height = scaled.height;

    let hoveringOverDropdownOptions = false;
    if (element.type === "dropdown") {
        hoveringOverDropdownOptions = isHoveringDropdownOptions(
            element,
            x,
            y,
            width,
            height,
            uniqueId
        );
    }

    // click detection
    const click = clickableActive(x, y, x + width, y + height);
    const isInteracting = click !== false || hoveringOverDropdownOptions;
    let targetScale = SCALE.default;

    // Focus
    if (isInteracting) {
        if (hoverCallback) hoverCallback();
        if (click && click.left) {
            for (const [otherId, otherElem] of elements.entries()) {
                if (otherId !== uniqueId) {
                    otherElem.focused = false;
                }
            }
            element.focused = true;
        }

        targetScale = click.left ? SCALE.clicked : SCALE.hovered;
    } else {
        element.focused = false || element.forcedFocus;
        element.oldValue = null;
    }
    if (element.wasFocused && !(isInteracting || element.focused)) {
        if (lostFocusCallback) lostFocusCallback();
        element.wasFocused = false;
        if (element.type === "number" || element.type === "text") {
            element.inputBuffer = "";
            keyboard.locked = false;
        }
    }
    element.wasFocused = isInteracting || element.focused;

    // Update scale target for next frame
    element.currentScale = lerp(
        element.currentScale,
        targetScale,
        menuAnimSpeed
    );

    // Handle input buffer for text-based inputs
    // Doesnt matter that it happens every frame..
    // ..ensures oldValue replacing
    if (type === "number" || type === "text") {
        if (element.focused) {
            keyboard.locked = true;
            if (element.oldValue !== null) {
                if (type === "number") {
                    const parsed = parseFloat(element.inputBuffer);
                    if (element.inputBuffer === "" || isNaN(parsed)) {
                        inputCallback(element.oldValue);
                    }
                } else if (type === "text" && element.inputBuffer === "") {
                    inputCallback(element.oldValue);
                }
            }
        } else {
            element.oldValue = value;
            element.inputBuffer = "";
        }
    }

    // Render based on input type
    switch (type) {
        case "button":
            renderButton(
                element,
                x,
                y,
                width,
                height,
                value,
                click,
                inputCallback
            );
            break;

        case "checkbox":
            renderCheckbox(
                element,
                x,
                y,
                width,
                height,
                value,
                click,
                inputCallback
            );
            break;

        case "number":
            renderNumber(
                element,
                uniqueId,
                x,
                y,
                width,
                height,
                value,
                inputCallback
            );
            break;

        case "text":
            renderTextInput(
                element,
                uniqueId,
                x,
                y,
                width,
                height,
                value,
                inputCallback
            );
            break;

        case "dropdown":
            renderDropdown(
                element,
                uniqueId,
                x,
                y,
                width,
                height,
                click,
                inputCallback
            );
            break;
    }

    ctx.restore();
}

// ============================================================================
// Exports
// ============================================================================

function forceFocusInput(uniqueId) {
    const element = getOrCreateElement(uniqueId);
    element.focused = element.forcedFocus = true;
    return element;
}

function unforceFocusInput(uniqueId) {
    const element = getOrCreateElement(uniqueId);
    element.forcedFocus = false;
    return element;
}

function isInputFocused(uniqueId) {
    const e = elements.get(uniqueId);
    return !!(e && e.focused);
}

function isAnyInputFocused() {
    for (const e of elements.values()) {
        if (e.focused) return true;
    }
    return false;
}

export {
    renderInput,
    forceFocusInput,
    unforceFocusInput,
    isInputFocused,
    isAnyInputFocused
};
