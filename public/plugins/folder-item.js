const FolderItem = async (props) => {
    const { folder, isSubfolder = false, accountEmail = null, tagName = null, state } = props;

    // Add error handling for undefined folder
    if (!folder) {
        console.error('FolderItem: folder is undefined', props);
        return render({
            tagName: "div",
            attributes: { class: "folder-item error" },
            children: ["Error: Invalid folder"]
        });
    }

    return render({
        tagName: "div",
        attributes: {
            class() {
                let classes = isSubfolder ? "folder-item subfolder" : "folder-item";
                // Standardized folderId logic
                const folderId = tagName ? `category-${tagName}` : (accountEmail ? `account-${accountEmail.replace('@', '-at-')}` : `folder-${folder.name}`);
                if (state.selectedFolderId === folderId) {
                    classes += " selected"; // Standardized to 'selected'
                }
                return classes;
            },
            onclick() {
                if (tagName) {
                    // Use folder.originalTag if it exists (for contacts/calendar), otherwise tagName
                    state.selectFolder('tag', folder.originalTag || tagName);
                } else if (accountEmail) {
                    state.selectFolder('account', accountEmail);
                } else {
                    state.selectFolder('folder', folder.name);
                }
            }
        },
        children: [
            {
                tagName: "i",
                attributes: {
                    class: (folder && folder.icon) || "fas fa-folder"
                }
            },
            {
                tagName: "span",
                attributes: {
                    class: "folder-name"
                },
                children: [(folder && folder.name) || "Unknown"]
            },
            {
                tagName: "span",
                attributes: {
                    class: "folder-count"
                },
                children: [() => {
                    if (typeof state.getCount !== 'function') {
                        console.error("FolderItem: `state.getCount` is not a function.", props);
                        return "";
                    }
                    const count = state.getCount({ folder, accountEmail, tagName, state });
                    return count > 0 ? count.toString() : "";
                }]
            }
        ]
    });
};