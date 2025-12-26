const state = {
  keyLists: {},
  collections: {},
  sortOption: 'updatedDesc',
  searchQuery: '',
  activeFilter: null,
  keyMode: 'numeric', // 'numeric' | 'alpha'
  hoverContext: null, // { kind: 'send'|'copy', item: {title,url,favIconUrl,icon}, source: {type:'slot'|'collection', key, index} }
  viewMode: 'slots' // 'slots' | 'collections'
};

const elements = {};

const MANAGER_I18N_FALLBACK = {
  manager_title: 'Ghost In The Chrome Manager',
  manager_subtitle: 'Organize and edit saved pages and tab collections',
  manager_support_button: 'Support the creator',
  manager_refresh_button: 'Refresh',
  manager_export_all_button: 'Export all data (JSON)',
  manager_sort_label: 'Sort collections',
  manager_sort_updated_desc: 'Updated (newest first)',
  manager_sort_updated_asc: 'Updated (oldest first)',
  manager_sort_name_asc: 'Name (A → Z)',
  manager_sort_name_desc: 'Name (Z → A)',
  manager_search_label: 'Search',
  manager_search_placeholder: 'Search by title, URL, note, or key',
  manager_tags_label: 'Suggested filters',
  manager_tag_recent: 'Recently saved',
  manager_tag_large: 'Many tabs',
  manager_tag_with_note: 'With note',
  manager_section_slots: 'Number keys (window sets)',
  manager_section_collections: 'Alphabet keys (tab collections)',
  manager_collection_note_placeholder: 'Add a note',
  manager_slot_clear_button: 'Clear slot',
  manager_collection_open_button: 'Restore',
  manager_collection_export_button: 'Save JSON',
  manager_collection_delete_button: 'Delete',
  manager_tab_open: 'Open',
  manager_tab_remove: 'Remove',
  manager_tab_send: 'Send',
  manager_tab_copy: 'Copy',
  manager_sendcopy_help_title: 'Send / Copy',
  manager_sendcopy_help_body: 'Hover over Send or Copy, then press a key to register this tab. Tab toggles modes: [1–9] for slots, [a–z] for collections. Send moves, Copy duplicates.',
  manager_keymode_numeric: 'Mode: 1–9',
  manager_keymode_alpha: 'Mode: a–z',
  manager_hint_press_key: 'Press a key',
  manager_toast_added: 'Added to "$1".',
  manager_toast_moved: 'Moved to "$1".',
  manager_toast_duplicate: 'Already exists in "$1".',
  manager_toast_error: 'Operation failed.',
  manager_toast_refresh_success: 'Latest data loaded.',
  manager_empty_slots: 'No saved pages or window sets yet.',
  manager_slot_no_tabs: 'No tabs in this slot.',
  manager_slot_no_pages: 'No pages in this slot.',
  manager_empty_collections: 'No collections saved yet.',
  manager_no_collections_match: 'No collections match the current filters.',
  manager_list_no_tabs: 'No tabs available.',
  manager_default_window_set_name: 'Window set $1',
  manager_default_collection_name: 'Collection $1',
  manager_slot_title: 'Key $1',
  manager_count_tabs: '$1 tab(s)',
  manager_count_items: '$1 item(s)',
  manager_confirm_clear_collection_slot: 'Remove $2 tab(s) saved on key "$1"?',
  manager_confirm_clear_slot: 'Remove $2 item(s) saved on key "$1"?',
  manager_toast_slot_collection_cleared: 'Cleared window set on key "$1".',
  manager_toast_slot_cleared: 'Cleared saved pages on key "$1".',
  manager_confirm_remove_slot_item: 'Remove "$1" from key "$2"?',
  manager_toast_slot_item_removed: 'Removed the page.',
  manager_confirm_remove_collection_item: 'Remove "$1" from collection "$2"?',
  manager_toast_collection_tab_removed: 'Removed the tab.',
  manager_confirm_delete_collection: 'Delete collection "$1" completely?',
  manager_toast_collection_removed: 'Deleted collection "$1".',
  manager_toast_no_tabs_to_open: 'No tabs to restore in this collection.',
  manager_toast_open_failed: 'Failed to restore tabs.',
  manager_toast_collection_exported: 'Exported collection "$1".',
  manager_toast_export_all_success: 'Exported all data.',
  manager_slot_count_summary: '$1 key(s) / $2 item(s)',
  manager_collection_count_summary: '$1 collection(s) / $2 tab(s)',
  manager_timestamp_unknown: 'Updated -',
  common_close: 'Close'
};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  applyStaticTranslations();
  bindEvents();
  await loadData();
});

