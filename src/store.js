import { create } from 'zustand';

const STORAGE_KEY = 'card-match-canvas-v1';

const uid = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const parseValues = (content, ext) => {
  if (ext === 'csv') {
    return content
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return content
    .split(/\r?\n|,/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const hydrate = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch {
    return null;
  }
};

const initial = hydrate();

export const useBoardStore = create((set, get) => ({
  datasets: initial?.datasets ?? [],
  cards: initial?.cards ?? {},
  groups: initial?.groups ?? [],
  textBlocks: initial?.textBlocks ?? [],

  persist: () => {
    const { datasets, cards, groups, textBlocks } = get();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ datasets, cards, groups, textBlocks }));
  },

  importDataset: (fileName, content, type) => {
    const ext = fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'txt';
    const values = parseValues(content, ext);
    if (!values.length) return 0;

    const datasetId = uid('dataset');
    const nextCards = { ...get().cards };

    values.forEach((value) => {
      const cardId = uid('card');
      nextCards[cardId] = {
        id: cardId,
        name: value,
        datasetId,
        datasetType: type,
        used: false,
      };
    });

    set((state) => ({
      datasets: [...state.datasets, { id: datasetId, name: fileName, type }],
      cards: nextCards,
    }));
    get().persist();
    return values.length;
  },

  addGroup: () => {
    const id = uid('group');
    set((state) => ({
      groups: [
        ...state.groups,
        {
          id,
          title: `Match ${state.groups.length + 1}`,
          x: 80 + state.groups.length * 30,
          y: 80 + state.groups.length * 30,
          cardIds: [],
        },
      ],
    }));
    get().persist();
  },

  removeGroup: (groupId) => {
    const groups = get().groups;
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;

    const cards = { ...get().cards };
    target.cardIds.forEach((instanceId) => {
      const [baseCardId] = instanceId.split('::');
      if (cards[baseCardId]) cards[baseCardId].used = false;
    });

    set((state) => ({
      cards,
      groups: state.groups.filter((g) => g.id !== groupId),
    }));
    get().persist();
  },

  moveGroup: (groupId, position) => {
    set((state) => ({
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...position } : g)),
    }));
    get().persist();
  },

  addTextBlock: () => {
    const id = uid('text');
    set((state) => ({
      textBlocks: [
        ...state.textBlocks,
        {
          id,
          x: 220,
          y: 100,
          text: 'Editable note',
        },
      ],
    }));
    get().persist();
  },

  moveTextBlock: (id, position) => {
    set((state) => ({
      textBlocks: state.textBlocks.map((item) => (item.id === id ? { ...item, ...position } : item)),
    }));
    get().persist();
  },

  updateTextBlock: (id, text) => {
    set((state) => ({
      textBlocks: state.textBlocks.map((item) => (item.id === id ? { ...item, text } : item)),
    }));
    get().persist();
  },

  removeTextBlock: (id) => {
    set((state) => ({ textBlocks: state.textBlocks.filter((item) => item.id !== id) }));
    get().persist();
  },

  placeCardInGroup: (baseCardId, groupId, targetIndex = null, fromGroupId = null, instanceId = null) => {
    const state = get();
    const card = state.cards[baseCardId];
    if (!card) return;

    const groups = state.groups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));
    const dest = groups.find((g) => g.id === groupId);
    if (!dest) return;

    if (fromGroupId) {
      const from = groups.find((g) => g.id === fromGroupId);
      if (from) {
        from.cardIds = from.cardIds.filter((id) => id !== instanceId);
      }
    }

    if (!fromGroupId && card.datasetType === 'single-use' && card.used) {
      return;
    }

    const idToInsert = fromGroupId
      ? instanceId
      : card.datasetType === 'reusable'
      ? `${baseCardId}::${crypto.randomUUID()}`
      : `${baseCardId}::single`;

    const insertAt = targetIndex === null ? dest.cardIds.length : targetIndex;
    dest.cardIds.splice(insertAt, 0, idToInsert);

    const nextCards = {
      ...state.cards,
      [baseCardId]: {
        ...card,
        used: card.datasetType === 'single-use' ? true : card.used,
      },
    };

    set({ groups, cards: nextCards });
    get().persist();
  },

  returnCardToPool: (groupId, instanceId) => {
    const [baseCardId] = instanceId.split('::');
    const card = get().cards[baseCardId];
    if (!card) return;

    const groups = get().groups.map((g) => ({ ...g, cardIds: [...g.cardIds] }));
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    group.cardIds = group.cardIds.filter((id) => id !== instanceId);

    const nextCards = {
      ...get().cards,
      [baseCardId]: {
        ...card,
        used: card.datasetType === 'single-use' ? false : card.used,
      },
    };

    set({ groups, cards: nextCards });
    get().persist();
  },

  exportMatches: () => {
    const state = get();
    return state.groups
      .map((group) => {
        const lines = group.cardIds.map((id, idx) => {
          const [baseId] = id.split('::');
          return `${idx + 1}. ${state.cards[baseId]?.name ?? 'Unknown card'}`;
        });
        return `${group.title}\n${lines.join('\n')}`;
      })
      .join('\n\n');
  },
}));
