/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-correct-yarn-formatting",
factory: function (require) {
"use strict";var plugin=(()=>{var h=(s,e)=>()=>(e||s((e={exports:{}}).exports,e),e.exports);var p=h(n=>{Object.defineProperty(n,"__esModule",{value:!0});n.name=void 0;n.factory=y;n.name="correct-yarn-formatting";var d={correctFormattingLogs:{description:`Can be used to set the verbosity of the plugin's logs.
 debug - shows everything 
 notice - only shows a notice when the plugin stops a bad format and links to the feature request
 none - shows nothing`,type:"STRING",default:"notice"}},c=class{constructor(e){this.logLevel=e.configuration.get("correctFormattingLogs")||"notice"}log(e){this.logLevel!=="none"&&console.log(`[${n.name}] ${e}`)}debug(e){this.logLevel==="debug"&&this.log(e)}notice(e){(this.logLevel==="notice"||this.logLevel==="debug")&&this.log(e)}};function y(s){let{readFileSync:e,writeFileSync:f}=s("fs"),{join:l}=s("path"),g=[];return{configuration:d,hooks:{validateProject(i){let r=new c(i),o=l(i.cwd,"package.json");r.debug(`Reading pre-formatted file: ${o}`),g.push([o,e(o).toString()]),i.workspaces.forEach(a=>{let t=l(a.cwd,"package.json");r.debug(`Reading pre-formatted file: ${t}`),g.push([t,e(t).toString()])})},afterAllInstalled(i){let r=new c(i),o=!1;g.forEach(([a,t])=>{let u=e(a).toString();t&&t!==u&&JSON.stringify(JSON.parse(u))===JSON.stringify(JSON.parse(t))&&(f(a,t),r.debug(`Resetting unnecessary format for ${a}`),o=!0)}),o&&r.notice(`Resetting unnecessary formatting by yarn!
	If you would like this to be a main feature please comment here: https://github.com/yarnpkg/berry/discussions/2636`)}}}}});return p();})();
return plugin;
}
};
