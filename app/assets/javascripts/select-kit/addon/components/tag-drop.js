import { equal, gte, readOnly } from "@ember/object/computed";
import { i18n, setting } from "discourse/lib/computed";
import ComboBoxComponent from "select-kit/components/combo-box";
import DiscourseURL, { getCategoryAndTagUrl } from "discourse/lib/url";
import TagsMixin from "select-kit/mixins/tags";
import { computed } from "@ember/object";
import { makeArray } from "discourse-common/lib/helpers";

export const NO_TAG_ID = "no-tags";
export const ALL_TAGS_ID = "all-tags";
export const NONE_TAG_ID = "none";

export default ComboBoxComponent.extend(TagsMixin, {
  pluginApiIdentifiers: ["tag-drop"],
  classNameBindings: ["categoryStyle", "tagClass"],
  classNames: ["tag-drop"],
  value: readOnly("tagId"),
  tagName: "li",
  categoryStyle: setting("category_style"),
  maxTagSearchResults: setting("max_tag_search_results"),
  sortTagsAlphabetically: setting("tags_sort_alphabetically"),

  selectKitOptions: {
    allowAny: false,
    caretDownIcon: "caret-right",
    caretUpIcon: "caret-down",
    fullWidthOnMobile: true,
    filterable: true,
    headerComponent: "tag-drop/tag-drop-header",
    autoInsertNoneItem: false,
  },

  noTagsSelected: equal("tagId", NONE_TAG_ID),

  filterable: gte("content.length", 15),

  modifyNoSelection() {
    if (this.noTagsSelected) {
      return this.defaultItem(NO_TAG_ID, this.noTagsLabel);
    } else {
      return this.defaultItem(ALL_TAGS_ID, this.allTagsLabel);
    }
  },

  modifySelection(content) {
    if (this.tagId) {
      if (this.noTagsSelected) {
        content = this.defaultItem(NO_TAG_ID, this.noTagsLabel);
      } else {
        content = this.defaultItem(this.tagId, this.tagId);
      }
    }

    return content;
  },

  tagClass: computed("tagId", function () {
    return this.tagId ? `tag-${this.tagId}` : "tag_all";
  }),

  allTagsLabel: i18n("tagging.selector_all_tags"),

  noTagsLabel: i18n("tagging.selector_no_tags"),

  modifyComponentForRow() {
    return "tag-row";
  },

  shortcuts: computed("tagId", function () {
    const shortcuts = [];

    if (this.tagId !== NONE_TAG_ID) {
      shortcuts.push({
        id: NO_TAG_ID,
        name: this.noTagsLabel,
      });
    }

    if (this.tagId) {
      shortcuts.push({ id: ALL_TAGS_ID, name: this.allTagsLabel });
    }

    return shortcuts;
  }),

  topTags: computed(
    "firstCategory",
    "secondCategory",
    "site.category_top_tags.[]",
    "site.top_tags.[]",
    function () {
      if (this.currentCategory && this.site.category_top_tags) {
        return this.site.category_top_tags;
      }

      return this.site.top_tags;
    }
  ),

  content: computed("topTags.[]", "shortcuts.[]", function () {
    if (this.sortTagsAlphabetically && this.topTags) {
      return this.shortcuts.concat(this.topTags.sort());
    } else {
      return this.shortcuts.concat(makeArray(this.topTags));
    }
  }),

  search(filter) {
    if (filter) {
      const data = {
        q: filter,
        limit: this.maxTagSearchResults,
      };

      return this.searchTags("/tags/filter/search", data, this._transformJson);
    } else {
      return (this.content || []).map((tag) => {
        if (tag.id && tag.name) {
          return tag;
        }
        return this.defaultItem(tag, tag);
      });
    }
  },

  _transformJson(context, json) {
    return json.results
      .sort((a, b) => a.id > b.id)
      .map((r) => {
        const content = context.defaultItem(r.id, r.text);
        content.targetTagId = r.target_tag || r.id;
        content.count = r.count;
        content.pmCount = r.pm_count;
        return content;
      });
  },

  actions: {
    onChange(tagId, tag) {
      if (tagId === NO_TAG_ID) {
        tagId = NONE_TAG_ID;
      } else if (tagId === ALL_TAGS_ID) {
        tagId = null;
      } else if (tag && tag.targetTagId) {
        tagId = tag.targetTagId;
      }

      DiscourseURL.routeToUrl(
        getCategoryAndTagUrl(this.currentCategory, !this.noSubcategories, tagId)
      );
    },
  },
});