function t(key, substitutions = []) {
  let localized = null;
  if (typeof chrome !== 'undefined' && chrome.i18n && typeof chrome.i18n.getMessage === 'function') {
    try {
      const substitutionArg =
        substitutions.length === 0
          ? undefined
          : substitutions.length === 1
            ? substitutions[0]
            : substitutions;
      localized = chrome.i18n.getMessage(key, substitutionArg);
    } catch (error) {
      console.warn('[Manager][i18n] getMessage failed:', key, error);
    }
  }

  if (localized) {
    return localized;
  }

  const fallback = MANAGER_I18N_FALLBACK[key] || key;
  return substitutions.reduce(
    (result, value, index) => result.replace(new RegExp(`\\$${index + 1}`, 'g'), value ?? ''),
    fallback
  );
}

function getLocale() {
  if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) {
    return chrome.i18n.getUILanguage();
  }
  return navigator.language || 'en';
}

function renderEmptyMessage(container, messageKey, substitutions = []) {
  container.innerHTML = '';
  const emptyNode = document.createElement('p');
  emptyNode.className = 'empty-text';
  emptyNode.textContent = t(messageKey, substitutions);
  container.appendChild(emptyNode);
}

function cacheElements() {
  elements.slotList = document.getElementById('slot-list');
  elements.collectionList = document.getElementById('collection-list');
  elements.slotCount = document.getElementById('slot-count');
  elements.collectionCount = document.getElementById('collection-count');
  elements.sortSelect = document.getElementById('collection-sort');
  elements.searchInput = document.getElementById('search-input');
  elements.supportLink = document.getElementById('support-link');
  elements.refreshBtn = document.getElementById('refresh-data');
  elements.exportAllBtn = document.getElementById('export-all');
  elements.tagButtons = Array.from(document.querySelectorAll('.ghost-tag'));
  elements.slotTemplate = document.getElementById('slot-card-template');
  elements.collectionTemplate = document.getElementById('collection-card-template');
  elements.tabTemplate = document.getElementById('tab-item-template');
  elements.toastContainer = document.getElementById('toast-container');
  elements.modeSlots = document.getElementById('mode-slots');
  elements.modeCollections = document.getElementById('mode-collections');
}

function applyStaticTranslations() {
  // ページタイトル
  const pageTitle = document.getElementById('manager-page-title');
  if (pageTitle) pageTitle.textContent = t('manager_title');
  document.title = t('manager_title');

  const title = document.getElementById('manager-title');
  if (title) title.textContent = t('manager_title');

  const subtitle = document.getElementById('manager-subtitle');
  if (subtitle) subtitle.textContent = t('manager_subtitle');

  if (elements.supportLink) {
    const supportText = elements.supportLink.querySelector('#manager-support-text');
    if (supportText) {
      supportText.textContent = t('manager_support_button');
    } else {
    elements.supportLink.textContent = t('manager_support_button');
    }
    elements.supportLink.setAttribute('aria-label', t('manager_support_button'));
  }

  if (elements.refreshBtn) {
    const refreshText = elements.refreshBtn.querySelector('#manager-refresh-text');
    if (refreshText) {
      refreshText.textContent = t('manager_refresh_button');
    } else {
    elements.refreshBtn.textContent = t('manager_refresh_button');
    }
    elements.refreshBtn.setAttribute('aria-label', t('manager_refresh_button'));
  }

  if (elements.exportAllBtn) {
    const exportAllText = elements.exportAllBtn.querySelector('#manager-export-all-text');
    if (exportAllText) {
      exportAllText.textContent = t('manager_export_all_button');
    } else {
    elements.exportAllBtn.textContent = t('manager_export_all_button');
    }
    elements.exportAllBtn.setAttribute('aria-label', t('manager_export_all_button'));
  }

  const sortLabel = document.getElementById('manager-sort-label');
  if (sortLabel) sortLabel.textContent = t('manager_sort_label');

  if (elements.sortSelect) {
    const sortOptions = elements.sortSelect.options;
    const updatedDescOption = document.getElementById('manager-sort-option-updated-desc');
    const updatedAscOption = document.getElementById('manager-sort-option-updated-asc');
    const nameAscOption = document.getElementById('manager-sort-option-name-asc');
    const nameDescOption = document.getElementById('manager-sort-option-name-desc');
    
    if (updatedDescOption) updatedDescOption.textContent = t('manager_sort_updated_desc');
    else if (sortOptions[0]) sortOptions[0].textContent = t('manager_sort_updated_desc');
    
    if (updatedAscOption) updatedAscOption.textContent = t('manager_sort_updated_asc');
    else if (sortOptions[1]) sortOptions[1].textContent = t('manager_sort_updated_asc');
    
    if (nameAscOption) nameAscOption.textContent = t('manager_sort_name_asc');
    else if (sortOptions[2]) sortOptions[2].textContent = t('manager_sort_name_asc');
    
    if (nameDescOption) nameDescOption.textContent = t('manager_sort_name_desc');
    else if (sortOptions[3]) sortOptions[3].textContent = t('manager_sort_name_desc');
    
    elements.sortSelect.setAttribute('aria-label', t('manager_sort_label'));
  }

  const searchLabel = document.getElementById('manager-search-label');
  if (searchLabel) searchLabel.textContent = t('manager_search_label');

  if (elements.searchInput) {
    elements.searchInput.placeholder = t('manager_search_placeholder');
    elements.searchInput.setAttribute('aria-label', t('manager_search_placeholder'));
  }

  const tagsLabel = document.getElementById('manager-tags-label');
  if (tagsLabel) tagsLabel.textContent = t('manager_tags_label');

  const tagKeyMap = {
    recent: 'manager_tag_recent',
    large: 'manager_tag_large',
    withNote: 'manager_tag_with_note'
  };
  elements.tagButtons.forEach((button) => {
    const key = tagKeyMap[button.dataset.filter];
    if (key) {
      const textSpan = button.querySelector('span');
      if (textSpan) {
        textSpan.textContent = t(key);
      } else {
      button.textContent = t(key);
      }
      button.setAttribute('aria-pressed', 'false');
    }
  });

  const listSectionTitle = document.getElementById('manager-list-section-title');
  if (listSectionTitle) {
    // モードに応じてタイトルを設定（初期状態ではスロットモード）
    listSectionTitle.textContent = state.viewMode === 'slots' ? t('manager_section_slots') : t('manager_section_collections');
  }

  const slotSectionTitle = document.getElementById('manager-slot-section-title');
  if (slotSectionTitle) slotSectionTitle.textContent = t('manager_section_slots');

  const collectionSectionTitle = document.getElementById('manager-collection-section-title');
  if (collectionSectionTitle) collectionSectionTitle.textContent = t('manager_section_collections');
}

