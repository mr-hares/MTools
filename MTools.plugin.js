/**
 * @name MTools
 * @author mr_hares
 * @authorId 1162007580592320532
 * @version 2.4.2
 * @description Инструменты модератора, использующиеся для облегчения работы модератора
 * @website https://github.com/
 * @source https://github.com/
 */

module.exports = (() => {
    const config = {
        info: {
            name: "MTools",
            authors: [{ name: "mr_hares" }],
            version: "2.4.1",
            description: "Инструменты модератора, использующиеся для облегчения работы модератора | BETA"
        },
        changelog: [
            {
                title: "Исправления",
                type: "fixed",
                items: ["Добавлена панель настроек"]
            }
        ]
    };


    return !global.ZeresPluginLibrary ? class {
        constructor() { this._config = config; }
        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getVersion() { return config.info.version; }

        load() {
            BdApi.UI.showConfirmationModal("Библиотека отсутствует",
                `Для работы ${config.info.name} требуется ZeresPluginLibrary. Установить?`, {
                    confirmText: "Установить",
                    cancelText: "Отмена",
                    onConfirm: () => {
                        require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js",
                            (error, response, body) => {
                                if (error) return BdApi.UI.showToast("Ошибка загрузки", {type: "error"});
                                require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"),
                                    body, () => BdApi.UI.showToast("Библиотека установлена, перезапустите Discord", {type: "success"}));
                            });
                    }
                });
        }
        start() { this.load(); }
        stop() {}
    } : (([Plugin, Api]) => {
        const { DiscordModules, WebpackModules, Patcher } = Api;
        const fs = require("fs");
        const path = require("path");
        const { React } = BdApi;

        return class MTools extends Plugin {
            constructor() {
                super();
                this.contextMenuPatch = null;
                this.MessageActions = null;
                this.ChannelStore = null;
                this.settings = this.loadSettings();
                BdApi.UI.showToast(this.settings, {type: "error"});
                this.options = {
                    "info_for_user": {
                        name: "[3]. Информация о пользователе",
                        options: [{name: "История действий", command: "*alist"}, {name: "Иконка профиля", command: "!аватар"}],
                        type: "info"
                    }
                };
            }

            createGroup(title, options) {
                const group_main = document.createElement('div')
                group_main.style.width = "100%"

                const group_header = document.createElement('div')
                group_header.style.cssText = `
                    width: 96%;
                    background-color: oklab(0.219499 0.00211129 -0.00744916);
                    padding: 10px;
                    cursor: pointer;
                    user-select: none;
                    border: 1px solid #8b8b8bff;
                    border-top-left-radius: 5px;
                    border-top-right-radius: 5px;
                    color: white;
                    font-weight: bold;
                    margin-top: 5px;
                `
                group_header.innerHTML = `<div style="display: flex; justify-content: space-between;">📌<span>${title}</span>📌</div>`

                const group_content = document.createElement('div')
                group_content.style.cssText = `
                    width: 96%;
                    height: 100%;
                    background-color: oklab(30.275000000000002% 0.00196 -0.00689);;
                    padding: 10px;
                    user-select: none;
                    border: 1px solid #8b8b8bff;
                    border-bottom-left-radius: 5px;
                    border-bottom-right-radius: 5px;
                    overflow: hidden;
                `

                Object.keys(options).forEach(e => {
                    group_content.appendChild(this.createInput(options[e].title, options[e].description, options[e].value))
                })

                group_main.appendChild(group_header)
                group_main.appendChild(group_content)

                return group_main;
            }

            createInput(title, description, value) {
                const input_container = document.createElement('div')
                input_container.style.flexDirection = "column"
                input_container.style.marginTop = "5px"

                const input_label = document.createElement('div')
                input_label.innerText = title
                input_label.style.color = "white"
                input_label.style.fontWeight = "bold"

                const input_sublabel = document.createElement('div')
                input_sublabel.innerText = description
                input_sublabel.style.cssText = `
                    color: #a7a7a7ff;
                    font-size: 15px;
                    font-weight: bold;
                    margin-bottom: 5px;
                `

                const input = document.createElement('input')
                input.type = "text"
                input.id = "input_1"
                input.value = value
                input.style.cssText = `
                    width: 95%;
                    height: 30px;
                    border-radius: 5px;
                    border: 1px solid #8b8b8bff;
                    padding: 0 10px;
                    background-color: oklab(0.219499 0.00211129 -0.00744916);
                    color: white;
                    font-weight: bold;
                `

                input_container.appendChild(input_label)
                input_container.appendChild(input_sublabel)
                input_container.appendChild(input)

                return input_container
            }

            getSettingsPanel() {
                const panel = document.createElement('div')

                const channels_ids_group = this.createGroup("ID Каналов", {
                    punish_channel: {
                        title: "Выдача наказания (ID Канала)",
                        description: "# Канал для выдачи наказаний пользователям",
                        value: this.settings.channel_ids.punish_channel
                    },
                    info_channel: {
                        title: "Информация о пользователе (ID Канала)",
                        description: "# Канал для просмотра !аватар",
                        value: this.settings.channel_ids.info_channel
                    },
                    alist_channel: {
                        title: "История действий (ID Канала)",
                        description: "# Канал для просмотра /alist",
                        value: this.settings.channel_ids.alist_channel
                    },
                })

                const command_format_group = this.createGroup("Форматы команд", {
                    warn: {
                        title: "Формат команды /warn",
                        description: "# Доступные переменные: {userId} {reason}",
                        value: this.settings.command_format.warn
                    },
                    mute: {
                        title: "Формат команды /mute",
                        description: "# Доступные переменные: {userId} {time} {reason}",
                        value: this.settings.command_format.mute
                    },
                    vmute: {
                        title: "Формат команды /vmute",
                        description: "# Доступные переменные: {userId} {time} {reason}",
                        value: this.settings.command_format.vmute
                    },
                    ban: {
                        title: "Формат команды /ban",
                        description: "# Доступные переменные: {userId} {time} {reason}",
                        value: this.settings.command_format.ban
                    }
                })

                panel.appendChild(command_format_group)
                panel.appendChild(channels_ids_group)

                return panel;
            }

            loadSettings() {
                const defaultSettings = {
                    channel_ids: {
                        punish_channel: '0',
                        info_channel: '0',
                        alist_channel: '0'
                    },
                    command_format: {
                        warn: '/warn {userId} {reason}',
                        mute: '/mute {userId} {time} {reason}',
                        vmute: '/vmute {userId} {time} {reason}',
                        ban: '/ban {userId} {time} {reason}'
                    }
                };
                return defaultSettings;
            }

            saveSettings(newSettings) {
                BdApi.saveData(this.getName(), 'settings', newSettings);
            }

            MySearchInput(props) {
                const React = BdApi.React;
                return React.createElement("input", {
                    type: "text",
                    placeholder: props.placeholder || "Search...",
                    onChange: props?.onChange,
                    id: props.id
                });
            }


            PunishmentForm() {
                return React.createElement('div', { 
                    className: 'punishment-container',
                    style: {
                        padding: '10px',
                        backgroundColor: '#2f3136',
                        borderRadius: '5px',
                        margin: '10px 0'
                    }
                },
                    React.createElement('div', { style: { marginBottom: '15px' } },
                        React.createElement('label', { 
                            style: {
                                display: 'block',
                                color: '#b9bbbe',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '5px'
                            }
                        }, 'Время наказания'),
                        React.createElement('input', {
                            type: 'text',
                            id: "time-punishment",
                            placeholder: 'Например: 7 дней',
                            style: {
                                width: '90%',
                                padding: '8px 12px',
                                backgroundColor: '#40444b',
                                border: '1px solid #40444b',
                                borderRadius: '3px',
                                color: '#dcddde',
                                fontSize: '14px',
                                outline: 'none'
                            },
                            onFocus: (e) => {
                                e.target.style.borderColor = '#7289da';
                            },
                            onBlur: (e) => {
                                e.target.style.borderColor = '#40444b';
                            }
                        })
                    ),
                    React.createElement('div', null,
                        React.createElement('label', { 
                            style: {
                                display: 'block',
                                color: '#b9bbbe',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '5px'
                            }
                        }, 'Причина наказания'),
                        React.createElement('input', {
                            type: 'text',
                            placeholder: 'Опишите причину наказания',
                            style: {
                                width: '90%',
                                padding: '8px 12px',
                                backgroundColor: '#40444b',
                                border: '1px solid #40444b',
                                borderRadius: '3px',
                                color: '#dcddde',
                                fontSize: '14px',
                                outline: 'none'
                            },
                            onFocus: (e) => {
                                e.target.style.borderColor = '#7289da';
                            },
                            onBlur: (e) => {
                                e.target.style.borderColor = '#40444b';
                            }
                        })
                    ),
                );
            }

            onStart() {
                // const React = BdApi.React;
                
                // // Создаем React элемент правильно
                // const searchInputElement = React.createElement(this.MySearchInput, {
                //     placeholder: "Время мута",
                //     id: "time-punishment-input"
                // });

                // const searchInputElement1 = React.createElement(this.MySearchInput, {
                //     placeholder: "Причина",
                //     id: "reason-punishment-input"
                // });

                // const main = React.createElement("div", { 
                //     class: "main-input-panel"
                // }, searchInputElement, React.createElement("br"), searchInputElement1);
                
                // const m = React.createElement(this.PunishmentForm);
                // const command = "vmute";

                // BdApi.UI.showConfirmationModal(
                //     `Параметры наказания`,
                //     m,
                //     {
                //         confirmText: "Выдать мут",
                //         cancelText: "",
                //         onConfirm: () => console.log(document.getElementById("time-punishment").value)
                //     }
                // );

                try {
                    this.MessageActions = BdApi.Webpack.getModule(m => m?.sendMessage && m?.receiveMessage);
                    this.ChannelStore = BdApi.Webpack.getModule(m => m?.getChannel && m?.getDMFromUserId);

                    if (!this.MessageActions) {
                        BdApi.UI.showToast("Ошибка: MessageActions не найден", {type: "error"});
                        console.error("MessageActions module not found");
                    }

                    if (!this.ChannelStore) {
                        BdApi.UI.showToast("Ошибка: ChannelStore не найден", {type: "error"});
                        console.error("ChannelStore module not found");
                    }

                    if (this.contextMenuPatch) {
                        this.contextMenuPatch();
                        this.contextMenuPatch = null;
                    }

                    this.contextMenuPatch = BdApi.ContextMenu.patch("user-context", (returnValue, props) => {
                        try {
                            const { user } = props;
                            if (!user) return;

                            const children = returnValue?.props?.children;
                            if (!Array.isArray(children)) return;

                            const exists = children.some(child =>
                                child?.props?.id === "khabarovsk-moderation-main"
                            );

                            if (exists) return;

                            const categoryItems = Object.keys(this.rules).map(categoryKey => {
                                const category = this.rules[categoryKey];
                                let options;
                                if (category.type == "punishment") {
                                    options = category.options.map((option, idx) => ({
                                        type: "item",
                                        label: option.name,
                                        id: `punishment-${1}-${idx}`,
                                        action: () => this.executePunishment(user, option.reason, option.command)
                                    }));
                                }
                                if (category.type == "notify") {
                                    options = category.options.map((option, idx) => ({
                                        type: "item",
                                        label: option.name,
                                        id: `notify-${1}-${idx}`,
                                        action: () => this.executeNotify(user, option.time, option.command)
                                    }));
                                }

                                if (category.type == "info") {
                                    options = category.options.map((option, idx) => ({
                                        type: "item",
                                        label: option.name,
                                        id: `info-${1}-${idx}`,
                                        action: () => this.executeInfo(user, option.command)
                                    }));
                                }

                                return {
                                    type: "submenu",
                                    label: category.name,
                                    id: `rule-${categoryKey}-${1}`,
                                    items: options
                                };
                            });

                            const moderationMenuItem = BdApi.ContextMenu.buildItem({
                                type: "submenu",
                                label: "Модерация",
                                id: "khabarovsk-moderation-main",
                                items: categoryItems
                            });

                            children.push(moderationMenuItem);
                        } catch (error) {
                            console.error("MTools patch error:", error);
                        }
                    });

                    BdApi.UI.showToast("Плагин MTools запущен", {type: "info"});
                } catch (error) {
                    console.error("MTools start error:", error);
                    BdApi.UI.showToast(`Ошибка запуска: ${error.message}`, {type: "error"});
                }
            }

            onStop() {
                if (this.contextMenuPatch) {
                    this.contextMenuPatch();
                    this.contextMenuPatch = null;
                }
                BdApi.UI.showToast("Плагин MTools остановлен", {type: "info"});
            }

            executePunishment(user, reason, punishment) {
                let commandContent;

                commandContent = "{command} {userId} {reason}"
                    .replace("{command}", punishment)
                    .replace("{userId}", user.id)
                    .replace("{reason}", reason)

                this.insertTextIntoChat(commandContent)
            }

            executeNotify(user, time, command) {
                if (!time) time = ""
                let messageContent = "{command} {userId} {time}"
                    .replace("{command}", command)
                    .replace("{userId}", user.id)
                    .replace("{time}", time)

                this.MessageActions.sendMessage("1224770921378746510", {
                    content: messageContent,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: []
                }, undefined, {});
                if (time == "") { BdApi.UI.showToast(`Пользователь ${user} уведомлён об окончание времени на смену профиля`, {type: "info"}); }
                else { BdApi.UI.showToast(`Пользователь ${user} уведомлён о смене профиля. Время для смены: ${time} минут`, {type: "info"}) };
            }

            executeInfo(user, command) {
                let messageContent = "{command} {userId}"
                    .replace("{command}", command)
                    .replace("{userId}", user.id)

                this.MessageActions.sendMessage("607260179334955049", {
                    content: messageContent,
                    tts: false,
                    invalidEmojis: [],
                    validNonShortcutEmojis: []
                }, undefined, {});
                if (command == "*alist") { BdApi.UI.showToast(`Просмотр истории действий пользователя ${user}`, {type: "info"}); }
                else { BdApi.UI.showToast(`Просмотр иконки профиля пользователя ${user}`, {type: "info"}) };
            }

            insertTextIntoChat(text) {
                try {
                    navigator.clipboard.writeText(text).then(() => {
                        BdApi.UI.showToast(`Команда успешно скопирована в буфер обмена`, {type: "info", timeout: 5000});
                    }).catch(err => {
                        BdApi.UI.showToast(`Ошибка: ${error.message}`, {type: "error"});
                    })
                } catch (error) {
                    console.error("Ошибка вставки текста:", error);
                    BdApi.UI.showToast(`Ошибка: ${error.message}`, {type: "error"});
                }
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
