<template>
	<Navbar />
	<router-view />
	<Footer />
</template>

<script setup>
import { ref, onMounted } from "vue";
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";

onMounted(async () => {});
</script>

<style lang="scss"></style>