function bindEvents() {
  elements.sortSelect.addEventListener('change', () => {
    state.sortOption = elements.sortSelect.value;
    renderCollections();
  });

  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLocaleLowerCase(getLocale());
    renderCollections();
  });

  elements.refreshBtn.addEventListener('click', async () => {
    await loadData();
    showToast(t('manager_toast_refresh_success'), 'success');
  });

  elements.exportAllBtn.addEventListener('click', () => {
    exportAllData();
  });

  elements.tagButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      if (state.activeFilter === filter) {
        state.activeFilter = null;
        elements.tagButtons.forEach((btn) => {
          btn.classList.remove('ghost-tag--active');
          btn.setAttribute('aria-pressed', 'false');
        });
      } else {
        state.activeFilter = filter;
        elements.tagButtons.forEach((btn) => {
          const isActive = btn === button;
          btn.classList.toggle('ghost-tag--active', isActive);
          btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }
      renderCollections();
    });
  });

  if (elements.modeSlots && elements.modeCollections) {
    elements.modeSlots.addEventListener('click', () => switchViewMode('slots'));
    elements.modeCollections.addEventListener('click', () => switchViewMode('collections'));
  }
}

async function loadData() {
  const { keyLists = {}, collections = {} } = await storageGet(['keyLists', 'collections']);
  state.keyLists = keyLists;
  state.collections = collections;
  renderAll();
}

function renderAll() {
  if (state.viewMode === 'slots') {
    document.getElementById('slot-list')?.removeAttribute('hidden');
    document.getElementById('collection-list')?.setAttribute('hidden', 'true');
    renderSlots();
  } else {
    document.getElementById('collection-list')?.removeAttribute('hidden');
    document.getElementById('slot-list')?.setAttribute('hidden', 'true');
    renderCollections();
  }
  updateCounts();
}

