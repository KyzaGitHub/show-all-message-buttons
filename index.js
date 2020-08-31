const { Plugin } = require("powercord/entities");
const { React, getModule } = require("powercord/webpack");
const { inject, uninject } = require("powercord/injector");
const { findInReactTree } = require("powercord/util");
const dispatcher = getModule(["dirtyDispatch"], false);

const MiniPopover = getModule(
	(m) => m.default && m.default.displayName === "MiniPopover",
	false
);
const ReactButton = require("./components/ReactButton")(MiniPopover);

const MessageActions = getModule(["deleteMessage"], false);

const { getMessages } = getModule(["getMessages"], false);
const { getChannelId } = getModule(["getLastSelectedChannelId"], false);

let emojiPickerMessage = "";
let addedListener = false;

module.exports = class ShowAllMessageButtons extends Plugin {
	async startPlugin() {
		inject(
			"show-all-message-buttons-mini-popover",
			MiniPopover,
			"default",
			(args, res) => {
				const props = findInReactTree(
					res,
					(r) =>
						r &&
						r.hasOwnProperty("expanded") &&
						r.hasOwnProperty("message")
				);
				if (!props) return res;

				// Force the buttons to be expanded.
				props.expanded = true;
				// I don't know why this is needed, but it is.
				try {
					res.props.children[
						res.props.children.length - 1
					].props.expanded = true;
				} catch {}

				// I am Really NOT Amused.
				// Add my own react button because it's removed for some reason.
				// TODO: Make the message stay "hovered" when the emoji picker is open.
				if (props.message.id == emojiPickerMessage) {
					props.showEmojiPicker = true;
					try {
						res.props.children[
							res.props.children.length - 1
						].props.showEmojiPicker = true;
					} catch {}
					if (!addedListener) {
						addedListener = true;

						// Listen for clicks and only stop listening once the picker is removed.
						const pickerClick = (event) => {
							const onPicker =
								event.path.filter(
									(element) =>
										element.id == "emoji-picker-tab-panel"
								).length == 1;
							if ((onPicker && !event.shiftKey) || !onPicker) {
								removePickerClick();
								addedListener = false;
								emojiPickerMessage = "";
								// Timeout or the reaction won't be added.
								setTimeout(() => {
									this.updateMessage(props.message, false);
								}, 0);
							}
						};
						const removePickerClick = () => {
							document.body.removeEventListener(
								"click",
								pickerClick
							);
						};

						document.body.addEventListener("click", pickerClick);
					}
				}
				res.props.children.splice(
					res.props.children.length - 2,
					0,
					React.createElement(ReactButton, {
						showEmojiPicker: (show) => {
							this.updateMessage(props.message, show);
						},
					})
				);

				return res;
			}
		);
		MiniPopover.default.displayName = "MiniPopover";

		inject(
			"show-all-message-buttons-delete-message",
			MessageActions,
			"deleteMessage",
			(args) => {
				const props = findInReactTree(
					args,
					(r) => r && r.hasOwnProperty("shiftKey")
				);
				if (!props) return args;

				props.shiftKey = true;

				return args;
			},
			true
		);

		this.rerenderMessages();
	}

	pluginWillUnload() {
		uninject("show-all-message-buttons-mini-popover");
		uninject("show-all-message-buttons-delete-message");
		this.rerenderMessages();
	}

	rerenderMessages() {
		const currentChannelMessages = getMessages(getChannelId())._array;
		for (let i = 0, il = currentChannelMessages.length; i < il; i++) {
			const message = currentChannelMessages[i];
			this.updateMessage(
				{
					id: message.id,
					channel_id: message.channel_id,
					author: message.author,
				},
				false
			);
		}
	}

	updateMessage(message, showEmojiPicker) {
		emojiPickerMessage = showEmojiPicker ? message.id : "";
		dispatcher.dirtyDispatch({
			type: "MESSAGE_UPDATE",
			message,
		});
	}
};
