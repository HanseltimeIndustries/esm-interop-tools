import { getJestNodeModulesTransformIgnore } from "@hanseltime/esm-interop-tools";
import assert from "assert";

const transformIgnore = getJestNodeModulesTransformIgnore({
	file: "esm-packages.json",
});

assert(typeof transformIgnore === "string");
