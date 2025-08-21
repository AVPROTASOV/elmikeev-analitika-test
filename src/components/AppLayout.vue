<template>
  <div class="layout">
    <aside class="sidebar">
      <h1 class="title">Elmikeev Analitika Test</h1>

      <nav class="nav">
        <RouterLink to="/orders" class="nav__link">Orders</RouterLink>
        <RouterLink to="/sales" class="nav__link">Sales</RouterLink>
        <RouterLink to="/incomes" class="nav__link">Incomes</RouterLink>
        <RouterLink to="/stocks" class="nav__link">Stocks</RouterLink>
      </nav>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts" setup>
</script>

<!-- ГЛОБАЛЬНЫЕ стили (НЕ scoped): применятся к страницам -->
<style>
html, body {
  height: 100%;
  margin: 0;
  overflow: hidden; /* скроллим только .content */
}

/* toolbar теперь глобальный, поэтому хедеры на страницах получат отступы и gap */
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
</style>

<!-- ЛОКАЛЬНЫЕ стили для лэйаута -->
<style scoped>
.layout {
  height: 100dvh;
  display: flex;
  overflow: hidden;
  gap: 16px;
  background: #fff;
}

.sidebar {
  flex: 0 0 240px;
  padding: 16px;
  box-sizing: border-box;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.nav { display: flex; flex-direction: column; gap: 6px; }

.nav__link {
  display: block;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: #1f2937;
  transition: background-color .15s ease-in-out, color .15s ease-in-out;
}
.nav__link:visited { color: #1f2937; text-decoration: none; }
.nav__link:hover { background: #f3f4f6; }
.nav__link.router-link-active { background: #e5e7eb; font-weight: 600; }

.content {
  flex: 1 1 auto;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  scrollbar-gutter: stable;
}
</style>
