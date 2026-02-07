<template>
	<div>
		<div
			id="not-found-page-wrapper"
			class="d-flex flex-column align-items-center"
		>
			<div id="page-status-code" class="poppins-extrabold">404</div>
			<div id="page-not-found" class="poppins-semibold">Page Not Found</div>
			<div id="page-status-msg" class="px-3">
				Sorry, the page you are looking for could not be found.
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";

const example = ref(null);

onMounted(() => {});
</script>

<style scoped lang="scss">
#not-found-page-wrapper {
	position: absolute;
	top: 46%;
	left: 50%;
	transform: translate(-50%, -50%);
}

#page-status-code {
	font-size: 110px;
}

#page-not-found {
	font-size: 30px;
	margin-top: -20px;
	margin-bottom: 12px;
}

#page-status-msg {
	border-bottom: 1px solid black;
	padding-bottom: 7px;
}
</style>
