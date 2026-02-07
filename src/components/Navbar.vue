<template>
	<el-menu
		:default-active="activeIndex"
		mode="horizontal"
		:ellipsis="false"
		@select="handleSelect"
	>
		<el-menu-item index="-1">
			<!-- <img
				style="width: 100px"
				src="/images/element-plus-logo.svg"
				alt="Element logo"
			/> -->
		</el-menu-item>
		<el-menu-item index="0" :class="{ 'poppins-semibold': activeIndex == '0' }"
			>Home</el-menu-item
		>
		<el-menu-item index="1" :class="{ 'poppins-semibold': activeIndex == '1' }"
			>Points Table</el-menu-item
		>
		<el-menu-item index="2" :class="{ 'poppins-semibold': activeIndex == '2' }"
			>Fixtures</el-menu-item
		>
		<el-menu-item index="3" :class="{ 'poppins-semibold': activeIndex == '3' }"
			>Teams</el-menu-item
		>
		<el-menu-item index="4" :class="{ 'poppins-semibold': activeIndex == '4' }"
			>Players</el-menu-item
		>
	</el-menu>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Pages, Routes } from "../utils/constants";

const activeIndex = ref("0");
const router = useRouter();

const handleSelect = (index) => {
	activeIndex.value = index;
	index = parseInt(index);
	switch (index) {
		case Pages.HOME:
			router.push(Routes.HOME);
			break;
		case Pages.POINTS_TABLE:
			router.push(Routes.POINTS_TABLE);
			break;
		case Pages.FIXTURES:
			router.push(Routes.FIXTURES);
			break;
		case Pages.TEAMS:
			router.push(Routes.TEAMS);
			break;
		case Pages.PLAYERS:
			router.push(Routes.PLAYERS);
			break;
		default:
			break;
	}
};

onMounted(() => {
	switch (window.location.pathname) {
		case Routes.HOME:
			activeIndex.value = "0";
			break;
		case Routes.POINTS_TABLE:
			activeIndex.value = "1";
			break;
		case Routes.FIXTURES:
			activeIndex.value = "2";
			break;
		case Routes.TEAMS:
			activeIndex.value = "3";
			break;
		case Routes.PLAYERS:
			activeIndex.value = "4";
			break;
		default:
			activeIndex.value = null;
			break;
	}
});
</script>

<style scoped>
.el-menu--horizontal > .el-menu-item:nth-child(1) {
	margin-right: auto;
}

.el-menu--horizontal .el-menu-item:not(.is-disabled):focus,
.el-menu--horizontal .el-menu-item:not(.is-disabled):hover {
	background: #ffffff;
}
</style>
