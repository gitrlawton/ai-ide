"use strict";
import query from "./query.js";
import { IS_ELECTRON } from "./electron.js";
import { IS_PUTER } from "./puter.js";

const style = {
    SUPPORTED_STYLES: ["default", "minimal", "standalone", "electron"],
    DEFAULT_STYLE: "default",
    apply(name) {
        const resolvedName = style.SUPPORTED_STYLES.includes(name) ? name : style.DEFAULT_STYLE;
        if (resolvedName !== "default") {
            style.apply("default");
            document.querySelectorAll(`.judge0-${resolvedName}-hidden`).forEach(e => {
                e.classList.add("judge0-hidden");
            });
        } else {
            style.SUPPORTED_STYLES.forEach(s => style.reverse(s));
        }
    },
    reverse(name) {
        document.querySelectorAll(`.judge0-${name}-hidden`).forEach(e => {
            e.classList.remove("judge0-hidden");
        });
    }
};

export default style;

document.addEventListener("DOMContentLoaded", function () {
    if (IS_ELECTRON) {
        style.apply("electron");
    } else if (IS_PUTER) {
        style.apply("standalone");
    } else {
        style.apply(query.get("style"));
    }
});