function renderSlots() {
  elements.slotList.innerHTML = '';

  const legacyKeys = Object.keys(state.keyLists).filter((key) => /^[1-9]$/.test(key));
  const collectionDigitKeys = Object.keys(state.collections).filter(
    (key) => /^[1-9]$/.test(key) && Array.isArray(state.collections[key]?.tabs)
  );

  const keys = Array.from(new Set([...legacyKeys, ...collectionDigitKeys])).sort(
    (a, b) => Number(a) - Number(b)
  );

  if (keys.length === 0) {
    renderEmptyMessage(elements.slotList, 'manager_empty_slots');
    return;
  }

  keys.forEach((key) => {
    const collection = state.collections[key];
    const isCollectionSlot = Array.isArray(collection?.tabs);
    const entries = isCollectionSlot
      ? collection.tabs
      : (state.keyLists[key] || []).slice().sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

    const card = elements.slotTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.key = key;

    card.querySelector('.ghost-card__key').textContent = `#${key}`;
    const slotName = isCollectionSlot
      ? (collection?.name && collection.name.trim().length > 0
          ? collection.name
          : t('manager_default_window_set_name', [key]))
      : t('manager_slot_title', [key]);
    card.querySelector('.ghost-card__name').textContent = slotName;
    const countKey = isCollectionSlot ? 'manager_count_tabs' : 'manager_count_items';
    card.querySelector('.ghost-card__count').textContent = t(countKey, [entries.length]);

    const removeAllBtn = card.querySelector('.ghost-card__remove');
    const clearText = removeAllBtn.querySelector('.manager-slot-clear-text');
    if (clearText) {
      clearText.textContent = t('manager_slot_clear_button');
    } else {
    removeAllBtn.textContent = t('manager_slot_clear_button');
    }
    removeAllBtn.addEventListener('click', () => clearSlot(key, { isCollectionSlot }));

    const listContainer = card.querySelector('.ghost-card__body');
    listContainer.innerHTML = '';
    if (entries.length === 0) {
      const emptyKey = isCollectionSlot ? 'manager_slot_no_tabs' : 'manager_slot_no_pages';
      renderEmptyMessage(listContainer, emptyKey);
    } else {
      entries.forEach((item, index) => {
        const tabNode = renderTabItem({
          title: item.title || item.url,
          url: item.url,
          favIconUrl: isCollectionSlot ? item.favIconUrl : item.icon,
          key,
          index,
          type: isCollectionSlot ? 'collection' : 'slot'
        });
        listContainer.appendChild(tabNode);
      });
    }

    elements.slotList.appendChild(card);
  });
}

function renderCollections() {
  elements.collectionList.innerHTML = '';

  const collectionArray = Object.entries(state.collections)
    .filter(([key]) => /^[a-z]$/.test(key));

  if (collectionArray.length === 0) {
    renderEmptyMessage(elements.collectionList, 'manager_empty_collections');
    return;
  }

  const filtered = collectionArray
    .map(([key, value]) => ({ key, ...value }))
    .filter(filterCollection);

  // 固定順（a → z）で表示する
  const sorted = filtered.slice().sort((a, b) => a.key.localeCompare(b.key, 'en'));

  if (sorted.length === 0) {
    renderEmptyMessage(elements.collectionList, 'manager_no_collections_match');
    return;
  }

  sorted.forEach((collection) => {
    const card = elements.collectionTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.key = collection.key;

    card.querySelector('.ghost-card__key').textContent = `@${collection.key}`;
    const nameInput = card.querySelector('.ghost-card__name-input');
    const defaultName = collection.name && collection.name.trim().length > 0
      ? collection.name
      : t('manager_default_collection_name', [collection.key.toUpperCase ? collection.key.toUpperCase() : collection.key]);
    nameInput.value = defaultName;
    nameInput.addEventListener('blur', () => {
      const updatedName = nameInput.value.trim() || defaultName;
      updateCollectionMeta(collection.key, { name: updatedName });
    });

    const noteInput = card.querySelector('.ghost-card__note-input');
    noteInput.value = collection.note || '';
    noteInput.placeholder = t('manager_collection_note_placeholder');
    noteInput.addEventListener('blur', () => {
      updateCollectionMeta(collection.key, { note: noteInput.value.trim() });
    });

    card.querySelector('.ghost-card__count').textContent = t('manager_count_tabs', [collection.tabs?.length || 0]);
    card.querySelector('.ghost-card__timestamp').textContent = formatTimestamp(collection.updatedAt || collection.savedAt);

    const openBtn = card.querySelector('.ghost-card__open');
    openBtn.addEventListener('click', () => openCollection(collection.key));
    const openText = openBtn.querySelector('.manager-collection-open-text');
    if (openText) {
      openText.textContent = t('manager_collection_open_button');
    } else {
    openBtn.textContent = t('manager_collection_open_button');
    }

    const exportBtn = card.querySelector('.ghost-card__export');
    exportBtn.addEventListener('click', () => exportCollection(collection.key));
    const exportText = exportBtn.querySelector('.manager-collection-export-text');
    if (exportText) {
      exportText.textContent = t('manager_collection_export_button');
    } else {
    exportBtn.textContent = t('manager_collection_export_button');
    }

    const deleteBtn = card.querySelector('.ghost-card__delete');
    deleteBtn.addEventListener('click', () => removeCollection(collection.key));
    const deleteText = deleteBtn.querySelector('.manager-collection-delete-text');
    if (deleteText) {
      deleteText.textContent = t('manager_collection_delete_button');
    } else {
    deleteBtn.textContent = t('manager_collection_delete_button');
    }

    const listContainer = card.querySelector('.ghost-card__body');
    const tabs = collection.tabs || [];
    listContainer.innerHTML = '';
    if (tabs.length === 0) {
      renderEmptyMessage(listContainer, 'manager_list_no_tabs');
    } else {
      tabs.forEach((tab, index) => {
        const tabNode = renderTabItem({
          title: tab.title || tab.url,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          key: collection.key,
          index,
          type: 'collection'
        });
        listContainer.appendChild(tabNode);
      });
    }

    elements.collectionList.appendChild(card);
  });
}

