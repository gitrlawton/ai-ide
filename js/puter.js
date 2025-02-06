"use strict";
import query from "./query.js";

export const IS_PUTER = !!query.get("puter.app_instance_id");

if (IS_PUTER) {
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    document.head.appendChild(script);
}
