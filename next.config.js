/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

3. Click **File** → **Save As**
4. Navigate to your `aztec-dashboard` folder
5. Filename: `next.config.js`
6. **Important (Windows):** Change "Save as type" to **"All Files"**
7. Click **Save**

---

### Step 4: Create the `pages` Folder

1. Open your `aztec-dashboard` folder
2. **Right-click** → **New Folder**
3. Name it: `pages`

---

### Step 5: Move and Rename `dashboard-index.js`

1. Find your downloaded `dashboard-index.js` file
2. **Move it** into the `pages` folder
3. **Rename it** from `dashboard-index.js` to `index.js`

---

### Step 6: Create the `api` Folder

1. Open the `pages` folder
2. **Right-click** → **New Folder**
3. Name it: `api`

---

### Step 7: Move and Rename `api-prover.js`

1. Find your downloaded `api-prover.js` file
2. **Move it** into the `pages/api` folder
3. **Rename it** from `api-prover.js` to `provers.js`

---

### ✅ Your Folder Should Look Like This:
```
aztec-dashboard/
├── package.json
├── next.config.js
└── pages/
    ├── index.js
    └── api/
        └── provers.js