function switchViewMode(mode) {
  if (mode !== 'slots' && mode !== 'collections') return;
  if (state.viewMode === mode) return;
  state.viewMode = mode;
  if (elements.modeSlots && elements.modeCollections) {
    const slotsActive = mode === 'slots';
    elements.modeSlots.classList.toggle('ghost-tab--active', slotsActive);
    elements.modeSlots.setAttribute('aria-selected', slotsActive ? 'true' : 'false');
    elements.modeSlots.tabIndex = slotsActive ? 0 : -1;
    elements.modeCollections.classList.toggle('ghost-tab--active', !slotsActive);
    elements.modeCollections.setAttribute('aria-selected', !slotsActive ? 'true' : 'false');
    elements.modeCollections.tabIndex = !slotsActive ? 0 : -1;
  }
  // セクションタイトルを更新
  const listSectionTitle = document.getElementById('manager-list-section-title');
  if (listSectionTitle) {
    listSectionTitle.textContent = mode === 'slots' ? t('manager_section_slots') : t('manager_section_collections');
  }
  // preserve scroll positions per list
  preserveAndRenderAll();
}

function renderTabItem({ title, url, favIconUrl, key, index, type }) {
  const node = elements.tabTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.key = key;
  node.dataset.index = index;
  node.dataset.type = type;

  const favicon = node.querySelector('.tab-item__favicon');
  if (favIconUrl) {
    favicon.src = favIconUrl;
  } else {
    favicon.style.display = 'none';
  }

  node.querySelector('.tab-item__title').textContent = title;
  const link = node.querySelector('.tab-item__url');
  link.textContent = url;
  link.href = url;

  const openButton = node.querySelector('.tab-item__open');
    const openText = openButton.querySelector('.manager-tab-open-text');
    if (openText) {
      openText.textContent = t('manager_tab_open');
    } else {
  openButton.textContent = t('manager_tab_open');
    }
  openButton.setAttribute('aria-label', t('manager_tab_open'));
  openButton.addEventListener('click', () => {
    window.open(url, '_blank', 'noopener');
  });

  const removeButton = node.querySelector('.tab-item__remove');
    const removeText = removeButton.querySelector('.manager-tab-remove-text');
    if (removeText) {
      removeText.textContent = t('manager_tab_remove');
    } else {
  removeButton.textContent = t('manager_tab_remove');
    }
  removeButton.setAttribute('aria-label', t('manager_tab_remove'));
  removeButton.addEventListener('click', () => {
    if (type === 'slot') {
      removeSlotItem(key, index);
    } else {
      removeCollectionItem(key, index);
    }
  });

  // Send / Copy zones
  const actions = node.querySelector('.tab-item__actions');
  const makeZone = (kind) => {
    const zone = document.createElement('button');
    zone.type = 'button';
    zone.className = `ghost-btn ghost-btn--ghost ghost-btn--xs tab-item__${kind}`;
    zone.textContent = kind === 'send' ? t('manager_tab_send') : t('manager_tab_copy');
    // 実際のキー（key）が1-9かa-zかで判断
    // 1-9キーの場合は numeric モード、a-zキーの場合は alpha モード
    const isNumericKey = /^[1-9]$/.test(key);
    const appropriateMode = isNumericKey ? 'numeric' : 'alpha';
    zone.title = `${t(appropriateMode === 'numeric' ? 'manager_keymode_numeric' : 'manager_keymode_alpha')} · ${t('manager_hint_press_key')}`;
    zone.addEventListener('click', () => showSendCopyHelp());
    zone.addEventListener('mouseenter', () => {
      state.hoverContext = {
        kind,
        item: { title, url, favIconUrl, icon: favIconUrl },
        source: { type, key, index }
      };
    });
    zone.addEventListener('mouseleave', () => {
      // Keep context only if moved to the other zone in the same row; otherwise clear shortly
      setTimeout(() => {
        state.hoverContext = null;
      }, 0);
    });
    return zone;
  };
  actions.appendChild(makeZone('send'));
  actions.appendChild(makeZone('copy'));

  return node;
}

