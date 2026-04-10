# Card Match Canvas (React + Vite)

A single-page web app for uploading text datasets and organizing draggable cards into match groups on a large canvas.

## Features

- Upload `.txt` and `.csv`
- Parse text entries into cards
- Dataset modes:
  - `single-use`: card can only exist once on canvas
  - `reusable`: card can be duplicated and returned to pool
- Drag and drop with `dnd-kit`
- Free-position group containers on a scrollable canvas
- Editable draggable text blocks
- Local persistence with `localStorage`
- Export groups to plain text

## Component breakdown

- `App`: orchestrates upload flow, controls, DnD handlers, and overall layout
- `Card`: draggable visual card used in pool and group contexts
- `Group`: draggable match container + card drop zone
- `Canvas`: large scrollable scene for groups and text blocks
- `TextBlock`: draggable inline-editable note element
- `store.js`: Zustand-based state and persistence logic

## Folder structure

```text
.
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── src
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── store.js
│   └── components
│       ├── Canvas.jsx
│       ├── Card.jsx
│       ├── Group.jsx
│       └── TextBlock.jsx
└── README.md
```

## Run with Vite

```bash
npm install
npm run dev
```

Then open the local Vite URL (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```
