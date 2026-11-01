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
	flex: 1 0 auto;
	width: 100%;
}
</style>