function filterCollection(collection) {
  const { searchQuery, activeFilter } = state;
  const tabs = collection.tabs || [];
  const locale = getLocale();

  if (searchQuery) {
    const matches =
      collection.name?.toLocaleLowerCase(locale).includes(searchQuery) ||
      collection.note?.toLocaleLowerCase(locale).includes(searchQuery) ||
      collection.key.toLocaleLowerCase(locale).includes(searchQuery) ||
      tabs.some((tab) =>
        (tab.title || '').toLocaleLowerCase(locale).includes(searchQuery) ||
        (tab.url || '').toLocaleLowerCase(locale).includes(searchQuery)
      );
    if (!matches) return false;
  }

  if (!activeFilter) return true;

  switch (activeFilter) {
    case 'recent':
      return Date.now() - (collection.updatedAt || collection.savedAt || 0) <= 72 * 60 * 60 * 1000;
    case 'large':
      return (tabs.length || 0) >= 8;
    case 'withNote':
      return Boolean(collection.note && collection.note.trim().length > 0);
    default:
      return true;
  }
}

function sortCollections(collections) {
  const option = state.sortOption;
  const sorted = collections.slice();
  switch (option) {
    case 'updatedAsc':
      sorted.sort((a, b) => (a.updatedAt || a.savedAt || 0) - (b.updatedAt || b.savedAt || 0));
      break;
    case 'nameAsc':
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
      break;
    case 'nameDesc':
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ja'));
      break;
    case 'updatedDesc':
    default:
      sorted.sort((a, b) => (b.updatedAt || b.savedAt || 0) - (a.updatedAt || a.savedAt || 0));
      break;
  }
  return sorted;
}

function updateCounts() {
  const legacyKeys = Object.keys(state.keyLists).filter((key) => /^[1-9]$/.test(key));
  const collectionDigitKeys = Object.keys(state.collections).filter((key) => /^[1-9]$/.test(key));
  const slotKeys = Array.from(new Set([...legacyKeys, ...collectionDigitKeys]));
  const slotItems = slotKeys.reduce((sum, key) => {
    const collectionTabs = state.collections[key]?.tabs;
    if (Array.isArray(collectionTabs)) {
      return sum + collectionTabs.length;
    }
    return sum + (state.keyLists[key]?.length || 0);
  }, 0);
  elements.slotCount.textContent = t('manager_slot_count_summary', [slotKeys.length, slotItems]);

  const collectionKeys = Object.keys(state.collections).filter((key) => /^[a-z]$/.test(key));
  const tabCount = collectionKeys.reduce(
    (sum, key) => sum + (state.collections[key]?.tabs?.length || 0),
    0
  );
  elements.collectionCount.textContent = t('manager_collection_count_summary', [collectionKeys.length, tabCount]);
}

async function clearSlot(key, { isCollectionSlot = false } = {}) {
  const collection = state.collections[key];
  const entries = isCollectionSlot ? collection?.tabs || [] : state.keyLists[key] || [];

  if (entries.length === 0) {
    if (isCollectionSlot && collection) {
      delete state.collections[key];
      await storageSet({ collections: state.collections });
      renderSlots();
      renderCollections();
      updateCounts();
    }
    return;
  }

  const confirmKey = isCollectionSlot ? 'manager_confirm_clear_collection_slot' : 'manager_confirm_clear_slot';
  const confirmed = window.confirm(t(confirmKey, [key, entries.length]));
  if (!confirmed) return;

  if (isCollectionSlot) {
    delete state.collections[key];
    await storageSet({ collections: state.collections });
    showToast(t('manager_toast_slot_collection_cleared', [key]), 'success');
  } else {
    delete state.keyLists[key];
    await storageSet({ keyLists: state.keyLists });
    showToast(t('manager_toast_slot_cleared', [key]), 'success');
  }

  renderSlots();
  renderCollections();
  updateCounts();
}

async function removeSlotItem(key, index) {
  const entry = state.keyLists[key]?.[index];
  if (!entry) return;

  const confirmed = window.confirm(
    t('manager_confirm_remove_slot_item', [entry.title || entry.url, key])
  );
  if (!confirmed) return;

  state.keyLists[key].splice(index, 1);
  if (state.keyLists[key].length === 0) {
    delete state.keyLists[key];
  }

  await storageSet({ keyLists: state.keyLists });
  renderSlots();
  updateCounts();
  showToast(t('manager_toast_slot_item_removed'), 'warning');
}

