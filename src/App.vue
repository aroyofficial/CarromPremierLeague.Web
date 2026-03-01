<template>
	<Navbar />
	<main id="app-content">
		<router-view />
	</main>
	<Footer />
</template>

<script setup>
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
</script>

<style lang="scss">
#app-content {
	min-height: calc(100vh - var(--app-header-height) - var(--app-footer-height));
}
</style>
