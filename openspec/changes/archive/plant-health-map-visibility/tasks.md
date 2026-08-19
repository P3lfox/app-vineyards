# Plant Health Map Visibility - Tasks

## 1. Update health indicator borders

### 1.1 Replace disease indicator styling
- Change `healthIndicator` for disease from `border-red-500 ring-1 ring-red-500/40` to `border-2 border-red-500`
- File: `front/vineyards/src/pages/PlantHealthMap.tsx`

### 1.2 Replace treatment indicator styling
- Change `healthIndicator` for treatment from `border-cyan-400 ring-1 ring-cyan-400/40` to `border-2 border-blue-500`
- File: `front/vineyards/src/pages/PlantHealthMap.tsx`

## 2. Update legend swatches

### 2.1 Update disease legend swatch
- Change legend swatch from `border-2 border-red-500` to match new grid styling
- File: `front/vineyards/src/pages/PlantHealthMap.tsx`

### 2.2 Update treatment legend swatch
- Change legend swatch from `border-2 border-cyan-400` to `border-2 border-blue-500`
- File: `front/vineyards/src/pages/PlantHealthMap.tsx`

## 3. Verify build

### 3.1 Run TypeScript type check
- Command: `cd front/vineyards && npx tsc -b`
- Ensure no new type errors introduced

### 3.2 Run ESLint
- Command: `cd front/vineyards && npm run lint`
- Ensure no new lint errors introduced

### 3.3 Manual visual verification
- Run dev server and navigate to Sanidad page
- Select a plot with plants that have diseases/treatments
- Verify red borders are clearly visible on diseased plants
- Verify blue borders are clearly visible on treated plants
- Verify legend matches grid indicators