async function removeCollectionItem(key, index) {
  const collection = state.collections[key];
  if (!collection) return;

  const tab = collection.tabs?.[index];
  if (!tab) return;

  const confirmed = window.confirm(
    t('manager_confirm_remove_collection_item', [tab.title || tab.url, collection.name])
  );
  if (!confirmed) return;

  collection.tabs.splice(index, 1);
  collection.updatedAt = Date.now();

  if (collection.tabs.length === 0) {
    delete state.collections[key];
    showToast(t('manager_toast_collection_removed', [collection.name]), 'warning');
  } else {
    showToast(t('manager_toast_collection_tab_removed'), 'warning');
  }

  await storageSet({ collections: state.collections });
  renderCollections();
  renderSlots();
  updateCounts();
}

async function updateCollectionMeta(key, updates) {
  const collection = state.collections[key];
  if (!collection) return;

  state.collections[key] = {
    ...collection,
    ...updates,
    updatedAt: Date.now()
  };

  await storageSet({ collections: state.collections });
  renderCollections();
  renderSlots();
  updateCounts();
  showToast(t('notification_collection_updated'), 'success');
}

async function removeCollection(key) {
  const collection = state.collections[key];
  if (!collection) return;

  const confirmed = window.confirm(t('manager_confirm_delete_collection', [collection.name]));
  if (!confirmed) return;

  delete state.collections[key];
  await storageSet({ collections: state.collections });
  renderCollections();
  renderSlots();
  updateCounts();
  showToast(t('manager_toast_collection_removed', [collection.name]), 'warning');
}

function openCollection(key) {
  const collection = state.collections[key];
  if (!collection || !collection.tabs || collection.tabs.length === 0) {
    showToast(t('manager_toast_no_tabs_to_open'), 'warning');
    return;
  }

  const confirmed = window.confirm(
    t('confirm_open_collection', [collection.name, collection.tabs.length])
  );
  if (!confirmed) return;

  chrome.runtime.sendMessage({ action: 'restoreCollectionTabs', collection }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      showToast(t('notification_collection_restore_failed'), 'danger');
      return;
    }
    if (!response || !response.success) {
      showToast(t('notification_collection_restore_failed'), 'danger');
      return;
    }
    if (state.collections[key]) {
      state.collections[key].updatedAt = Date.now();
    }
    storageSet({ collections: state.collections }).then(() => {
      renderCollections();
      renderSlots();
      updateCounts();
    });
    showToast(t('notification_collection_restored', [collection.name]), 'success');
  });
}

function exportCollection(key) {
  const collection = state.collections[key];
  if (!collection) {
    showToast(t('notification_export_target_missing'), 'warning');
    return;
  }

  const confirmed = window.confirm(t('confirm_export_collection', [collection.name]));
  if (!confirmed) return;

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    collection
  };
  downloadJson(payload, `ghost-collection-${key}-${Date.now()}.json`);
  showToast(t('manager_toast_collection_exported', [collection.name]), 'success');
}

