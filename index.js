const { Plugin } = require("powercord/entities");
const { React, getModule } = require("powercord/webpack");
const { inject, uninject } = require("powercord/injector");
const { findInReactTree } = require("powercord/util");

const MiniPopover = getModule(
	(m) => m.default && m.default.displayName === "MiniPopover",
	false
);

module.exports = class ShowAllMessageButtons extends Plugin {
	async startPlugin() {
		this.loadStylesheet("style.scss");

		inject(
			"show-all-message-buttons-mini-popover",
			MiniPopover,
			"default",
			(args, res) => {
				const props = findInReactTree(
					res,
					(r) => r && r.hasOwnProperty("expanded") && r.message
				);
				if (!props) return res;

				props.expanded = true;
				
				return res;
			}
		);
		MiniPopover.default.displayName = "MiniPopover";
	}

	pluginWillUnload() {
		uninject("show-all-message-buttons-mini-popover");
	}
};
