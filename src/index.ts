export {FW_DOCUMENT_VERSION} from "./schema/index.js"
export type {
    AddButtonConstructor,
    AddButtonLike,
    AddButtonOptions,
    BibDB,
    BibDBEntries,
    BibDBEntry,
    CommentData,
    Contributor,
    ContributorsPartOptions,
    CreateTagEditor,
    CSL,
    CiteprocInstance,
    DocSettings,
    E2EEOptions,
    ExportDoc,
    ExportMetadata,
    ExporterOptions,
    FidusDoc,
    FidusMark,
    FidusNode,
    GetNode,
    GetPos,
    ImageDB,
    ImageDBEntries,
    ImageDBEntry,
    JSONValue,
    NativeImporterBackend,
    NextSelection,
    NodeAttrs,
    PartNodeAttrs,
    SaveCopyE2EE,
    TagInputRefs,
    TagsPartOptions,
    Template,
    TemplateFiles,
    Track,
    UploadRevision,
    User
} from "./types.js"

// State plugins
export {
    AddButton,
    ContributorsPartView
} from "./state_plugins/contributor_input/index.js"
export {
    TagsPartView,
    createTagEditor,
    tagInputReferences
} from "./state_plugins/tag_input/index.js"
export {nextSelection, submitTag} from "./state_plugins/tag_input/index.js"
export {placeholderPlugin, pastePlugin} from "./state_plugins/tag_input/index.js"