function exportAllData() {
  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    keyLists: state.keyLists,
    collections: state.collections
  };
  downloadJson(payload, `ghost-backup-${Date.now()}.json`);
  showToast(t('manager_toast_export_all_success'), 'success');
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatTimestamp(timestamp) {
  if (!timestamp) return t('manager_timestamp_unknown');
  const date = new Date(timestamp);
  const locale = getLocale();
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const formatted = formatter.format(date);

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  let relative = '';
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (diff < minute) {
      relative = rtf.format(0, 'minute');
    } else if (diff < hour) {
      relative = rtf.format(-Math.round(diff / minute), 'minute');
    } else if (diff < day) {
      relative = rtf.format(-Math.round(diff / hour), 'hour');
    } else if (diff < 7 * day) {
      relative = rtf.format(-Math.round(diff / day), 'day');
    }
  } catch (error) {
    // Intl.RelativeTimeFormat may not be available; ignore gracefully.
  }

  return relative ? `${formatted} (${relative})` : formatted;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${mapToastType(type)}`;

  const messageNode = document.createElement('div');
  messageNode.className = 'toast__message';
  messageNode.textContent = message;
  toast.appendChild(messageNode);

  const closeButton = document.createElement('button');
  closeButton.className = 'toast__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', t('common_close'));
  closeButton.textContent = '×';
  toast.appendChild(closeButton);

  const close = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -10px)';
    setTimeout(() => toast.remove(), 200);
  };

  closeButton.addEventListener('click', close);
  setTimeout(close, 3500);

  elements.toastContainer.appendChild(toast);
}

function mapToastType(type) {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warning';
    case 'danger':
      return 'danger';
    default:
      return 'info';
  }
}

// =============== Send/Copy logic & key handling ===============
document.addEventListener('keydown', async (e) => {
  // Toggle mode with Tab inside manager
  if (e.key === 'Tab') {
    e.preventDefault();
    state.keyMode = state.keyMode === 'numeric' ? 'alpha' : 'numeric';
    // Update titles of zones to reflect current mode
    // 実際のキー（key）が1-9かa-zかで判断
    document.querySelectorAll('.tab-item__send, .tab-item__copy').forEach((el) => {
      // ボタンの親要素（.tab-item）からkeyを取得
      const tabItem = el.closest('[data-key]');
      const itemKey = tabItem ? tabItem.dataset.key : null;
      // キーが1-9かa-zかで判断
      const isNumericKey = itemKey && /^[1-9]$/.test(itemKey);
      const appropriateMode = isNumericKey ? 'numeric' : 'alpha';
      el.title = `${t(appropriateMode === 'numeric' ? 'manager_keymode_numeric' : 'manager_keymode_alpha')} · ${t('manager_hint_press_key')}`;
    });
    return;
  }

  // Only act when hovering a zone
  if (!state.hoverContext) return;

  const key = e.key;
  let targetKey = null;
  if (state.keyMode === 'numeric' && /^[1-9]$/.test(key)) {
    targetKey = key;
  } else if (state.keyMode === 'alpha' && /^[a-z]$/.test(key)) {
    targetKey = key;
  } else {
    return;
  }

  e.preventDefault();
  const { kind, item, source } = state.hoverContext;
  try {
    const result = await addItemToTarget(targetKey, item, state.keyMode);
    if (result === 'duplicate') {
      showToast(t('manager_toast_duplicate', [targetKey]), 'warning');
      return;
    }
    if (kind === 'send') {
      // Remove from source silently
      await silentRemoveFromSource(source);
      showToast(t('manager_toast_moved', [targetKey]), 'success');
    } else {
      showToast(t('manager_toast_added', [targetKey]), 'success');
    }
    // Rerender while preserving scroll
    preserveAndRenderAll();
  } catch (err) {
    console.error('[Manager][SendCopy] error', err);
    showToast(t('manager_toast_error'), 'danger');
  }
});

function showSendCopyHelp() {
  const title = t('manager_sendcopy_help_title');
  const body = t('manager_sendcopy_help_body');
  showToast(`${title}: ${body}`, 'info');
}

async function addItemToTarget(targetKey, item, mode) {
  if (mode === 'numeric') {
    // Add to keyLists[1-9]
    const list = state.keyLists[targetKey] || [];
    if (list.some((e) => e.url === item.url)) {
      return 'duplicate';
    }
    list.unshift({
      url: item.url,
      title: item.title || item.url,
      icon: item.icon || item.favIconUrl || '',
      addedAt: Date.now()
    });
    state.keyLists[targetKey] = list;
    await storageSet({ keyLists: state.keyLists });
  } else {
    // Add to collections[a-z]
    const key = targetKey;
    const collection = state.collections[key] || { name: '', note: '', tabs: [], savedAt: Date.now() };
    const tabs = collection.tabs || [];
    if (tabs.some((t) => t.url === item.url)) {
      return 'duplicate';
    }
    tabs.unshift({
      url: item.url,
      title: item.title || item.url,
      favIconUrl: item.favIconUrl || item.icon || ''
    });
    state.collections[key] = { ...collection, tabs, updatedAt: Date.now() };
    await storageSet({ collections: state.collections });
  }
  return 'ok';
}

async function silentRemoveFromSource(source) {
  const { type, key, index } = source || {};
  if (typeof index !== 'number') return;
  if (type === 'slot') {
    if (!Array.isArray(state.keyLists[key])) return;
    state.keyLists[key].splice(index, 1);
    if (state.keyLists[key].length === 0) delete state.keyLists[key];
    await storageSet({ keyLists: state.keyLists });
  } else if (type === 'collection') {
    const collection = state.collections[key];
    if (!collection || !Array.isArray(collection.tabs)) return;
    collection.tabs.splice(index, 1);
    collection.updatedAt = Date.now();
    if (collection.tabs.length === 0) delete state.collections[key];
    await storageSet({ collections: state.collections });
  }
}

function preserveAndRenderAll() {
  const slotScroll = elements.slotList?.scrollTop || 0;
  const collectionScroll = elements.collectionList?.scrollTop || 0;
  renderAll();
  elements.slotList.scrollTop = slotScroll;
  elements.collectionList.scrollTop = collectionScroll;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (result) => resolve(result));
  });
}

function storageSet(items) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(items, () => resolve());
  });
}

